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
import { getUsuariosTodos, getCargos, atualizarHorasUsuario } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = '1390160577095012433';
const ADMIN_ROLE_ID = '1390033256640024591';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

export async function sendPainelHoras(client) {
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!panelChannel) return console.error('Canal do painel de horas não encontrado');

  const embed = new EmbedBuilder()
    .setTitle(`${ICON_EMOJI} Painel de Horas`)
    .setDescription('Escolha a ação abaixo:')
    .setColor(0xFFD700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('consultar_horas')
      .setLabel('Consultar Horas')
      .setStyle(ButtonStyle.Secondary),
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
      .setStyle(ButtonStyle.Primary)
  );

  await panelChannel.send({ embeds: [embed], components: [row] });
}

export async function painelHorasHandler(client, interaction) {
  if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
    return interaction.reply({ content: 'Você não tem permissão para usar este painel.', ephemeral: true });
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'consultar_horas') {
      const usuarios = await getUsuariosTodos();
      if (!usuarios.length) return interaction.reply({ content: 'Nenhum usuário registrado.', ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Horas dos Usuários`)
        .setColor(0x00FF00)
        .setDescription(
          usuarios.map(u => `${ICON_EMOJI} <@${u.userId}>: **${u.minutos} minutos**`).join('\n')
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (interaction.customId === 'adicionar_horas' || interaction.customId === 'remover_horas') {
      const modal = new ModalBuilder()
        .setCustomId(`${interaction.customId}_modal`)
        .setTitle(interaction.customId === 'adicionar_horas' ? 'Adicionar Horas' : 'Remover Horas');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('user_id')
            .setLabel('ID do Usuário')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('minutos')
            .setLabel('Minutos')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
    }

    if (interaction.customId === 'limpar_horas') {
      const usuarios = await getUsuariosTodos();
      for (const u of usuarios) {
        await atualizarHorasUsuario(u.userId, -u.minutos);
      }
      await interaction.reply({ content: 'Todas as horas foram zeradas.', ephemeral: true });
    }

    if (interaction.customId === 'up_automatico') {
      const usuarios = await getUsuariosTodos();
      const cargos = await getCargos();
      const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Up Automático`)
        .setColor(0xFFD700);

      let description = '';

      for (const u of usuarios) {
        const elegiveis = cargos.filter(c => u.minutos >= c.minutos);
        if (elegiveis.length) {
          const top = elegiveis.sort((a,b)=>b.minutos - a.minutos)[0];
          description += `${ICON_EMOJI} <@${u.userId}> atingiu a meta de ${top.minutos} minutos: up para **${top.nome}**\n`;
        }
      }

      if (!description) description = 'Ninguém atingiu a meta.';
      embed.setDescription(description);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  if (interaction.type === InteractionType.ModalSubmit) {
    const userId = interaction.fields.getTextInputValue('user_id');
    const minutos = parseInt(interaction.fields.getTextInputValue('minutos'), 10);
    if (isNaN(minutos)) return interaction.reply({ content: 'Minutos inválidos.', ephemeral: true });

    const total = await atualizarHorasUsuario(userId, interaction.customId.startsWith('adicionar') ? minutos : -minutos);
    await interaction.reply({ content: `Horas atualizadas. Total: ${total} minutos.`, ephemeral: true });
  }
}
