// POPUP for adding new class
document.getElementById("addClass").addEventListener('click', (e) => {
    $('#dialog').dialog('open');
});

$("#dialog").dialog({
    autoOpen: false,
    resizable: false,
    buttons: [
        {
            text: "Ok",
            icon: "ui-icon-heart",
            click: function() {
                try {
                    var name = $('input[id="className"]').val();
                    var colorpick = $('input[id="classColor"]').val();

                    if (name == null || name == "") 
                        throw "You have to insert the name of the class";
                    

                    // Check if name or color exist already
                    list.childNodes.forEach((node) => {
                        if (node.title == colorpick || node.text == name) 
                            throw "The name or the color is already in use";
                    });

                    let msg = {
                        name: name,
                        color: colorpick
                    };

                    // Add class to left sidebar
                    create_class(msg);
                
                    // Save class to nodejs
                    socket.emit('add class', msg);

                    // Close the popup
                    $(this).dialog("close");
                } catch (e) {
                    alert(e);
                }
            }
        }
    ],
    dialogClass: "popup",
    draggable: false
});