const path = require('path');
const dotenv = require('dotenv').config({path: path.join(__dirname, '..', '..', '.env')});
const dotenv_expand = require('dotenv-expand');

dotenv_expand.expand(dotenv);

if (process.env.MONGO_PORT === undefined) {
    console.error('.env file not found into project root');
    process.exit(1);
}

const config = {
    MONGO_URL: process.env.MONGO_URL,
    MONGO_PORT: process.env.MONGO_PORT,
    MONGO_USER: process.env.MONGO_USER,
    SERVER_PORT: process.env.SERVER_PORT,
};

module.exports = config;