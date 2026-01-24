const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, AttachmentBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const path = require('path');
const fs = require('fs');

// ============================================================
// ⚙️ CONFIGURAÇÃO
// ============================================================
const ID_CANAL_REGISTRO = '1396852912709308426'; 
const ID_CANAL_LOG = '1418807745510903869';      
const ID_CARGO_MARCACAO = '1390033256703066152'; 

// Caminho exato da sua imagem (ajustado para funcionar relativo à pasta do bot)
// O arquivo deve estar em: CORPBOT/assets/Banner.png
const CAMINHO_BANNER = path.join(__dirname, '../assets/Banner.png');

// ============================================================
// 1. FUNÇÃO DE ENVIAR O PAINEL (COM BANNER LOCAL)
// ============================================================

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_REGISTRO).catch(() => null);
    if (!channel) return console.log("❌ Canal de Registro não encontrado.");

    try {
        const msgs = await channel.messages.fetch({ limit: 5 });
        if (msgs.size > 0) await channel.bulkDelete(msgs).catch(() => {});
    } catch (e) {}

    // Prepara o arquivo local para envio
    let arquivoBanner = null;
    if (fs.existsSync(CAMINHO_BANNER)) {
        arquivoBanner = new AttachmentBuilder(CAMINHO_BANNER, { name: 'Banner.png' });
    } else {
        console.log(`⚠️ AVISO: Banner não encontrado em: ${CAMINHO_BANNER}`);
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'PMMG | SISTEMA DE IDENTIFICAÇÃO', iconURL: client.user.displayAvatarURL() })
        .setDescription(`
        
        > **INSTRUÇÃO:**
        > Clique no botão abaixo e insira seus dados exatamente como constam no jogo. Dados incorretos resultarão em falha na contabilização de horas.
        `)
        .setColor(0x000000) // All Black
        .setFooter({ text: 'Setor de Tecnologia da Informação', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    // Se a imagem existe, adiciona ela ao Embed
    if (arquivoBanner) {
        embed.setImage('attachment://Banner.png');
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('abrir_registro')
            .setLabel('INICIAR REGISTRO')
            .setStyle(ButtonStyle.Secondary)
    );

    // Monta o pacote de envio (Embed + Arquivo)
    const pacoteEnvio = { embeds: [embed], components: [row] };
    if (arquivoBanner) {
        pacoteEnvio.files = [arquivoBanner];
    }

    await channel.send(pacoteEnvio);
    console.log("✅ Painel de Registro enviado com Banner.");
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
            await interaction.member.setNickname(`${nome} | ${idJogo}`); 
        } catch (e) {
            console.log(`Não consegui alterar o nick de ${interaction.user.tag}.`);
        }
        
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