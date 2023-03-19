require('dotenv').config();
const { MongoClient } = require('mongodb');

module.exports = {
    connect : async function () {
        const URI = `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.CLUSTER}.tkjqqjq.mongodb.net/?retryWrites=true&w=majority`;
        try {
            const client = new MongoClient(URI);
            await client.connect();
            console.log("Connected to MongoDB");
        } catch(connect_error) {
            console.log(`Error on connected to MongoDB with the following error:`);
            console.error(connect_error);
        }
    }
}

