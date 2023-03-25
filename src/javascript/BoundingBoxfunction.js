// KONVA - Container for image annotate
var stage = new Konva.Stage({
    container: 'container',
    width: div_container.clientWidth,
    height: div_container.clientHeight,
});

// Create layer
var layer = new Konva.Layer();
stage.add(layer);

var tr = new Konva.Transformer();
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
    x1 = stage.getPointerPosition().x;
    y1 = stage.getPointerPosition().y;
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

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
    x2 = stage.getPointerPosition().x;
    y2 = stage.getPointerPosition().y;

    selectionRectangle.setAttrs({
        x: Math.min(x1, x2),
        y: Math.min(y1, y2),
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
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

    var shapes = stage.find('.rect');
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
    // Check if the width and height of bounding box is >= 20 then draw it
    if (wantDraw && box.width >= 20 && box.height >= 20) {
        try {
            list_class.childNodes.forEach(node => {
            if (node.style.backgroundColor == "red")
                throw node;
            });
            
            alert("You need first to create or select a class");
            return;
        } catch (e) {
            let rect = new Konva.Rect({
                x: selectionRectangle.attrs.x,
                y: selectionRectangle.attrs.y,
                width: selectionRectangle.attrs.width,
                height: selectionRectangle.attrs.height,
                name: "rect",
                stroke: e.title,
                strokeWidth: 3,
                draggable: true,
            });
            layer.add(rect);
            add_bounding_box({topic: select_topic.value, image: image_counter, rect: rect.toObject()});
            wantDraw = false;
        }

        // If checkbox is not flagged, just return
        if (!checkbox.checked)
            return;
        
        try {
            // If a sub_class is already selected, so don't create a new sub_class
            list_sub_class.childNodes.forEach(node => {
                if (node.style.backgroundColor == "red")
                    throw node;
            });
            
            msg = {
                name : class_name,
                id : list_sub_class.hasChildNodes() ? parseInt(list_sub_class.lastElementChild.innerHTML) + 1 : 0
            };
            create_sub_class(msg.id, list_sub_class);
            add_sub_class(msg);
        } catch (e) {
            console.log(e.innerHTML);
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

    // do nothing if clicked NOT on our rectangles
    if (!e.target.hasName('rect'))
        return;

    // do we pressed shift or ctrl?
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

// Function to delete bounding box on canc key press
container.addEventListener('keydown', (e) => {
    if (e.keyCode == 46) {
        tr.nodes().forEach(node => {
            node.remove();
            remove_bounding_box({topic: topic.value, image: image_counter, rect: node.toObject()})
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

// For fixing resizing canvas
window.addEventListener('resize', fitStageIntoContainer);

// Resize container and canvas
function fitStageIntoContainer() {
    stage.width(div_container.clientWidth);
    stage.height(div_container.clientHeight);
}