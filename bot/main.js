const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs'); //needed to read/write json files

require('dotenv').config();

const token = process.env.TOKEN; //secret token

//current date and time
const date = new Date();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessageReactions
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember,
        Partials.Reaction
    ],
    presence: {
        activities: [{
            //TODO look up a dictionary and randomly generate 1-2 words consisting of the all the letters of 'Teams Bot'
            name: "You can't spell 'Teams Bot' without 'Stab Me'",
            type: 0
        }],
        status: 'online'
    }
});

const profilePath = './bot/profiles.json';
if (!fs.existsSync(profilePath)) { //if the file doesn't exist, create it
    console.log(`The file ${profilePath} does not exist, creating a new one`);
    const defaultValue = {
        "users": []
    };
    fs.writeFileSync(profilePath, JSON.stringify(defaultValue));
}


const configPath = './bot/config.json';
if (!fs.existsSync(configPath)) { //if the file doesn't exist, create it
    console.log(`The file ${configPath} does not exist, creating a new one`);
    const defaultValue = {
        "devMode": false,
        "isMaster": true,
        "admins": [],
        "instanceId": 0, // defualts to 0
        "chatrooms": true
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultValue));
}

const instanceDataPath = './bot/instanceData.json';
if (!fs.existsSync(instanceDataPath)) { //if the file doesn't exist, create it
    console.log(`The file ${instanceDataPath} does not exist, creating a new one`);
    const defaultValue = {
        "instances": []
    };
    fs.writeFileSync(instanceDataPath, JSON.stringify(defaultValue));
}

let config = JSON.parse(fs.readFileSync(configPath)); //read the config file
let profiles = JSON.parse(fs.readFileSync(profilePath))
const isMaster = config.isMaster; //only check this on launch
let devMode = config.devMode; //this will be evaluated every time a message is sent
let admins = config.admins; //this will be evaluated every time a message is sent
if(!Object.hasOwn(config, "instanceId")){ config.instanceId = 0;}// defaults no instanceId to 0 or main instances
let argInstanceID = isNaN(process.argv[2])? null:  Number(process.argv[2]); 
const instanceID = argInstanceID?? config.instanceId; //
let instanceData = JSON.parse(fs.readFileSync(instanceDataPath));

// Handler:
client.prefix_commands = new Collection();
client.slash_commands = new Collection();
client.user_commands = new Collection();
client.message_commands = new Collection();
client.modals = new Collection();
client.events = new Collection();

//importing the files used for the commands
const teamsCommands = require('./teams.js');
const chatCommands = require('./chat.js');
const adminCommands = require('./admin.js');
const secretCommands = require('./gptSecrets.js');
const SharedFunctions = require("./util.js");
const { handle } = require('express/lib/application.js');

//check instanceData for an instance that has the same "instanceID"
if(instanceData.instances.some(instance => instance.instanceID == instanceID)){
    console.log("Instance already running... overwriting instance data");
    instanceData.instances = instanceData.instances.filter(instance => instance.instanceID != instanceID);
    instanceData.instances.push({
        "instanceID": instanceID,
        "date": date.toString(),
        "pid": process.pid
    });

    //sort the instances by instanceID
    instanceData.instances.sort((a, b) => (a.instanceID > b.instanceID) ? 1 : -1);

    //write to file and format it
    fs.writeFileSync(instanceDataPath, JSON.stringify(instanceData, null, "\t"));
}
else{
    console.log("instances: ", instanceData.instances);
    //sort the instances by instanceID
    instanceData.instances.sort((a, b) => (a.instanceID > b.instanceID) ? 1 : -1);
    console.log("instances: ", instanceData.instances);

    instanceData.instances.push({
        "instanceID": instanceID,
        "date": date.toString(),
        "pid": process.pid
    });
    //write to file and format it
    fs.writeFileSync(instanceDataPath, JSON.stringify(instanceData, null, "\t"));
}



process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    SharedFunctions.handleExit(instanceID);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    SharedFunctions.handleExit(instanceID);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT signal. Shutting down gracefully...');
    // Perform any necessary cleanup or shutdown tasks here
    // This could include closing database connections, releasing resources, etc.
    SharedFunctions.handleExit();
});

//ensures that authorized users can use dev mode
//and prevents users from sending messages on both dev and master
function isUserAuthorized(msg) {
    if(devMode && isMaster != isAdmin(msg.author.id)) {
        return true;
    }
    if(!devMode && isMaster) {
        return true;
    }
    return false;
}

function isAdmin(id){
    for(let i = 0; i < admins.length; i++){
        if(id == admins[i]){
            return true;
        }
    }
    return false;
}

//executes this as soon as it starts
client.on('ready', () => {
    console.log('main.js is online! instance id: ' + instanceID);
});

//executes every time someone sends a message
client.on("messageCreate", async msg => {
    config = JSON.parse(fs.readFileSync(configPath)) //read the config file
    profiles = JSON.parse(fs.readFileSync(profilePath)) 
    devMode = config.devMode; //this will be evaluated every time a message is sent
    admins = config.admins; //this will be evaluated every time a message is sent
    const isAuthorized = isUserAuthorized(msg);
    let profile = SharedFunctions.getProfileById(msg.author.id);
    if (msg.system || msg.author.bot) return;
    // checking if the user is part of the current instance
    // bypassing admin check if it's instance command. not a great solution... could just 
    if(msg.content.toLowerCase().startsWith("!instance") && adminCommands.checkAdminCommand(msg, isMaster,instanceID,client)) return;
    else if(profile != null)
    {
        if (!Object.hasOwn(profile, 'instanceId')) {
            profile.instanceId = 0;
            SharedFunctions.syncProfilesToFile(isMaster);
            console.log("no instance id found defaulting")
        }
        if(!(instanceID == profile.instanceId)) {
            console.log("message ignored, user on different instance");
            return;
        }
    }

    if(isAdmin(msg.author.id)){
        if(adminCommands.checkAdminCommand(msg, isMaster, instanceID, client, date)){
            return;
        }
    }

    if (isAuthorized) {
        
        if (teamsCommands.checkTeamsCommand(msg, isMaster)) {
            console.log("teams command found");
            return;
        }
        else if(await secretCommands.checkSecretCommand(msg, isMaster)) {
            console.log("secret command found");
            return;
        }
        else if (await chatCommands.checkChatCommand(msg, isMaster,client, config)) {
            console.log("chat command found");
            return;
        }
        
    }
});

//keep as last line
client.login(token);