const fs = require('fs'); //needed to read/write json files
let config;
let profiles = JSON.parse(fs.readFileSync('./profiles.json')); //read the profiles file

module.exports = {
    checkAdminCommand: function (msg, isMaster) {
        let command = msg.content.toUpperCase(), found = true;
        config = JSON.parse(fs.readFileSync('./config.json')); //read the config file
        let prefix = "!" //allows for changing the prefix
        command = command.split(" ")[0].slice(prefix.length); //extracts the first word without the prefeix


        switch (command){
            case "DEV": devCommand(msg, isMaster); break;
            case "MASTER": masterCommand(msg, isMaster); break;
            case "BRANCH": branchCommand(msg, isMaster); break;
            case "SETREP": setRepCommand(msg, isMaster); break;
            case "SETALLREP": setAllRepCommand(msg, isMaster); break;
            case "REP": repCommand(msg, isMaster); break;
            case "KILL": process.exit(); break;
            case "INSTANCE": InstanceCommand(msg, config); break;
            default: found = false;
        }
        if (found) console.log(`Admin Command runnnig: ${command}`);
        return found;
    }
};
// a command to set a users instance, allows for testing of terry by multiple users.
function InstanceCommand(msg,configIN){
    let args = msg.content.split(" ");
    args.shift();
    let profile = getProfile(msg);
    if(args.length>0){
        let instance = args[0]
        if (args.length >= 2) profile = getProfileById(args[1]);
        console.log(profile);
        if (isNaN(instance)){
            msg.reply("Invalid instance id, id must be a numebr atm");
            return;
        }
        profile.instanceId = Number(instance);
        syncProfilesToFile(true); // should store profile on all active instances 
        msg.reply(`Your Instance has been set to: ${instance}`);
        console.log(`setting profile: ${profile.name} id: ${profile.id} to instance: ${instance}`)

    }
    else {
        let log = `Host instance: ${config.instanceId}\nClient instance: ${profile.instanceId}`
        console.log(config);
        console.log(log);
        msg.reply(log);
    }
}

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
    // for(let profile of profiles["users"]){
    //     console.log(`checking profile: ${profile.name} id: ${profile.id} against: ${msg.author.id}`);
    //     if(profile.id == msg.author.id) {return profile;}
    // }
    // return null;
    for(let i = 0; i < profiles["users"].length; i++){
        let profile = profiles["users"][i];
        if(profile.id == msg.author.id){
            console.log("returning profile: " + profile);
            return profile;
        }
    }
    console.log("returning null");
    return null;
}
function getProfileById(id){
    // for(let profile of profiles["users"]){
    //     if(profile.id == id) {return profile;}
    // }
    // return null;
    for(let i = 0; i < profiles["users"].length; i++){
        let profile = profiles["users"][i];

        if(profile.id == id){
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