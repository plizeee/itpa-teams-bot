let currentJudge = null;
let currentPlayedCards = [];

function setJudge(player) {
    currentJudge = player;
}

function receiveCards(cards) {
    currentPlayedCards = cards;
}

function pickWinner() {
    // In the real game, the judge would pick the winner. 
    // For this simple version, we'll randomize the winner among the played cards.
    // If you want to add interaction where the judge actually picks, 
    // you can replace this with user input logic.
    
    const winningCard = currentPlayedCards[Math.floor(Math.random() * currentPlayedCards.length)];
    return winningCard;
}

module.exports = {
    setJudge,
    receiveCards,
    pickWinner
};
