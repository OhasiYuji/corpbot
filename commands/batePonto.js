// commands/batePonto.js
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
// emoji custom (use the real one do seu servidor)
const ICON = '<:Policiafederallogo:1399436333071728730>';

const usersInPoint = new Map();
const messagesInPoint = new Map();

export async function voiceStateHandler(client, oldState, newState) {
  // determine member consistently (oldState or newState may be undefined)
  const member = (newState && newState.member) || (oldState && oldState.member);
  if (!member) return;

  const userId = member.user.id;

  // Entrou
  if ((!oldState?.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
      newState?.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

    const now = new Date();
    usersInPoint.set(userId, now);

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const msg = await logChannel.send(
`${ICON} **MEMBRO:** <@${userId}>
${ICON} **INÍCIO:** <t:${Math.floor(now.getTime()/1000)}:t>
${ICON} **TÉRMINO:** ~~*EM AÇÃO*~~
${ICON} **TOTAL:** 0m`
      ).catch(() => null);
      if (msg) messagesInPoint.set(userId, msg);
    }
    return;
  }

  // Saiu
  if (oldState?.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
      (!newState?.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {

    const entrada = usersInPoint.get(userId);
    if (!entrada) return;

    const agora = new Date();
    const minutosTotais = Math.ceil((agora - entrada) / 1000 / 60);

    const novoTotal = await atualizarHorasUsuario(userId, minutosTotais);

    const msg = messagesInPoint.get(userId);
    if (msg) {
      await msg.edit(
`${ICON} **MEMBRO:** <@${userId}>
${ICON} **INÍCIO:** <t:${Math.floor(entrada.getTime()/1000)}:t>
${ICON} **TÉRMINO:** <t:${Math.floor(agora.getTime()/1000)}:t>
${ICON} **TOTAL:** ${minutosTotais}m
-# - O ponto foi fechado automaticamente, o membro saiu da call.`
      ).catch(console.error);
    }

    usersInPoint.delete(userId);
    messagesInPoint.delete(userId);
  }
}
