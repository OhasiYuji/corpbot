// commands/batePonto.js
import { EmbedBuilder } from 'discord.js';
import { atualizarHorasUsuario } from '../utils/sheets.js';
import { formatTimeBR, formatTimestampBR } from '../utils/format.js';

const CATEGORY_VOICE_ID = '1390033257910894599';
const LOG_CHANNEL_ID = '1390161145037590549';
const ICON_EMOJI = '<:iconepf:1399436333071728730>'; // ícone da PF

// Map para armazenar hora de entrada de cada usuário
const usersInPoint = new Map(); // userId => Date

export async function voiceStateHandler(client, oldState, newState) {
    const userId = newState.member.user.id;

    // Entrou em uma call da categoria
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

    // Saiu da call da categoria
    if (oldState.channel && oldState.channel.parentId === CATEGORY_VOICE_ID &&
        (!newState.channel || newState.channel.parentId !== CATEGORY_VOICE_ID)) {

        const entrada = usersInPoint.get(userId);
        if (!entrada) return;

        const agora = new Date();
        const diffMs = agora - entrada;

        // Calcula total de minutos e depois horas/minutos
        const minutosTotais = Math.ceil(diffMs / 1000 / 60);
        const horas = Math.floor(minutosTotais / 60);
        const minutos = minutosTotais % 60;

        // Atualiza planilha
        await atualizarHorasUsuario(userId, horas, minutos);

        // Envia embed de finalização
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
    }
}
