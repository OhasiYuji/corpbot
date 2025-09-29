import {
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionsBitField,
  InteractionType
} from 'discord.js';

import { getUsuariosTodos } from '../utils/sheets.js';

const FORM_CHANNEL_ID = '1390033258309357577';
const RESPONSES_CHANNEL_ID = '1390033258477125632';
const APPROVED_CHANNEL_ID = '1390033257533542417';
const RECRUITER_ROLE_ID = '1390033256640024594';
const ICON_PF = '<:iconepf:1399436333071728730>';

const QUESTIONS = [
  '1º • Qual sua idade?',
  '2º • Qual o seu id no jogo?',
  '3º • Qual sua intenção em entrar na policia federal?'
  // você pode adicionar as outras perguntas aqui...
];

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

  await channel.send({ embeds: [embed], components: [row] }).catch(console.error);
}

export async function formularioHandler(client, interaction) {
  try {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'start_form') {
      const guild = interaction.guild;

      const channel = await guild.channels.create({
        name: `formulario-${interaction.user.username}`,
        type: 0, // GuildText
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }
        ]
      }).catch(err => {
        console.error('Erro ao criar canal do formulário:', err);
        return null;
      });

      if (!channel) return interaction.reply({ content: 'Não foi possível criar o canal.', ephemeral: true });

      await interaction.reply({ content: `Seu canal de formulário foi criado: ${channel}`, ephemeral: true });

      const responses = [];
      for (const question of QUESTIONS) {
        const embed = new EmbedBuilder()
          .setTitle('Pergunta')
          .setDescription(question)
          .setColor(0xFFD700);

        await channel.send({ embeds: [embed] });

        const filter = m => m.author.id === interaction.user.id;
        const collected = await channel.awaitMessages({ filter, max: 1, time: 600000, errors: ['time'] }).catch(()=>null);

        if (!collected || !collected.first()) continue;
        responses.push({ question, answer: collected.first().content });
      }

      // Enviar respostas no canal de respostas
      const responseChannel = await client.channels.fetch(RESPONSES_CHANNEL_ID).catch(()=>null);
      if (!responseChannel) return channel.send('Não foi possível enviar as respostas.');

      const embedResponses = new EmbedBuilder()
        .setTitle(`Formulário de ${interaction.user.tag}`)
        .setColor(0xFFD700);

      responses.forEach(r => embedResponses.addFields({ name: r.question, value: r.answer }));

      await responseChannel.send({ embeds: [embedResponses] }).catch(console.error);

      channel.send('Formulário enviado! Aguarde a aprovação/reprovação.');

      // Apagar canal após 10s
      setTimeout(() => {
        channel.delete().catch(console.error);
      }, 10000);
    }
  } catch (err) {
    console.error('Erro no formulário:', err);
    try { 
      if (!interaction.replied) await interaction.reply({ content: 'Erro interno ao processar formulário.', ephemeral: true }); 
    } catch {}
  }
}
