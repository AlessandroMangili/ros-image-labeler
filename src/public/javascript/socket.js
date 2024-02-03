var socket = io();

// Get all topics of the selected local instance of mongodb and load the first image
function get_all_topics() {
    socket.emit('get topics', '', (res) => {
        if (res.indexOf('error') >= 0) {
            alert(`there are no image collections saved, then remove local instance and try again`);
            window.location.href = '/';
            console.error(res);
            return;
        }

        fill_topics(res);
        if (localStorage.getItem('topic') == null)
            localStorage.setItem('topic', select_topic.value);
        else 
            select_topic.value = localStorage.getItem('topic');
        get_image_size(select_topic.value);
        get_all_sequence_numbers(select_topic.value, fps.value);
    });
}

function get_image_size(topic) {
    socket.emit('get image size', topic, (res) => {
        if (String(res).indexOf('error') >= 0) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }
        WIDTH = res.width;
        HEIGHT = res.height;
        fitStageIntoContainer();
    });
}

// Get all labeled topics that contains at least one document
function get_all_labeled_topics() {
    socket.emit('get labeled topics', '', (res) => {
        if (res.indexOf('error') >= 0) {
            alert(`unable to export collections`);
            console.error(res);
            return;
        }
        add_labeled_topics(res);
        $('#export_dialog').dialog('open');
    });
}

// Get all sequence numbers of the topic
function get_all_sequence_numbers(topic, fps_value) {
    socket.emit('get all sequence numbers', {topic: topic, fps: fps_value}, (res) => {
        if (String(res).indexOf('error') >= 0) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }
        images = res;
        let FPS = images.length / (calculate_seconds(images[images.length - 1].header.stamp) - calculate_seconds(images[0].header.stamp));
        warning.innerText = `Average FPS is ${FPS.toFixed(1)}`;
        set_fps(select_topic.value, fps_value);
        add_labeled_image(select_topic.value, image_numbers[0]);
    });
}

function load_last_image_sequence(topic) {
    socket.emit('load last image sequence', {topic: topic}, (res) => {
        if (String(res).indexOf('error') >= 0) {
            console.error(res);
            return;
        }

        let counter = 0;
        if (res >= 0) {
            for (let i = 0; i < image_numbers.length; i++) {
                if (image_numbers[i] == res) {
                    index = counter;
                    break;
                } else if (image_numbers[i] > res) {
                    // Dato che con i correnti fps non si ha salvato un valore, allora prendiamo quello all'immagine precedente
                    index = counter - 1;
                    break;
                }
                counter++;
            }
             // Se gli fps sono troppo pochi e siamo già arrivati in fondo
            if (counter == image_numbers.length)
                index = image_numbers.length - 1;
        } else
            index = 0;

        keeper_image_number.innerText = `${index}/${image_numbers.length - 1}`;
        get_image(select_topic.value, image_numbers[index], 'L');
        get_bounding_box(select_topic.value, image_numbers[index]);
    });
}

// Get the image from topic and sequence number and show it
function get_image(topic, image, mode) {
    socket.emit('get image', {topic: topic, seq : image}, (res) => {
        if (res.indexOf('error') >= 0) {
            if (index < 0) {
                window.location.href = '/draw';
                console.error(res);
                return;
            }
            console.error(res);
            if (mode === 'L')
                load_background_image(null);
            return;
        }
        if (mode === 'L')
            load_background_image(res);
        else
            update_class_info(topic, image, mode);
    });
}

// Add class formed by name and color
function add_class(name, color) {
    socket.emit('add class', {name: name, color: color}, (res) => {
        if (String(res).indexOf(`MongoServerError`) >= 0) {
            alert(res);
            console.error(res);
            return;
        }
        console.info('Class added');
        classes.push({ id: res, name: name });
    });
}

// Add sub-class for selected class formed by sub-class name
function add_sub_class(name, sub_name) {
    socket.emit('add sub_class', {name : name, sub_name : sub_name}, (res) => {
        if (res.indexOf(`MongoServerError`) >= 0)
            console.error(res);
        else
            console.info(res);
    });
}

// Add labeled image with empty array of bounding box
function add_labeled_image(topic, image) {
    socket.emit('add labeled image', {topic: topic, image: image}, (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
    });
}

// Add bounding box
function add_bounding_box(topic, image, rect, id, class_id) {
    socket.emit('add bounding_box', { topic: topic, image: image, bounding_box: rect, id: id, class_id: class_id }, (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        console.info(res);
        update_class_info(select_topic.value, image_numbers[index], get_class_name(class_id));
        get_bounding_box(select_topic.value, image_numbers[index]);
    });
}

// Get all classes
function get_classes() {
    // Fill the left sidebar with the classes saved
    socket.emit('get classes', '', (res) => {
        if (res.indexOf('error') >= 0) {
            window.location.href = '/';
            console.error(res);
            return;
        }
        res.forEach(node => {
            classes.push({ id: node.id, name: node.name });
            create_class(node.name, node.color, node.last_image);
        });
    });
}

// Get all sub-classes from class name
function get_sub_classes(name) {
    socket.emit('get sub_classes', name, (res) => {
        clear_sub_classes_sidebar();

        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }

        res.forEach(sub_name => {
            create_sub_class(sub_name);
        });
    });
}

function get_only_bounding_box(topic, image) {
    socket.emit('get only bounding_box', {topic: topic, image: image}, (res) => {
        if (res.indexOf('error') >= 0 || res == null) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }

        let old_bounding_box = bounding_box;
        // If checked, save all local bounding box
        if (local_bounding.checked) {
            old_bounding_box.forEach(rect => {
                if (rect.id >= 0 && !exist_bounding_box_by_id(res, rect.id))
                    add_bounding_box(select_topic.value, image_numbers[index], rect.rect, rect.id, rect.id_class);
            });
        }
        get_bounding_box(select_topic.value, image_numbers[index]);
    });
}

// Get all bounding bounding box of an image by topic and image sequence
function get_bounding_box(topic, image) {
    socket.emit('get bounding_box', {topic: topic, image: image}, (res) => {
        if (res.indexOf('error') >= 0 || res == null) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }

        remove_local_bounding_box();
        bounding_box = res;
        let update_rect;
        
        // Get all bounding box saved on the server
        res.forEach(node => {
            // Create a new rect when loaded from nodejs and add function for resizing
            let rect = new Konva.Rect({
                x: node.rect.attrs.x,
                y: node.rect.attrs.y,
                width: node.rect.attrs.width,
                height: node.rect.attrs.height,
                name: `${get_class_name(node.id_class)}-${node.rect.attrs.name.split('-').length > 1 ? node.rect.attrs.name.split('-')[1] : ''}`,
                stroke: node.rect.attrs.stroke,
                strokeWidth: 2,
                draggable: true,
                hitFunc: (context, shape) => {
                    let border = 1;
                    context.beginPath();
                    // Upper side
                    context.rect(
                        0,
                        0,
                        shape.width() - border, 
                        border
                    );
                    // Right side
                    context.rect(
                        shape.width() - border, 
                        0, 
                        border,
                        shape.height() - border
                    );
                    // Lower side
                    context.rect(
                        0,
                        shape.height() - border,
                        shape.width() - border, 
                        border
                    );
                    // Left side
                    context.rect(
                        0, 
                        0,
                        border, 
                        shape.height() - border
                    );
                    context.closePath();
                    context.fillStrokeShape(shape);
                }
            });

            let text = new Konva.Text({
                x: rect.x(),
                y: rect.y(),
                text: `${get_class_name(node.id_class)} ${node.rect.attrs.name.split('-')[1]}`,
                width: rect.width(),
                fontSize: 10,
                align: 'center',
                fontFamily: 'Lato',
                draggable : false,
                hitFunc: (context, shape) => {
                    let border = 0;
                    context.beginPath();
                    // Upper side
                    context.rect(
                        0,
                        0,
                        shape.width() - border, 
                        border
                    );
                    // Right side
                    context.rect(
                        shape.width() - border, 
                        0, 
                        border,
                        shape.height() - border
                    );
                    // Lower side
                    context.rect(
                        0,
                        shape.height() - border,
                        shape.width() - border, 
                        border
                    );
                    // Left side
                    context.rect(
                        0, 
                        0,
                        border, 
                        shape.height() - border
                    );
                    context.closePath();
                    context.fillStrokeShape(shape);
                }
            });

            // On trasform start, get the position of the rect
            rect.on('transformstart', (e) => {
                e.evt.preventDefault();

                if (tr.nodes().length > 1) {
                    tr.nodes([]);
                    return;
                }

                update_rect = {
                    attrs : {
                        x : e.currentTarget.getPosition().x,
                        y : e.currentTarget.getPosition().y,
                        width : e.currentTarget.width(),
                        height : e.currentTarget.height(),
                    },
                    id : node.id,
                };
            });

            // On trasform end, update the position of the rect into the server
            rect.on('transformend', (e) => {  
                e.evt.preventDefault();
                          
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
                    update_bounding_box(select_topic.value, image_numbers[index], update_rect, e.currentTarget.toObject());
                    update_bounding_list(update_rect.id, e.currentTarget.toObject());
                } else {
                    get_bounding_box(select_topic.value, image_numbers[index]);  
                    tr.nodes([]);
                }
            });

            // On drag start, get the position of the rect
            rect.on('dragstart', (e) => {
                e.evt.preventDefault();

                if (tr.nodes().length > 1) {
                    tr.nodes([]);
                }

                update_rect = {
                    attrs : {
                        x : e.currentTarget.getPosition().x,
                        y : e.currentTarget.getPosition().y,
                        width : e.currentTarget.width(),
                        height : e.currentTarget.height(),
                    },
                    id : node.id,
                };
            });

            // On drag end, update the position of the rect into the server
            rect.on('dragend', (e) => {
                e.evt.preventDefault();

                if (!is_out_border(e.currentTarget)) {
                    text.setAttrs({
                        x : e.currentTarget.x(),
                        y : e.currentTarget.y(),
                        width : e.currentTarget.width(),
                    });
                    update_bounding_box(select_topic.value, image_numbers[index], update_rect, e.currentTarget.toObject());
                    update_bounding_list(update_rect.id, e.currentTarget.toObject());
                } else {
                    e.currentTarget.setAttrs({
                        x: update_rect.attrs.x,
                        y: update_rect.attrs.y,
                    });
                    tr.nodes([]);
                }
            });
            
            layer.add(rect);
            layer.add(text);
        });
    });
}

function get_last_bounding_box_of_class(class_name) {
    socket.emit('get last bounding box', class_name, (res) => {
        if (String(res).indexOf('error') >= 0) {
            alert(res);
            console.error(res);
            return;
        }
        update_class_info(res.topic, res.image, class_name);
    });
}

// Remove class from the name
function remove_class(name) {
    socket.emit('remove class', name, (res) => {
        if (res.indexOf('error') >= 0) {
            alert(res);
            window.location.href = '/';
            console.error(res);
            return;
        }
        clear_sub_classes_sidebar();
        console.info(res);
        classes = classes.filter(cl => cl.name !== name);
        get_bounding_box(select_topic.value, image_numbers[index]);
    });
}

// Remove sub-class from the class name
function remove_sub_class(name, sub_name) {
    socket.emit('remove sub_class', {name : name, sub_name : sub_name}, (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        get_bounding_box(select_topic.value, image_numbers[index]);
        console.info(res);
        setTimeout(() => get_last_bounding_box_of_class(name), 300);
    });
}

// Remove bounding box from the rect
function remove_bounding_box(topic, image, id, class_name) {
    socket.emit('remove bounding_box', {topic: topic, image: image, id : id}, (res) => {
        if (res.indexOf('error') >= 0) {
            alert(res);
            console.error(res);
            return;
        }
        console.info(res);
        get_last_bounding_box_of_class(class_name);
        get_bounding_box(select_topic.value, image_numbers[index]);
    });
}

function update_class_name(id, name) {
    socket.emit('update class name', { id: id, name: name }, (res) => {
        if(res.indexOf('error') >= 0) {
            alert(res);
            console.error(res);
            return;
        }
        console.info(res);
        get_bounding_box(select_topic.value, image_numbers[index]);
    });
}

// Update last labeled image of that class and return the buffer
function update_class_info(topic, image, class_name) {
    socket.emit('update class info', {topic: topic, image: image, class: class_name}, (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        load_image_for_popup(class_name, res);
    });
}

// Update a specific bounding box on drag or resize
function update_bounding_box(topic, image, old_rect, new_rect) {
    socket.emit('update bounding_box', {topic: topic, image: image, old_rect : old_rect, new_rect : new_rect}, (res) => {
        if (res.indexOf('error') >= 0) {
            alert(res);
            console.error(res);
            return;
        }
        console.info('bounding box update successfully');
        update_class_info(topic, image, new_rect.attrs.name.split('-')[0]);
    });
}

function export_db(collections) {
    document.getElementById("loader-wrapper").style.display = "flex";
    socket.emit('export db', collections, (res) => {
        if (res.indexOf('error') >= 0)
            alert(res);
        console.log(res);
        document.getElementById("loader-wrapper").style.display = "none";
    });
}

// INDEX

// Save the bag file inside the newly created local mongodb instace
function save_bag_into_mongo(filename) {
    document.getElementById("loader-wrapper").style.display = "flex";
    socket.emit('save_bag', filename, (res) => {
        if (String(res).indexOf('error') < 0) {
            window.location.href = '/draw';
            console.error(res);
        } else
            console.info(res);
        document.getElementById("loader-wrapper").style.display = "none";
    });
}

// Send all the bag files inside bag_file folder
function get_bag_files() {
    socket.emit('get bag files', '', (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        
        res.forEach(file => {
            if (file.indexOf('.') >= 0) {
                var node = document.createElement('option');
                node.value = file.split('.')[0];
                node.innerText = file.split('.')[0];
                input_bag.appendChild(node);
            }
        });
    });
}

// Get all local instaces
function get_db() {
    socket.emit('get db', '', (res) => {
        if (res.indexOf('error') >= 0) {
            console.error(res);
            return;
        }
        
        res.forEach(file => {
            var node = document.createElement('option');
            node.value = file;
            node.innerText = file;
            db.appendChild(node); //index select
        });
    });
}

// Connect the mongodb client to the selected local instace
function load_db(msg) {
    document.getElementById("loader-wrapper").style.display = "flex";
    socket.emit('load db', msg, (res) => {
        if (res.indexOf('error') < 0) {
            window.location.href = '/draw';
            console.log(res);
        } else
            console.error(res);
        document.getElementById("loader-wrapper").style.display = "none";
    });
}