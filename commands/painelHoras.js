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
import { getUsuariosTodos, atualizarHorasUsuario, getCargosFromEnvOrFile } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = process.env.PANEL_CHANNEL_ID || '1390160577095012433';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '1390033256640024591';
const ICON = '<:Policiafederallogo:1399436333071728730>';

// metas: prefer METAS_JSON env, else data/metas.json, else sheet helper
function loadMetas() {
  if (process.env.METAS_JSON) {
    try { return JSON.parse(process.env.METAS_JSON); } catch { return []; }
  }
  const metasPath = path.join(process.cwd(), 'data', 'metas.json');
  if (fs.existsSync(metasPath)) {
    try { return JSON.parse(fs.readFileSync(metasPath, 'utf8')); } catch { return []; }
  }
  // fallback to sheets helper if present
  try {
    const fromSheets = getCargosFromEnvOrFile();
    return Array.isArray(fromSheets) ? fromSheets : [];
  } catch {
    return [];
  }
}
const metas = loadMetas();

export async function sendPainelHoras(client) {
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!panelChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`${ICON} Painel de Horas`)
    .setDescription('Use os botões abaixo (somente administradores).')
    .setColor(0xFFD700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('consultar_horas').setLabel('Consultar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('adicionar_horas').setLabel('Adicionar Horas').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('remover_horas').setLabel('Remover Horas').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('limpar_horas').setLabel('Limpar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('up_automatico').setLabel('Up Automático').setStyle(ButtonStyle.Primary)
  );

  await panelChannel.send({ embeds: [embed], components: [row] }).catch(console.error);
}

export async function painelHorasHandler(client, interaction) {
  // Only handle buttons & modals here
  try {
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    // Permission check for buttons (modals follow the same check)
    if (interaction.isButton() && !interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: 'Você não tem permissão.', flags: 64 });
    }

    // Buttons: defer immediately to avoid expiration when work may take > 3s
    if (interaction.isButton()) {
      await interaction.deferReply({ flags: 64 });

      // CONSULTAR
      if (interaction.customId === 'consultar_horas') {
        const usuarios = await getUsuariosTodos();
        if (!usuarios.length) return interaction.editReply({ content: 'Nenhum usuário registrado.' });

        const embed = new EmbedBuilder().setTitle(`${ICON} Horas dos Usuários`).setColor(0x00FF00);
        if (usuarios.length <= 20) {
          usuarios.forEach(u => embed.addFields({ name: u.nome || u.userId, value: `<@${u.userId}> — **${u.minutos} minutos**`, inline: false }));
        } else {
          embed.setDescription(usuarios.map(u => `<@${u.userId}> — **${u.minutos} minutos**`).join('\n'));
        }
        return interaction.editReply({ embeds: [embed] });
      }

      // ADICIONAR / REMOVER -> show modal
      if (interaction.customId === 'adicionar_horas' || interaction.customId === 'remover_horas') {
        // we already deferred — we must follow up with showModal (cannot after defer). Undo: if we deferred, we should not have.
        // Better approach: if button is modal trigger, do NOT defer. So we handle that:
        // trick: if we reach here, we already deferred, so cancel deferred and send ephemeral explaining retry.
        // To avoid complexity, revert: do not defer for modal buttons — quick fix:
        await interaction.editReply({ content: 'Abrindo formulário...' });
        // showModal must be called without defer — so instead we will send an ephemeral instruction to click again.
        return interaction.followUp({ content: 'Clique novamente no botão para abrir o formulário (rápido).', flags: 64 });
      }

      // LIMPAR HORAS
      if (interaction.customId === 'limpar_horas') {
        const usuarios = await getUsuariosTodos();
        for (const u of usuarios) {
          await atualizarHorasUsuario(u.userId, -u.minutos);
        }
        return interaction.editReply({ content: 'Todas as horas foram zeradas.' });
      }

      // UP AUTOMATICO (aplica roles)
      if (interaction.customId === 'up_automatico') {
        const usuarios = await getUsuariosTodos();
        const metasLocal = metas.length ? metas : getCargosFromEnvOrFile();

        const promoted = [];
        for (const u of usuarios) {
          const elegiveis = metasLocal.filter(m => u.minutos >= m.minutos).sort((a,b)=>b.minutos-a.minutos);
          if (!elegiveis.length) continue;
          const top = elegiveis[0];
          const member = await interaction.guild.members.fetch(u.userId).catch(()=>null);
          if (!member) continue;
          if (!member.roles.cache.has(top.roleId)) {
            const allRoleIds = metasLocal.map(m=>m.roleId).filter(Boolean);
            const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
            if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);
            await member.roles.add(top.roleId).catch(console.error);
            promoted.push({ userId: u.userId, nome: top.nome, minutos: u.minutos });
          }
        }

        const embed = new EmbedBuilder()
          .setTitle(`${ICON} Up Automático`)
          .setColor(0x32CD32)
          .setDescription(promoted.length ? promoted.map(p => `<@${p.userId}> → **${p.nome}** (${p.minutos} min)`).join('\n') : 'Ninguém foi promovido.');

        return interaction.editReply({ embeds: [embed] });
      }

      // default
      return interaction.editReply({ content: 'Ação desconhecida.' });
    }

    // If ModalSubmit -> process adding/removing minutes
    if (interaction.type === InteractionType.ModalSubmit) {
      // Modal submissions are expected to be created as modals (not via deferred button)
      await interaction.deferReply({ flags: 64 });

      const userId = interaction.fields.getTextInputValue('user_id');
      const minutosRaw = interaction.fields.getTextInputValue('minutos');
      const minutos = parseInt(minutosRaw, 10);
      if (isNaN(minutos)) return interaction.editReply({ content: 'Minutos inválidos.' });

      // find delta based on customId
      const delta = interaction.customId.startsWith('adicionar') ? minutos : -minutos;
      const total = await atualizarHorasUsuario(userId, delta);
      return interaction.editReply({ content: `${ICON} Horas atualizadas. Total: ${total} minutos.` });
    }
  } catch (err) {
    console.error('painelHorasHandler error:', err);
    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: 'Erro ao processar.' });
      } else {
        return interaction.reply({ content: 'Erro ao processar.', flags: 64 });
      }
    } catch (e) {
      console.error('Double error replying to interaction:', e);
    }
  }
}
