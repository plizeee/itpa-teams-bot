const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs'); //needed to read/write json files

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
            name: "You can't spell 'Teams Bot' without 'Stab Me'",
            type: 0
        }],
        status: 'online'
    }
});

const token = 'MTAyMzkyNTk1MDA3NDg0NzMwMw.Gyx9YP.COqIC-qvfBHnbKhVTSMIqCktSKfp3W5rOtpLwE';

// Handler:
client.prefix_commands = new Collection();
client.slash_commands = new Collection();
client.user_commands = new Collection();
client.message_commands = new Collection();
client.modals = new Collection();
client.events = new Collection();

const teamsCommands = require('./teams.js');
const rollsCommands = require('./rolls.js');
const mathCommands = require('./math.js');
const chatCommands = require('./chat.js');

const DEV_MODE = false;
const IS_MASTER = true;

function checkDevMode(msg) {
    if (DEV_MODE) {
        if (msg.author.id == 142472661841346560) {
            if (!IS_MASTER) {
                //chatCommand(msg);
                return true;
            }
        }
        else if (IS_MASTER) {
            //chatCommand(msg);
            return true;
        }
    }
    else {
        if (IS_MASTER) {
            //chatCommand(msg);
            return true;
        }
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
    let command = msg.content;
    //console.log("msg.channel.name: " + msg.channel.name);
    if (checkDevMode(msg)) {
        if (teamsCommands.checkTeamsCommand(msg)) {
            return;
        }
        /*else if (rollsCommands.checkRollsCommand(msg)) {
            return;
        }*/
        else if (mathCommands.checkMathCommand(msg)) {
            //resetBot(msg);
            return;
        }
        else if (chatCommands.checkChatCommand(msg)) {
            return;
        }
    }
});

//keep as last line
client.login(token);