const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const supabase = require('../utils/supabase');

// --- EDITAR AQUI ---
const ID_CANAL_PAINEL = '1390160577095012433';
const ID_CARGO_PERMITIDO = '1390033256640024591';

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_PAINEL).catch(() => null);
    if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 5 });
    if (msgs.size > 0) await channel.bulkDelete(msgs).catch(()=>{});
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ver_ranking').setLabel('Ranking').setStyle(ButtonStyle.Primary).setEmoji('🏆'), new ButtonBuilder().setCustomId('ajustar_horas').setLabel('Ajustar').setStyle(ButtonStyle.Secondary).setEmoji('✏️'), new ButtonBuilder().setCustomId('resetar_tudo').setLabel('Resetar').setStyle(ButtonStyle.Danger).setEmoji('🗑️'));
    await channel.send({ embeds: [new EmbedBuilder().setTitle('👮‍♂️ Controle de Ponto').setDescription('Gerencie as horas aqui.').setColor(0x2B2D31)], components: [row] });
}

async function gerenciarInteracoes(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (['ver_ranking', 'ajustar_horas', 'resetar_tudo', 'modal_ajuste', 'confirm_reset'].includes(interaction.customId)) {
         if (!interaction.member.roles.cache.has(ID_CARGO_PERMITIDO)) return interaction.reply({ content: '⛔ Sem permissão.', ephemeral: true });
    }

    if (interaction.customId === 'ver_ranking') {
        await interaction.deferReply({ ephemeral: true });
        const { data: ranking } = await supabase.from('usuarios_registrados').select('discord_id, horas_totais, data_registro').order('horas_totais', { ascending: false });
        if (!ranking || ranking.length === 0) return interaction.editReply("Vazio.");
        const TAMANHO_PAGINA = 30; const totalPaginas = Math.ceil(ranking.length / TAMANHO_PAGINA);
        for (let i = 0; i < totalPaginas; i++) {
            const lote = ranking.slice(i * TAMANHO_PAGINA, (i + 1) * TAMANHO_PAGINA);
            let texto = "";
            lote.forEach((u, index) => {
                const h = Math.floor((u.horas_totais||0)/60); const m = (u.horas_totais||0)%60;
                let dataF = u.data_registro ? new Date(u.data_registro).toLocaleDateString('pt-BR') : 'N/A';
                texto += `**#${(i*30)+index+1}** <@${u.discord_id}> — \`${h}h ${m}m\` (📅 ${dataF})\n`;
            });
            const embed = new EmbedBuilder().setTitle(`🏆 Ranking Pg ${i+1}/${totalPaginas}`).setDescription(texto).setColor(0xFFD700);
            i === 0 ? await interaction.editReply({ embeds: [embed] }) : await interaction.followUp({ embeds: [embed], ephemeral: true });
        }
    }

    if (interaction.customId === 'ajustar_horas') {
        const modal = new ModalBuilder().setCustomId('modal_ajuste').setTitle('Ajuste Manual');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_discord').setLabel('ID Discord').setStyle(TextInputStyle.Short).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('minutos').setLabel('Minutos (+/-)').setStyle(TextInputStyle.Short).setRequired(true)));
        await interaction.showModal(modal);
    }
    if (interaction.customId === 'modal_ajuste') {
        await interaction.deferReply({ ephemeral: true });
        const target = interaction.fields.getTextInputValue('id_discord');
        const mins = parseInt(interaction.fields.getTextInputValue('minutos'));
        const { data: user } = await supabase.from('usuarios_registrados').select('horas_totais').eq('discord_id', target).single();
        if (!user) return interaction.editReply('❌ Não encontrado.');
        const novas = Math.max(0, (user.horas_totais || 0) + mins);
        await supabase.from('usuarios_registrados').update({ horas_totais: novas }).eq('discord_id', target);
        await interaction.editReply(`✅ Atualizado.`);
    }
    if (interaction.customId === 'resetar_tudo') await interaction.reply({ content: '⚠️ Resetar TUDO?', components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirm_reset').setLabel('CONFIRMAR').setStyle(ButtonStyle.Danger))], ephemeral: true });
    if (interaction.customId === 'confirm_reset') {
        await interaction.deferUpdate();
        await supabase.from('usuarios_registrados').update({ horas_totais: 0 }).neq('discord_id', '0');
        await interaction.editReply({ content: '💥 Resetado.', components: [] });
    }
}
module.exports = { enviarPainel, gerenciarInteracoes };