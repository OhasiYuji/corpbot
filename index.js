require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const sysForm = require('./sistemas/formulario');
const sysReg = require('./sistemas/registro');
const sysPonto = require('./sistemas/ponto');
const sysGestao = require('./sistemas/gestao');
const sysRH = require('./sistemas/rh');
const sysTicket = require('./sistemas/ticket');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.once('ready', async () => {
    console.log(`💀 SISTEMA ONLINE: ${client.user.tag}`);
    try {
        console.log("⏳ Carregando painéis...");
        await sysForm.enviarPainel(client);
        await sysReg.enviarPainel(client);
        await sysGestao.enviarPainel(client);
        await sysRH.enviarPainel(client);
        await sysTicket.enviarPainel(client);
        console.log("✅ Tudo pronto!");
    } catch (error) { console.error("Erro:", error); }
});

client.on('interactionCreate', async (interaction) => {
    try {
        await sysForm.gerenciarFormulario(interaction, client);
        await sysReg.gerenciarRegistro(interaction, client);
        await sysGestao.gerenciarInteracoes(interaction);
        await sysRH.gerenciarRH(interaction, client);
        await sysTicket.gerenciarTicket(interaction, client);
    } catch (error) { console.error(error); }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    await sysPonto.gerenciarPonto(oldState, newState, client);
});

client.login(process.env.DISCORD_TOKEN);
