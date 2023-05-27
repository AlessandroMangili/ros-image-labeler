// SOCKET_IO section
var socket = io();

// Get get all topics of the selected local instance of mongodb and load the first image
function get_all_topics() {
    socket.emit('get topics', '', (res) => {
        if (res.indexOf('error') >= 0) {
            alert(`there are no image collections saved, then remove local instance and try again`);
            window.location.href = '/';
            console.error(res);
            return;
        }

        fill_topics(res);
        if (localStorage.getItem('topic') == null)
            localStorage.setItem('topic', select_topic.value);
        else 
            select_topic.value = localStorage.getItem('topic');
        
        get_first_last_seq(select_topic.value);
    });
}

// Get the first sequence number of the topic
function get_first_last_seq(topic) {
    socket.emit('get first_last_seq', topic, (res) => {
        if (String(res).indexOf('error') >= 0 || Object.keys(res).length == 0) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }

        first = res.first;
        last = res.last

        if (localStorage.getItem('image_sequence') == null) {
            image_sequence = res.first;
            localStorage.setItem('image_sequence', image_sequence);
            keeper_image_number.innerText = `${0}/${last-first}`;
        } else {
            image_sequence = Number(localStorage.getItem('image_sequence'));
            keeper_image_number.innerText = `${image_sequence-first}/${last-first}`;
        }

        get_image(select_topic.value, image_sequence);
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// Get the image from topic and sequence number and show it
function get_image(topic, image, mode) {
    socket.emit('get image', {topic: topic, seq : image}, (res) => {
        if (res.indexOf('error') >= 0) {
            if (image_sequence < first) {
                localStorage.removeItem('image_sequence');
                window.location.href = '/draw';
                console.error(res);
                return;
            }
            console.error(res);
            load_background_image(null);
            return;
        }
        
        load_background_image(res);
    });
}

// Add class formed by name and color
function add_class(name, color) {
    socket.emit('add class', {name: name, color: color}, (res) => {
        if (res.indexOf(`MongoServerError`) >= 0)
            console.error(res);
        else
            console.log(res);
    });
}

// Add sub-class for selected class formed by sub-class name
function add_sub_class(name, sub_name) {
    socket.emit('add sub_class', {name : name, sub_name : sub_name}, (res) => {
        if (res.indexOf(`MongoServerError`) >= 0)
            console.error(res);
        else
            console.log(res);
    });
}

function add_bounding_box_with_id(topic, image, rect, id) {
    socket.emit('add bounding_box with id', {topic: topic, image: image, bounding_box: rect, id : id}, (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// Add bounding box formed by topic, image and rect
function add_bounding_box(topic, image, rect) {
    socket.emit('add bounding_box', {topic: topic, image: image, bounding_box: rect}, (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// Get all classes
function get_classes() {
    // Fill the left sidebar with the classes saved
    socket.emit('get classes', '', (res) => {
        if (res.indexOf('error') >= 0) {
            window.location.href = '/';
            console.error(res);
            return;
        }

        res.forEach(node => {
            create_class(node.name, node.color);
        });
    });
}

// Get all sub-classes from class name
function get_sub_classes(name) {
    socket.emit('get sub_classes', name, (res) => {
        clear_sub_classes_sidebar();

        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }

        res.forEach(sub_name => {
            create_sub_class(sub_name);
        });
    });
}

function get_only_bounding_box(topic, image) {
    socket.emit('get only bounding_box', {topic: topic, image: image}, (res) => {
        if (res.indexOf('error') >= 0 || res == null) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }

        let old_bounding_box = bounding_box;
        // If checked, save all local bounding box
        if (local_bounding.checked) {
            old_bounding_box.forEach(rect => {
                if (rect.id >= 0 && !exist_bounding_box_by_id(res, rect.id))
                    add_bounding_box_with_id(select_topic.value, image_sequence, rect.rect, rect.id);
            });
        }
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// Get all bounding bounding box of an image by topic and image sequence
function get_bounding_box(topic, image) {
    socket.emit('get bounding_box', {topic: topic, image: image}, (res) => {
        if (res.indexOf('error') >= 0 || res == null) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }

        remove_local_bounding_box();

        bounding_box = res;
        let update_rect;
        // Get all bounding box saved on the server
        res.forEach(node => {
            // Create a new rect when loaded from nodejs and add function for resizing
            let rect = new Konva.Rect({
                x: node.rect.attrs.x,
                y: node.rect.attrs.y,
                width: node.rect.attrs.width,
                height: node.rect.attrs.height,
                name: node.rect.attrs.name,
                stroke: node.rect.attrs.stroke,
                strokeWidth: 3,
                draggable: true,
            });

            let text = new Konva.Text({
                x: rect.x(),
                y: rect.y(),
                text: `${rect.attrs.name.split('-')[0]} ${rect.attrs.name.split('-')[1]}`,
                width: rect.width(),
                fontSize: 14,
                align: 'center',
                fontFamily: 'Lato',
                draggable : false,
            });

            // On trasform start, get the position of the rect
            rect.on('transformstart', (e) => {
                update_rect = {
                    attrs : {
                        x : e.currentTarget.getPosition().x,
                        y : e.currentTarget.getPosition().y,
                        width : e.currentTarget.width(),
                        height : e.currentTarget.height(),
                    },
                    id : node.id,
                };
            });

            // On trasform end, update the position of the rect into the server
            rect.on('transformend', (e) => {
               // For removing the scaling of rect and set the correct width and height
                e.currentTarget.setAttrs({
                    width : e.currentTarget.width() * e.currentTarget.scaleX(),
                    height : e.currentTarget.height() * e.currentTarget.scaleY(),
                    scaleX : 1,
                    scaleY : 1
                });

                if (!is_out_border(e.currentTarget)) {               
                    text.setAttrs({
                        x : e.currentTarget.x(),
                        y : e.currentTarget.y(),
                        width : e.currentTarget.width(),
                    });

                    update_bounding_box(select_topic.value, image_sequence, update_rect, e.currentTarget.toObject());
                } else
                    get_bounding_box(select_topic.value, image_sequence);
                tr.nodes([]);
            });

            // On drag start, get the position of the rect
            rect.on('dragstart', (e) => {
                update_rect = {
                    attrs : {
                        x : e.currentTarget.getPosition().x,
                        y : e.currentTarget.getPosition().y,
                        width : e.currentTarget.width(),
                        height : e.currentTarget.height(),
                    },
                    id : node.id,
                };
            });

            // On drag end, update the position of the rect into the server
            rect.on('dragend', (e) => {
                if (!is_out_border(e.currentTarget)) {
                    text.setAttrs({
                        x : e.currentTarget.x(),
                        y : e.currentTarget.y(),
                        width : e.currentTarget.width(),
                    });
                    
                    update_bounding_box(select_topic.value, image_sequence, update_rect, e.currentTarget.toObject());
                } else {
                    e.currentTarget.setAttrs({
                        x: update_rect.attrs.x,
                        y: update_rect.attrs.y,
                    });
                }
            });
            
            layer.add(rect);
            layer.add(text);
        });
    });
}

// Remove class from the name
function remove_class(name) {
    socket.emit('remove class', name, (res) => {
        if (res.indexOf('error') >= 0) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }
        
        clear_sub_classes_sidebar();
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// Remove sub-class from the class name
function remove_sub_class(name, sub_name) {
    socket.emit('remove sub_class', {name : name, sub_name : sub_name}, (res) => {
        if (res.indexOf('error') >= 0)
            console.error(res);
        
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// Remove bounding box from the rect
function remove_bounding_box(topic, image, id) {
    socket.emit('remove bounding_box', {topic: topic, image: image, id : id}, (res) => {
        if (res.indexOf('error') >= 0) {
            alert(res);
            console.error(res);
            return;
        }
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// Update a specific bounding box on drag or resize
function update_bounding_box(topic, image, old_rect, new_rect) {
    socket.emit('update bounding_box', {topic: topic, image: image, old_rect : old_rect, new_rect : new_rect}, (res) => {
        if (res.indexOf('error') >= 0) {
            alert(res);
            console.error(res);
            return;
        }
        get_bounding_box(select_topic.value, image_sequence);
    });
}

// INDEX

// Save the bag file inside the newly created local mongodb instace
function save_bag_into_mongo(filename) {
    socket.emit('save_bag', filename, (res) => {
        if (String(res).indexOf('error') < 0) {
            window.location.href = '/draw';
            console.log(res);
        } else
            console.log(res);
    });
}

// Get all local instaces
function get_db() {
    socket.emit('get db', '', (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        
        res.forEach(collection => {
            var node = document.createElement('option');
            node.value = collection;
            node.innerText = collection;
            db.appendChild(node);
        });
    });
}

// Connect the mongodb client to the selected local instace
function load_db(msg) {
    socket.emit('load db', msg, (res) => {
        if (res.indexOf('error') < 0) {
            window.location.href = '/draw';
            console.log(res);
        } else
            console.log(res);
    });
}