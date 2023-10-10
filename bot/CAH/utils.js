const readlineSync = require('readline-sync'); // Using 'readline-sync' for synchronous user input

function displayCards(cards) {
    cards.forEach((card, index) => {
        console.log(`[${index + 1}] ${card}`);
    });
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

module.exports = {
    displayCards,
    getUserInput,
    randomizeArray
};
