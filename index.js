// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler } from './commands/registro.js';
import { voiceStateHandler } from './commands/batePonto.js';
import { formularioHandler, enviarPainelFormulario } from './commands/formulario.js';

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

    // Enviar painel de registro
    const PANEL_CHANNEL_ID = '1396852912709308426';
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (channel) {
        await registroHandler(client, { isButton: () => false, showModal: async () => {} });
    }

    // Enviar painel do formulário
    await enviarPainelFormulario(client);
});

// Evento: interação (botão, modal, form, etc)
client.on('interactionCreate', async (interaction) => {
    await registroHandler(client, interaction);
    await formularioHandler(client, interaction);
});

// Evento: estado de voz (bate-ponto)
client.on('voiceStateUpdate', async (oldState, newState) => {
    await voiceStateHandler(client, oldState, newState);
});

client.login(process.env.TOKEN);
