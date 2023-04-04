const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');
const PATH = require('path');

// JS file import
const IMAGE = require(PATH.join(__dirname, 'javascript/Imagefunction'));
const MONGO = require(PATH.join(__dirname, 'javascript/DBfunction'));
const BASH = require(PATH.join(__dirname, 'javascript/Bashfunction'));

const app = express();
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 8000;

const classes = [];
const sub_classes = {};
const bounding_box = {};

var client;
var mongodb;

app.get('/', (req, res) => {
    res.sendFile(PATH.join(__dirname, 'views/index.html'));
});

app.get('/draw', (req, res) => {
    res.sendFile(PATH.join(__dirname, 'views/label.html'));
});

// SOCKET.IO

io.on('connection', (socket) => {
    // Receive bag file
    socket.on('save_bag', async (msg, callback) => {
        if (mongodb) {
            await process.kill(-mongodb.pid);
            setTimeout(() => {create_local_db(msg)}, 2000);
            return;
        }
        create_local_db(msg);
    });

    // Return all valid topics (images) of the current bag file
    socket.on('get topics', async (_, callback) => {
        if (client == null)
            return;

        try {
            let topics = await client.listCollections().toArray();
            let clone = topics.slice();
    
            topics.forEach(topic => {
                if (topic.name.indexOf("image_raw") < 0)
                    clone.splice(clone.indexOf(topic), 1);
            });
            callback(clone);
        } catch (e) {
            callback(`Error : ${e}`);
        } 
    });

    // Send the first sequence number of that topic
    socket.on('get first_seq', async (msg, callback) => {
        if (client == null)
            return

        try {
            let result = await MONGO.get_first_seq(client, msg);
            callback(result);
        } catch (e) {
            callback(`Error : ${e}`);
        }
    });

    // Send the buffer that encode image
    socket.on('get image', async(msg, callback) => {
        if (client == null)
            return;

        try {
            let document = await client.collection(msg.topic).findOne({"header.seq" : msg.seq});
            callback(IMAGE.create_image_buffer(document));
        } catch (e) {
            console.error(e);
            callback(`Error on encoding image`);
        }
    })

    // Add new class
    socket.on('add class', (msg) => {
        classes.push(msg);
        sub_classes[msg.name] = [];
    });

    // Add new sub_class
    socket.on('add sub_class', (msg) => {
        sub_classes[msg.name].push(msg.sub_name);
    });

    // Add a specific bounding box
    socket.on('add bounding_box', (msg) => {
        bounding_box[msg.topic] = bounding_box[msg.topic] || {};
        bounding_box[msg.topic][msg.image] = bounding_box[msg.topic][msg.image] || [];

        try {
            let index = 0;
            bounding_box[msg.topic][msg.image].forEach(rect => {
                if (rect.attrs.id == msg.rect.attrs.id)
                    throw index;
                index++;
            });
            bounding_box[msg.topic][msg.image].push(msg.rect);
        } catch (e) {
            bounding_box[msg.topic][msg.image][e] = msg.rect;
        }
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
        } catch (e) {
            classes.splice(e, 1);
            
            // Removing all sub_classes
            sub_classes[msg.name].splice(0, sub_classes[msg.name].length);

            remove_bounding_box_by_class(msg.name);
        }
    });

    // Remove sub_class
    socket.on('remove sub_class', (msg) => {
        let index = sub_classes[msg.name].indexOf(msg.sub_name);
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
        } catch (e) {
            bounding_box[msg.topic][msg.image].splice(e, 1);
        }
    });
});

// FUNCTION

// Remove all bounding box of a class
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

// Create and fill local instace of db from bag file
function create_local_db(msg) {
    // Create path for saved the local instance mongodb
    let path = PATH.join(__dirname, "db", msg);
    create_folder(path);

    mongodb = BASH.launch_mongodb(path, 62345);

    setTimeout(() => {
        path = PATH.join(__dirname, "bag_file", msg);
        BASH.info_rosbag(path);

        // Start node for logging
        let log = BASH.launch_log();

        // Start rosbag play command
        let bag = BASH.launch_rosbag_play(path);

        // When the rosbag file is finished
        bag.stdout.on("end", async () => {
            console.log(`END READ FILE BAG`);

            await process.kill(-log.pid);

            // Start the connection to local instance of db
            try {
                client = await MONGO.connect();
            } catch (e) {
                console.error(`Error on connected mongodb: ${e}`);
            }
        });

        log.stdout.on("data", (data) => {
            console.log(`read data from log node : ${data}`);
            // When the log node add succesfully the topics, then we can starts
            /*
            if (data.indexOf("GENERIC") >= 0)
                bag.stdin.write(" ");
            */
        });

    }, 1000);
    return;
}

// FILESYSTEM FUNCTION

function create_folder(path) {
    if (!fs.existsSync(path)) {
        try {
            fs.mkdirSync(path, {recursive : true});
            return true;
        } catch (e) {
            console.log(`Error on create folder at this path : ${path} with this error : ${e}`);
            process.exit(1);
        }
    }
    return false;
}

function folder_is_empty(path) {
    fs.readdir(path, (e, files) => {
        if (e)
            console.log(`error on reading folder ${path} with this error : ${e}`);
        else 
            return files.length == 0 ? true : false;
    });
}

// CONNECTION

server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);

    create_folder(PATH.join(__dirname, "bag_file"));

    BASH.launch_roscore();
});