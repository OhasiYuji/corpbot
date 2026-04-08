const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// ============================================================
// ⚙️ CONFIGURAÇÃO
// ============================================================
const ID_CANAL_PAINEL = '1464432082489966703';
const ID_LOG_ADV = '1464445657392615576';
const ID_LOG_EXONERACAO = '1464446066823790827';
const ID_LOG_PROMOCAO = '1463520372350783622';
const ID_LOG_REBAIXAMENTO = '1464445999219998917';

// Caminho do Banner
const CAMINHO_BANNER = path.join(__dirname, '../assets/Banner.png');

// IMPORTANTE: A ORDEM AQUI IMPORTA! (0 = Maior Cargo)
const PATENTES_PARTE_1 = [
    { label: 'DRT.G', value: '1402010989884346389' },
    { label: 'DRT', value: '1390033256753135655' },
    { label: 'S.DRT', value: '1390033256753135654' },
    { label: 'SPTD', value: '1455022206827364352' },
    { label: 'COORD.G', value: '1395986975814582364' },
    { label: 'COORD', value: '1395986831941566627' },
    { label: 'DLG.G', value: '1390033256753135647' },
    { label: 'DLG', value: '1390033256727974059' },
    { label: 'DLG.A', value: '1390033256727974058' },
    { label: 'SPV', value: '1466854480174645299' }
];

const PATENTES_PARTE_2 = [
    { label: 'INV.C', value: '1463241851321454683' },
    { label: 'INV', value: '1390033256703066159' },
    { label: 'INSP', value: '1390033256703066158' },
    { label: 'AGT.E', value: '1390033256703066157' },
    { label: 'AGT.O', value: '1395984627906117647' },
    { label: 'AGT.1C', value: '1390033256703066153' },
    { label: 'AGT.2C', value: '1390033256703066152' },
    { label: 'AGT.3C', value: '1395976974190514337' },
    { label: 'ALN', value: '1488702571332767834' }
];

const ADVERTENCIAS = [
    { label: 'Advertência Verbal', value: '1390033256614854660' },
    { label: 'Advertência 1', value: '1390033256614854659' },
    { label: 'Advertência 2', value: '1390033256614854658' },
];

const ID_CARGO_EXONERADO = '1390033256593887454';
const ID_CARGO_MANTER = '1390033256593887447'; 

// Lista Combinada para cálculo de hierarquia
const HIERARQUIA_COMPLETA = [...PATENTES_PARTE_1, ...PATENTES_PARTE_2];

// ============================================================
// 1. ENVIAR PAINEL (VISUAL TÁTICO)
// ============================================================
async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_PAINEL).catch(() => null);
    if (!channel) return console.log("❌ Canal de RH não encontrado.");

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
        .setAuthor({ name: 'POLICIA FEDERAL | GESTÃO DE OFICIAIS', iconURL: client.user.displayAvatarURL() })
        .setDescription(`
        **CONTROLE HIERÁRQUICO**

        Ferramenta administrativa para gerenciamento de patenteamento e conduta dos oficiais. Todas as ações são registradas e auditadas pelo Alto Comando.

        > **PROCEDIMENTO:**
        > Selecione a ação desejada abaixo. Promoções e rebaixamentos calculam automaticamente a remoção de patentes conflitantes.
        `)
        .setColor(0x000000) // All Black
        .setFooter({ text: 'Diretoria de Pessoal', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    if (arquivoBanner) {
        embed.setImage('attachment://Banner.png');
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rh_btn_promover').setLabel('PROMOVER').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('rh_btn_rebaixar').setLabel('REBAIXAR').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rh_btn_advertir').setLabel('ADVERTÊNCIA').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('rh_btn_exonerar').setLabel('EXONERAR').setStyle(ButtonStyle.Danger)
    );

    const payload = { embeds: [embed], components: [row] };
    if (arquivoBanner) payload.files = [arquivoBanner];

    await channel.send(payload);
    console.log("✅ Painel de RH enviado.");
}

// ============================================================
// 2. GERENCIAMENTO DE INTERAÇÕES
// ============================================================
async function gerenciarRH(interaction, client) {
    // 1. CLIQUE NO BOTÃO
    if (interaction.isButton() && interaction.customId.startsWith('rh_btn_')) {
        const acao = interaction.customId.replace('rh_btn_', '');
        const row = new ActionRowBuilder().addComponents(
            new UserSelectMenuBuilder()
                .setCustomId(`rh_user_select_${acao}`)
                .setPlaceholder('SELECIONE O OFICIAL ALVO')
                .setMaxValues(1)
        );
        await interaction.reply({ content: `**AÇÃO INICIADA:** ${acao.toUpperCase()}`, components: [row], ephemeral: true });
    }

    // 2. SELEÇÃO DO USUÁRIO
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('rh_user_select_')) {
        const acao = interaction.customId.replace('rh_user_select_', '');
        const targetId = interaction.values[0];
        
        if (acao === 'exonerar') {
            const modal = new ModalBuilder().setCustomId(`rh_modal_exon_${targetId}`).setTitle('Motivo da Exoneração');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Justificativa').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
            return;
        }
        if (acao === 'advertir') {
            const rowAdv = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`rh_pre_advertir_${targetId}`).setPlaceholder('Selecione o Grau da Advertência').addOptions(ADVERTENCIAS));
            await interaction.update({ content: `**ADVERTIR OFICIAL:** <@${targetId}>`, components: [rowAdv] });
            return;
        }
        if (acao === 'promover' || acao === 'rebaixar') {
            const row1 = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`rh_pre_cargo_${acao}_${targetId}_p1`).setPlaceholder('Oficiais Superiores / Intermediários').addOptions(PATENTES_PARTE_1));
            const row2 = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`rh_pre_cargo_${acao}_${targetId}_p2`).setPlaceholder('Praças / Graduados').addOptions(PATENTES_PARTE_2));
            await interaction.update({ content: `**${acao.toUpperCase()}:** <@${targetId}>\nSelecione a **NOVA** patente:`, components: [row1, row2] });
        }
    }

    // 3. SELEÇÃO DO CARGO (Abre Modal)
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('rh_pre_cargo_')) {
            const parts = interaction.customId.split('_'); 
            const acao = parts[3];
            const targetId = parts[4];
            const novoCargoId = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`rh_modal_cargo_${acao}_${targetId}_${novoCargoId}`)
                .setTitle(`Motivo da ${acao === 'promover' ? 'Promoção' : 'Rebaixamento'}`);

            const inputMotivo = new TextInputBuilder().setCustomId('motivo').setLabel('Justificativa').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(inputMotivo));
            await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('rh_pre_advertir_')) {
            const targetId = interaction.customId.split('_')[3];
            const roleId = interaction.values[0];
            const modal = new ModalBuilder().setCustomId(`rh_modal_adv_${targetId}_${roleId}`).setTitle('Detalhes da Punição');
            modal.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true)), 
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tempo').setLabel('Tempo (Ex: 24h)').setStyle(TextInputStyle.Short).setRequired(true))
            );
            await interaction.showModal(modal);
        }
    }

    // 4. SUBMISSÃO DO MODAL (LÓGICA HIERÁRQUICA)
    if (interaction.type === InteractionType.ModalSubmit) {
        
        // --- ADVERTÊNCIA ---
        if (interaction.customId.startsWith('rh_modal_adv_')) {
            await interaction.deferReply({ ephemeral: true });
            const [_, __, ___, targetId, roleId] = interaction.customId.split('_');
            const motivo = interaction.fields.getTextInputValue('motivo');
            const tempo = interaction.fields.getTextInputValue('tempo');
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (member) await member.roles.add(roleId).catch(()=>{});
            const log = await client.channels.fetch(ID_LOG_ADV);
            if (log) log.send(`**RELATORIO DE ADVERTENCIA**\n\n**Oficial:** <@${targetId}>\n**Aplicado por:** <@${interaction.user.id}>\n**Sanção:** <@&${roleId}>\n**Motivo:** ${motivo}\n**Duração:** ${tempo}`);
            await interaction.editReply('✅ Punição aplicada e registrada.');
        }
        
// ATENÇÃO: Certifique-se de importar o supabase no topo deste arquivo!
// const supabase = require('../utils/supabase.js');

        // --- EXONERAÇÃO ---
        if (interaction.customId.startsWith('rh_modal_exon_')) {
            await interaction.deferReply({ ephemeral: true });
            const targetId = interaction.customId.split('_')[3];
            const motivo = interaction.fields.getTextInputValue('motivo');
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            
            if (member) {
                try { await member.roles.set([ID_CARGO_MANTER, ID_CARGO_EXONERADO]); } catch(e){}
            }

            // 🔴 [NOVO] Removendo o registro do banco de dados (Supabase)
            try {
                const { error } = await supabase
                    .from('nome_da_sua_tabela') // ⚠️ MUDE PARA O NOME DA SUA TABELA (ex: 'registros')
                    .delete()
                    .eq('discord_id', targetId); // ⚠️ MUDE PARA O NOME DA COLUNA QUE SALVA O ID

                if (error) console.error('Erro ao deletar do banco na exoneração:', error);
            } catch (err) {
                console.error('Erro de conexão com o Supabase:', err);
            }

            const log = await client.channels.fetch(ID_LOG_EXONERACAO);
            if (log) log.send(`**RELATORIO DE EXONERACAO**\n\n**Ex-Agente:** <@${targetId}>\n**Responsavel:** <@${interaction.user.id}>\n**Justificativa:** ${motivo}`);
            
            await interaction.editReply('🚫 Exoneração concluída e registro apagado do sistema.');
        }

        // --- PROMOÇÃO / REBAIXAMENTO COM LÓGICA HIERÁRQUICA ---
        if (interaction.customId.startsWith('rh_modal_cargo_')) {
            await interaction.deferReply({ ephemeral: true });
            const parts = interaction.customId.split('_'); 
            const acao = parts[3]; 
            const targetId = parts[4];
            const novoCargoId = parts[5];
            const motivo = interaction.fields.getTextInputValue('motivo');

            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            const indexNovoCargo = HIERARQUIA_COMPLETA.findIndex(p => p.value === novoCargoId);
            let cargosRemovidosLog = "Nenhum";

            if (member && indexNovoCargo !== -1) {
                const cargosParaRemover = member.roles.cache.filter(role => {
                    const indexCargoAtual = HIERARQUIA_COMPLETA.findIndex(p => p.value === role.id);
                    if (indexCargoAtual === -1) return false;
                    
                    // Lógica de Hierarquia
                    if (acao === 'promover') return indexCargoAtual > indexNovoCargo; // Remove inferiores
                    if (acao === 'rebaixar') return indexCargoAtual < indexNovoCargo; // Remove superiores
                    return false;
                });

                if (cargosParaRemover.size > 0) {
                    cargosRemovidosLog = cargosParaRemover.map(r => `<@&${r.id}>`).join(', ');
                    await member.roles.remove(cargosParaRemover).catch(() => console.log("Erro ao remover patente antiga"));
                }
                await member.roles.add(novoCargoId).catch(() => console.log("Erro ao add nova patente"));
            }

            const log = await client.channels.fetch(acao === 'promover' ? ID_LOG_PROMOCAO : ID_LOG_REBAIXAMENTO);
            if (log) {
                log.send(
                    `**RELATORIO DE ${acao.toUpperCase()}**\n\n` +
                    `**Oficial:** <@${targetId}>\n` +
                    `**Responsavel:** <@${interaction.user.id}>\n` +
                    `**Patente(s) Removida(s):** ${cargosRemovidosLog}\n` +
                    `**Nova Patente:** <@&${novoCargoId}>\n` +
                    `**Justificativa:** ${motivo}`
                );
            }
            await interaction.editReply(`✅ Alteração de patente (${acao}) realizada com sucesso.`);
        }
    }
}
module.exports = { enviarPainel, gerenciarRH };