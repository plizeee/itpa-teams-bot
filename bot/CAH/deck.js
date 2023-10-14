const { randomizeArray } = require('./utils.js');
// const { createCard } = require('./card.js');

//import the cards from the json file
const fs = require('fs');
const { question } = require('readline-sync');
const cards = JSON.parse(fs.readFileSync('./bot/CAH/cah-all-compact.json'));

// Sample card data; ideally, you would import this from cah_all_compact.json
const questionCardsData = cards.black;
const answerCardsData = cards.white;

// we are making a copy of the data so that we can modify it without affecting the original
let questionCards = JSON.parse(JSON.stringify(questionCardsData));
let answerCards = JSON.parse(JSON.stringify(answerCardsData));

function initializeDeck() {
    // Shuffle the decks
    shuffleDeck('question');
    shuffleDeck('answer');
}

function shuffleDeck(type) {
    if(type === 'question') {
        questionCards = randomizeArray(questionCards);
    } else if(type === 'answer') {
        answerCards = randomizeArray(answerCards);
    } else {
        throw new Error("Invalid card type for shuffling");
    }
}

function drawCard(type) {
    if(type === 'question') {
        return questionCards.pop();
    } else if(type === 'answer') {
        return answerCards.pop();
    } else {
        throw new Error("Invalid card type for drawing");
    }
}

module.exports = {
    initializeDeck,
    shuffleDeck,
    drawCard
};
