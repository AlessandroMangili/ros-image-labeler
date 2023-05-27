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

<<<<<<< HEAD
const classes = [];
const sub_classes = {};
const bounding_box = {};

var last_image_seq = 0;

// contains the connection with the mongodb local instance 
var client;
=======
>>>>>>> master
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
        res.sendFile(PATH.join(__dirname, '/views/403.html'));
});

app.get('/*', (req, res) => {
    res.sendFile(PATH.join(__dirname, '/views/404.html'));
});

// SOCKET.IO

io.on('connection', (socket) => {
    // Create a new local instace from the bag file
    socket.on('save_bag', async (msg, callback) => {
        access_garanteed = false;

        // Check if the bag file exist in bag_file folder or not
        if(!fs.existsSync(PATH.join(__dirname, 'bag_file', `${msg}.bag`))) {
            console.error(`${msg}.bag does not exist in folder \'bag_file\'`);
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
            try {
                await process.kill(-mongodb.pid);
            } catch (e) {
                console.log(`Error on kill process ${e}`);
            }
            setTimeout(() => {create_local_db(msg, callback)}, 2000);
            return;
        }

        create_local_db(msg, callback);
    });

    // Return all valid topics (image_raw) of the current local instace
    socket.on('get topics', async (_, callback) => {
        try {
            callback(await MONGO.get_image_topics());
        } catch (e) {
            callback(String(e));
        }
    });

    // Send the first sequence number of that topic
    socket.on('get first_last_seq', async (msg, callback) => {
        try {
            callback(await MONGO.get_first_last_seq(msg));
        } catch (e) {
            callback(String(e));
        }
    });

    // Send the buffer that encode image
    socket.on('get image', async(msg, callback) => {
        try {
<<<<<<< HEAD
            let document = await client.collection(msg.topic).findOne({'header.seq' : msg.seq});
            
            /* DA DECOMMENTARE PER SALVARE IMMAGINE 
            if (Object.keys(bounding_box).length != 0 && document != null) 
                IMAGE.save_bounding_image(IMAGE.create_image_buffer(document), bounding_box[msg.topic][last_image_seq]);
            */
           
            last_image_seq = msg.seq;
            callback(IMAGE.create_image_buffer(document));
=======
            let result = await MONGO.get_image(msg.topic, msg.seq);
            callback(IMAGE.create_image_buffer(result));
>>>>>>> master
        } catch (e) {
            console.error(`error on encoding image: ${e}`);
            callback(`error on encoding image: ${e}`);
        }
    });

    // Send all the local instace of mongodb
    socket.on('get db', async (_, callback) => {
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
            try {
                await process.kill(-mongodb.pid);
            } catch (e) {
                console.log(`Error on kill process ${e}`);
            }
            
            setTimeout(() => {connect_db(path, callback)}, 2000);
            return;
        }

        connect_db(path, callback);
    });

    // HANDLE BOUNDING BOX

    // Add new class
    socket.on('add class', async (msg, callback) => {
        try {
            await MONGO.add_class(msg.name, msg.color);
            callback(`class ${msg.name} saved`);
        } catch (e) {
            callback(String(e));
        }
    });

    // Add new sub-class
    socket.on('add sub_class', async (msg, callback) => {
        try {
            await MONGO.add_sub_class(msg.name, msg.sub_name);
            callback(`subclass ${msg.sub_name} of class ${msg.name} saved`);
        } catch (e) {
            callback(String(e));
        }
    });

    socket.on('add bounding_box with id', async (msg, callback) => {
        try {
            await MONGO.add_bounding_box_with_id(msg.topic, msg.image, msg.bounding_box, msg.id);
            callback('bounding box aggiunto');
        } catch (e) {
            callback(String(e));
        }
    }),

    // Add a specific bounding box
    socket.on('add bounding_box', async (msg, callback) => {   
        try {
            await MONGO.add_bounding_box(msg.topic, msg.image, msg.bounding_box);
            callback('bounding box aggiunto');
        } catch (e) {
            callback(String(e));
        }
    });

    // Send all classes
    socket.on('get classes', async (msg, callback) => {
        try {
            callback(await MONGO.get_classes());
        } catch (e) {
            callback(String(e));
        }
    });

    // Send all sub-classes releated to that class
    socket.on('get sub_classes', async (msg, callback) => {
        try {
            callback(await MONGO.get_sub_classes(msg));
        } catch (e) {
            callback(String(e));
        }
    });

    socket.on('get only bounding_box', async (msg, callback) => {
        try {
            callback(await MONGO.get_bounding_box(msg.topic, msg.image));
        } catch (e) {
            callback(String(e));
        }
    });

    // Send all bounding box releted to that image
    socket.on('get bounding_box', async (msg, callback) => {
        try {
            callback(await MONGO.get_bounding_box(msg.topic, msg.image));
        } catch (e) {
            callback(String(e));
        }
    });

    // Remove the class and all its bounding box
    socket.on('remove class', async (msg, callback) => {
        try {
            await MONGO.remove_class(msg);
            callback('class removed successfully');
        } catch (e) {
            callback(String(e));
        }
    });

    // Remove sub-class
    socket.on('remove sub_class', async (msg, callback) => {
        try {
            await MONGO.remove_sub_class(msg.name, msg.sub_name);
            callback('sub class removed successfully');
        } catch (e) {
            callback(String(e));
        }
    });

    // Remove a specific bounding box
    socket.on('remove bounding_box', async (msg, callback) => {
        try {
            await MONGO.remove_bounding_box(msg.topic, msg.image, msg.id);
            callback('bounding box removed successfully');
        } catch (e) {
            callback(String(e));
        }
    });

    // Update a specific bounding box on drag or resize
    socket.on('update bounding_box', async (msg, callback) => {
        try {
            await MONGO.update_bounding_box(msg.topic, msg.image, msg.old_rect, msg.new_rect);
            callback('bounding box update successfully');
        } catch (e) {
            callback(String(e));
        }
    });
});

function create_local_db(msg, callback) {
    // Create the path to save the db instace
    let path = PATH.join(__dirname, 'db', msg);
    create_folder(path);
    // Start command mongodb_store.launch (server)
    mongodb = BASH.launch_mongodb(path, 62345);

    // The timeout is to wait for the mongodb server to start
    setTimeout(() => {
        path = PATH.join(__dirname, 'bag_file', msg);

        // Start command mongodb_log
        let log = BASH.launch_log();
        // Start command rosbag play 
        let bag = BASH.launch_rosbag_play(path);

        // The bag file is over
        bag.stdout.on('end', async () => {
            console.log(`END READ FILE BAG`);
            // '-' is for kill all subprocess of that process and awit is for handle the promise
            try {
                await process.kill(-log.pid);
            } catch (e) {
                console.log(`error on kill process ${e}`);
            }
            
            // Start the connection to mongodb client
            try {
                await MONGO.connect();
                await MONGO.create_collections();
                access_garanteed = true;
                callback('connected to mongodb instance');
            } catch (e) {
                callback(e);
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
        await MONGO.connect();        
        access_garanteed = true;
        callback('connected to mongodb instance');
    } catch (e) {
        callback(e);
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
            if (roscore) {
                try {
                    await process.kill(-roscore.pid);
                } catch (e) {
                    console.log(`Error on kill process ${e}`);
                }
            }
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