import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
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

client.once('ready', async () => {
    console.log(`Bot logado como ${client.user.tag}`);
    // Envia paineis
    await sendRegistroPanel(client).catch(() => null);
    await sendPainelHoras(client).catch(() => null);
    await enviarPainelFormulario(client).catch(() => null);
    console.log('Paineis enviados.');
});

client.on('interactionCreate', async (interaction) => {
    // Se for um botão (ButtonInteraction), verificamos o customId para direcionar ao handler correto.
    if (interaction.isButton()) {
        const customId = interaction.customId;

        // Se o ID for do formulário, direciona para o handler de formulário.
        if (customId === 'start_form' || customId.startsWith('form_')) {
            await safeHandle(formularioHandler, client, interaction);
            return;
        }

        // Adicione outras verificações para outros comandos aqui, se necessário.
        // Exemplo: if (customId.startsWith('registro_')) { ... }
    }

    // Chama os handlers existentes (é mais seguro chamar todos no seu caso atual, mas o ideal é filtrar)
    try {
        await registroHandler(client, interaction);
        await painelHorasHandler(client, interaction);
        await formularioHandler(client, interaction);
    } catch (err) {
        // O bloco de erro original já está ok.
        console.error('Erro ao processar interação:', err);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Erro interno.', flags: 64 });
            } else {
                await interaction.editReply({ content: 'Erro interno.' });
            }
        } catch (e) { /* ignore */ }
    }
});

/**
 * Função utilitária para chamar handlers de forma segura, se você quiser adotar uma abordagem mais filtrada.
 */
async function safeHandle(handler, client, interaction) {
    try {
        await handler(client, interaction);
    } catch (err) {
        console.error(`Erro no handler ${handler.name}:`, err);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'Erro interno.', flags: 64 });
            } else {
                await interaction.editReply({ content: 'Erro interno.' });
            }
        } catch (e) { /* ignore */ }
    }
}


client.login(process.env.TOKEN);