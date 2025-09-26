import { EmbedBuilder } from 'discord.js';
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

const usersInPoint = new Map();
const messagesInPoint = new Map();

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
        .setColor(0x32CD32)
        .addFields(
          { name: 'Membro', value: `<@${userId}>`, inline: true },
          { name: 'Início', value: `<t:${Math.floor(Date.now()/1000)}:t>`, inline: true },
          { name: 'Término', value: '~~*EM AÇÃO*~~', inline: true },
          { name: 'Total', value: '0m', inline: true }
        );

      const msg = await logChannel.send({ embeds: [embed] });
      messagesInPoint.set(userId, msg);
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

    const totalMin = await atualizarHorasUsuario(userId, minutosTotais);

    const msg = messagesInPoint.get(userId);
    if (msg) {
      const embed = new EmbedBuilder(msg.embeds[0].data)
        .setColor(0xFFD700)
        .spliceFields(2,2,
          { name: 'Término', value: `<t:${Math.floor(agora.getTime()/1000)}:t>`, inline: true },
          { name: 'Total', value: `${minutosTotais}m`, inline: true }
        )
        .setFooter({ text: '-# - O ponto foi fechado automaticamente, o membro saiu da call.' });
      await msg.edit({ embeds: [embed] });
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
