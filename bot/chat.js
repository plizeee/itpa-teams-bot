// Import the openai package
const {OpenAI} = require("openai");
const Discord = require('discord.js');

// these allow us to count the number of tokens in a string for a given model
const { get_encoding, encoding_for_model } = require("tiktoken");

const fs = require('fs'); //needed to read/write json files
const https = require('https');

const { profile, time } = require("console");
const SharedFunctions = require("./util.js");
const GPTFunctionsModule = require("./functions.js");
const {FunctionResult} = require("./functionResultClass.js")

const {TokenStatTemplate} = require("./StatClasses.js");

const Tokeniser = require("./tokeniser.js");

const profilePath = './bot/profiles.json';
const configPath = './bot/config.json';
const promptPath = './bot/prompts.json';
const promptCommandPath = './bot/promptCommands.json';
const statPath = './bot/stats.json';


const profiles = JSON.parse(fs.readFileSync(profilePath)); //creating a snapshot of the contents of profiles.json
const prompts = JSON.parse(fs.readFileSync(promptPath)); //creating a snapshot of the contents of prompts.json
let triggers = JSON.parse(fs.readFileSync(promptCommandPath)); //creating a snapshot of the contents of promptCommands.json
let config;

let GPT4_REQUEST_LIMIT;
let GPT4_REQUEST_COOLDOWN;
const DEFAULT_TOKEN_LIMIT = 4000;
const GPT4_TOKEN_LIMIT = 8000;
const GPT_TURBO_16k_TOKEN_LIMIT = 16000;



require('dotenv').config();


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API,
});

const RETRY_SECONDS_BEFORE_EXPIRE = 120; //# of seconds before we remove the retry button from the message

let date;
let isMaster;


let InstanceData = {    
    LastChatSentDate: new Date("2022-01-01"),
    Cooldown:60000,
    set CooldownSeconds(seconds) {this.Cooldown = (1000*Number(seconds))},
    status: "",
    chatTokenStats: new TokenStatTemplate(),
    chatroomTokenStats: new TokenStatTemplate(),
    functionTokenStats: new TokenStatTemplate()
    
}

module.exports = {
    checkChatCommand: async function (msg, isMasterBranch,client,config_) {
        triggers = JSON.parse(fs.readFileSync(promptCommandPath));
        let found = false;
        date = new Date();
        isMaster = isMasterBranch; //why the rename? just rename the argument
        config =  config_; //read the config file
        GPT4_REQUEST_LIMIT = config.gpt4ReqLimit;
        GPT4_REQUEST_COOLDOWN = config.gpt4ReqCooldown * 60000; //convert minutes to milliseconds

        //TODO user message should be above the file content, but if we reach the token limit, we should prioritize cutting out the bottom of the file content
        //since we accept txt files as input, we need to check if the message is a file
        let fileContent = await getFileString(msg);

        //TODO feed in the appropriate model
        //the issue is that we need to read the file to determine the model, but we also need the model to trim the file
        //this shouldn't be an issue for gpt3.5/4, since they use the same encoding
        msg.content = await addFileToMsg(msg, fileContent);
        // console.log("msg.content: " + msg.content);

        profileCreation(msg);
        let chatType = await getChatType(msg,client,config.chatrooms)
        console.log("CHAT TYPE: " + chatType.Type);
        if (chatType.Type) {
            found = true;
            switch(chatType.Type){
                case 1: 
                    chatCommand(msg, isAuthorized(msg), chatType.Trigger);
                    break;
                case 2: case 3: //reply to a message
                    //we need to check if the root of the reply contains a chat command
                    checkReplyForChatCommand(msg);
                    break;
                case 4:
                    console.log("calling threadChatCommand");
                    chatroomChatCommand(msg, config.chatroomMessages??8, config.chatRoomCooldowns);
                    break;
                default:
                    crossReferenceCommand(msg);
            }
        }
        else if(msg.content.toLowerCase().startsWith("!chatroom")){chatroomCommand(msg);}
        return found;
    }
};

function getFileString(msg){
    return new Promise((resolve, reject) => {
        if (msg.attachments.size > 0) {
            let attachment = msg.attachments.first();

            // check if the attachment is a .txt file
            if (attachment.name.endsWith('.txt') || attachment.name.endsWith('.log')) {
                https.get(attachment.url, (res) => {
                    let data = '';

                    // A chunk of data has been received.
                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    // The whole response has been received.
                    res.on('end', () => {
                        resolve(data);
                    });
                }).on('error', (err) => {
                    reject("Error: " + err.message);
                });
            }
        } else {
            resolve(null);
        }
    });
}

async function addFileToMsg(msg, fileContent){
    let output = msg.content;

    if (fileContent) {
        if(msg.content.length > 0) output += "attachment.txt:\n```" + fileContent.toString() + "```";
        else output = fileContent;
    }
    else console.log("no file content");
    return await output;
}

async function checkReplyForChatCommand(msg){
    let firstMessage = await getReferenceMsg(msg);

    if (firstMessage && getTrigger(firstMessage)) {
        chatCommand(msg, isAuthorized(msg, firstMessage), getTrigger(firstMessage));
    }
    else{
        chatCommand(msg);
    }
}

async function chatroomCommand(msg){
   threadMessage = await msg.reply("Here You Go");
   threadMessage.startThread({name: "Terry Chatroom", reason:"chatroom command"});
}

async function crossReferenceCommand(msg){
    console.log("CROSS REFERENCE MESSAGE COMMAND");

    //const instructions = prompts["Terry"] + " The following message is the message the user is referring to: ";
    const instructions = triggers.commands.find(command => command.name == "Terry").prompt + " The following message is the message the user is referring to: ";

    //TODO send more typing indicators if the message is still being generated
    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt({
        msg: msg, 
        instructions: instructions, 
    });
}

function getPromptCommands(){
    let array = [];
    for (let i = 0; i < triggers.commands.length; i++) {
        array.push(triggers.commands[i].command);
    }
    console.log("Commands: " + array);
    return array;
}

let getTrigger = message => triggers.commands.find(promptCommand => message.split(" ")[0].toUpperCase() == "!" + promptCommand.command.toUpperCase()) ?? null;

function isAuthorized(msg, referenceMessage = null) {
    let message = referenceMessage ? referenceMessage : msg.content; 
    let profile = SharedFunctions.getProfile(msg);
    let {model, permission: promptPermission} = getTrigger(message);

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
    let timeSinceLastGpt4 = Date.now() - profile.gpt4Timestamps[profile.gpt4Timestamps.length - 1];

    console.log("timeSinceLastGpt4: " + timeSinceLastGpt4 + " \ngpt4Timestamps.length: " + profile.gpt4Timestamps.length);

    if (profile.gpt4Timestamps.length >= GPT4_REQUEST_LIMIT && timeSinceLastGpt4 < GPT4_REQUEST_COOLDOWN) {
        console.log("User is not authorized to use gpt-4. Rate limit exceeded.");
        msg.reply("Rate limit exceeded.");
        return false;
    } 
    else {
        profile.gpt4Timestamps.push(Date.now());

        // Remove timestamps that are older than the rate limit time or greater than the rate limit
        for (let i = 1; i <= profile.gpt4Timestamps.length; i++) {
            if (i > GPT4_REQUEST_LIMIT) {
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

//now returns an object including the command
async function getChatType(msg,client,chatrooms){
    let message = msg.content.toUpperCase();
    let trigger = getTrigger(message);
    console.log(trigger);
    console.log("Command: " + trigger?.command?? "NOT FOUND");

    //TODO this is super confusing to work with, so I'm just going to temporarily make a manual check to see the user is replying to a bot that has a lock
    // let isBotRef = await isReferencingBot(msg);
    // if(isBotRef){
    //     let msgRef = await msg.fetchReference();
    //     if(msgRef.content.startsWith("🔒")){
    //         return false;
    //     }
    // }

    chatType = {Trigger:trigger}; //creating a chatType object with the intial property of Trigger
    
    //ternary operator block to asign chatType type property 
    chatType.Type = trigger? 1: //if it's a prompt command
    (msg.channel.type === 1 && !msg.author.bot && !message.startsWith("!"))? 2: //if it's a dm without a command
    await isReferencingBot(msg) ? 3: //if it's a reply to the bot
    (chatrooms && !msg.reference && await isTerryThread(msg,client.user) && isOffChatCooldown(msg, InstanceData.Cooldown))? 4:  //if it's a thread
    false;

    return chatType;
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
        // console.log("!!!!!REPLIEDMESSAGE: " + repliedMessage.content + "!!!!!!!!!!");
        return repliedMessage.author.bot;
    }
    return false;
}

async function getReplyChain(msg, sysMsg, model) {
    console.log("Entering getReplyChain function...");

    let message = stripCommand(msg.content); 

    let replyChain = [];

    replyChain.push({"role": "system", "content": sysMsg});

    console.log("System message added to reply chain...");

    // If the message has a reference (i.e., it's a reply to another message)
    if (msg.reference) {
        console.log("Message has a reference. Fetching replied message...");
        let repliedMessageRef = await msg.fetchReference();

        // Temporary array to store the interlaced messages
        let tempReplyArray = [];

        // Loop through the chain of replied messages
        while (repliedMessageRef) {
            console.log("Processing replied message...");
            let chainContent = await getChainContent(repliedMessageRef, model);
            tempReplyArray.unshift({"role": (repliedMessageRef.author.bot) ? "assistant" : "user", "content": chainContent});

            // Attempt to fetch the next replied message in the chain
            repliedMessageRef = await fetchRepliedMessage(repliedMessageRef);
        }

        // Merge the temporary array into the main replyChain
        replyChain = replyChain.concat(tempReplyArray);
    }

    replyChain.push({"role": "user", "content": message});

    console.log("Reply chain created. Returning reply chain...");
    return replyChain;
}

async function fetchRepliedMessage(repliedMessageRef) {
    console.log("Fetching next replied message...");
    console.log("isReference: " + repliedMessageRef.reference)
    return await repliedMessageRef.fetchReference().catch(err => {
        console.log("No reference found for replied message. Error:", err.message);
        return null;
    });
}

async function getChainContent(repliedMessageRef, model) {
    console.log("Getting content for replied message...");
    
    let fileContent = await getFileString(repliedMessageRef);
    repliedMessageRef.content = await addFileToMsg(repliedMessageRef, fileContent);
    let refProfile = SharedFunctions.getProfile(repliedMessageRef);
    let repliedMessage = stripCommand(repliedMessageRef.content.toString());

    console.log("Returning content for replied message...");
    return (repliedMessageRef.author.bot)
           ? "Terry: " + repliedMessage
           : refProfile.name + "(" + repliedMessageRef.author.id + "): " + repliedMessage;
}

async function getReferenceMsg(msg){
    let firstMessage;

    if(msg.reference){
        let repliedMessageRef = await msg.fetchReference();

        while(repliedMessageRef){
            firstMessage = repliedMessageRef.content;
            repliedMessageRef = await repliedMessageRef.fetchReference()
            .catch(err => console.log("No reference found"));
        }
    }

    return firstMessage;
}

function stripCommand(message){
    if(message.startsWith("!")){
        message = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    return message;
}

function syncStats(){
    //const filepath = "./stats.json";
    if(!fs.existsSync(statPath)){console.log("Creating Stats File")}
    const chatStats = InstanceData.chatTokenStats;
    const chatroomStats = InstanceData.chatroomTokenStats;
    const funcStats = InstanceData.functionTokenStats;
    const stats = {
        "avgChatPromptToken": chatStats.promptTokens.average(),
        "avgChatCompleteToken": chatStats.completionTokens.average(),
        "avgChatTotalTokens": chatStats.TotalAverage(),
        "chatTokenRate": chatStats.TotalRate(),
        "avgChatRoomPromptToken": chatroomStats.promptTokens.average(),
        "avgChatRoomCompleteToken": chatroomStats.completionTokens.average(),
        "avgChatRoomTotalTokens": chatroomStats.TotalAverage(),
        "chatroomTokenRate": chatroomStats.TotalRate(),
        "avgFuncPromptToken": funcStats.promptTokens.average(),
        "avgFuncCompleteToken": funcStats.completionTokens.average(),
        "avgFuncTotalTokens": funcStats.TotalAverage(),
        "funcTokenRate": funcStats.TotalRate()
    }
    fs.writeFileSync(statPath,JSON.stringify(stats, space="\r\n"));
}

//function used for server messages starting with '!chat' or direct messages that don't start with '!'
function chatCommand(msg,isUserAuthorized = true,trigger={model:"gpt-3.5-turbo-16k-0613",prompt:triggers.commands.find(command => command.name == "Terry").prompt}){
    const {model,prompt} = trigger;
    if(!isUserAuthorized){
        return;
    }
    const instructions = prompt + ". The date is " + date + ".";
    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
   sendPrompt({
        msg: msg, 
        instructions: instructions, 
        model: model,
        functions: GPTFunctionsModule.GetTriggerFunctions(trigger)
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
async function chatroomChatCommand(msg, maxNumOfMsgs =3, cooldowns = {solo: 15, noResponse: 60, normal: 80}){
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
    const completion = await openai.chat.completions.create({
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
    const rawReply = completion.choices[0].message.content; 
    
    console.log("rawReply: " + rawReply);

    let replyMessage = stripNameFromResponse(rawReply);
    let prompt_tokens = completion.usage.prompt_tokens;
    let completion_tokens = completion.usage.completion_tokens;
    let uncut_reply_length = replyMessage.length;
    InstanceData.chatroomTokenStats.storeData(prompt_tokens,completion_tokens);
    //discord has a 2000 character limit, so we need to cut the response if it's too long
    if(rawReply.length > 2000) replyMessage = replyMessage.slice(0, 2000);

    console.log("Length: " + replyMessage.length + "/" + uncut_reply_length + " | prompt: " + prompt_tokens + " | completion: " + completion_tokens + " | total: " + (prompt_tokens + completion_tokens));
    
    let responsePattern = /\[(?:do)?respond: (?<doRespond>f(?:alse)?|t(?:rue)?|n(?:ul{0,2})?)\]/im; // this is overcomplicated... just check if it's false or null, - will to himself 
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
        if(!replyMessage || replyMessage == " ") replyMessage = InstanceData.status;
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
async function resolveFunctionCall(completion,messages,functions=[]){
    let completionMessage = completion.choices[0].message
    const functionName = completionMessage.function_call.name
    let functionArgs = completionMessage.function_call.arguments;
    console.log(`function called: ${functionName} (${functionArgs})`);
    functionArgs = JSON.parse(functionArgs);
    let functionResponse = await GPTFunctionsModule.CallFunction(functionName,functionArgs);
    if(functionResponse instanceof FunctionResult) {
        console.log("function is complex return");
        if(functionResponse.overide) functions = functionResponse.comboFunctions;
        else{
            functions = functions.filter(func=>!functionResponse.disableFunctions.includes(func.name));
            functions.push(...GPTFunctionsModule.GetFunctionsMetadata(functionResponse.comboFunctions));
        }
        functionResponse = JSON.stringify(functionResponse.returnValue);
    }
    else {functionResponse = JSON.stringify(functionResponse);}
    console.log(`func response: ${functionResponse}`);
    messages.push(completionMessage);  // extend conversation with assistant's reply
    messages.push({
        "role": "function",
        "name": functionName,
        "content": functionResponse,
    });
    let request = {
        model: completion.model,
        messages: messages
    }
    if(functions.length) request.functions = functions;
    const secondResponse = await openai.chat.completions.create(request);  // get a new response from GPT where it can see the function response
    return secondResponse;
}

//sends the prompt to the API to generate the AI response and send it to the user
async function sendPrompt({msg, instructions, model, functions}){
    //TODO include txt file content in replies
    let token_limit;
    let input_token_limit;
    let output_token_limit;
    let request;
    let replyChain;
    let fullPrompt;
    let fullPromptTokens;

    const MARGIN_OF_ERROR_MULTIPLIER = 0.9; //multiplier to reduce the max tokens by to account for the margin of error

    switch(model){
        case "gpt-4": token_limit = GPT4_TOKEN_LIMIT; break;
        case "gpt-3.5-turbo-16k-0613": token_limit = GPT_TURBO_16k_TOKEN_LIMIT; break;
        default: token_limit = DEFAULT_TOKEN_LIMIT; break;
    }

    token_limit *= MARGIN_OF_ERROR_MULTIPLIER;
    
    //TODO make this a config option
    //TODO maybe make this a function depending on the model
    //I landed on 0.75 because it's probably more valuable to have long inputs with shorter outputs than a truncated input with a longer output
    //this won't limit the output length if the input is short enough
    input_token_limit = token_limit * 0.75;
    
    //the whole reply chain before it's cut down to the token limit
    replyChain = await getReplyChain(msg, instructions, model);

    //the final prompt, after it's been cut down to the token limit
    fullPrompt = Tokeniser.removeOldestMessagesUntilLimit(replyChain, input_token_limit, model);

    fullPromptTokens = Tokeniser.numTokensFromMessages(fullPrompt, model);

    output_token_limit = token_limit - fullPromptTokens;

    console.log("maxTokens: " + token_limit, "inputTokenLimit: " + input_token_limit, "outputTokenLimit: " + output_token_limit);
    console.log("replyChain: " + replyChain);
    console.log("fullPrompt: " + fullPrompt);
    console.log("fullPrompt tokens: " + fullPromptTokens);

    request = {
        model: model,
        messages: fullPrompt,
        max_tokens: output_token_limit
        //TODO look into adding 'stream' so you can see a response as it's being generated
    }

    if(functions.length) request.functions = functions;
    console.log(request);

    let completion = await openai.chat.completions.create(request)
    .catch(error => { //catch error 400 for bad request
        console.log(error);
        if(error.code == 'context_length_exceeded'){
            msg.reply("Your message is too long. Please try again.");
            
        }
    })
    .catch(error => { //catching errors, such as sending too many requests, or servers are overloaded
        console.log(error);
        msg.reply("Something went wrong. Please try again later.");
    });

    //since the catch statement above doesn't stop the function, we need to check if the completion is null
    if(!completion) {
        console.log("completion is null");
        return;
    }

    let completionMessage = completion.choices[0].message

    while(completionMessage.function_call){
        let prompt_tokens = completion.usage.prompt_tokens;
        let completion_tokens = completion.usage.completion_tokens;
        InstanceData.functionTokenStats.storeData(prompt_tokens,completion_tokens);
        completion = await resolveFunctionCall(completion, fullPrompt, functions);
        completionMessage = completion.choices[0].message;
    }
    //might be a good idea to turn reply into seperate method
    const rawReply = completionMessage.content;   //storing the unmodified output of the ai generated response

    let replyMessage = stripNameFromResponse(rawReply);                        //copy of the response that will be modified 

    console.log("rawReply: " + rawReply);

    let prompt_tokens = completion.usage.prompt_tokens;
    let completion_tokens = completion.usage.completion_tokens;
    let uncut_reply_length = replyMessage.length;
    InstanceData.chatTokenStats.storeData(prompt_tokens,completion_tokens);

    //discord has a 2000 character limit, so we need to cut the response if it's too long
    if(replyMessage.length > 2000){
        console.log("Text was too long, sending as a file");
        sendTextFile(msg, replyMessage);
    }
    else{
        //TODO rework this later 
        syncStats();
        generateReactions(msg, replyMessage);
    }
    console.log("Length: " + replyMessage.length + "/" + uncut_reply_length + " | prompt: " + prompt_tokens + " | completion: " + completion_tokens + " | total: " + (prompt_tokens + completion_tokens));
    
}

//TODO fix issue causing word wrapping to wrap at weird lengths
async function sendTextFile(msg, replyMessage){
    let filename = "reply.txt"; //TODO maybe do something with this
    //create a .txt file and send it as an attachment

    replyMessage = formatText(replyMessage, 60);

    const attachment = new Discord.AttachmentBuilder(Buffer.from(replyMessage), filename, {contentType: 'text/plain'});
    attachment.name = 'reply.txt';
    await msg.reply({ files: [attachment] });
}

function formatText(input, maxLineLength) {
    var words = input.split(' ');
    var lines = [];
    var currentLine = '';

    words.forEach(function (word) {
        // If the current word would make the line too long
        if ((currentLine + word).length >= maxLineLength) {
            // If the word itself is too long
            if (word.length > maxLineLength) {
                // If there is already text on the current line
                if (currentLine.length > 0) {
                    lines.push(currentLine.trim());
                    currentLine = '';
                }
                // Split the word across lines
                while (word.length > 0) {
                    lines.push(word.substring(0, maxLineLength));
                    word = word.substring(maxLineLength);
                }
            } else {
                lines.push(currentLine.trim());
                currentLine = word;
            }
        } else {
            currentLine += ' ' + word;
        }
    });

    // Push the last line into the lines array
    if (currentLine.length > 0) {
        lines.push(currentLine.trim());
    }

    // console.log("FORMATTEXT START: " + lines.join('\n') );
    return lines.join('\n');
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