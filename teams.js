const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } = require('discord.js');
const fs = require('fs'); //needed to read/write json files

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
let nextOnlineClassTime; //time until the next online class
let courseIndex;

let d;
let day;
let dayNum;
let hours;
let minutes;
let totalMinutes;

let message;

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
    let message = msg.content.toUpperCase();
    if(message.includes(" ")){
        let slicedMsg = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
        let replyMessage= "";

        if(slicedMsg == "LIST"){
            replyMessage = "__**CLASS LIST**__";
            courses["courses"].forEach(course => {
                replyMessage += "\n" + course.name + " [" + course.code + "]";
            });
        }
        else if(slicedMsg.startsWith("LINK ")){
            const course = getCourse(slicedMsg.slice(slicedMsg.indexOf(" ") + 1));

            try{
                const courseName = course.name;
                const courseLink = course.link != "" ? course.link : "No link found";

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setURL(courseLink)
                        .setLabel(courseName)
                        .setStyle('Link'),
                );
                msg.reply({ content: "Here's the link:", components: [row] });
                return;
            }
            catch (err){
                replyMessage = "No link found.";
            }
            
            //replyMessage = className + ": " + getLink(className);
        }
        else{
            replyMessage = "Command not found. Maybe get it right next time.";
        }
        msg.reply(replyMessage);
    }
    else{
        console.log("teamsLinkCommand");
        teamsLinkCommand(msg);
    }
}

function getCourse(name){
    for(let i = 0; i < courses["courses"].length; i++){
        let course = courses["courses"][i];
        let className = course.name.toUpperCase();
        let classCode = course.code.toUpperCase();
        if(name == className || name == classCode){
            return course;
        }
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
    let helpText = "\n**__!help__**: use !help for an extensive dive on all the functions !help can provide you with.\n";
    helpText += "**__!teams__**: provides the appropriate Microsoft Teams meeting link.\n";
    helpText += "**__!t__**: same things as \"!teams\"\n";
    helpText += "**__ping__**: pong.\n";
    helpText += "**__pong__**: ping.\n";
    helpText += "**__Marco__**: Polo!\n";
    msg.reply(helpText);
}

async function youPassTheLinkCommand(msg) {
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

    let randomIndex = Math.floor(Math.random() * badBotReplies.length);
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
        let startTime = this.startTimes[index];
        let endTime = this.endTimes[index];
        let isEnded = true;
        if (classDay == day) {
            let startTimeHour = getTimeHour(startTime);
            let endTimeHour = getTimeHour(endTime);
            console.log(this.name + " isOnline:" + this.isOnline[index]);
            if (this.isOnline[index]) {
                console.log("endTimeHour: " + endTimeHour + " hours: " + hours);
                if (hours <= endTimeHour) {
                    console.log("endTimeHour <= hours");
                    let endTimeMinute = getTimeMinute(endTime);

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
            let numRandomIndex = Math.floor(Math.random() * profile.teams.linkMessages.length);

            let profileMessage = profile.teams.linkMessages[numRandomIndex];

            let link = "";

            if (nextOnlineClassTime < 2400) {

                link = /*"<" + */courses["courses"][courseIndex].link/* + ">"*/; //default to real link

                let nextOnlineClassTimeTotalMinutes = getTimeHour(nextOnlineClassTime) * 60 + getTimeMinute(nextOnlineClassTime);
                let timeDifference = nextOnlineClassTimeTotalMinutes - totalMinutes;

                //user is late to class
                if (timeDifference < 0) {
                    let randomLateMessageIndex = Math.floor(Math.random() * profile.teams.lateMessages.length);
                    profileMessage = profile.teams.lateMessages[randomLateMessageIndex];
                    if (profileMessage == "") {
                        profileMessage = "You're late!";
                    }
                }
                //user is more than an hour early to class
                else if (timeDifference > 60) {
                    let randomEarlyMessageIndex = Math.floor(Math.random() * profile.teams.earlyMessages.length);
                    profileMessage = profile.teams.earlyMessages[randomEarlyMessageIndex];
                    if (profileMessage == "") {
                        profileMessage = "You're very early!";
                    }
                }
                //send rickroll a certain % of the time
                let userRickRollChance = RICKROLL_CHANCE - (profile.rep / 100);
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
    let strTime = time.toString(); //convert time to string

    let output = strTime.charAt(0); //output will start with the first character of the time entered
    //example: if time is 930, it will set output to "9"

    //if the time has more than 3 characters, it'll add the second character of the string
    //example: if time is 1230, it will set output to "1" ,then add "2" to it, resulting in the final output of "12" 
    if (strTime.length > 3) {
        output += strTime.charAt(1);
    }
    return parseInt(output); //convert output to an int and then return it
}

function getTimeMinute(time) {
    let strTime = time.toString(); //convert time to string

    //sets output to the second-last character + last character of strTime and converts it to an int
    //example: if time = 1230, output will be 30
    let output = parseInt(strTime.charAt(strTime.length - 2) + strTime.charAt(strTime.length - 1));
    return output;
}


//overrides the default values unless the debug variable is set to "default"
function setDebugState(input, debug) {
    if (debug != "default") {
        return debug;
    }
    return input;
}