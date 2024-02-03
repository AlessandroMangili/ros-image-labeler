// KONVA - BOUNDING BOX section
var WIDTH, HEIGHT;
let scaleX, scaleY, update_rect;

var stage = new Konva.Stage({
    container: 'container',
    width: div_container.clientWidth,
    height: div_container.clientHeight,
});

// Create layer
var layer = new Konva.Layer();
stage.add(layer);

var tr = new Konva.Transformer({
    rotateEnabled: false,
    anchorFill : "#d9d9d9",
    anchorCornerRadius : 20,
    anchorSize : 18,
    borderStroke: "red",
    borderStrokeWidth : 7,
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
    if (!selectionRectangle.visible()) {
        return;
    }
    
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
            strokeWidth: 2,
            draggable: true,
        });

        let text = new Konva.Text({
            x: selectionRectangle.attrs.x,
            y: selectionRectangle.attrs.y,
            text: `${class_name}`,
            width: selectionRectangle.attrs.width,
            fontSize: 10,
            align: 'center',
            draggable : false,
        });
        
        layer.add(rect);
        layer.add(text);

        if (sub_class_name != '') {
            rect.name(rect.name() + `${sub_class_name}`);
            text.text(text.text() + ` ${sub_class_name}`);
        }
        
        add_bounding_box(select_topic.value, image_numbers[index], rect.toObject(), -1, get_local_class_id(class_name));
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

prova = true;

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

    if (!metaPressed && !isSelected && e.target._id > 14) { //_id > 14 to avoid adding other components other than rectangles
        // if no key pressed and the node is not selected, select just one
        tr.nodes([e.target]);
    } else if (metaPressed && isSelected) {
        // if we pressed keys and node was selected, we need to remove it from selection:
        const nodes = tr.nodes().slice(); // use slice to have new copy of array
        // remove node from array
        nodes.splice(nodes.indexOf(e.target), 1);
        tr.nodes(nodes);
    } else if (metaPressed && !isSelected && e.target._id > 14) {
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

            let id = get_id_by_bounding_box(bounding_box, node);
            remove_bounding_box(select_topic.value, image_numbers[index], id, node.attrs.name.split('-')[0]);
            node.remove();
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