import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

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
                `Início: <t:${Math.floor(agora.getTime() / 1000)}:t>\n` +
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
                `Início: <t:${Math.floor(entrada.getTime() / 1000)}:t>\n` +
                `Término: <t:${Math.floor(agora.getTime() / 1000)}:t>\n` +
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

                        await member.roles.add(newRank.roleId).catch(console.error);

                        const upChannel = await client.channels.fetch(UPAMENTO_CHANNEL_ID);
                        if (upChannel) {
                            await upChannel.send(
                                `DPF - UPAMENTO ${ICON_EMOJI}\n\n` +
                                `Membro: <@${userId}>\n` +
                                `Cargo antigo: ${toRemove.map(r => `<@&${r}>`).join(', ') || 'Nenhum'}\n` +
                                `Novo cargo: <@&${newRank.roleId}>\n` +
                                `Motivo : Bate-ponto atingiu ${usuario.totalMinutes} minutos`
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
