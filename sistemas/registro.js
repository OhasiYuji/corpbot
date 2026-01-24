const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const supabase = require('../utils/supabase');

// ============================================================
// ⚙️ CONFIGURAÇÃO (EDITE OS IDs ABAIXO)
// ============================================================
const ID_CANAL_REGISTRO = '1396852912709308426'; // Canal onde o painel será enviado
const ID_CANAL_LOG = '1418807745510903869';      // Canal onde avisa que alguém se registrou
const ID_CARGO_MARCACAO = '1390033256703066152'; // Cargo que será marcado no log (ex: Staff/RH)

// ============================================================
// 1. FUNÇÃO DE ENVIAR O PAINEL (ALL BLACK / MINIMALISTA)
// ============================================================

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_REGISTRO).catch(() => null);
    if (!channel) return console.log("❌ Canal de Registro não encontrado.");

    // Limpa mensagens antigas para o chat ficar limpo
    try {
        const msgs = await channel.messages.fetch({ limit: 5 });
        if (msgs.size > 0) await channel.bulkDelete(msgs).catch(() => {});
    } catch (e) {}

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'BOPE | SISTEMA DE IDENTIFICAÇÃO', iconURL: client.user.displayAvatarURL() })
        .setDescription(`
        **ACESSO RESTRITO**
        
        Para garantir a integridade das operações e o controle de efetivo, todos os oficiais devem manter seus registros atualizados no banco de dados central.

        \`\`\`ml
        STATUS: SISTEMA OPERACIONAL
        PROTOCOLO: REGISTRO_OBRIGATORIO
        \`\`\`
        
        > **INSTRUÇÃO:**
        > Clique no botão abaixo e insira seus dados exatamente como constam no jogo. Dados incorretos resultarão em falha na contabilização de horas.
        `)
        .setColor(0x000000) // All Black
        .setImage('https://i.imgur.com/r6TbfH0.png') // Linha separadora minimalista (opcional)
        .setFooter({ text: 'Setor de Tecnologia da Informação', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('abrir_registro')
            .setLabel('INICIAR REGISTRO')
            .setStyle(ButtonStyle.Secondary) // Cinza (Combina com o tema Dark)
    );

    await channel.send({ embeds: [embed], components: [row] });
    console.log("✅ Painel de Registro enviado.");
}

// ============================================================
// 2. GERENCIAMENTO DAS INTERAÇÕES
// ============================================================

async function gerenciarRegistro(interaction, client) {
    
    // --- 1. CLIQUE NO BOTÃO -> ABRE O MODAL ---
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = new ModalBuilder().setCustomId('modal_reg').setTitle('Registro de Oficial');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome (Apelido)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_jogo').setLabel('ID no Jogo').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('login').setLabel('Login (Username)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        
        await interaction.showModal(modal);
    }

    // --- 2. ENVIOU O MODAL -> SALVA NO BANCO ---
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_reg') {
        await interaction.deferReply({ ephemeral: true });
        
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        // Verifica se já existe
        const { data: existe } = await supabase.from('usuarios_registrados').select('*').eq('discord_id', interaction.user.id).single();
        
        if (existe) {
            return interaction.editReply(`⚠️ **ERRO:** Você já possui um registro ativo como **${existe.nome_jogo}**.`);
        }

        // Salva no Supabase
        const { error } = await supabase.from('usuarios_registrados').insert({
            discord_id: interaction.user.id,
            nome_jogo: nome,
            id_jogo: idJogo,
            login_jogo: login
        });

        if (error) {
            console.error(error);
            return interaction.editReply("❌ Ocorreu um erro ao salvar no banco de dados.");
        }

        // Tenta alterar o apelido no Discord
        try { 
            await interaction.member.setNickname(`${nome} | ${idJogo}`); 
        } catch (e) {
            console.log(`Não consegui alterar o nick de ${interaction.user.tag} (Permissão insuficiente).`);
        }
        
        // Log no Canal (Estilo Minimalista)
        const logChannel = await client.channels.fetch(ID_CANAL_LOG).catch(() => null);
        if (logChannel) {
            const logMsg = 
                `**NOVO REGISTRO EFETUADO**\n\n` +
                `> **Oficial:** <@${interaction.user.id}>\n` +
                `> **Nick:** ${nome}\n` +
                `> **ID:** ${idJogo}\n` +
                `> **Login:** ${login}\n` +
                `> **Status:** ✅ Confirmado\n` +
                `\n<@&${ID_CARGO_MARCACAO}>`;
            
            await logChannel.send(logMsg);
        }

        await interaction.editReply('✅ **SUCESSO:** Seu registro foi realizado e salvo no banco de dados.');
    }
}

module.exports = { enviarPainel, gerenciarRegistro };