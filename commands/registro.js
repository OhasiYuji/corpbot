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
const ICON = '<:Policiafederallogo:1399436333071728730>';

export async function sendRegistroPanel(client) {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(()=>null);
  if (!channel) return;
  const embed = new EmbedBuilder().setTitle(`${ICON} Painel de Registro`).setDescription('Clique para abrir formulário').setColor(0xFFD700);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('open_modal_registro').setLabel('Abrir Formulário').setStyle(ButtonStyle.Secondary)
  );
  await channel.send({ embeds: [embed], components: [row] }).catch(console.error);
}

export async function registroHandler(client, interaction) {
  if (interaction.isButton() && interaction.customId === 'open_modal_registro') {
    const modal = new ModalBuilder().setCustomId('modal_registro').setTitle('Registro');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nickname').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_jogo').setLabel('ID no jogo').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('login').setLabel('Login').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
    return;
  }

  if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
    const nome = interaction.fields.getTextInputValue('nome');
    const idJogo = interaction.fields.getTextInputValue('id_jogo');
    const login = interaction.fields.getTextInputValue('login');

    await registrarUsuario(interaction.user.id, nome, idJogo, login);
    await interaction.reply({ content: 'Registrado com sucesso!', ephemeral: true });
    try { await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`).catch(()=>null); } catch {}
  }
}
