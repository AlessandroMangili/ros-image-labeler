var list_class = document.getElementById('class_list');
var checkbox = document.getElementById('sub_classes');
var list_sub_class = document.getElementById('sub_class_list');
var div_container = document.getElementById('container');
var select_topic = document.getElementById('topics');
var local_bounding = document.getElementById('keep_bounding');

var class_name = '';        // Save the current name of the selected class
var sub_class_name = '';    // Save the current id of the selected sub_class
var color_pick = '';        // Save the current color of the selected class
var image_sequence;         // Keep the actual image sequence

// Show popup when the button is clicked
document.getElementById('add_class').addEventListener('click', (e) => {
    $('#class_dialog').dialog('open');
});

// Change the target when the topic is selected
select_topic.addEventListener('change', (e) => {
    get_first_image(e.currentTarget.value);

    get_bounding_box({topic: e.currentTarget.value, image: image_sequence});
});

// When you load the page, load the first image of that topic and get the saved classes and bounding box
$('#workspace').ready((e) => {
    get_all_topics();
    get_classes();
});

// Scroll through images back and forth
$('#workspace').on('keydown', (e) => {
    if (e.keyCode == 188 && image_sequence > 0) { // , prev
        get_image({topic : select_topic.value, seq : --image_sequence}, 'P');
    } else if (e.keyCode == 190) { // . next
        get_image({topic : select_topic.value, seq : ++image_sequence}, 'N');
    }
});

// Create class
function create_class(msg) {
    var node = document.createElement('a');
    node.innerHTML = msg.name;
    node.className = 'list-group-item list-group-item-action';
    node.title = msg.color;
    node.style.color = msg.color;
    node.style.borderStyle = 'solid';
    node.style.borderWidth = 'medium';
    node.style.borderColor = 'white';

    node.addEventListener('click', (e) => {
        // Deselect if already selected
        if (e.target.innerHTML == class_name) {
            e.target.style.borderColor = 'white';
            list_sub_class.style.visibility = 'hidden';
            class_name = '';
            color_pick = '';
            return;
        }

        class_name = msg.name;  
        color_pick = msg.color;
        sub_class_name = '';

        list_sub_class.style.visibility = '';

        get_sub_classes(msg.name);
        set_selection(list_class, e.target);
    });

    node.addEventListener('dblclick', (e) => {
        remove_class({name : msg.name, color : msg.color});
        list_class.removeChild(e.target);

        remove_local_bounding_box();

        get_sub_classes(msg.name);

        get_bounding_box({topic: select_topic.value, image: image_sequence});

        class_name = '';
    });

    list_class.appendChild(node);
}

// Create sub-class
function create_sub_class(sub_name) {
    var node = document.createElement('a');
    node.innerHTML = sub_name;
    node.className = 'list-group-item list-group-item-action';
    node.style.borderStyle = 'solid';
    node.style.borderWidth = 'medium';
    node.style.borderColor = 'white';

    node.addEventListener('click', (e) => {
        // Deselect if already selected
        if (e.target.innerHTML == sub_class_name) {
            e.target.style.borderColor = 'white';
            sub_class_name = '';
            return;
        }

        sub_class_name = sub_name;
        set_selection(list_sub_class, e.target);
    });

    node.addEventListener('dblclick', (e) => {
        remove_sub_class({name : class_name, sub_name : sub_name});
        list_sub_class.removeChild(e.target);
        sub_class_name = '';
    });

    list_sub_class.appendChild(node);
}

// Change background color to the selected class
function set_selection(div, dest) {
    div.childNodes.forEach(node => {
        node.style.borderColor = 'white';
    });
    dest.style.borderColor = 'red';
}

// Clean the sub-classes sidebar
function clear_sub_classes_sidebar() {
    while(list_sub_class.hasChildNodes())
        list_sub_class.removeChild(list_sub_class.lastElementChild);
}

// Load and create the image from buffer
function load_background_image(buffer) {
    div_container.style.backgroundImage = `url(data:image/png;base64,${buffer})`;
}

// Fill the tag select with the topics present in the local instance of mongodb
function fill_topics(topics) {
    topics.forEach(topic => {
        var node = document.createElement('option');
        node.value = topic.name;
        node.innerText = topic.name;
        select_topic.appendChild(node);
    });
}