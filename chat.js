// Import the openai package
const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs'); //needed to read/write json files
const profiles = JSON.parse(fs.readFileSync('./profiles.json')); //creating a snapshot of the contents of profiles.json

require('dotenv').config();

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API,
});

const openai = new OpenAIApi(configuration);

const NUM_THREADS = 5; //Max # of threads to store for any given profile (more threads = more tokens used per message)
const RESET_THREAD_HOURS = 0.5; //# of hours before we automatically clear the history (reduces token usage)

let date;
let isMaster;

module.exports = {
    checkChatCommand: function (msg, isMasterBranch) {
        date = new Date();
        isMaster = isMasterBranch;

        if(!profileCreation(msg)){
            syncProfileMessages();
        }

        let command = msg.content.toUpperCase(), found = false;

        if (command.startsWith("!QUESTION ") || command.startsWith("!Q ")) { //Ignores Rep and thread history, provides more factual answers.
            found = true;
            questionCommand(msg);
        }
        else if (command == "!NEWTHREAD" || command == "!CLEAR") { //Empties the user's thread information from their profile
            found = true;
            newThreadCommand(msg);
        }
        else if (command.startsWith("!REP")) { //Set a specific user's Rep based on their 
            found = true;
            repCommand(msg);
        }
        else if (command.startsWith("!CHAT ") || (msg.channel.type == 1 && !msg.author.bot && !command.startsWith("!"))) { //we wanna use !chat when we're not in a channel (DM) and we don't want it to talk to itself so we exclude its id
            found = true;
            chatCommand(msg);
        }
        return found;
    }
};

// a function to return an array of any keywords found in the prompt
function checkKeywords(prompt){
    let keywords = ["you","me","i",""]
    let output = []
    
    for (i of keywords){if (prompt.toLowerCase().includes(i.toLowerCase())){output += i}}
    return output
}

//function to return the rep of the user
function repCommand(msg) {
    const profile = getProfile(msg);
    profile.rep = readValueFromProfile(msg, "rep");
    msg.reply("Your rep is: " + profile.rep);
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

function readValueFromProfile(msg, element){
    const _profiles = JSON.parse(fs.readFileSync('./profiles.json'));;

    for(let i = 0; i < _profiles["users"].length; i++){
        const _profile = _profiles["users"][i];

        if(_profile.id == msg.author.id){
            console.log(element + " has been read from profile.");
            return _profile[element];
        }
    }
    return null;
}

//clears the user's thread
//useful to reduce chat history bias and reduces token usage 
async function newThreadCommand(msg) {
    let profile = getProfile(msg);

    clearThread(profile);
    msg.reply("You have cleared your thread's history!");
}

//command similar to '!chat', but aimed to be more factual
//it also doesn't store prompt history to reduce any history bias
async function questionCommand(msg){
    const profile = getProfile(msg);

    const questionInstructions = [
        "The following is a conversation with an AI assistant",                                 //so it knows to behave as a chat bot
        "The assistant is uniquely built to answer questions, while remaining fully factual",   //intended to reduce the odds of gaslighting the user
        "Your name is Teams Bot",                                                               //TODO name it after it's username (not nickname or people can abuse it)
        "The user's name is " + profile.name,                                                   //TODO change this into something a user can change (though it could be abused)
        "Do not greet the user",                                                                //reduce padding answers with small talk
        "The date is " + date                                                                   //otherwise it'll make something up
    ];
    const instructions = mergeInstructions(questionInstructions);                               //merges instructions above insto a string and adds a bit of formatting

    msg.channel.sendTyping();
    sendPrompt({
        msg: msg, 
        instructions: instructions
    });                                                                   //this will display that the bot is typing while waiting for response to generate
}

//function used for server messages starting with '!chat' or direct messages that don't start with '!'
function chatCommand(msg){
    const profile = getProfile(msg);

    clearOldThread(msg); //clears the thread if it's been too long since the last message

    profile.rep = readValueFromProfile(msg, "rep");

    //using an array of strings to make adding instructions less annoying
    const chatInstructions = [
        "The following is a conversation with an AI assistant.",    //so it knows to behave as a chat bot
        "The assistant is helpful, creative, clever, and funny",    //baseline personality traits
        "Your name is Teams Bot, but you also go by the name Terry",                                   //TODO name it after it's username (not nickname or people can abuse it)
        "The user's name is " + profile.name,                       //TODO change this into something a user can change (though it could be abused)
        "You already know who the user is",                         //otherwise it will always say "nice to meet you"
        "Do not introduce yourself unless asked to",                //otherwise it will constantly introduce itself
        "Put three backticks around any code (```)",                 //formatting code responses makes code much easier to read
    ];

    const instructions = mergeInstructions(chatInstructions);

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt({
        msg: msg, 
        instructions: instructions, 
        checkThread: true, 
    });
}

//merges and formats an array of instructions strings into a single string.
function mergeInstructions(arrInstructions){
    let instructions = "";
    for(let i = 0; i < arrInstructions.length; i++){
        instructions += arrInstructions[i] + ". ";

        if(i == arrInstructions.length){
            instructions += "\n";
        }
    }

    return instructions;
}

//sends the prompt to the API to generate the AI response and send it to the user
//TODO make calling this function less confusing
async function sendPrompt({msg, instructions, checkThread = false}){
    
    const profile = getProfile(msg);
    let message = msg.content;

    let userMessages;
    let assistantMessages;

    let slicedMsg = message; //the message that will be sent to the ai, it will be sliced if it's a command

    if(message.startsWith("!")){
        slicedMsg = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    userMessages = profile.history.messages.raw.map(message => ({
        "role": "user",
        "content": message
    }))

    assistantMessages = profile.history.responses.raw.map(message => ({
        "role": "assistant",
        "content": message
    }))

    //interleaving the user and assistant messages into a single array
    let interleavedMessages = [];
    for(let i = 0; i < userMessages.length; i++){
        interleavedMessages.push(userMessages[i]);
        interleavedMessages.push(assistantMessages[i]);
    }

    const systemMessage = [{ role: "system", content: instructions }];

    const fullPrompt = systemMessage.concat(interleavedMessages, {"role": "user", "content": slicedMsg});
    
    console.log("fullPrompt: " + JSON.stringify(fullPrompt, null, 2));

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: fullPrompt,
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
    let replyMessage = rawReply;                        //copy of the response that will be modified 

    //console.log("fullPrompt: " + fullPrompt);
    console.log("rawReply: " + rawReply);

    generateReactions(msg, replyMessage);

    if (checkThread) { //we have checkThread because some prompts may not require threads, to save tokens
        addPromptHistory(msg, slicedMsg, replyMessage);
    }
}

async function generateReactions(msg, replyMessage){
    const message = await msg.reply(replyMessage);

    await message.react('🔄');
    
    let filter = (reaction, user) => {
        const isValidReaction = reaction.emoji.name === '🔄';
        const isAuthor = user.id === msg.author.id && !user.bot;

        console.log("reactionFilter: " + "reaction.emoji.name: " + reaction.emoji.name + " user.id: " + user.id + " msg.author.id: " + msg.author.id);

        return isValidReaction && isAuthor;
    };

    let messageFilter = (message) => {
        const isAuthor = message.author.id === msg.author.id && !message.author.bot;
    
        return isChatCommand(msg) && isLatestMessage(msg) && isAuthor;
    };

    const collector = message.createReactionCollector({filter, max: 1, time: 1000 * 60}); //TODO make the time configurable

    const messageCollector = msg.channel.createMessageCollector({messageFilter, max: 1, time: 1000 * 60});

    //this will run every time a reaction is added as long as the filter is true
    collector.on('collect', (reaction, user) => {
        console.log("reaction.emoji.name: " + reaction.emoji.name + " user.id: " + user.id + " msg.author.id: " + msg.author.id);

        message.delete();
        chatCommand(msg);
    });

    messageCollector.on('collect', (m) => {
        removeReaction(message);
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

function isLatestMessage(msg){
    const profile = getProfile(msg);

    const latestMessage = profile.history.messages.raw[0];

    console.log("latestMessage: " + latestMessage + " msg.content: " + msg.content + " " + msg.content.includes(latestMessage));

    return msg.content.includes(latestMessage);
}

//This will clear the user's message history after a specified time
function clearOldThread(msg){
    const profile = getProfile(msg);
    const date = new Date();

    const latestMessageDate = new Date(profile.history.timestamps[0]);

    //sometimes latestMessageDate returns as NaN, so I'm setting a default value of 0 in that event
    //using milliseconds since January 1, 1970, because it felt like a simple way to calculate the difference in time, without converting days and such
    const timeSinceLastMessage = isNaN(latestMessageDate.getTime()) ? 0 : date.getTime() - latestMessageDate.getTime();

    if (timeSinceLastMessage > 1000 * 60 * 60 * RESET_THREAD_HOURS) { //1000ms * 60s * 60m * hrs
        clearThread(profile);
    }
}

function clearThread(profile){
    profile.history = {
        "messages": {
            "raw": [],
            "summarized": []
        },
        "responses": {
            "raw": [],
            "summarized": []
        },
        "timestamps": [],
        "keywords": []
    };

    syncProfilesToFile(); //save profiles to profiles.json
    console.log("Cleared thread");
}

function profileCreation(msg){ //generates a profile for users that don't have one
    const profile = getProfile(msg);

    if(msg.author.bot || profile != null){
        return false;
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

            "history": {
                "messages": {
                    "raw": [],
                    "summarized": []
                },
                "responses": {
                    "raw": [],
                    "summarized": []
                },
                "timestamps": [],
                "keywords": []
            }
            
        }
    );
    syncProfilesToFile(); //Saving changes to file
    return true;
}

function syncProfileMessages(){ //ensures some profile information is properly formatted
    for(let i = 0; i < profiles["users"].length; i++){
        let profile = profiles["users"][i];

        let responses;
        let messages;
        let timestamps;
        let keywords;
        let isThreadArrayMissing;
        let isThreadSynced;

        if (profile.history && profile.history.responses) {
            responses = profile.history.responses.raw;
        }
        if (profile.history && profile.history.messages) {
            messages = profile.history.messages.raw;
        }
        if (profile.history && profile.history.timestamps) {
            timestamps = profile.history.timestamps;
        }
        if (profile.history && profile.history.keywords) {
            keywords = profile.history.keywords;
        }

        //checking if any array does not exist
        isThreadArrayMissing = !(Array.isArray(messages) && Array.isArray(responses) && Array.isArray(timestamps) && Array.isArray(keywords));
        
        //checking if thread lengths are in sync with one another
        if(!isThreadArrayMissing){
            isThreadSynced = responses.length == messages.length 
            && messages.length == timestamps.length;
            //&& timestamps.length == keywords.length;
            //TODO: keywords are not currently being used, so I'm not checking if they are in sync
        }
        
        //checks if any profile thread array does not exist and if so, create/reset all thread arrays (which also syncs them up)
        if(isThreadArrayMissing || !isThreadSynced){
            clearThread(profile);
            console.log("Created new thread for profile.");
        }
    }
    syncProfilesToFile(); //Saving changes to file
}

function addPromptHistory(msg, msgContent, replyContent) { //add a message to a user's message history
    const profile = getProfile(msg);
    const history = profile.history;

    //Adding msgContent to the first element of array and pushing the rest 1 position to the right
    history.messages.raw.unshift(msgContent);
    history.responses.raw.unshift(replyContent);
    history.timestamps.unshift(date);

    if (history.messages.raw.length > NUM_THREADS) { //making sure threads don't consume too many tokens
        //removing the last item on the list
        history.messages.raw.pop();
        history.responses.raw.pop();
        history.timestamps.pop();
    }
    syncProfilesToFile(); //saving our changes to file
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

//ITPA SERVER ID: 1017047682713387049
//TEST SERVER ID: 1023927168281104505