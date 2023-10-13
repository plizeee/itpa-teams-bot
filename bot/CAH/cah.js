//Cards Against Humanity Game
//For now, we'll make in the console, but later we'll make it in the chat

//cards are stored in cah-all-compact.json
//the structure of the json is as follows:
/*
{
    "white": [
        "card1",
        "card2",
        ...
    ],
    "black": [
        "text": "card1", "pick": 1,
        "text": "card2", "pick": 1,
        ...
    ]
}

List of scripts:
-cah.js (this file): the entry point of the game. This will initiate the game, manage the game loop, and control the flow of the game
    Content:
        1. import modules
        2. define game loop
        3. handle user input
        4. start and end game
-player.js: represents a player in the game
    Content:
        1. player's name
        2. player's hand
        3. player's score
        4. methods to draw cards, play cards, and score points
-card.js: represents a card in the game (both question and answer cards)
    Content:
        1. card type (question or answer)
        2. card text
        3. any other metadata
-deck.js: represents a deck of cards in the game
    Content:
        1. list of all question and answer cards
        2. methods to shuffle deck, draw cards, and return cards to deck
-judge.js: represents the judging mechanism to determine the winner of a round
    Content:
        1. method to receive player cards
        2. method to pick a winner
        3. maybe so ai logic if you want the judge to be an ai
-utils.js: contains utility functions that can be used throughout the game
    Content:
        1. function to display cards in a readable manner
        2. function to get user input
        3. any other helper functions
-gamestate.js: keeps track of the current state of the game
    Content:
        1. Current round
        2. Which player is the judge
        3. Current question card
        4. What answers have been submitted this round
        5. Methods to advance the game state, like moving to the next round

List of functions:
cah.js:
-initializeGame(): Set up the game, including creating players, shuffling the deck, etc.
-startGameLoop(): Begin the main game loop.
-displayInstructions(): Show game rules or instructions to the players.
-endGame(): Conclude the game, maybe display scores, etc.

player.js
-createPlayer(name): Create a new player with a given name.
-drawCard(deck): Allow the player to draw a card from the deck.
-playCard(cardIndex): Player plays a card from their hand.
-getScore(): Return the player's current score.
-increaseScore(points): Increase the player's score by a certain amount.

card.js
-createCard(type, text): Create a new card with a specified type (question or answer) and text.

deck.js
-initializeDeck(): Set up the deck with all cards.
-shuffleDeck(): Shuffle the current deck.
-drawCard(type): Draw a card of a specific type from the deck.

judge.js
-receiveCards(cards): Receive the played cards for the current round.
-pickWinner(): Select the winning card for the current round.
-setJudge(player): Assign a player to be the judge for the current round.

utils.js
-displayCards(cards): Display a list of cards in a readable manner.
-getUserInput(prompt): Get input from the user with a given prompt.
-randomizeArray(array): Randomize the order of elements in an array (useful for shuffling).

gamestate.js
-initializeGameState(players): Set up the initial game state.
-getCurrentRound(): Get the current round number.
-advanceRound(): Move to the next round.
-setCurrentQuestionCard(card): Set the current question card.
-getPlayedAnswers(): Get all answers played in the current round.
-addPlayedAnswer(card): Add an answer card to the current round's played answers.
*/

//fs 
const fs = require('fs');

//read the cards from the json file
const cards = JSON.parse(fs.readFileSync('./bot/CAH/cah-all-compact.json'));

const { initializeDeck, drawCard } = require('./deck.js');
const { createPlayer, drawCard: playerDrawCard, playCard, increaseScore } = require('./player.js');
const { initializeGameState, getCurrentRound, advanceRound, setCurrentQuestionCard, addPlayedAnswer, getPlayedAnswers, getJudge, setJudge } = require('./gamestate.js');
const { displayCards, getUserInput } = require('./utils.js');
const { receiveCards, pickWinner } = require('./judge.js');
const { get } = require('http');
const { question } = require('readline-sync');

let players = [];
let deck;
let gameState;

const maxCardsInHand = 10;

function initializeGame() {
    // Initialize deck
    deck = initializeDeck();
    
    // Create players
    let numPlayers = parseInt(getUserInput("How many players? "));
    for(let i = 0; i < numPlayers; i++) {
        const playerName = getUserInput(`Enter name for player ${i + 1}: `);
        players.push(createPlayer(playerName));
    }
    
    // Initialize game state
    gameState = initializeGameState(players);
}

function startGameLoop() {
    while(getCurrentRound(gameState) <= 10) { // Let's assume 10 rounds for this example
        console.log(`\nStarting Round ${getCurrentRound(gameState)}`);

        // Set the judge for this round
        const judgeIndex = getCurrentRound(gameState) % players.length; // Rotate the judge each round
        // setJudge(gameState, players[judgeIndex]);
        setJudge(players[judgeIndex]);
        console.log(`Judge for this round: ${getJudge().name}\n`);
        
        fillAllHands();
        
        // Set the current question card
        const questionCard = drawCard('question');
        setCurrentQuestionCard(gameState, questionCard);
        
        // Players play their cards
        playerTurns(players, questionCard);
        
        // console.log("getPlayedAnswers: " + getPlayedAnswers().map(card => card));

        console.log("\nJudging round...\n\nJudge: " + getJudge().name + "\n");
        console.log(`Question: \n${questionCard.text}\n`);
        receiveCards(getPlayedAnswers());
        const winningCard = pickWinner(questionCard);

        // Increase the winner's score
        increaseScore(winningCard[0], 1)
        displayScore();
        
        // Move to the next round
        advanceRound(gameState);
    }

    endGame();
}

function playerTurns(players, questionCard) {
    // Players play their cards
    for(let player of players) {
        if(player === getJudge()) {
            continue; // Skip the judge
        }

        console.log(`Question: \n${questionCard.text}\n`);

        // console.log(`${player.name}'s hand:`);

        // displayCards(player.hand);
        // const cardIndex = parseInt(getUserInput(`\nChoose a card: `)) - 1;
        // const playedCard = playCard(player, cardIndex);
        
        // addPlayedAnswer(player, playedCard);

        let playedCards = [];

        for(let i = 0; i < questionCard.pick; i++) {
            let playedCard;
            console.log(`${player.name}'s hand:`);
            displayCards(player.hand);

            console.log("\nPick " + questionCard.pick + " cards.");
            if(questionCard.pick > 1) {
                playedCard = playCard(player, parseInt(getUserInput(`\nChoose card ${i + 1}: `)) - 1);
            }
            else {
                playedCard = playCard(player, parseInt(getUserInput(`\nChoose a card: `)) - 1);
            }

            playedCards.push(playedCard);
        }

        addPlayedAnswer(player, playedCards);
    }
}

function fillAllHands() {
    for(let player of players) {
        for(let i = player.hand.length; i < maxCardsInHand; i++) {
            const card = drawCard('answer');
            playerDrawCard(player, card);
        }
    }
}

function displayInstructions() {
    console.log("Welcome to Cards Against Humanity Console Version!");
    console.log("Instructions:");
    console.log("1. Each player will draw a card at the beginning of the round.");
    console.log("2. A question card is drawn.");
    console.log("3. Players choose one of their cards as an answer.");
    console.log("4. A judge (rotating each round) picks the funniest answer.");
    console.log("5. The game continues for 10 rounds.");
    console.log("6. The player with the most round wins at the end is the overall winner.");
    console.log("Let's start the game!");
}

function displayScore(){
    console.log("\nCurrent scores:");
    for(let player of players) {
        console.log(`${player.name} has ${player.score} points.`);
    }
}

function endGame() {
    console.log("Thank you for playing Cards Against Humanity Console Version!");
    // Here you can also display final scores, announce the overall winner, etc.
}

// Main execution starts here
displayInstructions();
initializeGame();
startGameLoop();