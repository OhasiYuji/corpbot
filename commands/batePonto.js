import { atualizarHorasUsuario, getUsuario } from '../utils/sheets.js';
import fs from 'fs';
import path from 'path';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON = ':Policiafederallogo:';

const metasPath = path.resolve('./data/metas.json');
const metas = JSON.parse(fs.readFileSync(metasPath, 'utf-8'));

const usersInPoint = new Map();
const messagesInPoint = new Map();

export async function voiceStateHandler(client, oldState, newState) {
  const userId = newState.member.user.id;

  // Entrou na categoria
  if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
      newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

    usersInPoint.set(userId, new Date());

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      const msg = await logChannel.send(`${ICON} **MEMBRO:** <@${userId}>\n${ICON} **INÍCIO:** <t:${Math.floor(Date.now()/1000)}:t>\n${ICON} **TÉRMINO:** ~~*EM AÇÃO*~~\n${ICON} **TOTAL:** 0m`);
      messagesInPoint.set(userId, msg);
    }
  }

  // Saiu da categoria
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
      await msg.edit(`${ICON} **MEMBRO:** <@${userId}>\n${ICON} **INÍCIO:** <t:${Math.floor(entrada.getTime()/1000)}:t>\n${ICON} **TÉRMINO:** <t:${Math.floor(agora.getTime()/1000)}:t>\n${ICON} **TOTAL:** ${minutosTotais}m\n-# - O ponto foi fechado automaticamente, o membro saiu da call.`);
    }

    usersInPoint.delete(userId);
    messagesInPoint.delete(userId);

    // Up automático
    try {
      const usuario = await getUsuario(userId);
      if (!usuario) return;

      const elegiveis = metas.filter(c => usuario.minutos >= c.minutos);
      if (elegiveis.length) {
        const newRank = elegiveis.sort((a,b)=>b.minutos - a.minutos)[0];
        const member = await newState.guild.members.fetch(userId);

        if (!member.roles.cache.has(newRank.roleId)) {
          const allRoleIds = metas.map(c => c.roleId);
          const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
          if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);

          await member.roles.add(newRank.roleId).catch(console.error);

          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
          if (logChannel) {
            await logChannel.send(`${ICON} Parabéns <@${userId}>! Você foi promovido para **${newRank.nome}** após atingir **${usuario.minutos} minutos**.`);
          }
        }
      }
    } catch (err) {
      console.error('Erro no up automático:', err);
    }
  }
}
