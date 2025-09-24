import { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, InteractionType, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { registrarUsuario } from '../utils/sheets.js';
import { formatTime } from '../utils/format.js';

const PANEL_CHANNEL_ID = '1396852912709308426';
const USER_INFO_CHANNEL_ID = '1390033258821062760';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

export default async function registroHandler(client, interaction) {
    // Botão abrir modal
    if (interaction.isButton() && interaction.customId === 'open_modal') {
        const modal = new ModalBuilder()
            .setCustomId('registration_modal')
            .setTitle('Formulário de Registro');

        modal.addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('nome')
                    .setLabel('Nickname')
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

    // Submissão do modal
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'registration_modal') {
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        try {
            await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`);
        } catch (err) {
            console.error('Erro ao mudar apelido:', err);
        }

        // Enviar embed no canal de informações
        const channel = await client.channels.fetch(USER_INFO_CHANNEL_ID);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FFD700') // dourado
                .setTitle('Novo Registro')
                .setDescription(`${ICON_EMOJI} **Nome:** <@${interaction.user.id}>\n` +
                                `${ICON_EMOJI} **Login:** ${login}\n` +
                                `${ICON_EMOJI} **ID:** ${idJogo}\n` +
                                `${ICON_EMOJI} **TAG:** DPF - DRP`)
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        }

        // Registrar na planilha
        try {
            await registrarUsuario(interaction.user.id, nome, idJogo, login);
        } catch (err) {
            console.error('Erro ao registrar no Google Sheets:', err);
        }

        await interaction.reply({ content: 'Registro realizado com sucesso!', ephemeral: true });
    }
}
