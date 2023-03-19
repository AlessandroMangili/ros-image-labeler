const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

// JS file import
const DB = require(__dirname + '/Javascript/DBfunction');
const BAG = require(__dirname + '/Javascript/Bagfunction');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 8000;

/*
app.set('views', __dirname + '/views');
app.set('view engine', 'html');

app.use(express.static(__dirname + '/views'));
app.use(require('body-parser').json({ limit: '10mb' }));
*/

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// SOCKET.IO

io.on('connection', (socket) => {
    console.log("a user connected");

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

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

// CONNECTION

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    DB.connect()
    .catch(() => {
        process.exit();
    });
});