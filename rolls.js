//const Discord = require('discord.js');
//const fs = require('fs'); //needed to read/write json files

/*const { Client, Intents } = require('discord.js');
const client = new Client({ ws: { intents: Intents.ALL } });*/

//var message;

//executes this as soon as it starts
/*client.once('ready', () => {
    console.log('rolls.js is online!');
});*/

//executes every time someone sends a message
/*client.on("message", async msg => {
    console.log(msg.content);

    if (msg.content.toUpperCase() == "!ROLL RICK" || msg.content.toUpperCase() == "!R RICK") {
        msg.reply("<https://bit.ly/3SyA2ly>");
    }
    else if (msg.content.toUpperCase().startsWith("!ROLL ") || msg.content.toUpperCase().startsWith("!R ")) {
        rollCommand(msg);
    }
});*/

module.exports = {
    checkRollsCommand: function (msg) {
        let command = msg.content.toUpperCase(), found = false;
        if (msg.channel.type != 1) {
            if (command.startsWith("!ROLL") || command.startsWith("!R")) {
                found = true;
                rollCommand(msg);
            }
        }
        
        return found;
    }
}

function translateRollsInput(roll, index) {
    console.log("Entered TranslateRollsInput Function");
    console.log("roll.includes(D): " + roll.includes("D"));
    console.log("index: " + index);
    if (roll.includes("D")) {
        if (isNaN(roll.charAt(0))) {
            this[index] = "1" + roll
        }
    }
    else if (index == 0) {
        this[index] = "1d" + roll;
    }
}

function rollCommand(msg) {
    //string of the input with the "!r " or "!roll " taken out
    var slicedMsg = msg.content.slice(3).toUpperCase();
    if (msg.content.toUpperCase().startsWith("!ROLL")) {
        slicedMsg = msg.content.slice(6).toUpperCase();
    }

    var numTotalOperators = (slicedMsg.split("+").length - 1) + (slicedMsg.split("-").length - 1);
    console.log("numTotalOperators: " + numTotalOperators);

    //var remainingRollMsg = slicedMsg;

    var rollsAndOperators = getRollsAndOperators(slicedMsg, numTotalOperators);

    //example: for the string "2d3+5+2d7", the array would look like ["2d3", "5", "2d7"]
    var rolls = rollsAndOperators[0]; //an array of each element of the string between each "+"

    //example: for the string "2d3+5-3d2", the array would look like ["+", "-"]
    var operators = rollsAndOperators[1]; //stores the operators within the input, preserving the order in which they appear

    //var rolls = getRollsArray(slicedMsg)

    var strRollOutput = "";
    var rollTotal = 0;
    var currentRollTotal = 0;

    /*
     *Convert inputs such as "20" or "d20" as "1d20"
     * 
     *Convert all elements in the rolls array with "d20" to "1d20"
     */
    rolls.forEach(translateRollsInput, rolls);
    console.log(rolls);

    /*if (rolls.length == 1) {
        if (rolls[0])
    }*/

    //if (rolls[0].includes("D") || rolls.length > 1) {
        for (var i = 0; i < rolls.length; i++) {


            if (!isNaN(rollTotal)) {
                if (rolls[i].includes("D")) {
                    //strRollOutput += "\n(" + slicedMsg + ") " + "You rolled [ ";
                    currentRollTotal = 0;

                    //should probably rename this once I get other operators to work
                    var nextRoll = rolls.length > i + 1 ? rolls[i + 1] : "D";
                    var isNextRollAdd = !nextRoll.includes("D") ? true : false;

                    var numRolls = parseInt(rolls[i].slice(0, rolls[i].indexOf("D"))); //the number on the left side of the d. example "2d7", numRolls would be 2
                    var numRollMax = parseInt(rolls[i].slice(rolls[i].indexOf("D") + 1)); //the number on the right side of the d. example "2d7", numRollMax would be 7

                    for (var j = 0; j < numRolls; j++) {
                        var rand = Math.random();
                        var intRand = 1 + Math.floor(rand * (numRollMax));

                        if (j == 0) {
                            strRollOutput += "\n(" + numRolls + "D" + numRollMax;
                            console.log("nextRoll: " + nextRoll + " | isNextRollAdd: " + isNextRollAdd);
                            if (isNextRollAdd) strRollOutput += "+" + rolls[i + 1];
                            strRollOutput += ") [ ";
                        }
                        else if (j > 0 && j < numRolls) strRollOutput += " | ";

                        rollTotal += intRand;
                        currentRollTotal += intRand;
                        strRollOutput += intRand;

                        if (j == numRolls - 1) {
                            strRollOutput += " ]";
                            if (!isNextRollAdd) strRollOutput += " = " + currentRollTotal;
                            console.log("scenario 1");
                        }
                    }

                }
                else {
                    if (i > 0) {
                        rollTotal += parseInt(rolls[i]);
                        currentRollTotal += parseInt(rolls[i]);
                        strRollOutput += " + " + parseInt(rolls[i]) + " = " + currentRollTotal;
                        console.log("scenario 2");
                    }
                    else {
                        strRollOutput += " \n";
                    }
                }

                if (i == rolls.length - 1) strRollOutput += "\nTotal: " + rollTotal;
            }
            else {
                strRollOutput = "Something's wrong. I can feel it.";
            }

            //console.log("strRollOutput: " + strRollOutput);
        }
    /*}
    else {
        var numRollMax = parseInt(rolls[0]);
        var rand = Math.random();
        var intRand = 1 + Math.floor(rand * numRollMax);
        strRollOutput = "\nYou rolled " + intRand + " of " + numRollMax;
    }*/
    
    console.log(rolls);
    if (strRollOutput != "") {
        msg.reply("```" + strRollOutput + "```");
    }
}

function getRollsAndOperators(slicedMsg, numTotalOperators) {
    var rollsArray = [];
    var operatorsArray = [];
    var outputArray = [];
    //var remainingRollMsg = slicedMsg; 

    for (var i = 0; i <= numTotalOperators; i++) {
        var mathOperator = getNextMathOperator(slicedMsg);
        var mathOperatorIndex = slicedMsg.indexOf(mathOperator);
        var currentRoll = slicedMsg.slice(0, mathOperatorIndex);
        operatorsArray.push(mathOperator);

        if (numTotalOperators != i) {
            
            rollsArray.push(currentRoll);

            slicedMsg = slicedMsg.slice(mathOperatorIndex + 1);
        }
        else {
            rollsArray.push(slicedMsg);
        }
    }
    outputArray.push(rollsArray);
    outputArray.push(operatorsArray);
    return outputArray;
}

function getNextMathOperator(str) {
    for (var i = 0; i < str.length; i++) {
        if (str.charAt(i) == "+") {
            return "+";
        }
        else if (str.charAt(i) == "-") {
            return "-";
        }
    }
    return "";
}

//keep as last line
//client.login('MTAyMzkyNTk1MDA3NDg0NzMwMw.Gyx9YP.COqIC-qvfBHnbKhVTSMIqCktSKfp3W5rOtpLwE');