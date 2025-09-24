// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler } from './commands/registro.js';
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

// Evento: pronto
client.once('ready', async () => {
    console.log(`Bot logado como ${client.user.tag}`);

    // Enviar painel de registro (botão)
    const PANEL_CHANNEL_ID = '1396852912709308426';
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (channel) {
        await registroHandler(client, {
            isButton: () => false, // apenas para enviar botão inicial
            showModal: async () => {},
        });
    }
});

// Evento: interação (botão e modal)
client.on('interactionCreate', async (interaction) => {
    await registroHandler(client, interaction);
});

// Evento: estado de voz (bate-ponto)
client.on('voiceStateUpdate', async (oldState, newState) => {
    await voiceStateHandler(client, oldState, newState);
});

client.login(process.env.TOKEN);
