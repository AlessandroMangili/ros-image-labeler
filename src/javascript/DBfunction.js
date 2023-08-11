const mongoose = require('mongoose');
const Models = require('./Models');

const fs = require('fs');
var JSONStream = require( "JSONStream" );
const json = require('big-json');
const { rejects } = require('assert');
const { resolve } = require('path');

module.exports = {
    connect : async function () {
        const URI = `mongodb://localhost:62345/roslog`;
        
        try {
            await mongoose.connect(URI, {
                connectTimeoutMS: 2000
            });
            console.log('connected to mongodb instance');
        } catch (connect_error) {
            console.error(`error connecting to mongodb instance`)
            throw new Error(`error connecting to mongodb instance ${connect_error}`);
        }
    },

    // Create the db and collection in which the data will be saved
    create_collections : async function () {
        try {
            await Models.getModel('classes', Models.classes_schema).createCollection();
        
            let topics = await this.get_image_topics();
            if (topics == null) {
                console.warn('no collection created for saving bounding box');
                return;
            }
        
            topics.forEach(async topic => {
                await Models.getModel(`${topic.name}_bounding_box`, Models.bounding_box_schema).createCollection();
            });

            await Models.getModel('db_info', Models.db_info_schema).createCollection();
            console.log('collections created successful');
        } catch (error) {
            console.error(`error on create collection for classes and bounding box: ${error}`);
            throw new Error(`error on create collection for classes and bounding box: ${error}`);
        }
    },

    get_image_topics : async function() {
        try {
            let topics = await mongoose.connection.db.listCollections().toArray();

            if (topics.length == 0)
                throw new Error(`no topics were saved`);
            
            // Return all topics that contains images by checking the field 'data' knowing it is present only in image topics
            const promises = topics.map(async (topic) => {
                let result = await mongoose.connection.db.collection(topic.name).findOne({data : {$ne: null}});
                if (result != null)
                    return topic.name;
            });

            let image_topics = await Promise.all(promises);
            // Just remove the undefined topics 
            image_topics = image_topics.filter(item => item != undefined);
    
            if (image_topics.length == 0)
                throw new Error(`no image topics are saved`);
    
            return image_topics;
        } catch (error) {
            console.error(`error on retrive topics: ${error}`);
            throw new Error(`error on retrive topics: ${error}`);
        }
    },

    get_all_image_sequence_numbers : async function(topic) {
        try {
            let documents = await Models.getModel(topic, Models.image_schema).find({}, {header: 1, _id: 0});

            if (documents.length == 0)
                throw new Error('there are no images found');

            documents.sort((first, second) => {
                return first.header.seq > second.header.seq ? 1 : (first.header.seq < second.header.seq) ? -1 : 0;
            });

            return documents;
        } catch (error) {
            console.error(`error on retrive images: ${error}`);
            throw new Error(`error on retrive images: ${error}`);
        }
    },

    get_db_info : async function(topic) {
        try {
            return await Models.getModel('db_info', Models.db_info_schema).findOne({topic : topic});
        } catch (error) {
            console.error(`error on retrive information about last image sequence of topic: ${topic} with the following error: ${error}`);
            throw new Error(`error on retrive information about last image sequence of topic: ${topic} with the following error: ${error}`);
        }
    },

    get_image : async function(topic, seq) {
        let image = await Models.getModel(topic, Models.image_schema).findOne({'header.seq': seq});
        if (image == null)
            throw new Error(`image with sequence number ${seq} is not found`);
        return image;
    },

    add_class : async function(name, color) {
        try {
            let document = await Models.getModel('classes', Models.classes_schema).findOne({}).sort({id: -1});
            // Auto-inc id??
            await Models.getModel('classes', Models.classes_schema).create({id : document == null ? 0 : document.id + 1, name : name, color: color, subclasses : []})
        } catch (error) {
            console.error(`error on saving ${name} class: ${error}`);
            throw new Error(`error on saving ${name} class: ${error}`);
        }
    },

    add_sub_class : async function(name, sub_name) {
        try {
            let document = await Models.getModel('classes', Models.classes_schema).findOne({name: name}, {subclasses: 1, _id : 0});

            if (document == null)
                throw new Error(`the class ${name} is not found into db`);

            document = document.subclasses;
            document.sort((first, second) => {
                return first.id > second.id ? -1 : (first.id < second.id) ? 1 : 0;
            });
    
            await Models.getModel('classes', Models.classes_schema).findOneAndUpdate({name: name}, {$push: {subclasses: {id : document.length == 0 ? 0 : document[0].id + 1, name: sub_name}}});
        } catch (error) {
            console.error(`error on adding sub class ${sub_name} to ${name} class: ${error}`);
            throw new Error(`error on adding sub class ${sub_name} to ${name} class: ${error}`);
        }
    },

    add_bounding_box_with_id : async function(topic, image_number, bounding_box, id) {
        try {
            let res = await Models.getModel(topic, Models.image_schema).findOne({'header.seq': image_number});
            if (res == null)
                throw new Error(`image with sequence number ${image_number} does not exist into DB`);

            let name = bounding_box.attrs.name.split('-')[0];
            let sub_name = bounding_box.attrs.name.split('-')[1];
            let obj_class = await Models.getModel('classes', Models.classes_schema).findOne({name: name});
            if (obj_class == null)
                throw new Error(`the class ${name} of bounding box does not exists`);

            let id_sub_class = obj_class.subclasses.find((sub_class) => sub_class.name == sub_name);
            id_sub_class = id_sub_class == undefined ? -1 : id_sub_class.id;

            res = await Models.getModel(`${topic}_bounding_box`, Models.bounding_box_schema).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : id, id_class : obj_class.id, id_sub_class : id_sub_class, rect : bounding_box}}}, {upsert: true, new: true});
            res = res.bounding_box;
            if (!res.some(doc => doc.id === id))
                throw new Error(`the bounding box has not been added`);
        } catch (error) {
            console.error(`error on adding bounding box : ${error}`);
            throw new Error(`error on adding bounding box : ${error}`);
        }
    },

    add_bounding_box : async function(topic, image_number, bounding_box) {
        try {
            let res = await Models.getModel(topic, Models.image_schema).findOne({'header.seq': image_number});
            if (res == null)
                throw new Error(`image with sequence number ${image_number} does not exist into DB`);

            let name = bounding_box.attrs.name.split('-')[0];
            let sub_name = bounding_box.attrs.name.split('-')[1];
            let obj_class = await Models.getModel('classes', Models.classes_schema).findOne({name: name});
            if (obj_class == null)
                throw new Error(`the class ${name} of bounding box does not exists`);

            let id_sub_class = obj_class.subclasses.find((sub_class) => sub_class.name == sub_name);
            id_sub_class = id_sub_class == undefined ? -1 : id_sub_class.id;

            let id = await get_max_id_bounding_box(`${topic}_bounding_box`);
            res = await Models.getModel(`${topic}_bounding_box`, Models.bounding_box_schema).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : id + 1, id_class : obj_class.id, id_sub_class : id_sub_class, rect : bounding_box}}}, {upsert: true, new: true});
            res = res.bounding_box;
            if (!res.some(doc => doc.id === id + 1))
                throw new Error(`the bounding box has not been added`);
        } catch (error) {
            console.error(`error on adding bounding box : ${error}`);
            throw new Error(`error on adding bounding box : ${error}`);
        }
    },

    get_classes : async function() {
        try {
            let documents = await Models.getModel('classes', Models.classes_schema).find({});
            if (documents == null)
                return [];

            let classes = [];
            documents.forEach(document => {
                classes.push({name : document.name, color : document.color});
            });
    
            return classes;
        } catch (error) {
            console.error(`error on getting classes from db: ${error}`);
            throw new Error(`error on getting classes from db: ${error}`);
        }
    },

    get_sub_classes : async function(name) {
        try {
            let documents = await Models.getModel('classes', Models.classes_schema).findOne({name : name}, {subclasses : 1, _id: 0});
            if (documents == null)
                return [];

            // For removing all useless fields and keep only the name field
            return documents.subclasses.map(({id, _id, name}) => name);
        } catch (error) {
            console.error(`error on getting sub classes of class ${name} from db: ${error}`);
            throw new Error(`error on getting sub classes of class ${name} from db: ${error}`);
        }
    },

    get_bounding_box : async function(topic, image_number) {
        try {
            let documents = await Models.getModel(`${topic}_bounding_box`, Models.bounding_box_schema).findOne({seq : image_number}, {bounding_box: 1, _id: 0});
            if (documents == null)
                return [];
            return documents.bounding_box;
        } catch (error) {
            console.error(`error on getting bounding box of topic ${topic} from db: ${error}`);
            throw new Error(`error on getting bounding box of topic ${topic} from db: ${error}`);
        }
    },

    remove_class : async function(name) {
        try {
            let id = await Models.getModel('classes', Models.classes_schema).findOne({name: name}, {id: 1, _id: 0});
            let res = await Models.getModel('classes', Models.classes_schema).deleteOne({name: name});
            if (res.deletedCount < 1)
                throw new Error(`no classes have been removed`);
            remove_bounding_box_by_class(id.id, name);
        } catch (error) {
            console.error(`error on removing class ${name} from db: ${error}`);
            throw new Error(`error on removing class ${name} from db: ${error}`);
        }
    },

    remove_sub_class : async function(name, sub_name) {
        try {
            let id_class = await Models.getModel('classes', Models.classes_schema).findOne({name : name});
            let id_sub_class = await Models.getModel('classes', Models.classes_schema).findOne({name : name}, {subclasses: {$elemMatch: {name: sub_name}}});
            if (id_sub_class.subclasses.length == 0)
                throw new Error(`no subclasses found on db`);

            let res = await Models.getModel('classes', Models.classes_schema).updateOne({name : name}, {$pull: {subclasses: {name: sub_name}}});
            if (res.modifiedCount < 1)
                throw new Error(`no sub classes have been removed`);
  
            remove_bounding_box_by_sub_class(id_class.id, id_sub_class.subclasses[0].id, name, sub_name);
        } catch (error) {
            console.error(`error on removing sub class ${sub_name} of class ${name} from db: ${error}`);
            throw new Error(`error on removing sub class ${sub_name} of class ${name} from db: ${error}`);
        }
    },

    remove_bounding_box : async function(topic, image_number, id) {
        try {
            let res = await Models.getModel(`${topic}_bounding_box`, Models.bounding_box_schema).updateOne({seq : image_number}, {$pull: {bounding_box: {id: id}}});
            if (res.modifiedCount < 1)
                throw new Error(`bounding box with id ${id} has not been removed`);
        } catch (error) {
            console.error(`error on removing bounding box of ${topic} from db: ${error}`);
            throw new Error(`error on removing bounding box of ${topic} from db: ${error}`);
        }
    },

    update_bounding_box : async function(topic, image_number, old_rect, new_rect) {
        try {
            let res = await Models.getModel(topic, Models.image_schema).findOne({'header.seq': image_number});
            if (res == null)
                throw new Error(`image with sequence number ${image_number} does not exist into DB`);

            let name = new_rect.attrs.name.split('-')[0];
            let sub_name = new_rect.attrs.name.split('-')[1];
            let obj_class = await Models.getModel('classes', Models.classes_schema).findOne({name: name});
            if (obj_class == null)
                throw new Error(`the class ${name} of bounding box does not exists`);

            let id_sub_class = obj_class.subclasses.find((sub_class) => sub_class.name == sub_name);
            id_sub_class = id_sub_class == undefined ? -1 : id_sub_class.id;

            res = await Models.getModel(`${topic}_bounding_box`, Models.bounding_box_schema).updateOne({seq : image_number}, {$pull: {bounding_box: {id: old_rect.id}}});
            if (res.modifiedCount < 1)
                throw new Error(`bounding box with id ${old_rect.id} has not been changed`);

            res = await Models.getModel(`${topic}_bounding_box`, Models.bounding_box_schema).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : old_rect.id, id_class : obj_class.id, id_sub_class : id_sub_class, rect : new_rect}}}, {new: true});
            res = res.bounding_box;
            if(!res.some(doc => doc.id === old_rect.id))
                throw new Error(`bounding box with id ${old_rect.id} has not been added`);
        } catch (error) {
            console.error(`error on updating bounding box of ${topic} from db: ${error}`);
            throw new Error(`error on updating bounding box of ${topic} from db: ${error}`);
        }
    },

    update_db_info : async function(topic, image_number) {
        try {
            let res = await Models.getModel('db_info', Models.db_info_schema).findOne({topic: topic});
            if (res == null || res.seq <= image_number)
                await Models.getModel('db_info', Models.db_info_schema).findOneAndUpdate({topic: topic}, {topic: topic, seq: image_number}, {upsert: true, new: true});
        } catch (error) {
            console.error(`error on updating db info of ${topic} with the following error: ${error}`);
            throw new Error(`error on updating db info of ${topic} with the following error: ${error}`);
        }
    },

    export_dataset : async function(db_name) {
        let path = __dirname + `/../export/${db_name}`;
        try {
            let collections = await mongoose.connection.db.listCollections().toArray();

            // Remove and create again the collection to avoid the appending
            fs.rmSync(path, { recursive: true, force: true});
            fs.mkdirSync(path, {recursive: true});

            let counter = 0;
            let ended = 1;

            let promises = collections.map(async collection => {
                if (collection.name.indexOf('camera') >= 0 || collection.name === 'classes') {
                    counter++;
                    let docs = await mongoose.connection.db.collection(collection.name).find({}).toArray();
                    
                    const stringifyStream = json.createStringifyStream({
                        body: docs
                    });

                    // Appending the strChunk to file
                    stringifyStream.on('data', function(strChunk) {
                        fs.appendFileSync(__dirname + `/../export/${db_name}/${collection.name}.json`, strChunk);
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
            throw new Error(`error on export db with the following error: ${error}`);
        }
    },
}

// FUNCTION

async function get_max_id_bounding_box(topic) {
    try {
        let max_id = await mongoose.model(topic, Models.bounding_box_schema).find({});
        if (max_id == [])
            return -1;

        let max = 0;
        max_id.forEach(document => {
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
}

// Remove all bounding box of a class
async function remove_bounding_box_by_class(id, name) {
   try {
        let collections = await mongoose.connection.db.listCollections().toArray();

        if (collections == null)
            throw new Error('no collections have been created');

        collections.forEach(async (collection) => {
            if (collection.name.indexOf('_bounding_box') >= 0) {
                await Models.getModel(collection.name, Models.bounding_box_schema).updateMany({}, {$pull: {bounding_box: {id_class: id}}});
            }
        });
   } catch (error) {
        console.error(`error on removing bounding box of class ${name} from db: ${error}`);
        throw new Error(`error on removing bounding box of class ${name} from db: ${error}`);
   }
}

// Remove all bounding box of a sub class
async function remove_bounding_box_by_sub_class(id_class, id_sub_class, name, sub_name) {
    try {
        let collections = await mongoose.connection.db.listCollections().toArray();

        if (collections == null)
            throw new Error('no collections have been created');

        collections.forEach(async (collection) => {
            if (collection.name.indexOf('_bounding_box') >= 0) {
                await Models.getModel(collection.name, Models.bounding_box_schema).updateMany({}, {$pull: {bounding_box: {id_class: id_class, id_sub_class: id_sub_class}}});
            }
        });
   } catch (error) {
        console.error(`error on removing bounding box of sub class ${sub_name} of class ${name} from db: ${error}`);
        throw new Error(`error on removing bounding box of sub class ${sub_name} of class ${name} from db: ${error}`);
   }
}