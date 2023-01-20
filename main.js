const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs'); //needed to read/write json files

require('dotenv').config();

const token = process.env.TOKEN; //secret token

const DEV_MODE = false;
const IS_MASTER = true;

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

const fileName = './profiles.json';

if (!fs.existsSync(fileName)) {
    console.log(`The file ${fileName} does not exist, creating a new one`);
    const defaultValue = {
        "users": []
    };
    fs.writeFileSync(fileName, JSON.stringify(defaultValue));
}

// Handler:
client.prefix_commands = new Collection();
client.slash_commands = new Collection();
client.user_commands = new Collection();
client.message_commands = new Collection();
client.modals = new Collection();
client.events = new Collection();

const teamsCommands = require('./teams.js');
const chatCommands = require('./chat.js');

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