import {Client, GatewayIntentBits, Message, TextChannel} from "discord.js";
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

async function getAllMessages(channel: TextChannel) {
    let lastId: string | undefined;
    const messages: Array<Message> = [];
    let messagesChunk;
    while (true) {
        const options = lastId ? { limit: 100, before: lastId } : { limit: 100 };
        messagesChunk = await channel.messages.fetch(options);
        messages.push(...messagesChunk.values());
        if (messagesChunk.size < 100) break;
        lastId = messagesChunk.last()?.id;
    }
    return messages;
}

function getNameAndNumChapFromMessage(message: Message) {
    let manwhaName: string = message.content;
    let parsedMessage: number;
    let numLastChap = '';
    let charToConvert: string;
    do {
        charToConvert = manwhaName.charAt(manwhaName.length-1);
        if (charToConvert === ".") {
            numLastChap = charToConvert + numLastChap;
            manwhaName = manwhaName.substring(0, manwhaName.length-1);
            charToConvert = manwhaName.charAt(manwhaName.length-1);
        }
        parsedMessage = parseInt(charToConvert, 10);
        if (!isNaN(parsedMessage)) {
            numLastChap = charToConvert + numLastChap;
            manwhaName = manwhaName.substring(0, manwhaName.length-1).trim();
        }
    } while (!isNaN(parsedMessage) && manwhaName.length > 0);
    const testedManwhaName = manwhaName.toLowerCase();
    if (testedManwhaName.endsWith('- chapter') || testedManwhaName.endsWith('- chapitre') || testedManwhaName.endsWith('– chapter')) {
        manwhaName = manwhaName.substring(0, manwhaName.length-9).trim();
    } else if (testedManwhaName.endsWith('chapter') || testedManwhaName.endsWith('chapitre')) {
        manwhaName = manwhaName.substring(0, manwhaName.length-7).trim();
    }
    return {manwhaName, numLastChap}
}

client.once("ready", async () => {
    console.log("Je suis en ligne maintenant !")
    const guild = client.guilds.cache.get(process.env.SERVER_ID);
    if (!guild) return console.error('Guild not found');

    const channel1 = guild.channels.cache.get(process.env.CHANNEL1_ID) as TextChannel;
    const channel2 = guild.channels.cache.get(process.env.CHANNEL2_ID) as TextChannel;
    if (!channel1 && !channel2) return console.error('Text channel not found');
    const messages1 = await getAllMessages(channel1);
    const messages2 = await getAllMessages(channel2);
    return dbConnexion.connect()
        .then(() => {
            console.log("Connected to database");
            return [...messages1, ...messages2].map(async (message) => {
                try {
                    if (message.author.id === process.env.AUTHOR_ID) {
                        try {
                            const {manwhaName, numLastChap} = getNameAndNumChapFromMessage(message);
                            if (!((await dbConnexion.query(`SELECT "name" FROM "startedManwha" WHERE "name"=$1`, [manwhaName])).rows.length > 0)) {
                                await dbConnexion.query(`INSERT INTO "startedManwha" ("name", "numLastChap") VALUES ($1, $2)`, [manwhaName, parseFloat(numLastChap)]);
                                console.log("Inserting message into database");
                            }
                        } catch (error) {
                            console.error(error);
                        }
                    }
                } catch (err) {
                    console.log(message);
                }
            });
        })
});

client.on('messageUpdate', async (oldMessage: Message, newMessage: Message) => {
    if (newMessage.author.id === process.env.AUTHOR_ID && newMessage.guild.id === process.env.SERVER_ID && newMessage.channel.id === process.env.CHANNEL_ID) {
        const {manwhaName: newManwhaName, numLastChap: newNumLastChap} = getNameAndNumChapFromMessage(newMessage);
        const {manwhaName: oldManwhaName} = getNameAndNumChapFromMessage(oldMessage);
        await dbConnexion.query(`UPDATE "startedManwha" SET "name" = {$1} AND "numLastChap" = {$2} WHERE "name"={$3}`, [newManwhaName, newNumLastChap, oldManwhaName])
        console.log(`Le manwha "${newManwhaName}" a bien été modifié dans la database !`)
    }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.author.id === process.env.AUTHOR_ID) {
        const {manwhaName, numLastChap} = getNameAndNumChapFromMessage(message);
        if (message.channel.id === process.env.CHANNEL_ID) {
            await dbConnexion.query(`INSERT INTO "startedManwha" ("name", "numLastChap") VALUES ($1, $2)`, [manwhaName, numLastChap])
            console.log(`Le manwha "${manwhaName}" a bien été ajouté dans la database !`)
        } else if (message.channel.id === process.env.CHANNEL_ID2) {
            await dbConnexion.query(`INSERT INTO "startedManwha" ("name", "numLastChap", "type") VALUES ($1, $2, $3)`, [manwhaName, numLastChap, 'H'])
            console.log(`Le manwha "${manwhaName}" a bien été ajouté dans la database !`)
        }
    }
})

client.on("messageDelete", async (message: Message) => {
    if (message.author.id === process.env.AUTHOR_ID && message.guild.id === process.env.SERVER_ID && message.channel.id === process.env.CHANNEL_ID) {
        const {manwhaName} = getNameAndNumChapFromMessage(message);
        await dbConnexion.query(`DELETE FROM "startedManwha" WHERE "name"={$1}`, [manwhaName])
        console.log(`Le manwha "${manwhaName}" a bien été supprimé de la database !`)
    }
})


client.login(process.env.TOKEN);