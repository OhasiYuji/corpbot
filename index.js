import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';


// 🟢 ID da categoria onde os tickets serão criados
const categoriaTickets = '1390033257252389032';
// 🟢 ID do cargo que terá acesso aos tickets
const staffRoleId = 'INSIRA_ID_DO_CARGO_DA_EQUIPE_AQUI';

// =============================
// FUNÇÃO: Enviar painel de tickets
// =============================
export async function sendTicketPanel(client) {
  const channelId = 'INSIRA_ID_DO_CANAL_ONDE_VAI_FICAR_O_PAINEL'; // canal onde o painel aparece
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return console.error('Canal do painel de ticket não encontrado!');

  const embed = new EmbedBuilder()
    .setColor('#07ff00')
    .setTitle('🎟️ Sistema de Tickets')
    .setDescription(
      '> 💬 **Precisa de ajuda?**\nClique no botão correspondente abaixo para abrir um ticket.\n\n' +
      '🛠️ **Suporte** — dúvidas e ajuda geral\n' +
      '🚨 **Denúncia** — reporte usuários ou situações\n' +
      '📋 **Recrutamento** — envie sua candidatura'
    )
    .setImage('https://i.imgur.com/rJ5vT8x.png')
    .setFooter({
      text: 'CORPBOT • Sistema de Tickets',
      iconURL: client.user.displayAvatarURL()
    });

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_suporte')
      .setLabel('🛠️ Suporte')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('ticket_denuncia')
      .setLabel('🚨 Denúncia')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_recrutamento')
      .setLabel('📋 Recrutamento')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [botoes] });
  console.log('Painel de tickets enviado.');
}

// =============================
// FUNÇÃO: Handler das interações de ticket
// =============================
export async function ticketHandler(client, interaction) {
  if (!interaction.isButton()) return;

  const { customId } = interaction;

  // ABRIR TICKET
  if (customId.startsWith('ticket_')) {
    const tipo = customId.replace('ticket_', '');
    const nomeCanal = `ticket-${tipo}-${interaction.user.username}`.toLowerCase();

    const canal = await interaction.guild.channels.create({
      name: nomeCanal,
      type: ChannelType.GuildText,
      parent: categoriaTickets,
      topic: `Ticket de ${interaction.user.tag} (${tipo})`,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: interaction.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles
          ]
        },
        {
          id: staffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ]
    });

    const embedTicket = new EmbedBuilder()
      .setColor('#07ff00')
      .setTitle(`🎫 Ticket Aberto — ${interaction.user.username}`)
      .setDescription(
        `> 🧾 **Tipo:** ${tipo.toUpperCase()}\n` +
        `> 👤 **Usuário:** ${interaction.user}\n\n` +
        'Por favor, descreva sua solicitação abaixo. Um membro da equipe responderá em breve.'
      )
      .setThumbnail(interaction.user.displayAvatarURL())
      .setFooter({
        text: 'CORPBOT • Sistema de Tickets',
        iconURL: client.user.displayAvatarURL()
      });

    const fechar = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('fechar_ticket')
        .setLabel('🔒 Fechar Ticket')
        .setStyle(ButtonStyle.Secondary)
    );

    await canal.send({
      content: `${interaction.user} <@&${staffRoleId}>`,
      embeds: [embedTicket],
      components: [fechar]
    });

    await interaction.reply({
      content: `✅ Ticket criado com sucesso: ${canal}`,
      ephemeral: true
    });
    return;
  }

  // FECHAR TICKET
  if (customId === 'fechar_ticket') {
    await interaction.reply({ content: '🔒 Este ticket será fechado em 5 segundos...', ephemeral: true });
    setTimeout(() => {
      interaction.channel.delete().catch(() => null);
    }, 5000);
  }
}