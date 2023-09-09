const SharedMethods = require("./util.js");

module.exports = {
    functions,
}

let functions =  {
    "getProfiles":{
        metadata:{
            "name": "getProfiles",
            "description": "Gets users profile based on requirements",
            "parameters": {
                "type": "object",
                "properties": {
                    "names":{
                        "type": "string",
                        "description": "list of names to include in search"
                    },
                    "ids": {
                        "type": "int",
                        "description": "list of ids to include in search"
                    }, 
                    "maxrep":{
                        "type": "int",
                        "description": "limits return to profiles with rep <= maxrep"
                    },
                    "minrep":{
                        "type": "int",
                        "description": "limits return to profiles with rep >= minrep"
                    }
                },
                "required": []
            }
        },
        function: ({names=[], ids=[], maxrep=null, minrep=null}) => {
            let full = SharedFunctions.filterProfiles(names, ids, maxrep, minrep);
            return full.map(profile =>{return{name:profile.name,id:profile.id,rep:profile.rep}});
        }
    }
}