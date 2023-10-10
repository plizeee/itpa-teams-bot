function createCard(type, text) {
    if (type !== 'question' && type !== 'answer') {
        throw new Error("Invalid card type");
    }
    
    return {
        type: type,
        text: text
    };
}

module.exports = {
    createCard
};
