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

    save_bounding_image : function(base64, bounding_box) {
        if (bounding_box == undefined || Object.keys(bounding_box).length == 0)
            return;

        let buffer = Buffer.from(base64, 'base64');
        let matrix = cv.imdecode(buffer);
        bounding_box.forEach(obj => {
            matrix.drawRectangle(obj.rect, obj.color, obj.bounding_box.attrs.strokeWidth);
        });
        cv.imwrite(`./face-dect${index++}.png`, matrix);
    },

    hex_to_rgb : function(value) {
        if (value == null)
            return new cv.Vec3(0, 0, 0);
        let hex_color = value.replace('#', '');
        return new cv.Vec3(parseInt(hex_color.substring(4, 6), 16), parseInt(hex_color.substring(2, 4), 16), parseInt(hex_color.substring(0, 2), 16));
    }
}