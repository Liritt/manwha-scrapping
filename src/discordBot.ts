import * as discord from "discord.js";
import * as dotenv from "dotenv";
import "../types";

dotenv.config();

const bot = new discord.Client({intents: [3243773]});

bot.once("ready", () => {
    console.log("Je suis en ligne maintenant !")
})

bot.on("messageCreate", message => {
    if (message.author.bot) return;
    if (message.author.id === process.env.AUTHOR_ID && message.channel.id === process.env.CHANNEL_ID) message.channel.send("Message reçu !");
});

bot.login(process.env.TOKEN);