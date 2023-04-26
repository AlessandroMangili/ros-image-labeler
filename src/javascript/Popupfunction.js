// POPUP section

// Classes popup
$('#class_dialog').dialog({
    autoOpen: false,
    resizable: false,
    buttons: [
        {
            text: 'Ok',
            icon: 'ui-icon-check',
            click: function() {
                try {
                    var name = $('input[id="class_name"]').val();
                    var colorpick = $('input[id="class_color"]').val();

                    if (name == null || name == '') 
                        throw 'You have to insert the name of the class';
                    

                    // Check if name or color exist already
                    list_class.childNodes.forEach(node => {
                        if (node.title == colorpick || node.text == name) 
                            throw 'The name or the color is already in use';
                    });

                    let msg = {name: name, color: colorpick};

                    // Add class to left sidebar
                    create_class(msg);
                
                    add_class(msg);

                    // Close the popup
                    $(this).dialog('close');
                } catch (e) {
                    alert(e);
                }
            }
        }
    ],
    dialogClass: 'popup',
    draggable: false
});

let sname = '';

// Sub-classes popup
$('#sub_class_dialog').dialog({
    autoOpen: false,
    resizable: false,
    buttons: [
        {
            text: 'Ok',
            icon: 'ui-icon-check',
            click: function() {
                try {
                    sname = $('input[id="sub_class_name"]').val();

                    if (sname == null || sname == '')
                        throw 'You have to insert the name of the sub-class';
                    
                    // Check if name or color exist already
                    list_sub_class.childNodes.forEach(node => {
                        if (node.text == sname) 
                            throw 'The name is already in use';
                    });

                    //id : list_sub_class.hasChildNodes() ? parseInt(list_sub_class.lastElementChild.innerHTML) + 1 : 0
                    // Create the subclass
                    create_sub_class(sname, list_sub_class);
                    add_sub_class({name : class_name, sub_name : sname});

                    // Close the popup
                    $(this).dialog('close');
                } catch (e) {
                    alert(e);
                }
            }
        }
    ],
    dialogClass: 'popup',
    draggable: false
});