const { randomizeArray } = require('./utils.js');
const { createCard } = require('./card.js');

//import the cards from the json file
const fs = require('fs');
const { question } = require('readline-sync');
const cards = JSON.parse(fs.readFileSync('./bot/CAH/cah-all-compact.json'));

// Sample card data; ideally, you would import this from cah_all_compact.json
const questionCardsData = cards.black;
const answerCardsData = cards.white;

// we are making a copy of the data so that we can modify it without affecting the original
// let questionCards = questionCardsData.map(card => ({...card}));
// let answerCards = answerCardsData.map(card => ({...card}));

let questionCards = JSON.parse(JSON.stringify(questionCardsData));
let answerCards = JSON.parse(JSON.stringify(answerCardsData));

function initializeDeck() {
    // Create question cards
    // for(let question of questionCardsData) {
    //     questionCards.push(createCard('question', question.text));
    // }

    // Create answer cards
    // for(let text of answerCardsData) {
    //     answerCards.push(createCard('answer', text));
    // }

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
    console.log("type: " + type);
    if(type === 'question') {
        return questionCards.pop();
    } else if(type === 'answer') {
        //console log the answer we are drawing
        // console.log("answerCards: " + answerCards);

        // console.log("answerCards.pop(): " + answerCards.pop());
        return answerCards.pop();
        //that keeps returning undefined, so we are going to try to return the first card in the array
        // return answerCards[0];
    } else {
        throw new Error("Invalid card type for drawing");
    }
}

module.exports = {
    initializeDeck,
    shuffleDeck,
    drawCard
};
