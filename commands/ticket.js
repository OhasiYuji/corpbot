import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';

// Módulos para resolver o caminho relativo corretamente em ESM
import { fileURLToPath } from 'url';
import { dirname, join } from 'path'; 
import path from 'path'; 

// ====================================================================
// ⚠️ CONFIGURAÇÕES DE ID E CAMINHO
// ====================================================================

// Calcula o __dirname para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// O caminho correto é: do 'commands', volta um nível (..) e entra em 'assets'
const BANNER_IMAGE_PATH = join(__dirname, '..', 'assets', 'bannerpf.png'); 
const IMAGE_FILE_NAME = 'bannerpf.png'; // Nome que será usado no attachment

// ID do canal onde o painel de tickets deve aparecer
const TICKET_PANEL_CHANNEL_ID = '1390033257252389032';

// IDs dos cargos e categoria
const TICKET_CATEGORY_ID = '1390033257252389028'; 
const SUPPORTE_ROLE_ID_1 = '1390033256703066160';
const SUPPORTE_ROLE_ID_2 = '1390033256753135653';

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
        // Anexa o arquivo local usando o caminho relativo/calculado
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
    parent: TICKET_CATEGORY_ID, 
    topic: `Ticket de ${interaction.user.tag} (${nomeTipo})`,
    permissionOverwrites: [
      {
        // 1. Nega @everyone de ver
        id: interaction.guild.id, 
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        // 2. Permite o criador do ticket
        id: interaction.user.id, 
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        // 3. Permite o Bot
        id: client.user.id, 
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        // 4. Permite Cargo 1 (Ver e Falar)
        id: SUPPORTE_ROLE_ID_1, 
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      },
      {
        // 5. Permite Cargo 2 (Ver e Falar)
        id: SUPPORTE_ROLE_ID_2, 
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
      }
      // Administradores já veem o canal automaticamente, não precisam de regra.
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

  const mentionSuporte = `<@&${SUPPORTE_ROLE_ID_1}> <@&${SUPPORTE_ROLE_ID_2}>`;
  await canal.send({ content: `${mentionSuporte}\n<@${interaction.user.id}>`, embeds: [embed], components: [fecharBtn] });
  
  await interaction.reply({ content: `✅ Ticket criado com sucesso: ${canal}`, ephemeral: true });
}

// ====================================================================
// ✅ Fecha ticket
// ====================================================================
export async function closeTicket(interaction) {
// Por padrão, qualquer um pode clicar no botão de fechar, mas queremos restringir isso.

// Tenta extrair a tag do usuário do tópico do canal
  const topicParts = interaction.channel.topic ? interaction.channel.topic.split(' ') : [];
  const creatorTag = topicParts.length > 2 ? topicParts[2].replace('(', '').replace(')', '') : null;

  const isCreator = creatorTag && interaction.user.tag === creatorTag;
  
  const hasPermission = 
    isCreator || // O criador do ticket
    interaction.member.roles.cache.has(SUPPORTE_ROLE_ID_1) || // Cargo 1
    interaction.member.roles.cache.has(SUPPORTE_ROLE_ID_2) || // Cargo 2
    interaction.member.permissions.has(PermissionFlagsBits.Administrator); // Admin

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