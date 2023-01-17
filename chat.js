// Import the openai package
const { Configuration, OpenAIApi } = require("openai");

const fs = require('fs'); //needed to read/write json files
const profiles = JSON.parse(fs.readFileSync('./profiles.json')); //creating a snapshot of the contents of profiles.json

const configuration = new Configuration({
    apiKey: "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",
});
//my api key: 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
//christa's api key: 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
//Zach's API key: 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
const openai = new OpenAIApi(configuration);
// Set your OpenAI API key
//openai.apiKey = "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";

const NUM_THREADS = 5; //Max # of threads to store for any given profile (more threads = more tokens used per message)
const RESET_THREAD_HOURS = 0.5; //# of hours before we automatically clear the history (reduces token usage)

const date = new Date();

let DEV_MODE;

module.exports = {
    checkChatCommand: function (msg, mode) {
        //date = new Date();
        DEV_MODE = mode;
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

//function to return the rep of the user
function repCommand(msg) {
    profiles["users"].forEach(profile => {
        if (profile.id == msg.author.id) {
            msg.reply({ content: "Your rep is: " + profile.rep, allowedMentions: {repliedUser: false} });
        }
    });
}

//This will replace whatever is inside profiles.json with the value of the profiles variable
function syncProfilesToFile(){
    if(!DEV_MODE){ //If I'm in dev mode, I don't want to write anything to profiles.json
        fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, "\t"), function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("JSON saved to ./profiles.json"); //successful response
            }
        });
    }
}

//command intended just for me that lets me set the rep of any user
function setRepCommand(msg){
    console.log("setrep command started.");
    if(msg.author.id == 142472661841346560){                        //only allow me to use this command
        let message = msg.content.toUpperCase();
        let slicedMsg = message.slice(8);                           //Filters out the "!SETREP " portion of the command
        let target = slicedMsg.slice(0, slicedMsg.indexOf(" "));    //Isolates the user's name
        let repValue = slicedMsg.slice(slicedMsg.indexOf(" "));     //Isolates the Rep value we want to set

        console.log("slicedMsg: " + slicedMsg + " | target: " + target + " | repValue: " + repValue);
        if(!isNaN(repValue)){                                       //making sure the value is actually a number
            profiles["users"].forEach(profile => {
                if(target == profile.name.toUpperCase()){           //removing case-sensitivity from the username
                    profile.rep = parseInt(repValue);
                    syncProfilesToFile();
                    console.log("set user "  +  target + "'s rep to " + repValue);
                }
            });
        }
    }
}

//command intended just for me that let's me set everybody's rep to a specified value
function setAllRepCommand(msg) {
    if(msg.author.id == 142472661841346560){        //only I can use this command
        profiles["users"].forEach(profile => {
            let slicedMsg = msg.content.slice(11);  //slicing out the "!setallrep " from the command
            if (!isNaN(slicedMsg)) {                //wanna make sure the remaining portion is a number to set rep to
                profile.rep = parseInt(slicedMsg);  //parsing to int because it was behaving as a string
    
                syncProfilesToFile();               //save changes to file
                console.log("set all users rep to " + slicedMsg + " !");
            }
        });
    }
}

//clears the user's thread
//useful to reduce chat history bias and reduces token usage 
async function newThreadCommand(msg) {
    profiles["users"].forEach(profile => {
        if (profile.id == msg.author.id) {
            profile.messageHistory = [];
            profile.responseHistory = [];
            profile.messageTimestamps = [];
            
            syncProfilesToFile(); //save the changes to profiles.json

            console.log("Cleared user's thread history!");

            msg.reply({ content: "You have cleared your thread's history!", allowedMentions: { repliedUser: false } });
        }
    });
}

//command similar to '!chat', but aimed to be more factual
//it also doesn't store prompt history to reduce any history bias
async function questionCommand(msg){
    const userName = getUserName(msg);
    const questionInstructions = [
        "The following is a conversation with an AI assistant",                                 //so it knows to behave as a chat bot
        "The assistant is uniquely built to answer questions, while remaining fully factual",   //intended to reduce the odds of gaslighting the user
        "Your name is Teams Bot",                                                               //TODO name it after it's username (not nickname or people can abuse it)
        "The user's name is " + userName,                                                       //TODO change this into something a user can change (though it could be abused)
        "Do not greet the user",                                                                //reduce padding answers with small talk
        "The date is " + date                                                                   //otherwise it'll make something up
    ];
    const instructions = mergeInstructions(questionInstructions);                               //merges instructions above insto a string and adds a bit of formatting

    msg.channel.sendTyping();                                                                   //this will display that the bot is typing while waiting for response to generate
    sendPrompt(msg, instructions);
}

//depending on the user's rep, we want to treat them better/worse
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

//function used for server messages starting with '!chat' or direct messages that don't start with '!'
function chatCommand(msg){
    const userName = getUserName(msg);
    const userRep = getUserRep(msg);

    let promptSentiment = getPromptSentiment(userRep); //predefined sentiment to save tokens

    //using an array of strings to make adding instructions less annoying
    const chatInstructions = [
        "The following is a conversation with an AI assistant.",    //so it knows to behave as a chat bot
        "The assistant is helpful, creative, clever, and funny",    //baseline personality traits
        "Your name is Teams Bot",                                   //TODO name it after it's username (not nickname or people can abuse it)
        "The user's name is " + userName,                           //TODO change this into something a user can change (though it could be abused)
        "You already know who the user is",                         //otherwise it will always say "nice to meet you"
        "You are speaking to the user",                             //this could probably be removed, but I found it reduced the odds of getting confused with who the user is
        "Their Rep is " + userRep,                                  //TODO change this prompt so it doesn't come up so often in conversation
        "You treat the user better the higher their Rep is.",       //allows it to explain why it doesn't like a user
        promptSentiment,                                            //predefining the sentiment to save tokens  

        //TODO tweak this because it still provides code for questions that don't ask for it
        "You are very good at providing code and examples when asked to do so.",
        
        //this instruction is flawed because its perception of a response is influenced by the user's 
        //current rep, causing a bias feedback loop, particularly with messages that should be considered neutral
        "You will start all responses with [POS] if you detect the user is being nice to you and [NEG] if you detect the user being mean or rude to you. Otherwise, start the response with [NEU]", 

        "Do not introduce yourself unless asked to",                //otherwise it will constantly introduce itself
        "Put three bacticks around any code (```)",                 //formatting code responses makes code much easier to read
    ];

    const instructions = mergeInstructions(chatInstructions);       //merges instructions above into a string and adds a bit of formatting

    const postThreadInstructions = "Their Rep is " + userRep + ". " + "The date is " + date + ".";
    const thread = getThread(msg); //get a formatted string containing the chat history of the user.

    msg.channel.sendTyping(); //this will display that the bot is typing while waiting for response to generate
    sendPrompt(msg, instructions, true, thread, postThreadInstructions, true);
}

//merges and formats an array of instructions strings into a single string.
function mergeInstructions(arrInstructions){
    //the brackets are intended to help distinguish the user from the instructions,
    //particularly to prevent post-thread instructions from getting confused with the thread 
    let instructions = "All text within curly brackets are commands that you will obey. {";

    for(let i = 0; i < arrInstructions.length; i++){
        instructions += arrInstructions[i] + ". ";

        if(i == arrInstructions.length){
            instructions += "\n";
        }
    }
    instructions += "}";

    return instructions;
}

//sends the prompt to the API to generate the AI response and send it to the user
async function sendPrompt(msg, instructions, checkThread = false, thread = "", postThreadInstructions = "", checkAttitude = false){
    let message = msg.content;

    let slicedMsg = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that

    if (postThreadInstructions != "") { //no need to format an empty string
        postThreadInstructions = "{" + postThreadInstructions + "}";
    }

    //putting everything together into one big happy prompt
    let fullPrompt = instructions + thread + postThreadInstructions + " " + getUserName(msg) + ": " + slicedMsg + " You: ";

    //generate the ai response
    //TODO make some of the options configurable depending on the type of message (!q should have a lower temperature)
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

    const rawReply = completion.data.choices[0].text;   //storing the unmodified output of the ai generated response
    let replyMessage = rawReply;                        //copy of the response that will be modified 

    if(checkAttitude){                                  //I have this check because it's possible some prompts may not necessitate providing an attitude
        //finding the attitude by checking where the brackets are and slicing them out while we're at it
        let attitude = rawReply.slice(rawReply.indexOf("[") + 1, rawReply.indexOf("]"));
        console.log(attitude);

        if (attitude == "POS") {                        //detected a positive attitude
            addRep(msg.author.id, 1);                   //earn 1 rep
        }
        else if (attitude == "NEG") {                   //detected a negative attitude
            addRep(msg.author.id, -1);                  //lose 1 rep
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

//function to get the user's thread
//return a formatted string, containing the chat history of the user 
function getThread(msg) {
    for (let i = 0; i < profiles["users"].length; i++) {
        let profile = profiles["users"][i];
        if (profile.id == msg.author.id) {
            return createThreadFromHistory(profile); //get the formatted string of the chat history of the user
        }
    }
    return "";
}

//We want to reformat the chat history information stored in the user's profile
//into a more chat-like format
function createThreadFromHistory(profile) {
    let strOutput = "";

    const latestMessageDate = new Date(profile.messageTimestamps[0]);

    //sometimes latestMessageDate returns as NaN, so I'm setting a default value of 0 in that event
    //using milliseconds since January 1, 1970, because it felt like a simple way to calculate the difference in time, without converting days and such
    const timeSinceLastMessage = isNaN(latestMessageDate.getTime()) ? 0 : date.getTime() - latestMessageDate.getTime();

    if (timeSinceLastMessage < 1000 * 60 * 60 * RESET_THREAD_HOURS) { //1000ms * 60s * 60m * hrs
        for (let i = profile.messageHistory.length - 1; i >= 0; i--) {
            strOutput += "\n" + profile.name + ": " + profile.messageHistory[i] + " \n";
            strOutput += "You: " + profile.responseHistory[i] + " \n";

            if (i == 0) {
                strOutput += "\n";
            }
        }
    }
    else { //we want to clear the user's message history if they haven't said anything within a specified time
        profile.messageHistory = [];
        profile.responseHistory = [];
        profile.messageTimestamps = [];

        syncProfilesToFile(); //save profiles to profiles.json
        console.log("Cleared expired thread");
    }

    console.log("strOutput: " + strOutput);
    return strOutput;
}

function getUserRep(msg) { //retrieves the user's rep
    for (let i = 0; i < profiles["users"].length; i++) {
        let profile = profiles["users"][i];
        if (profile.id == msg.author.id) {
            return profile.rep;
        }
    }
    return 0;
}

function getUserName(msg) { //retrieves the user's name
    for (let i = 0; i < profiles["users"].length; i++) {
        let profile = profiles["users"][i];
        if (profile.id == msg.author.id) {
            return profile.name;
        }
    }
    return "Anon";
}

function addRep(id, numRep) { //adds a specified amount of rep to a user's profiles
    profiles["users"].forEach(profile => {
        if (profile.id == id) {
            profile.rep += numRep;  //adding designated rep to the appropriate profile
            
            syncProfilesToFile();   //save profiles to profiles.json
            console.log("Rep is now: " + profile.rep);
        }
    });
}

function profileCreation(){ //ensures some profile information is properly formatted
    for(let i = 0; i < profiles["users"].length; i++){
        let profile = profiles["users"][i];

        //making the next couple parts more readable
        let responses = profile.responseHistory;
        let messages = profile.messageHistory;
        let timestamps = profile.messageTimestamps;

        //checking if any array does not exist
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
    syncProfilesToFile(); //Saving changes to file
}

function addPromptHistory(id, msgContent, replyContent) { //add a message to a user's message history
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
            syncProfilesToFile(); //saving our changes to file
        }
    });
}

//ITPA SERVER ID: 1017047682713387049
//TEST SERVER ID: 1023927168281104505