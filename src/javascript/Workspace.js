var class_name;
var image_counter = 0;

var list_class = document.getElementById("classList");
var checkbox = document.getElementById("sub-labeling");
var list_sub_class = document.getElementById("subList");
var div_container = document.getElementById("container");
var select_topic = document.getElementById("topics");

// Change select_topic
select_topic.addEventListener('change', (e) => {
    image_counter = 0;
    div_container.style.backgroundImage = `url(../bagFile/ros-1/${select_topic.value}/img-${image_counter}.png)`;
    remove_local_bounding_box();
    get_bounding_box({topic: select_topic.value, image: image_counter});
});

// Set the visibility of sub_classes list
checkbox.addEventListener('change', (e) => {
    if (!e.currentTarget.checked) {
        list_sub_class.style.visibility = "hidden";

        list_sub_class.childNodes.forEach(node => {
            node.style.backgroundColor = "#fff";
        });
    } else {
        list_sub_class.style.visibility = "";
    }
});

// Function onload
$("#workspace").ready(e => {
    div_container.style.backgroundImage = `url(../bagFile/ros-1/${select_topic.value}/img-${image_counter}.png)`;
    get_bounding_box({topic: select_topic.value, image: image_counter});
    get_classes();
})

// Function for skip image
$("#workspace").on("keydown", (e) => {
    if (e.keyCode == 80 && image_counter > 0) { // P
        remove_local_bounding_box();
        div_container.style.backgroundImage = `url(../bagFile/ros-1/${select_topic.value}/img-${--image_counter}.png)`;
        get_bounding_box({topic: select_topic.value, image: image_counter});
    } else if (e.keyCode == 78) { // N
        remove_local_bounding_box();
        div_container.style.backgroundImage = `url(../bagFile/ros-1/${select_topic.value}/img-${++image_counter}.png)`;
        get_bounding_box({topic: select_topic.value, image: image_counter});
    }
});

// Function for create classes
function create_class(msg) {
    var node = document.createElement("a");
    node.innerHTML = msg.name;
    node.className = "list-group-item list-group-item-action";
    node.title = msg.color;
    node.style.color = msg.color;

    node.addEventListener('click', (e) => {
        // Deselect
        if (e.target.style.backgroundColor == "red") {
            e.target.style.backgroundColor = "#fff";
            return;
        }

        class_name = msg.name; // Save the current name of the selected class

        get_sub_classes(msg.name);
        set_selection(list_class, e);

        // Set visibility for sub_classes list
        if (!checkbox.checked) 
            list_sub_class.style.visibility = "hidden";
    });

    node.addEventListener('dblclick', (e) => {
        remove_class({name : e.target.innerHTML, color : e.target.title});
        list_class.removeChild(e.target);
        remove_local_bounding_box();
    });

    list_class.appendChild(node);
}

// Function for create sub_classes
function create_sub_class(id) {
    var node = document.createElement("a");
    node.innerHTML = id;
    node.className = "list-group-item list-group-item-action";

    node.addEventListener('click', (e) => {
        // Deselect
        if (e.target.style.backgroundColor == "red") {
            e.target.style.backgroundColor = "#fff";
            return;
        }
        set_selection(list_sub_class, e);
    });

    node.addEventListener('dblclick', (e) => {
        remove_sub_class({name : class_name, id : e.target.innerHTML});
        list_sub_class.removeChild(e.target);
    });

    list_sub_class.appendChild(node);
}

// Change background color to selected item
function set_selection(div, dest) {
    div.childNodes.forEach(node => {
        node.style.backgroundColor = "#fff";
    });
    dest.target.style.backgroundColor = "red";
}