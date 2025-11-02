import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';

// ID do canal onde o painel de tickets deve aparecer
const TICKET_PANEL_CHANNEL_ID = '1390033257252389032';

// ⚠️ NOVOS IDs
const TICKET_CATEGORY_ID = '1390033257252389028'; // Categoria para criar os tickets
const SUPPORTE_ROLE_ID_1 = '1390033256703066160';
const SUPPORTE_ROLE_ID_2 = '1390033256753135653';

// ✅ Envia o painel principal
export async function sendTicketPanel(client) {
  const canal = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID).catch(() => null);
  if (!canal) return console.log('⚠️ Canal de tickets não encontrado.');

  // Banner bonito do painel
  const embed = new EmbedBuilder()
    .setTitle('📩 Suporte e Tickets')
    .setDescription('Abra um ticket para falar com nossa equipe.\n\nEscolha o tipo de atendimento abaixo:')
    .setColor('#07ff00')
    .setImage('../assets\bannerpf.png') // Corrigido para o link direto da imagem dentro do álbum
    .setFooter({ text: 'Sistema de Atendimento Automático', iconURL: client.user.displayAvatarURL() });

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
      .setCustomId('ticket_duvida')
      .setLabel('❓ Dúvida')
      .setStyle(ButtonStyle.Secondary)
  );

  // Limpa e reenviando
  await canal.bulkDelete(5).catch(() => null);
  await canal.send({ embeds: [embed], components: [botoes] });

  console.log('🎟️ Painel de tickets enviado!');
}

// ✅ Cria ticket
export async function ticketHandler(client, interaction) {
  const tipo = interaction.customId.split('_')[1];
  const nomeTipo =
    tipo === 'suporte' ? 'Suporte' :
    tipo === 'denuncia' ? 'Denúncia' :
    tipo === 'duvida' ? 'Dúvida' :
    'Atendimento';

  const canalExistente = interaction.guild.channels.cache.find(
    c => c.name === `ticket-${interaction.user.id}`
  );

  if (canalExistente) {
    await interaction.reply({ content: `❗ Você já possui um ticket aberto: ${canalExistente}`, ephemeral: true });
    return;
  }

  const canal = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: TICKET_CATEGORY_ID, // ⬅️ DEFINIÇÃO DA CATEGORIA
    topic: `Ticket de ${interaction.user.tag} (${nomeTipo})`,
    permissionOverwrites: [
      {
        id: interaction.guild.id, // Permissões para @everyone (ocultar)
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id, // Permissões para o criador (ver e falar)
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: client.user.id, // Permissões para o bot
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        id: SUPPORTE_ROLE_ID_1, // ⬅️ Permissão para Cargo 1
        allow: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: SUPPORTE_ROLE_ID_2, // ⬅️ Permissão para Cargo 2
        allow: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.guild.roles.everyone, // Permissão para Administradores
        allow: [PermissionFlagsBits.Administrator],
        deny: [PermissionFlagsBits.ViewChannel], // Garante que a regra geral do @everyone continue a ocultar
      }
    ],
  });

  const embed = new EmbedBuilder()
    .setTitle(`🎟️ Ticket de ${nomeTipo}`)
    .setDescription(
      `Olá ${interaction.user}, nossa equipe entrará em contato em breve.\n` +
      `Explique seu caso abaixo e aguarde atendimento.\n\n` +
      `> Quando finalizado, clique no botão **Fechar Ticket**.`
    )
    .setColor('#07ff00')
    .setFooter({ text: 'Sistema de Tickets', iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  const fecharBtn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('🔒 Fechar Ticket')
      .setStyle(ButtonStyle.Danger)
  );

  // Adiciona a menção dos cargos de suporte (opcional, mas útil para notificar)
  const mentionSuporte = `<@&${SUPPORTE_ROLE_ID_1}> <@&${SUPPORTE_ROLE_ID_2}>`;
  await canal.send({ content: `${mentionSuporte}\n<@${interaction.user.id}>`, embeds: [embed], components: [fecharBtn] });
  
  await interaction.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });
}

// ✅ Fecha ticket
export async function closeTicket(interaction) {
  if (!interaction.channel.name.startsWith('ticket-')) {
    await interaction.reply({ content: '❌ Esse comando só pode ser usado dentro de um ticket.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: '🕐 Fechando ticket em 5 segundos...', ephemeral: true });
  setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
}