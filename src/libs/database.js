const mongoose = require('mongoose');
const file = require('./filesystem');
const path = require('path');
const cv = require('./image');
const image = require('../models/image');
const bounding = require('../models/bounding_box');
const classes = require('../models/classes').model;
const info = require('../models/info').model;

const get_image_topics = async function() {
    let topics = await mongoose.connection.db.listCollections().toArray();
    if (topics.length === 0)
        throw new Error(`no topics have been saved`);

    // Return all topics that contains images by checking the field 'data'
    const promises = topics.map(async (topic) => {
        let result = await mongoose.connection.db.collection(topic.name).findOne({data: {$ne: null}});
        if (result != null)
            return topic.name;
    });

    let image_topics = await Promise.all(promises);
    image_topics = image_topics.filter(item => item != undefined);
    if (image_topics.length === 0)
        throw new Error(`no image topics were saved`);
    return image_topics;
};

const get_image_size = async function(topic) {
    let doc = await image.model(topic).findOne({});
    if (doc === null)
        throw new Error(`there are no images on topic ${topic}`)
    return { width: doc.width, height: doc.height };
}

const get_labeled_topics = async function() {
    let topics = await mongoose.connection.db.listCollections().toArray();
    if (topics.length === 0)
        throw new Error(`no topics have been saved`);

    const promises = topics.filter(topic => topic.name.includes('_bounding_box')).map(async (topic) => {
        let result = await mongoose.connection.db.collection(topic.name).countDocuments({});
        if (result > 0)
            return topic.name.replace('_bounding_box', ''); 
    });

    let labeled_topics = await Promise.all(promises);
    labeled_topics = labeled_topics.filter(item => item != undefined);
    return labeled_topics;
}

const get_all_sequence_numbers = async function(topic) {
    let documents = await image.model(topic).find({}, {header: 1, _id: 0});
    if (documents.length == 0)
        throw new Error('there are no images found');

    documents.sort((first, second) => {
        return first.header.seq > second.header.seq ? 1 : (first.header.seq < second.header.seq) ? -1 : 0;
    });
    return documents;
};

const get_db_info = async function(topic) {
    return await info.findOne({topic : topic});
};

const get_image = async function(topic, seq) {
    return await image.model(topic).findOne({'header.seq': seq});
};

const add_class = async function(name, color) {
    let document = await classes.findOne({}).sort({id: -1});
    // Auto-inc id??
    let res = await classes.create({id : document == null ? 0 : document.id + 1, last_image: {topic: '', seq: -1}, name: name, color: color, subclasses : []});
    return res.id;
};

const add_sub_class = async function(name, sub_name) {
    let document = await classes.findOne({name: name}, {subclasses: 1, _id : 0});
    if (document == null)
        throw new Error(`the class ${name} is not found into db`);

    document = document.subclasses;
    document.sort((first, second) => {
        return first.id > second.id ? -1 : (first.id < second.id) ? 1 : 0;
    });
    await classes.findOneAndUpdate({name: name}, {$push: {subclasses: {id : document.length == 0 ? 0 : document[0].id + 1, name: sub_name}}});
};

const add_labeled_image = async function(topic, image_number) {
    let res = await image.model(topic).findOne({'header.seq': image_number});
    if (res == null)
        throw new Error(`image with sequence number ${image_number} does not exist into DB`);

    let doc = await bounding.model(`${topic}_bounding_box`).findOne({ seq: image_number });
    if (doc == null) {
        res = await bounding.model(`${topic}_bounding_box`).create({ seq: image_number, bounding_box: []});
    }
}

const add_bounding_box = async function(topic, image_number, bounding_box, id, class_id) {
    let res = await image.model(topic).findOne({'header.seq': image_number});
    if (res == null)
        throw new Error(`image with sequence number ${image_number} does not exist into DB`);
       
    let name = await get_class_name(class_id);
    let sub_name = bounding_box.attrs.name.split('-')[1];
    let obj_class = await classes.findOne({ name: name });
    if (obj_class == null)
        throw new Error(`the class ${name} of bounding box does not exists`);

    let id_sub_class = obj_class.subclasses.find((sub_class) => sub_class.name == sub_name);
    id_sub_class = id_sub_class == undefined ? -1 : id_sub_class.id;

    let id_bounding_box = (id >= 0) ? id : await get_max_id_bounding_box(`${topic}_bounding_box`) + 1;
    res = await bounding.model(`${topic}_bounding_box`).findOneAndUpdate({ seq: image_number }, { $push: { bounding_box: { id: id_bounding_box + 1, id_class: obj_class.id, id_sub_class: id_sub_class, rect: bounding_box }}}, { upsert: true, new: true });
    res = res.bounding_box;
    if (!res.some(doc => doc.id === (id >= 0) ? id : id_bounding_box + 1))
        throw new Error(`the bounding box has not been added`);
};

const get_classes = async function() {
    let documents = await classes.find({});
    if (documents == null)
        return [];
    return documents;
};

const get_class_id = async function(class_name) {
    let doc = await classes.findOne({name: class_name}, {id: 1});
    if (doc === null)
        throw new Error(`there are no class with the following name ${class_name}`);
    return doc.id;
}

const get_sub_classes = async function(name) {
    let documents = await classes.findOne({name : name}, {subclasses : 1, _id: 0});
    if (documents == null)
        return [];
    // For removing all useless fields and keep only the name field
    return documents.subclasses.map(({id, _id, name}) => name);
};

const get_bounding_box = async function(topic, image_number) {
    let documents = await bounding.model(`${topic}_bounding_box`).findOne({seq : image_number}, {bounding_box: 1, _id: 0});
    if (documents == null)
        return [];
    return documents.bounding_box;
};

const get_last_bounding_box_of_class = async function(class_name) {
    try {
        const classId = await get_class_id(class_name);
        const topics =  await get_image_topics();
        const results = await Promise.all(
            topics.map(async (topic) => {
                const documents = await bounding.model(`${topic}_bounding_box`).aggregate([
                    {
                        $unwind: '$bounding_box'
                    },
                    {
                        $match: {
                            'bounding_box.id_class': classId
                        }
                    },
                    {
                        $group: {
                            _id: '$seq',
                            seq: { $first: '$seq' },
                            bounding_box: { $push: '$bounding_box' }
                        }
                    },
                    {
                        $project: {
                            bounding_box: {
                                id: 1,
                            },
                            seq: 1,
                            _id: 0
                        }
                    }
                ], { allowDiskUse: true });
                return { topic: topic, documents };
            })
        );

        let maxId = null;
        let massimoId = null;
        let image = -1;
        let topic = '';

        results.forEach((result) => {
            result.documents.forEach((document) => {
                document.bounding_box.forEach((oggetto) => {
                    if (maxId === null || oggetto.id > massimoId) {
                        maxId = oggetto;
                        massimoId = oggetto.id;
                        image = document.seq;
                        topic = result.topic;
                    }
                });
            });
        });
        return { topic: topic, image: image };
    } catch (error) {
        console.error(`error on getting last bounding box of a class: ${error}`);
        throw new Error(`error on getting last bounding box of a class: ${error}`);
    }
}

const remove_class = async function(name) {
    let id = await classes.findOne({name: name}, {id: 1, _id: 0});
    let res = await classes.deleteOne({name: name});
    if (res.deletedCount < 1)
        throw new Error(`no classes have been removed`);
    custom_remove_bounding_box(bounding.class_query(id.id));
};

const remove_sub_class = async function(name, sub_name) {
    let id_class = await classes.findOne({name : name});
    let id_sub_class = await classes.findOne({name : name}, {subclasses: {$elemMatch: {name: sub_name}}});
    if (id_sub_class.subclasses.length == 0)
        throw new Error(`no subclasses found on db`);

    let res = await classes.updateOne({name : name}, {$pull: {subclasses: {name: sub_name}}});
    if (res.modifiedCount < 1)
        throw new Error(`no sub classes have been removed`);
    custom_remove_bounding_box(bounding.sub_class_query(id_class.id, id_sub_class.subclasses[0].id));
};

const remove_bounding_box = async function(topic, image_number, id) {
    let res = await bounding.model(`${topic}_bounding_box`).updateOne({seq : image_number}, {$pull: {bounding_box: {id: id}}});
    if (res.modifiedCount < 1)
        throw new Error(`bounding box with id ${id} has not been removed`);
    return res;
};

const update_class_name = async function(id, name) {
    let res = await classes.findOneAndUpdate({ id: id }, { $set: { name: name }}, { new: true, upsert: false });
    if (res === null)
        throw new Error(`error, no class found with id ${id}`);
    return res;
}

const update_class_with_last_labeled_image = async function(topic, image_number, class_name) {
    let last_img = {topic: topic, seq: image_number};
    let result = await classes.findOneAndUpdate({name: class_name}, {last_image : last_img}, {new: true});
    if (result == null)
        throw new Error(`there are no classes with the name ${class_name}`);
    return result;
}

const update_bounding_box = async function(topic, image_number, old_rect, new_rect) {
    let res = await image.model(topic).findOne({'header.seq': image_number});
    if (res == null)
        throw new Error(`image with sequence number ${image_number} does not exist into DB`);

    let name = new_rect.attrs.name.split('-')[0];
    let sub_name = new_rect.attrs.name.split('-')[1];
    let obj_class = await classes.findOne({name: name});
    if (obj_class == null)
        throw new Error(`the class ${name} of bounding box does not exists`);

    let id_sub_class = obj_class.subclasses.find((sub_class) => sub_class.name == sub_name);
    id_sub_class = id_sub_class == undefined ? -1 : id_sub_class.id;

    res = await bounding.model(`${topic}_bounding_box`).updateOne({seq : image_number}, {$pull: {bounding_box: {id: old_rect.id}}});
    if (res.modifiedCount < 1)
        throw new Error(`bounding box with id ${old_rect.id} has not been changed`);

    res = await bounding.model(`${topic}_bounding_box`).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : old_rect.id, id_class : obj_class.id, id_sub_class : id_sub_class, rect : new_rect}}}, {new: true});
    res = res.bounding_box;
    if(!res.some(doc => doc.id === old_rect.id))
        throw new Error(`bounding box with id ${old_rect.id} has not been added`);
};

const update_db_info = async function(topic, image_number) {
    let res = await info.findOne({topic: topic});
    if (res == null || res.seq <= image_number)
        return await info.findOneAndUpdate({topic: topic}, {topic: topic, seq: image_number}, {upsert: true, new: true});
};

const export_dataset = async function(collections, db_name) {
    let path_folder = path.join(__dirname, '..', 'export', db_name);
    try {
        file.create_folder(path_folder);

        let ended = 0;
        let promises = collections.map(async collection => {
            // Create the structure of each collections
            file.remove_folder(path.join(path_folder, 'classes.json'));
            file.remove_folder(path.join(path_folder, collection));
            file.create_folder(path.join(path_folder, collection));
            file.create_folder(path.join(path_folder, collection, 'message'));
            file.create_folder(path.join(path_folder, collection, 'label'));

            let docs = await bounding.model(`${collection}_bounding_box`).find({});

            return new Promise(async resolve => {
                for (let i = 0; i < docs.length; i++) {
                    file.append_text(path.join(path_folder, collection, 'label', `${docs[i].seq}.json`), JSON.stringify(docs[i], null, 4));
                    let img = await image.model(collection).findOne({ 'header.seq': docs[i].seq});
                    if (img == null) {
                        console.error(`error on finding image with sequence number ${docs[i].seq}`);
                        file.remove_folder(path.join(path_folder, collection, 'label', `${docs[i].seq}.json`));
                    } else
                        cv.save_image(path.join(path_folder, collection, 'message', `${docs[i].seq}.png`), img);
                }
                resolve(`collection ${collection} ${++ended}/${collections.length} done`);
                console.info(`collection ${collection} ${ended}/${collections.length} done`);
            });
        });

        let cl = await classes.find({});
        file.append_text(path.join(path_folder, `classes.json`), JSON.stringify(cl));
        
        return await Promise.all(promises).then(data => {
            console.info("Export done");
            return data;
        });
    } catch (error) {
        console.error(`error on export db with the following error: ${error}`);
        return `error on export db with the following error: ${error}`;
    }
};

// FUNCTION

async function get_class_name(id) {
    let doc = await classes.findOne({ id: id }, { name: 1 });
    if (doc === null)
        throw new Error(`there are no class with the following id ${id}`);
    return doc.name;
}

async function get_max_id_bounding_box(topic) {
    try {
        let documents = await bounding.model(topic).find({});
        if (documents == [])
            return -1;

        let max = 0;
        documents.forEach(document => {
            if (document.bounding_box.length == 0)
                return;

            document.bounding_box.sort((first, second) => {
                return first.id > second.id ? -1 : (first.id < second.id) ? 1 : 0;
            });
        
            if (document.bounding_box[0].id > max)
                max = document.bounding_box[0].id;
        });
        return max;
    } catch (error) {
        console.error(`error on getting the max id of bounding box of topic ${topic} from db: ${error}`);
        throw new Error(`error on getting the max id of bounding box of topic ${topic} from db: ${error}`);
    }
};

async function custom_remove_bounding_box(params) {
    try {
        let collections = await mongoose.connection.db.listCollections().toArray();
        if (collections == null)
            throw new Error('no collections have been created');

        collections.forEach(async (collection) => {
            if (collection.name.indexOf('_bounding_box') >= 0) {
                await bounding.model(collection.name).updateMany({}, params);
            }
        });
   } catch (error) {
        console.error(`error on removing bounding box`);
        throw new Error(`error on removing bounding box`);
   }
};

module.exports = {
    get_topics: get_image_topics,
    get_image_size: get_image_size,
    get_labeled_topics: get_labeled_topics,
    get_sequence_numbers: get_all_sequence_numbers,
    get_info: get_db_info,
    get_image: get_image,
    add_class: add_class,
    add_sub_class: add_sub_class,
    add_labeled_image: add_labeled_image,
    add_bounding_box: add_bounding_box,
    get_classes: get_classes,
    get_class_id: get_class_id,
    get_sub_classes: get_sub_classes,
    get_bounding_boxes: get_bounding_box,
    get_last_bounding_box_of_class: get_last_bounding_box_of_class,
    remove_class: remove_class,
    remove_sub_class: remove_sub_class,
    remove_bounding_box: remove_bounding_box,
    update_class_name: update_class_name,
    update_class_with_last_labeled_image: update_class_with_last_labeled_image,
    update_bounding_box: update_bounding_box,
    update_info: update_db_info,
    export: export_dataset
};