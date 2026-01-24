const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder } = require('discord.js');
const supabase = require('../utils/supabase');
const path = require('path');
const fs = require('fs');

// ============================================================
// ⚙️ CONFIGURAÇÃO
// ============================================================
const ID_CANAL_PAINEL = '1390160577095012433';
const ID_CARGO_PERMITIDO = '1390033256640024591'; // Cargo que pode mexer nisso

// Caminho do Banner
const CAMINHO_BANNER = path.join(__dirname, '../assets/Banner.png');

// ============================================================
// 1. ENVIAR PAINEL (VISUAL TÁTICO)
// ============================================================
async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_PAINEL).catch(() => null);
    if (!channel) return console.log("❌ Canal de Gestão não encontrado.");

    try {
        const msgs = await channel.messages.fetch({ limit: 5 });
        if (msgs.size > 0) await channel.bulkDelete(msgs).catch(()=>{});
    } catch(e) {}

    // Prepara o Banner
    let arquivoBanner = null;
    if (fs.existsSync(CAMINHO_BANNER)) {
        arquivoBanner = new AttachmentBuilder(CAMINHO_BANNER, { name: 'Banner.png' });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'BOPE | GESTÃO DE EFETIVO', iconURL: client.user.displayAvatarURL() })
        .setDescription(`
        **CENTRAL DE CONTROLE DE PONTO**

        Painel administrativo para monitoramento de horas, ranking de atividade e ajustes manuais de folha de ponto. O uso indevido destas ferramentas é passível de punição.

        \`\`\`ml
        STATUS: RESTRITO
        PERMISSAO: COMANDO
        \`\`\`

        > **FUNÇÕES:**
        > Utilize os terminais abaixo para gerenciar o banco de dados de horas da corporação.
        `)
        .setColor(0x000000) // All Black
        .setFooter({ text: 'Setor de Tecnologia da Informação', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    if (arquivoBanner) {
        embed.setImage('attachment://Banner.png');
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ver_ranking').setLabel('VISUALIZAR RANKING').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ajustar_horas').setLabel('AJUSTE MANUAL').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('resetar_tudo').setLabel('RESETAR CICLO').setStyle(ButtonStyle.Danger)
    );

    const payload = { embeds: [embed], components: [row] };
    if (arquivoBanner) payload.files = [arquivoBanner];

    await channel.send(payload);
    console.log("✅ Painel de Gestão enviado.");
}

// ============================================================
// 2. GERENCIAMENTO DE INTERAÇÕES
// ============================================================
async function gerenciarInteracoes(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // Verifica permissão
    if (['ver_ranking', 'ajustar_horas', 'resetar_tudo', 'modal_ajuste', 'confirm_reset'].includes(interaction.customId)) {
         if (!interaction.member.roles.cache.has(ID_CARGO_PERMITIDO)) {
             return interaction.reply({ content: '⛔ **ACESSO NEGADO:** Você não tem permissão para usar este painel.', ephemeral: true });
         }
    }

    // --- VER RANKING ---
    if (interaction.customId === 'ver_ranking') {
        await interaction.deferReply({ ephemeral: true });
        
        const { data: ranking } = await supabase
            .from('usuarios_registrados')
            .select('discord_id, horas_totais, data_registro')
            .order('horas_totais', { ascending: false });

        if (!ranking || ranking.length === 0) return interaction.editReply("❌ O banco de dados está vazio.");

        const TAMANHO_PAGINA = 30; 
        const totalPaginas = Math.ceil(ranking.length / TAMANHO_PAGINA);

        for (let i = 0; i < totalPaginas; i++) {
            const lote = ranking.slice(i * TAMANHO_PAGINA, (i + 1) * TAMANHO_PAGINA);
            let texto = "";
            
            lote.forEach((u, index) => {
                const h = Math.floor((u.horas_totais||0)/60); 
                const m = (u.horas_totais||0)%60;
                let dataF = u.data_registro ? new Date(u.data_registro).toLocaleDateString('pt-BR') : 'N/A';
                
                // Formatação mais bonita para o ranking
                const posicao = (i * 30) + index + 1;
                let medalha = '▪️';
                if (posicao === 1) medalha = '🥇';
                if (posicao === 2) medalha = '🥈';
                if (posicao === 3) medalha = '🥉';

                texto += `${medalha} **#${posicao}** <@${u.discord_id}> \n> ⏱️ \`${h}h ${m}m\` • 📅 Desde: ${dataF}\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle(`🏆 RANKING DE ATIVIDADE - PÁGINA ${i+1}/${totalPaginas}`)
                .setDescription(texto)
                .setColor(0x000000)
                .setFooter({ text: 'Relatório de Atividade' });

            if (i === 0) {
                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            }
        }
    }

    // --- AJUSTAR HORAS (ABRIR MODAL) ---
    if (interaction.customId === 'ajustar_horas') {
        const modal = new ModalBuilder().setCustomId('modal_ajuste').setTitle('Ajuste Manual de Horas');
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_discord').setLabel('ID do Usuário (Discord)').setStyle(TextInputStyle.Short).setRequired(true)), 
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('minutos').setLabel('Minutos (+ para adicionar, - para remover)').setStyle(TextInputStyle.Short).setPlaceholder('Ex: 60 ou -30').setRequired(true))
        );
        await interaction.showModal(modal);
    }

    // --- PROCESSAR AJUSTE ---
    if (interaction.customId === 'modal_ajuste') {
        await interaction.deferReply({ ephemeral: true });
        
        const target = interaction.fields.getTextInputValue('id_discord');
        const minsInput = interaction.fields.getTextInputValue('minutos');
        const mins = parseInt(minsInput);

        if (isNaN(mins)) return interaction.editReply('❌ Valor inválido. Insira apenas números inteiros.');

        const { data: user } = await supabase.from('usuarios_registrados').select('horas_totais').eq('discord_id', target).single();
        
        if (!user) return interaction.editReply('❌ Usuário não encontrado no banco de dados.');

        const novas = Math.max(0, (user.horas_totais || 0) + mins);
        
        await supabase.from('usuarios_registrados').update({ horas_totais: novas }).eq('discord_id', target);
        
        await interaction.editReply(`✅ **SUCESSO:** As horas de <@${target}> foram atualizadas.\nAnterior: ${user.horas_totais}m | Atual: ${novas}m`);
    }

    // --- RESETAR TUDO ---
    if (interaction.customId === 'resetar_tudo') {
        await interaction.reply({ 
            content: '⚠️ **PERIGO:** Você está prestes a zerar as horas de **TODOS** os membros.\nIsso não pode ser desfeito. Tem certeza?', 
            components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('confirm_reset').setLabel('CONFIRMAR RESET').setStyle(ButtonStyle.Danger))], 
            ephemeral: true 
        });
    }

    if (interaction.customId === 'confirm_reset') {
        await interaction.deferUpdate();
        
        // Zera horas de todos que não sejam o ID 0 (apenas para pegar todos)
        await supabase.from('usuarios_registrados').update({ horas_totais: 0 }).neq('discord_id', '0');
        
        await interaction.editReply({ content: '💥 **CICLO RESETADO:** Todas as horas foram definidas para 0.', components: [] });
    }
}

module.exports = { enviarPainel, gerenciarInteracoes };