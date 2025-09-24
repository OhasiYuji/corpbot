import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import registroHandler from './commands/registro.js';
import batePontoHandler from './commands/batePonto.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
});

// Registro de eventos
client.on('interactionCreate', async (interaction) => {
    await registroHandler(client, interaction);
});

// Bate-ponto por voiceStateUpdate
batePontoHandler(client);

client.once('ready', () => {
    console.log(`Bot logado como ${client.user.tag}`);
});

client.login(process.env.TOKEN);
