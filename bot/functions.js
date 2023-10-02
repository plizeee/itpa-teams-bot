//this file is for gpt function related methods

const ProfileFunctions = require("./functions/ProfileFunctions.js").functions;
const CourseFunctions = require("./functions/CourseFunctions.js").functions;
const SearchFunctions = require("./functions/SearchFunctions.js").functions;


const AllFunctions = {...ProfileFunctions, ...CourseFunctions, ...SearchFunctions};// use , and spread ... to combine function lists
const GroupedFunctions = {"Profile Functions":Object.keys(ProfileFunctions), "Course Functions":Object.keys(CourseFunctions), "Search Functions":Object.keys(SearchFunctions)};// this is for the website selector the key is what the functions will be grouped under.

function GetTriggerFunctions(trigger) {
    if(trigger.hasOwnProperty("functions")) {return GetFunctionsMetadata(trigger.functions);}
    else return [];
}

/**
 * a function that retievse the metadata about GPTfunctions
 * @param {string[]} list a list of function names
 * @returns a list of objects containing metadata of function for use when making a request to GPT
 */
function GetFunctionsMetadata(list = []){
    let functions = [...Object.entries(AllFunctions).filter(KeyVal => list.includes(KeyVal[0]))]
    let funcmeta = functions.map(([key, value]) => value).map(({metadata}) => metadata);
    return funcmeta
}

async function CallFunction(funcName, funcArgs){
    let output = await AllFunctions?.[funcName]?.function(funcArgs);
    return output??"INVALID FUNCTION";
    //return JSON.stringify(AllFunctions[funcName].function(funcArgs));
}
let AllFunctionNames = () => Object.keys(AllFunctions);

function GroupedFunctionNames(filter,selected=[]) {
    let arr = []
    for (const group of Object.entries(GroupedFunctions)) {
        arr.push({text:group[0], children:group[1].reduce(function(filtered, func) {
            if (func.startsWith(filter) ||!filter) {
                isSelected = selected?.includes(func)??false;
                let someNewValue = { id: func, text:func, selected:isSelected};
                filtered.push(someNewValue);
            }
            return filtered;
        }, [])})
    }
    return arr;
}

module.exports = {
    GetTriggerFunctions, 
    CallFunction, 
    AllFunctionNames, 
    GroupedFunctionNames,
    GetFunctionsMetadata
}