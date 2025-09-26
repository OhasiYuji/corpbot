// index.js
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { registroHandler, sendRegistroPanel } from './commands/registro.js';
import { painelHorasHandler, sendPainelHoras } from './commands/painelHoras.js';
import { voiceStateHandler } from './commands/batePonto.js';
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

  // Reenvia paineis (falha silenciosa se canal não existir)
  await sendRegistroPanel(client).catch(() => null);
  await sendPainelHoras(client).catch(() => null);
  await enviarPainelFormulario(client).catch(() => null);

  console.log('Paineis (tentativa) enviados.');
});

client.on('interactionCreate', async (interaction) => {
  try {
    // 1️⃣ Formulário
    await formularioHandler(client, interaction);

    // 2️⃣ Registro
    await registroHandler(client, interaction);

    // 3️⃣ Painel de Horas
    const painelIds = ['consultar_horas','adicionar_horas','remover_horas','limpar_horas','up_automatico'];
    if (interaction.isButton() && painelIds.includes(interaction.customId)) {
      await painelHorasHandler(client, interaction);
    }

  } catch (err) {
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

client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    await voiceStateHandler(client, oldState, newState);
  } catch (err) {
    console.error('Erro no voiceStateUpdate:', err);
  }
});

client.login(process.env.TOKEN);
