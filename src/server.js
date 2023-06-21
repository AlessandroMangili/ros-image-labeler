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

        // Check if the folder of local instance is empty or not
        if (!await folder_is_empty(PATH.join(__dirname, 'db', msg))) {
            console.warn('error, there is already a local repository of that file, if you want to save again, delete the folder');
            callback('error, there is already a local repository of that file, if you want to save again, delete the folder');
            return;
        }
    
        // '-' is for kill all subprocess of that process and awit is for handle the promise
        if (mongodb) {
            try {
                await process.kill(-mongodb.pid);

                mongodb.on('exit', (code, signal) => {
                    if (code) {
                        console.error('mongodb server exited with code', code);
                        return;
                    } else if (signal) {
                        console.error('mongodb server was killed with signal', signal);
                        setTimeout(() => {create_local_db(msg, callback)}, 2500);
                        return;
                    }
                    setTimeout(() => {create_local_db(msg, callback)}, 2500);
                    return;
                });
            } catch (e) {
                console.log(`Error on kill process ${e}`);
            }
        } else
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
    socket.on('get all sequence numbers', async (msg, callback) => {
        try {
            callback(await MONGO.get_all_image_sequence_numbers(msg.topic, msg.fps));
        } catch (e) {
            callback(String(e));
        }
    });

    socket.on('load last image sequence', async (msg, callback) => {
        try {
            let document = await MONGO.get_db_info(msg.topic);
            callback(document == null ? -1 : document.seq);
        } catch (e) {
            callback(String(e));
        }
    });

    // Send the buffer that encode image
    socket.on('get image', async(msg, callback) => {
        try {
            await MONGO.update_db_info(msg.topic, msg.seq);
            result = await MONGO.get_image(msg.topic, msg.seq);
            callback(IMAGE.create_image_buffer(result));
        } catch (e) {
            console.error(`error on encoding image: ${e}`);
            callback(`error on encoding image: ${e}`);
        }
    });

    // Send all the local instace of mongodb
    socket.on('get bag files', async (_, callback) => {
        try {
            callback(await list_file_folder(PATH.join(__dirname, 'bag_file')));
        } catch (e) {
            console.error(`error on getting bag files: ${e}`);
            callback(`error on getting bag files: ${e}`);
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

                mongodb.on('exit', (code, signal) => {
                    if (code) {
                        console.error('mongodb server exited with code', code);
                        return;
                    } else if (signal) {
                        console.error('mongodb server was killed with signal', signal);
                        setTimeout(() => {connect_db(path, callback)}, 2500);
                        return;
                    }
                    setTimeout(() => {connect_db(path, callback)}, 2500);
                    return;
                });
            } catch (e) {
                console.log(`Error on kill process ${e}`);
            }
        } else
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
    let pathFolder = PATH.join(__dirname, 'db', msg);
    create_folder(pathFolder);
    // Start command mongodb_store.launch (server)
    mongodb = BASH.launch_mongodb(pathFolder, 62345);

    // The timeout is to wait for the mongodb server to start
    setTimeout(() => {
        let pathBag = PATH.join(__dirname, 'bag_file', msg);

        // Start command mongodb_log
        let log = BASH.launch_log();
        // Start command rosbag play 
        let bag = BASH.launch_rosbag_play(pathBag);

        // Check if bag command has been killed or just terminated
        let bag_killed = false;

        // end is for checking if length of the bag file is less than 6 seconds
        let first = true, end = false;
        let log1;

        log.stdout.on("data", (data) => {
            console.log(`read data from log node : ${data}`);
            // When the log node add succesfully the topics, then we can starts
            if (first) {
                setTimeout(async () => {
                    // Stop the play of bag file
                    bag.stdin.write(" ");
                    try {
                        // Kill the old logger
                        await process.kill(-log.pid);

                        setTimeout(() => {
                            first = true;
                            // Start the new logger
                            log1 = BASH.launch_log();
                            log1.stdout.on("data", async (data) => {
                                console.log(`read data from log node : ${data}`);
                                if (first) {
                                    // Restart the play of bag file
                                    bag.stdin.write(" ");
                                    first = false;
                                    
                                    setTimeout(async () => {
                                        if (!end) {
                                            let bag_topics = BASH.info_rosbag(pathBag);
                                            let saved_topics = BASH.mongo_shell(62345);
                                            let difference = bag_topics.filter(value => !saved_topics.includes(value.charAt(0) == '/' ? value.slice(1).split("/").join("_") : value.split("/").join("_")));

                                            // If the difference between the two arrays is not empty, then restart: bag reading, logger and mongodb server
                                            // and delete the folder of local instance
                                            if (difference.length != 0) {
                                                console.log('MISSING TOPICS');
                                                console.log(difference);
                                                fs.rmSync(pathFolder, { recursive: true, force: true });

                                                try {
                                                    await process.kill(-bag.pid);
                                                    await process.kill(-log1.pid);
                                                    await process.kill(-mongodb.pid);
                                    
                                                    mongodb.on('exit', (code, signal) => {
                                                        if (code) {
                                                            console.error('mongodb server exited with code', code);
                                                            return;
                                                        } else if (signal) {
                                                            console.error('mongodb server was killed with signal', signal);
                                                            setTimeout(() => {create_local_db(msg, callback)}, 2500);
                                                            return;
                                                        }
                                                        setTimeout(() => {create_local_db(msg, callback)}, 2500);
                                                        return;
                                                    });
                                                } catch (e) {
                                                    console.log(`Error on kill process ${e}`);
                                                }
                                            }
                                        }
                                    }, 6000);
                                }
                            });
                        }, 3000);
                    } catch (e) {
                        console.log(`error on kill process ${e}`);
                    }
                }, 1000);
                first = false;
            }
        });

        bag.on('exit', (code, signal) => {
            if (code) {
                console.error('bag node exited with code', code);
                return;
            } else {
                bag_killed = true;
                console.error('bag node was killed with signal', signal);
                return;
            }
        });
 
        // The bag file is over
        bag.stdout.on('end', async () => {
            end = true;
            if (!bag_killed) {
                console.log(`END READ FILE BAG`);
                // '-' is for kill all subprocess of that process and await is for handle the promise
                try {
                    await process.kill(-log1.pid);
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
                    console.error(`error on connection to mongodb: ${e}`);
                    callback(`error on connection to mongodb: ${e}`);
                }
            }
        });
    }, 1000);
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
        console.error(`error on connection to mongodb: ${e}`);
        callback(`error on connection to mongodb: ${e}`);
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


process.on('SIGINT', async () => {
    if (mongodb) {
        try {
            await process.kill(-mongodb.pid);
            process.exit();
        } catch (e) {
            console.log(`Error on kill process ${e}`);
            process.exit();
        }
    } else 
        process.exit();
});

// CONNECTION

server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);

    create_folder(PATH.join(__dirname, 'bag_file'));

    roscore = BASH.launch_roscore();
});