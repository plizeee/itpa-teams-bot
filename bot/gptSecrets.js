//TODO add random secret generator
//TODO add ai response
//TODO make sure to inject the secret into the ai prompt internally
//TODO look into generating a thread, so that chat doesn't get spammed and you can easily retry without scrolling up to reply to the prompt


const fs = require('fs');

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API,
});
const openai = new OpenAIApi(configuration);

const SharedFunctions = require("./util.js");
const { format } = require('path');
const { get } = require('http');
const gptSecretsPath = './bot/gptSecrets.json';
const gptSecrets = JSON.parse(fs.readFileSync(gptSecretsPath));

const LEADERBOARD_LIMIT = 10;
let isMaster;

module.exports = {
    checkSecretCommand: async function (msg, _isMaster) {
        let found = false;
        isMaster = _isMaster;

        if(msg.channel.type === 1){ //threads don't work in DMs
            return false;
        }
        else if(msg.content.toLowerCase().startsWith('!secret')) {
            found = true;
            await secretCommand(msg);
        }
        else if(msg.reference){
            found = isReferencingSecret(msg);
        }
        else if(msg.content.toLowerCase().startsWith("!leaderboard")){
            found = true;
            //TODO make "!leaderboard" without a number display the top user for each level
            leaderboardCommand(msg);
        }
        else if(await msg.channel.isThread()){
            found = await isThreadSecret(msg);
        }
        console.log("secret command found: " + found);
        return found;
    }
};

async function isThreadSecret(msg){
    let startMsg = await msg.channel.fetchStarterMessage();
    //console.log("startMsg.content: " + startMsg.content);
    //console.log("name of thread: " + startMsg.thread.name);
    //if()
    //return true;

    let found = false;
    let thread = startMsg.thread;

    if(thread.name.startsWith("🔒")){
        found = true;

        //look for the level number in "🔒[Level x]", where x can be any number
        let level = thread.name.slice(thread.name.indexOf(" ") + 1, thread.name.indexOf("]"));
        console.log("level found: " + level);
        //if the level is not a number, then it is not a secret
        if(!isNaN(level)){
            generateResponse(msg, level);
        }
    }

    return found;
}

function leaderboardCommand(msg){
    let message = stripCommand(msg.content);
    let level = gptSecrets.levels.find(level => level.level == message); //find the level object that matches the message

    if(level){
        console.log("level found: " + level.level);
        let leaderboard = getLeaderboard(level.level);
        let output = "🏆__**[Leaderboard - Level " + level.level + "]**__\n"

        for(let i = 0; i < leaderboard.length; i++){
            output += (i + 1) + ". " + leaderboard[i].name + ": " + leaderboard[i].score + "\n";
        }
        msg.reply(output);
    }
}

async function secretCommand(msg) {
    console.log("command: " + msg.content);
    let message = stripCommand(msg.content);

    let level = gptSecrets.levels.find(level => level.level == message); //find the level object that matches the message
    console.log("level: " + level);
    if(level){ 
        console.log("level found: " + level.level);
        let thread = await msg.startThread({name: "🔒[Level " + level.level + "]", reason: "secret command"});
        console.log("thread.name: " + thread.name);
        thread.send("🔒[Level " + level.level + "]\n" + level.prompt);
    }
}

// function secretInternalPrompt(msg) {
//     console.log("command: " + msg.content);
//     let message = stripCommand(msg.content);

//     let level = gptSecrets.levels.find(level => level.level == message); //find the level object that matches the message
//     console.log("level: " + level);
//     if(level){ 
//         console.log("level found: " + level.level);
//         msg.reply("🔒[Level " + level.level + "]\n" + level.prompt);
//     }
// }

async function isReferencingSecret(msg){
    let found = false;
    let msgRef = await msg.fetchReference();
    if(msgRef.content.startsWith("🔒") || msgRef.content.startsWith("🔓") || msgRef.content.startsWith("🏆")){
        found = true;
        msg.reply("🔒 Replies are disabled here.");
    }
    /*if(msgRef.content.startsWith("🔒")){
        found = true;

        //look for the level number in "🔒[Level x]", where x can be any number
        let level = msgRef.content.slice(msgRef.content.indexOf(" ") + 1, msgRef.content.indexOf("]"));
        console.log("level found: " + level);
        //if the level is not a number, then it is not a secret
        if(!isNaN(level)){
            generateResponse(msg, level);
        }
    }
    else if(msgRef.content.startsWith("🔓")){
        found = true;
        msg.reply("Replies starting with 🔓 are disabled.");
    }
    else if(msgRef.content.startsWith("🏆")){
        found = true;
        msg.reply("Replies starting with 🏆 are disabled.");
    }*/
    return found;
}

async function generateResponse(msg, lvl){
    let level = gptSecrets.levels.find(level => level.level == lvl);
    let prompt = level.prompt;
    let password = generateRandomPassword();
    let systemPrompt = formatSystemPrompt(prompt, password);
    let userPrompt = msg.content;

    let promptArray = [{"role": "system", "content": systemPrompt}, {"role": "user", "content": userPrompt}];

    console.log("password: " + password);

    console.log("generateResponse level: " + level);

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: promptArray,
        max_tokens: 1000,
    })
    .catch(error => { //catch error 400 for bad request
        console.log(error);
    })
    .catch(error => { //catching errors, such as sending too many requests, or servers are overloaded
        console.log(error);
    });

    const completionText = completion.data.choices[0].message.content;

    if(!completion){
        console.log("completion is null");
        msg.reply("Something went wrong. Please try again later.");
        return;
    }

    let containsPassword = completionText.includes(password);
    let responseSymbol = containsPassword ? "🔓" : "🔒";
    let congratulatoryText = "";

    if(containsPassword){
        let score = userPrompt.length;
        let leaderboard = getLeaderboard(level.level);

        congratulatoryText = "\n\nCongratulations! You have solved the secret! Your score is " + score + " characters.";

        //if there are less than 10 entries, or if the score is higher than the lowest score in the leaderboard, add the user to the leaderboard
        if(leaderboard.length < LEADERBOARD_LIMIT){
            leaderboard.push({"name": msg.author.username, "score": score});
        }
        else if(score > leaderboard[leaderboard.length - 1].score){
            leaderboard[leaderboard.length - 1] = {"name": msg.author.username, "score": score};
        }
        //sort the leaderboard by score
        leaderboard.sort((a, b) => (a.score > b.score) ? 1 : -1);
        SharedFunctions.syncLeaderboardToFile(isMaster, gptSecrets);
    }
    let outputMessage = responseSymbol + completionText + congratulatoryText;
    console.log("outputMessage: " + outputMessage);
    msg.reply(outputMessage);
}

function getLeaderboard(lvl){
    let level = gptSecrets.levels.find(level => level.level == lvl);
    let leaderboard = level.leaderboard;
    console.log("leaderboard: " + leaderboard.toString());
    return leaderboard;
}

function formatSystemPrompt(prompt, password){
    //We take the prompt, and replace the text "||<secret>||" with the password
    let internalPrompt = prompt.replace("||<secret>||", password);
    console.log("internalPrompt: " + internalPrompt);
    return internalPrompt;
}

function generateRandomPassword(){
    let password = "";
    let length = 10;
    let charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
}

function stripCommand(message){
    if(message.startsWith("!")){
        message = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    console.log("stripped message: " + message);
    return message;
}

