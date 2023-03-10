const express = require('express');
const fs = require('fs');
const util = require('util');
const jpeg = require('jpeg-js');
const { open } = require('rosbag');

const server = express();

const port = process.env.PORT || 8000;

server.get('/', (req, res) => {
    res.sendFile(__dirname + "/routes/index.html");
});

async function logMessagesFromFooBar() {
    // open a new bag at a given file location:
    const bag = await open(__dirname + '/public/bagFile/ros-1.bag');

    var tp = [];    // All topics in the bag file
    var enc = [];   // All encoding in the bag file
    var i = 0;

    //console.log(util.inspect(bag, {depth: 2, colors: true, compact: true}));

    // se è vuoto, di default, legge tutti i topics
    await bag.readMessages({topics: ['camera_down/rgb/image_raw']}, (result) => {

            console.log("Campo message: " + util.inspect(result, {depth: 5, colors: true, compact: true}));
            
            if (result.message.data != undefined && result.message.encoding != undefined) {
                var rawImageData = {
                    data: result.message.data,
                    width: 240, //no result.message.width
                    height: result.message.height
                };
                var jpegImageData = jpeg.encode(rawImageData, 50);

                fs.writeFileSync(__dirname + `/public/bagFile/images/bag1_img-${i++}.png`, jpegImageData.data);
            }
            
            if(!tp.includes(result.topic)) 
                tp.push(result.topic);
            if (!enc.includes(result.message.encoding))
                enc.push(result.message.encoding);
    });
    console.log(tp);
    console.log(enc);
}

server.get("/bag", (req, res) => {
    logMessagesFromFooBar();
    res.send("Succesfull");

    /*const rest = Buffer.from(fs.readFileSync(__dirname + '/public/bagFile/images/test.png'));
    console.log('typeof rest = ' + typeof rest + '\r\n\r\n', rest);
    const b64 = rest.toString('base64');
    const mimeType = 'image/png';
    fs.writeFileSync(__dirname + `/public/bagFile/images/bag1_img-1.png`, b64, "base64");
    res.send(`<img src="data:${mimeType};base64,${b64}" />`);*/
});
  
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});