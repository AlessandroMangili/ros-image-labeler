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
// contains mongodb launch command process
var mongodb;
// contains roscore command process
var roscore;
// useful for check if connection to mongodb is started or not
var access_garanteed = false;

app.get('/', (req, res) => {
    res.sendFile(PATH.join(__dirname, 'views/index.html'));
});

app.get('/draw', (req, res) => {
    if (access_garanteed)
        res.sendFile(PATH.join(__dirname, 'views/label.html'));
    else
        res.status(403).end("Forbidden: you are not authorized here for now, just select a local instance of db or proceed with the creation by saving a bag file");
});

/*app.get('/*', (req, res) => {
    res.sendFile(PATH.join(__dirname + "/views/404.html"));
});*/

// SOCKET.IO

io.on('connection', (socket) => {
    // Receive bag file
    socket.on('save_bag', async (msg, callback) => {
        access_garanteed = false;

        if (!await folder_is_empty(PATH.join(__dirname, "db", msg))) {
            console.warn("There are already a local repository of that file, if you want to save again, delete the folder");
            return;
        }

        // '-' is for kill all subprocess of that process and awit is for handle the promise
        if (mongodb) {
            await process.kill(-mongodb.pid);
            setTimeout(() => {create_local_db(msg, callback)}, 2000);
            return;
        }
        
        create_local_db(msg, callback);
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

function create_local_db(msg, callback) {
    // Create path for saved the local instance mongodb
    let path = PATH.join(__dirname, "db", msg);
    create_folder(path);

    // Start the mongodb server
    mongodb = BASH.launch_mongodb(path, 62345);

    // The timeout is to wait for the mongodb server to start
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

            // '-' is for kill all subprocess of that process and awit is for handle the promise
            await process.kill(-log.pid);

            // Start the connection to local instance of db
            try {
                client = await MONGO.connect();
                access_garanteed = true;
                callback("OK");
            } catch (e) {
                console.error(`Error on connected mongodb: ${e}`);
                callback(`Error on connected mongodb: ${e}`);
            }
        });
    }, 1000);
    return;
}

// FILESYSTEM FUNCTION

async function create_folder(path) {
    if (!fs.existsSync(path)) {
        try {
            fs.mkdirSync(path, {recursive : true});
            return true;
        } catch (e) {
            console.error(`Error on create folder at this path : ${path} with this error : ${e}`);
            if (roscore)
                await process.kill(-roscore.pid);
            process.exit(1);
        }
    }
    return false;
}

async function folder_is_empty(path) {
    if (!fs.existsSync(path))
        return true;

    return new Promise((resolve, reject) => {
        fs.readdir(path, (e, files) => {
            if (e) {
                console.error(`error on reading folder ${path} with this error : ${e}`);
                resolve(false);
            }
            else 
                return files.length == 0 ? resolve(true) : resolve(false);
        });
    });
}

// CONNECTION

server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);

    create_folder(PATH.join(__dirname, "bag_file"));

    roscore = BASH.launch_roscore();
});