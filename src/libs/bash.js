const subProcess = require('child_process');
const config = require('../config/config');
const prompt = require('prompt-sync')();

// Function for start the roscore command
const roscore = () => {
    let roscore = subProcess.spawn(
        'roscore'
    );

    roscore.on('exit', (code, signal) => {
        if (code) {
            console.error('roscore exited with code', code);
        } else if (signal) {
            console.error('roscore was killed with signal', signal);
            return;
        }
        
        if (code == 0)
            return;

        console.log('be sure to have closed all roscore process, it will be restart in a few seconds');

        setTimeout(() => {
            this.launch_roscore();
        }, 5000);
    });

    return roscore;
};

// Function for start the mongodb_store.launch command
const mongodb = (path, port) => {
    let mongodb = subProcess.spawn(
        `HOSTNAME=${config.MONGO_USER} roslaunch mongodb_store mongodb_store.launch db_path:=${path} db_port:=${port}`,
        {shell: true, detached: true}
    );

    mongodb.stdout.on('data', (data) => {
        console.log(`read data from mongodb : ${data}`);
    });

    mongodb.stdout.on('error', (data) => {
        console.log(`error from mongodb server : ${data}`);
    });

    console.log('SERVER MONGODB START');

    return mongodb;
};

// Function for start the mongodb_log command
const logger = () => {
    let log = subProcess.spawn(
        `rosrun mongodb_log mongodb_log.py -a`,
        {shell: true, detached: true}
    );

    log.on('exit', (code, signal) => {
        if (code) {
            console.error('log node exited with code', code);
            return;
        } else {
            console.error('log node was killed with signal', signal);
            return;
        }
    });

    log.stdout.on('error', (data) => {
        console.log(`error from log node : ${data}`);
    });

    console.log('NODE LOG START');
    return log;
};

// Function for start the rosbag play command
const rosbag = (path) => {
    let bag = subProcess.spawn(
        `rosbag play ${path}.bag`, 
        {shell: true, detached: true}
    );

    bag.stdout.on('error', (data) => {
        console.log(`error from file bag : ${data}`);
    });

    bag.stdout.on('data', (data) => {
        console.log(`read data from file bag : ${data}`);
    });

    return bag;
};

const info_rosbag = (path) => {
    let info = subProcess.spawnSync(
        `rosbag info ${path}.bag`,
        {shell: true}
    );

    let result = info.output.toString();
    let string = result.slice(result.search("topics"), result.length - 2);

    let topics = [];

    string.split('\n').slice(1).forEach(topic => {            
        let split = topic.trim().split(' ');
        let data = split[split.length - 1];

        if (data.indexOf('sensor_msgs/Image') >= 0)
            topics.push(split[0]);
    });

    return topics;
};

const mongo_shell = () => {
    let mongo = subProcess.spawnSync(
        `mongo ${config.MONGO_URL}`,
        {shell: true, input: 'db.getCollectionNames();'}
    );
    
    let result = mongo.output.toString();
    // result.length - 8 for removing the last character that are: ]\nbye\n,
    let string = result.slice(result.search("MongoDB server"), result.length - 8);

    let topics = [];
    
    string.split('\n').slice(2).forEach(collection => {
        let split = collection.trim().replace(/",/, '').replace(/"/, '');
        split = split.replace(/"/, '');
        topics.push(split);
    });

    return topics;
};

const stop_mongo_process = () => {
    let stop;
    do {
        let command = subProcess.spawnSync(
            'ps aux | grep mongodb',
            {shell: true}
        );
    
        let ps = command.output.toString().split('\n').map(item => {return item.split(' ')[0]});
        if (ps.includes(',mongodb')) {
            const password = prompt.hide('Enter the root password for stop mongoDB service: ');
    
            stop = subProcess.spawnSync(
                `echo ${password} | sudo -S systemctl stop mongodb`,
                {shell: true}
            );
        } else
            break;
    } while(stop.output.toString().indexOf('incorrect password attempt') >= 0);
    console.info('DONE');
}

module.exports = { roscore, mongodb, logger, rosbag, info_rosbag, mongo_shell, stop_mongo_process }