const express = require('express');
const http = require('http');
const { dirname } = require('path');
const { Server } = require("socket.io");

// JS file import
const BAG = require(__dirname + '/javascript/Bagfunction');

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 8000;

const classes = [];
const sub_classes = {};

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
    socket.on('add subClass', (msg) => {
        //sub_classes[msg.name] = sub_classes[msg.name] || [];
        sub_classes[msg.name].push(msg.id);
    });

    // Send all subClasses releated to a class
    socket.on('get subClasses', (name, callback) => {
        callback(sub_classes[name]);
    });

    // Send all classes
    socket.on('get classes', (msg, callback) => {
        callback(classes);
    });
});

// CONNECTION

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});