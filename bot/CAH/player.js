function createPlayer(name) {
    return {
        name: name,
        hand: [],
        score: 0
    };
}

function drawCard(player, card) {
    player.hand.push(card);
}

function playCard(player, cardIndex) {
    if (cardIndex < 0 || cardIndex >= player.hand.length) {
        throw new Error("Invalid card index");
    }
    return player.hand.splice(cardIndex, 1)[0]; // Remove the card from the player's hand and return it
}

function getScore(player) {
    return player.score;
}

function increaseScore(player, points) {
    player.score += points;
}

module.exports = {
    createPlayer,
    drawCard,
    playCard,
    getScore,
    increaseScore
};
