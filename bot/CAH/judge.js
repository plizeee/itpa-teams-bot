const { displayCards, getUserInput } = require('./utils.js');

// let currentJudge = null;
let currentPlayedCards = [];

// function setJudge(player) {
//     currentJudge = player;
// }

function receiveCards(cards) {
    currentPlayedCards = cards;
}

function pickWinner() {
    // show the judge the played cards with indices
    console.log("Played cards:");
    currentPlayedCards.forEach((card, index) => {
        console.log(`[${index + 1}] ${card[1]}`); // card[1] is the card text
    });

    // judge picks a winner
    const winningCardIndex = parseInt(getUserInput("Pick a winner (by index): ")) - 1;



    // show the winner
    console.log(`The winner is: ${currentPlayedCards[winningCardIndex][0].name} with ${currentPlayedCards[winningCardIndex][1]}`);

    // return the winning card
    return currentPlayedCards[winningCardIndex];
}

module.exports = {
    // setJudge,
    receiveCards,
    pickWinner
};
