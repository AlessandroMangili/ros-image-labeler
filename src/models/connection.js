const mongoose = require('mongoose');
const config = require('../config/config');

async function connectToDatabase() {    
    try {
        await mongoose.connect(config.MONGO_URL, {
            connectTimeoutMS: 2000,
        });
        return 'connected to mongodb instance';
    } catch (error) {
        console.error(`error connecting to mongodb instance ${error}`)
        return `error connecting to mongodb instance ${error}`;
    }
}

module.exports = { connectToDatabase };