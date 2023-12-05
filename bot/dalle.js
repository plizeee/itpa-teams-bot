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
    let message = msg.content;
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

    // let response = null;

    if(!response){
        console.log("no response");
        
        //the user said something that triggered the moderation policy, so tell the ai to shame the user based on what they said
        let fullPrompt = [];

        fullPrompt.push({
            role: "system",
            content: "The following DALL-E prompt has been blocked because it violates the moderation policy. Let the user know this by shaming, teasing and making fun of them over their request."
        });
        fullPrompt.push({
            role: "user",
            content: message
        });


        request = {
            model: "gpt-3.5-turbo-16k-0613",
            messages: fullPrompt,
            max_tokens: 500
        }

        let completion = await openai.chat.completions.create(request)
        .catch(error => { //catch error 400 for bad request
            console.log(error);
            if(error.code == 'context_length_exceeded'){
                msg.reply("Your message is too long. Please try again.");
                
            }
        })
        .catch(error => { //catching errors, such as sending too many requests, or servers are overloaded
            console.log(error);
            msg.reply("Something went wrong. Please try again later.");
        });

        if(!completion) {
            console.log("completion is null");
            return;
        }

        console.log(JSON.stringify(request, null, 2));
        console.log(JSON.stringify(completion, null, 2));

        let completionMessage = completion.choices[0].message

        //send the message as a reply
        await msg.reply(completionMessage.content);

        return;
    }

    let image_url = response.data[0].url;
    let filename = "reply.png";

    let revised_prompt = response.data[0].revised_prompt;

    //send the image as a reply
    const attachment = new Discord.AttachmentBuilder(image_url);

    attachment.name = filename;

    //send the image as a reply with the message
    await msg.reply({ 
        content: revised_prompt,
        files: [attachment] 
    });
}

function stripCommand(message){
    if(message.startsWith("!")){
        message = message.slice(message.indexOf(" ") + 1); //index of " " because commands will always end with that
    }

    return message;
}