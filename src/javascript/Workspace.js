var socket = io();

var class_name;
var image_counter = 0;

var list = document.getElementById("classList");
var checkbox = document.getElementById("sub-labeling");
var sub_list = document.getElementById("subList");
var div = document.getElementById("container");
var topic = document.getElementById("topics");

// Change topic
topic.addEventListener('change', (e) => {
    image_counter = 0;
    div.style.backgroundImage = `url(../bagFile/ros-1/${topic.value}/img-${image_counter++}.png)`;
    remove_local_bounding_box();
});

// Set the visibility of sub_classes list
checkbox.addEventListener('change', (e) => {
    if (!e.currentTarget.checked) {
        sub_list.style.visibility = "hidden";
        let parent = document.getElementById("subList");
        parent.childNodes.forEach(node => {
            node.style.backgroundColor = "#fff";
        });
    } else {
        sub_list.style.visibility = "";
    }
});

$("#workspace").ready(e => {
    div.style.backgroundImage = `url(../bagFile/ros-1/${topic.value}/img-${image_counter}.png)`;
    get_bounding_box({topic: topic.value, image: image_counter});
})

// Function for skip image on workspace
$("#workspace").on("keydown", (e) => {
    if (e.keyCode == 80 && image_counter > 0) { // P
        remove_local_bounding_box();
        div.style.backgroundImage = `url(../bagFile/ros-1/${topic.value}/img-${--image_counter}.png)`;
        // FUTURA ESPANSIONE carica tutti i bounding box relativi all'immagine appena caricata
        get_bounding_box({topic: topic.value, image: image_counter});
    } else if (e.keyCode == 78) { //N
        remove_local_bounding_box();
        div.style.backgroundImage = `url(../bagFile/ros-1/${topic.value}/img-${++image_counter}.png)`;
        // FUTURA ESPANSIONE carica tutti i bounding box relativi all'immagine appena caricata
        get_bounding_box({topic: topic.value, image: image_counter});
    }
});

// Fill the left sidebar with the classes already created
socket.emit('get classes', "", (res) => {
    res.forEach(node => {
        create_class(node);
    });
});

// Function for create nodes and remove bounding box
function create_class(msg) {
    var node = document.createElement("a");
    node.innerHTML = msg.name;
    node.className = "list-group-item list-group-item-action";
    node.title = msg.color;
    node.style.color = msg.color;

    node.addEventListener('click', (e) => {
        if (e.target.style.backgroundColor == "red") {
            e.target.style.backgroundColor = "#fff";
            return;
        }

        socket.emit('get subClasses', msg.name, (res) => {
            // Remove all sub_classes to right sidebar
            while(sub_list.hasChildNodes()) {
                    sub_list.removeChild(sub_list.lastElementChild);
            }

            // Add sub_classes to right sidebar
            res.forEach(id => {
                create_sub_classes(id);
            });
        });
        // Save name of the class selected
        class_name = msg.name;
        
        set_selection("classList", e);

        // Set visibility for sub_classes list
        if (!checkbox.checked) 
            sub_list.style.visibility = "hidden";
    });

    node.addEventListener('dblclick', (e) => {
        socket.emit('remove class', {name : e.target.innerHTML, color : e.target.title});

        list.removeChild(e.target);
        
        // FUTURE ESPANSIONI: CANCELLARE ANCHE TUTTI I BOUNDING BOX DISEGNATI SU TUTTE LE IMMAGINI
    });

    list.appendChild(node);
}

function create_sub_classes(id) {
    var node = document.createElement("a");
    node.innerHTML = id;
    node.className = "list-group-item list-group-item-action";

    node.addEventListener('click', (e) => {
        if (e.target.style.backgroundColor == "red") {
            e.target.style.backgroundColor = "#fff";
        } else
            set_selection("subList", e);
    });

    node.addEventListener('dblclick', (e) => {
        socket.emit('remove subClass', {name : class_name, id : e.target.innerHTML});

        sub_list.removeChild(e.target);
        
        // FUTURE ESPANSIONI: CANCELLARE ANCHE TUTTI I BOUNDING BOX DISEGNATI SU TUTTE LE IMMAGINI
    });

    sub_list.appendChild(node);
}

// Change background color to select the item
function set_selection(div_id, dest) {
    let parent = document.getElementById(div_id);
    parent.childNodes.forEach(node => {
        node.style.backgroundColor = "#fff";
    });
    dest.target.style.backgroundColor = "red";
}