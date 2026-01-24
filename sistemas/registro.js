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
    const msgs = await channel.messages.fetch({ limit: 5 });
    if (msgs.size > 0) await channel.bulkDelete(msgs).catch(()=>{});

    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('abrir_registro').setLabel('Realizar Registro').setStyle(ButtonStyle.Primary).setEmoji('📋'));
    await channel.send({ embeds: [new EmbedBuilder().setTitle('📋 Registro Oficial').setDescription('Clique abaixo para registrar.').setColor(0x0099FF)], components: [row] });
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
        try { await interaction.member.setNickname(`${nome} | ${idJogo}`); } catch (e) {}

        const logChannel = await client.channels.fetch(ID_CANAL_LOG);
        if (logChannel) logChannel.send(`${EMOJI_COP} **NOME:** <@${interaction.user.id}>\n${EMOJI_COP} **NICK:** ${nome}\n${EMOJI_COP} **LOGIN:** ${login}\n${EMOJI_COP} **ID:** ${idJogo}\n${EMOJI_COP} **MARCAÇÃO:** <@&${ID_CARGO_MARCACAO}>`);
        await interaction.editReply('✅ Registro realizado!');
    }
}
module.exports = { enviarPainel, gerenciarRegistro };