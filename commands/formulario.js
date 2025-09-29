// commands/formulario.js
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    InteractionType
} from 'discord.js';

const FORM_CHANNEL_ID = '1390033258309357577'; // Canal público do botão
const PANEL_CHANNEL_ID = '1396852912709308426';
const TUTORIAL = '1390033257533542410';
const ICON_PF = '<:iconepf:1399436333071728730>';
const F3_PENDENTE = '1399875114660532244';
const RESPONSES_CHANNEL_ID = '1390033258477125632';
const APPROVED_CHANNEL_ID = '1390033258309357578';
const RECRUITER_ROLE_ID = '1390033256640024594';
const APPROVED_ROLES = [
    '1390033256652476596',
    '1390033256652476595',
    '1390033256652476594',
    '1390033256652476592'
];

const QUESTIONS = [
    '1º • Qual sua idade?',
    '2º • Qual o seu id no jogo?',
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

// Enviar botão do formulário
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

// Handler do formulário
export async function formularioHandler(client, interaction) {
    try {
        // ----------------------------
        // BOTÃO: Iniciar formulário
        // ----------------------------
        if (interaction.isButton() && interaction.customId === 'start_form') {
            const modal = new ModalBuilder()
                .setCustomId(`form_modal_${interaction.user.id}`)
                .setTitle('Formulário de Recrutamento');

            // Adiciona até 5 perguntas por modal
            for (let i = 0; i < 5 && i < QUESTIONS.length; i++) {
                const input = new TextInputBuilder()
                    .setCustomId(`q_${i}`)
                    .setLabel(QUESTIONS[i])
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(input));
            }

            await interaction.showModal(modal);
            return; // evita cair em outros ifs
        }

        // ----------------------------
        // SUBMISSÃO DO MODAL
        // ----------------------------
        if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith('form_modal_')) {
            const targetUserId = interaction.user.id;
            const responses = [];

            Object.keys(interaction.fields.fields).forEach((key, index) => {
                const answer = interaction.fields.getTextInputValue(key);
                responses.push({ question: QUESTIONS[index], answer });
            });

            // Embed para os recrutadores
            const embedResponses = new EmbedBuilder()
                .setTitle(`Formulário de ${interaction.user.tag}`)
                .setColor(0xFFD700);

            responses.forEach(resp => {
                embedResponses.addFields({ name: resp.question, value: resp.answer });
            });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`approve_${targetUserId}`)
                        .setLabel('Aprovar')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reject_${targetUserId}`)
                        .setLabel('Reprovar')
                        .setStyle(ButtonStyle.Danger)
                );

            const responseChannel = await client.channels.fetch(RESPONSES_CHANNEL_ID);
            await responseChannel.send({ embeds: [embedResponses], components: [row] });

            await interaction.reply({ content: 'Formulário enviado! Aguarde a aprovação/reprovação.', ephemeral: true });
            return;
        }

        // ----------------------------
        // BOTÃO: Aprovar formulário
        // ----------------------------
        if (interaction.isButton() && interaction.customId.startsWith('approve_')) {
            if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID))
                return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true });

            const memberId = interaction.customId.split('_')[1];
            const member = await interaction.guild.members.fetch(memberId);
            if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });

            for (const roleId of APPROVED_ROLES) {
                await member.roles.add(roleId).catch(console.error);
            }

            await interaction.update({ content: 'Aprovado!', components: [], embeds: [] });

            const approvedChannel = await client.channels.fetch(APPROVED_CHANNEL_ID);
            const embedApproved = new EmbedBuilder()
                .setTitle(`${ICON_PF} Formulário Aprovado`)
                .setDescription(`Olá ${member}, parabéns! Você foi aprovado no formulário.

📝 **Próximos passos:**
• Faça o seu **registro** no canal: <#${PANEL_CHANNEL_ID}>
• Solicite sua **tag** no canal: <#${F3_PENDENTE}>
• Confira o **tutorial da corporação** aqui: <#${TUTORIAL}>
`)
                .setColor(0x00FF00)
                .setFooter({ text: 'Polícia Federal - DRP' });

            await approvedChannel.send({ content: `${member}`, embeds: [embedApproved] });
            return;
        }

        // ----------------------------
        // BOTÃO: Reprovar formulário
        // ----------------------------
        if (interaction.isButton() && interaction.customId.startsWith('reject_')) {
            if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID))
                return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true });

            const memberId = interaction.customId.split('_')[1];
            const member = await interaction.guild.members.fetch(memberId);
            if (!member) return interaction.reply({ content: 'Membro não encontrado.', ephemeral: true });

            await interaction.update({ content: 'Reprovado!', components: [], embeds: [] });

            const rejectedChannel = await client.channels.fetch(APPROVED_CHANNEL_ID);
            const embedRejected = new EmbedBuilder()
                .setTitle(`${ICON_PF} Formulário Reprovado`)
                .setDescription(`Olá ${member}, infelizmente suas respostas estavam incorretas.  

📌 **Próximos passos:**
• Leia atentamente as regras no site:  
🔗 https://distritoroleplay.com/regras
• Refaça o formulário após se preparar melhor.
`)
                .setColor(0xFF0000)
                .setFooter({ text: 'Polícia Federal - DRP' });

            await rejectedChannel.send({ content: `${member}`, embeds: [embedRejected] });
            return;
        }

    } catch (err) {
        console.error('Erro no formulário:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Erro interno no formulário.', ephemeral: true }).catch(() => null);
        }
    }
}
