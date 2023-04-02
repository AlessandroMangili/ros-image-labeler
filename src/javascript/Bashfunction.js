const subProcess = require('child_process');

// BASH COMMAND
module.exports = {

    launch_roscore : function() {
        let roscore = subProcess.spawn(
            "roscore"
        );

        roscore.on('message', (data) => {
            console.log(`data : ${data}`);
        });
    
        roscore.on('exit', (code, signal) => {
            if (code) {
                console.error('roscore exited with code', code);
                return;
            } else if (signal) {
                console.error('roscore was killed with signal', signal);
                return;
            }
    
            console.log('be sure to have closed all roscore process, it will be restart in a few seconds');
    
            setTimeout(() => {
                BASH.launch_roscore();
            }, 5000);
        });

       return roscore;
    },

    launch_mongodb : function(path, port) {
        let mongodb = subProcess.spawn(
            `HOSTNAME=localhost roslaunch mongodb_store mongodb_store.launch db_path:=${path} db_port:=${port}`,
            {shell : true}
        );

        mongodb.stdout.on("data", (data) => {
            console.log(`read data from mongodb : ${data}`);
        });

        mongodb.stdout.on("error", (data) => {
            console.log(`error from mongodb server : ${data}`);
        });

        mongodb.on('exit', (code, signal) => {
            if (code) {
                console.error('mongodb server exited with code', code);
                return;
            } else if (signal) {
                console.error('mongodb server was killed with signal', signal);
                return;
            }
            console.log(`mongodb server exit normally`);
        });

        return mongodb;
    },
    
    launch_log : function() {
        let log = subProcess.spawn(
            "rosrun mongodb_log mongodb_log.py -a",
            {shell : true}
        );

        log.on('exit', (code, signal) => {
            if (code) {
                console.error('log node exited with code', code);
                return;
            } else if (signal) {
                console.error('log node was killed with signal', signal);
                return;
            }
            console.log(`log node exit normally`);
        });

        log.stdout.on("data", (data) => {
            console.log(`read data from log node : ${data}`);
        });

        log.stdout.on("error", (data) => {
            console.log(`error from log node : ${data}`);
        });

        return log;
    },
    
    launch_rosbag_play : function(path) {
        console.log(`extract from bag started`);

        let bag = subProcess.spawn(
            `rosbag play ${path}.bag`, 
            {shell : true}
        );

        bag.stdout.on("error", (data) => {
            console.log(`error from file bag : ${data}`);
        });

        bag.stdout.on("data", (data) => {
            console.log(`read data from file bag : ${data}`);
        });

        return bag;
    }
}

/*launch_roscore : function() {
        let connected = true;
        
        let roscore = subProcess.spawn(
            "roscore", 
            {shell : true}
        );
    
        roscore.on('exit', (code, signal) => {
            if (code) {
                console.error('Child exited with code', code);
                return;
            } else if (signal) {
                console.error('Child was killed with signal', signal);
                return;
            }
            console.log('be sure to have closed all roscore process, it will be restart in a few seconds');
    
            setTimeout(() => {
                this.launch_roscore();
            }, 5000);
        })
    
        setTimeout(() => {
            if (connected)
                console.log(`server roscore running : pid ${roscore.pid}`);
        }, 500);
    },
    
    launch_mongodb : function(path, port) {
        let mongodb = subProcess.spawn(
            `HOSTNAME=localhost roslaunch mongodb_store mongodb_store.launch db_path:=${path} db_port:=${port}`,
            {shell : true}
        );
    
        mongodb.on('exit', (code, signal) => {
            mongo_close = true;
            if (code) {
                console.error('Child exited with code', code);
                return;
            } else if (signal) {
                console.error('Child was killed with signal', signal);
                return;
            }
            console.log('be sure to have closed all mongodb_store process, it will be restart in a few seconds');
    
            setTimeout(() => {
                this.launch_mongodb(path, port);
            }, 5000);
        });
    
        mongo_close = false;

        setTimeout(() => {
            if (!mongo_close)
                console.log(`server mongodb running : pid ${mongodb.pid}`);
        }, 500);

        return mongodb;
    },
*/