const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionsBitField, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// --- EDITAR AQUI ---
const ID_CANAL_PAINEL = '1390033257252389032';
const ID_CATEGORIA_TICKET = '1390033257252389028';
const ID_CARGO_STAFF = '1390033256753135653'; // Só esse cargo vê

const CAMINHO_IMAGEM = path.join(__dirname, '../assets/2.jpg');

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_PAINEL).catch(() => null);
    if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 5 });
    if (msgs.size > 0) await channel.bulkDelete(msgs).catch(() => {});
    const banner = fs.existsSync(CAMINHO_IMAGEM) ? new AttachmentBuilder(CAMINHO_IMAGEM, { name: 'banner.jpg' }) : null;
    const embed = new EmbedBuilder().setTitle('🎟️ | TICKET').setDescription('Selecione uma categoria abaixo.').setColor(0x2B2D31).setFooter({ text: 'Atendimento', iconURL: client.user.displayAvatarURL() });
    if (banner) embed.setImage('attachment://banner.jpg');
    const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('ticket_menu_abrir').setPlaceholder('Selecione a categoria').addOptions([{ label: 'Dúvidas', value: 'duvida', emoji: '❔' }, { label: 'Denúncias', value: 'denuncia', emoji: '📤' }, { label: 'Revisão', value: 'revisao', emoji: '⚖️' }]));
    const payload = { embeds: [embed], components: [row] };
    if (banner) payload.files = [banner];
    await channel.send(payload);
}

async function gerenciarTicket(interaction, client) {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu_abrir') {
        await interaction.deferReply({ ephemeral: true });
        const user = interaction.user;
        const exists = interaction.guild.channels.cache.find(c => c.name === `ticket-${user.username.replace(/[^a-z0-9]/g, '')}`);
        if (exists) return interaction.editReply(`❌ Você já tem um ticket: ${exists}`);
        
        let titulo = 'Atendimento';
        if (interaction.values[0] === 'duvida') titulo = 'Dúvidas';
        if (interaction.values[0] === 'denuncia') titulo = 'Denúncia';
        if (interaction.values[0] === 'revisao') titulo = 'Revisão';

        const canal = await interaction.guild.channels.create({
            name: `ticket-${user.username}`, type: ChannelType.GuildText, parent: ID_CATEGORIA_TICKET, topic: `${titulo} - ${user.tag}`,
            permissionOverwrites: [{id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel]}, {id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}, {id: ID_CARGO_STAFF, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}, {id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}]
        });
        const embed = new EmbedBuilder().setTitle(`🎟️ ${titulo}`).setDescription(`Olá <@${user.id}>! A equipe <@&${ID_CARGO_STAFF}> irá te atender.`).setColor(0x57F287);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_btn_fechar').setLabel('Fechar Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'));
        await canal.send({ content: `<@${user.id}> | <@&${ID_CARGO_STAFF}>`, embeds: [embed], components: [row] });
        await interaction.editReply(`✅ Ticket criado: ${canal}`);
    }
    if (interaction.isButton() && interaction.customId === 'ticket_btn_fechar') {
        await interaction.reply('🔒 Fechando em 5s...');
        setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
}
module.exports = { enviarPainel, gerenciarTicket };