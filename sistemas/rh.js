const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, EmbedBuilder } = require('discord.js');

// --- CONFIGURAÇÃO (SEUS IDs) ---
const ID_CANAL_PAINEL = '1464432082489966703';
const ID_LOG_ADV = '1390033257533542416';
const ID_LOG_EXONERACAO = '1418807745510903869';
const ID_LOG_PROMOCAO = '1463520372350783622';
const ID_LOG_REBAIXAMENTO = '1390033257533542418';

// IMPORTANTE: A ORDEM AQUI IMPORTA!
// O primeiro da lista é o MAIOR cargo (Índice 0). O último é o MENOR.
const PATENTES_PARTE_1 = [
    { label: 'CMD.G', value: '1402010989884346389' },
    { label: 'CMD', value: '1390033256753135655' },
    { label: 'S.CMD', value: '1390033256753135654' },
    { label: 'CH-EM', value: '1455022206827364352' },
    { label: 'CMD.P', value: '1395980542276796504' },
    { label: 'Coronel', value: '1395986975814582364' },
    { label: 'Ten-Cel', value: '1395986831941566627' },
    { label: 'Major', value: '1390033256753135647' },
    { label: 'Capitao', value: '1390033256727974059' },
    { label: '1.Ten', value: '1390033256727974058' },
    { label: '2.Ten', value: '1463234639257931846' }
];

const PATENTES_PARTE_2 = [
    { label: 'Aspirante', value: '1463241851321454683' },
    { label: 'Subtenente', value: '1390033256703066159' },
    { label: '1.SGT', value: '1390033256703066158' },
    { label: '2.SGT', value: '1390033256703066157' },
    { label: '3.SGT', value: '1395984627906117647' },
    { label: 'Cabo', value: '1390033256703066153' },
    { label: 'SD.1C', value: '1390033256703066152' },
    { label: 'SD.2C', value: '1395976974190514337' }
];

const ADVERTENCIAS = [
    { label: 'Advertência Verbal', value: '1390033256614854660' },
    { label: 'Advertência 1', value: '1390033256614854659' },
    { label: 'Advertência 2', value: '1390033256614854658' },
];

const ID_CARGO_EXONERADO = '1390033256593887454';
const ID_CARGO_MANTER = '1390033256593887447'; 

// Lista Combinada para cálculo de hierarquia (Do maior para o menor)
const HIERARQUIA_COMPLETA = [...PATENTES_PARTE_1, ...PATENTES_PARTE_2];

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_PAINEL).catch(() => null);
    if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 5 });
    if (msgs.size > 0) await channel.bulkDelete(msgs).catch(()=>{});
    const embed = new EmbedBuilder().setTitle('PAINEL DE RH').setDescription('Gerencie a hierarquia.').setColor(0x2B2D31);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('rh_btn_promover').setLabel('Promover').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId('rh_btn_rebaixar').setLabel('Rebaixar').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('rh_btn_advertir').setLabel('Advertência').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('rh_btn_exonerar').setLabel('Exonerar').setStyle(ButtonStyle.Danger));
    await channel.send({ embeds: [embed], components: [row] });
}

async function gerenciarRH(interaction, client) {
    // 1. CLIQUE NO BOTÃO
    if (interaction.isButton() && interaction.customId.startsWith('rh_btn_')) {
        const acao = interaction.customId.replace('rh_btn_', '');
        const row = new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId(`rh_user_select_${acao}`).setPlaceholder('Selecione o membro...').setMaxValues(1));
        await interaction.reply({ content: `**AÇÃO:** ${acao.toUpperCase()}`, components: [row], ephemeral: true });
    }

    // 2. SELEÇÃO DO USUÁRIO
    if (interaction.isUserSelectMenu() && interaction.customId.startsWith('rh_user_select_')) {
        const acao = interaction.customId.replace('rh_user_select_', '');
        const targetId = interaction.values[0];
        
        if (acao === 'exonerar') {
            const modal = new ModalBuilder().setCustomId(`rh_modal_exon_${targetId}`).setTitle('Motivo');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await interaction.showModal(modal);
            return;
        }
        if (acao === 'advertir') {
            const rowAdv = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`rh_pre_advertir_${targetId}`).setPlaceholder('Nível da Advertência').addOptions(ADVERTENCIAS));
            await interaction.update({ content: `**ADVERTIR** <@${targetId}>`, components: [rowAdv] });
            return;
        }
        if (acao === 'promover' || acao === 'rebaixar') {
            const row1 = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`rh_pre_cargo_${acao}_${targetId}_p1`).setPlaceholder('Patentes Altas').addOptions(PATENTES_PARTE_1));
            const row2 = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`rh_pre_cargo_${acao}_${targetId}_p2`).setPlaceholder('Patentes Baixas').addOptions(PATENTES_PARTE_2));
            await interaction.update({ content: `**${acao.toUpperCase()}** <@${targetId}>\nEscolha o NOVO cargo:`, components: [row1, row2] });
        }
    }

    // 3. SELEÇÃO DO CARGO (Abre Modal)
    if (interaction.isStringSelectMenu()) {
        if (interaction.customId.startsWith('rh_pre_cargo_')) {
            const parts = interaction.customId.split('_'); // rh, pre, cargo, acao, targetId, p1/p2
            const acao = parts[3];
            const targetId = parts[4];
            const novoCargoId = interaction.values[0];

            const modal = new ModalBuilder()
                .setCustomId(`rh_modal_cargo_${acao}_${targetId}_${novoCargoId}`)
                .setTitle(`Motivo da ${acao === 'promover' ? 'Promoção' : 'Rebaixamento'}`);

            const inputMotivo = new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(inputMotivo));
            await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('rh_pre_advertir_')) {
            const targetId = interaction.customId.split('_')[3];
            const roleId = interaction.values[0];
            const modal = new ModalBuilder().setCustomId(`rh_modal_adv_${targetId}_${roleId}`).setTitle('Detalhes');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo').setStyle(TextInputStyle.Paragraph).setRequired(true)), new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tempo').setLabel('Tempo').setStyle(TextInputStyle.Short).setRequired(true)));
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
            if (log) log.send(`**RELATORIO DE ADVERTENCIA**\n\n**Membro:** <@${targetId}>\n**Aplicado por:** <@${interaction.user.id}>\n**Tipo:** <@&${roleId}>\n**Motivo:** ${motivo}\n**Tempo:** ${tempo}`);
            await interaction.editReply('✅ Advertido.');
        }
        
        // --- EXONERAÇÃO ---
        if (interaction.customId.startsWith('rh_modal_exon_')) {
            await interaction.deferReply({ ephemeral: true });
            const targetId = interaction.customId.split('_')[3];
            const motivo = interaction.fields.getTextInputValue('motivo');
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (member) {
                try { await member.roles.set([ID_CARGO_MANTER, ID_CARGO_EXONERADO]); } catch(e){}
            }
            const log = await client.channels.fetch(ID_LOG_EXONERACAO);
            if (log) log.send(`**RELATORIO DE EXONERACAO**\n\n**Exonerado:** <@${targetId}>\n**Responsavel:** <@${interaction.user.id}>\n**Motivo:** ${motivo}`);
            await interaction.editReply('🚫 Exonerado.');
        }

        // --- PROMOÇÃO / REBAIXAMENTO COM LÓGICA HIERÁRQUICA ---
        if (interaction.customId.startsWith('rh_modal_cargo_')) {
            await interaction.deferReply({ ephemeral: true });
            const parts = interaction.customId.split('_'); 
            const acao = parts[3]; // 'promover' ou 'rebaixar'
            const targetId = parts[4];
            const novoCargoId = parts[5];
            const motivo = interaction.fields.getTextInputValue('motivo');

            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            
            // Descobre o ÍNDICE (Ranking) do novo cargo
            // Ex: Coronel = Index 5, Cabo = Index 15
            // Quanto MENOR o número, MAIOR a patente.
            const indexNovoCargo = HIERARQUIA_COMPLETA.findIndex(p => p.value === novoCargoId);

            let cargosRemovidosLog = "Nenhum";

            if (member && indexNovoCargo !== -1) {
                // Filtra os cargos que o usuário tem e que estão na nossa lista de patentes
                const cargosParaRemover = member.roles.cache.filter(role => {
                    const indexCargoAtual = HIERARQUIA_COMPLETA.findIndex(p => p.value === role.id);
                    
                    // Se o cargo do usuário não está na nossa lista, ignora (não remove)
                    if (indexCargoAtual === -1) return false;

                    // LÓGICA DE PROMOÇÃO (UPAMENTO)
                    // Remove apenas se o cargo atual for MENOR (Index Maior) que o novo.
                    // Ex: Novo=Capitão(8). Atual=Cabo(15). 15 > 8 -> Remove Cabo.
                    if (acao === 'promover') {
                        return indexCargoAtual > indexNovoCargo;
                    }

                    // LÓGICA DE REBAIXAMENTO
                    // Remove apenas se o cargo atual for MAIOR (Index Menor) que o novo.
                    // Ex: Novo=Cabo(15). Atual=Capitão(8). 8 < 15 -> Remove Capitão.
                    if (acao === 'rebaixar') {
                        return indexCargoAtual < indexNovoCargo;
                    }

                    return false;
                });

                // Executa a remoção e adição
                if (cargosParaRemover.size > 0) {
                    cargosRemovidosLog = cargosParaRemover.map(r => `<@&${r.id}>`).join(', ');
                    await member.roles.remove(cargosParaRemover).catch(() => console.log("Erro ao remover cargo antigo"));
                }
                await member.roles.add(novoCargoId).catch(() => console.log("Erro ao add novo cargo"));
            }

            // Log
            const log = await client.channels.fetch(acao === 'promover' ? ID_LOG_PROMOCAO : ID_LOG_REBAIXAMENTO);
            if (log) {
                log.send(
                    `**RELATORIO DE ${acao.toUpperCase()}**\n\n` +
                    `**Membro:** <@${targetId}>\n` +
                    `**Responsavel:** <@${interaction.user.id}>\n` +
                    `**Cargo(s) Removido(s):** ${cargosRemovidosLog}\n` +
                    `**Novo Cargo:** <@&${novoCargoId}>\n` +
                    `**Motivo:** ${motivo}`
                );
            }
            await interaction.editReply(`✅ ${acao === 'promover' ? 'Promovido' : 'Rebaixado'} com sucesso.`);
        }
    }
}
module.exports = { enviarPainel, gerenciarRH };