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
const ICON_EMOJI = '<:iconepf:1399436333071728730>'; // ícone da PF

export async function registroHandler(client, interaction) {
    // Abrir modal
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

    // Envio do registro
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'registration_modal') {
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        // Atualiza apelido do usuário
        try {
            await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`);
        } catch (err) {
            console.error('Erro ao mudar apelido:', err);
        }

        // Cria embed com ícones da PF
        const embed = new EmbedBuilder()
            .setTitle(`${ICON_EMOJI} NOVO REGISTRO`)
            .setColor(0xFFD700) // dourado
            .addFields(
                { name: `${ICON_EMOJI} NOME`, value: `<@${interaction.user.id}>`, inline: false },
                { name: `${ICON_EMOJI} LOGIN`, value: login, inline: false },
                { name: `${ICON_EMOJI} ID`, value: idJogo, inline: false },
                { name: `${ICON_EMOJI} TAG`, value: 'DPF - DRP', inline: false }
            )
            .setFooter({ text: 'DPF - DRP' });

        // Envia embed para o canal de informações
        const infoChannel = await client.channels.fetch(USER_INFO_CHANNEL_ID);
        if (infoChannel) await infoChannel.send({ embeds: [embed] });

        // Registra no Google Sheets
        await registrarUsuario(interaction.user.id, nome, idJogo, login);

        // Resposta ephemer
        await interaction.reply({ content: 'Registro realizado com sucesso!', ephemeral: true });
    }
}
