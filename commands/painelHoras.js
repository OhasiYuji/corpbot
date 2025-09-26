import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType,
    EmbedBuilder
} from 'discord.js';
import { getUsuariosTodos, atualizarHorasUsuario, setHorasUsuario, getMetas } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = '1390160577095012433';
const ADMIN_ROLE = '1390033256640024591';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

export async function sendPainelHoras(client) {
    const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!panelChannel) return;

    const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Painel de Horas`)
        .setDescription('Use os botões abaixo para consultar, adicionar, remover ou limpar horas.\nClique em "Up Automático" para verificar metas.')
        .setColor(0x00FF00);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('consultar_horas').setLabel('Consultar Horas').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('adicionar_horas').setLabel('Adicionar Horas').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('remover_horas').setLabel('Remover Horas').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('limpar_horas').setLabel('Limpar Horas').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('up_automatico').setLabel('Up Automático').setStyle(ButtonStyle.Primary)
        );

    await panelChannel.send({ embeds: [embed], components: [row] });
}

export async function painelHorasHandler(client, interaction) {
    if (!interaction.member.roles.cache.has(ADMIN_ROLE)) return;

    if (interaction.isButton()) {
        if (interaction.customId === 'consultar_horas') {
            const usuarios = await getUsuariosTodos();
            if (usuarios.length === 0) return interaction.reply({ content: 'Nenhum usuário registrado', ephemeral: true });

            const description = usuarios.map(u => `${u.nome} → ${u.totalMinutes} minutos`).join('\n');
            await interaction.reply({ embeds: [new EmbedBuilder().setTitle('Horas Registradas').setDescription(description).setColor(0x00FF00)], ephemeral: true });
        }

        if (['adicionar_horas','remover_horas'].includes(interaction.customId)) {
            const modal = new ModalBuilder()
                .setCustomId(interaction.customId)
                .setTitle(interaction.customId === 'adicionar_horas' ? 'Adicionar Horas' : 'Remover Horas');

            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('userId')
                        .setLabel('ID do Discord do Usuário')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('minutos')
                        .setLabel('Minutos')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );
            await interaction.showModal(modal);
        }

        if (interaction.customId === 'limpar_horas') {
            const usuarios = await getUsuariosTodos();
            for (const u of usuarios) await setHorasUsuario(u.userId, 0);
            await interaction.reply({ content: 'Horas limpas para todos os usuários.', ephemeral: true });
        }

        if (interaction.customId === 'up_automatico') {
            const metas = await getMetas();
            const usuarios = await getUsuariosTodos();
            const upUsers = [];

            for (const u of usuarios) {
                const meta = metas.find(m => m.nome === u.nome);
                if (meta && u.totalMinutes >= meta.minutos) upUsers.push(u.nome);
            }

            const msg = upUsers.length > 0 ? `Usuários que cumpriram a meta:\n${upUsers.join('\n')}` : 'Nenhum usuário atingiu a meta.';
            await interaction.reply({ content: msg, ephemeral: true });
        }
    }

    if (interaction.type === InteractionType.ModalSubmit) {
        const userId = interaction.fields.getTextInputValue('userId');
        const minutos = parseInt(interaction.fields.getTextInputValue('minutos'), 10) || 0;
        if (interaction.customId === 'adicionar_horas') {
            await atualizarHorasUsuario(userId, minutos);
            await interaction.reply({ content: `Horas adicionadas: ${minutos} minutos`, ephemeral: true });
        }
        if (interaction.customId === 'remover_horas') {
            await atualizarHorasUsuario(userId, -minutos);
            await interaction.reply({ content: `Horas removidas: ${minutos} minutos`, ephemeral: true });
        }
    }
}
