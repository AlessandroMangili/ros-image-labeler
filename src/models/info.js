const mongoose = require('mongoose');

const mongoSchema = new mongoose.Schema(
    {
        topic: { type: String, unique: true },
        seq: Number,
    }
);

const model = mongoose.model('db_info', mongoSchema, 'db_info');

module.exports = { model : model };