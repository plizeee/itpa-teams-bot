const SharedMethods = require("../util.js");
const SearchMethods = require("../search.js");

const functions =  {
    "getSearchResults": {
        metadata: {
            "name": "getSearchResults",
            "description": "Searches google for a query and returns the top results",
            "parameters": {
                "type": "object",
                "properties": {
                    "query":{
                        "type": "string",
                        "description": "query to search"
                    }
                }
            }
        },
        function: async ({query}) => {
            try{
                let results = await SearchMethods.getSearchResults(query);
                return results;
            }
            catch(err){
                return err;
            }
        }
    },
    "getWebpageContentsFromUrl": {
        metadata: {
            "name": "getWebpageContentsFromUrl",
            "description": "Gets the contents of a webpage from a url",
            "parameters": {
                "type": "object",
                "properties": {
                    "url":{
                        "type": "string",
                        "description": "url of the webpage"
                    }
                }
            }
        },
        function: async ({url}) => {
            try{
                let results = await SearchMethods.getWebpageContentsFromUrl(url);
                return results;
            }
            catch(err){
                return err;
            }
        }
    }
}

module.exports = {
    functions
}