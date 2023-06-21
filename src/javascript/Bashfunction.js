const subProcess = require('child_process');

// BASH COMMAND

module.exports = {
    // Function for start the roscore command
    launch_roscore : function() {
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
    },

    // Function for start the mongodb_store.launch command
    launch_mongodb : function(path, port) {
        let mongodb = subProcess.spawn(
            `HOSTNAME=localhost roslaunch mongodb_store mongodb_store.launch db_path:=${path} db_port:=${port}`,
            {shell : true, detached : true}
        );

        mongodb.stdout.on('data', (data) => {
            console.log(`read data from mongodb : ${data}`);
        });

        mongodb.stdout.on('error', (data) => {
            console.log(`error from mongodb server : ${data}`);
        });

        console.log('SERVER MONGODB START');

        return mongodb;
    },
    
    // Function for start the mongodb_log command
    launch_log : function() {
        let log = subProcess.spawn(
            `rosrun mongodb_log mongodb_log.py -a`,
            {shell : true, detached : true}
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
    },
    
    // Function for start the rosbag play command
    launch_rosbag_play : function(path) {
        let bag = subProcess.spawn(
            `rosbag play ${path}.bag`, 
            {shell : true, detached : true}
        );

        bag.stdout.on('error', (data) => {
            console.log(`error from file bag : ${data}`);
        });

        bag.stdout.on('data', (data) => {
            console.log(`read data from file bag : ${data}`);
        });

        return bag;
    },

    info_rosbag : function(path) {
        let info = subProcess.spawnSync(
            `rosbag info ${path}.bag`,
            {shell : true}
        );

        let result = info.output.toString();
        let string = result.slice(result.search("topics"), result.length - 2);

        let topics = [];

        string.split('\n').slice(2).forEach(topic => {
            let split = topic.trim().split(' ')[0];
            if (split.indexOf("image_raw") >= 0)
                topics.push(split);
        });

        return topics;
    },

    mongo_shell: function(port) {
        let mongo = subProcess.spawnSync(
            `mongo mongodb://localhost:${port}/roslog`,
            {shell : true, input : 'db.getCollectionNames();'}
        );
        
        let result = mongo.output.toString();
        // result.length - 7 for removing the last character that are: ]\nbye\n,
        let string = result.slice(result.search("MongoDB server"), result.length - 8);

        let topics = [];
        
        string.split('\n').slice(2).forEach(collection => {
            let split = collection.trim().replace(/",/, '').replace(/"/, '');
            split = split.replace(/"/, '');
            if (split.indexOf("image_raw") >= 0)
                topics.push(split);
        });

        return topics;
    }
}