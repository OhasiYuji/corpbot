import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler } from './commands/registro.js';
import { voiceStateHandler } from './commands/batePonto.js';
import { formularioHandler } from './commands/formulario.js';

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

    // Painel de registro
    const PANEL_CHANNEL_ID = '1396852912709308426';
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (channel) {
        await registroHandler(client, {
            isButton: () => false,
            showModal: async () => {},
        });
    }

    // Painel de formulário
    const FORM_CHANNEL = await client.channels.fetch('1390033258309357577');
    if (FORM_CHANNEL) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_form')
                .setLabel('Realizar Formulário')
                .setStyle(ButtonStyle.Primary)
        );

        const embed = new EmbedBuilder()
            .setTitle('📋 Formulário de Recrutamento')
            .setDescription('Clique no botão abaixo para iniciar o formulário.')
            .setColor(0x00AEFF);

        await FORM_CHANNEL.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    try {
        await registroHandler(client, interaction);
        await formularioHandler(client, interaction);
    } catch (err) {
        console.error('Erro na interação:', err);
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        await voiceStateHandler(client, oldState, newState);
    } catch (err) {
        console.error('Erro no bate-ponto:', err);
    }
});

client.login(process.env.TOKEN);
