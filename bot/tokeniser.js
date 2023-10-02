const { encoding_for_model } = require("tiktoken");

function encodeMessage(message, model="gpt-3.5-turbo"){
    const enc = encoding_for_model(model);
    const encoded_message = enc.encode(message);
    enc.free();
    return encoded_message;
}

function decodeMessage(encoded_message, model="gpt-3.5-turbo"){
    const enc = encoding_for_model(model);
    const decodedBytes = enc.decode(encoded_message);
    const decoder = new TextDecoder();
    const decodedMessageString = decoder.decode(decodedBytes);
    enc.free();
    return decodedMessageString;
}

function getTokenCount(message, model="gpt-3.5-turbo") {
    const encoded_message = encodeMessage(message, model);
    return encoded_message.length;
}

function numTokensFromMessages(messages, model="gpt-3.5-turbo-0613") {
    const encoding = encoding_for_model(model);

    let numTokens = 0;
        for (let message of messages) {
            numTokens += 4;  // every message format
            for (let [key, value] of Object.entries(message)) {
                // numTokens += encoding.encode(value).length;
                numTokens += encoding.encode(value).length;
                if (key === "name") {
                    numTokens += -1;  // role is always required and always 1 token
                }
            }
        }
        numTokens += 2;  // every reply is primed
        return numTokens;
}

//TODO maybe add a check in case the token limit is too low to fit the first message, in which case we should truncate the first message to fit the token limit
function removeOldestMessagesUntilLimit(messages, token_limit, model="gpt-3.5-turbo") {
    let totalTokens = numTokensFromMessages(messages, model);

    //DEBUG
    let messagesBeforeRemovingLastMessage = messages.slice();

    console.log("messages tokens: " + totalTokens);
    
    while (totalTokens > token_limit) {
        // Find the oldest non-system message
        let oldestMessageIndex = -1;
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role !== "system") {
                oldestMessageIndex = i;
                
                //DEBUG
                //store a copy of the array before removing the last message
                messagesBeforeRemovingLastMessage = messages.slice();

                break;
            }
        }
        
        // If there's no non-system message to remove, break out of the loop
        if (oldestMessageIndex === -1) {
            break;
        }

        // Remove the oldest non-system message and recalculate token count
        messages.splice(oldestMessageIndex, 1);
        totalTokens = numTokensFromMessages(messages, model);        
    }
    
    //DEBUG
    console.log("messagesBeforeRemovingLastMessage tokens: " + numTokensFromMessages(messagesBeforeRemovingLastMessage, model));
    console.log("messages tokens: " + numTokensFromMessages(messages, model));

    return messages;
}

module.exports = {
    getTokenCount,
    numTokensFromMessages,
    removeOldestMessagesUntilLimit
}