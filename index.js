import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, InteractionType } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
import { formularioHandler, enviarPainelFormulario } from './commands/formulario.js';
import { voiceStateHandler } from './commands/batePonto.js';
import { ticketHandler, sendTicketPanel } from './commands/ticket.js'; // ✅ NOVO IMPORT

// Trata erros silenciosos no Discloud
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
    await sendTicketPanel(client); // ✅ Envia painel de tickets
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

      // Ticket
      if (customId.startsWith('ticket_')) {
        await ticketHandler(client, interaction);
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
