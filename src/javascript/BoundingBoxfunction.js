// KONVA - BOUNDING BOX section
var WIDTH = 640;
var HEIGHT = 480;

let scaleX;
let scaleY;

let update_rect;

var stage = new Konva.Stage({
    container: 'container',
    width: div_container.clientWidth,
    height: div_container.clientHeight,
});

// Create layer
var layer = new Konva.Layer();
stage.add(layer);

var tr = new Konva.Transformer({
    ignoreStroke: true
});
layer.add(tr);

// add a new feature, lets add ability to draw selection rectangle
var selectionRectangle = new Konva.Rect({
    fill: 'rgba(0,0,255,0.5)',
    visible: false,
});
layer.add(selectionRectangle);

var x1, y1, x2, y2;
var wantDraw;

var container = stage.container();
container.tabIndex = 1;
container.focus();

stage.on('mousedown touchstart', (e) => {
    // do nothing if we mousedown on any shape
    if (e.target !== stage) 
        return;

    e.evt.preventDefault();

    x1 = stage.getRelativePointerPosition().x;
    y1 = stage.getRelativePointerPosition().y;
    x2 = stage.getRelativePointerPosition().x;
    y2 = stage.getRelativePointerPosition().y;

    selectionRectangle.visible(true);
    selectionRectangle.width(0);
    selectionRectangle.height(0);
    
    wantDraw = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
});

stage.on('mousemove touchmove', (e) => {
    // do nothing if we didn't start selection
    if (!selectionRectangle.visible()) 
        return;
    
    e.evt.preventDefault();

    x2 = stage.getRelativePointerPosition().x;
    y2 = stage.getRelativePointerPosition().y;

    selectionRectangle.setAttrs({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1)
    });
});

stage.on('mouseup touchend', (e) => {
    // do nothing if we didn't start selection
    if (!selectionRectangle.visible())
        return;
    
    e.evt.preventDefault();
    // update visibility in timeout, so we can check it in click event
    setTimeout(() => {
        selectionRectangle.visible(false);
    });

    var shapes = stage.find(node => {
        return node._id > 14;
    });
    
    var box = selectionRectangle.getClientRect();
    if (box.width != 0 && box.height != 0) {
        var selected = shapes.filter((shape) =>
            Konva.Util.haveIntersection(box, shape.getClientRect())
        );
        tr.nodes(selected);
    } else {
        tr.nodes([]);
        return;
    }

    // Check if the user pressed ctrl key for draw the bounding box
    // Check if the width and height of bounding box is greater then or equal to 20, then draw it
    if (wantDraw && box.width >= 20 && box.height >= 20) {
        if (class_name == '') {
            alert('You need first to create or select a class');
            return;
        }

        let rect = new Konva.Rect({
            x: selectionRectangle.attrs.x,
            y: selectionRectangle.attrs.y,
            width: selectionRectangle.attrs.width,
            height: selectionRectangle.attrs.height,
            name: `${class_name}-`,
            stroke: color_pick,
            strokeWidth: 3,
            draggable: true,
        });

        let text = new Konva.Text({
            x: selectionRectangle.attrs.x,
            y: selectionRectangle.attrs.y,
            text: `${class_name}`,
            width: selectionRectangle.attrs.width,
            fontSize: 14,
            align: 'center',
            draggable : false,
        });

        bounding_box[select_topic.value] = bounding_box[select_topic.value] || {};
        bounding_box[select_topic.value][image_sequence] = bounding_box[select_topic.value][image_sequence] || [];

        // On trasform start, get the position of the rect
        rect.on('transformstart', (e) => {
            update_rect = {
                attrs : {
                    x : e.currentTarget.getPosition().x,
                    y : e.currentTarget.getPosition().y,
                    width : e.currentTarget.width(),
                    height : e.currentTarget.height(),
                },
                id : get_id_by_bounding_box(e.currentTarget.toObject())
            };
        })

        // On trasform end, update the position of the rect into the server
        rect.on('transformend', (e) => {
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

                let index = get_index_by_id(update_rect.id);
                if (index < 0) {
                    console.error('Error on resizing bounding box');
                    return;
                }
                bounding_box[select_topic.value][image_sequence][index] = {rect : e.currentTarget.toObject(), id : update_rect.id};
                update_bounding_box({topic: select_topic.value, image: image_sequence, oldrect : update_rect, newrect : {'rect' : e.currentTarget.toObject(), 'id' : update_rect.id}});
            } else {
                remove_local_bounding_box();
                get_bounding_box({topic: select_topic.value, image: image_sequence});
                tr.nodes([]);
            }
        });

        // On drag start, get the position of the rect
        rect.on('dragstart', (e) => {
            update_rect = {
                attrs : {
                    x : e.currentTarget.getPosition().x,
                    y : e.currentTarget.getPosition().y,
                    width : e.currentTarget.width(),
                    height : e.currentTarget.height(),
                },
                id : get_id_by_bounding_box(e.currentTarget.toObject()),
            };
        });

        // On drag end, update the position of the rect into the server
        rect.on('dragend', (e) => {
            if (!is_out_border(e.currentTarget)) {
                text.setAttrs({
                    x : e.currentTarget.x(),
                    y : e.currentTarget.y(),
                    width : e.currentTarget.width(),
                });

                let index = get_index_by_id(update_rect.id);
                if (index < 0) {
                    console.error('Error on dragging bounding box');
                    return;
                }
                bounding_box[select_topic.value][image_sequence][index] = {rect : e.currentTarget.toObject(), id : update_rect.id};
                update_bounding_box({topic: select_topic.value, image: image_sequence, oldrect : update_rect, newrect : {'rect' : e.currentTarget.toObject(), 'id' : update_rect.id}});
            } else {
                e.currentTarget.setAttrs({
                    x: update_rect.bounding_box.attrs.x,
                    y: update_rect.bounding_box.attrs.y,
                });
            }
        });
        
        layer.add(rect);
        layer.add(text);

        if (checkbox.checked) {
            if (sub_class_name === '') { 
                // Popup for asking subclass name
                $('#sub_class_dialog').dialog('open');
                
                $('#sub_class_dialog').dialog({
                    beforeClose : () => {
                        if (sname !== '') {
                            rect.name(rect.name() + `${sname}`);
                            text.text(text.text() + ` ${sname}`);

                            sname = '';
                            bounding_box[select_topic.value][image_sequence].push({rect : rect.toObject(), id : last_id_bounding_box++});
                            add_bounding_box({topic: select_topic.value, image: image_sequence, bounding_box: bounding_box[select_topic.value][image_sequence][bounding_box[select_topic.value][image_sequence].length - 1]});
                        } else {
                            rect.remove();
                            text.remove();
                        }
                    }
                });
            } else {
                rect.name(rect.name() + `${sub_class_name}`);
                text.text(text.text() + ` ${sub_class_name}`);
                bounding_box[select_topic.value][image_sequence].push({rect : rect.toObject(), id : last_id_bounding_box++});
                add_bounding_box({topic: select_topic.value, image: image_sequence, bounding_box: bounding_box[select_topic.value][image_sequence][bounding_box[select_topic.value][image_sequence].length - 1]});
            }
        } else {
            bounding_box[select_topic.value][image_sequence].push({rect : rect.toObject(), id : last_id_bounding_box++});
            add_bounding_box({topic: select_topic.value, image: image_sequence, bounding_box: bounding_box[select_topic.value][image_sequence][bounding_box[select_topic.value][image_sequence].length - 1]});          
        }

        wantDraw = false;
    }

    // For deselect Text class
    let nodes = [];
    tr.nodes().forEach(node => {
        if (node.className !== 'Text')
            nodes.push(node);
    });
    tr.nodes(nodes);
});

// clicks should select/deselect shapes
stage.on('click', (e) => {
    // if we are selecting with rect, do nothing
    if (selectionRectangle.visible())
        return;

    // if click on empty area - remove all selections
    if (e.target === stage) {
        tr.nodes([]);
        return;
    }

    if (e.target.className === 'Text')
        return;

    const metaPressed = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    const isSelected = tr.nodes().indexOf(e.target) >= 0;

    if (!metaPressed && !isSelected) {
        // if no key pressed and the node is not selected
        // select just one
        tr.nodes([e.target]);
    } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected
        // we need to remove it from selection:
        const nodes = tr.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(e.target), 1);
        tr.nodes(nodes);
    } else if (metaPressed && !isSelected) {
        // add the node into selection
        const nodes = tr.nodes().concat([e.target]);
        tr.nodes(nodes);
    }
});

// Remove a bounding box by pressing canc key
container.addEventListener('keydown', (e) => {
    if (e.keyCode == 46) {
        tr.nodes().forEach(node => {

            // Select the Text class associated with the rect
            let remove = layer.getChildren(text => {
                return text._id > 14 && text.attrs.x == node.attrs.x && text.attrs.y == node.attrs.y && node._id != text._id;
            });

            remove.forEach(text => {
                text.remove();
            });
            
            let id = get_id_by_bounding_box(node.toObject());

            node.remove();

            remove_bounding_box({topic: select_topic.value, image: image_sequence, id : id});

            let index = get_index_by_id(id);
            if (index >= 0)
                bounding_box[select_topic.value][image_sequence].splice(index, 1);
        });
        tr.nodes([]);
    }
});

// Remove all bounding box from container
function remove_local_bounding_box() {
    let remove = layer.getChildren(node => {
        return node._id > 14;
    });

    remove.forEach(node => {
        node.remove();
    });
}

function is_out_border(rect) {
    return rect.getAbsolutePosition().x < 0 
    || rect.getAbsolutePosition().y < 0 
    || (rect.getAbsolutePosition().x + rect.width() * scaleX) > div_container.clientWidth 
    || (rect.getAbsolutePosition().y + rect.height()* scaleY) > div_container.clientHeight;
}

// Resize canvas and bounding box
function fitStageIntoContainer() {
    scaleX = div_container.clientWidth / WIDTH;
    scaleY = div_container.clientHeight / HEIGHT;

    stage.width(div_container.clientWidth);
    stage.height(div_container.clientHeight);

    stage.scale({x: scaleX, y: scaleY});
    stage.draw();
}

fitStageIntoContainer();

// Event for resizing canvas
window.addEventListener('resize', fitStageIntoContainer);