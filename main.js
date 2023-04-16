const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs'); //needed to read/write json files

require('dotenv').config();

const token = process.env.TOKEN; //secret token

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

const profilePath = './profiles.json';
if (!fs.existsSync(profilePath)) { //if the file doesn't exist, create it
    console.log(`The file ${profilePath} does not exist, creating a new one`);
    const defaultValue = {
        "users": []
    };
    fs.writeFileSync(profilePath, JSON.stringify(defaultValue));
}

const configPath = './config.json';
if (!fs.existsSync(configPath)) { //if the file doesn't exist, create it
    console.log(`The file ${configPath} does not exist, creating a new one`);
    const defaultValue = {
        "devMode": false,
        "isMaster": true,
        "admins": [],
        "instanceId": 0 // defualts to 0,
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultValue));
}

let config = JSON.parse(fs.readFileSync(configPath)); //read the config file
let profiles = JSON.parse(fs.readFileSync(profilePath))
const isMaster = config.isMaster; //only check this on launch
let devMode = config.devMode; //this will be evaluated every time a message is sent
let admins = config.admins; //this will be evaluated every time a message is sent
if(!Object.hasOwn(config, "instanceId")){ config.instanceId = 0;}// defaults no instanceId to 0 or main instances
const instanceID = config.instanceId;

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

function getProfile(id){
    for(let i = 0; i < profiles["users"].length; i++){
        let profile = profiles["users"][i];

        if(profile.id == id){
            return profile;
        }
    }
    return null;
}

//executes this as soon as it starts
client.on('ready', () => {
    console.log('main.js is online! instance id: ' + config.instanceId);
});

//executes every time someone sends a message
client.on("messageCreate", async msg => {
    config = JSON.parse(fs.readFileSync(configPath)) //read the config file
    profiles = JSON.parse(fs.readFileSync(profilePath)) 
    devMode = config.devMode; //this will be evaluated every time a message is sent
    admins = config.admins; //this will be evaluated every time a message is sent
    const isAuthorized = isUserAuthorized(msg);
    let profile = getProfile(msg.author.id);
    // checking if the user is part of the current instance
    
    if(!msg.content.toLowerCase().includes("!instance") && profile != null)
    {
        if (!Object.hasOwn(profile, 'instanceId')) {
            profile.instanceId = 0;
            console.log("no instance id found defaulting")
        }
        if(!(instanceID == profile.instanceId)) {
            console.log("message ignored, user on different instance");
            return;
        }
    }

    if(isAdmin(msg.author.id)){
        if(adminCommands.checkAdminCommand(msg, isMaster)){
            return;
        }
    }

    if (isAuthorized) {
        if (teamsCommands.checkTeamsCommand(msg, isMaster)) {
            return;
        }
        else if (chatCommands.checkChatCommand(msg, isMaster)) {
            return;
        }
    }
});

//keep as last line
client.login(token);