const GamePhaseEnum = Object.freeze({
    SETUP: "setup",
    ANSWERS: "answers",
    JUDGE: "judge"
});

let gameState = {
    round: 0,
    phase: GamePhaseEnum.SETUP,
    currentJudge: null,
    currentQuestionCard: null,
    playedAnswers: []
};

function setGamePhase(newPhase) {
    if (Object.values(GamePhaseEnum).includes(newPhase)) {
        gameState.phase = newPhase;
    } else {
        console.error("Invalid game phase provided.");
    }
}

function getGamePhase() {
    return gameState.phase;
}

// let gameState = {
//     round: 0,
//     currentJudge: null,
//     currentQuestionCard: null,
//     playedAnswers: []
// };

function initializeGameState(players) {
    gameState.round = 1;
    gameState.currentJudge = players[0]; // Assuming the first player is the judge for the first round
    gameState.currentQuestionCard = null;
    gameState.playedAnswers = [];
    gameState.phase = null;
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

function addPlayedAnswer(player, cards) {
    //add the player and card to the played answers array
    gameState.playedAnswers.push([ player, cards ]);

    console.log(`\n${player.name} played: ${cards.map(card => card)}\n`);
}

function getJudge() {
    return gameState.currentJudge;
}

function setJudge(player) {
    gameState.currentJudge = player;
}

module.exports = {
    initializeGameState,
    getCurrentRound,
    advanceRound,
    setCurrentQuestionCard,
    getPlayedAnswers,
    addPlayedAnswer,
    getJudge,
    setJudge,
    setGamePhase,
    getGamePhase
};
