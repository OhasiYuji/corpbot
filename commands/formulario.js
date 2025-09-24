// commands/formulario.js
import {
    Client,
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

const FORM_CHANNEL_ID = '1390033258309357577'; // canal para enviar painel de formulário
const RESPONSES_CHANNEL_ID = '1390033258477125632'; // canal para respostas
const APPROVED_CHANNEL_ID = '1390033258309357578'; // canal de mensagem final se aprovado/reprovado
const FORM_CATEGORY_ID = '1390033258309357576'; // categoria para criar canais de formulário
const RECRUITER_ROLE_ID = '1390033256640024594'; // só quem tem esse cargo pode aprovar/reprovar
const APPROVED_ROLES = [
    '1390033256652476596',
    '1390033256652476595',
    '1390033256652476594',
    '1390033256652476592'
];

const QUESTIONS = [
    '1º • Qual sua idade?',
    '2º • Quanto tempo de RP?',
    '3º • Qual sua intenção em entrar na policia federal?',
    '4º • O que é RP e ANTI-RP?',
    '5º • O que é RDM e VDM?',
    '6º • O que é ter amor a vida?',
    '7º • O que é car jacking?',
    '8º • O que é ninja jacking?',
    '9º • O que é DarkRP?',
    '10º • O que são áreas verdes, neutras e vermelhas?',
    '11º • Qual patente mínima necessária para iniciar uma patrulha?',
    '12º • Quantos policiais são necessários para iniciar a patrulha?',
    '13º • Quando é permitido atirar em uma perseguição?',
    '14º • Como deve ser a conduta de abordagem?',
    '15º • Qual o máximo de artigos que uma pessoa pode ser presa?',
    '16º • Você pode abordar trabalhador? Se sim, quando?',
    '17º • Quando deve ser usado o taser?',
    '18º • Como deve ser o nome à paisana e o nome em patrulha?',
    '19º • Pode prender morto? Se sim, quando?'
];

export async function enviarPainelFormulario(client) {
    const channel = await client.channels.fetch(FORM_CHANNEL_ID);
    if (!channel) return console.log('Canal de formulário não encontrado');

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
        if (interaction.isButton()) {
            // Iniciar formulário
            if (interaction.customId === 'start_form') {
                const guild = interaction.guild;

                // Criar canal temporário para o usuário
                const channel = await guild.channels.create({
                    name: `formulario-${interaction.user.username}`,
                    type: 0, // GuildText
                    parent: FORM_CATEGORY_ID,
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
                });

                await interaction.reply({ content: `Seu canal de formulário foi criado: ${channel}`, ephemeral: true });

                // Enviar perguntas no canal criado
                const responses = [];
                for (const question of QUESTIONS) {
                    const embed = new EmbedBuilder()
                        .setTitle('Pergunta')
                        .setDescription(question)
                        .setColor(0xFFD700);
                    await channel.send({ embeds: [embed] });

                    // Esperar resposta do usuário
                    const filter = m => m.author.id === interaction.user.id;
                    const collected = await channel.awaitMessages({ filter, max: 1, time: 600000, errors: ['time'] });
                    const answer = collected.first().content;
                    responses.push({ question, answer });
                }

                // Enviar respostas no canal de respostas
                const embedResponses = new EmbedBuilder()
                    .setTitle(`Formulário de ${interaction.user.tag}`)
                    .setColor(0xFFD700);

                responses.forEach((resp, i) => {
                    embedResponses.addFields({ name: resp.question, value: resp.answer });
                });

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
                const responseMessage = await responseChannel.send({ embeds: [embedResponses], components: [row] });

                await channel.send('Formulário enviado! Aguarde a aprovação/reprovação.');
            }

            // Aprovar
            if (interaction.customId.startsWith('approve_')) {
                if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID)) {
                    return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true });
                }

                const targetUserId = interaction.customId.split('_')[1];
                const member = await interaction.guild.members.fetch(targetUserId);
                if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });

                for (const roleId of APPROVED_ROLES) {
                    await member.roles.add(roleId).catch(console.error);
                }

                await interaction.update({ content: 'Aprovado!', components: [], embeds: [] });

                const approvedChannel = await client.channels.fetch(APPROVED_CHANNEL_ID);
                const embedApproved = new EmbedBuilder()
                    .setTitle('Formulário Aprovado ✅')
                    .setDescription(`${member} foi aprovado. Pode se registrar.`)
                    .setColor(0x00FF00);

                await approvedChannel.send({ embeds: [embedApproved] });
            }

            // Reprovar
            if (interaction.customId.startsWith('reject_')) {
                if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID)) {
                    return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true });
                }

                const targetUserId = interaction.customId.split('_')[1];
                const member = await interaction.guild.members.fetch(targetUserId);
                if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });

                // Abrir modal para motivo
                const modal = new ModalBuilder()
                    .setCustomId(`reject_reason_${targetUserId}`)
                    .setTitle('Motivo da Reprovação');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('reason')
                            .setLabel('Digite o motivo')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

                await interaction.showModal(modal);
            }
        }

        // Receber motivo de reprovação
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('reject_reason_')) {
            const targetUserId = interaction.customId.split('_')[2];
            const reason = interaction.fields.getTextInputValue('reason');

            const member = await interaction.guild.members.fetch(targetUserId);
            if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });

            await interaction.reply({ content: 'Reprovação registrada!', ephemeral: true });

            const approvedChannel = await client.channels.fetch(APPROVED_CHANNEL_ID);
            const embedReject = new EmbedBuilder()
                .setTitle('Formulário Reprovado ❌')
                .setDescription(`${member} foi reprovado.\nMotivo: ${reason}`)
                .setColor(0xFF0000);

            await approvedChannel.send({ embeds: [embedReject] });
        }

    } catch (err) {
        console.error('Erro ao processar interação:', err);
    }
}
