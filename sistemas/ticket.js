const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionsBitField, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// ============================================================
// ⚙️ CONFIGURAÇÃO
// ============================================================
const ID_CANAL_PAINEL = '1390033257252389032';
const ID_CATEGORIA_TICKET = '1390033257252389028';
const ID_CARGO_STAFF = '1390033256753135653'; 

// Caminho da imagem (Mantendo o 2.jpg do seu código original)
const CAMINHO_IMAGEM = path.join(__dirname, '../assets/2.jpg');

// ============================================================
// 1. ENVIAR PAINEL (VISUAL TÁTICO)
// ============================================================
async function enviarPainel(client) {
    const channel = await client.channels.fetch(ID_CANAL_PAINEL).catch(() => null);
    if (!channel) return console.log("❌ Canal de Ticket não encontrado.");

    try {
        const msgs = await channel.messages.fetch({ limit: 5 });
        if (msgs.size > 0) await channel.bulkDelete(msgs).catch(() => {});
    } catch(e) {}

    // Prepara o Banner
    let arquivoBanner = null;
    if (fs.existsSync(CAMINHO_IMAGEM)) {
        arquivoBanner = new AttachmentBuilder(CAMINHO_IMAGEM, { name: 'banner.jpg' });
    }

    const embed = new EmbedBuilder()
        .setAuthor({ name: 'BOPE | CENTRAL DE SUPORTE', iconURL: client.user.displayAvatarURL() })
        .setDescription(`
        **CANAL DE ATENDIMENTO OFICIAL**

        Utilize este terminal para solicitar suporte, realizar denúncias ou contestar punições. Aberturas de tickets sem motivo acarretarão em sanções administrativas.

        \`\`\`ml
        STATUS: OPERACIONAL
        EQUIPE: DISPONIVEL
        \`\`\`

        > **CATEGORIAS:**
        > Selecione abaixo a opção correspondente à sua necessidade.
        `)
        .setColor(0x000000) // All Black
        .setFooter({ text: 'Central de Comunicações', iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    if (arquivoBanner) {
        embed.setImage('attachment://banner.jpg');
    }

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('ticket_menu_abrir')
            .setPlaceholder('SELECIONE O TIPO DE ATENDIMENTO')
            .addOptions([
                { 
                    label: 'Dúvidas Gerais', 
                    value: 'duvida', 
                    description: 'Esclarecimento sobre regras e sistemas.', 
                    emoji: '❔' 
                },
                { 
                    label: 'Denúncias', 
                    value: 'denuncia', 
                    description: 'Reportar infrações de outros oficiais.', 
                    emoji: '📤' 
                },
                { 
                    label: 'Revisão de Punição', 
                    value: 'revisao', 
                    description: 'Contestar advertências ou banimentos.', 
                    emoji: '⚖️' 
                }
            ])
    );

    const payload = { embeds: [embed], components: [row] };
    if (arquivoBanner) payload.files = [arquivoBanner];

    await channel.send(payload);
    console.log("✅ Painel de Ticket enviado.");
}

// ============================================================
// 2. GERENCIAR INTERAÇÕES
// ============================================================
async function gerenciarTicket(interaction, client) {
    
    // --- ABRIR TICKET ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu_abrir') {
        await interaction.deferReply({ ephemeral: true });
        
        const user = interaction.user;
        const guild = interaction.guild;
        
        // Verifica se já tem ticket
        const exists = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
        if (exists) {
            return interaction.editReply(`❌ **ERRO:** Você já possui um atendimento em andamento: ${exists}`);
        }
        
        let titulo = 'Atendimento';
        if (interaction.values[0] === 'duvida') titulo = 'Dúvidas';
        if (interaction.values[0] === 'denuncia') titulo = 'Denúncia';
        if (interaction.values[0] === 'revisao') titulo = 'Revisão';

        // Cria o canal
        const canal = await guild.channels.create({
            name: `ticket-${user.username}`, 
            type: ChannelType.GuildText, 
            parent: ID_CATEGORIA_TICKET, 
            topic: `Ticket de ${user.tag} - Assunto: ${titulo}`,
            permissionOverwrites: [
                {id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel]}, 
                {id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]}, 
                {id: ID_CARGO_STAFF, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}, 
                {id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]}
            ]
        });

        // Embed de Boas-vindas dentro do Ticket (Também All Black)
        const embedWelcome = new EmbedBuilder()
            .setAuthor({ name: `ATENDIMENTO: ${titulo.toUpperCase()}`, iconURL: user.displayAvatarURL() })
            .setDescription(`
            Olá <@${user.id}>.
            
            Um oficial superior (<@&${ID_CARGO_STAFF}>) foi notificado e assumirá o caso em breve.
            
            > **INSTRUÇÃO:**
            > Descreva seu problema detalhadamente e aguarde.
            `)
            .setColor(0x000000);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_btn_fechar')
                .setLabel('ENCERRAR CHAMADO')
                .setStyle(ButtonStyle.Danger)
        );

        await canal.send({ content: `<@${user.id}> | <@&${ID_CARGO_STAFF}>`, embeds: [embedWelcome], components: [row] });
        
        await interaction.editReply(`✅ Ticket criado com sucesso: ${canal}`);
    }

    // --- FECHAR TICKET (COM CORREÇÃO DE CRASH) ---
    if (interaction.isButton() && interaction.customId === 'ticket_btn_fechar') {
        await interaction.reply('🔒 O canal será encerrado em 5 segundos...');
        
        // Salva a referência do canal antes do timeout para evitar crash
        const canalParaDeletar = interaction.channel;

        setTimeout(() => {
            if (canalParaDeletar) {
                canalParaDeletar.delete().catch(() => console.log("Canal já deletado ou erro na exclusão."));
            }
        }, 5000);
    }
}

module.exports = { enviarPainel, gerenciarTicket };