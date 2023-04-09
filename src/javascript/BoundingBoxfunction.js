// KONVA - BOUNDING BOX section
var WIDTH = 530;
var HEIGHT = div_container.clientHeight;

var scaleX = 1;
var scaleY = 1;

var stage = new Konva.Stage({
    container: 'container',
    width: div_container.clientWidth,
    height: div_container.clientHeight,
});

// Create layer
var layer = new Konva.Layer();
stage.add(layer);

var tr = new Konva.Transformer({
    boundBoxFunc: (oldBox, newBox) => {
        const box = getClientRect(newBox);
        const isOut = box.x < 0 || box.y < 0 || box.x + box.width > stage.width() || box.y + box.height > stage.height();

        if (isOut) {
          return oldBox;
        }
        return newBox;
      },
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

    let offsetX, offsetY;

    offsetX = stage.getPointerPosition().x * (1 - scaleX);
    offsetY = stage.getPointerPosition().y * (1 - scaleY);    

    x1 = stage.getPointerPosition().x + offsetX;
    y1 = stage.getPointerPosition().y + offsetY;
    x2 = stage.getPointerPosition().x + offsetX;
    y2 = stage.getPointerPosition().y + offsetY;

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

    let offsetX = stage.getPointerPosition().x * (1 - scaleX);
    let offsetY = stage.getPointerPosition().y * (1 - scaleY);

    x2 = stage.getPointerPosition().x + offsetX;
    y2 = stage.getPointerPosition().y + offsetY;

    selectionRectangle.setAttrs({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
    });
});

stage.on('mouseup touchend', (e) => {
    // Check if the target is a bounding box, then save the changes
    if (e.target._id > 14) {
        console.log(tr.nodes());
        // MANCA DA SPOSTARE UNA SELEZIONE DI PIÙ BOUNDING BOX
        add_bounding_box({topic: select_topic.value, image: image_sequence, rect: e.target.toObject()});
    }

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
            name: class_name,
            stroke: color_pick,
            strokeWidth: 3,
            draggable: true,
        });
        layer.add(rect);
        // Add id to each individual rect
        rect.id(rect._id);

        rect.on('transformend', () => {
            add_bounding_box({topic: select_topic.value, image: image_sequence, rect: rect.toObject()})
        });

        add_bounding_box({topic: select_topic.value, image: image_sequence, rect: rect.toObject()});
        wantDraw = false;

        // If checkbox is not flagged, just return
        if (!checkbox.checked)
            return;
        
        // If a sub-class is already selected, so don't create a new sub-class
        if (sub_class_name == '') {
            // Popup for asking subclass name
            $('#sub_class_dialog').dialog('open');
        } else {
            console.log(sub_class_name);
        }            
    }
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
            node.remove();
            remove_bounding_box({topic: select_topic.value, image: image_sequence, rect: node.toObject()})
        });
        tr.nodes([]);
    }
});

// Function for limit resize and drag bounding box
tr.on('dragmove', () => {
    const boxes = tr.nodes().map((node) => node.getClientRect());
    const box = getTotalBox(boxes);
    tr.nodes().forEach((shape) => {
        const absPos = shape.getAbsolutePosition();
        // where are shapes inside bounding box of all shapes?
        const offsetX = box.x - absPos.x;
        const offsetY = box.y - absPos.y;

        // we total box goes outside of viewport, we need to move absolute position of shape
        const newAbsPos = { ...absPos };
        if (box.x < 0)
            newAbsPos.x = -offsetX;
        
        if (box.y < 0)
            newAbsPos.y = -offsetY;
        
        if (box.x + box.width > stage.width())
            newAbsPos.x = stage.width() - box.width - offsetX;
        
        if (box.y + box.height > stage.height())
            newAbsPos.y = stage.height() - box.height - offsetY;
        
        shape.setAbsolutePosition(newAbsPos);
    });
});

// Function for limit resize and drag bounding box
function getCorner(pivotX, pivotY, diffX, diffY, angle) {
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    /// find angle from pivot to corner
    angle += Math.atan2(diffY, diffX);

    /// get new x and y and round it off to integer
    const x = pivotX + distance * Math.cos(angle);
    const y = pivotY + distance * Math.sin(angle);

    return { x: x, y: y };
}

// Function for limit resize and drag bounding box
function getClientRect(rotatedBox) {
    const { x, y, width, height } = rotatedBox;
    const rad = rotatedBox.rotation;

    const p1 = getCorner(x, y, 0, 0, rad);
    const p2 = getCorner(x, y, width, 0, rad);
    const p3 = getCorner(x, y, width, height, rad);
    const p4 = getCorner(x, y, 0, height, rad);

    const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
    const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
    const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
    const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Function for limit resize and drag bounding box
function getTotalBox(boxes) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    boxes.forEach((box) => {
        minX = Math.min(minX, box.x);
        minY = Math.min(minY, box.y);
        maxX = Math.max(maxX, box.x + box.width);
        maxY = Math.max(maxY, box.y + box.height);
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// Remove all bounding box from container
function remove_local_bounding_box() {
    let remove = layer.getChildren(node => {
        return node._id > 14;
    });

    remove.forEach(node => {
        node.remove();
    });
}

// Resize canvas and bounding box
function fitStageIntoContainer() {
    scaleX = div_container.clientWidth / WIDTH;
    scaleY = div_container.clientHeight / HEIGHT;

    stage.width(div_container.clientWidth);
    stage.height(div_container.clientHeight);

    stage.scale({x: scaleX, y: scaleY});
    stage.draw()
}

fitStageIntoContainer();

// Event for resizing canvas
window.addEventListener('resize', fitStageIntoContainer);