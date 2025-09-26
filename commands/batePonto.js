import { EmbedBuilder } from 'discord.js';
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON_PF = '<:iconepf:1399436333071728730>';

const usersInPoint = new Map();
const messagesInPoint = new Map();

export async function voiceStateHandler(client, oldState, newState) {
  const userId = newState.member.user.id;

    // Entrou
    if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
        newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

    const agora = new Date();
    usersInPoint.set(userId, agora);

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const msg = await logChannel.send(
        `${ICON_PF}  **MEMBRO:** <@${userId}>\n` +
        `${ICON_PF}  **INÍCIO:** <t:${Math.floor(agora.getTime()/1000)}:t>\n` +
        `${ICON_PF}  **TÉRMINO:** ~~*EM AÇÃO*~~\n` +
        `${ICON_PF}  **TOTAL:** 0m`
    );

    // Guardamos a mensagem para editar depois
    messagesInPoint.set(userId, msg);
    }

    // Saiu
    if (oldState.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
        (!newState.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {

    const entrada = usersInPoint.get(userId);
    if (!entrada) return;

    const agora = new Date();
    const diffMinutos = Math.ceil((agora - entrada) / 1000 / 60);

    // Atualiza no Google Sheets
    await atualizarHorasUsuario(userId, diffMinutos);

    const msg = messagesInPoint.get(userId);
    if (msg) {
        const texto =
        `${ICON_PF} **MEMBRO:** <@${userId}>\n` +
        `${ICON_PF} **INÍCIO:** <t:${Math.floor(entrada.getTime()/1000)}:t>\n` +
        `${ICON_PF} **TÉRMINO:** <t:${Math.floor(agora.getTime()/1000)}:t>\n` +
        `${ICON_PF} **TOTAL:** ${diffMinutos}m\n` +
        `-# - O ponto foi fechado automaticamente, o membro saiu da call.`;

        await msg.edit({ content: texto });
    }

    usersInPoint.delete(userId);
    messagesInPoint.delete(userId);

    // Up automático
    try {
      const usuario = await getUsuario(userId);
      const cargos = await getCargos();
      if (!usuario || !cargos.length) return;

      const elegiveis = cargos.filter(c => usuario.minutos >= c.minutos);
      if (elegiveis.length) {
        const newRank = elegiveis.sort((a,b)=>b.minutos - a.minutos)[0];
        const member = await newState.guild.members.fetch(userId);

        if (!member.roles.cache.has(newRank.roleId)) {
          const allRoleIds = cargos.map(c => c.roleId);
          const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
          if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);

          await member.roles.add(newRank.roleId).catch(console.error);

          const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
          if (logChannel) {
            const embed = new EmbedBuilder()
              .setTitle(`${ICON_EMOJI} Promoção Automática`)
              .setColor(0x32CD32)
              .setDescription(`Parabéns <@${userId}>! Você foi promovido para **${newRank.nome}** após atingir **${usuario.minutos} minutos**.`);
            await logChannel.send({ embeds: [embed] });
          }
        }
      }
    } catch (err) {
      console.error('Erro no up automático:', err);
    }
  }
}
