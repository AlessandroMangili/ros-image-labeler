const cv = require('opencv4nodejs');

const create_image_buffer = (result) => {
    try {
        var matrix;
        if (result.encoding == 'rgb8') { // Encoding from BGR to RGB
            let matFromArray = new cv.Mat(Buffer.from(result.data.buffer), result.height, result.width, cv.CV_8UC3);
            let [matB, matG, matR] = matFromArray.splitChannels();
            matrix = new cv.Mat([matR, matG, matB]);
        } else {
            let matFromArray = new cv.Mat(Buffer.from(result.data.buffer), result.height, result.width, cv.CV_8UC4);
            let [matB, matG, matR, matX] = matFromArray.splitChannels();
            matrix = new cv.Mat([matX]);
        }
        return cv.imencode('.png', matrix).toString('base64');
    } catch (error) {
        console.error(`error on creating image buffer: ${error}`);
        return `error on creating image buffer: ${error}`;
    }
};

module.exports = { buffer : create_image_buffer }