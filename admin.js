const fs = require('fs'); //needed to read/write json files
const config = JSON.parse(fs.readFileSync('./config.json')); //read the config file

module.exports = {
    checkAdminCommand: function (msg, isMaster) {
        let command = msg.content.toUpperCase(), found = false;

        if(command.startsWith("!DEV")){
            found = true;
            devCommand(msg, isMaster);
        }
        else if(command.startsWith("!MASTER")) {
            found = true;
            masterCommand(msg, isMaster);
        }
        return found;
    }
};

function devCommand(msg, isMaster){
    config.devMode = true;

    if(!isMaster){
        msg.reply("Dev Mode Enabled.");
        console.log("Dev Mode Enabled.");
        syncConfig();
    }
}

function masterCommand(msg, isMaster){
    config.devMode = false;

    if(isMaster){
        msg.reply("Dev Mode Disabled.");
        console.log("Dev Mode Disabled.");
        syncConfig();
    }
}

function syncConfig(){
    fs.writeFileSync('./config.json', JSON.stringify(config, null, "\t"), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to ./config.json"); //successful response
        }
    });
}