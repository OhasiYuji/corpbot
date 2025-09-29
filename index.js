import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler } from './commands/registro.js';
import { painelHorasHandler } from './commands/painelHoras.js';
import { formularioHandler } from './commands/formulario.js';
import { voiceStateHandler } from './commands/batePonto.js';

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

client.once('ready', () => {
  console.log(`Bot logado como ${client.user.tag}`);
});

// ===== Interação: Registro =====
client.on('interactionCreate', async (interaction) => {
  try {
    await registroHandler(client, interaction);
  } catch (err) {
    console.error('Erro no registroHandler:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro no registro.', ephemeral: true });
      } else {
        await interaction.editReply({ content: 'Erro no registro.' });
      }
    } catch {}
  }
});

// ===== Interação: Painel de Horas =====
client.on('interactionCreate', async (interaction) => {
  try {
    await painelHorasHandler(client, interaction);
  } catch (err) {
    console.error('Erro no painelHorasHandler:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro no painel de horas.', ephemeral: true });
      } else {
        await interaction.editReply({ content: 'Erro no painel de horas.' });
      }
    } catch {}
  }
});

// ===== Interação: Formulário =====
client.on('interactionCreate', async (interaction) => {
  try {
    await formularioHandler(client, interaction);
  } catch (err) {
    console.error('Erro no formularioHandler:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro no formulário.', ephemeral: true });
      } else {
        await interaction.editReply({ content: 'Erro no formulário.' });
      }
    } catch {}
  }
});

// ===== Bate-ponto (voiceStateUpdate) =====
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    await voiceStateHandler(client, oldState, newState);
  } catch (err) {
    console.error('Erro no voiceStateUpdate:', err);
  }
});

client.login(process.env.TOKEN);
