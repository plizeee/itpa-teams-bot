const { encoding_for_model } = require("tiktoken");

//return message sliced to the token count of token_limit
function trimEndToMatchTokenLimit(message, token_limit, model="gpt-3.5-turbo"){
    let tokens = getTokenCount(message, model);

    if(tokens > token_limit){
        let encoded_message = encodeMessage(message, model);

        //slice the byte array to the token limit
        let sliced_byte_array = encoded_message.slice(0, token_limit);

        //decode the byte array back to a string
        sliced_message = decodeMessage(sliced_byte_array, model);

        return sliced_message;
    }
    else{
        return message;
    }
}

function trimStartToMatchTokenLimit(message, token_limit, model="gpt-3.5-turbo"){
    let tokens = getTokenCount(message, model);
    console.log("tokens: " + tokens);
    console.log("token_limit: " + token_limit);

    if(tokens > token_limit){
        let encoded_message = encodeMessage(message, model);

        //remove tokens from the start of the byte array to match the token limit
        let sliced_byte_array = encoded_message.slice(tokens - token_limit);

        //decode the byte array back to a string
        sliced_message = decodeMessage(sliced_byte_array, model);

        console.log("sliced_message tokens: " + getTokenCount(sliced_message, model));

        return sliced_message;
    }
    else{
        return message;
    }
}

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

function removeOldestMessagesUntilLimit(messages, token_limit, model="gpt-3.5-turbo") {
    let totalTokens = numTokensFromMessages(messages, model);
    
    while (totalTokens > token_limit) {
        // Find the oldest non-system message
        let oldestMessageIndex = -1;
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role !== "system") {
                oldestMessageIndex = i;
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
    
    return messages;
}

module.exports = {
    trimEndToMatchTokenLimit,
    trimStartToMatchTokenLimit,
    getTokenCount,
    numTokensFromMessages,
    removeOldestMessagesUntilLimit
}