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
const ICON = '<:medalha:1407068603299139786>';

// ... (o resto do seu código inicial continua o mesmo, sem alterações)
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

// --- MUDANÇAS COMEÇAM AQUI ---

/**
 * Função auxiliar que divide um texto longo em pedaços menores que o limite,
 * tentando não quebrar as linhas no meio.
 */
function dividirMensagem(texto, limite) {
    const linhas = texto.split('\n');
    const pedacos = [];
    let pedacoAtual = '';

    for (const linha of linhas) {
        // Verifica se adicionar a próxima linha vai estourar o limite
        if (pedacoAtual.length + linha.length + 1 > limite) {
            // Se for estourar, guardamos o pedaço que já montamos
            if (pedacoAtual.length > 0) pedacos.push(pedacoAtual);
            // E começamos um novo pedaço com a linha atual
            pedacoAtual = linha + '\n';
        } else {
            // Se ainda couber, só adicionamos a linha no pedaço atual
            pedacoAtual += linha + '\n';
        }
    }

    // Não esquecer de guardar o último pedaço que sobrou
    if (pedacoAtual.length > 0) {
        pedacos.push(pedacoAtual);
    }

    return pedacos;
}


export async function painelHorasHandler(client, interaction) {
  try {
    if (!interaction.isButton() && interaction.type !== InteractionType.ModalSubmit) return;

    if (interaction.isButton() && !interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
      return interaction.reply({ content: 'Você não tem permissão.', ephemeral: true }); // Usando ephemeral para discrição
    }

    // BOTÕES
    if (interaction.isButton()) {
        
      // Lógica de consultar horas agora usa a divisão de mensagens
      if (interaction.customId === 'consultar_horas') {
        await interaction.deferReply({ ephemeral: true });
        const usuarios = await getUsuariosTodos(); 
        
        if (!usuarios || !usuarios.length) {
            return interaction.editReply({ content: 'Nenhum usuário registrado.' });
        }

        const usuariosRankeados = usuarios.sort((a, b) => b.minutos - a.minutos);
        
        // Criamos o texto completo do ranking
        let rankingText = `🏆 **Ranking de Horas** 🏆\n\n`;
        rankingText += usuariosRankeados.map((u, index) => {
            const tempoFormatado = formatarMinutos(u.minutos);
            const rank = index + 1;
            return `${rank}. <@${u.userId}> — **${tempoFormatado}** (${u.minutos}m)`;
        }).join('\n');
        
        const LIMITE_POR_MENSAGEM = 2000;

        if (rankingText.length <= LIMITE_POR_MENSAGEM) {
            // Se couber em uma mensagem, envia e pronto.
            return interaction.editReply({ content: rankingText });
        } else {
            // Se não couber, divide e envia em partes.
            const pedacosDeMensagem = dividirMensagem(rankingText, LIMITE_POR_MENSAGEM);
            
            // Envia a primeira parte com editReply (obrigatório após deferReply)
            await interaction.editReply({ content: pedacosDeMensagem[0] });

            // Envia o resto com followUp
            for (let i = 1; i < pedacosDeMensagem.length; i++) {
                await interaction.followUp({ content: pedacosDeMensagem[i], ephemeral: true });
            }
            return; // Encerra a execução aqui
        }
      }

      // ... (O resto do seu código de botões continua aqui, sem alterações)
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
        await interaction.deferReply({ ephemeral: true });
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

    // ... (O resto do seu código de MODALS continua aqui, sem alterações)
    if (interaction.type === InteractionType.ModalSubmit) {
      // ADICIONAR / REMOVER HORAS
      if (interaction.customId === 'adicionar_horas_modal' || interaction.customId === 'remover_horas_modal') {
        await interaction.deferReply({ ephemeral: true });

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
        await interaction.deferReply({ ephemeral: true });

        const userInput = interaction.fields.getTextInputValue('user');
        const roleInput = interaction.fields.getTextInputValue('new_role');
        const motivo = interaction.fields.getTextInputValue('motivo');

        const member = interaction.guild.members.cache.find(m =>
          m.user.tag === userInput.replace('@', '') ||
          m.displayName.toLowerCase() === userInput.toLowerCase() ||
          `<@${m.id}>` === userInput
        );
        if (!member) return interaction.editReply({ content: 'Usuário não encontrado.' });

        const oldRole = member.roles.highest;
        const newRole = interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
        if (!newRole) return interaction.editReply({ content: 'Cargo não encontrado.' });

        await member.roles.add(newRole).catch(console.error);

        const logChannel = await interaction.guild.channels.fetch(UP_CHANNEL_ID).catch(() => null);
        if (logChannel) {
          await logChannel.send(
            `PMMG - UPAMENTO ${ICON}\n\n` +
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
        return interaction.reply({ content: 'Erro ao processar.', ephemeral: true });
      }
    } catch (e) {
      console.error('Double error replying to interaction:', e);
    }
  }
}

// A função formatarMinutos deve ser movida para fora do handler principal
// para ser uma função de utilidade no escopo do arquivo.
function formatarMinutos(totalMinutos) {
  if (typeof totalMinutos !== 'number' || totalMinutos < 0) {
      return '0m';
  }
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  let partes = [];
  if (horas > 0) partes.push(`${horas}h`);
  if (minutos > 0 || totalMinutos === 0) partes.push(`${minutos}m`);
  if (totalMinutos === 0) return '0m'; 
  return partes.join(' ');
}

