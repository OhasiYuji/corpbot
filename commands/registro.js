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

const PANEL_CHANNEL_ID = process.env.REGISTER_PANEL_CHANNEL_ID || '1396852912709308426';
const ICON = '<:Policiafederallogo:1399436333071728730>';

export async function sendRegistroPanel(client) {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;
  
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
        await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`).catch(() => null);
      } catch {}

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
