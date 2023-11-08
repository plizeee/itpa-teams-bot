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

function numTokensFromMessages(messages, model="gpt-3.5-turbo") {
    const encoding = encoding_for_model(model);
    let numTokens = 0;

    for (let message of messages) {
        numTokens += 4;  // every message format starts with 4 tokens for the role and content keys
        if (message.content) {
            if (typeof message.content === 'string') {
                // If it's a string, encode it directly
                numTokens += encoding.encode(message.content).length;
            } else if (Array.isArray(message.content)) {
                // If it's an array, iterate over each item
                for (let item of message.content) {
                    if (item.type === 'text' && item.text) {
                        numTokens += encoding.encode(item.text).length;
                    } else if (item.type === 'image_url' && item.image_url) {
                        // Image URLs count for a fixed amount of tokens (for example 1 token)
                        numTokens += 1;
                    }
                }
            }
        }
    }

    numTokens += 2;  // every reply is primed with 2 tokens
    encoding.free(); // Don't forget to free the encoder when done
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