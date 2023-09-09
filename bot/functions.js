//this file is for gpt function related methods

const ProfileFunctions = require("./functions/ProfileFunctions.js").functions;
const Functions = ProfileFunctions // use .concat() to combine other function groups so that all are present
module.exports = {
    GetTriggerFunctions, CallFunction
}

function GetTriggerFunctions(trigger) {
    if(trigger.hasOwnProperty("functions")) return Object.entries(Functions).filter(KeyVal => trigger.functions.includes(KeyVal[0])).map((KeyVal => KeyVal[1]));
    else return [];
}
function CallFunction(funcName, funcArgs){
    return Functions[funcName].function(funcArgs);
}