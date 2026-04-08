require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

// [NOVO] Importando a conexão com o banco de dados
const supabase = require('./utils/supabase.js'); 

const sysForm = require('./sistemas/formulario');
const sysReg = require('./sistemas/registro');
const sysPonto = require('./sistemas/ponto');
const sysGestao = require('./sistemas/gestao');
const sysRH = require('./sistemas/rh');
const sysTicket = require('./sistemas/ticket');
// Aproveitei para organizar os imports e subi o de apelidos pra cá
const gestaoApelidos = require('./sistemas/gestao_apelidos.js'); 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers, // Essa intent é a que permite o bot ver quem entra e sai!
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

// --- [NOVO] EVENTO: QUANDO ALGUÉM SAI DO SERVIDOR ---
client.on('guildMemberRemove', async (member) => {
    try {
        const { data, error } = await supabase
            .from('sua_tabela_de_registros') // ⚠️ ALTERE PARA O NOME DA SUA TABELA
            .delete()
            .eq('discord_id', member.id) // ⚠️ ALTERE PARA O NOME DA SUA COLUNA DO ID
            .select();

        // Se encontrou e deletou alguém, avisa no console (e no canal, se quiser)
        if (data && data.length > 0) {
            console.log(`🗑️ Registro automático apagado: ${member.user.tag} saiu do servidor.`);
            
            // Opcional: Descomente as linhas abaixo se quiser que o bot avise no chat
            // const canalLog = await member.guild.channels.fetch('ID_DO_CANAL_AQUI').catch(()=>null);
            // if (canalLog) canalLog.send(`⚠️ O ex-agente **${member.user.tag}** saiu da cidade. Registro removido do sistema.`);
        }
    } catch (err) {
        console.error('Erro ao deletar membro que saiu do servidor:', err);
    }
});
// ---------------------------------------------------

gestaoApelidos(client);

client.login(process.env.DISCORD_TOKEN);