// SOCKET_IO section

var socket = io();

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
        remove_local_bounding_box();

        res.forEach(node => {
            layer.add(new Konva.Rect(node));
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

function extract_bag(filename) {
    socket.emit('clicked', filename, (res) => {
        console.log(res);
    });
}
