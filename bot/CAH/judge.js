const { displayCards, getUserInput } = require('./utils.js');

// let currentJudge = null;
let currentPlayedCards = [];

// function setJudge(player) {
//     currentJudge = player;
// }

function receiveCards(cards) {
    currentPlayedCards = cards;
}

function pickWinner(questionCard) {
    // show the judge the played cards with indices
    currentPlayedCards.forEach((card, index) => {
        console.log(`[${index + 1}] ${card[1]}`); // card[1] is the card text
    });

    // judge picks a winner
    const winningCardIndex = parseInt(getUserInput("\nWinner: ")) - 1;

    //the winning card is returning an object like {text: "card text", pick: 1}, but that's not what we want
    console.log(mergeQuestionWithAnswers(questionCard, currentPlayedCards[winningCardIndex][1]));

    // return the winning card
    return currentPlayedCards[winningCardIndex];
}


// replace underscores in the question card with the winning cards
// returns a string
function mergeQuestionWithAnswers(questionCard, winningCard) {
    let output = questionCard.text;
    
    //find the number of underscores in the question card
    let numUnderscores = 0;
    for(let i = 0; i < output.length; i++) {
        if(output[i] === "_") {
            numUnderscores++;
        }
    }

    for(let i = 0; i < numUnderscores; i++) {
        //replace the first underscore with the first winning card
        output = output.replace("_", `**${winningCard[i]}**`);
    }

    return output;
}

module.exports = {
    // setJudge,
    receiveCards,
    pickWinner
};
