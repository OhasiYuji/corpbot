import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, InteractionType } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
import { formularioHandler, enviarPainelFormulario } from './commands/formulario.js';
// ----------------------------------------------------
// IMPORTAÇÃO CORRIGIDA: Importe o handler do ponto
import { voiceStateHandler } from './commands/batePonto.js'; 
// ----------------------------------------------------


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        // INTENTO CORRETO: Este intent é essencial e já está presente
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

// ----------------------------------------------------
// ADIÇÃO CRUCIAL: Ouvinte para o evento de mudança de voz
client.on('voiceStateUpdate', (oldState, newState) => {
    voiceStateHandler(client, oldState, newState);
});
// ----------------------------------------------------


client.on('interactionCreate', async (interaction) => {
    // A interação será roteada para apenas um handler, evitando conflitos de resposta.
    try {
        if (interaction.isButton()) {
            const customId = interaction.customId;

            // Roteamento para Formulário
            if (customId === 'start_form' || customId.startsWith('form_')) {
                await formularioHandler(client, interaction);
                return; 
            }
            
            // Roteamento para Registro (Botão 'Abrir Formulário')
            if (customId === 'open_modal_registro') {
                await registroHandler(client, interaction);
                return;
            }

            // O seu roteamento de painelHoras...

        } else if (interaction.type === InteractionType.ModalSubmit) {
            const customId = interaction.customId;

            // Roteamento para Registro (Submissão do Modal)
            if (customId === 'modal_registro') {
                await registroHandler(client, interaction);
                return;
            }
            // Adicione roteamento para outros modais aqui, se houver.
        }
        
        // Chamada de fallback para painelHorasHandler.
        await painelHorasHandler(client, interaction); 

    } catch (err) {
        // Bloco de erro aprimorado
        console.error('Erro fatal ao processar interação:', err);
        try {
            if (!interaction.replied && !interaction.deferred) {
                // Tenta responder de forma efêmera se a interação não foi reconhecida
                await interaction.reply({ content: 'Erro interno ao processar sua solicitação.', ephemeral: true });
            } else if (interaction.deferred) {
                // Se o bot já enviou "pensando...", edita a mensagem
                await interaction.editReply({ content: 'Ocorreu um erro interno após o processamento.' });
            }
        } catch (e) { 
            console.error('Erro ao enviar mensagem de erro:', e);
        }
    }
});


client.login(process.env.TOKEN);