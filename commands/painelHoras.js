// commands/painelHoras.js
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  EmbedBuilder
} from 'discord.js';
import { getUsuario, getCargos, atualizarHorasUsuario } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = '1390160577095012433';
const PERMITTED_ROLE_ID = '1390033256640024591';
const ICON_EMOJI = '<:iconepf:1399436333071728730>'; // ícone da PF

// Map para armazenar interações/modals se necessário
const modalsMap = new Map();

// Envia painel de controle de horas
export async function enviarPainelHoras(client) {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!channel) return console.error('Canal do painel de horas não encontrado');

  const embed = new EmbedBuilder()
    .setTitle(`${ICON_EMOJI} Painel de Horas`)
    .setDescription('Aqui você pode consultar, adicionar, remover ou limpar horas, além de fazer up automático baseado em metas.')
    .setColor(0xFFD700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('consultar_horas')
      .setLabel('Consultar Horas')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('adicionar_horas')
      .setLabel('Adicionar Horas')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('remover_horas')
      .setLabel('Remover Horas')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('limpar_horas')
      .setLabel('Limpar Horas')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('up_automatico')
      .setLabel('Up Automático')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

// Handler das interações do painel
export async function painelHorasHandler(client, interaction) {
  if (!interaction.member.roles.cache.has(PERMITTED_ROLE_ID)) {
    return interaction.reply({ content: 'Você não tem permissão para interagir com este painel.', ephemeral: true });
  }

  // Consultar horas
  if (interaction.isButton() && interaction.customId === 'consultar_horas') {
    const usuarios = await getUsuariosTodos(); // função criada abaixo
    if (!usuarios.length) return interaction.reply({ content: 'Nenhum usuário registrado.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle(`${ICON_EMOJI} Horas Registradas`)
      .setColor(0x32CD32)
      .setDescription(
        usuarios.map(u => `<@${u.userId}> → ${u.totalMinutes} minutos`).join('\n')
      );

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // Adicionar ou remover horas → abre modal
  if (interaction.isButton() && ['adicionar_horas', 'remover_horas'].includes(interaction.customId)) {
    const modal = new ModalBuilder()
      .setCustomId(interaction.customId)
      .setTitle(interaction.customId === 'adicionar_horas' ? 'Adicionar Horas' : 'Remover Horas');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('userId')
          .setLabel('ID do Usuário')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('minutos')
          .setLabel('Quantidade de minutos')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    return interaction.showModal(modal);
  }

  // Limpar horas
  if (interaction.isButton() && interaction.customId === 'limpar_horas') {
    const usuarios = await getUsuariosTodos();
    for (const u of usuarios) {
      await atualizarHorasUsuario(u.userId, 0, 0);
    }
    return interaction.reply({ content: 'Horas de todos os usuários foram zeradas.', ephemeral: true });
  }

  // Up automático
  if (interaction.isButton() && interaction.customId === 'up_automatico') {
    const usuarios = await getUsuariosTodos();
    const cargos = await getCargos();

    const logChannel = await client.channels.fetch(PANEL_CHANNEL_ID);

    for (const usuario of usuarios) {
      const eligibles = cargos.filter(c => usuario.totalMinutes >= c.minutes);
      if (eligibles.length) {
        const newRank = eligibles.sort((a, b) => b.minutes - a.minutes)[0];
        const member = await interaction.guild.members.fetch(usuario.userId);

        if (!member.roles.cache.has(newRank.roleId)) {
          const allRoleIds = cargos.map(c => c.roleId).filter(Boolean);
          const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
          if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);
          await member.roles.add(newRank.roleId).catch(console.error);

          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle(`${ICON_EMOJI} Promoção Automática`)
              .setColor(0x32CD32)
              .setDescription(
                `Parabéns <@${usuario.userId}>! Você foi promovido para **${newRank.nome}** ` +
                `após atingir **${usuario.totalMinutes} minutos**.`
              );
            await logChannel.send({ embeds: [embed] });
          }
        }
      }
    }

    return interaction.reply({ content: 'Up automático realizado.', ephemeral: true });
  }

  // Recebendo modal submit de adicionar/remover
  if (interaction.type === InteractionType.ModalSubmit && ['adicionar_horas', 'remover_horas'].includes(interaction.customId)) {
    const userId = interaction.fields.getTextInputValue('userId');
    const minutos = parseInt(interaction.fields.getTextInputValue('minutos'), 10) || 0;

    const usuario = await getUsuario(userId);
    if (!usuario) return interaction.reply({ content: 'Usuário não encontrado.', ephemeral: true });

    const totalAtual = interaction.customId === 'adicionar_horas'
      ? usuario.totalMinutes + minutos
      : usuario.totalMinutes - minutos;

    await atualizarHorasUsuario(userId, 0, totalAtual);

    return interaction.reply({ content: `Horas do usuário <@${userId}> atualizadas para ${totalAtual} minutos.`, ephemeral: true });
  }
}

// Função auxiliar para buscar todos os usuários
async function getUsuariosTodos() {
  try {
    const res = await import('../utils/sheets.js');
    const values = await res.getUsuariosTodos(); // você precisa criar essa função em sheets.js
    return values;
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    return [];
  }
}
