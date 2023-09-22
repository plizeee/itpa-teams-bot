const SharedMethods = require("../util.js");
const {FunctionResult} = require("../functionResultClass.js");

const functions =  {
    "getProfiles":{
        metadata:{
            "name": "getProfiles",
            "description": "Gets users profile based on requirements",
            "parameters": {
                "type": "object",
                "properties": {
                    "names":{
                        "type": "array",
                        "description": "list of lowercase names to include in search",
                        "items": {
                            "type": "string"
                        }

                    },
                    "ids": {
                        "type": "array",
                        "description": "list of ids to include in search",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "maxrep":{
                        "type": "integer",
                        "description": "limits return to profiles with rep <= maxrep"
                    },
                    "minrep":{
                        "type": "integer",
                        "description": "limits return to profiles with rep >= minrep"
                    }
                }
            }
        },
        function: ({names=[], ids=[], maxrep=null, minrep=null}) => {
            let full = SharedMethods.filterProfiles(names, ids, maxrep, minrep);
            if (full.length == 1){
                let profile = full[0]
                let obj = {name:profile.name,id:profile.id,rep:profile.rep};
                let comboFunctions = []
                if (profile.hasOwnProperty('note')) obj.noteAboutUser = profile.note;
                if (profile.editableNote??false) comboFunctions.push("editNote");
                return new FunctionResult({returnValue:obj,comboFunctions:comboFunctions,override:false});
            }
            else return full.map(profile =>{return {name:profile.name,id:profile.id,rep:profile.rep};});
        }
    },
    "changeRep":{
        metadata:{
            "name": "changeRep",
            "description": "changes user(s) rep",
            "parameters": {
                "type": "object",
                "properties": {
                    "ids":{
                        "type": "array",
                        "description": "list of user ids to effect",
                        "items": {
                            "type": "integer"
                        }

                    },
                    "mode": {
                        "type": "string",
                        "description": "mode of rep change",
                        "enum": ["override", "additive"]
                    },
                    "value":{
                        "type": "integer",
                        "description": "the value to change the rep by, + and - allowed"
                    }
                },
                "required": ["ids","mode","value"]
            }
        },
        function: ({ids=[], mode="additive",value=0}) => {
            let full = SharedMethods.filterProfiles(undefined, ids);
            if(mode == "additive") full.forEach(profile => profile.rep += value);
            else if(mode == "override") full.forEach(profile => profile.rep = value);
            SharedMethods.syncProfilesToFile(true);
            full = SharedMethods.filterProfiles(undefined, ids);
            console.log(full);
            return full.map(profile =>{return{name:profile.name,id:profile.id,rep:profile.rep}});
        }
    },
    "editNote":{
        metadata:{
            "name": "editNote",
            "description": "edits the user's profile note, keep the note to under 500 characters total",
            "parameters": {
                "type": "object",
                "properties": {
                    "ids": {
                        "type": "array",
                        "description": "list of ids to make the change to",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "value":{
                        "type": "string",
                        "description": "the note about the user you would like to add or override with"
                    },
                    "override":{
                        "type": "boolean",
                        "description": "will completely replace the user's note"
                    }
                }
            }
        },
        function: ({ids=[],value="",override=false}) => {
            let full = SharedMethods.filterProfiles(undefined, ids);
            let returnMessage = "";
            let changeMade = false;
            if(value.length>500) {value = value.slice(0,500); returnMessage = "Value Trimmed, ";}
            if(override) full.forEach(profile => {profile.note = value; changeMade = true; return profile});
            else full.forEach(profile => {
                if((profile.note?.length + value.length) > 500) returnMessage = "Addition(value) to long, ";
                else {profile.note += value; changeMade = true;}  
            });
            returnMessage += changeMade&&SharedMethods.syncProfilesToFile()? "Edited Note Succesfully": "Failed to save changes";
            return returnMessage;
        }
    },
}

module.exports = {
    functions
}