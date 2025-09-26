// commands/painelHoras.js
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
import { getUsuariosTodos, atualizarHorasUsuario, getCargosFromSource } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = '1390160577095012433';
const ADMIN_ROLE_ID = '1390033256640024591';
const ICON = '<:Policiafederallogo:1399436333071728730>';

// metas: read from env METAS_JSON or ./data/metas.json
function loadMetas() {
  if (process.env.METAS_JSON) return JSON.parse(process.env.METAS_JSON);
  const p = path.join(process.cwd(), 'data', 'metas.json');
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return [];
}
const metas = loadMetas();

export async function sendPainelHoras(client) {
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!panelChannel) return console.error('Canal do painel de horas não encontrado');

  const embed = new EmbedBuilder()
    .setTitle(`${ICON} Painel de Horas`)
    .setDescription('Botões: consultar / adicionar / remover / limpar / up automático')
    .setColor(0xFFD700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('consultar_horas').setLabel('Consultar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('adicionar_horas').setLabel('Adicionar Horas').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('remover_horas').setLabel('Remover Horas').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('limpar_horas').setLabel('Limpar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('up_automatico').setLabel('Up Automático').setStyle(ButtonStyle.Primary)
  );

  await panelChannel.send({ embeds: [embed], components: [row] });
}

export async function painelHorasHandler(client, interaction) {
  if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
    return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true });
  }

  if (interaction.isButton()) {
    // Consultar
    if (interaction.customId === 'consultar_horas') {
      const usuarios = await getUsuariosTodos();
      if (!usuarios.length) return interaction.reply({ content: 'Nenhum usuário registrado.', ephemeral: true });

      // build embed with fields (max 25 fields, so we group as description if many)
      const embed = new EmbedBuilder()
        .setTitle(`${ICON} Horas dos Usuários`)
        .setColor(0x00FF00);

      // If few users, add as fields, else as description
      if (usuarios.length <= 20) {
        for (const u of usuarios) embed.addFields({ name: u.nome || u.userId, value: `<@${u.userId}> — **${u.minutos} minutos**`, inline: false });
      } else {
        embed.setDescription(usuarios.map(u => `<@${u.userId}> — **${u.minutos} minutos**`).join('\n'));
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Adicionar / Remover -> show modal
    if (interaction.customId === 'adicionar_horas' || interaction.customId === 'remover_horas') {
      const modal = new ModalBuilder()
        .setCustomId(`${interaction.customId}_modal`)
        .setTitle(interaction.customId === 'adicionar_horas' ? 'Adicionar Horas' : 'Remover Horas');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('user_id').setLabel('ID do usuário').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('minutos').setLabel('Minutos (número inteiro)').setStyle(TextInputStyle.Short).setRequired(true)
        )
      );

      await interaction.showModal(modal);
      return;
    }

    // Limpar horas
    if (interaction.customId === 'limpar_horas') {
      const usuarios = await getUsuariosTodos();
      for (const u of usuarios) {
        await atualizarHorasUsuario(u.userId, -u.minutos);
      }
      return interaction.reply({ content: 'Horas zeradas para todos os usuários.', ephemeral: true });
    }

    // Up automático (aplica roles)
    if (interaction.customId === 'up_automatico') {
      const usuarios = await getUsuariosTodos();
      const metasLocal = metas.length ? metas : getCargosFromSource();

      let promoted = [];
      for (const u of usuarios) {
        const elegiveis = metasLocal.filter(m => u.minutos >= m.minutos).sort((a,b)=>b.minutos-a.minutos);
        if (elegiveis.length) {
          const top = elegiveis[0];
          try {
            const member = await interaction.guild.members.fetch(u.userId).catch(() => null);
            if (!member) continue;
            if (!member.roles.cache.has(top.roleId)) {
              const allRoleIds = metasLocal.map(m=>m.roleId).filter(Boolean);
              const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
              if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);
              await member.roles.add(top.roleId).catch(console.error);
              promoted.push({ userId: u.userId, nome: top.nome, minutos: u.minutos });
            }
          } catch (err) {
            console.error('Erro promovendo via painel:', err);
          }
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`${ICON} Up Automático`)
        .setColor(0x32CD32)
        .setDescription(promoted.length ? promoted.map(p => `<@${p.userId}> → **${p.nome}** (${p.minutos} min)`).join('\n') : 'Ninguém foi promovido.');

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }

  // Modal submit (Adicionar/Remover)
  if (interaction.type === InteractionType.ModalSubmit) {
    const userId = interaction.fields.getTextInputValue('user_id');
    const minutos = parseInt(interaction.fields.getTextInputValue('minutos'), 10);
    if (isNaN(minutos)) return interaction.reply({ content: 'Minutos inválidos', ephemeral: true });

    const delta = interaction.customId.startsWith('adicionar') ? minutos : -minutos;
    const total = await atualizarHorasUsuario(userId, delta);
    return interaction.reply({ content: `${ICON} Horas atualizadas. Total: ${total} minutos.`, ephemeral: true });
  }
}
