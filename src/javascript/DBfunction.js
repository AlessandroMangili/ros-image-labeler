require('dotenv').config();
const { MongoClient } = require('mongodb');

module.exports = {
    connect : async function () {
        const URI = `mongodb+srv://${process.env.USERNAME}:${process.env.PASSWORD}@${process.env.CLUSTER}.tkjqqjq.mongodb.net/?retryWrites=true&w=majority`;
        const client = new MongoClient(URI);
        try {
            await client.connect();
            
            return client;
        } catch(connect_error) {
            console.log(`Error on connected to MongoDB with the following error:`);
            console.error(connect_error);
        }
    },

    createMultipleListings : async function (client, newListings) {
        const result = await client.db("database").collection("collection").insertMany(newListings);

        console.log(`${result.insertedCount} new listings created with the following id (s):`);
        console.log(result.insertedIds);
    },

    findOneListing : async function (client, listing) {
        const result = await client.db("database").collection("collection").findOne();

        if (result) {
            console.log(`Found a listing in the collection`);
            console.log(result);
        } else {
            console.log(`No listing find`);
        }
    },

    updateOne : async function (client,  listing, update) {
        const result = await client.db("database").collection("collection").updateOne(/* {name: listing}, {set: update} */);

        console.log(`${result.matchedCount} document(s) matched the query`);
        console.log(`${result.modifiedCount} documents was/were updated`);
    },

    deleteOne : async function (client, listing) {
        const result = await client.db("database").collection("collection").deleteOne(/* {name: listing} */);

        console.log(`${result.deletedCount} documente(s) was/were deleted`);
    }
}