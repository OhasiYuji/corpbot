import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, InteractionType } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
import { formularioHandler, enviarPainelFormulario } from './commands/formulario.js';
// ----------------------------------------------------
// IMPORTAÇÃO CORRIGIDA: Importe o handler do ponto
import { voiceStateHandler } from './commands/batePonto.js'; 
// ----------------------------------------------------
import { ticketHandler, sendTicketPanel } from './commands/ticket.js';


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
    await sendTicketPanel(client).catch(() => null);
    console.log('Paineis enviados.');
});

// ----------------------------------------------------
// ADIÇÃO CRUCIAL: Ouvinte para o evento de mudança de voz
client.on('voiceStateUpdate', (oldState, newState) => {
    voiceStateHandler(client, oldState, newState);
});
// ----------------------------------------------------


client.on('interactionCreate', async (interaction) => {
  try {
    const customId = interaction.customId;

    // =========================
    // BOTÕES
    // =========================
    if (interaction.isButton()) {
      // 📋 Formulário
      if (customId === 'start_form' || customId.startsWith('form_')) {
        await formularioHandler(client, interaction);
        return;
      }

      // 🧾 Registro
      if (customId === 'open_modal_registro') {
        await registroHandler(client, interaction);
        return;
      }

      // 🎟️ Ticket
      if (
        customId.startsWith('ticket_') || // abrir ticket
        customId === 'fechar_ticket'      // fechar ticket
      ) {
        await ticketHandler(client, interaction);
        return;
      }

      // 💼 Painel de Horas (botões internos do painel)
      await painelHorasHandler(client, interaction);
      return;
    }

    // =========================
    // MODAIS
    // =========================
    if (interaction.type === InteractionType.ModalSubmit) {
      // Modal de Registro
      if (customId === 'modal_registro') {
        await registroHandler(client, interaction);
        return;
      }

      // Outros modais futuros...
    }

    // =========================
    // FALLBACK (para selects, menus, etc.)
    // =========================
    await painelHorasHandler(client, interaction);

  } catch (err) {
    console.error('Erro fatal ao processar interação:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Ocorreu um erro interno ao processar sua solicitação.',
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: '⚠️ Ocorreu um erro após o processamento da interação.'
        });
      }
    } catch (e) {
      console.error('Erro ao enviar mensagem de erro:', e);
    }
  }
});



client.login(process.env.TOKEN);