import { GoogleSpreadsheet } from 'google-spreadsheet';
import { readFileSync } from 'fs';
import path from 'path';

// Configuração da planilha
const SPREADSHEET_ID = 'SUA_PLANILHA_ID';
const CREDENTIALS = JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'service-account.json'), 'utf8'));
const SHEET_NAME = 'usuarios';

const doc = new GoogleSpreadsheet(SPREADSHEET_ID);

async function loadSheet() {
  await doc.useServiceAccountAuth(CREDENTIALS);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle[SHEET_NAME];
  if (!sheet) throw new Error(`Aba "${SHEET_NAME}" não encontrada`);
  return sheet;
}

// Retorna todos os usuários
export async function getUsuariosTodos() {
  const sheet = await loadSheet();
  await sheet.loadCells();
  const rows = await sheet.getRows();
  return rows.map(r => ({
    userId: r.id_discord,
    nome: r.nome,
    idEmJogo: r.id_em_jogo,
    login: r.login,
    advertencia: parseInt(r.advertencia) || 0,
    minutos: parseInt(r.minutos) || 0
  }));
}

// Atualiza minutos do usuário (pode ser positivo ou negativo)
export async function atualizarHorasUsuario(userId, minutos) {
  const sheet = await loadSheet();
  const rows = await sheet.getRows();
  let usuario = rows.find(r => r.id_discord === userId);

  if (!usuario) {
    // Se não existir, registra com minutos iniciais
    usuario = await sheet.addRow({
      id_discord: userId,
      nome: 'Desconhecido',
      id_em_jogo: '',
      login: '',
      advertencia: 0,
      minutos: minutos
    });
    return usuario.minutos;
  }

  usuario.minutos = (parseInt(usuario.minutos) || 0) + minutos;
  await usuario.save();
  return usuario.minutos;
}

// Registra novo usuário
export async function registrarUsuario(userId, nome, idEmJogo, login) {
  const sheet = await loadSheet();
  const rows = await sheet.getRows();
  const existe = rows.find(r => r.id_discord === userId);
  if (existe) return false; // Já registrado

  await sheet.addRow({
    id_discord: userId,
    nome: nome || 'Desconhecido',
    id_em_jogo: idEmJogo || '',
    login: login || '',
    advertencia: 0,
    minutos: 0
  });
  return true;
}
