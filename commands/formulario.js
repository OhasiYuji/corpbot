// commands/formulario.js
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  InteractionType,
  PermissionsBitField
} from 'discord.js';
import { getUsuario } from '../utils/sheets.js';

const FORM_CHANNEL_ID = process.env.FORM_CHANNEL_ID || '1390033258309357577';
const RESPONSES_CHANNEL_ID = process.env.RESPONSES_CHANNEL_ID || '1390033258477125632';
const APPROVED_CHANNEL_ID = process.env.APPROVED_CHANNEL_ID || '1390033257533542417';
const RECRUITER_ROLE_ID = process.env.RECRUITER_ROLE_ID || '1390033256640024594';
const ICON_PF = '<:iconepf:1399436333071728730>';

export async function enviarPainelFormulario(client) {
  const channel = await client.channels.fetch(FORM_CHANNEL_ID).catch(()=>null);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setTitle('Formulário de Recrutamento')
    .setDescription('Clique no botão abaixo para iniciar o formulário.')
    .setColor(0xFFD700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('start_form')
      .setLabel('Realizar Formulário')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
}

export async function formularioHandler(client, interaction) {
  try {
    if (interaction.isButton() && interaction.customId === 'start_form') {
      // Modal para formulário
      const modal = new ModalBuilder()
        .setCustomId('form_modal')
        .setTitle('Formulário de Recrutamento');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('idade')
            .setLabel('Qual sua idade?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('id_jogo')
            .setLabel('Qual seu ID no jogo?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('intencao')
            .setLabel('Qual sua intenção em entrar na corporação?')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'form_modal') {
      await interaction.deferReply({ ephemeral: true });

      // Coleta respostas
      const respostas = {
        idade: interaction.fields.getTextInputValue('idade'),
        id_jogo: interaction.fields.getTextInputValue('id_jogo'),
        intencao: interaction.fields.getTextInputValue('intencao')
      };

      // Cria embed para canal de respostas
      const embed = new EmbedBuilder()
        .setTitle(`Formulário de ${interaction.user.tag}`)
        .setColor(0xFFD700)
        .addFields(
          { name: 'Idade', value: respostas.idade },
          { name: 'ID no jogo', value: respostas.id_jogo },
          { name: 'Intenção', value: respostas.intencao }
        );

      // Botões aprovar/reprovar
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`approve_${interaction.user.id}`)
            .setLabel('Aprovar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`reject_${interaction.user.id}`)
            .setLabel('Reprovar')
            .setStyle(ButtonStyle.Danger)
        );

      const responseChannel = await client.channels.fetch(RESPONSES_CHANNEL_ID);
      await responseChannel.send({ embeds: [embed], components: [row] });

      await interaction.editReply({ content: 'Formulário enviado! Aguarde a aprovação.' });
    }

    // Aprovar/Reprovar
    if (interaction.isButton()) {
      if (!interaction.customId.startsWith('approve_') && !interaction.customId.startsWith('reject_')) return;
      if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID)) {
        return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true });
      }

      const targetId = interaction.customId.split('_')[1];
      const member = await interaction.guild.members.fetch(targetId).catch(()=>null);
      if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });

      const approvedChannel = await client.channels.fetch(APPROVED_CHANNEL_ID);

      if (interaction.customId.startsWith('approve_')) {
        await interaction.update({ content: 'Aprovado!', components: [], embeds: [] });
        await approvedChannel.send({
          content: `<@${member.id}>`,
          embeds: [
            new EmbedBuilder()
              .setTitle(`${ICON_PF} Formulário Aprovado`)
              .setDescription(`Parabéns <@${member.id}>, você foi aprovado!`)
              .setColor(0x00FF00)
          ]
        });
      } else if (interaction.customId.startsWith('reject_')) {
        await interaction.update({ content: 'Reprovado!', components: [], embeds: [] });
        await approvedChannel.send({
          content: `<@${member.id}>`,
          embeds: [
            new EmbedBuilder()
              .setTitle(`${ICON_PF} Formulário Reprovado`)
              .setDescription(`Olá <@${member.id}>, infelizmente suas respostas não foram suficientes.`)
              .setColor(0xFF0000)
          ]
        });
      }
    }
  } catch (err) {
    console.error('Erro no formularioHandler:', err);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Erro ao processar o formulário.', ephemeral: true });
      }
    } catch {}
  }
}
