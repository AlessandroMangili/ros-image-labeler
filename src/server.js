const app = require('./app');
const path = require('path');
const image = require(path.join(__dirname, 'libs', 'image'));
const mongo = require(path.join(__dirname, 'libs','database'));
const bash = require(path.join(__dirname, 'libs', 'bash'));
const file = require(path.join(__dirname, 'libs', 'filesystem'));
const config = require(path.join(__dirname, 'config', 'config'));
const connection = require(path.join(__dirname, 'models', 'connection'));

var mongodb; // contains process of command mongodb_store.launch
var port = config.SERVER_PORT;
const authorized = [];
authorized[0] = false;
app.set('authorized', authorized); // routes can retrieve the mongodb object with req.app.get('authorized')

const server = app.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}`);
    
    file.create_folder(path.join(__dirname, 'bag_file'));
    file.create_folder(path.join(__dirname, 'export'));

    bash.roscore();
    bash.stop_mongo_process();
    
});
const io = require('socket.io')(server);
io.on('error', error => {
    console.error(error)
    process.exit(1);
});
io.on('connection', (socket) => {
    // Create a new local instace from the bag file
    socket.on('save_bag', async (msg, callback) => {
        if (!await file.is_empty_folder(path.join(__dirname, 'db', msg))) {
            console.warn('error, there is already a local repository of that file, if you want to save again, delete the folder');
            callback('error, there is already a local repository of that file, if you want to save again, delete the folder');
            return;
        }
    
        // '-' is for kill all subprocess of that process
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
            } catch (error) {
                console.log(`Error on kill process ${error}`);
            }
        } else
            create_local_db(msg, callback);
    });

    // Return all valid topics (image_raw) of the current local instace
    socket.on('get topics', async (_, callback) => {
        try {
            let result = await mongo.get_topics();
            callback(result);
        } catch (error) {
            console.error(`error on retrive topics: ${error}`);
            callback(`error on retrive topics: ${error}`);
        }
    });

    socket.on('get image size', async (msg, callback) => {
        try {
            callback(await mongo.get_image_size(msg));
        } catch (error) {
            console.error(`error on getting image size: ${error}`);
            callback(`error on getting image size: ${error}`);
        }
    });

    socket.on('get labeled topics', async (_, callback) => {
        try {
            let result = await mongo.get_labeled_topics();
            callback(result);
        } catch (error) {
            console.error(`error on retrive labeled topics: ${error}`);
            callback(`error on retrive labeled topics: ${error}`);
        }
    });

    // Send the first sequence number of that topic
    socket.on('get all sequence numbers', async (msg, callback) => {
        try {
            let result = await mongo.get_sequence_numbers(msg.topic, msg.fps);
            callback(result);
        } catch (error) {
            console.error(`error on retrive images: ${error}`);
            callback(`error on retrive images: ${error}`);
        }
    });

    socket.on('load last image sequence', async (msg, callback) => {
        try {
            let document = await mongo.get_info(msg.topic);
            callback(document == null ? -1 : document.seq);
        } catch (error) {
            console.error(`error on retrive information about last image sequence of topic: ${msg.topic} with the following error: ${error}`);
            callback(`error on retrive information about last image sequence of topic: ${msg.topic} with the following error: ${error}`);
        }
    });

    // Send the buffer that encode image
    socket.on('get image', async (msg, callback) => {
        try {
            await mongo.update_info(msg.topic, msg.seq);
            let result = await mongo.get_image(msg.topic, msg.seq);
            if (result == null)
                callback(`image with sequence number ${seq}, not found`);
            result = image.buffer(result);
            callback(result);
        } catch (error) {
            callback(`error on getting image ${error}`);
        }
    });

    // Send all the local instace of mongodb
    socket.on('get bag files', async (_, callback) => {
        try {
            callback(await file.file_list(path.join(__dirname, 'bag_file')));
        } catch (error) {
            console.error(`error on getting bag files: ${error}`);
            callback(`error on getting bag files: ${error}`);
        }
    });

    // Send all the local instace of mongodb
    socket.on('get db', async (_, callback) => {
        callback(await file.file_list(path.join(__dirname, 'db')));
    });

    // Connect the mongodb client to its local instace
    socket.on('load db', async (msg, callback) => {
        let folder_path = path.join(__dirname, 'db', msg);

        if (await file.is_empty_folder(folder_path)) {
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
                        setTimeout(() => {connect_db(folder_path, callback)}, 2500);
                        return;
                    }
                    setTimeout(() => {connect_db(folder_path, callback)}, 2500);
                    return;
                });
            } catch (error) {
                console.log(`Error on kill process ${error}`);
            }
        } else
            connect_db(folder_path, callback);
    });

    // Export the db into json files
    socket.on('export db', async (collections, callback) => {
        try {
            // For getting the name of dataset
            let path_split = mongodb.spawnargs[2].split(' ')[4].split('/');
            callback(await mongo.export(collections, path_split[path_split.length - 1]));
        } catch (error) {
            callback(String(error));
        }
    });

    // HANDLE BOUNDING BOX

    // Add new class
    socket.on('add class', async (msg, callback) => {
        try {
            
            callback(await mongo.add_class(msg.name, msg.color));
        } catch (error) {
            console.error(`error on saving ${msg.name} class: ${error}`);
            callback(`error on saving ${msg.name} class: ${error}`);
        }
    });

    // Add new sub-class
    socket.on('add sub_class', async (msg, callback) => {
        try {
            await mongo.add_sub_class(msg.name, msg.sub_name);
            callback(`subclass ${msg.sub_name} of class ${msg.name} saved`);
        } catch (error) {
            console.error(`error on adding sub class ${msg.sub_name} to ${msg.name} class: ${error}`);
            callback(`error on adding sub class ${msg.sub_name} to ${msg.name} class: ${error}`);
        }
    });

    // Create a document with an empty bounding box array for that topic and image
    socket.on('add labeled image', async (msg, callback) => {
        try {
            await mongo.add_labeled_image(msg.topic, msg.image);
            callback('added labeled image');
        } catch (error) {
            console.error(`error on adding labeled image: ${error}`);
            callback(`error on adding labeled image: ${error}`);
        }
    });

    // Add a specific bounding box
    socket.on('add bounding_box', async (msg, callback) => {   
        try {
            await mongo.add_bounding_box(msg.topic, msg.image, msg.bounding_box, msg.id, msg.class_id);
            callback('bounding box added');
        } catch (error) {
            console.error(`error on adding bounding box: ${error}`);
            callback(`error on adding bounding box: ${error}`);
        }
    });

    // Send all classes
    socket.on('get classes', async (msg, callback) => {
        try {
            callback(await mongo.get_classes());
        } catch (error) {
            console.error(`error on getting classes from db: ${error}`);
            callback(`error on getting classes from db: ${error}`);
        }
    });

    // Send all sub-classes releated to that class
    socket.on('get sub_classes', async (msg, callback) => {
        try {
            callback(await mongo.get_sub_classes(msg));
        } catch (error) {
            console.error(`error on getting sub classes of class ${msg} from db: ${error}`);
            callback(`error on getting sub classes of class ${msg} from db: ${error}`);
        }
    });

    socket.on('get only bounding_box', async (msg, callback) => {
        try {
            callback(await mongo.get_bounding_boxes(msg.topic, msg.image));
        } catch (error) {
            console.error(`error on getting bounding box of topic ${msg.topic} from db: ${error}`);
            callback(`error on getting bounding box of topic ${msg.topic} from db: ${error}`);
        }
    });

    // Send all bounding box releted to that image
    socket.on('get bounding_box', async (msg, callback) => {
        try {
            callback(await mongo.get_bounding_boxes(msg.topic, msg.image));
        } catch (error) {
            console.error(`error on getting bounding box of topic ${msg.topic} from db: ${error}`);
            callback(`error on getting bounding box of topic ${msg.topic} from db: ${error}`);
        }
    });

    socket.on('get last bounding box', async (msg, callback) => {
        try {
            let result = await mongo.get_last_bounding_box_of_class(msg);
            callback(result)
        } catch (error) {
            callback(String(error));
        }
    });

    // Remove the class and all its bounding box
    socket.on('remove class', async (msg, callback) => {
        try {
            await mongo.remove_class(msg);
            callback('class removed successfully');
        } catch (error) {
            console.error(`error on removing class ${msg} from db: ${error}`);
            callback(`error on removing class ${msg} from db: ${error}`);
        }
    });

    // Remove sub-class
    socket.on('remove sub_class', async (msg, callback) => {
        try {
            await mongo.remove_sub_class(msg.name, msg.sub_name);
            callback('sub class removed successfully');
        } catch (error) {
            console.error(`error on removing sub class ${msg.sub_name} of class ${msg.name} from db: ${error}`);
            callback(`error on removing sub class ${msg.sub_name} of class ${msg.name} from db: ${error}`);
        }
    });

    // Remove a specific bounding box
    socket.on('remove bounding_box', async (msg, callback) => {
        try {
            await mongo.remove_bounding_box(msg.topic, msg.image, msg.id);
            callback('bounding box removed successfully');
        } catch (error) {
            console.error(`error on removing bounding box of ${msg.topic} from db: ${error}`);
            callback(`error on removing bounding box of ${msg.topic} from db: ${error}`);
        }
    });

    socket.on('update class name', async (msg, callback) => {
        try {
            await mongo.update_class_name(msg.id, msg.name);
            callback('updated class name');
        } catch (error) {
            console.error(error);
            callback(`error: ${error}`);
        }
    });

    // Update last labeled image of that class and return the buffer
    socket.on('update class info', async (msg, callback) => {
        try {
            let id = await mongo.get_class_id(msg.class);
            await mongo.update_class_with_last_labeled_image(msg.topic, msg.image, msg.class);
            let result = await mongo.get_image(msg.topic, msg.image);
            if (result == null) {
                callback(' ');
                return;
            }
            let bounding = await mongo.get_bounding_boxes(msg.topic, msg.image);
            bounding = bounding.map(el => { if(el.id_class === id) return el; }).filter(item => item != undefined);
            callback(image.buffer_bounding_image(result, bounding));
        } catch (error) {
            console.error(`error on updating class info of ${msg.class} from db: ${error}`);
            callback(`error on updating class info of ${msg.class} from db: ${error}`);
        }
    })

    // Update a specific bounding box on drag or resize
    socket.on('update bounding_box', async (msg, callback) => {
        try {
            await mongo.update_bounding_box(msg.topic, msg.image, msg.old_rect, msg.new_rect);
            callback('bounding box update successfully');
        } catch (error) {
            console.error(`error on updating bounding box of ${msg.topic} from db: ${error}`);
            callback(`error on updating bounding box of ${msg.topic} from db: ${error}`);
        }
    });
});

function create_local_db(msg, callback) {
    authorized[0] = false;
    let path_folder = path.join(__dirname, 'db', msg);
    file.create_folder(path_folder);
    mongodb = bash.mongodb(path_folder, config.MONGO_PORT);

    // The timeout is to wait for the mongodb server to start
    setTimeout(() => {
        let path_bag = path.join(__dirname, 'bag_file', msg);

        let log = bash.logger();
        let bag = bash.rosbag(path_bag);
        let bag_killed = false; // Check if bag command has been killed or just ended
        let first = true, end = false;

        log.stdout.on("data", (data) => {
            console.log(`read data from log node : ${data}`);
            // When the log node add succesfully the topics, then we can starts
            if (first) {  
                setTimeout(async () => {
                    if (!end) {
                        let bag_topics = bash.info_rosbag(path_bag);
                        let saved_topics = bash.mongo_shell();
                        let difference = bag_topics.filter(value => !saved_topics.includes(value.charAt(0) == '/' ? value.slice(1).split("/").join("_") : value.split("/").join("_")));

                        /* 
                            If the difference between the two arrays is not empty, then restart: rosbag, logger and mongodb server
                            and delete the folder of local instance
                        */
                        if (difference.length != 0) {
                            console.log('MISSING TOPICS');
                            console.log(difference);
                            file.remove_folder(path_folder);

                            try {
                                await process.kill(-bag.pid);
                                await process.kill(-log.pid);
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
                            } catch (error) {
                                console.log(`Error on kill process ${error}`);
                            }
                        }
                    }
                }, 6000);
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
 
        bag.stdout.on('end', async () => {
            end = true;
            if (!bag_killed) {
                console.log(`END READ FILE BAG`);
                // '-' is for kill all subprocess of that process
                try {
                    await process.kill(-log.pid);
                } catch (error) {
                    console.log(`error on kill process ${error}`);
                }
                authorized[0] = true;
                callback(await connection.connectToDatabase());
            }
        });
    }, 1000);
}

// Connect to local instace, start mongodb server
async function connect_db(path, callback) {
    mongodb = bash.mongodb(path, config.MONGO_PORT);
    authorized[0] = true;
    callback(await connection.connectToDatabase());
}

process.on('SIGINT', async () => {
    if (mongodb) {
        try {
            await process.kill(-mongodb.pid);
            process.exit();
        } catch (error) {
            console.log(`Error on kill mongodb process ${error}`);
            process.exit(1);
        }
    } else
        process.exit();
});