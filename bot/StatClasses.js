class StatArray extends Array{
    sum = () => this.reduce((total, curValue) => total + curValue,0)
    average = () => this.sum()/this.length;
    rate(time) {
        return this.sum()/time
    }
}

class TokenStatTemplate {
    #firstCallDate;
    #lastCallDate;
    #calls= 0;
    #prompt = new StatArray();
    #completion = new StatArray();
    get promptTokens() {return this.#prompt}
    get completionTokens() {return this.#completion}
    get numOfCalls() {return this.#calls}
    get lastCallDate() {return this.#lastCallDate}
    get firstCallDate() {return this.#firstCallDate}
    TotalAverage() {
        return (this.#completion.reduce((total, curValue) => total + curValue,0) + this.#prompt.reduce((total, curValue) => total + curValue,0))/this.#calls;    
    };
    TotalRate(timefactor = 36000000) {
        if (!this.#firstCallDate) return null;
        return (this.#prompt.sum()+this.#completion.sum())/((this.#lastCallDate.getTime()-this.#firstCallDate.getTime())/timefactor);
    }
    storeData(promptTokens, completionTokens){
        let date = new Date()
        this.#firstCallDate??= date;
        this.#lastCallDate = date;
        if (!promptTokens || !completionTokens) console.log("no tokens receieved")
        else console.log(`tokens stored: ${promptTokens} ${completionTokens}`)
        this.#prompt.push(promptTokens);
        this.#completion.push(completionTokens);
        this.#calls++;
    }
}

module.exports = {TokenStatTemplate};