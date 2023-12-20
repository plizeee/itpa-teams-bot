const Discord = require('discord.js');

// a class to allow for more complex GPTfunction returns
class FunctionResult {
     /**
     * 
     * @param {*} returnValue the value the function would normally return
     * @param {string[]} comboFunctions list of functions to add to the next request
     * @param {boolean} override whether or not to overide the list of functions or to add and remove, defaults to false
     * @param {string[]} disableFunctions A list of functions to remove from the next request, does nothing if overide is true
     */
    constructor({returnValue=null,comboFunctions=[], override=false, disableFunctions=[]}){
        this.returnValue = returnValue;
        this.comboFunctions = comboFunctions;
        this.override = override;
        this.disableFunctions = disableFunctions;
    } 
}
// // a class to give functions information which they might not normally have access to.
// class FunctionInput{
//     /**
//      * 
//      * @param {*} args the args the function would normally take
//      * @param {Discord.Message} triggerMessage the discord message that triggered this function call 
//      * @param {Discord.Message} originalMessage the intial discord message to trigger terry
//      * @param {Discord.Message} messages a list of messages to be provided to the function.
//      */
//     constructor({args=null,triggerMessage=null,originalMessage=null,messages=null}){
//         this.args = args;
//         this.triggerMessage = triggerMessage
//         this.originalMessage = originalMessage;
//         this.messages = messages;
//     } 
// }

module.exports = {FunctionResult};