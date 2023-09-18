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
                        "description": "List of class names to include in search",
                        "items": {
                            "type": "string"
                        }
                    },
                    "code":{
                        "type": "array",
                        "description": "List of class codes to include in search",
                        "items": {
                            "type": "string"
                        }
                    },
                    "days":{
                        "type": "array",
                        "description": "List of days of the week to include in search",
                        "items": {
                            "type": "string"
                        }
                    },  
                    "startTimes":{
                        "type": "array",
                        "description": "List of start times to include in search. Times share the same index as their respective day of the week in the days array",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "endTimes":{
                        "type": "array",
                        "description": "List of end times to include in search. Times share the same index as their respective day of the week in the days array",
                        "items": {
                            "type": "integer"
                        }
                    },
                    "isOnline":{
                        "type": "boolean",
                        "description": "List of classes that are online. Defaults to false (in-person). Some classes are online some days and in-person others."
                    },
                    "link":{
                        "type": "string",
                        "description": "Link to Microsot Teams meeting. Some classes are online some days and in-person others."
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