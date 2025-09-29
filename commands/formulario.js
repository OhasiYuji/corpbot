import {
    Client,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    PermissionsBitField,
    InteractionType
} from 'discord.js';

// Importação que não está no código, mas mantida caso seja usada:
import { getUsuariosTodos } from '../utils/sheets.js'; 

const FORM_CHANNEL_ID = '1390033258309357577';
const RESPONSES_CHANNEL_ID = '1390033258477125632';
const APPROVED_CHANNEL_ID = '1390033257533542417';
const RECRUITER_ROLE_ID = '1390033256640024594'; // ID do Cargo de Recrutador/Staff
const ICON_PF = '<:iconepf:1399436333071728730>';

const QUESTIONS = [
    '1º • Qual sua idade?',
    '2º • Qual o seu id no jogo?',
    '3º • Qual sua intenção em entrar na policia federal?'
    // você pode adicionar as outras perguntas aqui...
];

/**
 * Envia o painel inicial do formulário no canal específico.
 */
export async function enviarPainelFormulario(client) {
    const channel = await client.channels.fetch(FORM_CHANNEL_ID).catch(() => null);
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

    // Limpa o canal ou apenas envia a mensagem, dependendo da sua preferência.
    // Neste caso, vou apenas garantir o envio.
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

            // 1. Criação do Canal Privado
            const channel = await guild.channels.create({
                name: `formulario-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                type: 0, // GuildText
                permissionOverwrites: [
                    {
                        id: guild.id, // @everyone
                        deny: [PermissionsBitField.Flags.ViewChannel]
                    },
                    {
                        id: interaction.user.id, // O Usuário que iniciou
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
                    },
                    {
                        id: client.user.id, // 👈 CORREÇÃO: Adiciona o bot para que ele possa enviar a mensagem
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
            const user = interaction.user;

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

            // 3. Envio das Respostas
            channel.send('**Formulário concluído!** Enviando respostas para avaliação. Este canal será excluído em breve.');

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
                    .setCustomId(`form_approve_${user.id}`) // Botão de Aprovar com o ID do usuário
                    .setLabel('Aprovar Candidato')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`form_reject_${user.id}`) // Botão de Reprovar com o ID do usuário
                    .setLabel('Reprovar Candidato')
                    .setStyle(ButtonStyle.Danger)
            );

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
        // Verifica se é um recrutador
        if (!interaction.member.roles.cache.has(RECRUITER_ROLE_ID) && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: 'Você não tem permissão para usar este botão.', ephemeral: true });
        }

        const userId = customId.split('_').pop();
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        const action = customId.startsWith('form_approve_') ? 'Aprovado' : 'Reprovado';
        const isApproved = action === 'Aprovado';
        const color = isApproved ? 0x00FF00 : 0xFF0000;

        await interaction.deferUpdate();

        // 1. Tenta enviar a mensagem no canal de aprovados/DM
        if (member) {
            try {
                if (isApproved) {
                    // Opcional: Adicionar um cargo de "Candidato Aprovado" ou mover para um canal de entrevista
                    // Aqui, você pode adicionar a lógica de envio para o canal de APROVADOS (log)
                    const approvedChannel = await client.channels.fetch(APPROVED_CHANNEL_ID).catch(() => null);
                    if (approvedChannel) {
                        approvedChannel.send({ content: `✅ Candidato **<@${userId}>** foi aprovado pelo Recrutador **<@${interaction.user.id}>**!` });
                    }
                    
                    member.send(`Parabéns! Seu formulário foi **APROVADO** por ${interaction.user.tag}. Aguarde instruções para o próximo passo.`).catch(() => console.log(`Não foi possível enviar DM para ${member.user.tag}`));
                } else {
                    member.send(`Sentimos muito, mas seu formulário foi **REPROVADO** por ${interaction.user.tag}. Tente novamente em 7 dias.`).catch(() => console.log(`Não foi possível enviar DM para ${member.user.tag}`));
                }
            } catch (error) {
                console.error('Erro ao notificar o usuário:', error);
            }
        }

        // 2. Edita a mensagem do formulário no canal de respostas
        const oldEmbed = interaction.message.embeds[0];
        const newEmbed = EmbedBuilder.from(oldEmbed)
            .setTitle(`[${action}] Formulário de ${member ? member.user.tag : userId}`)
            .setDescription(`${oldEmbed.description}\n\n**STATUS: ${action}**\n**Recrutador:** <@${interaction.user.id}> (${interaction.user.tag})`)
            .setColor(color);

        await interaction.editReply({
            embeds: [newEmbed],
            components: [] // Remove os botões
        });
    }
}