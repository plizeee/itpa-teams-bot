const SharedMethods = require("../util.js");

const functions =  {
    "getCourses": {
        metadata: {
            "name": "getCourses",
            "description": "Gets class schedule based on requirements",
            "parameters": {
                "type": "object",
                "properties": {
                    "names":{
                        "type": "array",
                        "description": "list of class names to include in search",
                        "items": {
                            "type": "string"
                        }
                    },
                    "code":{
                        "type": "array",
                        "description": "list of class codes to include in search",
                        "items": {
                            "type": "string"
                        }
                    },
                    "days":{
                        "type": "array",
                        "description": "list of days of the week to include in search",
                        "items": {
                            "type": "string"
                        }
                    },  
                    "startTimes":{
                        "type": "array",
                        "description": "list of start times to include in search",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "endTimes":{
                        "type": "array",
                        "description": "list of end times to include in search",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "isOnline":{
                        "type": "boolean",
                        "description": "whether or not to include online classes"
                    },
                    "link":{
                        "type": "string",
                        "description": "link to Microsot Teams meeting"
                    },
                }
            }
        },
        function: ({names=[], code=[], days=[], startTimes=[], endTimes=[], isOnline=false, link=""}) => {
            let full = SharedMethods.filterCourses(names, code, days, startTimes, endTimes, isOnline, link);
            return full.map(course =>{return{name:course.name,code:course.code,days:course.days,startTimes:course.startTimes,endTimes:course.endTimes,isOnline:course.isOnline,link:course.link}});
        }
    }
}

module.exports = {
    functions
}