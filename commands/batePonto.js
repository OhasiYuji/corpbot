// commands/batePonto.js
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';
import { formatTimestampBR } from '../utils/format.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const UPAMENTO_CHANNEL_ID = '1390033257533542417';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

const usersInPoint = new Map();

export async function voiceStateHandler(client, oldState, newState) {
  const userId = newState.member.user.id;

  // Entrou na categoria de bate-ponto
  if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
      newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

    usersInPoint.set(userId, new Date());

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      const agora = new Date();
      await logChannel.send(
        `${ICON_EMOJI} Bate-Ponto Iniciado\n` +
        `Membro: <@${userId}>\n` +
        `Início: <t:${formatTimestampBR(agora)}:t>\n` +
        `Término: ~~*EM AÇÃO*~~\n` +
        `Total: 0 minutos`
      );
    }
  }

  // Saiu da categoria de bate-ponto
  if (oldState.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
      (!newState.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {

    const entrada = usersInPoint.get(userId);
    if (!entrada) return;

    const agora = new Date();
    const diffMs = agora - entrada;
    const minutosTotais = Math.ceil(diffMs / 1000 / 60);

    const result = await atualizarHorasUsuario(userId, minutosTotais);

    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (logChannel) {
      await logChannel.send(
        `${ICON_EMOJI} Bate-Ponto Finalizado\n` +
        `Membro: <@${userId}>\n` +
        `Início: <t:${formatTimestampBR(entrada)}:t>\n` +
        `Término: <t:${formatTimestampBR(agora)}:t>\n` +
        `Total: ${minutosTotais} minutos`
      );
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

            const oldRoles = toRemove.length ? `<@&${toRemove[0]}>` : 'Nenhum';
            await member.roles.add(newRank.roleId).catch(console.error);

            const upamentoChannel = await client.channels.fetch(UPAMENTO_CHANNEL_ID);
            if (upamentoChannel) {
              await upamentoChannel.send(
                `DPF - UPAMENTO <:Policiafederallogo:1399436333071728730>\n\n` +
                `Membro: <@${userId}>\n` +
                `Cargo antigo: ${oldRoles}\n` +
                `Novo cargo: <@&${newRank.roleId}>\n` +
                `Motivo : <@&1390033256627572761>`
              );
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao verificar promoção automática:', err);
    }
  }
}
