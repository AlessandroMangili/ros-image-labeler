const mongoose = require('mongoose');

const mongoSchema = new mongoose.Schema(
    {
        header: {
            seq: { type: Number, unique: true, index: true } ,
            stamp: { secs: Number, nsecs: Number },
            frame_id: String
        },
        height: Number,
        width: Number,
        encoding: String,
        is_bigendian: Number,
        step: Number,
        data: Buffer,
        _meta: {
            topic: String,
            latch: Boolean,
            inserted_at: Date,
            stored_class: String,
            stored_type: String,
        },
    }
);

const model = (topic) => { return mongoose.model(topic, mongoSchema, topic); };

module.exports = { model : model };