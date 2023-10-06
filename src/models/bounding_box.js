const mongoose = require('mongoose');

const mongoSchema = new mongoose.Schema(
    {
        seq: { type: Number, unique: true, index: true },
        bounding_box: [{
            id: Number,
            id_class: Number,
            id_sub_class: { type: Number, default: -1 },
            rect: {
                attrs: {
                    x: { type: Number, default: 0},
                    y: { type: Number, default: 0},
                    width: Number,
                    height: Number,
                    name: String,
                    stroke: String,
                    strokeWidth: Number,
                    draggable: Boolean,
                },
                className: String,
            }
        }]
    }
);

const model = (topic) => { return mongoose.model(topic, mongoSchema, topic); };

let class_query = (id)  =>{ return { $pull: { bounding_box: { id_class: id, } } }; };
let sub_class_query = (id, id_sub_class) => { 
    let obj = class_query(id);
    obj.$pull.bounding_box.id_sub_class = id_sub_class;
    return obj; 
};

module.exports = { model: model, class_query, sub_class_query};