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

// Constantes
const PANEL_CHANNEL_ID = process.env.REGISTER_PANEL_CHANNEL_ID || '1396852912709308426';
const LOG_CHANNEL_ID = '1390033258821062760'; // 👈 NOVO CANAL DE LOG
const ICON = '<:Policiafederallogo:1399436333071728730>';
const ICON_PF = '<:iconepf:1399436333071728730>'; // Assumindo este é o ícone da PF que você mencionou no formulário.js

/**
 * Envia o painel inicial de registro.
 *
 * NOTA: Assim como no formulario.js, se você não quer que o painel seja reenviado a cada reinício,
 * adicione uma lógica de limpeza de canal ou verifique se a mensagem já existe.
 */
export async function sendRegistroPanel(client) {
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
    if (!channel) return;
    
    // Opcional: Adicionar lógica para limpar o canal antes de enviar
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        await channel.bulkDelete(messages, true).catch(() => {});
    } catch (e) {
        console.error('Não foi possível limpar o canal de registro:', e);
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`${ICON} Painel de Registro`)
        .setDescription('Clique no botão abaixo para abrir o formulário.')
        .setColor(0xFFD700);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_modal_registro')
            .setLabel('Abrir Formulário')
            .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [embed], components: [row] }).catch(console.error);
}

/**
 * Envia uma mensagem de log formatada para o canal de LOG.
 */
async function sendRegistroLog(client, user, nome, idJogo, login) {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) return;

    // A TAG padrão que você especificou
    const tag = "DPF - DRP"; 

    // Mensagem formatada exatamente como você pediu
    const logMessage = 
        `${ICON_PF} **NOME:** <@${user.id}>\n` +
        `${ICON_PF} **NICKNAME:** ${nome}\n` +
        `${ICON_PF} **LOGIN:** ${login}\n` +
        `${ICON_PF} **ID:** ${idJogo}\n` +
        `${ICON_PF} **TAG:** ${tag}`;
    
    logChannel.send({ content: logMessage }).catch(console.error);
}


/**
 * Lida com as interações do registro (botão e envio do modal).
 */
export async function registroHandler(client, interaction) {
    try {
        if (interaction.isButton() && interaction.customId === 'open_modal_registro') {
            const modal = new ModalBuilder()
                .setCustomId('modal_registro')
                .setTitle('Registro');

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
                        .setLabel('ID no jogo')
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

            return interaction.showModal(modal);
        }

        if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
            await interaction.deferReply({ ephemeral: true });

            const nome = interaction.fields.getTextInputValue('nome');
            const idJogo = interaction.fields.getTextInputValue('id_jogo');
            const login = interaction.fields.getTextInputValue('login');

            const result = await registrarUsuario(interaction.user.id, nome, idJogo, login);
            if (!result) return interaction.editReply({ content: 'Você já está registrado.' });

            try {
                // Tenta definir o apelido do usuário
                await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`).catch(() => null);
            } catch {}

            // CHAMA A FUNÇÃO DE LOG APÓS O REGISTRO BEM-SUCEDIDO
            await sendRegistroLog(client, interaction.user, nome, idJogo, login); 

            return interaction.editReply({ content: 'Registro realizado com sucesso! ✅' });
        }
    } catch (err) {
        console.error('registroHandler error:', err);
        try {
            if (interaction.deferred || interaction.replied) return interaction.editReply({ content: 'Erro no registro.' });
            return interaction.reply({ content: 'Erro no registro.', ephemeral: true });
        } catch (e) {
            console.error(e);
        }
    }
}