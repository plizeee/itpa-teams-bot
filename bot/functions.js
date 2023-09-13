//this file is for gpt function related methods

const ProfileFunctions = require("./functions/ProfileFunctions.js").functions;
const AllFunctions = {...ProfileFunctions};// use , and spread ... to combine function lists
const GroupedFunctions = {"Profile Functions":Object.keys(ProfileFunctions)};// this is for the website selector the key is what the functions will be grouped under.

function GetTriggerFunctions(trigger) {
    if(trigger.hasOwnProperty("functions")) {
        let functions = [...Object.entries(AllFunctions).filter(KeyVal => trigger.functions.includes(KeyVal[0]))]
        let funcmeta = functions.map(([key, value]) => value).map(({metadata}) => metadata);
        return funcmeta
    }
    else return [];
}
function CallFunction(funcName, funcArgs){
    return JSON.stringify(AllFunctions[funcName].function(funcArgs));
}
let AllFunctionNames = () => Object.keys(AllFunctions);

function GroupedFunctionNames(filter,selected=[]) {
    let arr = []
    let id = 1
    for (const group of Object.entries(GroupedFunctions)) {
        arr.push({text:group[0], children:group[1].reduce(function(filtered, func) {
            if (func.startsWith(filter) ||!filter) {
                isSelected = selected?.includes(func)??false;
                let someNewValue = { id: id++, text:func, selected:isSelected};
                filtered.push(someNewValue);
            }
            return filtered;
        }, [])})
    }
    return arr;
}

module.exports = {
    GetTriggerFunctions, CallFunction, AllFunctionNames, GroupedFunctionNames
}