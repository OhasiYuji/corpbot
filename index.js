// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { voiceStateHandler } from './commands/batePonto.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel]
});

client.once('ready', async () => {
    console.log(`Bot logado como ${client.user.tag}`);

    // Envia o painel de registro com botão
    await sendRegistroPanel(client);
});

client.on('interactionCreate', async (interaction) => {
    await registroHandler(client, interaction);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    await voiceStateHandler(client, oldState, newState);
});

client.login(process.env.TOKEN);
