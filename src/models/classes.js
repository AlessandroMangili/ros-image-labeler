const mongoose = require('mongoose');

const mongoSchema = new mongoose.Schema(
    {
        id : {type: Number, unique: true, index: true},
        name : {type: String, unique: true, required : true},
        color: String,
        subclasses : [{ 
            id : Number,
            name : String
        }]
    }
);

const model = mongoose.model('classes', mongoSchema, 'classes');

module.exports = { model : model };