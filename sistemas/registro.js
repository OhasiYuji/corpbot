const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const supabase = require('../utils/supabase');

// --- EDITAR AQUI ---
const ID_CANAL_REGISTRO = '1396852912709308426';
const ID_CANAL_LOG = '1463503382449754122';
const EMOJI_COP = '👮'; 
const ID_CARGO_MARCACAO = '1399883634210508862';

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_REGISTRO).catch(() => null);
    if (!channel) return;

    // Limpa mensagens antigas
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
        .setImage('[https://i.imgur.com/r6TbfH0.png](https://i.imgur.com/r6TbfH0.png)') // Opcional: Uma linha separadora preta/cinza fina fica muito bom aqui.
        .setFooter({ text: 'Setor de Tecnologia da Informação', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('abrir_registro')
            .setLabel('INICIAR REGISTRO')
            .setStyle(ButtonStyle.Secondary) // Botão Cinza (Dark)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

async function gerenciarRegistro(interaction, client) {
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
        const modal = new ModalBuilder().setCustomId('modal_reg').setTitle('Registro Policial');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nickname').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_jogo').setLabel('ID no Jogo').setStyle(TextInputStyle.Short).setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('login').setLabel('Login').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_reg') {
        await interaction.deferReply({ ephemeral: true });
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        const { data: existe } = await supabase.from('usuarios_registrados').select('*').eq('discord_id', interaction.user.id).single();
        if (existe) return interaction.editReply(`⚠️ Já registrado como **${existe.nome_jogo}**.`);

        await supabase.from('usuarios_registrados').insert({ discord_id: interaction.user.id, nome_jogo: nome, id_jogo: idJogo, login_jogo: login });
        try { await interaction.member.setNickname(`ᴘᴍᴍɢ • ${nome} | ${idJogo}`); } catch (e) {}

        const logChannel = await client.channels.fetch(ID_CANAL_LOG);
        if (logChannel) logChannel.send(`${EMOJI_COP} **NOME:** <@${interaction.user.id}>\n${EMOJI_COP} **NICK:** ${nome}\n${EMOJI_COP} **LOGIN:** ${login}\n${EMOJI_COP} **ID:** ${idJogo}\n${EMOJI_COP} **MARCAÇÃO:** <@&${ID_CARGO_MARCACAO}>`);
        await interaction.editReply('✅ Registro realizado!');
    }
}
module.exports = { enviarPainel, gerenciarRegistro };