const fs = require('fs');

//read the cards from the json file
const cards = JSON.parse(fs.readFileSync('./bot/CAH/cah-all-compact.json'));

const { initializeDeck, drawCard } = require('./deck.js');
const { createPlayer, drawCard: playerDrawCard, playCard, increaseScore } = require('./player.js');
const { initializeGameState, getCurrentRound, advanceRound, setCurrentQuestionCard, addPlayedAnswer, getPlayedAnswers, getJudge, setJudge, setGamePhase, getGamePhase, setChannel, getChannel } = require('./gamestate.js');
const { displayCards, getUserInput, addEscapeCharacters } = require('./utils.js');
const { receiveCards, pickWinner } = require('./judge.js');
const { get } = require('http');
const { question } = require('readline-sync');

let players = [];
let deck;
let gameState;

const maxCardsInHand = 10;

module.exports = {
    checkCahCommand: async function(msg, isMasterBranch, client, config){
        if(msg.content.toUpperCase().startsWith("!START")){
            initializeGame(msg, client);
        }
        else{
            switch(getGamePhase()){
                // case "SETUP": setupPhase(msg);
                // break;
                case "ANSWER": answerPhase(msg, client);
                break;
                case "JUDGE": judgePhase(msg);
                break;
            }
        }
    }
}


async function initializeGame(msg, client) {
    // gameState.setGamePhase("SETUP");
    gameState = initializeGameState(players);

    //TODO add robot emoji to add AI as a player
    let reply = await msg.reply("Starting new game...\n\nPlease react:\n👍 to participate in the game\n❌ to cancel the game\n✅ to start the game");

    // apply the reactions to the message we sent above
    reply.react('👍').then(() => reply.react('❌')).then(() => reply.react('✅'));
    
    // check for the reactions and activate the appropriate function
    let filter = (m) => m.author.id === msg.author.id && !m.author.bot;

    const collector = reply.createReactionCollector(filter, { time: 15000 });

    collector.on('collect', (reaction, user) => {
        if (reaction.emoji.name === '👍' && !user.bot) {
            console.log(`Collected ${reaction.emoji.name} from ${user.username}`);
            // add the user to the game
            msg.reply(`Adding ${user} to the game...`);

            players.push(createPlayer(user.username, user.id));
            //DEBUG
            players.push(createPlayer("Player 1"));
        }
        else if (reaction.emoji.name === '❌' && !user.bot) {
            console.log(`Collected ${reaction.emoji.name} from ${user.username}`);
            // cancel the game
            //msg.reply("Cancelling game...");

            //ephemeral reply
            msg.reply({content: "Cancelling game...", ephemeral: true});

            return;
        }
        else if (reaction.emoji.name === '✅' && !user.bot) {
            // Initialize deck
            deck = initializeDeck();
            
            console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);

            msg.reply("Starting game...\nPlayers:" + players.map
            (player => " " + player.name));

            // get the channel the game is being played in
            setChannel(msg.channel);

            setGamePhase("ANSWER");
            answerPhase(msg, client);
        }
    });

    collector.on('end', collected => {
        console.log(`Collected ${collected.size} items`);
    });
}



// function startGameLoop() {
//     while(getCurrentRound(gameState) <= 10) { // Let's assume 10 rounds for this example
//         console.log(`\nStarting Round ${getCurrentRound(gameState)}`);

//         // Set the judge for this round
//         const judgeIndex = getCurrentRound(gameState) % players.length; // Rotate the judge each round
//         // setJudge(gameState, players[judgeIndex]);
//         setJudge(players[judgeIndex]);
//         console.log(`Judge for this round: ${getJudge().name}\n`);
        
//         fillAllHands();
        
//         // Set the current question card
//         const questionCard = drawCard('question');
//         setCurrentQuestionCard(gameState, questionCard);
        
//         // Players play their cards
//         playerTurns(players, questionCard);

//         console.log("\nJudging round...\n\nJudge: " + getJudge().name + "\n");
//         console.log(`Question: \n${questionCard.text}\n`);
//         receiveCards(getPlayedAnswers());
//         const winningCard = pickWinner(questionCard);

//         // Increase the winner's score
//         increaseScore(winningCard[0], 1)
//         displayScore();
        
//         // Move to the next round
//         advanceRound(gameState);
//     }

//     endGame();
// }

function answerPhase(msg, client) {
    //send message in channel to let players know to pick a card
    let channel = getChannel();
    let questionCard = drawCard('question');
    channel.send("Question: \n" + questionCard.text + "\n\nPlease pick a card from your hand to answer the question.");

    fillAllHands();

    // Display all players' hands
    players.forEach(player => {
        if(player === getJudge()) {
            return; // Skip the judge
        }

        let message = displayCards(player.hand, player);
        message = addEscapeCharacters(message);

        // channel.send(message);

        if(player.id != null){
            //send a dm to the player
            client.users.send(player.id, "Question: \n" + questionCard.text + message);
        }
        else{
            // channel.send(message);
            console.log(message);
        }
    });
}

function playerTurns(players, questionCard) {
    // Players play their cards
    for(let player of players) {
        if(player === getJudge()) {
            continue; // Skip the judge
        }

        console.log(`Question: \n${questionCard.text}\n`);

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
// displayInstructions();
// initializeGame();
// startGameLoop();