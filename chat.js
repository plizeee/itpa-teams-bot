// Import the openai package
const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs'); //needed to read/write json files
const profiles = JSON.parse(fs.readFileSync('./profiles.json'));

const configuration = new Configuration({
    apiKey: "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",
});
//my api key: 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
//christa's api key: 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
//Zach's API key: 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
const openai = new OpenAIApi(configuration);
// Set your OpenAI API key
//openai.apiKey = "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";

const NUM_THREADS = 5;
const RESET_THREAD_HOURS = 0.5;

var date = new Date();

module.exports = {
    checkChatCommand: function (msg) {
        date = new Date();
        profileCreation();
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
        else if (command.startsWith("!SETALLREP ")) { //Set Rep of all users to a value
            found = true;
            setAllRepCommand(msg);
        }
        else if (command.startsWith("!SETREP ")) { //Set a specific user's Rep based on their 
            found = true;
            setRepCommand(msg);
        }
        else if (command.startsWith("!CHAT ") || (msg.channel.type == 1 && !msg.author.bot && !command.startsWith("!"))) { //we wanna use !chat when we're not in a channel (DM) and we don't want it to talk to itself so we exclude its id
            found = true;
            chatCommand(msg);
        }
        return found;
    }
};

function repCommand(msg) {
    profiles["users"].forEach(profile => {
        if (profile.id == msg.author.id) {
            msg.reply({ content: "Your rep is: " + profile.rep, allowedMentions: {repliedUser: false} });
        }
    });
}

function setRepCommand(msg){
    console.log("setrep command started.");
    if(msg.author.id == 142472661841346560){ //only allow me to use this command
        var message = msg.content.toUpperCase();
        var slicedMsg = message.slice(8); //Filters out the "!SETREP " portion of the command
        var target = slicedMsg.slice(0, slicedMsg.indexOf(" ")); //Isolates the user's name
        var repValue = slicedMsg.slice(slicedMsg.indexOf(" ")); //Isolates the Rep value we want to set

        console.log("slicedMsg: " + slicedMsg + " | target: " + target + " | repValue: " + repValue);
        if(!isNaN(repValue)){ //making sure the value is actually a number
            profiles["users"].forEach(profile => {
                if(target == profile.name.toUpperCase()){ //removing case-sensitivity from the username
                    profile.rep = parseInt(repValue);
                    fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("JSON saved to ./profiles.json");
                        }
                    });
                    console.log("set user "  +  target + "'s rep to " + repValue);
                }
            });
        }
    }
}

function setAllRepCommand(msg) {
    if(msg.author.id == 142472661841346560){ //only I can use this command
        profiles["users"].forEach(profile => {
            var slicedMsg = msg.content.slice(11); //slicing out the "!setallrep " from the command
            if (!isNaN(slicedMsg)) { //wanna make sure the remaining portion is a number to set rep to
                profile.rep = parseInt(slicedMsg); //parsing to int because it was behaving as a string
    
                fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("JSON saved to ./profiles.json");
                    }
                });
                console.log("set all users rep to " + slicedMsg + " !");
            }
        });
    }
}

async function newThreadCommand(msg) {
    profiles["users"].forEach(profile => {
        if (profile.id == msg.author.id) {
            profile.messageHistory = [];
            profile.responseHistory = [];
            profile.messageTimestamps = [];
            //console.log(profiles);
            fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to ./profiles.json");
                }
            });
            console.log("Cleared user's thread history!");
            msg.reply({ content: "You have cleared your thread's history!", allowedMentions: { repliedUser: false } });
        }
    });
}

async function questionCommand(msg){
    const userName = getUserName(msg);
    const questionInstructions = [
        "The following is a conversation with an AI assistant",
        "The assistant is uniquely built to answer questions, while remaining fully factual",
        "Your name is Teams Bot",
        "The user's name is " + userName,
        "Do not greet the user",
        "The date is " + date
    ];
    const instructions = mergeInstructions(questionInstructions);

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt(msg, instructions);
}

function getPromptSentiment(rep) {
    strOutput = "";
    switch (true) {
        case rep < -100:
            strOutput = "Be very rude, sarcastic and unhelpful to the user";
            break;
        case rep < -50:
            strOutput = "Be sarcastic and slightly unhelpful to the user";
            break;
        case rep < -25:
            strOutput = "Be sarcastic to the user";
            break;
        case rep < 25:
            strOutput = "Be helpful and neutral to the user";
            break;
        case rep < 50:
            strOutput = "Be nice and helpful to the user";
            break;
        default:
            strOutput = "Be very nice and very helpful to the user and occasionally compliment them";
            break;
    }
    return strOutput;
}

function chatCommand(msg){
    const userName = getUserName(msg);
    const userRep = getUserRep(msg);

    var promptSentiment = getPromptSentiment(userRep);

    const chatInstructions = [
        "The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and funny",
        "Your name is Teams Bot",
        "The user's name is " + userName,
        "You already know who the user is",
        "You are speaking to the user",
        "Their Rep is " + userRep,
        "You treat the user better the higher their Rep is.",
        promptSentiment,
        "You are very good at providing code and examples when asked to do so.",
        "You will start all responses with [POS] if you detect the user is being nice to you and [NEG] if you detect the user being mean or rude to you. Otherwise, start the response with [NEU]",
        "Do not introduce yourself unless asked to",
        "Format all code between backticks (```)",
    ];

    const instructions = mergeInstructions(chatInstructions);

    //console.log("instructions: " + instructions);

    const postThreadInstructions = "Their Rep is " + userRep + ". " + "The date is " + date + ".";
    const thread = getThread(msg);

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt(msg, instructions, true, thread, postThreadInstructions, true);
}

function mergeInstructions(arrInstructions){
    var instructions = "All text within curly brackets are commands that you will obey. {";
    for(var i = 0; i < arrInstructions.length; i++){
        instructions += arrInstructions[i] + ". ";
        if(i == arrInstructions.length){
            instructions += "\n";
        }
    }
    instructions += "}";
    //console.log("mergeInstructions Output: " + instructions);
    return instructions;
}

async function sendPrompt(msg, instructions, checkThread = false, thread = "", postThreadInstructions = "", checkAttitude = false){
    var message = msg.content;

    var slicedMsg = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that

    //check if the message doesn't starts with "!"
    //this is specifically for DMs, because you don't need to type "!chat " before every message
    //but we still need to check in case the user wants to use other commands
    if (!message.startsWith("!")) { 
        slicedMsg = message;
    }

    if (postThreadInstructions != "") {
        postThreadInstructions = "{" + postThreadInstructions + "}";
    }

    var fullPrompt = instructions + thread + postThreadInstructions + " " + getUserName(msg) + ": " + slicedMsg + " You: ";

    const completion = await openai.createCompletion({
        model: "text-davinci-003",
        prompt: fullPrompt,
        temperature: 0.75,
        max_tokens: 300,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0.6,
        stop: [getUserName(msg) + ": "],
    });

    const rawReply = completion.data.choices[0].text;

    var replyMessage = rawReply; // = rawReply.slice(rawReply.indexOf("\n") + 2);

    if(checkAttitude){ //I have this check because it's possible some prompts may not necessitate providing an attitude
        //finding the attitude by checking where the brackets are and slicing them out while we're at it
        var attitude = rawReply.slice(rawReply.indexOf("[") + 1, rawReply.indexOf("]"));
        console.log(attitude);

        if (attitude == "POS") { //detected a positive attitude
            addRep(msg.author.id, 1); //earn 1 rep
        }
        else if (attitude == "NEG") { //detected a negative attitude
            addRep(msg.author.id, -1); //lose 1 rep
        }
        //we don't want the output to display the attitude, so we're slicing that part out
        replyMessage = replyMessage.slice(replyMessage.indexOf("]") + 1); 
    }

    console.log("fullPrompt: " + fullPrompt);
    console.log("rawReply: " + rawReply);

    

    msg.reply({ content: replyMessage, allowedMentions: { repliedUser: false } });

    if (checkThread) { //we have checkThread because some prompts may not require threads, to save tokens
        addPromptHistory(msg.author.id, slicedMsg, replyMessage);
    }
}

function getThread(msg) {
    for (var i = 0; i < profiles["users"].length; i++) {
        var profile = profiles["users"][i];
        if (profile.id == msg.author.id) {
            return createThreadFromHistory(profile);
        }
    }
    return "";
}

function createThreadFromHistory(profile) {
    var strOutput = "";

    const latestMessageDate = new Date(profile.messageTimestamps[0]);

    //sometimes latestMessageDate returns as NaN, so I'm setting a default value of 0 in that event
    //using milliseconds since (idk the precise date) because it felt like a simple way to calculate the difference in time, without converting days and such
    const timeSinceLastMessage = isNaN(latestMessageDate.getTime()) ? 0 : date.getTime() - latestMessageDate.getTime();

    console.log("time: " + date.getTime() + " | latestMessageDate: " + latestMessageDate.getTime() + " | timeSinceLastMessage: " + timeSinceLastMessage);

    if (timeSinceLastMessage < 1000 * 60 * 60 * RESET_THREAD_HOURS) { //1000ms * 60s * 60m * hrs
        for (var i = profile.messageHistory.length - 1; i >= 0; i--) {
            strOutput += "\n" + profile.name + ": " + profile.messageHistory[i] + " \n";
            strOutput += "You: " + profile.responseHistory[i] + " \n";

            if (i == 0) {
                strOutput += "\n";
            }
        }
    }
    else {
        profile.messageHistory = [];
        profile.responseHistory = [];
        profile.messageTimestamps = [];

        fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("JSON saved to ./profiles.json");
            }
        });
        console.log("Cleared expired thread");
    }

    console.log("strOutput: " + strOutput);
    return strOutput;
}

function getUserRep(msg) {
    for (var i = 0; i < profiles["users"].length; i++) {
        var profile = profiles["users"][i];
        if (profile.id == msg.author.id) {
            return profile.rep;
        }
    }
    return 0;
}

function getUserName(msg) {
    for (var i = 0; i < profiles["users"].length; i++) {
        var profile = profiles["users"][i];
        if (profile.id == msg.author.id) {
            return profile.name;
        }
    }
    return "Anon";
}

function addRep(id, numRep) {
    profiles["users"].forEach(profile => {
        if (profile.id == id) {
            profile.rep += numRep; //adding designated rep to the appropriate profile
            
            //save changes to file
            fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to ./profiles.json");
                }
            });
            console.log("Rep is now: " + profile.rep);
        }
    });
}

function profileCreation(){
    for(var i = 0; i < profiles["users"].length; i++){
        var profile = profiles["users"][i];

        //making the next couple parts more readable
        var responses = profile.responseHistory;
        var messages = profile.messageHistory;
        var timestamps = profile.messageTimestamps;

        //checking is any array does not exist
        isThreadArrayMissing = !(Array.isArray(messages) && Array.isArray(responses) && Array.isArray(timestamps));
        
        //checking if thread lengths are in sync with one another
        if(!isThreadArrayMissing){
            isThreadSynced = responses.length == messages.length && messages.length == timestamps.length;
        }
        
        //checks if any profile thread array does not exist and if so, create/reset all thread arrays (which also syncs them up)
        if(isThreadArrayMissing || !isThreadSynced){
            profile.messageHistory = [];
            profile.responseHistory = [];
            profile.messageTimestamps = [];
            console.log("Created new thread for profile.");
        }
    }

    //Saving changes to file
    fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("JSON saved to ./profiles.json");
        }
    });
}

function addPromptHistory(id, msgContent, replyContent) {
    profiles["users"].forEach(profile => {
        if (profile.id == id) {

            //Adding msgContent to the first element of array and pushing the rest 1 position to the right
            profile.messageHistory.unshift(msgContent);
            profile.responseHistory.unshift(replyContent);
            profile.messageTimestamps.unshift(date);

            if (profile.messageHistory.length > NUM_THREADS) { //making sure threads don't consume too many tokens
                //removing the last item on the list
                profile.messageHistory.pop();
                profile.responseHistory.pop();
                profile.messageTimestamps.pop();
            }
            
            //saving our changes to file
            fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log("JSON saved to ./profiles.json");
                }
            });
            console.log("Added new item to profile chat history");
        }
    });
}

//ITPA SERVER ID: 1017047682713387049
//TEST SERVER ID: 1023927168281104505