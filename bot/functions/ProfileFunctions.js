const SharedMethods = require("../util.js");
const {FunctionResult} = require("../functionClasses.js");

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
        contexts:["participants"],
        function: ({names=[], ids=[], maxrep=null, minrep=null},contexts={participants:[]}) => {
            const particpatingIds = ids.filter(id => contexts.participants.includes(id));
            if(contexts.participants.length<=0 || !particpatingIds?.length) return "No participants in reply chain";
            let full = SharedMethods.filterProfiles(names, particpatingIds, maxrep, minrep);
            let comboFunctions = []
            let editable = false;
            let mapped = full.map(profile =>{
                let obj = {name:profile.name,id:profile.id,rep:profile.rep};
                if (profile.hasOwnProperty('note')) obj.noteAboutUser = profile.note;
                if (profile.editableNote??false) editable = true;
                return obj;
            });
            if(editable) comboFunctions.push("editNote");
            return new FunctionResult({returnValue:mapped,comboFunctions:comboFunctions,override:false});
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
        contexts:["participants"],
        function: ({ids=[], mode="additive",value=0},contexts={participants:[]}) => {
            const particpatingIds = ids.filter(id => contexts.participants.includes(id));
            if(contexts.participants.length<=0 || !particpatingIds?.length) return "No participants in reply chain";
            let full = SharedMethods.filterProfiles(undefined, particpatingIds);
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
            "description": "edits the user's profile note, keep the note to under 500 characters total, override to make edits or when the length is too long, don't let people edit other's notes",
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
                        "description": "will override the note, use to remove or make changes to what's stored"
                    }
                }
            }
        },
        contexts:["participants"],
        function: ({ids=[],value="",override=false},contexts={participants:[]}) => {
            const particpatingIds = ids.filter(id => contexts.participants.includes(id));
            if(contexts.participants.length<=0 || !particpatingIds?.length) return "No participants in reply chain";
            let full = SharedMethods.filterProfiles(undefined, particpatingIds);
            let returnMessage = "";
            let numTooLong = 0;
            let numEdited = 0;
            let numNonEditable = 0;
            if(value.length>500) {value = value.slice(0,500); returnMessage = "Value Trimmed, ";}
            if(override) full.forEach(profile => {if(profile.editableNote == false) numNonEditable++; else {profile.note = value; numEdited++}});
            else full.forEach(profile => {
                if(profile.editableNote == false) numNonEditable++; 
                else if((profile.note?.length + value.length) > 500) numTooLong++;
                else {profile.note += value; numEdited++;}  
            });
            returnMessage += `${ids.length - particpatingIds.length} person(s) are not present in the conversation.`
            if (numTooLong) returnMessage += `Addition(value) to long for ${numTooLong} profiles `;
            if(numNonEditable) returnMessage += `${numNonEditable} profiles do not support editing notes.`
            returnMessage += numEdited&&SharedMethods.syncProfilesToFile()? `Edited ${numEdited} Notes Succesfully`: "Failed to save changes";
            
            return returnMessage;
            
        }
    },
}

module.exports = {
    functions
}