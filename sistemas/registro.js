const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, AttachmentBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const path = require('path');
const fs = require('fs');

// ============================================================
// ⚙️ CONFIGURAÇÃO
// ============================================================
const ID_CANAL_REGISTRO = '1396852912709308426'; 
const ID_CANAL_LOG = '1463503382449754122';      
const ID_CARGO_MARCACAO = '1399883634210508862'; // ID atualizado conforme seu pedido

// Caminho do Banner
const CAMINHO_BANNER = path.join(__dirname, '../assets/Banner.png');

// Emoji da Medalha
const EMOJI_MEDALHA = '<:medalha:1407068603299139786>';

// ============================================================
// 1. ENVIAR PAINEL
// ============================================================

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_REGISTRO).catch(() => null);
    if (!channel) return console.log("❌ Canal de Registro não encontrado.");

    try {
        const msgs = await channel.messages.fetch({ limit: 5 });
        if (msgs.size > 0) await channel.bulkDelete(msgs).catch(() => {});
    } catch (e) {}

    let arquivoBanner = null;
    if (fs.existsSync(CAMINHO_BANNER)) {
        arquivoBanner = new AttachmentBuilder(CAMINHO_BANNER, { name: 'Banner.png' });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'PMMG | SISTEMA DE IDENTIFICAÇÃO', iconURL: client.user.displayAvatarURL() })
        .setDescription(`
        **ACESSO RESTRITO**
        
        Para garantir a integridade das operações e o controle de efetivo, todos os oficiais devem manter seus registros atualizados no banco de dados central.
        
        > **INSTRUÇÃO:**
        > Clique no botão abaixo e insira seus dados exatamente como constam no jogo. Dados incorretos resultarão em falha na contabilização de horas.
        `)
        .setColor(0x000000)
        .setFooter({ text: 'Setor de Tecnologia da Informação', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    if (arquivoBanner) {
        embed.setImage('attachment://Banner.png');
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('abrir_registro')
            .setLabel('INICIAR REGISTRO')
            .setStyle(ButtonStyle.Secondary)
    );

    const pacoteEnvio = { embeds: [embed], components: [row] };
    if (arquivoBanner) {
        pacoteEnvio.files = [arquivoBanner];
    }

    await channel.send(pacoteEnvio);
    console.log("✅ Painel de Registro enviado.");
}

// ============================================================
// 2. GERENCIAMENTO DAS INTERAÇÕES
// ============================================================

async function gerenciarRegistro(interaction, client) {
    
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = new ModalBuilder().setCustomId('modal_reg').setTitle('Registro de Oficial');
        
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome (Apelido)').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_jogo').setLabel('ID no Jogo').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('login').setLabel('Login (Username)').setStyle(TextInputStyle.Short).setRequired(true))
        );
        
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_reg') {
        await interaction.deferReply({ ephemeral: true });
        
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        const { data: existe } = await supabase.from('usuarios_registrados').select('*').eq('discord_id', interaction.user.id).single();
        
        if (existe) {
            return interaction.editReply(`⚠️ **ERRO:** Você já possui um registro ativo como **${existe.nome_jogo}**.`);
        }

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

        try { 
            await interaction.member.setNickname(`ᴘᴍᴍɢ • ${nome} | ${idJogo}`); 
        } catch (e) {
            console.log(`Não consegui alterar o nick de ${interaction.user.tag}.`);
        }
        
        // --- LOG ATUALIZADO COM O VISUAL PEDIDO ---
        const logChannel = await client.channels.fetch(ID_CANAL_LOG).catch(() => null);
        if (logChannel) {
            const logMsg = 
                `${EMOJI_MEDALHA} **NOME:** <@${interaction.user.id}>\n` +
                `${EMOJI_MEDALHA} **NICKNAME:** ${nome}\n` +
                `${EMOJI_MEDALHA} **LOGIN:** ${login}\n` +
                `${EMOJI_MEDALHA} **ID:** ${idJogo}\n` +
                `${EMOJI_MEDALHA} **MARCAÇÃO:** <@&${ID_CARGO_MARCACAO}>`;
            
            await logChannel.send(logMsg);
        }

        await interaction.editReply('✅ **SUCESSO:** Seu registro foi realizado e salvo no banco de dados.');
    }
}

module.exports = { enviarPainel, gerenciarRegistro };