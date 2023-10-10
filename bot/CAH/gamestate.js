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

function addPlayedAnswer(card) {
    gameState.playedAnswers.push(card);
    console.log(`Played answer: ${card.text}`);
    console.log(`Played answers: ${gameState.playedAnswers.map(card => card.text)}`);
}

module.exports = {
    initializeGameState,
    getCurrentRound,
    advanceRound,
    setCurrentQuestionCard,
    getPlayedAnswers,
    addPlayedAnswer
};
