import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    TextInputBuilder,
    TextInputStyle,
    ModalBuilder,
    InteractionType,
    PermissionFlagsBits
} from 'discord.js';

const FORM_PANEL_CHANNEL_ID = '1390033258309357577'; // canal para enviar o painel
const FORM_RESPONSES_CHANNEL_ID = '1390033258477125632'; // canal para respostas
const APPROVAL_LOG_CHANNEL_ID = '1390033258309357578'; // canal de mensagens finais
const RECRUITER_ROLE_ID = '1390033256640024594'; // cargo que pode aprovar/reprovar
const FORM_CATEGORY_ID = '1390033258309357576'; // categoria para criar canal privado

const APPROVED_ROLES = [
    '1390033256652476596',
    '1390033256652476595',
    '1390033256652476594',
    '1390033256652476592'
];

const questions = [
    "Qual sua idade?",
    "Quanto tempo de rp?",
    "Qual sua intenção em entrar na policia federal?",
    "O que é RP e ANTI-RP?",
    "O que é RDM e VDM?",
    "O que é ter amor a vida?",
    "O que é car jacking?",
    "O que é ninja jacking?",
    "O que é DarkRP?",
    "O que são áreas verdes, neutras e vermelhas?",
    "Qual patente mínima nececssária para iniciar uma patrulha?",
    "Quantos policiais são necessários para iniciar a patrulha?",
    "Quando é permitido atirar em uma perseguição?",
    "Como deve ser a conduta de abordagem?",
    "Qual o máximo de artigos que uma pessoa pode ser presa?",
    "Você pode abordar trabalhador? se sim, quando?",
    "Quando deve ser usado o taser?",
    "Como deve ser o nome apaisana e o nome em patrulha?",
    "Pode prender morto? se sim, quando?"
];

// Enviar painel para realizar formulário
export async function enviarPainelFormulario(client) {
    const channel = await client.channels.fetch(FORM_PANEL_CHANNEL_ID);
    if (!channel) return console.error('Canal do painel não encontrado');

    const embed = new EmbedBuilder()
        .setTitle('📋 Formulário de Recrutamento')
        .setDescription('Clique no botão abaixo para realizar o formulário.')
        .setColor(0x00FFFF);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_form')
            .setLabel('Realizar Formulário')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝')
    );

    await channel.send({ embeds: [embed], components: [row] });
}

// Handler do formulário
export async function formularioHandler(client, interaction) {
    if (interaction.isButton() && interaction.customId === 'open_form') {
        // Criar canal privado
        const guild = interaction.guild;
        const user = interaction.user;

        const channel = await guild.channels.create({
            name: `form-${user.username}`,
            type: 0, // GUILD_TEXT
            parent: FORM_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                },
                {
                    id: RECRUITER_ROLE_ID,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                }
            ]
        });

        await channel.send(`${user}, bem-vindo ao seu formulário! Responda as perguntas abaixo.`);

        // Perguntas sequenciais
        const responses = {};
        for (const question of questions) {
            await channel.send({ content: question });
            const filter = m => m.author.id === user.id;
            const collected = await channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
            responses[question] = collected.first().content;
        }

        // Enviar embed no canal de respostas
        const responseEmbed = new EmbedBuilder()
            .setTitle(`📋 Formulário de ${user.tag}`)
            .setColor(0x00FFFF);

        Object.entries(responses).forEach(([q, a], i) => {
            responseEmbed.addFields({ name: `${i + 1} - ${q}`, value: a, inline: false });
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('approve')
                .setLabel('Aprovar')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('reject')
                .setLabel('Reprovar')
                .setStyle(ButtonStyle.Danger)
        );

        const responseChannel = await client.channels.fetch(FORM_RESPONSES_CHANNEL_ID);
        if (responseChannel) await responseChannel.send({ embeds: [responseEmbed], components: [row] });

        await channel.send('Formulário enviado para avaliação!');
    }

    // Aprovar / Reprovar
    if (interaction.isButton() && (interaction.customId === 'approve' || interaction.customId === 'reject')) {
        if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID)) {
            return interaction.reply({ content: 'Você não tem permissão para isso.', ephemeral: true });
        }

        const user = interaction.message.embeds[0].title.split(' ')[3]; // Pega o usuário do título
        const guildMember = await interaction.guild.members.fetch(user.replace(/[<>@!]/g, ''));

        if (interaction.customId === 'approve') {
            await guildMember.roles.add(APPROVED_ROLES);
            const approvedEmbed = new EmbedBuilder()
                .setTitle('✅ Formulário Aprovado')
                .setDescription(`${guildMember} foi aprovado! Vá se registrar.`)
                .setColor(0x00FF00);
            const logChannel = await client.channels.fetch(APPROVAL_LOG_CHANNEL_ID);
            if (logChannel) await logChannel.send({ embeds: [approvedEmbed] });
        } else {
            // Reprovar com motivo
            await interaction.reply({ content: 'Digite o motivo da reprovação:', ephemeral: true });
            const filter = m => m.author.id === interaction.user.id;
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 300000, errors: ['time'] });
            const reason = collected.first().content;

            const rejectedEmbed = new EmbedBuilder()
                .setTitle('❌ Formulário Reprovado')
                .setDescription(`${guildMember} foi reprovado!\nMotivo: ${reason}`)
                .setColor(0xFF0000);
            const logChannel = await client.channels.fetch(APPROVAL_LOG_CHANNEL_ID);
            if (logChannel) await logChannel.send({ embeds: [rejectedEmbed] });
        }

        await interaction.message.delete(); // remove o embed antigo
    }
}
