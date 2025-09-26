import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';
import { EmbedBuilder } from 'discord.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const UPAMENTO_CHANNEL_ID = '1390033257533542417';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

const usersInPoint = new Map(); // Guarda data de entrada
const messageMap = new Map();    // Guarda ID da mensagem enviada

export async function voiceStateHandler(client, oldState, newState) {
    const userId = newState.member.user.id;

    // Entrou na categoria de bate-ponto
    if ((!oldState.channel || oldState.channel.parentId !== CATEGORY_VOICE_ID) &&
        newState.channel && newState.channel.parentId === CATEGORY_VOICE_ID) {

        const agora = new Date();
        usersInPoint.set(userId, agora);

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`${ICON_EMOJI} Bate-Ponto Iniciado`)
            .addFields(
                { name: 'Membro', value: `<@${userId}>`, inline: true },
                { name: 'Início', value: `<t:${Math.floor(agora.getTime() / 1000)}:t>`, inline: true },
                { name: 'Término', value: '~~*EM AÇÃO*~~', inline: true },
                { name: 'Total', value: '0 minutos', inline: true }
            );

        const msg = await logChannel.send({ embeds: [embed] });
        messageMap.set(userId, msg.id);
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
        if (!logChannel) return;

        const messageId = messageMap.get(userId);
        let embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle(`${ICON_EMOJI} Bate-Ponto Finalizado`)
            .addFields(
                { name: 'Membro', value: `<@${userId}>`, inline: true },
                { name: 'Início', value: `<t:${Math.floor(entrada.getTime() / 1000)}:t>`, inline: true },
                { name: 'Término', value: `<t:${Math.floor(agora.getTime() / 1000)}:t>`, inline: true },
                { name: 'Total', value: `${minutosTotais} minutos`, inline: true }
            )
            .setFooter({ text: '-# - O ponto foi fechado automaticamente, o membro saiu da call.' });

        if (messageId) {
            // Edita a mensagem original
            const msg = await logChannel.messages.fetch(messageId).catch(() => null);
            if (msg) await msg.edit({ embeds: [embed] });
        }

        usersInPoint.delete(userId);
        messageMap.delete(userId);

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
