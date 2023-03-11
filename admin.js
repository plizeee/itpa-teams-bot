const fs = require('fs'); //needed to read/write json files
let config;
const profiles = JSON.parse(fs.readFileSync('./profiles.json')); //read the profiles file

module.exports = {
    checkAdminCommand: function (msg, isMaster) {
        let command = msg.content.toUpperCase(), found = false;
        config = JSON.parse(fs.readFileSync('./config.json')); //read the config file

        if(command.startsWith("!DEV")){
            found = true;
            devCommand(msg, isMaster);
        }
        else if(command.startsWith("!MASTER")) {
            found = true;
            masterCommand(msg, isMaster);
        }
        else if(command.startsWith("!BRANCH")){
            found = true;
            branchCommand(msg, isMaster);
        }
        else if(command.startsWith("!SETREP")){
            found = true;
            setRepCommand(msg, isMaster);
        }
        else if(command.startsWith("!SETALLREP")){
            found = true;
            setAllRepCommand(msg, isMaster);
        }
        else if (command.startsWith("!REP")) { //Set a specific user's Rep based on their 
            found = true;
            repCommand(msg, isMaster);
        }
        return found;
    }
};

function stripCommand(message){
    if(message.startsWith("!")){
        message = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    return message;
}

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

function branchCommand(msg, isMaster){
    if(isAuthorized(isMaster)){
        msg.reply("The current branch is " + (config.devMode ? "Dev" : "Master"));
    }
}

function setRepCommand(msg, isMaster){
    if(isAuthorized(isMaster)){
        let message = stripCommand(msg.content);                           //Filters out the "!SETREP " portion of the command
        let target = message.slice(0, message.indexOf(" "));    //Isolates the user's name
        let repValue = message.slice(message.indexOf(" "));     //Isolates the Rep value we want to set

        console.log("message: " + message + " | target: " + target + " | repValue: " + repValue);
        if(!isNaN(repValue)){                                       //making sure the value is actually a number
            let profile = getProfile(msg);
            if(target == profile.name.toUpperCase()){               //removing case-sensitivity from the username}
                profile.rep = parseInt(repValue);
                syncProfilesToFile(isMaster);
                console.log("set user "  +  target + "'s rep to " + repValue);
            }
        }
    }
}

function setAllRepCommand(msg, isMaster) {
    if(isAuthorized(isMaster)){
        let profile = getProfile(msg);
        let message = stripCommand(msg.content);      //slicing out the "!setallrep " from the command
        if (!isNaN(message)) {                    //wanna make sure the remaining portion is a number to set rep to
            profile.rep = parseInt(message);      //parsing to int because it was behaving as a string
    
            syncProfilesToFile(isMaster);                   //save changes to file
            console.log("set all users rep to " + message + " !");
        }
    }
}

//function to return the rep of the user
function repCommand(msg, isMaster) {
    if(isAuthorized(isMaster)){
        let profile = getProfile(msg);
        msg.reply("Your rep is: " + profile.rep);
    }
}

function getProfile(msg){
    for(let i = 0; i < profiles["users"].length; i++){
        let profile = profiles["users"][i];

        if(profile.id == msg.author.id){
            return profile;
        }
    }
    return null;
}

function isAuthorized(isMaster) {
    if (config.devMode) {
        if(!isMaster){
            return true;
        }
    }
    else if(isMaster) { 
        return true; 
    }
    return false;
}

function syncProfilesToFile(isMaster){
    if(isMaster){ //I only want to write to file in master branch
        fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("JSON saved to ./profiles.json"); //successful response
            }
        });
    }
    else{
        console.log("Dev Mode is currently active. Message not stored in file.");
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