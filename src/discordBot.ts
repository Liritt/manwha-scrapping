import {Client, GatewayIntentBits, TextChannel} from "discord.js";
import * as dotenv from 'dotenv';
import { dbConnexion } from '../DBConnexion';

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
            // TO DO : Créer un trigger qui sur delete remet les id bien comme il faut et remet la sequence en place
            console.log("Connected to database");
            return Promise.all(messages.map(async (message) => {
                if (message.author.id === process.env.AUTHOR_ID) {
                    try {
                        let manwhaName: string = message.content;
                        let parsedMessage: number;
                        let numLastChap = '';
                        let charToConvert: string;
                        do {
                            charToConvert = manwhaName.charAt(manwhaName.length-1);
                            parsedMessage = parseInt(charToConvert, 10);
                            if (!isNaN(parsedMessage)) {
                                numLastChap = charToConvert + numLastChap;
                                manwhaName = manwhaName.substring(0, manwhaName.length-1).trim();
                            }
                        } while (!isNaN(parsedMessage) && manwhaName.length > 0);
                        const testedManwhaName = manwhaName.toLowerCase();
                        if (testedManwhaName.endsWith('- chapter')) {
                            manwhaName = manwhaName.substring(0, manwhaName.length-9).trim();
                        } else if (testedManwhaName.endsWith('chapter')) {
                            manwhaName = manwhaName.substring(0, manwhaName.length-7).trim();
                        }
                        if (!((await dbConnexion.query(`SELECT "name" FROM "startedManwha" WHERE "name"=$1`, [manwhaName])).rows.length > 0)) {
                            await dbConnexion.query(`INSERT INTO "startedManwha" ("name", "numLastChap") VALUES ($1, $2)`, [manwhaName, parseInt(numLastChap, 10)]);
                            console.log("Inserting message into database");
                        }
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