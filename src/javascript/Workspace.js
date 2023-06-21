var list_class = document.getElementById('class_list');
var checkbox = document.getElementById('sub_classes');
var list_sub_class = document.getElementById('sub_class_list');
var div_container = document.getElementById('container');
var select_topic = document.getElementById('topics');
var local_bounding = document.getElementById('keep_bounding');
var keeper_image_number = document.getElementById('image_sequence');
var fps = document.getElementById('image_fps');
var warning = document.getElementById('warning');

var class_name = '';        // Save the current name of the selected class
var sub_class_name = '';    // Save the current id of the selected sub_class
var color_pick = '';        // Save the current color of the selected class
var index = 0;              // Keep the actual index of image_numbers array
var change = false;         // Set true if topic change is done, otherwise false

var bounding_box = [];
var image_numbers = [];     // Keep all of the image sequence number
var images = [];

// Show popup when the button is clicked
document.getElementById('add_class').addEventListener('click', (e) => {
    $('#class_dialog').dialog('open');
});

// Change the target when the topic is selected
select_topic.addEventListener('change', (e) => {
    fps.disabled = true;
    change = true;
    localStorage.setItem('topic', e.currentTarget.value);
    get_all_sequence_numbers(e.currentTarget.value, fps.value);
    remove_local_bounding_box();
    
    get_bounding_box(e.currentTarget.value, image_numbers[index]);
});

// When you load the page, load the first image of that topic and get the saved classes and bounding box
$('#workspace').ready((e) => {
    fps.disabled = true;
    get_all_topics();
    get_classes();
});

// Scroll through images back and forth
$('#workspace').on('keydown', async (e) => {
    if (e.keyCode == 188 && index > 0) { // , prev
        get_image(select_topic.value, image_numbers[--index], 'P');
        get_bounding_box(select_topic.value, image_numbers[index]);
        keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
        tr.nodes([]);
    } else if (e.keyCode == 190 && index < image_numbers.length - 1) { // . next
        get_image(select_topic.value, image_numbers[++index], 'N');
        get_only_bounding_box(select_topic.value, image_numbers[index]);
        keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
        tr.nodes([]);
    }
});

fps.addEventListener('change', (e) => {
    set_fps(select_topic.value, e.currentTarget.value);
    if (image_numbers.length >= images.length)
        fps.max = e.currentTarget.value;
});

document.getElementById('reset_image').addEventListener('click', (e) => {
    index = 0;
    keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
    get_image(select_topic.value, image_numbers[index], '');
    get_bounding_box(select_topic.value, image_numbers[index]);
});

document.getElementById('load_last_image').addEventListener('click', (e) => {
    load_last_image_sequence(select_topic.value);
});

// Create class
function create_class(name, color) {
    var node = document.createElement('a');
    node.innerHTML = name;
    node.className = 'list-group-item list-group-item-action';
    node.title = color;
    node.style.color = color;
    node.style.borderWidth = 'medium';

    node.addEventListener('click', (e) => {
        // Deselect if already selected
        if (e.target.innerHTML == class_name) {
            e.target.style.borderColor = 'white';
            list_sub_class.style.visibility = 'hidden';
            class_name = '';
            color_pick = '';
            return;
        }

        class_name = name;  
        color_pick = color;
        sub_class_name = '';

        list_sub_class.style.visibility = '';

        get_sub_classes(name);
        set_selection(list_class, e.target);
    });

    node.addEventListener('dblclick', (e) => {
        remove_class(name);
        list_class.removeChild(e.target);
        class_name = '';
    });

    list_class.appendChild(node);
}

// Create sub-class
function create_sub_class(sub_name) {
    var node = document.createElement('a');
    node.innerHTML = sub_name;
    node.className = 'list-group-item list-group-item-action';
    node.style.borderWidth = 'medium';
    
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
        remove_sub_class(class_name, sub_name);
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

// Get id of the respective bounding box
function get_id_by_bounding_box(array, rect) {
    let res = array.find(item => {
        return JSON.stringify(rect) === JSON.stringify(item.rect);
    });
    if (res == undefined)
        return -1;
    return res.id;
}

// Check if bounding box exists into array by id
function exist_bounding_box_by_id(array, id) {
    for (let i = 0; i < array.length; i++)
        if (array[i].id == id)
            return true;
    return false;
}

// Fill image_numbers array based on the chosen FPS
function set_fps(topic, fps_v) {
    image_numbers = [];
    let counter = 0;
    let last_image = images[0].header.stamp.secs;
    let err = '';

    images.forEach(image => {
        if (last_image - image.header.stamp.secs == 0) {
            if (counter < fps_v) {
                image_numbers.push(image.header.seq);
                last_image = image.header.stamp.secs;
                counter++;
            }
        } else if (last_image - image.header.stamp.secs < 0) {
            if (counter < fps_v)
                err = `there aren't enough images for one or more topics per second`;
            image_numbers.push(image.header.seq);
            last_image = image.header.stamp.secs;
            counter = 1;
        } else {
            console.error(`error on timestamp of topic ${topic}, there is no order between image timestamps`);
            err = `error on timestamp of topic ${topic}, there is no order between image timestamps`;
            counter = fps_v;
            return;
        }
    });

    // If the last group of images is < than the actual FPS, then print the error
    if (counter < fps_v)
        err = `there aren't enough images for one or more topics per second`;

    if (index >= image_numbers.length)
        index = image_numbers.length - 1;

    if (change) {
        load_last_image_sequence(select_topic.value);
        change = false;
    } else {
        get_image(select_topic.value, image_numbers[index]);
        get_bounding_box(select_topic.value, image_numbers[index]);
        keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
    }
    
    warning.innerText = err;
    fps.disabled = false;
}