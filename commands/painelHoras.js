// commands/painelHoras.js
import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  EmbedBuilder
} from 'discord.js';
import { getUsuariosTodos, atualizarHorasUsuario, getCargosFromEnvOrFile } from '../utils/sheets.js';

const PANEL_CHANNEL_ID = process.env.PANEL_CHANNEL_ID || '1390160577095012433';
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID || '1390033256640024591';
const UP_CHANNEL_ID = '1390033257533542417'; // Canal onde vai logar o upamento
const ICON = '<:Policiafederallogo:1399436333071728730>';

function loadMetas() {
  if (process.env.METAS_JSON) {
    try { return JSON.parse(process.env.METAS_JSON); } catch { return []; }
  }
  const metasPath = path.join(process.cwd(), 'data', 'metas.json');
  if (fs.existsSync(metasPath)) {
    try { return JSON.parse(fs.readFileSync(metasPath, 'utf8')); } catch { return []; }
  }
  try {
    const fromSheets = getCargosFromEnvOrFile();
    return Array.isArray(fromSheets) ? fromSheets : [];
  } catch {
    return [];
  }
}
const metas = loadMetas();

export async function sendPainelHoras(client) {
  const panelChannel = await client.channels.fetch(PANEL_CHANNEL_ID).catch(() => null);
  if (!panelChannel) return;

  const embed = new EmbedBuilder()
    .setTitle(`${ICON} Painel de Horas`)
    .setDescription('Use os botões abaixo (somente administradores).')
    .setColor(0xFFD700);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('consultar_horas').setLabel('Consultar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('adicionar_horas').setLabel('Adicionar Horas').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('remover_horas').setLabel('Remover Horas').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('limpar_horas').setLabel('Limpar Horas').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('upar_manual').setLabel('Upar').setStyle(ButtonStyle.Primary)
  );

  await panelChannel.send({ embeds: [embed], components: [row] }).catch(console.error);
}

export async function painelHorasHandler(client, interaction) {
  try {
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    if (interaction.isButton() && !interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: 'Você não tem permissão.', flags: 64 });
    }

    // BOTÕES
    if (interaction.isButton()) {
// Função auxiliar para converter minutos em formato "Hh Mm"
function formatarMinutos(totalMinutos) {
    if (typeof totalMinutos !== 'number' || totalMinutos < 0) {
        return '0m';
    }
    
    // Calcula as horas e os minutos restantes
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    let partes = [];
    if (horas > 0) {
        partes.push(`${horas}h`);
    }
    if (minutos > 0 || totalMinutos === 0) { // Garante que 0 minutos seja exibido como 0m
        partes.push(`${minutos}m`);
    }
    
    // Se for 0 total, retorna '0h 0m' ou apenas '0m' dependendo da preferência.
    // Aqui, preferimos a representação completa se não for zero, ou '0m' se for.
    if (totalMinutos === 0) return '0m'; 
    
    return partes.join(' ');
}


// A sua lógica dentro do listener de interações
if (interaction.customId === 'consultar_horas') {
    await interaction.deferReply({ flags: 64 });
    const usuarios = await getUsuariosTodos(); // Assume que retorna [{ userId: '...', minutos: N, nome: '...' }, ...]
    
    if (!usuarios || !usuarios.length) {
        return interaction.editReply({ content: 'Nenhum usuário registrado.' });
    }

    // 1. ORDENAR os usuários em ordem decrescente (do maior número de minutos para o menor)
    const usuariosRankeados = usuarios.sort((a, b) => b.minutos - a.minutos);

    const embed = new EmbedBuilder()
        .setTitle(`${ICON} Ranking de Horas`) // Título mais apropriado
        .setColor(0x00FF00);

    // 2. ITERAR E FORMATAR: Itera a lista ORDENADA e formata o tempo.
    
    if (usuariosRankeados.length <= 25) { // Aumentei um pouco para aproveitar melhor os fields
        usuariosRankeados.forEach((u, index) => {
            const tempoFormatado = formatarMinutos(u.minutos);
            const rank = index + 1;
            
            // Exemplo: '1. @Nome — **5h 30m** (330 minutos)'
            embed.addFields({ 
                name: `${rank}. ${u.nome || u.userId}`, 
                value: `<@${u.userId}> — **${tempoFormatado}** (${u.minutos} minutos)`, 
                inline: false 
            });
        });
        
    } else {
        // Se a lista for muito longa, usa a descrição
        const rankingText = usuariosRankeados.map((u, index) => {
            const tempoFormatado = formatarMinutos(u.minutos);
            const rank = index + 1;
            
            // Exemplo: '1. <@ID> — **5h 30m** (330 minutos)'
            return `${rank}. <@${u.userId}> — **${tempoFormatado}** (${u.minutos}m)`;
        }).join('\n');
        
        embed.setDescription(rankingText);
    }
    
    return interaction.editReply({ embeds: [embed] });
}

      // ADICIONAR / REMOVER
      if (interaction.customId === 'adicionar_horas' || interaction.customId === 'remover_horas') {
        const modal = new ModalBuilder()
          .setCustomId(interaction.customId + '_modal')
          .setTitle(interaction.customId === 'adicionar_horas' ? 'Adicionar Horas' : 'Remover Horas');

        const userInput = new TextInputBuilder()
          .setCustomId('user_id')
          .setLabel('ID do Usuário')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const minutosInput = new TextInputBuilder()
          .setCustomId('minutos')
          .setLabel('Minutos')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(userInput),
          new ActionRowBuilder().addComponents(minutosInput)
        );

        return interaction.showModal(modal);
      }

      // LIMPAR HORAS
      if (interaction.customId === 'limpar_horas') {
        await interaction.deferReply({ flags: 64 });
        const usuarios = await getUsuariosTodos();
        for (const u of usuarios) {
          await atualizarHorasUsuario(u.userId, -u.minutos);
        }
        return interaction.editReply({ content: 'Todas as horas foram zeradas.' });
      }

      // UPAR MANUAL
      if (interaction.customId === 'upar_manual') {
        const modal = new ModalBuilder()
          .setCustomId('upar_manual_modal')
          .setTitle('Upamento Manual');

        const userInput = new TextInputBuilder()
          .setCustomId('user')
          .setLabel('Usuário (menção ou nome)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const roleInput = new TextInputBuilder()
          .setCustomId('new_role')
          .setLabel('Novo Cargo (nome do cargo)')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const motivoInput = new TextInputBuilder()
          .setCustomId('motivo')
          .setLabel('Motivo')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(userInput),
          new ActionRowBuilder().addComponents(roleInput),
          new ActionRowBuilder().addComponents(motivoInput)
        );

        return interaction.showModal(modal);
      }
    }

    // MODALS
    if (interaction.type === InteractionType.ModalSubmit) {
      // ADICIONAR / REMOVER HORAS
      if (interaction.customId === 'adicionar_horas_modal' || interaction.customId === 'remover_horas_modal') {
        await interaction.deferReply({ flags: 64 });

        const userId = interaction.fields.getTextInputValue('user_id');
        const minutosRaw = interaction.fields.getTextInputValue('minutos');
        const minutos = parseInt(minutosRaw, 10);
        if (isNaN(minutos)) return interaction.editReply({ content: 'Minutos inválidos.' });

        const delta = interaction.customId.startsWith('adicionar') ? minutos : -minutos;
        const total = await atualizarHorasUsuario(userId, delta);
        return interaction.editReply({ content: `${ICON} Horas atualizadas. Total: ${total} minutos.` });
      }

      // UPAR MANUAL
      if (interaction.customId === 'upar_manual_modal') {
        await interaction.deferReply({ flags: 64 });

        const userInput = interaction.fields.getTextInputValue('user');
        const roleInput = interaction.fields.getTextInputValue('new_role');
        const motivo = interaction.fields.getTextInputValue('motivo');

        // Pegar membro
        const member = interaction.guild.members.cache.find(m =>
          m.user.tag === userInput.replace('@', '') ||
          m.displayName.toLowerCase() === userInput.toLowerCase() ||
          `<@${m.id}>` === userInput
        );
        if (!member) return interaction.editReply({ content: 'Usuário não encontrado.' });

        // Cargo antigo (maior cargo que ele já tem)
        const oldRole = member.roles.highest;

        // Novo cargo pelo nome
        const newRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
        if (!newRole) return interaction.editReply({ content: 'Cargo não encontrado.' });

        // Adicionar cargo
        await member.roles.add(newRole).catch(console.error);

        // Canal de log
        const logChannel = await interaction.guild.channels.fetch(UP_CHANNEL_ID).catch(() => null);
        if (logChannel) {
          await logChannel.send(
            `DPF - UPAMENTO ${ICON}\n\n` +
            `Membro: <@${member.id}>\n` +
            `Cargo antigo: <@&${oldRole.id}>\n` +
            `Novo cargo: <@&${newRole.id}>\n` +
            `Motivo : ${motivo}`
          );
        }

        return interaction.editReply({ content: `Upamento concluído para <@${member.id}>!` });
      }
    }
  } catch (err) {
    console.error('painelHorasHandler error:', err);
    try {
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: 'Erro ao processar.' });
      } else {
        return interaction.reply({ content: 'Erro ao processar.', flags: 64 });
      }
    } catch (e) {
      console.error('Double error replying to interaction:', e);
    }
  }
}
