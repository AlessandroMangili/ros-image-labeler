const fs = require('fs');

// Create folder if it does not exist
const create_folder = async function(path) {
    try {
        fs.mkdirSync(path, {recursive : true});
        return true;
    } catch (error) {
        console.error(`error on create folder at this path : ${path} with this error : ${error}`);
        process.emit('SIGINT');
    }
    return false;
}

// Check if the folder exist and if it's empty
const is_empty_folder = function(path) {
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
const file_list = async function(path) {
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

const remove_folder = function(path) {
    fs.rmSync(path, { recursive: true, force: true });
}

const append_text = function(path, text) {
    fs.appendFileSync(path, text);
}

module.exports = { create_folder, is_empty_folder, file_list, remove_folder, append_text };