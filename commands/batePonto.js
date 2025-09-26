import { EmbedBuilder } from 'discord.js';
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

const usersInPoint = new Map();

export async function voiceStateHandler(client, oldState, newState) {
  const userId = newState.member.user.id;

  // Entrou na categoria de bate-ponto
  if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
      newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {
    usersInPoint.set(userId, { entrada: new Date(), messageId: null });

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Bate-Ponto Iniciado`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Membro', value: `<@${userId}>`, inline: true },
          { name: 'Início', value: `<t:${Math.floor(new Date()/1000)}:t>`, inline: true },
          { name: 'Término', value: '~~*EM AÇÃO*~~', inline: true },
          { name: 'Total', value: '0 min', inline: true }
        );

      const msg = await logChannel.send({ embeds: [embed] });
      usersInPoint.set(userId, { entrada: new Date(), messageId: msg.id });
    }
  }

  // Saiu da categoria
  if (oldState.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
      (!newState.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {
    const ponto = usersInPoint.get(userId);
    if (!ponto) return;

    const agora = new Date();
    const diffMin = Math.ceil((agora - ponto.entrada) / 1000 / 60);

    const res = await atualizarHorasUsuario(userId, diffMin);

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel && ponto.messageId) {
      const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Bate-Ponto Finalizado`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Membro', value: `<@${userId}>`, inline: true },
          { name: 'Início', value: `<t:${Math.floor(ponto.entrada/1000)}:t>`, inline: true },
          { name: 'Término', value: `<t:${Math.floor(agora/1000)}:t>`, inline: true },
          { name: 'Total', value: `${diffMin} min`, inline: true }
        )
        .setFooter({ text: '-# - O ponto foi fechado automaticamente, o membro saiu da call.' });

      const msg = await logChannel.messages.fetch(ponto.messageId);
      if (msg) await msg.edit({ embeds: [embed] });
    }

    usersInPoint.delete(userId);

    // Promoção automática
    try {
      const usuario = await getUsuario(userId);
      const cargos = await getCargos();
      if (usuario && cargos.length) {
        const eligibles = cargos.filter(c => usuario.totalMinutes >= c.minutes);
        if (eligibles.length) {
          const newRank = eligibles.sort((a,b)=>b.minutes-a.minutes)[0];
          const member = await newState.guild.members.fetch(userId);
          if (!member.roles.cache.has(newRank.roleId)) {
            const allRoleIds = cargos.map(c=>c.roleId).filter(Boolean);
            const toRemove = allRoleIds.filter(id=>member.roles.cache.has(id));
            if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);
            await member.roles.add(newRank.roleId).catch(console.error);

            // Log de promoção
            if (logChannel) {
              const embed = new EmbedBuilder()
                .setTitle(`${ICON_EMOJI} Promoção Automática`)
                .setColor(0x32CD32)
                .setDescription(`Parabéns <@${userId}>! Você foi promovido para **${newRank.nome}** após atingir **${usuario.totalMinutes} min**.`);
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
