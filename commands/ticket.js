import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import path from 'path'; 

// ====================================================================
// ⚠️ CONFIGURAÇÕES DE ID E CAMINHO (Ajuste conforme necessário)
// ====================================================================

// ID do canal onde o painel de tickets deve aparecer
const TICKET_PANEL_CHANNEL_ID = '1390033257252389032';

// Categoria para criar os tickets
const TICKET_CATEGORY_ID = '1390033257252389028'; 

// IDs dos cargos que devem ver os tickets
const SUPPORTE_ROLE_ID_1 = '1390033256703066160';
const SUPPORTE_ROLE_ID_2 = '1390033256753135653';

// Caminho absoluto da imagem do banner (usando barras normais para compatibilidade)
const RAW_PATH = 'C:/Users/T-GAMER/Desktop/DEV/corpbot/assets/bannerpf.png';
const IMAGE_FILE_NAME = 'bannerpf.png';

// Usa path.normalize para garantir que o caminho esteja formatado corretamente
const BANNER_IMAGE_PATH = path.normalize(RAW_PATH); 

// ====================================================================
// ✅ Envia o painel principal
// ====================================================================
export async function sendTicketPanel(client) {
  const canal = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID).catch(() => null);
  if (!canal) return console.log('⚠️ Canal de tickets não encontrado.');

  // Banner bonito do painel
  const embed = new EmbedBuilder()
    .setTitle('📩 Suporte e Tickets')
    .setDescription('Abra um ticket para falar com nossa equipe.\n\nEscolha o tipo de atendimento abaixo:')
    .setColor('#07ff00')
    // Aponta para o nome do arquivo que será anexado na mensagem
    .setImage(`attachment://${IMAGE_FILE_NAME}`) 
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
  
  await canal.send({ 
        embeds: [embed], 
        components: [botoes],
        // Anexa o arquivo local
        files: [{ attachment: BANNER_IMAGE_PATH, name: IMAGE_FILE_NAME }] 
    });

  console.log('🎟️ Painel de tickets enviado!');
}

// ====================================================================
// ✅ Cria ticket
// ====================================================================
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
    parent: TICKET_CATEGORY_ID, // Define a categoria
    topic: `Ticket de ${interaction.user.tag} (${nomeTipo})`,
    permissionOverwrites: [
      {
        id: interaction.guild.id, // @everyone (ocultar)
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: interaction.user.id, // Criador do ticket (ver e falar)
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: client.user.id, // Bot
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        id: SUPPORTE_ROLE_ID_1, // Cargo 1 (Ver)
        allow: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: SUPPORTE_ROLE_ID_2, // Cargo 2 (Ver)
        allow: [PermissionFlagsBits.ViewChannel],
      },
      {
        // Permissão de Administrador: quem tiver a permissão ADMINISTRATOR pode ver.
        // O ID do cargo @everyone é usado como alvo para aplicar a permissão de administrador.
        id: interaction.guild.roles.everyone, 
        allow: [PermissionFlagsBits.Administrator],
        deny: [PermissionFlagsBits.ViewChannel], // Mantém o @everyone sem permissão de ver
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

  // Menção os cargos de suporte e o criador
  const mentionSuporte = `<@&${SUPPORTE_ROLE_ID_1}> <@&${SUPPORTE_ROLE_ID_2}>`;
  await canal.send({ content: `${mentionSuporte}\n<@${interaction.user.id}>`, embeds: [embed], components: [fecharBtn] });
  
  await interaction.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });
}

// ====================================================================
// ✅ Fecha ticket
// ====================================================================
export async function closeTicket(interaction) {
  // Verifica se o usuário tem permissão para fechar (criador, ou um dos cargos de suporte/admin)
  const hasPermission = 
    interaction.user.id === interaction.channel.topic.split(' ')[2] || // Verifica se é o criador
    interaction.member.roles.cache.has(SUPPORTE_ROLE_ID_1) ||
    interaction.member.roles.cache.has(SUPPORTE_ROLE_ID_2) ||
    interaction.member.permissions.has(PermissionFlagsBits.Administrator);

  if (!interaction.channel.name.startsWith('ticket-')) {
    await interaction.reply({ content: '❌ Esse comando só pode ser usado dentro de um ticket.', ephemeral: true });
    return;
  }

  if (!hasPermission) {
    await interaction.reply({ content: '❌ Você não tem permissão para fechar este ticket.', ephemeral: true });
    return;
  }
  
  await interaction.reply({ content: '🕐 Fechando ticket em 5 segundos...', ephemeral: true });
  setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
}