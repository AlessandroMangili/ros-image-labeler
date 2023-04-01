// SOCKET_IO section

var socket = io();

// Get get all topics of the current bag file
function get_all_topics() {
    socket.emit('get topics', "", (res) => {
        fill_topics(res);

        get_first_image(select_topic.value);
    });
}

// Get the first sequence number of that topic
function get_first_image(msg) {
    socket.emit('get first_seq', msg, (res) => {
        if (image_sequence < 0) {
            alert("Si è verificato un errore");
            return;
        }

        image_sequence = res;

        get_image({topic: msg, seq : image_sequence});
    });
}

function get_image(msg, mode) {
    socket.emit('get image', msg, (res) => {
        // If res is null, the image doesn't exits
            if (res == null) {
                if (mode == "P")
                image_sequence++;
            else if (mode == "N")
                image_sequence--;   
            return;
        }
            
        // Check if res is an error
        if (res.indexOf("Error") >= 0) {
            console.log(res);
            return;
        }

        load_background_image(res);
        get_bounding_box({topic: select_topic.value, image: image_sequence});
    });
}

// Add class with name and color
function add_class(msg) {
    socket.emit('add class', msg);
}

// Add sub-class with class name and sub-class name
function add_sub_class(msg) {
    socket.emit('add sub_class', msg);
}

// Add bounding box by topic, image and rect
function add_bounding_box(msg) {
    socket.emit('add bounding_box', msg);
}

// Get all classes
function get_classes() {
    // Fill the left sidebar with the classes already created
    socket.emit('get classes', "", (res) => {
        res.forEach(node => {
            create_class(node);
        });
    });
}

// Get all sub-classes by the class name
function get_sub_classes(msg) {
    socket.emit('get sub_classes', msg, (res) => {
        clear_sub_classes_sidebar();

        res.forEach(sub_name => {
            create_sub_class(sub_name);
        });
    });
}

// Get all bounding bounding box of an image by topic and image counter
function get_bounding_box(msg) {
    socket.emit("get bounding_box", msg, (res) => {
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

        res.forEach(node => {
            // Create a new rect when loaded from nodejs and add function for resizing
            let rect = new Konva.Rect(node);

            rect.on('transformend', () => {
                add_bounding_box({topic: select_topic.value, image: image_sequence, rect: rect.toObject()})
            });

            layer.add(rect);
        });
    });
}

// Remove class by name
function remove_class(msg) {
    socket.emit('remove class', msg);
}

// Remove sub-class by name of the class and subclass
function remove_sub_class(msg) {
    socket.emit('remove sub_class', msg);
}

// Remove bounding box by rect config
function remove_bounding_box(msg) {
    socket.emit('remove bounding_box', msg);
}

// INDEX

function save_bag_into_mongo(filename) {
    socket.emit('save_bag', filename, (res) => {
        console.log(res);
    });
}
