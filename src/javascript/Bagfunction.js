const { open } = require('rosbag');
const cv = require('opencv4nodejs');
const fs = require('fs');
const util = require('util');

__dockerVolume = "/app/";

module.exports = {
    extract_from_bagFile : async function (bagFile) {
        var topics = [];    // All topics in the bag file
        var encodings = [];   // All encoding in the bag file
        var percentage = 0;
        var bag;
    
        try {
            bag = await open(__dockerVolume + `/src/bagFile/${bagFile}.bag`);
        } catch (error) {
            console.error(error);
            return;
        }

        // Save all the topics in the bag file
        for (var i = 0; i < bag.header.connectionCount; i++)
            if (!topics.includes(bag.connections[i].topic))
                topics.push(bag.connections[i].topic);
    
        //console.log(util.inspect(bag, {depth: 5, colors: true, compact: true}));
    
        // Check if the bag folder to keep all images already exist
        checkPath(__dockerVolume + `/src/bagFile/${bagFile}`);
    
        try {
            await bag.readMessages({}, (result) => {
    
                //console.log("Campo message: " + util.inspect(result, {depth: 5, colors: true, compact: true}));
        
                // Calculate the percentage of progress
                var total = parseInt(result.chunkOffset / result.totalChunks * 100);
                if (total > percentage) {
                    percentage = total;
                    console.log(percentage + "%");
                }
                
                if (result.message.data != undefined && result.message.encoding != undefined) {
                    var formatted_topic = result.topic.split('/').join('_');
                    
                    // Check if for each topics there is already a folder where you can save the foto
                    checkPath(__dockerVolume + `/src/bagFile/${bagFile}/${formatted_topic}`);
                    
                    // Check if the image already exist, do not overwrite and skip the encode to prevent time
                    try {
                        fs.accessSync(__dockerVolume + `/src/bagFile/${bagFile}/${formatted_topic}/img-${result.message.header.seq}.png`, fs.constants.F_OK);
                    } catch (access_error) {
                        try {
                            // CREATE IMAGE
                            let matrix;
                            // Encoding from BGR to RGB
                            if (result.message.encoding == "rgb8") {
                                let matFromArray = new cv.Mat(Buffer.from(result.message.data), result.message.height, result.message.width, cv.CV_8UC3);
                                let [matB, matG, matR] = matFromArray.splitChannels();
                                matrix = new cv.Mat([matR, matG, matB]);
                            } else {
                                let matFromArray = new cv.Mat(Buffer.from(result.data), result.message.height, result.message.width, cv.CV_8UC4);
                                let [matB, matG, matR, matX] = matFromArray.splitChannels();
                                matrix = new cv.Mat([matX]);
                                //console.log(matrix);
                            }                        
                            cv.imwrite(__dockerVolume + `/src/bagFile/${bagFile}/${formatted_topic}/img-${result.message.header.seq}.png`, matrix);
                        } catch(error) {
                            console.warn(`Error on create image ${formatted_topic}/img-${result.message.header.seq}.png with the following error`);
                            console.error(error);
                        }
                    }
                }
                
                // Save all the image encoding 
                if (!encodings.includes(result.message.encoding))
                    encodings.push(result.message.encoding);
            });
        } catch (bag_error) {
            console.error(bag_error);
        }
    
        console.log(topics);
        console.log(encodings);
    }
}

function checkPath(path) {
    try {
        fs.accessSync(path, fs.constants.F_OK);
    } catch (access_error) {
        fs.mkdir(path, (create_error) => {
            if (create_error) {
                console.warn(`Error on create folder ${path.split("/")[path.lenght - 1]} with the following error`);
                console.error(create_error);
            } else {
                console.info(`Folder ${path.split("/")[path.lenght - 1]} created`);
            }
        });
    }
}

/*
// utility function, creates array of numbers from `start` to `stop`, with given `step`:
const range = (start, stop, step = 1280) =>
Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step)


// uint8 array with 2 floats inside, 1.0 and -1.0
numberOfFloats = result.message.data.byteLength / 4;
dataView = new DataView(result.message.data.buffer);
// sometimes your Uint8Array is part of larger buffer, then you will want to do this instead of line above:
// dataView = new DataView(uint8array.buffer, uint8array.byteOffset, uint8array.byteLength) 

arrayOfNumbers = range(0, numberOfFloats).map(idx => dataView.getFloat32(idx * 4, false));  
// be careful with endianness, you may want to do:
// arrayOfNumbers = range(0, numberOfFloats).map(idx => dataView.getFloat32(idx * 4, true))

float32array = new Float32Array(arrayOfNumbers);
console.log(float32array);

buffer = float32array;
*/