// commands/batePonto.js
import { EmbedBuilder } from 'discord.js';
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';
import { formatTimestampBR } from '../utils/format.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

const usersInPoint = new Map();

export async function voiceStateHandler(client, oldState, newState) {
  const userId = newState.member.user.id;

  // Entrou
  if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
      newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

    usersInPoint.set(userId, new Date());

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Bate-Ponto Iniciado`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Membro', value: `<@${userId}>`, inline: true },
          { name: 'Início', value: `<t:${formatTimestampBR(new Date())}:t>`, inline: true },
          { name: 'Término', value: '~~*EM AÇÃO*~~', inline: true },
          { name: 'Total', value: '0h 0m', inline: true }
        );
      await logChannel.send({ embeds: [embed] });
    }
  }

  // Saiu
  if (oldState.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
      (!newState.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {

    const entrada = usersInPoint.get(userId);
    if (!entrada) return;

    const agora = new Date();
    const diffMs = agora - entrada;
    const minutosTotais = Math.ceil(diffMs / 1000 / 60);
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;

    const result = await atualizarHorasUsuario(userId, horas, minutos);

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Bate-Ponto Finalizado`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Membro', value: `<@${userId}>`, inline: true },
          { name: 'Início', value: `<t:${formatTimestampBR(entrada)}:t>`, inline: true },
          { name: 'Término', value: `<t:${formatTimestampBR(agora)}:t>`, inline: true },
          { name: 'Total', value: `${horas}h ${minutos}m`, inline: true }
        );
      await logChannel.send({ embeds: [embed] });
    }

    usersInPoint.delete(userId);

    // Promoção automática
    try {
      const usuario = await getUsuario(userId);
      const cargos = await getCargos();

      if (usuario && cargos.length) {
        const eligibles = cargos.filter(c => usuario.totalMinutes >= c.minutes);
        if (eligibles.length) {
          const newRank = eligibles.sort((a, b) => b.minutes - a.minutes)[0];

          const member = await newState.guild.members.fetch(userId);
          if (!member.roles.cache.has(newRank.roleId)) {
            const allRoleIds = cargos.map(c => c.roleId).filter(Boolean);
            const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
            if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);

            await member.roles.add(newRank.roleId).catch(console.error);

            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
            if (logChannel) {
              const embed = new EmbedBuilder()
                .setTitle(`${ICON_EMOJI} Promoção Automática`)
                .setColor(0x32CD32)
                .setDescription(
                  `Parabéns <@${userId}>! Você foi promovido para **${newRank.nome}** ` +
                  `após atingir **${usuario.hoursFloat.toFixed(2)}h (${usuario.totalMinutes} min)**.`
                );
              await logChannel.send({ embeds: [embed] });
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao verificar promoção automática:', err);
    }
  }
}
