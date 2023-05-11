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

        // Remove all collection before save
        client.deleteMany({});

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
            await client.insertMany(obj)
            console.log('Classes and sub-classes saved succesfull');
        } catch (error) {
            throw new Error(`error: ${error}`);
        }
    },

    save_bounding_box : async function(client, boundingbox) {

    },

    get_classes : async function(client) {
        let res = await client.find({}).toArray();
        return res;
    },

    get_bounding_box : async function(client) {

    }
}