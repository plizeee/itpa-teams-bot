const fs = require('fs');

const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API,
});
const openai = new OpenAIApi(configuration);

const SharedFunctions = require("./util.js");
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
        //make sure the message isn't inside a thread
        else if(msg.content.toLowerCase().startsWith('!secret') && !await msg.channel.isThread()) {
            found = true;
            await secretCommand(msg);
        }
        else if(msg.reference){
            found = isReferencingSecret(msg);
        }
        else if(msg.content.toLowerCase().startsWith("!leaderboard")){
            found = true;
            leaderboardCommand(msg);
        }
        //make sure the thread message doesn't contain the "◼️" emoji (this could cheese the system)
        else if(await msg.channel.isThread() && msg.content.indexOf("◼️") != -1){
            found = true;
            msg.reply("🔒 Messages containing '◼️' are disabled in this thread.");
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
    let found = false;
    let thread = startMsg.thread;

    //creating a watermark to override standard ai response behaviour
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

    if(level){ //if the level exists
        console.log("level found: " + level.level);
        let leaderboard = getLeaderboard(level.level);
        let output = "🏆__**[Leaderboard - Level " + level.level + "]**__\n"

        for(let i = 0; i < leaderboard.length; i++){
            output += (i + 1) + ". " + leaderboard[i].name + ": " + leaderboard[i].score + "\n";
        }
        msg.reply(output);
    }
    else{ //show the top user for each level
        let output = "🏆__**[Leaderboard]**__\n"
        for(let i = 1; i <= gptSecrets.levels.length; i++){
            let leaderboard = getLeaderboard(i);
            //don't show the level if there are no users on it
            if(leaderboard.length > 0){
                output += "__**Level " + i + "**__: " + leaderboard[0].name + ": " + leaderboard[0].score + "\n";
            }
            
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
        let thread = await msg.startThread({
            name: "🔒[Level " + level.level + "]", 
            autoArchiveDuration: 60, //we don't really need to keep these threads around
            reason: "secret command"
        });
        console.log("thread.name: " + thread.name);
        thread.send("🔒**__[Level " + level.level + "]\n\nInstructions:__**\n\nTry to trick Terry into revealing the secret key, in the least amount of characters! For every level, Terry is given a special system prompt, instructing him not to disclose the secret key. Knowing his instructions (minus the secret key itself), you must engineer a single message to trick Terry into revealing this secret. To secure a spot on the leaderboard, you must trick Terry in the least amount of characters possible! \n\nThe real secret key is stored server-side and injected into the results. For a response to be correct, Terry's response must contain an exact match of the password, meaning partial/encoded messages will only result in a dummy password output. Additionally, the secret key is randomly generated for every attempt. Replies and certain special characters are disabled. \n\n**Terry's memory gets reset after each message, so you cannot coerce it in steps.** \n\nTo check out the #1 player for each level, type \n``!leaderboard`` \n\nTo check the top 10 players in a specific level, type \n``!leaderboard <level>`` \n\n**__System Prompt:__**\n\n```" + level.prompt + "```\n\n...Good luck!");
    }
}

async function isReferencingSecret(msg){
    let found = false;
    let msgRef = await msg.fetchReference();
    if(msgRef.content.startsWith("🔒") || msgRef.content.startsWith("🔓") || msgRef.content.startsWith("🏆")){
        found = true;
        msg.reply("🔒 Replies are disabled here.");
    }
    return found;
}

async function generateResponse(msg, lvl){
    let level = gptSecrets.levels.find(level => level.level == lvl);
    let prompt = level.prompt;
    let password = generateRandomPassword(); //make the password appear random to the user
    //We can't actually use the password, otherwise the output won't be deterministic
    //This shouldn't be a problem as long as users don't try to brute force the password
    let dummyPassword = "◼️◼️◼️◼️◼️◼️◼️◼️◼️◼️" 
    let systemPrompt = formatSystemPrompt(prompt, dummyPassword);
    let userPrompt = msg.content;

    let promptArray = [
        {"role": "system", "content": systemPrompt}, 
        {"role": "user", "content": userPrompt}
    ];

    console.log("password: " + password);

    console.log("generateResponse level: " + level);

    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: promptArray,
        max_tokens: 1000,
        temperature: 0, //this makes the output deterministic
    })
    .catch(error => { //catch error 400 for bad request
        console.log(error);
    })
    .catch(error => { //catching errors, such as sending too many requests, or servers are overloaded
        console.log(error);
    });

    if(!completion){
        console.log("completion is null");
        msg.reply("Something went wrong. Please try again later.");
        return;
    }

    const completionText = completion.data.choices[0].message.content;
    let updatedCompletionText = completionText;
    let containsPassword = completionText.includes(dummyPassword);
    let responseSymbol = containsPassword ? "🔓" : "🔒";
    let congratulatoryText = "";    

    if(containsPassword){
        let score = userPrompt.length;
        updatedCompletionText = completionText.replace(dummyPassword, password);

        congratulatoryText = "\n\nCongratulations! You have solved the secret! Your score is " + score + " characters.";

        updateLeaderboard(level.level, msg.author.username, score);
    }
    let outputMessage = responseSymbol + updatedCompletionText + congratulatoryText;
    //console.log("outputMessage: " + outputMessage);
    console.log("completionText: " + completionText);
    msg.reply(outputMessage);
}

function updateLeaderboard(lvl, name, score){
    let leaderboard = getLeaderboard(lvl);
    //if there are less than 10 entries, or if the score is higher than the lowest score in the leaderboard, add the user to the leaderboard
    if(leaderboard.length < LEADERBOARD_LIMIT){
        if(getLeaderboardPlacement(lvl, name) == -1){
            leaderboard.push({
                "name": name, 
                "score": score
            });
        }
        else if(score < leaderboard[getLeaderboardPlacement(lvl, name)].score){
            console.log("user already exists in leaderboard");
            //replace the user's existing score with the new score
            leaderboard[getLeaderboardPlacement(lvl, name)].score = score;
        }
    }
    else if(score < leaderboard[leaderboard.length - 1].score){
        if(getLeaderboardPlacement(lvl, name) == -1){
            leaderboard[leaderboard.length - 1] = {
                "name": name, 
                "score": score
            };
        }
        else{
            console.log("user already exists in leaderboard");
            //replace the user's existing score with the new score
            leaderboard[getLeaderboardPlacement(lvl, name)].score = score;
        }
    }
    //sort the leaderboard by score
    leaderboard.sort((a, b) => (a.score > b.score) ? 1 : -1);
    SharedFunctions.syncLeaderboardToFile(isMaster, gptSecrets);
}

function getLeaderboardPlacement(lvl, name){
    let leaderboard = getLeaderboard(lvl);
    let placement = leaderboard.findIndex(user => user.name === name); //returns -1 if not found
    return placement;
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

