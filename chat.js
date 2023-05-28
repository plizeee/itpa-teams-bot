// Import the openai package
const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs'); //needed to read/write json files
const { profile, time } = require("console");
const SharedFunctions = require("./util.js");
//const { get } = require("http");
//const { config } = require("dotenv");
const profiles = JSON.parse(fs.readFileSync('./profiles.json')); //creating a snapshot of the contents of profiles.json
const prompts = JSON.parse(fs.readFileSync('./prompts.json')); //creating a snapshot of the contents of prompts.json
const promptCommands = JSON.parse(fs.readFileSync('./promptCommands.json')); //creating a snapshot of the contents of promptCommands.json
let config;

const GPT4_RATE_LIMIT = 10;
const GPT4_RATE_LIMIT_TIME = 60*60*1000; //1 hour
require('dotenv').config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API,
});

const openai = new OpenAIApi(configuration);

const RETRY_SECONDS_BEFORE_EXPIRE = 120; //# of seconds before we remove the retry button from the message

let date;
let isMaster;

class StatArray extends Array{
    sum = () => this.reduce((total, curValue) => total + curValue,0)
    average = () => this.sum()/this.length;
    rate(time) {
        return this.sum()/time
    }
}

class TokenStatTemplate {
    #firstCallDate;
    #lastCallDate;
    #calls= 0;
    #prompt = new StatArray();
    #completion = new StatArray();
    get promptTokens() {return this.#prompt}
    get completionTokens() {return this.#completion}
    get numOfCalls() {return this.#calls}
    get lastCallDate() {return this.#lastCallDate}
    get firstCallDate() {return this.#firstCallDate}
    TotalAverage() {
        return (this.#completion.reduce((total, curValue) => total + curValue,0) + this.#prompt.reduce((total, curValue) => total + curValue,0))/this.#calls;    
    };
    TotalRate(timefactor = 36000000) {
        if (!this.#firstCallDate) return null;
        return (this.#prompt.sum()+this.#completion.sum())/((this.#lastCallDate.getTime()-this.#firstCallDate.getTime())/timefactor);
    }
    storeData(promptTokens, completionTokens){
        let date = new Date()
        this.#firstCallDate??= date;
        this.#lastCallDate = date;
        if (!promptTokens || !completionTokens) console.log("no tokens receieved")
        else console.log(`tokens stored: ${promptTokens} ${completionTokens}`)
        this.#prompt.push(promptTokens);
        this.#completion.push(completionTokens);
        this.#calls++;
    }
}
let InstanceData = {    
    LastChatSentDate: new Date("2022-01-01"),
    Cooldown:60000,
    set CooldownSeconds(seconds) {this.Cooldown = (1000*Number(seconds))},
    status: "",
    chatTokenStats: new TokenStatTemplate(),
    chatroomTokenStats: new TokenStatTemplate()
    
}

module.exports = {
    checkChatCommand: async function (msg, isMasterBranch,client,config_) {
        let found = false;
        date = new Date();
        isMaster = isMasterBranch;
        config =  config_; //read the config file

        profileCreation(msg);
        let chatType = await isValidChatRequirements(msg,client,config.chatrooms)
        if (chatType) {
            found = true;
            switch(chatType){
                case 1:
                    chatCommand(msg, getModelFromMessage(msg), isAuthorized(msg), getSystemPromptFromMessage(msg));
                    break;
                case 2: case 3:
                    chatCommand(msg); 
                    break;
                case 4:
                    console.log("calling threadChatCommand");
                    threadChatCommand(msg, config.chatroomMessages??8, config.chatRoomCooldowns);
                    break;
                default:
                    crossReferenceCommand(msg);
            }
        }
        else if(msg.content.toLowerCase().startsWith("!chatroom")){chatroomCommand(msg);}
        return found;
    }
};
async function chatroomCommand(msg){
   threadMessage = await msg.reply("Here You Go");
   threadMessage.startThread({name: "Terry Chatroom", reason:"chatroom command"});
}

async function crossReferenceCommand(msg){
    console.log("CROSS REFERENCE MESSAGE COMMAND");

    const instructions = prompts["Terry"] + " The following message is the message the user is referring to: ";

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt({
        msg: msg, 
        instructions: instructions, 
    });
}

function getPromptCommands(){
    let array = [];
    for (let i = 0; i < promptCommands.commands.length; i++) {
        array.push(promptCommands.commands[i].command);
    }
    console.log("Commands: " + array);
    //console.log("PromptCommands: " + promptCommands);
    return array;
}

function getPromptCommand(msg){
    let message = msg.content.toUpperCase();
    let commands = getPromptCommands();
    let command = commands.find(command => message.startsWith("!" + command.toUpperCase() + " "));
    return command;
}

function getModelFromMessage(msg){
    let promptCommand = getPromptCommand(msg);
    let model = promptCommands.commands.find(command => command.command == promptCommand).model;
    return model;
}

function getPromptPermissionFromMessage(msg){
    let promptCommand = getPromptCommand(msg);
    let permission = promptCommands.commands.find(command => command.command == promptCommand).permission;
    return permission;
}

function getSystemPromptFromMessage(msg){
    let promptCommand = getPromptCommand(msg);
    let systemPrompt = promptCommands.commands.find(command => command.command == promptCommand).prompt;
    return systemPrompt;
}

function isAuthorized(msg) {
  let profile = SharedFunctions.getProfile(msg);
  let promptPermission = getPromptPermissionFromMessage(msg);
  let model = getModelFromMessage(msg);

  //TODO make permission levels instead of just admin or not
  let admins = config.admins;
  let userPermission = admins.includes(profile.id) ? 1 : 0;

  let isAuthorized = userPermission >= promptPermission;

  // Rate limit non-admins if they are using gpt-4 and have permission
  if (model == "gpt-4" && isAuthorized && userPermission == 0) {
    isAuthorized = checkRateLimit(profile, msg);
  }

  console.log(
    "User Permission: " + userPermission + " Prompt Permission: " + promptPermission);
  return isAuthorized; 
}

function checkRateLimit(profile, msg) {
  let timeSinceLastGpt4 =
    Date.now() - profile.gpt4Timestamps[profile.gpt4Timestamps.length - 1];

  console.log(
    "timeSinceLastGpt4: " +
      timeSinceLastGpt4 +
      " \ngpt4Timestamps.length: " +
      profile.gpt4Timestamps.length
  );

  if (
    profile.gpt4Timestamps.length >= GPT4_RATE_LIMIT &&
    timeSinceLastGpt4 < GPT4_RATE_LIMIT_TIME
  ) {
    console.log("User is not authorized to use gpt-4. Rate limit exceeded.");
    msg.reply("Rate limit exceeded.");
    return false;
  } else {
    profile.gpt4Timestamps.push(Date.now());

    // Remove timestamps that are older than the rate limit time or greater than the rate limit
    for (let i = 1; i <= profile.gpt4Timestamps.length; i++) {
      if (i > GPT4_RATE_LIMIT) {
        profile.gpt4Timestamps.shift();

        i--;
        console.log("removed timestamp");
      }
    }

    SharedFunctions.syncProfilesToFile();
    console.log("profile timestamps: " + profile.gpt4Timestamps);
    return true;
  }
}


//I altered this to better determine what type of chat causes his response -will
//should be renamed to like checkChatType
async function isValidChatRequirements(msg,client,chatrooms){
    let message = msg.content.toUpperCase();

    //get all the "command" values from the promptCommands object
    let command = getPromptCommand(msg);
    console.log("Command: " + command);

    //return message.startsWith("!CHAT ")? 1:
    return command? 1:
    (msg.channel.type === 1 && !msg.author.bot && !message.startsWith("!"))? 2:
    await isReferencingBot(msg)? 3:
    (chatrooms && !msg.reference && await isTerryThread(msg,client.user) && isOffChatCooldown(msg, InstanceData.Cooldown))? 4: false;

}

//checks if it's a thread then checks if starting message author is terry(user) then returns true if so otherwise false;
async function isTerryThread(msg,terry){
    if(msg.channel.isThread()) {
        startMsg = await msg.channel.fetchStarterMessage();
        return (startMsg.author == terry);
    };
    return false;
}
function isOffChatCooldown(msg, cooldown = 300000){
    let log = (msg.createdAt.getTime() - InstanceData.LastChatSentDate.getTime()) >= cooldown;
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
    let profile = SharedFunctions.getProfile(msg);

    let thread = [];

    if(msg.reference){
        let repliedMessageRef = await msg.fetchReference();
        
        while(repliedMessageRef){
            let refProfile = SharedFunctions.getProfile(repliedMessageRef);
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

    thread.push({"role": "user", "content": profile.name + " (" + msg.author.username + "): " + message});
    thread.unshift({"role": "system", "content": sysMsg});

    return thread;
}

function stripCommand(message){
    if(message.startsWith("!")){
        message = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    return message;
}
function syncStats(){
    const filepath = "./stats.json";
    if(!fs.existsSync(filepath)){console.log("Creating Stats File")}
    const chatStats = InstanceData.chatTokenStats;
    const chatroomStats = InstanceData.chatroomTokenStats;
    const stats = {
        "avgChatPromptToken": chatStats.promptTokens.average(),
        "avgChatCompleteToken": chatStats.completionTokens.average(),
        "avgChatTotalTokens": chatStats.TotalAverage(),
        "chatTokenRate": chatStats.TotalRate(),
        "avgChatRoomPromptToken": chatroomStats.promptTokens.average(),
        "avgChatRoomCompleteToken": chatroomStats.completionTokens.average(),
        "avgChatRoomTotalTokens": chatroomStats.TotalAverage(),
        "chatroomTokenRate": chatroomStats.TotalRate()
    }
    fs.writeFileSync(filepath,JSON.stringify(stats, space="\r\n"));
}
//This will replace whatever is inside profiles.json with the value of the profiles variable
/*function syncProfilesToFile(){
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
}*/

//function used for server messages starting with '!chat' or direct messages that don't start with '!'
function chatCommand(msg, model = "gpt-3.5-turbo", isUserAuthorized = true, systemPrompt = prompts["Terry"]){

    if(!isUserAuthorized){
        return;
    }

    console.log("Model: " + model);
    const instructions = systemPrompt + ". The date is " + date + ".";

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt({
        msg: msg, 
        instructions: instructions, 
        model: model,
    });
}
async function getThreadMessages(thread, maxNumOfMsgs){
    let messages = await thread.messages.fetch({limit: maxNumOfMsgs})
    let parsedMessages = []
    for(let [snowflake,message] of messages){
        let profile = SharedFunctions.getProfileById(message.author.id);
        let role = "user";
        let content = `messageID:${message.id} ${profile.name}(${message.author.username}): ${message.content}`;
        if (message.author.bot){
            role = "assistant";
            content = message.content;
        }
        parsedMessages.unshift({"role": role, "content": content, "name": message.author.id});
    }
    return parsedMessages;
}
async function threadChatCommand(msg, maxNumOfMsgs =3, cooldowns = {solo: 15, noResponse: 60, normal: 80}){
    cooldowns.solo??= 15;
    cooldowns.noResponse??= 60;
    cooldowns.normal??= 80;
    const instructions = prompts["Terry-Simple"] + prompts["Discord-Chat-formatting"] + prompts["Meta-Info"];
    const instructions2 = prompts["Thread-Chat"] + `your current status ${InstanceData.status}`;
    console.log("calling getThreadMessages");
    let thread = await getThreadMessages(msg.channel, maxNumOfMsgs);
    thread.unshift({"role": "user", "content": instructions2, "name": "System"});
    thread.unshift({"role": "system", "content": instructions});
    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: thread,
        max_tokens: 1200,
        temperature: 1
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
    InstanceData.chatroomTokenStats.storeData(prompt_tokens,completion_tokens);
    //discord has a 4000 character limit, so we need to cut the response if it's too long
    if(rawReply.length > 2000) replyMessage = replyMessage.slice(0, 2000);

    console.log("Length: " + replyMessage.length + "/" + uncut_reply_length + " | prompt: " + prompt_tokens + " | completion: " + completion_tokens + " | total: " + (prompt_tokens + completion_tokens));
    
    let responsePattern = /\[(?:do)?respond: (?<doRespond>f(?:alse)?|t(?:rue)?|n(?:ul{0,2})?)\]/im; // this is overcomplicated... just check if it's false or null, 
    let replyPattern = /\[reply(?:to): (?<replyTo>\d{17,20}|n(?:ul{0,2})?)\]/im;
    let statusPattern = /\[status: (?<status>.*)\]/im;
    let replyMatches = rawReply.match(replyPattern);
    let statusMatch = rawReply.match(statusPattern);
    if(statusMatch) {
        console.log(statusMatch);
        InstanceData.status = statusMatch.groups["status"];
        replyMessage = replyMessage.replace(statusPattern,"");
    }
    if(replyMatches) replyMessage = replyMessage.replace(replyPattern,"");
    let replyTarget = replyMatches?.groups["replyTo"];
    let noResponsePattern = /\[n(r|u?l{0,2})\]/gim;
    if (noResponsePattern.test(rawReply)) {
        InstanceData.CooldownSeconds = cooldowns.noResponse; 
        console.log("decided to not respond");
    }
    else {
        let reply = replyTarget? {content: replyMessage, reply: {messageReference:replyTarget, failIfNotExists: false}} : replyMessage;
        await msg.channel.send(reply);
        InstanceData.CooldownSeconds = (msg.channel.memberCount > 2)? cooldowns.normal:cooldowns.solo;
    }
    console.log(`cooldown set to ${InstanceData.Cooldown}`);
    InstanceData.LastChatSentDate = date;
    if(completion) syncStats();
}

function stripNameFromResponse(response){
    if(response.startsWith("Terry:")){
        response = response.replace("Terry:", "").trim();
    }
    return response;
}

//sends the prompt to the API to generate the AI response and send it to the user
async function sendPrompt({msg, instructions, model}){
    let fullPrompt = await getReplyThread(msg, instructions);

    console.log(fullPrompt);

    const completion = await openai.createChatCompletion({
        model: model,
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
    InstanceData.chatTokenStats.storeData(prompt_tokens,completion_tokens);

    //discord has a 4000 character limit, so we need to cut the response if it's too long
    if(replyMessage.length > 2000){
        replyMessage = replyMessage.slice(0, 2000);
    }

    console.log("Length: " + replyMessage.length + "/" + uncut_reply_length + " | prompt: " + prompt_tokens + " | completion: " + completion_tokens + " | total: " + (prompt_tokens + completion_tokens));
    syncStats();
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
    const profile = SharedFunctions.getProfile(msg);

    if(msg.author.bot || profile != null){
        if(!profile.gpt4Timestamps) {
            profile.gpt4Timestamps = [];
            console.log("Added gpt4Timestamps to profile.");
            console.log(profile);
        }
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
            },
            "gpt4Timestamps": []
        }
    );
    SharedFunctions.syncProfilesToFile(isMaster); //Saving changes to file
    return;
}



//ITPA SERVER ID: 1017047682713387049
//TEST SERVER ID: 1023927168281104505