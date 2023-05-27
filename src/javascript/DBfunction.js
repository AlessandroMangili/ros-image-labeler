const mongoose = require('mongoose');

const classes_schema = new mongoose.Schema(
    {
        id : {type: Number, unique: true},
        name : {type: String, unique: true, required : true},
        color: String,
        subclasses : [{ 
            id : Number,
            name : String
        }]
    }
);

const bounding_box_schema = new mongoose.Schema(
    {
        seq : {type : Number, unique : true},
        bounding_box : [{
            id : Number,
            id_class : Number,
            id_sub_class : {type: Number, default: -1},
            rect : {
                attrs : {
                    x: Number,
                    y: Number,
                    width: Number,
                    height: Number,
                    name : String,
                    stroke : String,
                    strokeWidth : Number,
                    draggable : Boolean
                },
                className: String
            }
        }]
    }
);

module.exports = {
    connect : async function () {
        const URI = `mongodb://localhost:62345/roslog`;
        
        try {
            // Options is to avoid DeprecationWarning
            client = await mongoose.connect(URI, {
                connectTimeoutMS: 2000
            });
            console.log('connected to mongodb instance');
        } catch(connect_error) {
            console.error(`error connecting to mongodb instance`)
            throw new Error(`error connecting to mongodb instance ${connect_error}`);
        }
    },

    // Create the db and collection in which the data will be saved
    create_collections : async function () {
        try {
            await mongoose.model('classes', classes_schema, 'classes').createCollection();
        
            let topics = await this.get_image_topics();
            if (topics == null) {
                console.warn('no collection created for saving bounding box');
                return;
            }
        
            topics.forEach(async topic => {
                await mongoose.model(`${topic.name}_bounding_box`, bounding_box_schema, `${topic.name}_bounding_box`).createCollection();
            });
            console.log('collections created successful');
        } catch (e) {
            console.error(`error on create collection for classes and bounding box: ${e}`);
            throw new Error(`error on create collection for classes and bounding box: ${e}`);
        }
    },

    get_image_topics : async function() {
        try {
            let topics = await mongoose.connection.db.listCollections().toArray();

            if (topics.length == 0)
                throw new Error(`no topics were saved`);
    
            let clone = topics.slice();
            topics.forEach(topic => {
                if (topic.name.indexOf('image_raw') < 0 || topic.name.indexOf('bounding_box') >= 0)
                    clone.splice(clone.indexOf(topic), 1);
            });
    
            if (clone.length == 0)
                throw new Error(`no image topics are saved`);
    
            return clone;
        } catch (error) {
            console.error(`error on retriving topics: ${error}`);
            throw new Error(`error on retriving topics: ${error}`);
        }
    },

    get_first_last_seq : async function(topic) {
        try {
            let documents = await mongoose.connection.db.collection(topic).find({}).toArray();
            
            documents.sort((first, second) => {
                return first.header.seq > second.header.seq ? 1 : (first.header.seq < second.header.seq) ? -1 : 0;
            });
    
            if (documents.length == 0 || documents == {})
                throw new Error('collection is empty');
            return {first: documents[0].header.seq, last : documents[documents.length - 1].header.seq};
        } catch (error) {
            console.error(`error on retrive information on first and last sequence image number: ${error}`);
            throw new Error(`error on retrive information on first and last sequence image number: ${error}`);
        }
    },

    get_image : async function(topic, seq) {
        let image = await mongoose.connection.db.collection(topic).findOne({'header.seq': seq});
        if (image == null)
            throw new Error(`image with sequence number ${seq} is not found`);
        return image;
    },

    add_class : async function(name, color) {
        try {
            let document = await mongoose.model('classes', classes_schema).findOne({}).sort({id: -1});
            // Auto-inc id??
            const obj = {id : document == null ? 0 : document.id + 1, name : name, color: color, subclasses : []};
            await mongoose.model('classes', classes_schema).create(obj);
        } catch (error) {
            console.error(`error on saving ${name} class: ${error}`);
            throw new Error(`error on saving ${name} class: ${error}`);
        }
    },

    add_sub_class : async function(name, sub_name) {
        try {
            let document = await mongoose.model('classes', classes_schema).findOne({name: name}).select('subclasses -_id');

            if (document == null)
                throw new Error(`the class ${name} is not found into db`);

            document = document.subclasses;
            document.sort((first, second) => {
                return first.id > second.id ? -1 : (first.id < second.id) ? 1 : 0;
            });
    
            await mongoose.model('classes', classes_schema).findOneAndUpdate({name: name}, {$push: {subclasses: {id : document.length == 0 ? 0 : document[0].id + 1 ,name: sub_name}}});
        } catch (error) {
            console.error(`error on adding sub class ${sub_name} to ${name} class: ${error}`);
            throw new Error(`error on adding sub class ${sub_name} to ${name} class: ${error}`);
        }
    },

    add_bounding_box_with_id : async function(topic, image_number, bounding_box, id) {
        try {
            let res = await mongoose.connection.db.collection(topic).findOne({'header.seq': image_number});
            if (res == null)
                throw new Error(`image with sequence number ${image_number} does not exist into DB`);

            let name = bounding_box.attrs.name.split('-')[0];
            let sub_name = bounding_box.attrs.name.split('-')[1];
            let obj_class = await mongoose.model('classes', classes_schema).findOne({name: name});
            let id_sub_class = -1;

            if (obj_class == null)
                throw new Error(`the class ${name} of bounding box does not exists`);

            obj_class.subclasses.forEach(subclass => {
                if (subclass.name == sub_name)
                    id_sub_class = subclass.id;
            });

            res = await mongoose.model(`${topic}_bounding_box`, bounding_box_schema, `${topic}_bounding_box`).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : id, id_class : obj_class.id, id_sub_class : id_sub_class, rect : bounding_box}}}, {upsert: true, new: true});
            res = res.bounding_box;
            if (!res.some(doc => doc.id === id))
                throw new Error(`the bounding box has not been added`);
        } catch(error) {
            console.error(`error on adding bounding box : ${error}`);
            throw new Error(`error on adding bounding box : ${error}`);
        }
    },

    add_bounding_box : async function(topic, image_number, bounding_box) {
        try {
            let res = await mongoose.connection.db.collection(topic).findOne({'header.seq': image_number});
            if (res == null)
                throw new Error(`image with sequence number ${image_number} does not exist into DB`);

            let name = bounding_box.attrs.name.split('-')[0];
            let sub_name = bounding_box.attrs.name.split('-')[1];
            let obj_class = await mongoose.model('classes', classes_schema).findOne({name: name});
            let id_sub_class = -1;

            if (obj_class == null)
                throw new Error(`the class ${name} of bounding box does not exists`);

            obj_class.subclasses.forEach(subclass => {
                if (subclass.name == sub_name)
                    id_sub_class = subclass.id;
            });

            let id = await get_max_id_bounding_box(`${topic}_bounding_box`);
            res = await mongoose.model(`${topic}_bounding_box`, bounding_box_schema, `${topic}_bounding_box`).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : id + 1, id_class : obj_class.id, id_sub_class : id_sub_class, rect : bounding_box}}}, {upsert: true, new: true});
            res = res.bounding_box;
            if (!res.some(doc => doc.id === id + 1))
                throw new Error(`the bounding box has not been added`);
        } catch(error) {
            console.error(`error on adding bounding box : ${error}`);
            throw new Error(`error on adding bounding box : ${error}`);
        }
    },

    get_classes : async function() {
        try {
            let documents = await mongoose.model('classes', classes_schema).find({});
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
            let documents = await mongoose.model('classes', classes_schema).findOne({name : name}).select('subclasses');
            if (documents.subclasses == null)
                return [];

            let sub_classes = [];
            documents.subclasses.forEach(document => {
                sub_classes.push(document.name);
            });

            return sub_classes;
        } catch (error) {
            console.error(`error on getting sub classes of class ${name} from db: ${error}`);
            throw new Error(`error on getting sub classes of class ${name} from db: ${error}`);
        }
    },

    get_bounding_box : async function(topic, image_number) {
        try {
            let documents = await mongoose.model(`${topic}_bounding_box`, bounding_box_schema, `${topic}_bounding_box`).findOne({seq : image_number}).select('bounding_box -_id');
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
            let id = await mongoose.model('classes', classes_schema).findOne({name: name});
            let res = await mongoose.model('classes', classes_schema, 'classes').deleteOne({name: name});
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
            let id_class = await mongoose.model('classes', classes_schema).findOne({name : name});
            let id_sub_class = await mongoose.model('classes', classes_schema).findOne({name : name}).select({subclasses: {$elemMatch: {name: sub_name}}});
            
            if (id_sub_class.subclasses.length == 0)
                throw new Error(`no sub classes found on db`);

            let res = await mongoose.model('classes', classes_schema, 'classes').updateOne({name : name}, {$pull: {subclasses: {name: sub_name}}});

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
            let res = await mongoose.model(`${topic}_bounding_box`, bounding_box_schema, `${topic}_bounding_box`).updateOne({seq : image_number}, {$pull: {bounding_box: {id: id}}});
            
            if (res.modifiedCount < 1)
                throw new Error(`bounding box with id ${id} has not been removed`);
        } catch (error) {
            console.error(`error on removing bounding box of ${topic} from db: ${error}`);
            throw new Error(`error on removing bounding box of ${topic} from db: ${error}`);
        }
    },

    update_bounding_box : async function(topic, image_number, old_rect, new_rect) {
        try {
            let res = await mongoose.connection.db.collection(topic).findOne({'header.seq': image_number});
            if (res == null)
                throw new Error(`image with sequence number ${image_number} does not exist into DB`);

            let name = new_rect.attrs.name.split('-')[0];
            let sub_name = new_rect.attrs.name.split('-')[1];
            let obj_class = await mongoose.model('classes', classes_schema).findOne({name: name});
            let id_sub_class = -1;

            if (obj_class == null)
                throw new Error(`the class ${name} of bounding box does not exists`);

            obj_class.subclasses.forEach(subclass => {
                if (subclass.name == sub_name)
                    id_sub_class = subclass.id;
            });

            res = await mongoose.model(`${topic}_bounding_box`, bounding_box_schema, `${topic}_bounding_box`).updateOne({seq : image_number}, {$pull: {bounding_box: {id: old_rect.id}}});
            if (res.modifiedCount < 1)
                throw new Error(`bounding box with id ${old_rect.id} has not been changed`);

            res = await mongoose.model(`${topic}_bounding_box`, bounding_box_schema, `${topic}_bounding_box`).findOneAndUpdate({seq : image_number}, {$push: {bounding_box: {id : old_rect.id, id_class : obj_class.id, id_sub_class : id_sub_class, rect : new_rect}}}, {new: true});
            res = res.bounding_box;
            if(!res.some(doc => doc.id === old_rect.id))
                throw new Error(`bounding box with id ${old_rect.id} has not been added`);
        } catch (error) {
            console.error(`error on updating bounding box of ${topic} from db: ${error}`);
            throw new Error(`error on updating bounding box of ${topic} from db: ${error}`);
        }
    },
}

// FUNCTION

async function get_max_id_bounding_box(topic) {
    try {
        let max_id = await mongoose.connection.db.collection(topic).find({}).toArray();
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
                max  = document.bounding_box[0].id;
        });
        return max;
    } catch (error) {
        console.error(`error on retriving max id of bounding box of topic ${topic} from db: ${error}`);
        throw new Error(`error on retriving max id of bounding box of topic ${topic} from db: ${error}`);
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
                await mongoose.model(collection.name, bounding_box_schema, collection.name).updateMany({}, {$pull: {bounding_box: {id_class: id}}});
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
                await mongoose.model(collection.name, bounding_box_schema, collection.name).updateMany({}, {$pull: {bounding_box: {id_class: id_class, id_sub_class: id_sub_class}}});
            }
        });
   } catch (error) {
        console.error(`error on removing bounding box of sub class ${sub_name} of class ${name} from db: ${error}`);
        throw new Error(`error on removing bounding box of sub class ${sub_name} of class ${name} from db: ${error}`);
   }
}