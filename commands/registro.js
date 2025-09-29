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
const LOG_CHANNEL_ID = '1390033258821062760'; // Canal que recebe a notificação de registro
const ICON = '<:Policiafederallogo:1399436333071728730>';
const ICON_PF = '<:iconepf:1399436333071728730>'; // Assumindo este é o ícone da PF que você está usando

/**
 * Envia o painel inicial de registro, limpando o canal antes para evitar duplicidade.
 */
export async function sendRegistroPanel(client) {
    const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
    if (!channel) return;
    
    // Limpa o canal antes de enviar o painel
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
 * Envia uma mensagem de log formatada para o canal de LOG (1390033258821062760).
 */
async function sendRegistroLog(client, user, nome, idJogo, login) {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    if (!logChannel) return;

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
            // Deferir para evitar timeout durante o processo de registro
            await interaction.deferReply({ ephemeral: true });

            const nome = interaction.fields.getTextInputValue('nome');
            const idJogo = interaction.fields.getTextInputValue('id_jogo');
            const login = interaction.fields.getTextInputValue('login');

            const result = await registrarUsuario(interaction.user.id, nome, idJogo, login);
            
            if (!result) {
                // Usuário já registrado
                return interaction.editReply({ content: 'Você já está registrado.' });
            }

            try {
                // Tenta definir o apelido do usuário
                await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`).catch(() => null);
            } catch {}

            // Envio do log formatado
            await sendRegistroLog(client, interaction.user, nome, idJogo, login); 

            return interaction.editReply({ content: 'Registro realizado com sucesso! ✅' });
        }
    } catch (err) {
        console.error('registroHandler error:', err);
        
        // Tratamento de erro robusto após deferReply
        try {
            if (interaction.deferred || interaction.replied) {
                // Tenta usar followUp se o defer foi feito mas editReply falhou
                return interaction.followUp({ content: 'Erro no registro. Tente novamente.', ephemeral: true });
            }
            // Caso não tenha conseguido nem deferir (geralmente timeout)
            return interaction.reply({ content: 'Erro no registro.', ephemeral: true });
        } catch (e) {
            console.error('Erro ao lidar com a exceção:', e);
        }
    }
}