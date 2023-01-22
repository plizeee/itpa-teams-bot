const fs = require('fs'); //needed to read/write json files
const config = JSON.parse(fs.readFileSync('./config.json')); //read the config file

module.exports = {
    checkAdminCommand: function (msg) {
        let command = msg.content.toUpperCase(), found = false;

        if(command.startsWith("!DEV")){
            found = true;
            devCommand(msg);
        }
        else if(command.startsWith("!MASTER")) {
            found = true;
            masterCommand(msg);
        }
        return found;
    }
};

function devCommand(){
    config.devMode = true;
    console.log("Dev Mode Enabled.");
    syncConfig();
}

function masterCommand(){
    config.devMode = false;
    console.log("Dev Mode Disabled.");
    syncConfig();
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