import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField,
} from 'discord.js';

const FORM_CHANNEL_ID = '1390033258309357577';
const FORM_CATEGORY_ID = '1390033258309357576';
const RESPONSE_CHANNEL_ID = '1390033258477125632';
const APPROVED_CHANNEL = '1390033258309357578';
const EDITOR_ROLE_ID = '1390033256640024594';
const ICON_EMOJI = '<:iconepf:1399436333071728730>';

const QUESTIONS = [
    '1º • Qual sua idade?',
    '2º • Quanto tempo de rp?',
    '3º • Qual sua intenção em entrar na policia federal?',
    '4º • O que é RP e ANTI-RP?',
    '5º • O que é RDM e VDM?',
    '6º • O que é ter amor a vida?',
    '7º • O que é car jacking?',
    '8º • O que é ninja jacking?',
    '9º • O que é DarkRP?',
    '10º • O que são áreas verdes, neutras e vermelhas?',
    '11º • Qual patente mínima nececssária para iniciar uma patrulha?',
    '12º • Quantos policiais são necessários para iniciar a patrulha?',
    '13º • Quando é permitido atirar em uma perseguição?',
    '14º • Como deve ser a conduta de abordagem?',
    '15º • Qual o máximo de artigos que uma pessoa pode ser presa?',
    '16º • Você pode abordar trabalhador? se sim, quando?',
    '17º • Quando deve ser usado o taser?',
    '18º • Como deve ser o nome apaisana e o nome em patrulha?',
    '19º • Pode prender morto? se sim, quando?'
];

const userForms = new Map(); // track users filling form

export async function formularioHandler(client, interaction) {
    // Botão inicial "Realizar Formulário"
    if (interaction.isButton() && interaction.customId === 'start_form') {
        const guild = interaction.guild;

        // Criar canal privado
        const channel = await guild.channels.create({
            name: `formulario-${interaction.user.username}`,
            type: 0, // GUILD_TEXT
            parent: FORM_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: guild.roles.everyone,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
            ],
        });

        userForms.set(interaction.user.id, { channel, answers: [], questionIndex: 0 });

        await channel.send(`Olá <@${interaction.user.id}>! Vamos começar o formulário.`);
        await channel.send(QUESTIONS[0]);
        await interaction.reply({ content: `Canal criado para o formulário: ${channel}`, ephemeral: true });
    }

    // Receber mensagens no canal do formulário
    if (interaction.isMessage()) {
        const formData = userForms.get(interaction.user.id);
        if (!formData || interaction.channel.id !== formData.channel.id) return;

        // Salvar resposta
        formData.answers.push(interaction.content);
        formData.questionIndex++;

        if (formData.questionIndex < QUESTIONS.length) {
            // Próxima pergunta
            await interaction.channel.send(QUESTIONS[formData.questionIndex]);
        } else {
            // Finalizar formulário
            const embed = new EmbedBuilder()
                .setTitle(`${ICON_EMOJI} Novo Formulário`)
                .setColor(0xFFD700)
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() });

            QUESTIONS.forEach((q, i) => {
                embed.addFields({ name: q, value: formData.answers[i], inline: false });
            });

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

            const responseChannel = await client.channels.fetch(RESPONSE_CHANNEL_ID);
            if (responseChannel) await responseChannel.send({ embeds: [embed], components: [row] });

            await interaction.channel.send('Formulário finalizado! Aguarde avaliação.');
            userForms.delete(interaction.user.id);
        }
    }

    // Aprovação/Reprovação
    if (interaction.isButton()) {
        const [action, userId] = interaction.customId.split('_');
        const member = await interaction.guild.members.fetch(userId);

        if (!interaction.member.roles.cache.has(EDITOR_ROLE_ID))
            return interaction.reply({ content: 'Você não tem permissão!', ephemeral: true });

        if (action === 'approve') {
            // Adicionar cargos
            await member.roles.add([
                '1390033256652476596',
                '1390033256652476595',
                '1390033256652476594',
                '1390033256652476592'
            ]);

            // Embed aprovado
            const embed = new EmbedBuilder()
                .setTitle(`${ICON_EMOJI} Formulário Aprovado`)
                .setColor(0x00FF00)
                .setDescription(`Parabéns <@${userId}>! Você foi aprovado. Pode prosseguir com o registro.`);

            const aprovadoChannel = await interaction.guild.channels.fetch(APPROVED_CHANNEL);
            if (aprovadoChannel) await aprovadoChannel.send({ embeds: [embed] });

            await interaction.update({ content: 'Formulário aprovado!', components: [] });
        }

        if (action === 'reject') {
            // Solicitar motivo
            await interaction.reply({ content: 'Digite o motivo da reprovação:', ephemeral: true });

            const filter = m => m.author.id === interaction.user.id;
            const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 60000 });

            collector.on('collect', async msg => {
                const motivo = msg.content;

                const embed = new EmbedBuilder()
                    .setTitle(`${ICON_EMOJI} Formulário Reprovado`)
                    .setColor(0xFF0000)
                    .setDescription(`O usuário <@${userId}> foi reprovado.`)
                    .addFields({ name: 'Motivo', value: motivo });

                const aprovadoChannel = await interaction.guild.channels.fetch(APPROVED_CHANNEL);
                if (aprovadoChannel) await aprovadoChannel.send({ embeds: [embed] });

                await interaction.followUp({ content: 'Formulário reprovado e motivo enviado!', ephemeral: true });
                await interaction.message.delete();
            });
        }
    }
}
