const { MongoClient } = require('mongodb');
//const  ObjectID = require('mongodb').ObjectId;

module.exports = {
    connect : async function () {
        const URI = `mongodb://localhost:62345`;
        const client = new MongoClient(URI);
        try {
            await client.connect();
            return client.db('roslog');
        } catch(connect_error) {
            throw new Error(connect_error);
        }
    },

    get_first_last_seq : async function(client, topic) {
        let documents = await client.collection(topic).find().toArray();

        if (documents.length == 0)
            return -1;
        return {first: documents[0].header.seq, last : documents[documents.length - 1].header.seq};
    },

    save_classes : async function(client, classes, class_to_color, sub_classes) {
        var obj = [];
        // Remove all documents before save
        await client.deleteMany({});

        if (classes.size == 0)
            return;

        class_to_color.forEach(outside => {
            let sb = [];
            sub_classes[classes.get(outside.name)].forEach((value, key) => {
                sb.push({'id' : value, 'name' : key});
            });
            obj.push({'id' : classes.get(outside.name), 'name' : outside.name, 'color' : outside.color, 'subclasses' : sb});
        });

        try {
            await client.insertMany(obj);
            console.log('Classes and sub-classes saved succesfull');
        } catch (error) {
            throw new Error(`error saving classes and sub-classes: ${error}`);
        }
    },

    save_bounding_box : async function(client, bounding) {
        let obj = [];
        // Remove all documents before save
        await client.deleteMany({});

        if (bounding.length == 0)
            return;

        Object.keys(bounding).forEach((topic, _) => {
            let i = [];
            Object.keys(bounding[topic]).forEach(image => {
                let r = [];
                bounding[topic][image].forEach(rect => {
                    r.push(rect);
                });
                i.push({'image_seq' : image, 'bounding_box' : r});
                
            });
            obj.push({'topic' : topic, 'images' : i});
        });

        try {
            await client.insertMany(obj);
            console.log('Bounding box saved succesfull');
        } catch (error) {
            throw new Error(`error saving bounding box: ${error}`);
        }
    },

    get_classes : async function(client) {
        let res = await client.find({}).toArray();
        return res;
    },

    get_bounding_box : async function(client) {
        let res = await client.find({}).toArray();
        return res;
    }
}