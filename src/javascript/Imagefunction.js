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

    /*
    hex_to_rgb : function(value) {
        if (value == null)
            return new cv.Vec3(0, 0, 0);
        let hex_color = value.replace('#', '');
        return new cv.Vec3(parseInt(hex_color.substring(4, 6), 16), parseInt(hex_color.substring(2, 4), 16), parseInt(hex_color.substring(0, 2), 16));
    }
    */
}