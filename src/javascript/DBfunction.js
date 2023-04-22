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
    }
}