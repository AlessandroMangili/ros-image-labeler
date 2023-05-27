const cv = require('opencv4nodejs');

let index = 0;

module.exports = {
    create_image_buffer : function(result) {
        if (result == null) 
           return;

        var matrix;
        try {
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
        } catch (e) {
            throw new Error(e);
        }
    },
}