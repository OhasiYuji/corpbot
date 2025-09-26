import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType
} from 'discord.js';
import { getUsuariosTodos, atualizarHorasUsuario } from '../utils/sheets.js';
import fs from 'fs';
import path from 'path';

const PANEL_CHANNEL_ID = '1390160577095012433';
const ADMIN_ROLE_ID = '1390033256640024591';
const ICON = ':Policiafederallogo:';

const metasPath = path.resolve('./data/metas.json');
const metas = JSON.parse(fs.readFileSync(metasPath, 'utf-8'));

export async function sendPainelHoras(client) {
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID);
  if (!panelChannel) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('consultar_horas').setLabel('Consultar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('adicionar_horas').setLabel('Adicionar Horas').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('remover_horas').setLabel('Remover Horas').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('limpar_horas').setLabel('Limpar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('up_automatico').setLabel('Up Automático').setStyle(ButtonStyle.Primary)
  );

  await panelChannel.send({ content: `${ICON} Painel de Horas - Interaja com os botões abaixo:`, components: [row] });
}

export async function painelHorasHandler(client, interaction) {
  if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
    return interaction.reply({ content: 'Você não tem permissão para usar este painel.', ephemeral: true });
  }

  if (interaction.isButton()) {
    // Consultar
    if (interaction.customId === 'consultar_horas') {
      const usuarios = await getUsuariosTodos();
      if (!usuarios.length) return interaction.reply({ content: 'Nenhum usuário registrado.', ephemeral: true });

      const texto = usuarios.map(u => `<@${u.userId}>: ${u.minutos} minutos`).join('\n');
      return interaction.reply({ content: `${ICON} **Horas dos Usuários:**\n${texto}`, ephemeral: true });
    }

    // Adicionar/Remover
    if (interaction.customId === 'adicionar_horas' || interaction.customId === 'remover_horas') {
      const modal = new ModalBuilder().setCustomId(`${interaction.customId}_modal`)
        .setTitle(interaction.customId === 'adicionar_horas' ? 'Adicionar Horas' : 'Remover Horas');

      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('user_id').setLabel('ID do Usuário').setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(new TextInputBuilder()
          .setCustomId('minutos').setLabel('Minutos').setStyle(TextInputStyle.Short).setRequired(true)
        )
      );

      await interaction.showModal(modal);
    }

    // Limpar horas
    if (interaction.customId === 'limpar_horas') {
      const usuarios = await getUsuariosTodos();
      for (const u of usuarios) {
        await atualizarHorasUsuario(u.userId, -u.minutos);
      }
      return interaction.reply({ content: 'Todas as horas foram zeradas.', ephemeral: true });
    }

    // Up automático
    if (interaction.customId === 'up_automatico') {
      const usuarios = await getUsuariosTodos();
      let mensagem = '';

      for (const u of usuarios) {
        const elegiveis = metas.filter(c => u.minutos >= c.minutos);
        if (elegiveis.length) {
          const top = elegiveis.sort((a,b)=>b.minutos - a.minutos)[0];
          mensagem += `<@${u.userId}> atingiu a meta de ${top.minutos} minutos: up para **${top.nome}**\n`;
        }
      }

      if (!mensagem) mensagem = 'Ninguém atingiu a meta.';
      return interaction.reply({ content: mensagem, ephemeral: true });
    }
  }

  // Modal submit
  if (interaction.type === InteractionType.ModalSubmit) {
    const userId = interaction.fields.getTextInputValue('user_id');
    const minutos = parseInt(interaction.fields.getTextInputValue('minutos'), 10);
    if (isNaN(minutos)) return interaction.reply({ content: 'Minutos inválidos.', ephemeral: true });

    const total = await atualizarHorasUsuario(userId, interaction.customId.startsWith('adicionar') ? minutos : -minutos);
    return interaction.reply({ content: `Horas atualizadas. Total: ${total} minutos.`, ephemeral: true });
  }
}
