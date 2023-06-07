const fs = require('fs'); //needed to read/write json files
const SharedFunctions = require("./util.js");

const profilesPath = './bot/profiles.json';
const configpath = './bot/config.json';
const gptSecretsPath = './bot/gptSecrets.json';

let config;
let profiles = JSON.parse(fs.readFileSync(profilesPath)); //read the profiles file
let gptSecrets; //read the gptSecrets file

module.exports = {
    checkAdminCommand: function (msg, isMaster,INSTANCE, client, date) {
        let command = msg.content.toUpperCase(), found = true;
        config = JSON.parse(fs.readFileSync(configpath)); //read the config file
        gptSecrets = JSON.parse(fs.readFileSync(gptSecretsPath)); //read the gptSecrets file
        let prefix = "!" //allows for changing the prefix
        command = command.split(" ")[0].slice(prefix.length); //extracts the first word without the prefix


        switch (command){
            case "DEV": devCommand(msg, isMaster); break;
            case "MASTER": masterCommand(msg, isMaster); break;
            case "BRANCH": branchCommand(msg, isMaster); break;
            case "SETREP": setRepCommand(msg, isMaster); break;
            case "SETALLREP": setAllRepCommand(msg, isMaster); break;
            case "REP": repCommand(msg, isMaster); break;
            case "KILL": process.exit(); break;
            case "INSTANCE": InstanceCommand(msg, INSTANCE); break;
            case "INSTANCES": InstancesCommand(msg, INSTANCE); break;
            case "MOOD": moodCommand(msg,client); break;
            case "TOGGLE-CHATROOMS": toggleChats(msg,config.chatrooms??false); break;
            case "UPTIME": uptimeCommand(msg, date); break;
            case "CLEARLEADERBOARD": clearLeaderboardCommand(msg); break;
            default: found = false;
        }
        if (found) console.log(`Admin Command runnnig: ${command}`);
        return found;
    }
};

function clearLeaderboardCommand(msg){
    message = stripCommand(msg.content);
    let level = gptSecrets.levels.find(level => level.level == message); //find the level object that matches the message
    console.log("level.level: " + level.level);
    if(level){
        console.log("leaderboard before: " + level.leaderboard);
        level.leaderboard = [];
        console.log("leaderboard cleared: " + level.leaderboard);
        SharedFunctions.syncLeaderboardToFile(true, gptSecrets);
        msg.reply(`Leaderboard for level ${level.level} cleared.`);
    }
}

//this should take the current value from the config and flip it
function toggleChats(msg, currentVal){config.chatrooms = !currentVal; syncConfig(); msg.reply(`chatrooms set to: ${config.chatrooms}`)}
function moodCommand(msg, client){
    let statusMessage = msg.content;
    statusMessage = statusMessage.slice(statusMessage.indexOf(" ")+1);
    console.log(`attempting to change status to ${statusMessage}`);
    if(!(statusMessage) || statusMessage.toUpperCase().includes("!MOOD")) {statusMessage = "You can't spell 'Teams Bot' without 'Stab Me'";}
    // activity = {
    //     name: 'Mood',
    //     type: 4,
    //     details: statusMessage,
    // }
    presence = client.user.setActivity(statusMessage, { type: 0});
    //client.user.setPresence({activities: [activity], status: 'online' });
    //console.log(presence);
    msg.reply(`status set to ${statusMessage}`);
}

// a command to set a users instance, allows for testing of terry by multiple users.
function InstanceCommand(msg,InstanceID){
    let args = msg.content.split(" ");
    args.shift();
    let profile = SharedFunctions.getProfile(msg);
    if(args.length>0){ //if there are arguments
        let instance = args[0]
        if (args.length >= 2) profile = SharedFunctions.getProfileById(args[1]);
        console.log(profile);
        if (isNaN(instance)){
            msg.reply("Invalid instance id, id must be a numebr atm");
            return;
        }
        profile.instanceId = Number(instance);
        SharedFunctions.syncProfilesToFile(true); // should store profile on all active instances 
        InstanceID === profile.instanceId ? msg.reply(`Your Instance has been set to: ${instance}`) : null;
    }
    else if(InstanceID == profile.instanceId) { // if no arguments are given
        let log = `Host instance: ${InstanceID}\nClient instance: ${profile.instanceId}`
        console.log(config);
        console.log(log);
        msg.reply(log);
    }
}

function InstancesCommand(msg, InstanceID){
    let profile = SharedFunctions.getProfile(msg);
    let log = `Host instance: ${InstanceID}\nClient instance: ${profile.instanceId}`
    console.log(config);
    console.log(log);
    msg.reply(log);
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
            let profile = SharedFunctions.getProfile(msg);
            if(target == profile.name.toUpperCase()){               //removing case-sensitivity from the username}
                profile.rep = parseInt(repValue);
                SharedFunctions.syncProfilesToFile(isMaster);
                console.log("set user "  +  target + "'s rep to " + repValue);
            }
        }
    }
}

function setAllRepCommand(msg, isMaster) {
    if(isAuthorized(isMaster)){
        let profile = SharedFunctions.getProfile(msg);
        let message = stripCommand(msg.content);      //slicing out the "!setallrep " from the command
        if (!isNaN(message)) {                    //wanna make sure the remaining portion is a number to set rep to
            profile.rep = parseInt(message);      //parsing to int because it was behaving as a string
    
            SharedFunctions.syncProfilesToFile(isMaster);                   //save changes to file
            console.log("set all users rep to " + message + " !");
        }
    }
}

function uptimeCommand(msg, startDate){
    const currentDate = new Date();
    const strUptime = formatDateDiff(startDate, currentDate);
    msg.reply("Uptime: " + strUptime);
}

function formatDateDiff(date1, date2) {
    const milliseconds = Math.abs(date2 - date1);
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

    let formatted = '';
    if (days > 0) formatted += `${days}d, `;
    if (hours > 0) formatted += `${hours}h, `;
    if (minutes > 0) formatted += `${minutes}m, `;
    formatted += `${seconds}s`;

    return formatted;
}

//function to return the rep of the user
function repCommand(msg, isMaster) {
    if(isAuthorized(isMaster)){
        let profile = SharedFunctions.getProfile(msg);
        msg.reply("Your rep is: " + profile.rep);
    }
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


function syncConfig(){
    fs.writeFileSync(configpath, JSON.stringify(config, null, "\t"), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to " + configpath); //successful response
        }
    });
}