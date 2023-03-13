const express = require('express');
const fs = require('fs');
const util = require('util');
const { open } = require('rosbag');
const jpeg = require('jpeg-js');

const server = express();
const port = process.env.PORT || 8000;

// ROUTES

server.get('/', (req, res) => {
    res.sendFile(__dirname + "/routes/index.html");
});

server.get("/bag", (req, res) => {
    logMessagesFromFooBar("ros-1").then((data) => {
        res.send("Succesfull");
    })
    .catch((error) => {
        res.send(error);
    })
});

// CONNECTION
  
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});

// FUNCTIONS

async function logMessagesFromFooBar(bagFile) {
    const bag = await open(__dirname + `/public/bagFile/${bagFile}.bag`)

    var topics = [];    // All topics in the bag file
    var encodings = [];   // All encoding in the bag file
    var percentage = 0;

    //console.log(util.inspect(bag, {depth: 5, colors: true, compact: true}));

    // Save all the topics in the bag file
    for (var i = 0; i < bag.header.connectionCount; i++)
        if (!topics.includes(bag.connections[i].topic))
            topics.push(bag.connections[i].topic);
    

    // Check if the bag folder to keep all images already exist
    fs.access(__dirname + `/public/bagFile/${bagFile}`, fs.constants.F_OK, (access_error) => {
        if (access_error) {
            fs.mkdir(__dirname + `/public/bagFile/${bagFile}`, (create_error) => {
                if (create_error) {
                    console.info(`Error on create folder ${bagFile} with the following error`);
                    console.error(create_error);
                } else {
                    console.info(`Folder ${bagFile} created`);
                }
            });
        } else {
            console.info(`Folder ${bagFile} already exist`);
        }
    });

    // if empty, by default it reads all topics
    await bag.readMessages({}, (result) => {
            
            //console.log("Campo message: " + util.inspect(result, {depth: 5, colors: true, compact: true}));

            // calculate the percentage of progress
            var total = parseInt(result.chunkOffset / result.totalChunks * 100);
            if (total > percentage) {
                percentage = total;
                console.log(percentage + "%");
            }
            
            if (result.message.data != undefined && result.message.encoding != undefined) {

                var formatted_topic = result.topic.split('/').join('_');
                
                // Check if for each topics there is already a folder where you can save the foto
                try {
                    fs.accessSync(__dirname + `/public/bagFile/${bagFile}/${formatted_topic}`, fs.constants.F_OK);
                } catch (access_error) {
                    fs.mkdir(__dirname + `/public/bagFile/${bagFile}/${formatted_topic}`, (create_error) => {
                        if (create_error) {
                            console.info(`Error on create folder ${formatted_topic} with the following error`)
                            console.error(create_error);
                        }
                    });
                }
                
                // Check if the image already exist, do not overwrite and skip the encode to prevent time
                try {
                    fs.accessSync(__dirname + `/public/bagFile/${bagFile}/${formatted_topic}/img-${result.message.header.seq}.png`, fs.constants.F_OK);
                } catch (access_error) {
                    var rawImageData = {
                        data: result.message.data,
                        width: result.message.encoding == "32FC1" ? result.message.width : 240, //doesn't works with result.message.width for rgb images
                        height: result.message.height
                    };
                    var jpegImageData = jpeg.encode(rawImageData, 0);
    
                    try {
                        fs.writeFileSync(__dirname + `/public/bagFile/${bagFile}/${formatted_topic}/img-${result.message.header.seq}.png`, jpegImageData.data);
                    } catch(error) {
                        console.info(`Error on create image ${formatted_topic}/img-${result.message.header.seq}.png with the following error`);
                        console.error(error);
                    }
                }
            }
            
            // Save all the image encoding 
            if (!encodings.includes(result.message.encoding))
                encodings.push(result.message.encoding);
    });
    console.log(topics);
    console.log(encodings);
}