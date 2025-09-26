import fs from 'fs';
import path from 'path';
import { atualizarHorasUsuario } from '../utils/sheets.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON_EMOJI = ':Policiafederallogo:';

const usersInPoint = new Map();
const messagesInPoint = new Map();

// Carrega as metas do JSON
const metasPath = path.join(process.cwd(), 'data', 'metas.json');
const metas = JSON.parse(fs.readFileSync(metasPath, 'utf8'));

export async function voiceStateHandler(client, oldState, newState) {
  const userId = newState.member.user.id;

  // Entrou na categoria de voice
  if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
      newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

    usersInPoint.set(userId, new Date());

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      const msg = await logChannel.send(
`${ICON_EMOJI} **MEMBRO:** <@${userId}>
${ICON_EMOJI} **INÍCIO:** <t:${Math.floor(Date.now()/1000)}:t>
${ICON_EMOJI} **TÉRMINO:** ~~*EM AÇÃO*~~
${ICON_EMOJI} **TOTAL:** 0m`
      );
      messagesInPoint.set(userId, msg);
    }
  }

  // Saiu da categoria de voice
  if (oldState.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
      (!newState.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {

    const entrada = usersInPoint.get(userId);
    if (!entrada) return;

    const agora = new Date();
    const diffMs = agora - entrada;
    const minutosTotais = Math.ceil(diffMs / 1000 / 60);

    const totalMin = await atualizarHorasUsuario(userId, minutosTotais);

    const msg = messagesInPoint.get(userId);
    if (msg) {
      await msg.edit(
`${ICON_EMOJI} **MEMBRO:** <@${userId}>
${ICON_EMOJI} **INÍCIO:** <t:${Math.floor(entrada.getTime()/1000)}:t>
${ICON_EMOJI} **TÉRMINO:** <t:${Math.floor(agora.getTime()/1000)}:t>
${ICON_EMOJI} **TOTAL:** ${minutosTotais}m
-# - O ponto foi fechado automaticamente, o membro saiu da call.`
      );
    }

    usersInPoint.delete(userId);
    messagesInPoint.delete(userId);

    // Up automático
    try {
      const usuarioMinutos = totalMin;

      const metasElegiveis = metas
        .filter(m => usuarioMinutos >= m.minutos)
        .sort((a, b) => b.minutos - a.minutos);

      if (metasElegiveis.length) {
        const newRank = metasElegiveis[0];
        const member = await newState.guild.members.fetch(userId);

        if (!member.roles.cache.has(newRank.roleId)) {
          const allRoleIds = metas.map(m => m.roleId);
          const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
          if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);

          await member.roles.add(newRank.roleId).catch(console.error);

          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
          if (logChannel) {
            await logChannel.send(
`${ICON_EMOJI} **PROMOÇÃO AUTOMÁTICA**
Parabéns <@${userId}>! Você foi promovido para **${newRank.nome}** após atingir **${usuarioMinutos} minutos**.`
            );
          }
        }
      }

    } catch (err) {
      console.error('Erro no up automático:', err);
    }
  }
}
