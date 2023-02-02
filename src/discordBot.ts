import {Client, GatewayIntentBits, TextChannel} from "discord.js";
import * as dotenv from 'dotenv';
import { dbConnexion } from '../DBConnexion';
import { getAll } from "./queries";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

client.once("ready", async () => {
    console.log("Je suis en ligne maintenant !")
    const guild = client.guilds.cache.get(process.env.SERVER_ID);
    if (!guild) return console.error('Guild not found');

    const channel = guild.channels.cache.get(process.env.CHANNEL_ID) as TextChannel;
    if (!channel) return console.error('Text channel not found');

    const messages = await channel.messages.fetch({ limit: 5 });
    console.log(`Received ${messages.size} messages`);
    dbConnexion.connect()
        .then(() => {
            console.log("Connected to database");
            return Promise.all(messages.map(async (message) => {
                if (message.author.id === process.env.AUTHOR_ID) {
                    console.log("Inserting message into database");
                    try {
                        const lstName = await dbConnexion.query("select name from \"startedManwha\"")
                        lstName.rows.some((name) => name.name === message.content)
                            ? console.log("Name already exists")
                            : await dbConnexion.query("INSERT INTO \"startedManwha\" (name, \"nbLastChap\") VALUES ($1, $2)", [message.content, 3]);
                    } catch (error) {
                        console.error(error);
                    }
                }
            }));
        })
        .then(() => {
            dbConnexion.end();
        });
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (newMessage.author.id === process.env.AUTHOR_ID && newMessage.guild.id === process.env.SERVER_ID && newMessage.channel.id === process.env.CHANNEL_ID) {
        console.log(`Ancien contenu : ${oldMessage.content}`);
        console.log(`Nouveau contenu : ${newMessage.content}`);
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.author.id === process.env.AUTHOR_ID && (message.channel.id === process.env.CHANNEL_ID || message.channel.id === process.env.CHANNEL_ID2)) console.log(message.content);
})

client.on("messageDelete", async (message) => {
    if (message.author.id === process.env.AUTHOR_ID && message.guild.id === process.env.SERVER_ID && message.channel.id === process.env.CHANNEL_ID) {
        console.log(`Message supprimé: ${message}`)
    }
})


client.login(process.env.TOKEN);