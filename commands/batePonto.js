import { atualizarHorasUsuario, getUsuariosTodos } from '../utils/sheets.js';
import { EmbedBuilder } from 'discord.js';

const ICON_EMOJI = '<:iconepf:1399436333071728730>';
const BATE_PONTO_CHANNEL = '1390033258821062760';
const VOICE_ROLE = '1390033256640024591'; // quem tem permissão

const pontos = new Map(); // userId -> mensagem do ponto

export async function voiceStateHandler(client, oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member) return;
    if (!member.roles.cache.has(VOICE_ROLE)) return;

    // entrou na call
    if (!oldState.channel && newState.channel) {
        const startedAt = Date.now();
        const embed = new EmbedBuilder()
            .setTitle(`${ICON_EMOJI} BATE-PONTO`)
            .setDescription('Ponto iniciado!')
            .addFields(
                { name: 'MEMBRO', value: `<@${member.id}>`, inline: true },
                { name: 'INÍCIO', value: `<t:${Math.floor(startedAt / 1000)}:t>`, inline: true },
                { name: 'TÉRMINO', value: '---', inline: true },
                { name: 'TOTAL', value: '00:00', inline: true }
            );

        const channel = await client.channels.fetch(BATE_PONTO_CHANNEL);
        const msg = await channel.send({ embeds: [embed] });
        pontos.set(member.id, { startedAt, msg });
    }

    // saiu da call
    if (oldState.channel && !newState.channel && pontos.has(member.id)) {
        const data = pontos.get(member.id);
        const duration = Math.floor((Date.now() - data.startedAt) / 60000); // minutos
        await atualizarHorasUsuario(member.id, duration);

        const embed = EmbedBuilder.from(data.msg.embeds[0])
            .spliceFields(2, 2, 
                { name: 'TÉRMINO', value: `<t:${Math.floor(Date.now()/1000)}:t>`, inline: true },
                { name: 'TOTAL', value: `${String(duration).padStart(2,'0')}:00`, inline: true }
            )
            .setFooter({ text: '-# - O ponto foi fechado automaticamente, o membro saiu da call.' });

        await data.msg.edit({ embeds: [embed] });
        pontos.delete(member.id);
    }
}
