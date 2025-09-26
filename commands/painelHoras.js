import fs from 'fs';
import path from 'path';
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
import { atualizarHorasUsuario, getUsuariosTodos } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = '1390160577095012433';
const ADMIN_ROLE_ID = '1390033256640024591';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

// Carrega metas do JSON
const metasPath = path.join(process.cwd(), 'data', 'metas.json');
const metas = JSON.parse(fs.readFileSync(metasPath, 'utf8'));

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

      const texto = usuarios.map(u => `${ICON_EMOJI} **${u.nome}** (<@${u.userId}>): ${u.minutos} minutos`).join('\n');
      await interaction.reply({ content: `**Horas dos Usuários:**\n${texto}`, ephemeral: true });
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
      const logChannel = await client.channels.fetch(PANEL_CHANNEL_ID); // Pode mudar para LOG_CHANNEL_ID se quiser log

      for (const u of usuarios) {
        const metasElegiveis = metas
          .filter(m => u.minutos >= m.minutos)
          .sort((a,b) => b.minutos - a.minutos);

        if (metasElegiveis.length) {
          const newRank = metasElegiveis[0];
          try {
            const member = await interaction.guild.members.fetch(u.userId);

            if (!member.roles.cache.has(newRank.roleId)) {
              const allRoleIds = metas.map(m => m.roleId);
              const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
              if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);

              await member.roles.add(newRank.roleId).catch(console.error);

              const embed = new EmbedBuilder()
                .setTitle(`${ICON_EMOJI} Promoção Automática`)
                .setColor(0x32CD32)
                .setDescription(`Parabéns <@${u.userId}>! Você foi promovido para **${newRank.nome}** após atingir **${u.minutos} minutos**.`);

              if (logChannel) await logChannel.send({ embeds: [embed] });
            }
          } catch (err) {
            console.error('Erro ao promover usuário:', err);
          }
        }
      }

      await interaction.reply({ content: 'Up automático finalizado.', ephemeral: true });
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
