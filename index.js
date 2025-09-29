import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, InteractionType } from 'discord.js';
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

            // Roteamento para Painel de Horas (adicione IDs específicos se houver botões)
            // if (customId.startsWith('horas_')) {
            //     await painelHorasHandler(client, interaction);
            //     return;
            // }

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
        // Se o seu painelHorasHandler lida com comandos de barra, ou outras interações
        // que não foram capturadas acima, ele ainda será chamado aqui.
        await painelHorasHandler(client, interaction); 

    } catch (err) {
        // Bloco de erro aprimorado para lidar com interações que falharam em qualquer estágio.
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

// A função utilitária safeHandle foi removida pois o novo sistema de roteamento já é seguro.

client.login(process.env.TOKEN);