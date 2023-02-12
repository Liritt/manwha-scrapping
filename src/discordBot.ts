import {Client, GatewayIntentBits, Message, PartialMessage, Partials, TextChannel} from "discord.js";
import * as dotenv from 'dotenv';
import {dbConnexion} from '../DBConnexion';
import {channel} from "diagnostics_channel";

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Message,
        Partials.Channel
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

function getNameAndNumChapFromMessage(message: Message | PartialMessage) {
    let manwhaName: string = message.content;
    let parsedMessage: number;
    let numLastChap = '';
    let charToConvert: string;
    do {
        charToConvert = manwhaName.charAt(manwhaName.length-1);
        if (charToConvert === "." && !numLastChap.includes(".")) {
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
    await dbConnexion.connect();
    console.log("Connected to database");
    for (const message of [...messages1, ...messages2]) {
        try {
            if (message.author.id === process.env.AUTHOR_ID) {
                try {
                    const {manwhaName, numLastChap} = getNameAndNumChapFromMessage(message);
                    if (!((await dbConnexion.query(`SELECT "name" FROM "startedManwha" WHERE "name"=$1`, [manwhaName])).rows.length > 0)) {
                        const type = message.channel.id === process.env.CHANNEL2_ID ? 'H' : 'N';
                        await dbConnexion.query(`INSERT INTO "startedManwha" ("name", "numLastChap", "type", "idDiscord") VALUES ($1, $2, $3, $4)`, [manwhaName, parseFloat(numLastChap), type, message.id]);
                        console.log(`Le manwha "${manwhaName}" a bien été ajouté dans la database !`);
                    }
                } catch (error) {
                    console.error(error);
                }
            }
        } catch (err) {
            console.log(message);
        }
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (oldMessage.partial) {
            console.log("coucou")
            newMessage.fetch()
                .then(async fullMessage => {
                    const {manwhaName: newManwhaName, numLastChap: newNumLastChap} = getNameAndNumChapFromMessage(fullMessage);
                    console.log(typeof newNumLastChap, typeof newManwhaName)
                    if (newNumLastChap !== "") {
                        await dbConnexion.query(`UPDATE "startedManwha" SET "name"=$1, "numLastChap"=$2 WHERE "idDiscord"=$3`, [newManwhaName, parseFloat(newNumLastChap), fullMessage.id]);
                    } else {
                        await dbConnexion.query(`UPDATE "startedManwha" SET "name"=$1 WHERE "idDiscord"=$2`, [newManwhaName, fullMessage.id]);
                    }
                    console.log(`Message modifié vers ${fullMessage.content} réussi !`);
                })
        } else {
            const {manwhaName: newManwhaName, numLastChap: newNumLastChap} = getNameAndNumChapFromMessage(newMessage);
            if (newNumLastChap !== "") {
                await dbConnexion.query(`
                    UPDATE "startedManwha" 
                    SET "name"=$1, "numLastChap"=$2 
                    WHERE "idDiscord"=$3`, [newManwhaName, parseFloat(newNumLastChap), newMessage.id]
                );
            } else {
                await dbConnexion.query(`UPDATE "startedManwha" SET "name"=$1 WHERE "idDiscord"=$2`, [newManwhaName, newMessage.id]);
            }
            console.log(`Message modifié vers ${newMessage.content} réussi !`);
        }
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.author.id === process.env.AUTHOR_ID) {
        const {manwhaName, numLastChap} = getNameAndNumChapFromMessage(message);
        const type = message.channel.id === process.env.CHANNEL2_ID ? 'H' : 'N';
        await dbConnexion.query(`INSERT INTO "startedManwha" ("name", "numLastChap", "type", "idDiscord") VALUES ($1, $2, $3, $4)`, [manwhaName, parseFloat(numLastChap), type, message.id]);
        console.log(`Le manwha "${manwhaName}" a bien été ajouté dans la database !`);
    }
});

client.on("messageDelete", async (message) => {
    if (message.channel.id === process.env.CHANNEL1_ID || message.channel.id === process.env.CHANNEL2_ID)
    {
        await dbConnexion.query(`DELETE FROM "startedManwha" WHERE "idDiscord"=$1`, [message.id]);
        console.log(`Message supprimé dans la base de donnée !`);
    }
});


client.login(process.env.TOKEN);