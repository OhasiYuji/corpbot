const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// ============================================================
// ⚙️ CONFIGURAÇÃO
// ============================================================
const ID_CANAL_BOTAO = '1390033258309357577';
const ID_CANAL_RESPOSTAS = '1390033258477125632'; // Onde admins veem
const ID_CATEGORIA = '1390033258309357576';
const ID_CANAL_RESULTADO = '1390033258309357578';
const ID_CARGO_RECRUTADOR = '1390033256640024596';
const IDS_CARGOS_APROVADO = ['1390033256652476595', '1390033256652476596', '1390033256652476594', '1390033256652476592'];

// IDs dos canais de próximos passos
const ID_CANAL_REGISTRO_REF = '1396852912709308426';
const ID_CANAL_TAG_REF = '1463503382449754122';

// Caminho do Banner (O mesmo do registro)
const CAMINHO_BANNER = path.join(__dirname, '../assets/Banner.png');

const PERGUNTAS = [
    '1º • Qual sua idade?',
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
    '19º • Pode prender morto? Se sim, quando?'
];

// ============================================================
// 1. ENVIAR PAINEL (VISUAL TÁTICO)
// ============================================================
async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_BOTAO).catch(() => null);
    if (!channel) return console.log("❌ Canal de Recrutamento não encontrado.");

    try {
        const msgs = await channel.messages.fetch({ limit: 5 });
        if (msgs.size > 0) await channel.bulkDelete(msgs).catch(()=>{});
    } catch(e) {}

    // Prepara o Banner
    let arquivoBanner = null;
    if (fs.existsSync(CAMINHO_BANNER)) {
        arquivoBanner = new AttachmentBuilder(CAMINHO_BANNER, { name: 'Banner.png' });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'BOPE | ALISTAMENTO MILITAR', iconURL: client.user.displayAvatarURL() })
        .setDescription(`
        **PROCESSO SELETIVO UNIFICADO**

        O ingresso na corporação exige disciplina, conhecimento das leis e conduta exemplar. O formulário abaixo avaliará sua aptidão técnica e psicológica.

        \`\`\`ml
        STATUS: INSCRICOES_ABERTAS
        VAGAS: DISPONIVEIS
        \`\`\`

        > **ATENÇÃO:**
        > Responda todas as perguntas com clareza e honestidade. O uso de IA ou cópia de respostas resultará em indeferimento imediato.
        `)
        .setColor(0x000000) // All Black
        .setFooter({ text: 'Divisão de Recrutamento e Seleção', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    if (arquivoBanner) {
        embed.setImage('attachment://Banner.png');
    }

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('iniciar_form')
            .setLabel('INICIAR RECRUTAMENTO')
            .setStyle(ButtonStyle.Secondary) // Botão Cinza/Dark
    );

    const payload = { embeds: [embed], components: [row] };
    if (arquivoBanner) payload.files = [arquivoBanner];

    await channel.send(payload);
    console.log("✅ Painel de Recrutamento enviado.");
}

// ============================================================
// 2. GERENCIAR INTERAÇÕES
// ============================================================
async function gerenciarFormulario(interaction, client) {
    const { customId, guild, user } = interaction;
    
    // --- INICIAR FORMULÁRIO ---
    if (customId === 'iniciar_form') {
        await interaction.deferReply({ ephemeral: true });
        
        // Cria ticket privado
        const channel = await guild.channels.create({
            name: `rec-${user.username.replace(/[^a-z0-9]/gi,'').substring(0,10)}`, 
            type: ChannelType.GuildText, 
            parent: ID_CATEGORIA,
            permissionOverwrites: [
                {id: guild.id, deny:[PermissionsBitField.Flags.ViewChannel]}, 
                {id: user.id, allow:[PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}, 
                {id: client.user.id, allow:[PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}
            ]
        });
        
        await interaction.editReply(`✅ Seu teste foi iniciado: ${channel}`);
        
        const respostas = [];
        // Loop de perguntas
        for (const p of PERGUNTAS) {
            await channel.send({ embeds: [new EmbedBuilder().setDescription(`**${p}**`).setColor(0x2B2D31)] }); // Cinza escuro nas perguntas
            
            const collected = await channel.awaitMessages({ filter: m => m.author.id === user.id, max: 1, time: 300000 }).catch(() => null);
            
            if (!collected || !collected.first()) {
                await channel.send('❌ Tempo esgotado. O ticket será fechado.');
                return setTimeout(() => channel.delete().catch(()=>{}), 5000);
            }
            respostas.push({ pergunta: p, resposta: collected.first().content });
        }
        
        await channel.send('✅ **Respostas enviadas!** Aguarde a análise. Este canal será fechado em 5s.');
        setTimeout(() => channel.delete().catch(()=>{}), 5000);
        
        // Envia para o canal de respostas
        const canalResp = await client.channels.fetch(ID_CANAL_RESPOSTAS);
        const embed = new EmbedBuilder()
            .setTitle(`FICHA DE AVALIAÇÃO: ${user.tag}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(0x000000) // All Black
            .setDescription(`**Candidato:** <@${user.id}>\n**ID:** ${user.id}`);
            
        respostas.forEach(r => embed.addFields({ name: r.pergunta, value: r.resposta.substring(0, 1000) }));
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`apv_${user.id}`).setLabel('APROVAR').setStyle(ButtonStyle.Success), 
            new ButtonBuilder().setCustomId(`rep_${user.id}`).setLabel('REPROVAR').setStyle(ButtonStyle.Danger)
        );
        
        await canalResp.send({ embeds: [embed], components: [row] });
    }

    // --- APROVAR / REPROVAR ---
    if (customId.startsWith('apv_') || customId.startsWith('rep_')) {
        
        if (!interaction.member.roles.cache.has(ID_CARGO_RECRUTADOR)) {
            return interaction.reply({ content: '❌ Acesso Negado: Permissão de Recrutador necessária.', ephemeral: true });
        }

        await interaction.deferUpdate();
        
        const targetId = customId.split('_')[1];
        const isApproved = customId.startsWith('apv');
        const member = await guild.members.fetch(targetId).catch(() => null);
        const canalRes = await client.channels.fetch(ID_CANAL_RESULTADO).catch(() => null);

        // Lógica de Aprovação Segura
        if (member && isApproved) {
            try {
                await member.roles.add(IDS_CARGOS_APROVADO);
                console.log(`✅ Cargos entregues para ${member.user.tag}`);
            } catch (error) {
                console.error(`❌ ERRO AO DAR CARGOS:`, error);
                console.log("Verifique a hierarquia de cargos do BOT.");
            }
        }

        if (member) {
            member.send(isApproved 
                ? `🎉 **PARABÉNS!** Você foi aprovado no recrutamento do BOPE!` 
                : `❌ **REPROVADO.** Infelizmente você não atingiu os critérios necessários.`
            ).catch(() => {});
        }

        if (canalRes) {
            const embedPub = new EmbedBuilder()
                .setTitle(isApproved ? '✅ APROVADO' : '❌ REPROVADO')
                .setColor(isApproved ? 0x57F287 : 0xED4245)
                .setThumbnail(member ? member.user.displayAvatarURL() : null)
                .setTimestamp()
                .setFooter({text: guild.name, iconURL: guild.iconURL()});
            
            let desc = `O processo seletivo de **${member ? member.user.username : 'Desconhecido'}** (<@${targetId}>) foi finalizado.`;
            
            if (isApproved) desc += `\n\n> **PRÓXIMAS ETAPAS:**\n> 1. Realize o registro: <#${ID_CANAL_REGISTRO_REF}>\n> 2. Solicite a patente: <#${ID_CANAL_TAG_REF}>`;
            else desc += `\n\n> **OBSERVAÇÃO:**\n> Estude as diretrizes e tente novamente na próxima abertura.`;
            
            embedPub.setDescription(desc);
            embedPub.addFields(
                { name: 'Resultado', value: isApproved ? 'Apto' : 'Inapto', inline: true }, 
                { name: 'Avaliador', value: `${user}`, inline: true }
            );
            
            await canalRes.send({ embeds: [embedPub] }).catch(err => console.error(err));
        }

        // Atualiza painel do recrutador
        const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setTitle(isApproved ? '✅ CANDIDATO APROVADO' : '❌ CANDIDATO REPROVADO')
            .setColor(isApproved ? 0x00FF00 : 0xFF0000)
            .setFooter({ text: `Processado por: ${user.tag}`, iconURL: user.displayAvatarURL() });
        
        await interaction.editReply({ components: [], embeds: [newEmbed] });
    }
}

module.exports = { enviarPainel, gerenciarFormulario };