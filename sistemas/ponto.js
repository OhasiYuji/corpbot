const { EmbedBuilder } = require('discord.js');
const supabase = require('../utils/supabase');

// --- EDITAR AQUI ---
const ID_CANAL_LOG_PONTO = '1390161145037590549';
const ID_CATEGORIA_PERMITIDA = '1390033257910894599';

async function gerenciarPonto(oldState, newState, client) {
    const user = newState.member ? newState.member.user : oldState.member.user;
    if (user.bot) return;

    const oldCat = oldState.channel ? oldState.channel.parentId : null;
    const newCat = newState.channel ? newState.channel.parentId : null;

    if (newCat === ID_CATEGORIA_PERMITIDA && oldCat !== ID_CATEGORIA_PERMITIDA) {
        const channelLog = await client.channels.fetch(ID_CANAL_LOG_PONTO).catch(() => null);
        let msgId = null;
        if (channelLog) {
            const embed = new EmbedBuilder().setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setDescription(`🟢 **INICIOU PATRULHA**\n📍 ${newState.channel.name}\n⏰ <t:${Math.floor(Date.now()/1000)}:R>`).setColor(0x57F287);
            const msg = await channelLog.send({ embeds: [embed] });
            msgId = msg.id;
        }
        await supabase.from('controle_ponto').insert({ discord_id: user.id, canal_id: newState.channel.id, entrada: new Date().toISOString(), message_id: msgId });
    }
    else if (oldCat === ID_CATEGORIA_PERMITIDA && newCat !== ID_CATEGORIA_PERMITIDA) {
        const { data: ponto } = await supabase.from('controle_ponto').select('*').eq('discord_id', user.id).is('saida', null).single();
        if (ponto) {
            const dataEntrada = new Date(ponto.entrada);
            const dataSaida = new Date();
            const minutos = Math.floor((dataSaida - dataEntrada) / 1000 / 60);
            await supabase.from('controle_ponto').update({ saida: dataSaida.toISOString(), tempo_minutos: minutos }).eq('id', ponto.id);
            
            const { data: userReg } = await supabase.from('usuarios_registrados').select('horas_totais').eq('discord_id', user.id).single();
            if (userReg) await supabase.from('usuarios_registrados').update({ horas_totais: (userReg.horas_totais || 0) + minutos }).eq('discord_id', user.id);

            if (ponto.message_id) {
                const channelLog = await client.channels.fetch(ID_CANAL_LOG_PONTO);
                const msgAntiga = await channelLog.messages.fetch(ponto.message_id).catch(() => null);
                if (msgAntiga) {
                    const horas = Math.floor(minutos / 60); const mins = minutos % 60;
                    const embedEdit = new EmbedBuilder().setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() }).setTitle('✅ PATRULHA FINALIZADA').addFields({name: 'Entrada', value:`<t:${Math.floor(dataEntrada.getTime()/1000)}:t>`, inline:true}, {name: 'Saída', value:`<t:${Math.floor(dataSaida.getTime()/1000)}:t>`, inline:true}, {name: 'Tempo Total', value:`**${horas}h ${mins}m**`, inline:true}).setColor(0xED4245);
                    await msgAntiga.edit({ embeds: [embedEdit] });
                }
            }
        }
    }
}
module.exports = { gerenciarPonto };