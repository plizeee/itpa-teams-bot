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
        GatewayIntentBits.MessageContent
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
        "isMaster": true
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultValue));
}

let config = JSON.parse(fs.readFileSync(configPath)); //read the config file
const IS_MASTER = config.isMaster; //only check this on launch
let DEV_MODE = config.devMode; //this will be evaluated every time a message is sent

// Handler:
client.prefix_commands = new Collection();
client.slash_commands = new Collection();
client.user_commands = new Collection();
client.message_commands = new Collection();
client.modals = new Collection();
client.events = new Collection();

const teamsCommands = require('./teams.js');    //importing the teams.js file
const chatCommands = require('./chat.js');      //importing the chat.js file

//ensures that authorized users can use dev mode
//and prevents users from sending messages on both dev and master
function isUserAuthorized(msg) {
    if (DEV_MODE) {
        if (msg.author.id == 142472661841346560) {
            if (!IS_MASTER) { return true; }
        }
        else if (IS_MASTER) { return true; }
    }
    else {
        if (IS_MASTER) { return true; }
    }
    return false;
}

//executes this as soon as it starts
//changed from 'client.once' to 'client.on' so that I can use this when restarting the bot
client.on('ready', () => {
    console.log('main.js is online!');
});

//executes every time someone sends a message
client.on("messageCreate", async msg => {
    config = JSON.parse(fs.readFileSync(configPath)) //read the config file
    DEV_MODE = config.devMode; //this will be evaluated every time a message is sent
    if (isUserAuthorized(msg)) {
        
        if (teamsCommands.checkTeamsCommand(msg, IS_MASTER)) {
            return;
        }
        else if (chatCommands.checkChatCommand(msg, IS_MASTER)) {
            return;
        }
    }
});

//keep as last line
client.login(token);