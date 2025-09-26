import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler } from './commands/registro.js';
import { voiceStateHandler } from './commands/batePonto.js';
import { formularioHandler, enviarPainelFormulario } from './commands/formulario.js';
import { sendPainelHoras, painelHorasHandler } from './commands/painelHoras.js'; // <--- import painel de horas

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
    const registroChannelId = '1396852912709308426';
    const registroChannel = await client.channels.fetch(registroChannelId);
    if (registroChannel) {
        await registroHandler(client, { isButton: () => false, showModal: async () => {} });
    }

    // Enviar painel de formulário
    await enviarPainelFormulario(client);

    // Enviar painel de horas (admin)
    await sendPainelHoras(client);

    console.log('Painéis enviados!');
});

// Evento: interação (botão e modal)
client.on('interactionCreate', async (interaction) => {
    try {
        // Registro
        await registroHandler(client, interaction);

        // Formulário
        await formularioHandler(client, interaction);

        // Painel de horas
        await painelHorasHandler(client, interaction);

    } catch (err) {
        console.error('Erro ao processar interação:', err);
    }
});

// Evento: estado de voz (bate-ponto)
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        await voiceStateHandler(client, oldState, newState);
    } catch (err) {
        console.error('Erro no bate-ponto:', err);
    }
});

client.login(process.env.TOKEN);
