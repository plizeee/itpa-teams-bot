let gameState = {
    round: 0,
    currentJudge: null,
    currentQuestionCard: null,
    playedAnswers: []
};

function initializeGameState(players) {
    gameState.round = 1;
    gameState.currentJudge = players[0]; // Assuming the first player is the judge for the first round
    gameState.currentQuestionCard = null;
    gameState.playedAnswers = [];
}

function getCurrentRound() {
    return gameState.round;
}

function advanceRound() {
    gameState.round++;
    gameState.playedAnswers = []; // Reset played answers for the new round
}

function setCurrentQuestionCard(card) {
    gameState.currentQuestionCard = card;
}

function getPlayedAnswers() {
    return gameState.playedAnswers;
}

function addPlayedAnswer(player, card) {
    //add the player and card to the played answers array
    gameState.playedAnswers.push([ player, card ]);
    // console.log(`Played answers: ${gameState.playedAnswers.map(card => card)}`);

    console.log(`${player.name} played: ${card}`);
}

module.exports = {
    initializeGameState,
    getCurrentRound,
    advanceRound,
    setCurrentQuestionCard,
    getPlayedAnswers,
    addPlayedAnswer
};
