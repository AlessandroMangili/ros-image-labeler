// Classes popup
$('#class_dialog').dialog({
    autoOpen: false,
    resizable: false,
    title: "Class",
    buttons: [
        {
            text: 'OK',
            icon: 'ui-icon-check',
            click: function() {
                try {
                    var name = $('input[id="class_name"]').val();
                    var colorpick = $('input[id="class_color"]').val();

                    if (name == null || name == '') 
                        throw new Error('You have to insert the name of the class');
                    if (name.includes('-') || name.includes(' '))
                        throw new Error(`You can not insert character '-' or 'white space' inside class name`);
                    

                    // Check if name or color exist already
                    list_class.childNodes.forEach(node => {
                        if (node.title == colorpick || node.text == name) 
                            throw 'The name or the color is already in use';
                    });
                    // Add class to left sidebar
                    create_class(name, colorpick, {topic: '', seq: -1});
                    add_class(name, colorpick);

                    // Close the popup
                    $(this).dialog('close');
                } catch (e) {
                    alert(e);
                    return;
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
    title: "Subclass",
    buttons: [
        {
            text: 'Ok',
            icon: 'ui-icon-check',
            click: function() {
                try {
                    sname = $('input[id="sub_class_name"]').val();

                    if (sname == null || sname == '')
                        throw new Error('You have to insert the name of the subclass');
                    if (sname.includes('-') || sname.includes(' '))
                        throw new Error(`You can not insert character '-' or 'white space' inside subclass name`);
                    
                    // Check if name or color exist already
                    list_sub_class.childNodes.forEach(node => {
                        if (node.text == sname) 
                            throw new Error('The name is already in use');
                    });
                    // Create the subclass
                    create_sub_class(sname, list_sub_class);
                    add_sub_class(class_name, sname);

                    // Close the popup
                    $(this).dialog('close');
                } catch (e) {
                    alert(e);
                    return;
                }
            }
        }
    ],
    dialogClass: 'popup',
    draggable: false
});

// Export popup
$('#export_dialog').dialog({
    autoOpen: false,
    resizable: false,
    title: "Export collections",
    buttons: [
        {
            text: 'Ok',
            icon: 'ui-icon-check',
            click: function() {
                try {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                    let collections = [];
                    checkboxes.forEach(checkbox => {
                        if (checkbox.value != '' && checkbox.checked)
                            collections.push(checkbox.value);
                    });
                    
                    if (collections.length > 0)
                        export_db(collections);
                    // Close the popup
                    $(this).dialog('close');
                } catch (e) {
                    alert(e);
                    return;
                }
            }
        }
    ],
    dialogClass: 'popup',
    draggable: false
});

function image_popup(name) {
    // Image popup
    $(`#${name}_dialog`).dialog({
        autoOpen: false,
        resizable: false,
        width: 'auto',
        height: 'auto',
        title: name,
        buttons: [
            {
                text: 'Ok',
                icon: 'ui-icon-check',
                click: function() {
                    try {
                        // Close the popup
                        $(this).dialog('close');
                    } catch (e) {
                        alert(e);
                        return;
                    }
                }
            }
        ],
        dialogClass: 'popup',
        draggable: false
    });
}

function update_class_popup(name, color) {
    // Image popup
    $(`#class_${name}_dialog`).dialog({
        autoOpen: false,
        resizable: false,
        title: name,
        buttons: [
            {
                text: 'Ok',
                icon: 'ui-icon-check',
                click: function() {
                    try {
                        cl_name = $(`input[id="update_${name}_class"]`).val();
                        if (cl_name == null || cl_name == '')
                            throw new Error('You have to insert the name of the subclass');
                        if (cl_name.includes('-') || cl_name.includes(' '))
                            throw new Error(`You can not insert character '-' or 'white space' inside subclass name`);
                        
                        
                        let index = classes.findIndex(cl => cl.name === cl_name)
                        if (index > -1)
                            throw new Error('The name is already in use');
                        index = classes.findIndex(cl => cl.name === name);
                        if (index > -1) {
                            classes[index] = { id: classes[index].id, name: cl_name };

                            const tag = list_class.getElementsByTagName("a");
                            for (let i = 0; i < tag.length; i++) {
                                if (tag[i].innerText === name) {
                                    tag[i].innerText = cl_name;
                                    tag[i].appendChild(create_button(color));
                                    break;
                                }
                            }

                            update_class_name(classes[index].id, cl_name);
                            // Close the popup
                            $(this).dialog('close');

                            class_name = cl_name;  
                            sub_class_name = '';
                            list_sub_class.style.visibility = '';
                            get_sub_classes(cl_name);
                            
                            $(`#class_${name}_dialog`).remove();
                            create_update_popup(cl_name);
                            change_image_popup(name, cl_name);
                        } else 
                            alert('the class to update does not exist, please reload the page');
                    } catch (e) {
                        alert(e);
                        return;
                    }
                }
            }
        ],
        dialogClass: 'popup',
        draggable: false
    });
}