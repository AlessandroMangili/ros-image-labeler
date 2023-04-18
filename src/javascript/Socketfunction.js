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

        get_first_image(select_topic.value);
    });
}

// Get the first sequence number of the topic
function get_first_image(msg) {
    socket.emit('get first_seq', msg, (res) => {

        if (String(res).indexOf('error') >= 0) {
            alert(res);
            window.location.href = '/';
            return;
        }
        
        if (image_sequence < 0) {
            alert('Si è verificato un errore');
            return;
        }

        image_sequence = res;

        get_image({topic: msg, seq : image_sequence});
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
        get_bounding_box({topic: select_topic.value, image: image_sequence});
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
        if (!local_bounding.checked)
            remove_local_bounding_box();
        else {
            // If checked, save all local bounding box
            layer.getChildren(node => {return node._id > 14;}).forEach(rect => {
                var node = rect.clone();
                node.id(node._id);
                add_bounding_box({topic: select_topic.value, image: image_sequence, rect: node.toObject()});
            });
        }

        if (res == null) 
            return;

        res.forEach(node => {
            // Create a new rect when loaded from nodejs and add function for resizing
            let rect = new Konva.Rect(node.bounding_box);

            rect.on('transformend', () => {
                // For removing the scaling of rect and set the correct width and height
                rect.setAttrs({
                    width : rect.width() * rect.scaleX(),
                    height : rect.height() * rect.scaleY(),
                    scaleX : 1,
                    scaleY : 1
                });
                add_bounding_box({topic: select_topic.value, image: image_sequence, rect: rect.toObject()})
            });

            layer.add(rect);
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