var socket = io();

function add_class(msg) {
    socket.emit('add class', msg);
}

function add_sub_class(msg) {
    socket.emit('add sub_class', msg);
}

function add_bounding_box(msg) {
    socket.emit('add bounding_box', msg);
}

function get_classes() {
    // Fill the left sidebar with the classes already created
    socket.emit('get classes', "", (res) => {
        res.forEach(node => {
            create_class(node);
        });
    });
}

function get_sub_classes(msg) {
    socket.emit('get sub_classes', msg, (res) => {
        // Remove all sub_classes from sidebar
        while(list_sub_class.hasChildNodes())
            list_sub_class.removeChild(list_sub_class.lastElementChild);
        
        // Add sub_classes to sidebar
        res.forEach(id => {
            create_sub_class(id);
        });
    });
}

function get_bounding_box(msg) {
    socket.emit("get bounding_box", msg, (res) => {
        res.forEach(node => {
            layer.add(new Konva.Rect(node));
        });
    });
}

function remove_class(msg) {
    socket.emit('remove class', msg);
}

function remove_sub_class(msg) {
    socket.emit('remove sub_class', msg);
}

function remove_bounding_box(msg) {
    socket.emit('remove bounding_box', msg);
}

// INDEX

function extract_bag(filename) {
    socket.emit('clicked', filename, (res) => {
        console.log(res);
    });
}
