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
    }
}

module.exports = {
    functions
}