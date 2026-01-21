import {
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField,
    InteractionType,
    ChannelType // Adicionado para clareza
} from 'discord.js';

// Não há necessidade de importar a função de sheets aqui se não for usada neste arquivo
// import { getUsuariosTodos } from '../utils/sheets.js'; 

const FORM_CHANNEL_ID = '1390033258309357577';
const RESPONSES_CHANNEL_ID = '1390033258477125632';
const APPROVED_CHANNEL_ID = '1390033258309357578';
const RECRUITER_ROLE_ID = '1390033256640024594';
const ICON_PF = '<:medalha:1407068603299139786>';

// ID da Categoria onde os canais de formulário serão criados
const FORM_CATEGORY_ID = '1390033258309357576';

// NOVOS IDS DE CARGOS A SEREM ATRIBUÍDOS NA APROVAÇÃO
const ROLES_TO_ADD_ON_APPROVAL = [
    '1390033256652476596',
    '1390033256652476595',
    '1390033256652476592',
    '1390033256652476594'
];

const QUESTIONS = [
    '1º • Qual sua idade?',
    '2º • Qual o seu id no jogo?',
    '3º • Qual sua intenção em entrar na PMMG?',
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

/**
 * Envia o painel inicial do formulário no canal específico.
 * Garante que apenas um painel esteja presente limpando o canal antes.
 */
export async function enviarPainelFormulario(client) {
    const channel = await client.channels.fetch(FORM_CHANNEL_ID).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildText) return;

    // Limpa o canal antes de enviar o painel para evitar duplicidade
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        if (messages.size > 0) {
            await channel.bulkDelete(messages, true);
        }
    } catch (e) {
        console.error('Não foi possível limpar o canal do formulário:', e);
    }

    const embed = new EmbedBuilder()
        .setTitle('Formulário de Recrutamento')
        .setDescription('Clique no botão abaixo para iniciar o formulário.')
        .setColor(0xFFD700);

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('start_form')
            .setLabel('Realizar Formulário')
            .setStyle(ButtonStyle.Secondary)
    );

    await channel.send({ embeds: [embed], components: [row] }).catch(console.error);
}

/**
 * Lida com todas as interações relacionadas aos formulários (botão inicial, aprovar, reprovar).
 */
export async function formularioHandler(client, interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    // --- 1. Lógica para INICIAR o Formulário ---
    if (customId === 'start_form') {
        let channel; // Declarar a variável do canal aqui para ser acessível no catch
        try {
            // MUDANÇA: Adiar a resposta imediatamente para evitar o erro de 'Unknown Interaction'.
            await interaction.deferReply({ ephemeral: true });

            const guild = interaction.guild;
            const user = interaction.user;
            const channelName = `formulario-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)}`;

            // Verifica se um canal para este usuário já existe para evitar duplicação
            const existingChannel = guild.channels.cache.find(c => c.name === channelName && c.parentId === FORM_CATEGORY_ID);
            if(existingChannel) {
                await interaction.editReply(`Você já possui um formulário em andamento em: ${existingChannel}`);
                return;
            }

            // 1. Criação do Canal Privado
            channel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                parent: FORM_CATEGORY_ID,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            // MUDANÇA: Usar editReply para atualizar a resposta que foi adiada.
            await interaction.editReply({ content: `Seu canal de formulário foi criado: ${channel}` });

            // 2. Coleta de Respostas
            const responses = [];
            for (const question of QUESTIONS) {
                const embed = new EmbedBuilder()
                    .setTitle(`${ICON_PF} Pergunta de Recrutamento`)
                    .setDescription(question)
                    .setFooter({ text: `Respondendo como: ${user.tag}`, iconURL: user.displayAvatarURL() })
                    .setColor(0xFFD700);

                await channel.send({ embeds: [embed] });

                const filter = m => m.author.id === user.id;
                const collected = await channel.awaitMessages({ filter, max: 1, time: 600000, errors: ['time'] }).catch(() => null);

                if (!collected || !collected.first()) {
                    await channel.send('Tempo esgotado. O formulário foi cancelado e este canal será deletado em 10 segundos.');
                    return setTimeout(() => channel.delete().catch(console.error), 10000);
                }
                responses.push({ question, answer: collected.first().content });
            }

            // 3. Envio das Respostas (Painel de Aprovação)
            await channel.send('**Formulário concluído!** Enviando respostas para avaliação. Este canal será excluído em 15 segundos.');

            const responseChannel = await client.channels.fetch(RESPONSES_CHANNEL_ID);
            
            const embedResponses = new EmbedBuilder()
                .setTitle(`${ICON_PF} Novo Formulário de ${user.tag}`)
                .setDescription(`**ID do Usuário:** \`${user.id}\`\n**Menção:** <@${user.id}>`)
                .setThumbnail(user.displayAvatarURL())
                .setColor(0xFFD700);

            responses.forEach(r => embedResponses.addFields({ name: r.question, value: `> ${r.answer.substring(0, 1020)}`, inline: false }));

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`form_approve_${user.id}`).setLabel('Aprovar Candidato').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`form_reject_${user.id}`).setLabel('Reprovar Candidato').setStyle(ButtonStyle.Danger)
            );

            await responseChannel.send({ embeds: [embedResponses], components: [actionRow] });

            setTimeout(() => channel.delete().catch(console.error), 15000);

        } catch (err) {
            console.error('Erro no processamento do formulário:', err);
            // Tratamento de erro mais robusto
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: 'Ocorreu um erro interno ao criar seu formulário. Por favor, tente novamente mais tarde.' }).catch(() => {});
            }
            // Se um canal foi criado mas deu erro no meio, deleta-lo
            if (channel) {
                setTimeout(() => channel.delete().catch(console.error), 5000);
            }
        }
    }

    // --- 2. Lógica para APROVAR/REPROVAR ---
    else if (customId.startsWith('form_approve_') || customId.startsWith('form_reject_')) {
        try {
            // MUDANÇA: Adiar a atualização da interação imediatamente!
            await interaction.deferUpdate();

            if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                // Como já adiamos, usamos followUp para enviar a mensagem de erro.
                return interaction.followUp({ content: 'Você não tem permissão para usar este botão.', ephemeral: true });
            }

            const userId = customId.split('_').pop();
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            const action = customId.startsWith('form_approve_') ? 'Aprovado' : 'Reprovado';
            const isApproved = action === 'Aprovado';
            const color = isApproved ? 0x00FF00 : 0xFF0000;
            const statusIcon = isApproved ? '✅' : '❌';
            
            if (isApproved && member) {
                try {
                    await member.roles.add(ROLES_TO_ADD_ON_APPROVAL, 'Aprovação de Formulário');
                } catch (error) {
                    console.error(`Erro ao adicionar cargos ao membro ${member.user.tag}:`, error);
                    await interaction.followUp({ 
                        content: `⚠️ **AVISO:** Falha ao adicionar os cargos ao membro ${member}. Verifique se o bot tem permissão e se seu cargo está acima dos cargos a serem atribuídos.`, 
                        ephemeral: true 
                    });
                }
            }

            if (member) {
                const dmMessage = isApproved 
                    ? `Parabéns! Seu formulário em **${interaction.guild.name}** foi **APROVADO** por ${interaction.user.tag}. Você recebeu os cargos necessários! Aguarde instruções para o próximo passo.`
                    : `Sentimos muito, mas seu formulário em **${interaction.guild.name}** foi **REPROVADO** por ${interaction.user.tag}. Leia as regras e tente novamente!`;
                
                await member.send(dmMessage).catch(() => console.log(`Não foi possível enviar DM para ${member.user.tag}`));
            }

            const oldEmbed = interaction.message.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed)
                .setTitle(`[${action}] Formulário de ${member ? member.user.tag : `ID: ${userId}`}`)
                .setDescription(`${oldEmbed.description}\n\n**STATUS: ${action.toUpperCase()}**\n**Recrutador:** <@${interaction.user.id}> (${interaction.user.tag})`)
                .setColor(color);
            
            // MUDANÇA: Usar editReply porque a interação já foi adiada com deferUpdate.
            await interaction.editReply({
                embeds: [newEmbed],
                components: [] // Remove os botões
            });
            
            const logChannel = await client.channels.fetch(APPROVED_CHANNEL_ID).catch(() => null);
            if (logChannel) {
                let descriptionText = `O formulário de **${member ? member.user.tag : `ID: ${userId}`}** (<@${userId}>) foi processado.`;
                if (isApproved) {
                    descriptionText += `\n\n**PRÓXIMOS PASSOS:**\n1. Registre-se no canal: <#1396852912709308426>\n2. Solicite sua tag no canal: <#1399875114660532244>`;
                }
                const logEmbed = new EmbedBuilder()
                    .setTitle(`${statusIcon} Candidato ${action}`)
                    .setDescription(descriptionText)
                    .addFields(
                        { name: 'Status', value: `**${action}**`, inline: true },
                        { name: 'Recrutador', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setThumbnail(member ? member.user.displayAvatarURL() : null)
                    .setColor(color)
                    .setTimestamp();
                    
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch(err) {
            console.error("Erro ao aprovar/reprovar formulário:", err);
            // Envia uma mensagem de erro para o recrutador que clicou no botão.
            await interaction.followUp({ content: 'Ocorreu um erro ao processar esta ação.', ephemeral: true }).catch(() => {});
        }
    }
}