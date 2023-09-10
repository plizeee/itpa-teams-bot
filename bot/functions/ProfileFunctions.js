const SharedMethods = require("../util.js");


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
            return full.map(profile =>{return{name:profile.name,id:profile.id,rep:profile.rep}});
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
                        "description": "the value to change the rep by"
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
    }
}

module.exports = {
    functions
}