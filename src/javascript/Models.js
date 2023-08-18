const mongoose = require('mongoose');

const classes_schema = new mongoose.Schema(
    {
        id : {type: Number, unique: true},
        name : {type: String, unique: true, required : true},
        color: String,
        subclasses : [{ 
            id : Number,
            name : String
        }]
    }
);

const bounding_box_schema = new mongoose.Schema(
    {
        seq : {type : Number, unique : true},
        bounding_box : [{
            id : Number,
            id_class : Number,
            id_sub_class : {type: Number, default: -1},
            rect : {
                attrs : {
                    x: Number,
                    y: Number,
                    width: Number,
                    height: Number,
                    name : String,
                    stroke : String,
                    strokeWidth : Number,
                    draggable : Boolean
                },
                className: String
            }
        }]
    }
);

const image_schema = new mongoose.Schema(
    {
        header : {
            seq : {type : Number, unique : true},
            stamp : {
                secs : Number,
                nsecs : Number
            },
            frame_id : String
        },
        height : Number,
        width : Number,
        encoding : String,
        is_bigendian : Number,
        step : Number,
        data : Buffer,
        _meta : {
            topic : String,
            latch : Boolean,
            inserted_at : Date,
            stored_class : String,
            stored_type : String
        }
    }
);

const db_info_schema = new mongoose.Schema(
    {
        topic : {type: String, unique: true},
        seq: Number
    }
)

var models = {};
getModel = (collectionName, schema) => {
    if (!(collectionName in models))
        models[collectionName] = mongoose.model(collectionName, schema, collectionName);
    return models[collectionName];
}

module.exports = {getModel, classes_schema, db_info_schema, bounding_box_schema, image_schema};