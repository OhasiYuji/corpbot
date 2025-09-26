import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, InteractionType } from 'discord.js';
import { atualizarHorasUsuario, getUsuario, getCargos } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = '1390160577095012433'; // canal atualizado
const UPAMENTO_CHANNEL_ID = '1390033257533542417';
const ADMIN_ROLE_ID = '1390033256640024591'; // só quem tem esse cargo pode interagir
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

export async function sendPainelHoras(client) {
    const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!panelChannel) return;

    const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Painel de Controle de Horas`)
        .setDescription('Selecione uma ação usando os botões abaixo:')
        .setColor(0xFFD700);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('consultar_horas').setLabel('Consultar Horas').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('adicionar_horas').setLabel('Adicionar Horas').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('remover_horas').setLabel('Remover Horas').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('limpar_horas').setLabel('Limpar Horas').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('upamento_meta').setLabel('Upamento Automático').setStyle(ButtonStyle.Primary)
    );

    await panelChannel.send({ embeds: [embed], components: [row] });
}

// Handler de interações
export async function painelHorasHandler(client, interaction) {
    if (!interaction.isButton()) return;

    // Verifica permissão de cargo
    if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
        await interaction.reply({ content: '❌ Você não tem permissão para interagir com este painel.', ephemeral: true });
        return;
    }

    switch(interaction.customId) {

        case 'consultar_horas': {
            const usuarios = await fetchUsuarios();
            const description = usuarios.map(u => `<@${u.userId}> → ${u.totalMinutes} min`).join('\n') || 'Nenhum usuário registrado';
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('Horas dos Usuários').setDescription(description).setColor(0x00FF00)], ephemeral: true });
            break;
        }

        case 'adicionar_horas':
        case 'remover_horas': {
            const modal = new ModalBuilder()
                .setCustomId(interaction.customId === 'adicionar_horas' ? 'modal_add' : 'modal_remove')
                .setTitle(interaction.customId === 'adicionar_horas' ? 'Adicionar Horas' : 'Remover Horas');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('user_id')
                        .setLabel('ID do Usuário')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('minutes')
                        .setLabel('Minutos')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );

            await interaction.showModal(modal);
            break;
        }

        case 'limpar_horas': {
            const usuarios = await fetchUsuarios();
            for (const u of usuarios) {
                await atualizarHorasUsuario(u.userId, -u.totalMinutes); // zera tudo
            }
            await interaction.reply({ content: '✅ Horas de todos os usuários foram zeradas.', ephemeral: true });
            break;
        }

        case 'upamento_meta': {
            const usuarios = await fetchUsuarios();
            const cargos = await getCargos();
            const guild = interaction.guild;
            let promoted = [];

            for (const u of usuarios) {
                const eligibles = cargos.filter(c => u.totalMinutes >= c.minutes);
                if (eligibles.length) {
                    const newRank = eligibles.sort((a,b)=>b.minutes-a.minutes)[0];
                    const member = await guild.members.fetch(u.userId);
                    if (!member.roles.cache.has(newRank.roleId)) {
                        const allRoleIds = cargos.map(c => c.roleId).filter(Boolean);
                        const toRemove = allRoleIds.filter(id => member.roles.cache.has(id));
                        if (toRemove.length) await member.roles.remove(toRemove).catch(console.error);
                        await member.roles.add(newRank.roleId).catch(console.error);
                        promoted.push({ member, oldRoles: toRemove, newRole: newRank });
                    }
                }
            }

            const upChannel = await client.channels.fetch(UPAMENTO_CHANNEL_ID);
            if (upChannel) {
                for (const p of promoted) {
                    await upChannel.send(
                        `DPF - UPAMENTO ${ICON_EMOJI}\n\n` +
                        `Membro: <@${p.member.id}>\n` +
                        `Cargo antigo: ${p.oldRoles.map(r => `<@&${r}>`).join(', ') || 'Nenhum'}\n` +
                        `Novo cargo: <@&${p.newRole.roleId}>\n` +
                        `Motivo: Bate-ponto atingiu ${p.member.totalMinutes} minutos`
                    );
                }
            }

            await interaction.reply({ content: `✅ Upamento automático concluído. ${promoted.length} membro(s) promovido(s).`, ephemeral: true });
            break;
        }

    }
}

// Auxiliar para buscar todos os usuários
async function fetchUsuarios() {
    const res = await getUsuario(); // ajuste no sheets.js para retornar todos
    return res || [];
}
