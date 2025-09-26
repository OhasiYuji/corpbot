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

// Envia painel de registro
export async function sendRegistroPanel(client) {
    const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!panelChannel) return console.error('Canal do painel não encontrado');

    const embed = new EmbedBuilder()
        .setTitle(`${ICON_EMOJI} Painel de Registro`)
        .setDescription('Clique no botão abaixo para abrir o formulário de registro.')
        .setColor(0xFFD700)
        .setFooter({ text: 'DPF - DRP' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_modal')
            .setLabel('Abrir Formulário')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📝')
    );

    await panelChannel.send({ embeds: [embed], components: [row] });
}

// Handler de interações
export async function registroHandler(client, interaction) {
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
        return;
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'registration_modal') {
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        try {
            await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`);
        } catch (err) {
            console.error('Erro ao mudar apelido:', err);
        }

        const embed = new EmbedBuilder()
            .setTitle(`${ICON_EMOJI} NOVO REGISTRO`)
            .setColor(0xFFD700)
            .addFields(
                { name: `${ICON_EMOJI} NOME`, value: `<@${interaction.user.id}>`, inline: false },
                { name: `${ICON_EMOJI} LOGIN`, value: login, inline: false },
                { name: `${ICON_EMOJI} ID`, value: idJogo, inline: false },
                { name: `${ICON_EMOJI} TAG`, value: 'DPF - DRP', inline: false }
            )
            .setFooter({ text: 'DPF - DRP' });

        const infoChannel = await client.channels.fetch(USER_INFO_CHANNEL_ID);
        if (infoChannel) await infoChannel.send({ embeds: [embed] });

        // Registrar usuário na planilha
        await registrarUsuario(interaction.user.id, nome, idJogo, login);

        await interaction.reply({ content: 'Registro realizado com sucesso!', ephemeral: true });
    }
}
