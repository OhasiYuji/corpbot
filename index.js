import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
import { formularioHandler, enviarPainelFormulario } from './commands/formulario.js';
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

client.once('ready', async () => {
  console.log(`Bot logado como ${client.user.tag}`);

  // enviar todos os painéis
  await sendRegistroPanel(client).catch(()=>null);
  await sendPainelHoras(client).catch(()=>null);
  await enviarPainelFormulario(client).catch(()=>null);

  console.log('Todos os painéis enviados (registro, horas e formulário).');
});

// Interações (botões, modais, etc)
client.on('interactionCreate', async (interaction) => {
  try {
    await registroHandler(client, interaction);
    await painelHorasHandler(client, interaction);
    await formularioHandler(client, interaction);
  } catch (err) {
    console.error('Erro ao processar interação:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro interno.', flags: 64 });
      } else {
        await interaction.editReply({ content: 'Erro interno.' });
      }
    } catch {}
  }
});

// Bate-ponto (voiceStateUpdate)
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    await voiceStateHandler(client, oldState, newState);
  } catch (err) {
    console.error('Erro no voiceStateUpdate:', err);
  }
});

client.login(process.env.TOKEN);
