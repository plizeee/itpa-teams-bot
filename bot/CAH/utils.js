const readlineSync = require('readline-sync'); // Using 'readline-sync' for synchronous user input

function displayCards(cards, player) {
    let output = `\n${player.name}'s cards:\n`;
    cards.forEach((card, index) => {
        output += `[${index + 1}] ${card}\n`;
        console.log(`[${index + 1}] ${card}`);
    });

    return output;
}

function getUserInput(prompt) {
    return readlineSync.question(prompt);
}

function randomizeArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // ES6 array element swap
    }
    return array;
}

//add escape characters to the text to prevent discord from formatting it
function addEscapeCharacters(text){
    return text.replace(/_/g, "\\_").replace(/\*/g, "\\*").replace(/~/g, "\\~").replace(/`/g, "\\`");
}

module.exports = {
    displayCards,
    getUserInput,
    randomizeArray,
    addEscapeCharacters
};
