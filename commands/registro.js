// commands/registro.js
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
import { registrarUsuario } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = '1396852912709308426';
const USER_INFO_CHANNEL_ID = '1390033258821062760';
const ICON_EMOJI = '<:iconepf:YOUR_ICON_ID>'; // substitua pelo seu ícone da PF

export async function registroHandler(client, interaction) {
    if (interaction.isButton() && interaction.customId === 'open_modal') {
        const modal = new ModalBuilder()
            .setCustomId('registration_modal')
            .setTitle('Formulário de Registro');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('nome')
                    .setLabel('Nome completo')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('id_jogo')
                    .setLabel('ID no Jogo')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('login')
                    .setLabel('Login')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            )
        );

        await interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'registration_modal') {
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        // Atualiza apelido
        try {
            await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`);
        } catch (err) {
            console.error('Erro ao mudar apelido:', err);
        }

        // Embed bonito
        const embed = new EmbedBuilder()
            .setTitle(`${ICON_EMOJI} Registro Concluído`)
            .setColor(0xFFD700) // dourado
            .addFields(
                { name: 'Nome', value: nome, inline: true },
                { name: 'ID no Jogo', value: idJogo, inline: true },
                { name: 'Login', value: login, inline: true }
            )
            .setFooter({ text: 'DPF - DRP' });

        const infoChannel = await client.channels.fetch(USER_INFO_CHANNEL_ID);
        if (infoChannel) await infoChannel.send({ embeds: [embed] });

        await registrarUsuario(interaction.user.id, nome, idJogo, login);
        await interaction.reply({ content: 'Registro realizado com sucesso!', ephemeral: true });
    }
}
