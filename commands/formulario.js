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
const RESPONSES_CHANNEL_ID = '1390033258477125632'; // Recebe o painel de respostas com os botões
const APPROVED_CHANNEL_ID = '1390033258309357578'; // 👈 NOVO ID/LOG: Recebe o EMBED de notificação de Aprovado/Reprovado
const RECRUITER_ROLE_ID = '1390033256640024594'; // ID do Cargo de Recrutador/Staff
const ICON_PF = '<:iconepf:1399436333071728730>';

// ID da Categoria onde os canais de formulário serão criados
const FORM_CATEGORY_ID = '1390033258309357576'; 

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

/**
 * Envia o painel inicial do formulário no canal específico.
 * Garante que apenas um painel esteja presente limpando o canal antes.
 */
export async function enviarPainelFormulario(client) {
    const channel = await client.channels.fetch(FORM_CHANNEL_ID).catch(() => null);
    if (!channel || channel.type !== 0) return;

    // Limpa o canal antes de enviar o painel para evitar duplicidade
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        await channel.bulkDelete(messages, true).catch(() => {});
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
        try {
            const guild = interaction.guild;
            const user = interaction.user;

            // 1. Criação do Canal Privado
            const channel = await guild.channels.create({
                name: `formulario-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                type: 0, // GuildText
                parent: FORM_CATEGORY_ID, // Define a categoria
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: user.id, // O Usuário que iniciou
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    },
                    {
                        id: client.user.id, // O Bot
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    }
                ]
            }).catch(err => {
                console.error('Erro ao criar canal do formulário:', err);
                return null;
            });

            if (!channel) return interaction.reply({ content: 'Não foi possível criar o canal.', ephemeral: true });

            await interaction.reply({ content: `Seu canal de formulário foi criado: ${channel}`, ephemeral: true });

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
                // Tempo de espera de 10 minutos (600000ms)
                const collected = await channel.awaitMessages({ filter, max: 1, time: 600000, errors: ['time'] }).catch(() => null);

                if (!collected || !collected.first()) {
                    channel.send('Tempo esgotado ou resposta inválida. O formulário foi cancelado.');
                    return setTimeout(() => channel.delete().catch(console.error), 5000);
                }
                responses.push({ question, answer: collected.first().content });
            }

            // 3. Envio das Respostas (Painel de Aprovação)
            channel.send('**Formulário concluído!** Enviando respostas para avaliação. Este canal será excluído em 15 segundos.');

            const responseChannel = await client.channels.fetch(RESPONSES_CHANNEL_ID).catch(() => null);
            if (!responseChannel) return channel.send('Erro: Não foi possível enviar as respostas para o canal de avaliação.');

            const embedResponses = new EmbedBuilder()
                .setTitle(`${ICON_PF} Novo Formulário de ${user.tag}`)
                .setDescription(`**ID do Usuário:** \`${user.id}\`\n**Menção:** <@${user.id}>`)
                .setThumbnail(user.displayAvatarURL())
                .setColor(0xFFD700);

            responses.forEach(r => embedResponses.addFields({ name: r.question, value: `> ${r.answer}`, inline: false }));

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`form_approve_${user.id}`) 
                    .setLabel('Aprovar Candidato')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`form_reject_${user.id}`) 
                    .setLabel('Reprovar Candidato')
                    .setStyle(ButtonStyle.Danger)
            );

            // A MENSAGEM DO FORMULÁRIO COM OS BOTÕES VAI PARA RESPONSES_CHANNEL_ID
            await responseChannel.send({
                embeds: [embedResponses],
                components: [actionRow]
            }).catch(console.error);

            // Apagar canal após 15s
            setTimeout(() => {
                channel.delete().catch(console.error);
            }, 15000);

        } catch (err) {
            console.error('Erro no processamento do formulário:', err);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: 'Erro interno ao processar formulário.', ephemeral: true });
                }
            } catch { /* ignore */ }
        }
    }

    // --- 2. Lógica para APROVAR/REPROVAR ---
    else if (customId.startsWith('form_approve_') || customId.startsWith('form_reject_')) {
        // Verifica se é um recrutador/staff
        if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Você não tem permissão para usar este botão.', ephemeral: true });
        }

        const userId = customId.split('_').pop();
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const action = customId.startsWith('form_approve_') ? 'Aprovado' : 'Reprovado';
        const isApproved = action === 'Aprovado';
        const color = isApproved ? 0x00FF00 : 0xFF0000;
        const statusIcon = isApproved ? '✅' : '❌';

        await interaction.deferUpdate();
        
        // 1. Notifica o usuário por DM
        if (member) {
            try {
                const dmMessage = isApproved 
                    ? `Parabéns! Seu formulário foi **APROVADO** por ${interaction.user.tag}. Aguarde instruções para o próximo passo.`
                    : `Sentimos muito, mas seu formulário foi **REPROVADO** por ${interaction.user.tag}. Tente novamente em 7 dias.`;
                    
                member.send(dmMessage).catch(() => console.log(`Não foi possível enviar DM para ${member.user.tag}`));
            } catch (error) {
                console.error('Erro ao notificar o usuário:', error);
            }
        }

        // 2. Edita a mensagem do formulário no canal de respostas (removendo botões)
        const oldEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
            .setTitle(`[${action}] Formulário de ${member ? member.user.tag : userId}`)
            .setDescription(`${oldEmbed.description}\n\n**STATUS: ${action}**\n**Recrutador:** <@${interaction.user.id}> (${interaction.user.tag})`)
            .setColor(color);

        await interaction.editReply({
            embeds: [newEmbed],
            components: [] // Remove os botões
        });
        
        // 3. Envia o EMBED de notificação de status para o canal APPROVED_CHANNEL_ID (1390033258309357578)
        const logChannel = await client.channels.fetch(APPROVED_CHANNEL_ID).catch(() => null);
        
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle(`${statusIcon} Candidato ${action}`)
                .setDescription(`O formulário de **${member ? member.user.tag : userId}** (<@${userId}>) foi processado.`)
                .addFields(
                    { name: 'Status', value: `**${action}**`, inline: true },
                    { name: 'Recrutador', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setThumbnail(member ? member.user.displayAvatarURL() : null)
                .setColor(color)
                .setTimestamp();
                
            logChannel.send({ embeds: [logEmbed] }).catch(console.error);
        }
    }
}