//this script implements the DALL-E model
const {OpenAI} = require("openai");
const Discord = require('discord.js');
// const { response } = require("express");

require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API,
});

module.exports = {
    checkDalleCommand: async function (msg, isMasterBranch, client, config_) {
        let found = false;
        
        if (msg.content.toUpperCase().startsWith("!DALLE")) {
            found = true;
            dalleCommand(msg);
        }

        return found;
    }
};

async function dalleCommand(msg){
    let message = msg.content.toUpperCase();
    message = stripCommand(message);

    msg.channel.sendTyping();

    console.log("message:" + message);

    let request = {
        model: "dall-e-3",
        prompt: message,
        size: "1024x1024",
        quality: "standard",
        n: 1
    }

    let response = await openai.images.generate(request)
    .catch(err => {
        console.log(err);
    });

    if(!response){
        console.log("no response");
        return;
    }

    let image_url = response.data[0].url;
    let filename = "reply.png";

    //send the image as a reply
    const attachment = new Discord.AttachmentBuilder(image_url);

    attachment.name = filename;

    await msg.reply({ files: [attachment] });
}

function stripCommand(message){
    if(message.startsWith("!")){
        message = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    return message;
}