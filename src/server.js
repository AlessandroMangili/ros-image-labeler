const express = require('express');
const http = require('http');
const { dirname } = require('path');
const { Server } = require("socket.io");
const util = require('util');

// JS file import
const BAG = require(__dirname + '/javascript/Bagfunction');

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 8000;

const classes = [];
const sub_classes = {};
const bounding_box = {};

/*
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.use(require('body-parser').json({ limit: '10mb' }));
*/

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.get('/draw', (req, res) => {
    res.sendFile(__dirname + '/views/label.html');
});

// SOCKET.IO

io.on('connection', (socket) => {
    // Receive bag file
    socket.on('clicked', (msg, callback) => {
        BAG.extract_from_bagFile(msg)
        .then(() => {
            callback("Succesfull");
        })
        .catch((error) => {
            console.error(error);
            callback("Error: " + error);
        });
    });

    // Add new class
    socket.on('add class', (msg) => {
        classes.push(msg);
        sub_classes[msg.name] = [];
    });

    // Add new sub_class
    socket.on('add sub_class', (msg) => {
        sub_classes[msg.name].push(msg.id);
    });

    // Add a specific bounding box
    socket.on('add bounding_box', (msg) => {
        bounding_box[msg.topic] = bounding_box[msg.topic] || {};
        bounding_box[msg.topic][msg.image] = bounding_box[msg.topic][msg.image] || [];
        bounding_box[msg.topic][msg.image].push(msg.rect);
    });

    // Send all classes
    socket.on('get classes', (msg, callback) => {
        callback(classes);
    });

    // Send all subClasses releated to a class
    socket.on('get sub_classes', (name, callback) => {
        callback(sub_classes[name]);
    });

    // Send all bounding box releted to that path
    socket.on('get bounding_box', (msg, callback) => {
        bounding_box[msg.topic] = bounding_box[msg.topic] || {};
        bounding_box[msg.topic][msg.image] = bounding_box[msg.topic][msg.image] || [];
        callback(bounding_box[msg.topic][msg.image]);
    });

    // Remove class and all bounding box
    socket.on('remove class', (msg) => {
        try {
            let index = 0;
            classes.forEach(e => {
                if(JSON.stringify(msg) === JSON.stringify(e))
                    throw index;
                index++;
            });
            return;
        } catch(e) {
            classes.splice(e, 1);
            
            // Removing all sub_classes
            sub_classes[msg.name].splice(0, sub_classes[msg.name].length);

            remove_bounding_box_by_class(msg.name);   
        }
    });

    // Remove sub_class
    socket.on('remove sub_class', (msg) => {
        let index = sub_classes[msg.name].indexOf(Number(msg.id));
        if (index > -1)
            sub_classes[msg.name].splice(index, 1);
    });    

    // Remove a specific bounding box
    socket.on('remove bounding_box', (msg) => {
        bounding_box[msg.topic] = bounding_box[msg.topic] || {};
        bounding_box[msg.topic][msg.image] = bounding_box[msg.topic][msg.image] || [];
        try {
            let index = 0;
            bounding_box[msg.topic][msg.image].forEach(e => {
                if (JSON.stringify(msg.rect) === JSON.stringify(e))
                    throw index;
                index++;
            });
        } catch(e) {
            bounding_box[msg.topic][msg.image].splice(e, 1);
        }
    });
});

// Remove all bounding box for a class
function remove_bounding_box_by_class(class_name) {
    Object.keys(bounding_box).forEach((topic, _) => {
        Object.keys(bounding_box[topic]).forEach(image => {
            bounding_box[topic][image].forEach((rect, index) => {
                if (rect.attrs.name === class_name)
                    delete bounding_box[topic][image][index];
            });
        });
    });
}

// CONNECTION

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});