// commands/formulario.js
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    InteractionType
} from 'discord.js';

// IDs fornecidos
const PANEL_CHANNEL_ID = '1390033258309357577';
const CATEGORY_FORM_ID = '1390033258309357576';
const REVIEW_CHANNEL_ID = '1390033258477125632';
const RESULT_CHANNEL_ID = '1390033258309357578';
const RECRUITER_ROLE_ID = '1390033256640024594';
const TAG_CHANNEL_ID = '1396852912709308426';
const SOLICITAR_TAG_ID = '1399875114660532244';
const TUTORIAL_CHANNEL_ID = '1390033257533542410';

// Cargos a dar no aprovado
const ROLE_IDS_ON_APPROVE = [
    '1390033256652476596',
    '1390033256652476595',
    '1390033256652476594',
    '1390033256652476592'
];

// Perguntas do formulário
const perguntas = [
    "Qual sua idade?",
    "Quanto tempo de RP?",
    "Qual sua intenção em entrar na polícia federal?",
    "O que é RP e ANTI-RP?",
    "O que é RDM e VDM?",
    "O que é ter amor à vida?",
    "O que é car jacking?",
    "O que é ninja jacking?",
    "O que é DarkRP?",
    "O que são áreas verdes, neutras e vermelhas?",
    "Qual patente mínima necessária para iniciar uma patrulha?",
    "Quantos policiais são necessários para iniciar a patrulha?",
    "Quando é permitido atirar em uma perseguição?",
    "Como deve ser a conduta de abordagem?",
    "Qual o máximo de artigos que uma pessoa pode ser presa?",
    "Você pode abordar trabalhador? Se sim, quando?",
    "Quando deve ser usado o taser?",
    "Como deve ser o nome apaisana e o nome em patrulha?",
    "Pode prender morto? Se sim, quando?"
];

// Armazenar progresso
const respostasPendentes = new Map(); // userId -> { canalId, respostas[], idxPergunta }

export async function enviarPainelFormulario(client) {
    const painelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!painelChannel) return;

    const embed = new EmbedBuilder()
        .setTitle("📋 Painel de Formulário")
        .setDescription("Clique no botão abaixo para iniciar seu formulário de conscrito.")
        .setColor(0x00AEFF);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("iniciar_formulario")
            .setLabel("Realizar Formulário")
            .setStyle(ButtonStyle.Primary)
    );

    await painelChannel.send({ embeds: [embed], components: [row] });
}

export async function formularioHandler(client, interaction) {
    // Clique no botão "realizar formulário"
    if (interaction.isButton() && interaction.customId === "iniciar_formulario") {
        const guild = interaction.guild;

        // cria canal privado
        const privateChannel = await guild.channels.create({
            name: `form-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: CATEGORY_FORM_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        respostasPendentes.set(interaction.user.id, {
            canalId: privateChannel.id,
            respostas: [],
            idxPergunta: 0
        });

        await privateChannel.send(`Olá ${interaction.user}, vamos começar o formulário!`);
        await privateChannel.send(`**${perguntas[0]}**`);

        await interaction.reply({ content: "✅ Seu canal privado foi criado para preencher o formulário.", ephemeral: true });
    }

    // Mensagens nas perguntas
    if (interaction.isMessage() && respostasPendentes.has(interaction.author.id)) {
        const progresso = respostasPendentes.get(interaction.author.id);
        if (interaction.channel.id !== progresso.canalId) return;

        progresso.respostas.push(interaction.content);
        progresso.idxPergunta++;

        if (progresso.idxPergunta < perguntas.length) {
            await interaction.channel.send(`**${perguntas[progresso.idxPergunta]}**`);
        } else {
            // acabou
            const reviewChannel = await client.channels.fetch(REVIEW_CHANNEL_ID);

            const embed = new EmbedBuilder()
                .setTitle("📋 Novo Formulário Recebido")
                .setColor(0xFFD700)
                .setAuthor({ name: interaction.author.tag, iconURL: interaction.author.displayAvatarURL() });

            perguntas.forEach((pergunta, idx) => {
                embed.addFields({ name: pergunta, value: progresso.respostas[idx] || "Não respondeu", inline: false });
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprovar_${interaction.author.id}`).setLabel("Aprovar").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`reprovar_${interaction.author.id}`).setLabel("Reprovar").setStyle(ButtonStyle.Danger)
            );

            await reviewChannel.send({ embeds: [embed], components: [row] });
            await interaction.channel.send("✅ Formulário finalizado e enviado para análise!");
            respostasPendentes.delete(interaction.author.id);
        }
    }

    // Aprovar / Reprovar
    if (interaction.isButton()) {
        const [acao, targetId] = interaction.customId.split("_");
        if (!["aprovar", "reprovar"].includes(acao)) return;

        if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID)) {
            return interaction.reply({ content: "❌ Você não tem permissão para aprovar/reprovar.", ephemeral: true });
        }

        const user = await interaction.guild.members.fetch(targetId);
        const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

        if (acao === "aprovar") {
            for (const roleId of ROLE_IDS_ON_APPROVE) {
                await user.roles.add(roleId).catch(() => {});
            }

            const embed = new EmbedBuilder()
                .setTitle("✅ Candidato Aprovado")
                .setDescription(`${user} foi aprovado! Agora deve:\n- Se registrar em <#${TAG_CHANNEL_ID}>\n- Solicitar a tag em <#${SOLICITAR_TAG_ID}>\n- Ler o tutorial em <#${TUTORIAL_CHANNEL_ID}>`)
                .setColor(0x00FF00);

            await resultChannel.send({ embeds: [embed] });
            await interaction.reply({ content: "✅ Aprovado com sucesso!", ephemeral: true });
        }

        if (acao === "reprovar") {
            const modal = new ModalBuilder()
                .setCustomId(`modal_reprovar_${targetId}`)
                .setTitle("Motivo da Reprovação")
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId("motivo")
                            .setLabel("Escreva o motivo")
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
        }
    }

    // Modal de reprovação
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId.startsWith("modal_reprovar_")) {
        const targetId = interaction.customId.split("_")[2];
        const motivo = interaction.fields.getTextInputValue("motivo");
        const user = await interaction.guild.members.fetch(targetId);
        const resultChannel = await client.channels.fetch(RESULT_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setTitle("❌ Candidato Reprovado")
            .setDescription(`${user} foi reprovado.\n\n**Motivo:** ${motivo}`)
            .setColor(0xFF0000);

        await resultChannel.send({ embeds: [embed] });
        await interaction.reply({ content: "❌ Reprovado e motivo registrado!", ephemeral: true });
    }
}
