const operators = ["+", "-", "*", "/"];

module.exports = {
    checkMathCommand: function (msg) {
        let command = msg.content.toUpperCase(), found = false;

        if (msg.channel.type != 1) {
            if (command.startsWith("!MATH ") || command.startsWith("!M ")) {
                found = true;
                mathCommand(msg);
            }
        }
        
        return found;
    }
}

function mathCommand(msg) {
    var message = msg.content.toUpperCase();
    var slicedMsg = message.startsWith("!MATH ") ? message.slice(6) : message.slice(3);
    var remainingMsg = slicedMsg;

    //console.log(slicedMsg);
    //2+5+12+56

    var mathValues = [];
    var mathValue = "";

    for (var i = 0; i < slicedMsg.length; i++) {
        var currentChar = slicedMsg.charAt(i);
        //var nextChar = slicedMsg.length > i + 1 ? slicedMsg.charAt(i + 1) : null;
        var nextOperatorIndex = getNextOperatorIndex(remainingMsg);
        console.log("[" + i + "] nextOperatorIndex: " + nextOperatorIndex + " | remainingMsg: " + remainingMsg);

        if (nextOperatorIndex == 0) {
            mathValues.push(mathValue);
            console.log("Pushed mathValue '" + mathValue + "' to mathValues");
            mathValue = "";
        }
        else {
            //console.log("remainingMsg before crash: " + remainingMsg + " length: " + remainingMsg.length);
            mathValue = remainingMsg.slice(0, i - nextOperatorIndex + 1);
            console.log("i: " + i + " | remainingMsg.length: " + remainingMsg.length + " | mathValue: " + mathValue);
        }
        remainingMsg = remainingMsg.slice(nextOperatorIndex);
        console.log("remainingMsg end of loop: " + remainingMsg);
    }
    console.log("mathValues: " + mathValues);
}

function isOperator(char) {
    for (var i = 0; i < operators.length; i++) {
        if (operators[i] == char) {
            return true;
        }
    }
    return false;
}

function getNextOperatorIndex(str) {
    for (var i = 0; i < str.length; i++) {
        //console.log(i + " | str.chatAt(i): " + str.charAt(i) + " | isOperator(str.charAt(i)): " + isOperator(str.charAt(i)));
        if (isOperator(str.charAt(i))) {
            return i;
        }
    }
    return null;
}