import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

// ** Certifique-se de que estes IDs e o ÍCONE estão corretos **
const CATEGORY_VOICE_ID = '1390033257910894599'; // Categoria a ser monitorada
const LOG_CHANNEL_ID = '1390161145037590549';     // Canal de log
const ICON = '<:medalha:1407068603299139786>';

const usersInPoint = new Map();
const messagesInPoint = new Map();

/**
 * Lida com as mudanças no estado de voz dos membros.
 * @param {import('discord.js').Client} client 
 * @param {import('discord.js').VoiceState} oldState 
 * @param {import('discord.js').VoiceState} newState 
 */
export async function voiceStateHandler(client, oldState, newState) {
    // 1. Obter o membro consistentemente
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return; // Ignora bots

    const userId = member.user.id;

    // --- Lógica de Verificação de Transição ---

    const oldChannelParentId = oldState?.channel?.parentId;
    const newChannelParentId = newState?.channel?.parentId;

    const cameFromOutside = oldChannelParentId !== CATEGORY_VOICE_ID;
    const wentToInside = newChannelParentId === CATEGORY_VOICE_ID;
    const leftInside = oldChannelParentId === CATEGORY_VOICE_ID;
    const wentToOutside = newChannelParentId !== CATEGORY_VOICE_ID;

    // ------------------------------------------

    // ** 1. ENTRADA (Início do Ponto) **
    // Condição: Veio de um canal NÃO monitorado OU estava desconectado E entrou no canal monitorado.
    if (cameFromOutside && wentToInside) {
        
        // Verifica se já estava no ponto (para evitar reabrir)
        if (usersInPoint.has(userId)) return;

        const now = new Date();
        usersInPoint.set(userId, now);

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        
        if (logChannel) {
            const msg = await logChannel.send(
`${ICON} **MEMBRO:** <@${userId}>
${ICON} **INÍCIO:** <t:${Math.floor(now.getTime() / 1000)}:t>
${ICON} **TÉRMINO:** ~~*EM AÇÃO*~~
${ICON} **TOTAL:** 0m`
            ).catch(console.error);
            
            if (msg) messagesInPoint.set(userId, msg);
        }
        return;
    }

    // ** 2. SAÍDA (Fim do Ponto) **
    // Condição: Estava em um canal monitorado E saiu para um canal NÃO monitorado OU se desconectou.
    if (leftInside && wentToOutside) {

        const entrada = usersInPoint.get(userId);
        if (!entrada) return; // Se não houver registro, ignora

        const agora = new Date();
        // A diferença em milissegundos dividida por 1000/60 para obter minutos.
        // Math.ceil garante que até mesmo 1 segundo conte como 1 minuto.
        const minutosTotais = Math.ceil((agora - entrada) / 1000 / 60);

        // Atualiza a folha de horas e obtém o novo total (assumindo que esta função está funcionando)
        const novoTotal = await atualizarHorasUsuario(userId, minutosTotais);

        const msg = messagesInPoint.get(userId);
        if (msg) {
            await msg.edit(
`${ICON} **MEMBRO:** <@${userId}>
${ICON} **INÍCIO:** <t:${Math.floor(entrada.getTime() / 1000)}:t>
${ICON} **TÉRMINO:** <t:${Math.floor(agora.getTime() / 1000)}:t>
${ICON} **TOTAL:** ${minutosTotais}m
-# - O ponto foi fechado automaticamente, o membro saiu da call.`
            ).catch(console.error);
        }

        // Limpa os registros
        usersInPoint.delete(userId);
        messagesInPoint.delete(userId);
        
        return;
    }

    // Caso o membro se mute, desmute, ou mude de canal dentro da categoria, não faz nada.
}