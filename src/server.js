const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
// contains process of command mongodb_store.launch 
var mongodb;
// contains process of command roscore
var roscore;
// check if the connection with the mongodb server is active or not
var access_garanteed = false;

app.get('/', (req, res) => {
    res.sendFile(PATH.join(__dirname, 'views/index.html'));
});

app.get('/draw', (req, res) => {
    if (access_garanteed)
        res.sendFile(PATH.join(__dirname, 'views/label.html'));
    else
        res.status(403).end('Forbidden: you are not authorized here for now, just select a local instance of db or proceed with the creation by saving a bag file');
});

/*app.get('/*', (req, res) => {
    res.sendFile(PATH.join(__dirname + '/views/404.html'));
});*/

// SOCKET.IO

io.on('connection', (socket) => {

    // Create a new local instace from the bag file
    socket.on('save_bag', async (msg, callback) => {
        access_garanteed = false;

        // Check if the bag file exist in bag_file folder or not
        if(!fs.existsSync(PATH.join(__dirname, 'bag_file', `${msg}.bag`))) {
            console.warn(`${msg}.bag does not exist in folder \'bag_file\'`);
            callback(`${msg}.bag does not exist in folder \'bag_file\'`);
            return;
        }

        // Check if the folder of local instance is empty or not
        if (!await folder_is_empty(PATH.join(__dirname, 'db', msg))) {
            console.warn('There is already a local repository of that file, if you want to save again, delete the folder');
            callback('There is already a local repository of that file, if you want to save again, delete the folder');
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

    // Return all valid topics (image_raw) of the current local instace
    socket.on('get topics', async (_, callback) => {
        if (client == null)
            return;

        try {
            let topics = await client.listCollections().toArray();
            let clone = topics.slice();
    
            topics.forEach(topic => {
                if (topic.name.indexOf('image_raw') < 0)
                    clone.splice(clone.indexOf(topic), 1);
            });
            callback(clone);
        } catch (e) {
            callback(`error : ${e}`);
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
            callback(`error : ${e}`);
        }
    });

    // Send the buffer that encode image
    socket.on('get image', async(msg, callback) => {
        if (client == null)
            return;

        try {
            let document = await client.collection(msg.topic).findOne({'header.seq' : msg.seq});
            callback(IMAGE.create_image_buffer(document));
        } catch (e) {
            console.error(e);
            callback(`error on encoding image`);
        }
    });

    // Send all the local instace of mongodb
    socket.on('get db', async (msg, callback) => {
        access_garanteed = false;
        callback(await list_file_folder(PATH.join(__dirname, 'db')));
    });

    // Connect the mongodb client to its local instace
    socket.on('load db', async (msg, callback) => {
        access_garanteed = false;
        let path = PATH.join(__dirname, 'db', msg);

        // Check if the folder of local db instance is empty
        if (await folder_is_empty(path)) {
            console.warn('The selected instace does not exist or the relative folder is empty');
            callback('The selected instace does not exist or the relative folder is empty');
            return;
        }

        if (mongodb) {
            await process.kill(-mongodb.pid);
            setTimeout(() => {connect_db(path, callback)}, 2000);
            return;
        }

        connect_db(path, callback);
    });

    // HANDLE BOUNDING BOX

    // Add new class
    socket.on('add class', (msg) => {
        classes.push(msg);
        sub_classes[msg.name] = [];
    });

    // Add new sub-class
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

    // Send all sub-classes releated to that class
    socket.on('get sub_classes', (name, callback) => {
        callback(sub_classes[name]);
    });

    // Send all bounding box releted to that image
    socket.on('get bounding_box', (msg, callback) => {
        bounding_box[msg.topic] = bounding_box[msg.topic] || {};
        bounding_box[msg.topic][msg.image] = bounding_box[msg.topic][msg.image] || [];
        callback(bounding_box[msg.topic][msg.image]);
    });

    // Remove the class and all its bounding box
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

    // Remove sub-class
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
    // Create the path to save the db instace
    let path = PATH.join(__dirname, 'db', msg);
    create_folder(path);

    // Start command mongodb_store.launch (server)
    mongodb = BASH.launch_mongodb(path, 62345);

    // The timeout is to wait for the mongodb server to start
    setTimeout(() => {
        path = PATH.join(__dirname, 'bag_file', msg);
        BASH.info_rosbag(path);

        // Start command mongodb_log
        let log = BASH.launch_log();

        // Start command rosbag play 
        let bag = BASH.launch_rosbag_play(path);

        // The bag file is over
        bag.stdout.on('end', async () => {
            console.log(`END READ FILE BAG`);

            // '-' is for kill all subprocess of that process and awit is for handle the promise
            await process.kill(-log.pid);

            // Start the connection to mongodb client
            try {
                client = await MONGO.connect();
                access_garanteed = true;
                callback('OK');
            } catch (e) {
                console.error(`error on connected mongodb: ${e}`);
                callback(`error on connected mongodb: ${e}`);
            }
        });
    }, 1000);
    return;
}

// Connect to local instace, start mongodb server
async function connect_db(path, callback) {
    // Start command mongodb_store.launch (server)
    mongodb = BASH.launch_mongodb(path, 62345);

    // Start the connection to mongodb client
    try {
        client = await MONGO.connect();
        access_garanteed = true;
        callback('OK');
    } catch (e) {
        console.error(`error on connected mongodb: ${e}`);
        callback(`error on connected mongodb: ${e}`);
    }
}

// FILESYSTEM FUNCTION

// Create folder if it does not exist
async function create_folder(path) {
    if (!fs.existsSync(path)) {
        try {
            fs.mkdirSync(path, {recursive : true});
            return true;
        } catch (e) {
            console.error(`error on create folder at this path : ${path} with this error : ${e}`);
            if (roscore)
                await process.kill(-roscore.pid);
            process.exit(1);
        }
    }
    return false;
}

// Check if the folder exist and if it's empty
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

// Return the list of files in the folder
async function list_file_folder(path) {
    if (!fs.existsSync(path))
        return [];

    return new Promise((resolve, reject) => {
        fs.readdir(path, (e, files) => {
            if (e) {
                console.error(`error on reading folder ${path} with this error : ${e}`);
                reject(`error: ${e}`);
            }
            else
                return files.length == 0 ? resolve([]) : resolve(files);
        });
    });
}

// CONNECTION

server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);

    create_folder(PATH.join(__dirname, 'bag_file'));

    roscore = BASH.launch_roscore();
});