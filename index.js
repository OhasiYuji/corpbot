// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, InteractionType } from 'discord.js';
import { registroHandler, enviarPainelRegistro } from './commands/registro.js';
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

    try {
        // Enviar painel de registro
        await enviarPainelRegistro(client);

        // Enviar painel de formulário
        await enviarPainelFormulario(client);
    } catch (err) {
        console.error('Erro ao enviar painéis:', err);
    }
});

// Evento: interação (botão e modal)
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton() || interaction.type === InteractionType.ModalSubmit) {
            // Registro
            await registroHandler(client, interaction);

            // Formulário
            await formularioHandler(client, interaction);
        }
    } catch (err) {
        console.error('Erro em interação:', err);
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
