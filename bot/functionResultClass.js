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

module.exports = {FunctionResult};