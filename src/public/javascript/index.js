var list_class = document.getElementById('class_list');
var list_sub_class = document.getElementById('sub_class_list');
var div_container = document.getElementById('container');
var select_topic = document.getElementById('topics');
var local_bounding = document.getElementById('keep_bounding');
var keeper_image_number = document.getElementById('image_sequence');
var fps = document.getElementById('image_fps');
var warning = document.getElementById('warning');
var export_popup = document.getElementById('export_dialog');
var body = document.body;

var class_name = '';        // Save the current name of the selected class
var sub_class_name = '';    // Save the current id of the selected sub_class
var color_pick = '';        // Save the current color of the selected class
var index = 0;              // Keep the actual index of image_numbers array
var change = false;         // Set true if topic change is done, otherwise false

var bounding_box = [];
var image_numbers = [];     // Keep all of the image sequence number
var images = [];
var classes = [];           // list of classes

// nanosec to sec = nanosec / 1000000000
const NANOSEC = 1000000000;


document.getElementById('export').addEventListener('click', (e) => {
    get_all_labeled_topics();
});

// Show popup when the button is clicked
document.getElementById('add_class').addEventListener('click', (e) => {
    $('#class_dialog').dialog('open');
});

document.getElementById('add_subclass').addEventListener('click', (e) => {
    $('#sub_class_dialog').dialog('open');
});

// Change the target when the topic is selected
select_topic.addEventListener('change', (e) => {
    get_image_size(e.currentTarget.value);
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
        get_image(select_topic.value, image_numbers[--index], 'L');
        get_bounding_box(select_topic.value, image_numbers[index]);
        keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
        tr.nodes([]);
    } else if (e.keyCode == 190 && index < image_numbers.length - 1) { // . next
        get_image(select_topic.value, image_numbers[++index], 'L');
        add_labeled_image(select_topic.value, image_numbers[index]);
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
    tr.nodes([]);
    keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
    get_image(select_topic.value, image_numbers[index], 'L');
    get_bounding_box(select_topic.value, image_numbers[index]);
});

document.getElementById('load_last_image').addEventListener('click', (e) => {
    tr.nodes([]);
    load_last_image_sequence(select_topic.value);
});

// Create class
function create_class(name, color, last_image) {
    var node = document.createElement('a');
    node.innerText = name;
    node.className = 'list-group-item list-group-item-action';
    node.title = color;
    node.style.color = color;
    node.style.borderWidth = 'medium';

    node.addEventListener('click', (e) => {
        if (!e.target.className.includes('list-group-item'))
            return;
        // Deselect if already selected
        if (e.target.innerText == class_name) {
            e.target.style.borderColor = 'white';
            list_sub_class.style.visibility = 'hidden';
            class_name = '';
            color_pick = '';
            return;
        }

        class_name = e.target.innerText;  
        color_pick = color;
        sub_class_name = '';

        list_sub_class.style.visibility = '';

        get_sub_classes(e.target.innerText);
        set_selection(list_class, e.target);
    });

    create_update_popup(name, color);

    node.addEventListener("contextmenu", function(e) {
        tr.nodes([]);
        e.preventDefault();
        $(`#class_${e.target.innerText}_dialog`).dialog('open');
        color_pick = color;
        set_selection(list_class, e.target);
    });

    node.addEventListener('dblclick', (e) => {
        var result = window.confirm(`Vuoi veramente cancellare la classe ${e.target.innerText} e tutti i bounding boxes relativi?`);
        if (result) {      
            if (!e.target.className.includes('list-group-item'))
                return;
            remove_class(e.target.innerText);
            $(`#${name}_dialog`) // For removing image popup
            $(`#class_${name}_dialog`).remove(); // For removing update popup
            list_class.removeChild(e.target);
            class_name = '';
            tr.nodes([]);
        }
    });

    create_image_popup(name, last_image);
    node.appendChild(create_button(color));
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
        var result = window.confirm(`Vuoi veramente cancellare la sotto-classe ${e.target.innerText} della classe ${class_name} e tutti i bounding boxes relativi?`);
        if (result){
            remove_sub_class(class_name, sub_name);
            list_sub_class.removeChild(e.target);
            sub_class_name = '';
        }
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
        node.value = topic;
        node.innerText = topic;
        select_topic.appendChild(node);
    });
}

// Get id of the respective bounding box
function get_id_by_bounding_box(array, rect) {
    let res = array.find(item => {
        return rect.attrs.width === item.rect.attrs.width &&
            rect.attrs.height === item.rect.attrs.height &&
            rect.attrs.x === item.rect.attrs.x &&
            rect.attrs.y === item.rect.attrs.y &&
            rect.attrs.stoke === item.rect.attrs.stoke;
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

function update_bounding_list(id, new_rect) {
    // For updating the list bounding_box
    for(let i = 0; i < bounding_box.length; i++) {
        if (bounding_box[i].id == id) {
            bounding_box[i].rect = new_rect;
        }
    }
}

// Fill image_numbers array based on the chosen FPS
function set_fps(topic, fps_v) {
    image_numbers = [];
    image_numbers.push(images[0].header.seq);
    let last_image = images[0];

    let delta = 1 / fps_v;

    try {
        images.slice(1).forEach(image => {
            if (calculate_seconds(image.header.stamp) - calculate_seconds(last_image.header.stamp) >= delta) {
                image_numbers.push(image.header.seq);
                last_image = image;
            }
        });
    } catch (err) {
        console.error(err);
        return;
    }
  
    if (index >= image_numbers.length)
        index = image_numbers.length - 1;

    // Check if the call is made after a change of topic
    if (change) {
        load_last_image_sequence(topic);
        change = false;
    } else {
        get_image(topic, image_numbers[index], 'L');
        get_bounding_box(topic, image_numbers[index]);
        keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
    }
    fps.disabled = false;
}

function calculate_seconds(stamp) {
    if (stamp == null)
        throw new Error('timestamp cannot be null');
    return stamp.secs + (stamp.nsecs / NANOSEC);
}

function remove_topics() {
    let topics = export_popup.querySelectorAll('div');
    for (let i = 1; i < topics.length; i++)
        export_popup.removeChild(topics[i]);
}

function add_labeled_topics(topics) {
    remove_topics();
    topics.forEach(topic => {
        let div = document.createElement('div');
        div.className = 'form-check';

        let input = document.createElement('input');
        input.className = 'form-check-input';
        input.type = 'checkbox';
        input.value = topic;
        div.appendChild(input);

        let label = document.createElement('label');
        label.className = 'form-check-label';
        label.textContent = topic;
        div.appendChild(label);

        export_popup.appendChild(div);
    });
}

function load_image_for_popup(name, buffer) {
    document.getElementById(`${name}_image`).src = `data:image/png;base64,${buffer}`;
}

function create_update_popup(name, color) {
    var form = document.createElement('form');
    form.id = `class_${name}`;
    var div1 = document.createElement('div');
    div1.id = `class_${name}_dialog`;

    var div2 = document.createElement('div');
    div2.style.paddingBottom = '10px';

    var label = document.createElement('label');
    label.style.paddingBottom = '3px';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control';
    input.id = `update_${name}_class`;
    input.value = '';

    div2.appendChild(label);
    div2.appendChild(input);
    div1.appendChild(div2);
    form.appendChild(div1);
    body.appendChild(form);
    update_class_popup(name, color);
}

function create_image_popup(name, last_image) {
    var form = document.createElement('form');
    form.id = name;
    var div1 = document.createElement('div');
    div1.id = `${name}_dialog`;

    var div2 = document.createElement('div');
    div2.style.paddingBottom = '10px';
    var img = document.createElement('img');
    img.style.maxWidth = '100%';
    img.style.maxHeight = '100%';
    img.id = `${name}_image`;
    if (last_image.topic != '' && last_image.seq != -1)
        get_image(last_image.topic, last_image.seq, name);
    else
        img.src = '';
    
    div2.appendChild(img);
    div1.appendChild(div2);
    form.appendChild(div1);
    body.appendChild(form);
    image_popup(name);
}

function create_button(color) {
    var button = document.createElement('button');
    button.className = 'btn btn-primary rounded-circle';
    button.style.textAlign = 'right';

    var i = document.createElement('i');
    i.className = 'fa fa-eye';
    button.appendChild(i);

    button.addEventListener('click', (e) => {
        tr.nodes([]);
        $(`#${e.currentTarget.parentElement.innerText}_dialog`).dialog('open');
        if (e.currentTarget.parentElement.innerText == class_name)
            return;
        
        class_name = e.currentTarget.parentElement.innerText;
        color_pick = color;
        list_sub_class.style.visibility = '';

        get_sub_classes(e.currentTarget.parentElement.innerText);
        set_selection(list_class, e.currentTarget.parentElement);
    });
    return button;
}

function change_image_popup(name, new_name) {
    let form = document.getElementById(name);
    let div = document.getElementById(`${name}_dialog`);
    let img = document.getElementById(`${name}_image`);
    $(`#${name}_dialog`).dialog("option", "title", new_name);
    form.id = new_name;
    div.id = `${new_name}_dialog`;
    img.id = `${new_name}_image`;
}

function get_class_name(id) {
    let result = classes.find(cl => cl.id === id);
    if (result === undefined)
        return '';
    return result.name;
}

function get_local_class_id(name) {
    let result = classes.find(cl => cl.name === name);
    if (result === undefined)
        return -1;
    return result.id;
}