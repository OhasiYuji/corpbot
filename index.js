// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
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

// helper para limpar canal e mandar painel
async function resetChannelAndSend(sendFn, client) {
  try {
    const msg = await sendFn(client);
    if (!msg) return;

    const channel = msg.channel;
    await channel.bulkDelete(50).catch(() => null); // apaga últimas 50 msgs
    await sendFn(client); // envia novamente painel
  } catch (err) {
    console.error('Erro ao resetar canal:', err);
  }
}

client.once('ready', async () => {
  console.log(`Bot logado como ${client.user.tag}`);

  // Reenvia painéis (limpando canal antes)
  await resetChannelAndSend(sendRegistroPanel, client);
  await resetChannelAndSend(sendPainelHoras, client);

  console.log('Paineis resetados.');
});

client.on('interactionCreate', async (interaction) => {
  try {
    await registroHandler(client, interaction);
    await painelHorasHandler(client, interaction);
  } catch (err) {
    console.error('Erro ao processar interação:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro interno.', flags: 64 });
      } else {
        await interaction.editReply({ content: 'Erro interno.' });
      }
    } catch { /* ignore */ }
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    await voiceStateHandler(client, oldState, newState);
  } catch (err) {
    console.error('Erro no voiceStateUpdate:', err);
  }
});

client.login(process.env.TOKEN);
