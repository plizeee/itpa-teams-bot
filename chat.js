// Import the openai package
const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs'); //needed to read/write json files
const profiles = JSON.parse(fs.readFileSync('./profiles.json')); //creating a snapshot of the contents of profiles.json
const prompts = JSON.parse(fs.readFileSync('./prompts.json')); //creating a snapshot of the contents of prompts.json

require('dotenv').config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API,
});

const openai = new OpenAIApi(configuration);

const RETRY_SECONDS_BEFORE_EXPIRE = 120; //# of seconds before we remove the retry button from the message

let date;
let isMaster;

let ThreadData = {
    LastChatSentDate: new Date(year=2020),
    Cooldown: 80000,
    set setCooldown(seconds) {this.Cooldown = (1000*seconds)} 
}

module.exports = {
    checkChatCommand: async function (msg, isMasterBranch,client) {
        let found = false;
        date = new Date();
        isMaster = isMasterBranch;

        profileCreation(msg);
        let chatType = await isValidChatRequirements(msg,client)
        if (chatType) {
            found = true;
            switch(chatType){
                case 1: case 2: case 3:
                    chatCommand(msg); 
                    break;
                case 4:
                    console.log("calling threadChatCommand");
                    threadChatCommand(msg, 5);
                    break;
                default:
                    crossReferenceCommand(msg);
            }
        }
        return found;
    }
};

async function crossReferenceCommand(msg){
    console.log("CROSS REFERENCE MESSAGE COMMAND");

    const instructions = prompts["Terry"] + " The following message is the message the user is referring to: ";

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt({
        msg: msg, 
        instructions: instructions, 
    });
}

//I altered this to better determine what type of chat causes his response -will
async function isValidChatRequirements(msg,client){
    let message = msg.content.toUpperCase();
    // //() groups statments, gets around js auto placing semicolons were we don't want them.
    // return (
    //     message.startsWith("!CHAT ")
    //     || (msg.channel.type === 1 && !msg.author.bot && !message.startsWith("!"))
    //     || await isReferencingBot(msg)
    //     || (await isTerryThread(msg,client.user) && isOffChatCooldown(msg, ThreadCooldownLength))
    // );

    return message.startsWith("!CHAT ")? 1:
    (msg.channel.type === 1 && !msg.author.bot && !message.startsWith("!"))? 2:
    await isReferencingBot(msg)? 3:
    (await isTerryThread(msg,client.user) && isOffChatCooldown(msg, ThreadData.Cooldown) && !msg.reference)? 4: false;

    // if(message.startsWith("!CHAT ")){
    //     return true;
    // }
    // else if(msg.channel.type === 1 && !msg.author.bot && !message.startsWith("!")){
    //     return true;
    // }
    // else if(await isReferencingBot(msg)){
    //     return true;
    // }
    // return false;
}
//checks if it's a thread then checks if starting message author is terry(user) then returns true if so otherwise false;
async function isTerryThread(msg,terry){
    if(msg.channel.isThread()) {
        startMsg = await msg.channel.fetchStarterMessage();
        return (startMsg.author == terry);
    };
    return false;
}
let isOffChatCooldown = (msg, cooldown = 300000) => {
    let log = (msg.createdAt.getTime() - ThreadData.LastChatSentDate.getTime()) >= cooldown;
    console.log(`off cooldown?: ${log}`);
    return log;
}


async function isReferencingBot(msg){
    //if the message is a reply, we want to check if the referenced message was sent by a bot
    if(msg.reference){
        let repliedMessage = await msg.fetchReference();

        return repliedMessage.author.bot;
    }
    return false;
}

// Maybe we should rename this type of thread to chain, to distungiush from discord threads. -will
//function that returns a thread from a chain of messages
async function getReplyThread(msg, sysMsg){

    let message = stripCommand(msg.content);
    let profile = getProfile(msg);

    let thread = [];

    if(msg.reference){
        let repliedMessageRef = await msg.fetchReference();
        
        while(repliedMessageRef){
            let refProfile = getProfile(repliedMessageRef);
            let repliedMessage = stripCommand(repliedMessageRef.content);
            if(repliedMessageRef.author.bot){
                thread.unshift({"role": "assistant", "content": "Terry: " + repliedMessage});
            }
            else{
                thread.unshift({"role": "user", "content": refProfile.name + "(" + repliedMessageRef.author.username + "): " + repliedMessage});
            }

            repliedMessageRef = await repliedMessageRef.fetchReference()
            .catch(err => console.log("No reference found"));
        }
    }

    thread.push({"role": "user", "content": profile.name + "(" + msg.author.username + "): " + message});
    thread.unshift({"role": "system", "content": sysMsg});

    return thread;
}

function stripCommand(message){
    if(message.startsWith("!")){
        message = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    return message;
}

//This will replace whatever is inside profiles.json with the value of the profiles variable
function syncProfilesToFile(){
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

//function used for server messages starting with '!chat' or direct messages that don't start with '!'
function chatCommand(msg){
    const instructions = prompts["Terry"] + ". The date is " + date + ".";

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt({
        msg: msg, 
        instructions: instructions, 
    });
}
async function getThreadMessages(thread, maxNumOfMsgs){
    let messages = await thread.messages.fetch({limit: maxNumOfMsgs})
    let parsedMessages = []
    for(let [snowflake,message] of messages){
        let profile = getProfileByid(message.author.id);
        let role = "user";
        let content = `${profile.name}(${message.author.username}): ${message.content}`;
        if (message.author.bot){
            role = "assistant";
            content = message.content;
        }
        parsedMessages.unshift({"role": role, "content": content});
    }
    return parsedMessages;
}
async function threadChatCommand(msg,maxNumOfMsgs =3){
    const instructions = prompts["Terry-Simple"] + prompts["Discord-Chat-formatting"] + prompts["Thread-Chat"] + prompts["Meta-Info"];
    console.log("calling getThreadMessages");
    let thread = await getThreadMessages(msg.channel, maxNumOfMsgs);
    thread.unshift({"role": "system", "content": instructions});
    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: thread,
        max_tokens: 500,
    })
    .catch(error => { //catching errors, such as sending too many requests, or servers are overloaded
        console.log(error);
    });
    if(!completion){
        console.log("completion is null");
        msg.reply("Something went wrong. Please try again later.");
        return;
    }
    const rawReply = completion.data.choices[0].message.content; 
    
    console.log("rawReply: " + rawReply);

    let replyMessage = stripNameFromResponse(rawReply);
    let prompt_tokens = completion.data.usage.prompt_tokens;
    let completion_tokens = completion.data.usage.completion_tokens;
    let uncut_reply_length = replyMessage.length;

    //discord has a 4000 character limit, so we need to cut the response if it's too long
    if(rawReply.length > 2000) replyMessage = replyMessage.slice(0, 2000);

    console.log("Length: " + replyMessage.length + "/" + uncut_reply_length + " | prompt: " + prompt_tokens + " | completion: " + completion_tokens + " | total: " + (prompt_tokens + completion_tokens));

    let noResponsePattern = /\[n(r|u?l{0,2})\]/gim
    if (noResponsePattern.test(rawReply)) {
        ThreadData.setCooldown = 60; 
        console.log("decided to not respond");
    }
    else {
        msg.reply(replyMessage);
        ThreadData.setCooldown = (msg.channel.memberCount > 2)? 80:15;
    }
    ThreadData.LastChatSentDate = date;

}

function stripNameFromResponse(response){
    if(response.startsWith("Terry:")){
        response = response.replace("Terry:", "").trim();
    }
    return response;
}

//sends the prompt to the API to generate the AI response and send it to the user
async function sendPrompt({msg, instructions}){
    let fullPrompt = await getReplyThread(msg, instructions);

    console.log(fullPrompt);

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: fullPrompt,
        max_tokens: 2000,
        //TODO look into adding 'stream' so you can see a response as it's being generated
    })
    .catch(error => { //catching errors, such as sending too many requests, or servers are overloaded
        console.log(error);
    });

    //since the catch statement above doesn't stop the function, we need to check if the completion is null
    if(!completion) {
        console.log("completion is null");
        msg.reply("Something went wrong. Please try again later.");
        return;
    }

    const rawReply = completion.data.choices[0].message.content;   //storing the unmodified output of the ai generated response

    let replyMessage = stripNameFromResponse(rawReply);                        //copy of the response that will be modified 

    console.log("rawReply: " + rawReply);

    let prompt_tokens = completion.data.usage.prompt_tokens;
    let completion_tokens = completion.data.usage.completion_tokens;
    let uncut_reply_length = replyMessage.length;

    //discord has a 4000 character limit, so we need to cut the response if it's too long
    if(replyMessage.length > 2000){
        replyMessage = replyMessage.slice(0, 2000);
    }

    console.log("Length: " + replyMessage.length + "/" + uncut_reply_length + " | prompt: " + prompt_tokens + " | completion: " + completion_tokens + " | total: " + (prompt_tokens + completion_tokens));

    generateReactions(msg, replyMessage);
}

async function generateReactions(msg, replyMessage){
    const message = await msg.reply(replyMessage);

    await message.react('🔄');
    
    let reactionFilter = (reaction, user) => {
        const isValidReaction = reaction.emoji.name === '🔄';
        const isAuthor = user.id === msg.author.id && !user.bot;

        console.log("reactionFilter: " + "reaction.emoji.name: " + reaction.emoji.name + " user.id: " + user.id + " msg.author.id: " + msg.author.id);

        return isValidReaction && isAuthor;
    };

    let messageFilter = (m) => m.author.id === msg.author.id && !m.author.bot && isChatCommand(msg);

    const collector = message.createReactionCollector({filter: reactionFilter, max: 1, time: 1000 * RETRY_SECONDS_BEFORE_EXPIRE});

    const messageCollector = msg.channel.createMessageCollector({filter: messageFilter, max: 1, time: 1000 * RETRY_SECONDS_BEFORE_EXPIRE});

    //this will run every time a reaction is added as long as the filter is true
    collector.on('collect', (reaction, user) => {
        console.log("reaction.emoji.name: " + reaction.emoji.name + " user.id: " + user.id + " msg.author.id: " + msg.author.id);

        message.delete();
        chatCommand(msg);
    });

    messageCollector.on('collect', m => {
        console.log("MESSAGE COLLECTED");
        console.log("m.author.id: " + m.author.id + " msg.author.id: " + msg.author.id + " m.author.bot: " + m.author.bot + " isChatCommand(m): " + isChatCommand(m));
        if(m.author.id == msg.author.id && !m.author.bot && isChatCommand(m)){
            removeReaction(message);
        }
    });

    //after the filter time has passed, the collector will stop and this will run
    collector.on('end', () => {
        removeReaction(message);
    });
}

function isChatCommand(msg){
    const message = msg.content.toUpperCase();
    return message.startsWith("!CHAT ") || msg.channel.type === 1;
}

function removeReaction(message){
    const reaction = message.reactions.cache.find(reaction => reaction.emoji.name === '🔄');

    if (reaction && reaction.message && !reaction.message.deleted && reaction.me) {

        //TODO look into also doing this if the user alters the thread
        reaction.users.remove(message.author.id)
        .then(() => {
            console.log(`Successfully un-reacted to message with ID ${reaction.message.id}`);
        })
        .catch(error => {
            console.error(`Failed to un-react to message with ID ${reaction.message.id}: ${error}`);
        });
    } 
    else {
        console.log('Cannot remove reactions from non-DM channels or the message has been deleted.');
    }
        
    console.log("collector ended");
}

function profileCreation(msg){ //generates a profile for users that don't have one
    const profile = getProfile(msg);

    if(msg.author.bot || profile != null){
        return;
    }

    profiles["users"].push( //setting up all the profile stuff
        {
            "id": msg.author.id,
            "name": msg.author.username, //using their username at the time of creation, but this can be changed manually
            "rep": 0,
            //teams bot specific stuff
            //TODO move this to teams.js because I might want to have an ai-only version of this bot
            "teams": {
                "linkMessages": [],
                "lateMessages": [],
                "earlyMessages": [],
            }
        }
    );
    syncProfilesToFile(); //Saving changes to file
    return;
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

function getProfileByid(id){
    for(let profile of profiles["users"]){
        if(profile.id == id) {return profile;}
    }
    return null;
}

//ITPA SERVER ID: 1017047682713387049
//TEST SERVER ID: 1023927168281104505