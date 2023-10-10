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
    // console.log("player.hand: " + player.hand);
    // console.log("cardIndex: " + cardIndex);
    // console.log("player.hand.length: " + player.hand.length);

    if (cardIndex < 0 || cardIndex >= player.hand.length) {
        throw new Error("Invalid card index");
    }

    console.log(`${player.name} played: ${player.hand[cardIndex]}`)

     // return player.hand.splice(cardIndex, 1)[0]; // Remove the card from the player's hand and return it
    //  return player.hand[cardIndex]; // Remove the card from the player's hand and return it
    return player.hand.splice(cardIndex, 1);
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
