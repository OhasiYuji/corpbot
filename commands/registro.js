// IDs dos canais
const PANEL_CHANNEL_ID = '1396852912709308426'; // painel com botões
const USER_INFO_CHANNEL_ID = '1390033258821062760'; // informações do registro

export async function registroHandler(client, interaction) {
    // Envia o modal quando o botão é clicado
    if (interaction.isButton() && interaction.customId === 'open_modal') {
        const modal = new ModalBuilder()
            .setCustomId('registration_modal')
            .setTitle('Formulário de Registro');
        // ... adiciona os TextInputBuilder aqui
        await interaction.showModal(modal);
    }

    // Quando o usuário envia o formulário
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'registration_modal') {
        const nome = interaction.fields.getTextInputValue('nome');
        const idJogo = interaction.fields.getTextInputValue('id_jogo');
        const login = interaction.fields.getTextInputValue('login');

        try {
            await interaction.member.setNickname(`DPF » ${nome} (${idJogo})`);
        } catch (err) {
            console.error('Erro ao mudar apelido:', err);
        }

        // Embed com informações do usuário
        const embed = new EmbedBuilder()
            .setTitle('<:iconepf:1399436333071728730> NOVO REGISTRO')
            .setColor(0xFFD700)
            .addFields(
                { name: '<:iconepf:1399436333071728730> NOME', value: `<@${interaction.user.id}>`, inline: false },
                { name: '<:iconepf:1399436333071728730> LOGIN', value: login, inline: false },
                { name: '<:iconepf:1399436333071728730> ID', value: idJogo, inline: false },
                { name: '<:iconepf:1399436333071728730> TAG', value: 'DPF - DRP', inline: false }
            )
            .setFooter({ text: 'DPF - DRP' });

        // Envia o embed com informações para o canal de registro de usuários
        const infoChannel = await client.channels.fetch(USER_INFO_CHANNEL_ID);
        if (infoChannel) await infoChannel.send({ embeds: [embed] });

        // Salva no Google Sheets
        await registrarUsuario(interaction.user.id, nome, idJogo, login);

        // Confirma para o usuário
        await interaction.reply({ content: 'Registro realizado com sucesso!', ephemeral: true });
    }
}

// Enviar o painel de botões para o canal do painel (painel de registro)
export async function sendRegistroPanel(client) {
    const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
    if (!panelChannel) return console.error('Canal do painel não encontrado.');

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('open_modal')
            .setLabel('Registrar-se')
            .setStyle(ButtonStyle.Primary)
    );

    const embedPanel = new EmbedBuilder()
        .setTitle('Painel de Registro')
        .setDescription('Clique no botão abaixo para se registrar!')
        .setColor(0x00FF00);

    await panelChannel.send({ embeds: [embedPanel], components: [row] });
}
