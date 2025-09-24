// commands/formulario.js
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder,
    InteractionType,
    PermissionsBitField
} from 'discord.js';

const FORM_CHANNEL = '1390033258309357577'; // canal do painel do formulário
const RESPONSES_CHANNEL = '1390033258477125632'; // canal onde respostas vão
const FINAL_CHANNEL = '1390033258309357578'; // canal final para aprovado/reprovado
const FORM_CATEGORY = '1390033258309357576'; // categoria para criar canal privado
const RECRUITER_ROLE = '1390033256640024594'; // cargo que pode aprovar/reprovar

const APPROVED_ROLES = [
    '1390033256652476596',
    '1390033256652476595',
    '1390033256652476594',
    '1390033256652476592'
];

const questions = [
    'Qual sua idade?',
    'Quanto tempo de RP?',
    'Qual sua intenção em entrar na policia federal?',
    'O que é RP e ANTI-RP?',
    'O que é RDM e VDM?',
    'O que é ter amor a vida?',
    'O que é car jacking?',
    'O que é ninja jacking?',
    'O que é DarkRP?',
    'O que são áreas verdes, neutras e vermelhas?',
    'Qual patente mínima necessária para iniciar uma patrulha?',
    'Quantos policiais são necessários para iniciar a patrulha?',
    'Quando é permitido atirar em uma perseguição?',
    'Como deve ser a conduta de abordagem?',
    'Qual o máximo de artigos que uma pessoa pode ser presa?',
    'Você pode abordar trabalhador? se sim, quando?',
    'Quando deve ser usado o taser?',
    'Como deve ser o nome à paisana e o nome em patrulha?',
    'Pode prender morto? se sim, quando?'
];

// Envia o painel inicial com botão para realizar formulário
export async function enviarPainelFormulario(client) {
    const channel = await client.channels.fetch(FORM_CHANNEL);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('📝 Formulário de Recrutamento')
        .setDescription('Clique no botão abaixo para iniciar seu formulário.')
        .setColor(0xFFD700);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('start_form')
            .setLabel('Realizar Formulário')
            .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// Handler principal do formulário
export async function formularioHandler(client, interaction) {
    try {
        // INÍCIO DO FORMULÁRIO
        if (interaction.isButton() && interaction.customId === 'start_form') {
            const guild = interaction.guild;
            const userId = interaction.user.id;

            // Cria canal privado na categoria
            const privateChannel = await guild.channels.create({
                name: `form-${interaction.user.username}`,
                type: 0, // GUILD_TEXT
                parent: FORM_CATEGORY,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: userId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: RECRUITER_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            await interaction.reply({ content: `Canal criado: ${privateChannel}`, ephemeral: true });

            // Armazena respostas
            const responses = [];

            // Função recursiva para enviar perguntas
            const askQuestion = async (i) => {
                if (i >= questions.length) {
                    // Formulário finalizado
                    const embed = new EmbedBuilder()
                        .setTitle(`📋 Formulário de ${interaction.user.tag}`)
                        .setColor(0xFFD700);

                    questions.forEach((q, idx) => {
                        embed.addFields({ name: q, value: responses[idx] || 'Não respondido', inline: false });
                    });

                    const respChannel = await client.channels.fetch(RESPONSES_CHANNEL);
                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`approve_${userId}`)
                            .setLabel('Aprovar')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`reject_${userId}`)
                            .setLabel('Reprovar')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await respChannel.send({ embeds: [embed], components: [row] });
                    await privateChannel.send('Formulário finalizado! Aguarde avaliação.');
                    return;
                }

                // Envia a pergunta como embed no canal privado
                const questionEmbed = new EmbedBuilder()
                    .setTitle(`Pergunta ${i + 1}`)
                    .setDescription(questions[i])
                    .setColor(0xFFD700);

                const modal = new ModalBuilder()
                    .setCustomId(`form_question_${i}`)
                    .setTitle(`Pergunta ${i + 1}`);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('answer')
                            .setLabel(questions[i])
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

                await privateChannel.send({ embeds: [questionEmbed] });
                await interaction.showModal(modal);
            };

            return askQuestion(0);
        }

        // MODAL SUBMIT - resposta das perguntas
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('form_question_')) {
            const i = parseInt(interaction.customId.split('_').pop());
            const answer = interaction.fields.getTextInputValue('answer');
            if (!interaction.responses) interaction.responses = [];
            interaction.responses[i] = answer;

            // Próxima pergunta ou finalização
            const nextIndex = i + 1;
            if (nextIndex < questions.length) {
                const modal = new ModalBuilder()
                    .setCustomId(`form_question_${nextIndex}`)
                    .setTitle(`Pergunta ${nextIndex + 1}`);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('answer')
                            .setLabel(questions[nextIndex])
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

                await interaction.showModal(modal);
            } else {
                // Formulário finalizado
                const embed = new EmbedBuilder()
                    .setTitle(`📋 Formulário de ${interaction.user.tag}`)
                    .setColor(0xFFD700);

                interaction.responses.forEach((r, idx) => {
                    embed.addFields({ name: questions[idx], value: r || 'Não respondido', inline: false });
                });

                const respChannel = await client.channels.fetch(RESPONSES_CHANNEL);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`approve_${interaction.user.id}`)
                        .setLabel('Aprovar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reject_${interaction.user.id}`)
                        .setLabel('Reprovar')
                        .setStyle(ButtonStyle.Danger)
                );

                await respChannel.send({ embeds: [embed], components: [row] });
                await interaction.reply({ content: 'Formulário enviado com sucesso!', ephemeral: true });
            }
        }

        // BOTÕES de Aprovar/Reprovar
        if (interaction.isButton() && (interaction.customId.startsWith('approve_') || interaction.customId.startsWith('reject_'))) {
            const [action, targetUserId] = interaction.customId.split('_');
            if (!interaction.member.roles.cache.has(RECRUITER_ROLE))
                return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true });

            const guild = interaction.guild;
            const member = await guild.members.fetch(targetUserId).catch(() => null);
            if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });

            if (action === 'approve') {
                for (const roleId of APPROVED_ROLES) {
                    await member.roles.add(roleId).catch(console.error);
                }

                const embed = new EmbedBuilder()
                    .setTitle('✅ Formulário aprovado!')
                    .setDescription(`${member} aprovado! Pode se registrar.`)
                    .setColor(0x00FF00);

                const finalChannel = await client.channels.fetch(FINAL_CHANNEL);
                await finalChannel.send({ embeds: [embed] });
                await interaction.reply({ content: 'Usuário aprovado com sucesso!', ephemeral: true });

            } else if (action === 'reject') {
                // Modal para motivo da reprovação
                const modal = new ModalBuilder()
                    .setCustomId(`reject_reason_${targetUserId}`)
                    .setTitle('Motivo da Reprovação');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('reason')
                            .setLabel('Motivo da reprovação')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );

                await interaction.showModal(modal);
            }
        }

        // Modal submit do motivo de reprovação
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('reject_reason_')) {
            const targetUserId = interaction.customId.split('_').pop();
            const reason = interaction.fields.getTextInputValue('reason');

            const embed = new EmbedBuilder()
                .setTitle('❌ Formulário reprovado')
                .setDescription(`Usuário: <@${targetUserId}>\nMotivo: ${reason}`)
                .setColor(0xFF0000);

            const finalChannel = await interaction.client.channels.fetch(FINAL_CHANNEL);
            await finalChannel.send({ embeds: [embed] });
            await interaction.reply({ content: 'Usuário reprovado com sucesso!', ephemeral: true });
        }

    } catch (err) {
        console.error('Erro ao processar interação:', err);
    }
}
