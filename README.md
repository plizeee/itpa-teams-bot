# Teams Bot

A discord bot made for my itpa class, which is both a tool to retrieve online class meeting links, as well as an ai assistant, using OpenAI.

This project isn't meant to be used by anyone else, but if you want to, you can. It's mostly a personal project that I use as an excuse to apply what I learned in class, as well as whatever I'm interested in at the time. The code certainly won't win me any awards, but I hope it demonstrates my ability to learn and apply new concepts.

Shoutouts to Will for helping and collaborating with me on this project, as well as Ben, who scrutinized my code and... well, scrutinized my code.

## Getting Started

Since this project is meant to be a collection of things I'm interested in, the setup is a bit more hands on, but I'll work on making it easier to set up in the future.

The functionality of this bot is split into a few parts: 

Teams: A tool to retrieve online class meeting links from a json file. To add courses, can manually edit the courses.json file, or use the web client, under the Schedule tab to make it easier. You can create a name, course code, and (optional) link for each course. For each course, you can add scheduled classes, by specifying the day of the week, the start and end of the class, and you can mark whether that class online, so that we can retrieve the link for that class.

AI: This can be used as an assistant, or you can configure it however you want it to be. There are some configuration options in the config.json file and you can create custom commands inside promptCommands.json. Both of these files can be edited manually, or you can use the web client, which makes it easier to configure. Prompt commands are custom commands that use a specifiable OpenAI API language model, along with a system prompt, which will dictate the behaviour of that command.

Web Client: The visual interface to make configuration easier. This interface allows you to configure both the Teams functionality and the AI functionality, so you don't have to edit the json files manually.

### Prerequisites

A discord bot token, which you can get by creating a new application at https://discord.com/developers/applications

An OpenAI API key, which you can get by creating an account at https://beta.openai.com/

Node.js, which you can get at https://nodejs.org/en/

### Installing