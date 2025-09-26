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

const PANEL_CHANNEL_ID = process.env.REGISTER_PANEL_CHANNEL_ID || '1396852912709308426';
const USER_INFO_CHANNEL_ID = process.env.USER_INFO_CHANNEL_ID || '1390033258821062760';
const ICON = '<:Policiafederallogo:1399436333071728730>';

export async function sendRegistroPanel(client) {
  const channel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle(`${ICON} Painel de Registro`)
    .setDescription('Clique para abrir o formulário de registro')
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
    // Abrir modal
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

    // Processar submissão do modal
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_registro') {
      await interaction.deferReply({ ephemeral: true });

      const nome = interaction.fields.getTextInputValue('nome');
      const idJogo = interaction.fields.getTextInputValue('id_jogo');
      const login = interaction.fields.getTextInputValue('login');

      // 1️⃣ Registrar na planilha
      await registrarUsuario(interaction.user.id, nome, idJogo, login);

      // 2️⃣ Alterar nickname
      try {
        await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`).catch(() => null);
      } catch {}

      // 3️⃣ Enviar mensagem no canal de informações
      const infoChannel = await client.channels.fetch(USER_INFO_CHANNEL_ID).catch(() => null);
      if (infoChannel) {
        const embed = new EmbedBuilder()
          .setTitle(`${ICON} Novo Registro`)
          .setDescription(`Usuário registrado: <@${interaction.user.id}>`)
          .addFields(
            { name: 'Nickname', value: nome, inline: true },
            { name: 'ID no Jogo', value: idJogo, inline: true },
            { name: 'Login', value: login, inline: true }
          )
          .setColor(0x00FF00);

        await infoChannel.send({ embeds: [embed] }).catch(console.error);
      }

      return interaction.editReply({ content: 'Registro realizado com sucesso!' });
    }

  } catch (err) {
    console.error('registroHandler error:', err);
    try {
      if (interaction.deferred || interaction.replied) return interaction.editReply({ content: 'Erro no registro.' });
      return interaction.reply({ content: 'Erro no registro.', ephemeral: true });
    } catch (e) { console.error(e); }
  }
}
