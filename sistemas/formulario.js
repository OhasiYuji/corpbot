const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');

// --- EDITAR AQUI ---
const ID_CANAL_BOTAO = '1390033258309357577';
const ID_CANAL_RESPOSTAS = '1390033258477125632'; // Onde admins veem
const ID_CATEGORIA = '1390033258309357576';
const ID_CANAL_RESULTADO = '1390033258309357578';
const ID_CARGO_RECRUTADOR = '1390033256640024596';
const IDS_CARGOS_APROVADO = ['1390033256652476595', '1390033256652476596', '1390033256652476594', '1390033256652476592'];

// IDs dos canais de próximos passos (aparecem quando aprovado)
const ID_CANAL_REGISTRO_REF = '1396852912709308426';
const ID_CANAL_TAG_REF = '1463503382449754122';

const PERGUNTAS = [ '1º • Qual sua idade?',
    '2º • Qual o seu id no jogo?',
    '3º • Qual sua intenção em entrar na corporação?',
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
    '19º • Pode prender morto? Se sim, quando?'];

async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_BOTAO).catch(() => null);
    if (!channel) return;
    const msgs = await channel.messages.fetch({ limit: 5 });
    if (msgs.size > 0) await channel.bulkDelete(msgs).catch(()=>{});
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('iniciar_form').setLabel('Iniciar Recrutamento').setStyle(ButtonStyle.Secondary).setEmoji('💀'));
    await channel.send({ embeds: [new EmbedBuilder().setTitle('Recrutamento').setDescription('Clique para iniciar.').setColor(0xFFD700)], components: [row] });
}

async function gerenciarFormulario(interaction, client) {
    const { customId, guild, user } = interaction;
    if (customId === 'iniciar_form') {
        await interaction.deferReply({ ephemeral: true });
        const channel = await guild.channels.create({
            name: `rec-${user.username.replace(/[^a-z0-9]/gi,'').substring(0,10)}`, type: ChannelType.GuildText, parent: ID_CATEGORIA,
            permissionOverwrites: [{id: guild.id, deny:[PermissionsBitField.Flags.ViewChannel]}, {id: user.id, allow:[PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}, {id: client.user.id, allow:[PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}]
        });
        await interaction.editReply(`Ticket criado: ${channel}`);
        const respostas = [];
        for (const p of PERGUNTAS) {
            await channel.send({ embeds: [new EmbedBuilder().setDescription(`**${p}**`).setColor(0xFFD700)] });
            const collected = await channel.awaitMessages({ filter: m => m.author.id === user.id, max: 1, time: 300000 }).catch(() => null);
            if (!collected || !collected.first()) return setTimeout(() => channel.delete().catch(()=>{}), 5000);
            respostas.push({ pergunta: p, resposta: collected.first().content });
        }
        await channel.send('✅ Enviado. Fechando em 5s.');
        setTimeout(() => channel.delete().catch(()=>{}), 5000);
        
        const canalResp = await client.channels.fetch(ID_CANAL_RESPOSTAS);
        const embed = new EmbedBuilder().setTitle(`Candidato: ${user.tag}`).setThumbnail(user.displayAvatarURL()).setColor(0xFFFF00);
        respostas.forEach(r => embed.addFields({ name: r.pergunta, value: r.resposta.substring(0, 1000) }));
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`apv_${user.id}`).setLabel('Aprovar').setStyle(ButtonStyle.Success), new ButtonBuilder().setCustomId(`rep_${user.id}`).setLabel('Reprovar').setStyle(ButtonStyle.Danger));
        await canalResp.send({ embeds: [embed], components: [row] });
    }

    if (customId.startsWith('apv_') || customId.startsWith('rep_')) {
        await interaction.deferUpdate();
        if (!interaction.member.roles.cache.has(ID_CARGO_RECRUTADOR)) return;
        const targetId = customId.split('_')[1];
        const isApproved = customId.startsWith('apv');
        const member = await guild.members.fetch(targetId).catch(() => null);
        const canalRes = await client.channels.fetch(ID_CANAL_RESULTADO);

        if (member && isApproved) await member.roles.add(IDS_CARGOS_APROVADO).catch(()=>{});
        if (member) member.send(isApproved ? `🎉 Aprovado!` : `❌ Reprovado.`).catch(()=>{});

        if (canalRes) {
            const embedPub = new EmbedBuilder().setTitle(isApproved ? '✅ Candidato Aprovado' : '❌ Candidato Reprovado').setColor(isApproved ? 0x57F287 : 0xED4245).setThumbnail(member ? member.user.displayAvatarURL() : null).setTimestamp().setFooter({text: guild.name, iconURL: guild.iconURL()});
            let desc = `O formulário de **${member?member.user.username:'Desc.'}** (<@${targetId}>) foi processado.`;
            if (isApproved) desc += `\n\n**PRÓXIMOS PASSOS:**\n1. Registre-se: <#${ID_CANAL_REGISTRO_REF}>\n2. Pegue a tag: <#${ID_CANAL_TAG_REF}>`;
            else desc += `\n\n**ORIENTAÇÃO:** Leia as regras.`;
            embedPub.setDescription(desc);
            embedPub.addFields({ name: 'Status', value: isApproved?'Aprovado':'Reprovado', inline: true }, { name: 'Recrutador', value: `${user}`, inline: true });
            await canalRes.send({ embeds: [embedPub] });
        }
        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0]).setTitle(isApproved ? '✅ APROVADO' : '❌ REPROVADO').setColor(isApproved ? 0x00FF00 : 0xFF0000).setFooter({ text: `Avaliado por: ${user.tag}` });
        await interaction.editReply({ components: [], embeds: [newEmbed] });
    }
}
module.exports = { enviarPainel, gerenciarFormulario };
