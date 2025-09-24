import { atualizarHorasUsuario } from '../utils/sheets.js';
import { DateTime } from 'luxon';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';


const BATE_PONTO_CATEGORY_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

const pontosAtivos = new Map();

function formatTimestamp(date) {
    return `<t:${Math.floor(date.toSeconds())}:t>`;
}

export default async function batePontoHandler(client) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const member = newState.member;

        // Saiu da call da categoria
        if (
            oldState.channelId &&
            (!newState.channelId || newState.channel.parentId !== BATE_PONTO_CATEGORY_ID)
        ) {
            if (pontosAtivos.has(member.id)) {
                const ponto = pontosAtivos.get(member.id);
                ponto.end = DateTime.now().setZone('America/Sao_Paulo');

                // Calcula horas e minutos
                const diff = ponto.end.diff(ponto.start, ['hours', 'minutes']);
                const hours = diff.hours | 0;
                const minutes = diff.minutes | 0;

                // Atualiza na planilha (coluna de horas acumuladas)
                try {
                    await atualizarHorasUsuario(member.id, hours, minutes);
                } catch (err) {
                    console.error('Erro ao atualizar horas na planilha:', err);
                }

                // Envia embed de término no canal de logs
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFFD700)
                        .setTitle('Bate-Ponto Finalizado')
                        .setDescription(
                            `${ICON_EMOJI} **MEMBRO:** <@${member.id}>\n` +
                            `${ICON_EMOJI} **INÍCIO:** ${formatTimestamp(ponto.start)}\n` +
                            `${ICON_EMOJI} **TÉRMINO:** ${formatTimestamp(ponto.end)}\n` +
                            `${ICON_EMOJI} **TOTAL:** ${hours}h ${minutes}m`
                        );
                    await logChannel.send({ embeds: [embed] });
                }

                pontosAtivos.delete(member.id);
            }
            return;
        }

        // Entrou em call da categoria
        if (newState.channelId && newState.channel.parentId === BATE_PONTO_CATEGORY_ID) {
            if (!pontosAtivos.has(member.id)) {
                const start = DateTime.now().setZone('America/Sao_Paulo');
                pontosAtivos.set(member.id, { start, end: null });

                // Envia embed de início no canal de logs
                const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xFFD700)
                        .setTitle('Bate-Ponto Iniciado')
                        .setDescription(
                            `${ICON_EMOJI} **MEMBRO:** <@${member.id}>\n` +
                            `${ICON_EMOJI} **INÍCIO:** ${formatTimestamp(start)}\n` +
                            `${ICON_EMOJI} **TÉRMINO:** ~~*EM AÇÃO*~~\n` +
                            `${ICON_EMOJI} **TOTAL:** 0h 0m`
                        );
                    await logChannel.send({ embeds: [embed] });
                }
            }
        }
    });
}
