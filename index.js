import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, InteractionType } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
import { formularioHandler, enviarPainelFormulario } from './commands/formulario.js';
import { voiceStateHandler } from './commands/batePonto.js';
// ⚠️ ATENÇÃO: Importe 'closeTicket' também para poder chamá-la
import { ticketHandler, sendTicketPanel, closeTicket } from './commands/ticket.js'; 

process.on('unhandledRejection', (reason) => console.log('🚨 Erro não tratado:', reason));
process.on('uncaughtException', (err) => console.log('🔥 Erro fatal:', err));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel],
});

client.once('ready', async () => {
  console.log(`✅ Bot logado como ${client.user.tag}`);

  try {
    await sendRegistroPanel(client);
    await sendPainelHoras(client);
    await enviarPainelFormulario(client);
    await sendTicketPanel(client);
    console.log('📋 Paineis enviados com sucesso.');
  } catch (err) {
    console.error('Erro ao enviar algum painel:', err);
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  voiceStateHandler(client, oldState, newState);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // 🛑 CORREÇÃO APLICADA AQUI: Trata o botão de fechar primeiro!
      if (customId === 'ticket_close') {
        await closeTicket(interaction); // Chama a função de fechar
        return;
      }

      // Ticket (Apenas criação)
      if (customId.startsWith('ticket_')) {
        await ticketHandler(client, interaction); // Chama a função de criar
        return;
      }

      // Formulário
      if (customId === 'start_form' || customId.startsWith('form_')) {
        await formularioHandler(client, interaction);
        return;
      }

      // Registro
      if (customId === 'open_modal_registro') {
        await registroHandler(client, interaction);
        return;
      }
    } 
    
    else if (interaction.type === InteractionType.ModalSubmit) {
      const customId = interaction.customId;

      if (customId === 'modal_registro') {
        await registroHandler(client, interaction);
        return;
      }
    }

    await painelHorasHandler(client, interaction);
  } catch (err) {
    console.error('Erro ao processar interação:', err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Erro interno ao processar sua solicitação.', ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);