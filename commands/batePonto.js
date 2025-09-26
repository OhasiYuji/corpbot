// commands/batePonto.js
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON = '<:Policiafederallogo:1399436333071728730>'; // use o emoji custom do servidor

const usersInPoint = new Map();
const messagesInPoint = new Map();

export async function voiceStateHandler(client, oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member) return;
  const userId = member.user.id;

  // Entrou
  if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
      newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

    const now = new Date();
    usersInPoint.set(userId, now);

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (logChannel) {
      const msg = await logChannel.send(
`${ICON} **MEMBRO:** <@${userId}>
${ICON} **INÍCIO:** <t:${Math.floor(now.getTime()/1000)}:t>
${ICON} **TÉRMINO:** ~~*EM AÇÃO*~~
${ICON} **TOTAL:** 0m`
      ).catch(console.error);
      if (msg) messagesInPoint.set(userId, msg);
    }
  }

  // Saiu
  if (oldState.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
      (!newState.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {

    const entrada = usersInPoint.get(userId);
    if (!entrada) return;

    const agora = new Date();
    const minutosTotais = Math.ceil((agora - entrada) / 1000 / 60);

    const newTotal = await atualizarHorasUsuario(userId, minutosTotais);

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

    // Up automático (usa metas do JSON via getCargos())
    try {
      const usuario = await getUsuario(userId);
      const cargos = getCargos();
      if (!usuario || !cargos.length) return;

      // decide com base no total absoluto do usuário (newTotal) — cargos contêm minutos em minutos
      const elegiveis = cargos.filter(c => newTotal >= (c.minutos || 0));
      if (elegiveis.length) {
        const newRank = elegiveis.sort((a,b) => (b.minutos || 0) - (a.minutos || 0))[0];
        const guildMember = await newState.guild.members.fetch(userId).catch(() => null);
        if (!guildMember) return;

        if (!guildMember.roles.cache.has(newRank.roleId)) {
          const allRoleIds = cargos.map(c => c.roleId).filter(Boolean);
          const toRemove = allRoleIds.filter(id => guildMember.roles.cache.has(id));
          if (toRemove.length) await guildMember.roles.remove(toRemove).catch(console.error);
          await guildMember.roles.add(newRank.roleId).catch(console.error);

          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
          if (logChannel) {
            await logChannel.send(`${ICON} **PROMOÇÃO AUTOMÁTICA**\nParabéns <@${userId}>! Você foi promovido para **${newRank.nome}** após atingir **${newTotal} minutos**.`).catch(console.error);
          }
        }
      }
    } catch (err) {
      console.error('Erro up automático:', err);
    }
  }
}
