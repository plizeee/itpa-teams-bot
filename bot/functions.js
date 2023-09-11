//this file is for gpt function related methods

const ProfileFunctions = require("./functions/ProfileFunctions.js").functions;
const Functions = ProfileFunctions // use .concat() to combine other function groups so that all are present
module.exports = {
    GetTriggerFunctions, CallFunction
}

function GetTriggerFunctions(trigger) {
    if(trigger.hasOwnProperty("functions")) {
        let functions = [...Object.entries(Functions).filter(KeyVal => trigger.functions.includes(KeyVal[0]))]
        let funcmeta = functions.map(([key, value]) => value).map(({metadata}) => metadata);
        return funcmeta
    }
    else return [];
}
function CallFunction(funcName, funcArgs){
    return JSON.stringify(Functions[funcName].function(funcArgs));
}