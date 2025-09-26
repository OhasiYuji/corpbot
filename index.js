import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { voiceStateHandler } from './commands/batePonto.js';
import { sendPainelHoras, painelHorasHandler } from './commands/painelHoras.js';

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

  await sendRegistroPanel(client);
  await sendPainelHoras(client);

  console.log('Todos os painéis enviados!');
});

client.on('interactionCreate', async (interaction) => {
  try {
    await registroHandler(client, interaction);
    await painelHorasHandler(client, interaction);
  } catch (err) {
    console.error('Erro ao processar interação:', err);
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
