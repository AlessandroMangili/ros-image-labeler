const cv = require('opencv4nodejs');

const create_image_buffer = (image) => {
    try {
        var matrix;
        if (image.encoding == 'rgb8') { // Encoding from BGR to RGB
            let matFromArray = new cv.Mat(Buffer.from(image.data.buffer), image.height, image.width, cv.CV_8UC3);
            let [matB, matG, matR] = matFromArray.splitChannels();
            matrix = new cv.Mat([matR, matG, matB]);
        } else {
            let matFromArray = new cv.Mat(Buffer.from(image.data.buffer), image.height, image.width, cv.CV_8UC4);
            let [matB, matG, matR, matX] = matFromArray.splitChannels();
            matrix = new cv.Mat([matX]);
        }
        return cv.imencode('.png', matrix).toString('base64');
    } catch (error) {
        console.error(`error on creating image buffer: ${error}`);
        return `error on creating image buffer: ${error}`;
    }
};

const save_image = (path, image) => {
    try {
        var matrix;
        if (image.encoding == 'rgb8') { // Encoding from BGR to RGB
            let matFromArray = new cv.Mat(Buffer.from(image.data.buffer), image.height, image.width, cv.CV_8UC3);
            let [matB, matG, matR] = matFromArray.splitChannels();
            matrix = new cv.Mat([matR, matG, matB]);
        } else {
            let matFromArray = new cv.Mat(Buffer.from(image.data.buffer), image.height, image.width, cv.CV_32FC1);
            matrix = new cv.Mat([matFromArray, matFromArray, matFromArray]);
        }
        cv.imwrite(path, matrix);
    } catch (error) {
        console.error(`error on saving image: ${error}`);
        return `error on saving image: ${error}`;
    }
}

const buffer_bounding_image = (image, bounding) => {
    try {
        if (bounding.length == 0)
            return '';
        let boundingBoxes = bounding_to_rect(bounding);
        var matrix;
        if (image.encoding == 'rgb8') { // Encoding from BGR to RGB
            let matFromArray = new cv.Mat(Buffer.from(image.data.buffer), image.height, image.width, cv.CV_8UC3);
            let [matB, matG, matR] = matFromArray.splitChannels();
            matrix = new cv.Mat([matR, matG, matB]);
        } else {
            let matFromArray = new cv.Mat(Buffer.from(image.data.buffer), image.height, image.width, cv.CV_8UC4);
            let [matB, matG, matR, matX] = matFromArray.splitChannels();
            matrix = new cv.Mat([matX]);
        }
        let color = hex_to_vec3(bounding[0].rect.attrs.stroke);
        boundingBoxes.forEach(rect => {
            matrix.drawRectangle(rect, color, 2);
        });
        return cv.imencode('.png', matrix).toString('base64');
    } catch (error) {
        console.error(`error in drawing rectangles on image: ${error}`);
        return `error in drawing rectangles on image: ${error}`;
    }
}

function bounding_to_rect(bounding) {
    let rect = [];
    bounding.forEach(el => {
        rect.push(new cv.Rect(el.rect.attrs.x, el.rect.attrs.y, el.rect.attrs.width, el.rect.attrs.height));
    });
    return rect;
}

function hex_to_vec3(color) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return new cv.Vec3(b, g, r);
}

module.exports = { buffer: create_image_buffer, save_image: save_image, buffer_bounding_image: buffer_bounding_image }