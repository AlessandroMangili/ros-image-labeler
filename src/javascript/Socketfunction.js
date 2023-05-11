// SOCKET_IO section
var socket = io();

// Get get all topics of the selected local instance of mongodb and load the first image
function get_all_topics() {
    socket.emit('get topics', '', (res) => {

        if (String(res).indexOf('error') >= 0) {
            alert(res);
            window.location.href = '/';
            return;
        }

        fill_topics(res);
        get_first_last_seq(select_topic.value);
    });
}

// Get the first sequence number of the topic
function get_first_last_seq(msg) {
    socket.emit('get first_last_seq', msg, (res) => {
        if (String(res).indexOf('error') >= 0) {
            alert(res);
            window.location.href = '/';
            return;
        }
        
        if (res.first < 0) {
            alert('Si è verificato un errore');
            return;
        }

        image_sequence = first = res.first;
        last = res.last

        keeper_image_number.innerText = `${0}/${last-first}`;

        get_image({topic: msg, seq : image_sequence});
        get_bounding_box({topic: select_topic.value, image: image_sequence});
    });
}

// Get the image from topic and sequence number and show it
function get_image(msg, mode) {
    socket.emit('get image', msg, (res) => {
        // If res is null, the image does not exist
        if (res == null) {
            // If mode è P, then inc the sequence number, otherwise dec
            if (mode == 'P') 
                image_sequence++;
            else if (mode == 'N')
                image_sequence--;   
            return;
        }
            
        // Check if res is an error
        if (res.indexOf('error') >= 0) {
            console.log(res);
            return;
        }
        
        load_background_image(res);
    });
}

// Add class formed by name and color
function add_class(msg) {
    socket.emit('add class', msg);
}

// Add sub-class for selected class formed by sub-class name
function add_sub_class(msg) {
    socket.emit('add sub_class', msg);
}

// Add bounding box formed by topic, image and rect
function add_bounding_box(msg) {
    socket.emit('add bounding_box', msg);
}

// Get all classes
function get_classes() {
    // Fill the left sidebar with the classes saved
    socket.emit('get classes', '', (res) => {
        res.forEach(node => {
            create_class(node);
        });
    });
}

// Get all sub-classes from class name
function get_sub_classes(msg) {
    socket.emit('get sub_classes', msg, (res) => {
        clear_sub_classes_sidebar();

        res.forEach(sub_name => {
            create_sub_class(sub_name);
        });
    });
}

// Get all bounding bounding box of an image by topic and image sequence
function get_bounding_box(msg) {
    socket.emit('get bounding_box', msg, (res) => {
        if (res == null) 
            return;

        let update_rect;

        // Get all bounding box saved on the server
        res.forEach(node => {
            // Create a new rect when loaded from nodejs and add function for resizing
            let rect = new Konva.Rect({
                x: node.attrs.x,
                y: node.attrs.y,
                width: node.attrs.width,
                height: node.attrs.height,
                name: node.attrs.name,
                stroke: node.attrs.stroke,
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
                    }
                };
            })

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
                    update_bounding_box({topic: select_topic.value, image: image_sequence, oldrect : update_rect, newrect : e.currentTarget.toObject()});
                } else {
                    remove_local_bounding_box();
                    get_bounding_box({topic: select_topic.value, image: image_sequence});
                    tr.nodes([]);
                }
            });

            // On drag start, get the position of the rect
            rect.on('dragstart', (e) => {
                update_rect = {
                    attrs : {
                        x : e.currentTarget.getPosition().x,
                        y : e.currentTarget.getPosition().y,
                        width : e.currentTarget.width(),
                        height : e.currentTarget.height(),
                    }
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
                    update_bounding_box({topic: select_topic.value, image: image_sequence, oldrect : update_rect, newrect : e.currentTarget.toObject()});
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
function remove_class(msg) {
    socket.emit('remove class', msg);
}

// Remove sub-class from the class name
function remove_sub_class(msg) {
    socket.emit('remove sub_class', msg);
}

// Remove bounding box from the rect
function remove_bounding_box(msg) {
    socket.emit('remove bounding_box', msg);
}

// Update a specific bounding box on drag or resize
function update_bounding_box(msg) {
    socket.emit('update bounding_box', msg, (res) => {
        if (res.indexOf('error') >= 0)
            console.error('error on resize or drag bounding box');
    });
}

// INDEX

// Save the bag file inside the newly created local mongodb instace
function save_bag_into_mongo(filename) {
    socket.emit('save_bag', filename, (res) => {
        console.log(res);
        if (res.indexOf('OK') >= 0)
            window.location.href = '/draw';
    });
}

// Get all local instaces
function get_db() {
    socket.emit('get db', '', (res) => {
        console.log(res);

        if (res.indexOf('error') >= 0)
            return;
        
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
        console.log(res);
        if (res.indexOf('OK') >= 0)
            window.location.href = '/draw';
    });
}