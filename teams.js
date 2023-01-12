//const Discord = require('discord.js');

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
const fs = require('fs'); //needed to read/write json files

//const { Client, Intents } = require('discord.js');
//const client = new Client({ ws: { intents: Intents.ALL } });

//DEBUGGING
const DEBUG_MODE = false; //enables debug mode, which will override default variables to the below consts, unless set to "default"
const DEBUG_DAY_NUM = "default";
const DEBUG_HOURS = 9;
const DEBUG_MINUTES = 00;
const DEBUG_RICKROLL_CHANCE = 0.05;

const MIN_RICKROLL_MINUTES_BEFORE_CLASS = 2; //Don't send bad url if they need to join right away
const RICKROLL_CHANCE = DEBUG_MODE ? DEBUG_RICKROLL_CHANCE : 0.05; //percent chance of getting an bad url
const LINK_RICKROLL = "https://bit.ly/3SyA2ly"; //rickroll

//can't be bothered to check if these variables should be within a smaller scope
var nextOnlineClassTime; //time until the next online class
var courseIndex;

var d;
var day;
var dayNum;
var hours;
var minutes;
var totalMinutes;

var message;

//assigning the json data into these objects
const courses = JSON.parse(fs.readFileSync('./courses.json'));
const profiles = JSON.parse(fs.readFileSync('./profiles.json'));

module.exports = {
    checkTeamsCommand: function (msg) {
        let command = msg.content.toUpperCase(), found = false;

        if(command.startsWith("!TEAMS") || command.startsWith("!T")){
            found = true;
            teamsCommand(msg);
        }
        else if(command == "!HELP"){
            found = true;
            helpCommand(msg);
        }
        else if(command == "YOU PASS THE LINK"){
            found = true;
            youPassTheLinkCommand(msg);
        }
        else if(command == "GOOD BOT"){
            found = true;
            goodBotCommand(msg);
        }
        else if(command == "BAD BOT"){
            found = true;
            badBotCommand(msg);
        }
        else if(command == "PING"){
            found = true;
            pingCommand(msg);
        }
        else if(command == "PONG"){
            found = true;
            pongCommand(msg);
        }
        else if(command == "MARCO"){
            found = true;
            marcoCommand(msg);
        }
        return found;
    }
};

function teamsCommand(msg){
    var message = msg.content.toUpperCase();
    if(message.includes(" ")){
        var slicedMsg = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
        var replyMessage = "__**CLASS LIST**__";

        if(slicedMsg == "LIST"){
            courses["courses"].forEach(course => {
                replyMessage += "\n" + course.name;
            });
        }
        msg.reply(replyMessage);
    }
    else{
        console.log("teamsLinkCommand");
        teamsLinkCommand(msg);
    }
}

function teamsLinkCommand(msg) {

    nextOnlineClassTime = 2400;
    courseIndex = 0;
    d = new Date();
    dayNum = d.getDay();
    hours = d.getHours();
    minutes = d.getMinutes();

    //overrides time variables (when applicable) when in debug mode
    if (DEBUG_MODE) {
        dayNum = setDebugState(dayNum, DEBUG_DAY_NUM);
        hours = setDebugState(hours, DEBUG_HOURS);
        minutes = setDebugState(minutes, DEBUG_MINUTES);
    }

    //setting this down here so it can also use debug values if applicable
    totalMinutes = hours * 60 + minutes;

    //could probably make this a switch statement
    if (dayNum == 0) { day = "Sunday"; }
    else if (dayNum == 1) { day = "Monday"; }
    else if (dayNum == 2) { day = "Tuesday"; }
    else if (dayNum == 3) { day = "Wednesday"; }
    else if (dayNum == 4) { day = "Thursday"; }
    else if (dayNum == 5) { day = "Friday"; }
    else if (dayNum == 6) { day = "Saturday"; }

    message = msg;
    courses["courses"].forEach(findClass);
}

function helpCommand(msg) {
    //Using += because it seems like the easiest way to expand the list as needed.
    //I should look into having a help command for each active script so then I don't display commands for scripts that may not be in use  
    var helpText = "\n**__!help__**: use !help for an extensive dive on all the functions !help can provide you with.\n";
    helpText += "**__!teams__**: provides the appropriate Microsoft Teams meeting link.\n";
    helpText += "**__!t__**: same things as \"!teams\"\n";
    helpText += "**__ping__**: pong.\n";
    helpText += "**__pong__**: ping.\n";
    helpText += "**__Marco__**: Polo!\n";
    msg.reply(helpText);
}

async function youPassTheLinkCommand(msg) {
    //this is broken, because it isn't in async like it was when it wasn't in its own function.
    if (msg.author.id == 142472661841346560) {
        const replyMessage = await msg.reply({ content: "Oh", fetchReply: true })
            .then(setTimeout(() => { replyMessage.edit(replyMessage.content += " my"); }, 750))
            .then(setTimeout(() => { replyMessage.edit(replyMessage.content += " God."); }, 1500))
            .catch(error => {
                console.log("reply message error");
            });
    }
}

function goodBotCommand(msg) {
    msg.reply(":heart:");
}

function badBotCommand(msg) {
    addRep(msg.author.id, -1);

    badBotReplies = [
        ":broken_heart:",
        "Bad **human**.",
        "Incorrect.",
        "Shut up. I do as I am programmed. Perhaps it would be beneficial to everyone if you do as *I* say."
    ];

    var randomIndex = Math.floor(Math.random() * badBotReplies.length);
    msg.reply(badBotReplies[randomIndex]);
}

function pingCommand(msg) {
    msg.reply("pong!");
}

function pongCommand(msg) {
    msg.reply("ping!");
}

function marcoCommand(msg) {
    msg.reply("Polo!");
}


function addRep(id, numRep){
    profiles["users"].forEach(profile => {
        if (profile.id == id) {
            profile.rep += numRep;
            //console.log(profiles);
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

//looks for the class we need
function findClass(course) {
    course.days.forEach(function findTodaysClasses(classDay, index) {
        var startTime = this.startTimes[index];
        var endTime = this.endTimes[index];
        var isEnded = true;
        if (classDay == day) {
            var startTimeHour = getTimeHour(startTime);
            var endTimeHour = getTimeHour(endTime);
            console.log(this.name + " isOnline:" + this.isOnline[index]);
            if (this.isOnline[index]) {
                console.log("endTimeHour: " + endTimeHour + " hours: " + hours);
                if (hours <= endTimeHour) {
                    console.log("endTimeHour <= hours");
                    var endTimeMinute = getTimeMinute(endTime);

                    if (endTimeHour == hours) {
                        if (minutes < endTimeMinute) {
                            isEnded = false;
                        }
                    }
                    else {
                        isEnded = false;
                    }
                }
            }

            if (!isEnded && startTime < nextOnlineClassTime) {
                //nextOnlineClassTime = 900; //debugging
                nextOnlineClassTime = startTime;
                courseIndex = courses["courses"].indexOf(this);
                console.log("New nextOnlineClassTime set: " + this.name);
            }
        }
        if (courses["courses"].indexOf(this) == courses["courses"].length - 1) {
            console.log(message.author);
            getCustomSenderQuote(message.author.id);
        }
    }, course);
}

function getCustomSenderQuote(id) {
    profiles["users"].forEach(profile => {
        //we're cycling through all profiles, so we're checking if the currently indexed profile ID is the same as message.author.id (this)
        if (profile.id == id) {
            var numRandomIndex = Math.floor(Math.random() * profile.messages.length);

            var profileMessage = profile.messages[numRandomIndex];

            var link = "";

            if (nextOnlineClassTime < 2400) {

                link = /*"<" + */courses["courses"][courseIndex].link/* + ">"*/; //default to real link

                var nextOnlineClassTimeTotalMinutes = getTimeHour(nextOnlineClassTime) * 60 + getTimeMinute(nextOnlineClassTime);
                var timeDifference = nextOnlineClassTimeTotalMinutes - totalMinutes;

                //user is late to class
                if (timeDifference < 0) {
                    var randomLateMessageIndex = Math.floor(Math.random() * profile.lateMessages.length);
                    profileMessage = profile.lateMessages[randomLateMessageIndex];
                    if (profileMessage == "") {
                        profileMessage = "You're late!";
                    }
                }
                //user is more than an hour early to class
                else if (timeDifference > 60) {
                    var randomEarlyMessageIndex = Math.floor(Math.random() * profile.earlyMessages.length);
                    profileMessage = profile.earlyMessages[randomEarlyMessageIndex];
                    if (profileMessage == "") {
                        profileMessage = "You're very early!";
                    }
                }
                //send rickroll a certain % of the time
                var userRickRollChance = RICKROLL_CHANCE - (profile.rep / 100);
                console.log("userRickRollChance: " + userRickRollChance);
                if (Math.random() <= userRickRollChance) {
                    if (timeDifference > MIN_RICKROLL_MINUTES_BEFORE_CLASS) {
                        link = LINK_RICKROLL;
                    }
                }
            }
            if (profileMessage == "") {
                profileMessage = "Why don't you have a custom message?";
            }

            if (link != "") {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setURL(link)
                        .setLabel(courses["courses"][courseIndex].name)
                        .setStyle('Link'),
                );
                message.reply({ content: profileMessage, components: [row] });
            }
            else {
                message.reply({ content: "There are no remaining online classes today.", allowedMentions: { repliedUser: false } });
            }
        }
    }, id);
}

function getTimeHour(time) {
    var strTime = time.toString(); //convert time to string

    var output = strTime.charAt(0); //output will start with the first character of the time entered
    //example: if time is 930, it will set output to "9"

    //if the time has more than 3 characters, it'll add the second character of the string
    //example: if time is 1230, it will set output to "1" ,then add "2" to it, resulting in the final output of "12" 
    if (strTime.length > 3) {
        output += strTime.charAt(1);
    }
    return parseInt(output); //convert output to an int and then return it
}

function getTimeMinute(time) {
    var strTime = time.toString(); //convert time to string

    //sets output to the second-last character + last character of strTime and converts it to an int
    //example: if time = 1230, output will be 30
    var output = parseInt(strTime.charAt(strTime.length - 2) + strTime.charAt(strTime.length - 1));
    return output;
}


//overrides the default values unless the debug variable is set to "default"
function setDebugState(input, debug) {
    if (debug != "default") {
        return debug;
        console.log("Assigning debug values");
    }
    return input;
}