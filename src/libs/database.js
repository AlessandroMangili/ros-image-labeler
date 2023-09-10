const mongoose = require('mongoose');
const json = require('big-json');
const file = require('./filesystem');
const path = require('path');
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
    await classes.create({id : document == null ? 0 : document.id + 1, name : name, color: color, subclasses : []});
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

const add_bounding_box = async function(topic, image_number, bounding_box, id) {
    let res = await image.model(topic).findOne({'header.seq': image_number});
    if (res == null)
        throw new Error(`image with sequence number ${image_number} does not exist into DB`);

    let name = bounding_box.attrs.name.split('-')[0];
    let sub_name = bounding_box.attrs.name.split('-')[1];
    let obj_class = await classes.findOne({name: name});
    if (obj_class == null)
        throw new Error(`the class ${name} of bounding box does not exists`);

    let id_sub_class = obj_class.subclasses.find((sub_class) => sub_class.name == sub_name);
    id_sub_class = id_sub_class == undefined ? -1 : id_sub_class.id;

    let id_bounding_box = (id >= 0) ? id : await get_max_id_bounding_box(`${topic}_bounding_box`);
    res = await bounding.model(`${topic}_bounding_box`).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : (id >= 0) ? id : id_bounding_box + 1, id_class : obj_class.id, id_sub_class : id_sub_class, rect : bounding_box}}}, {upsert: true, new: true});
    res = res.bounding_box;
    if (!res.some(doc => doc.id === (id >= 0) ? id : id_bounding_box + 1))
        throw new Error(`the bounding box has not been added`);
};

const get_classes = async function() {
    let documents = await classes.find({});
    if (documents == null)
        return [];

    let object = [];
    documents.forEach(document => {
        object.push({name : document.name, color : document.color});
    });
    return object;
};

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
};

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

const export_dataset = async function(db_name) {
    let path_folder = path.join(__dirname, '..', 'export', db_name);
    try {
        let collections = await mongoose.connection.db.listCollections().toArray();
        // Remove and create again the collection to avoid the appending
        file.remove_folder(path_folder);
        file.create_folder(path_folder);

        let counter = 0;
        let ended = 1;

        let promises = collections.map(async collection => {
            if (collection.name.indexOf('camera') >= 0 || collection.name === 'classes') {
                counter++;

                let docs = await mongoose.connection.db.collection(collection.name).find({}).toArray();
                // Il campo docs[].data è la codifica base64 del buffer dell'immagine
                
                const stringifyStream = json.createStringifyStream({
                    body: docs
                });

                // Appending the strChunk to file
                stringifyStream.on('data', strChunk => {
                    file.append_text(path.join(path_folder, `${collection.name}.json`), strChunk);
                });

                return new Promise(resolve => {
                    stringifyStream.on('end', () => {
                        resolve(`collection ${collection.name}: ${ended}/${counter} done`);
                        console.log(`Ended export of the collection ${collection.name}: ${ended++}/${counter}`);
                    });
                })
            } else {
                return `no export for the ${collection.name} collection`;
            }
        });
        
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
    get_sequence_numbers: get_all_sequence_numbers,
    get_info: get_db_info,
    get_image: get_image,
    add_class: add_class,
    add_sub_class: add_sub_class,
    add_bounding_box: add_bounding_box,
    get_classes: get_classes,
    get_sub_classes: get_sub_classes,
    get_bounding_boxes: get_bounding_box,
    remove_class: remove_class,
    remove_sub_class: remove_sub_class,
    remove_bounding_box: remove_bounding_box,
    update_bounding_box: update_bounding_box,
    update_info: update_db_info,
    export: export_dataset
};