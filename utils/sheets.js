// utils/sheets.js
import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || process.env.SHEET_ID;
if (!SPREADSHEET_ID) throw new Error('Missing SPREADSHEET_ID env var');

let CREDENTIALS;
try {
  CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS || process.env.SERVICE_ACCOUNT_JSON || '{}');
} catch (err) {
  console.error('Erro parse GOOGLE_CREDENTIALS:', err);
  CREDENTIALS = null;
}
if (!CREDENTIALS || !CREDENTIALS.client_email) {
  console.warn('Atenção: GOOGLE_CREDENTIALS parece inválido — verifique a variável de ambiente.');
}

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// helper: normalize cell rows -> objects (assume header row exists)
function rowsToUsers(values = []) {
  // If first row appears to be header (contains non-id strings), try to skip or adapt.
  // We will assume rows are data rows with columns:
  // A=id discord, B=nome, C=id_em_jogo, D=login, E=advertencia, F=minutos
  return (values || []).map(row => ({
    userId: row[0]?.toString() || '',
    nome: row[1] || '',
    idEmJogo: row[2] || '',
    login: row[3] || '',
    advertencia: parseInt(row[4] || '0', 10) || 0,
    minutos: parseInt(row[5] || '0', 10) || 0
  }));
}

export async function getUsuariosTodos() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });
    const values = res.data.values || [];
    // If first row is header, detect and skip
    const first = values[0] || [];
    const looksLikeHeader = first.some(cell => typeof cell === 'string' && /id|nome|minutos|login/i.test(cell));
    const dataRows = looksLikeHeader ? values.slice(1) : values;
    return rowsToUsers(dataRows);
  } catch (err) {
    console.error('Erro em getUsuariosTodos:', err);
    return [];
  }
}

export async function getUsuario(userId) {
  try {
    const usuarios = await getUsuariosTodos();
    return usuarios.find(u => u.userId === userId) || null;
  } catch (err) {
    console.error('Erro em getUsuario:', err);
    return null;
  }
}

/**
 * Atualiza minutos do usuário:
 * - se user existir: soma minutos (minutos pode ser negativo)
 * - se não existir: adiciona nova linha com minutos (nome será vazio se não informado)
 * Retorna o novo total de minutos (number) ou null em erro.
 */
export async function atualizarHorasUsuario(userId, minutos) {
  try {
    // fetch all rows so we can find row index
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });
    const values = res.data.values || [];
    const first = values[0] || [];
    const looksLikeHeader = first.some(cell => typeof cell === 'string' && /id|nome|minutos|login/i.test(cell));
    const dataStartIndex = looksLikeHeader ? 1 : 0;

    // find row index
    const rowIndex = values.slice(dataStartIndex).findIndex(r => r[0]?.toString() === userId);
    if (rowIndex === -1) {
      // append new row (we will keep header untouched)
      const newRow = [userId, '', '', '', '0', String(Math.max(0, minutos))];
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'usuarios!A:F',
        valueInputOption: 'RAW',
        requestBody: { values: [newRow] }
      });
      return Math.max(0, minutos);
    }

    const absoluteRowNumber = dataStartIndex + rowIndex + 1; // 1-indexed row number in sheet
    const currentMinutes = parseInt(values[dataStartIndex + rowIndex][5] || '0', 10) || 0;
    let newTotal = currentMinutes + minutos;
    if (newTotal < 0) newTotal = 0;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!F${absoluteRowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(newTotal)]] }
    });

    // Optionally also update H (HH:MM) if you used it before — omitted by request
    return newTotal;
  } catch (err) {
    console.error('Erro em atualizarHorasUsuario:', err);
    return null;
  }
}

/**
 * registrarUsuario: cria um novo usuário se não existir.
 * retorna true se criado, false se já existia, null em erro.
 */
export async function registrarUsuario(userId, nome = '', idEmJogo = '', login = '') {
  try {
    const usuarios = await getUsuariosTodos();
    if (usuarios.find(u => u.userId === userId)) return false;
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F',
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, nome, idEmJogo, login, '0', '0']] }
    });
    return true;
  } catch (err) {
    console.error('Erro em registrarUsuario:', err);
    return null;
  }
}

/**
 * getCargos lê metas do env METAS_JSON (string) ou do arquivo ./data/metas.json se existir.
 * Retorna array [{nome, roleId, minutos}]
 */
import fs from 'fs';
import path from 'path';

export function getCargosFromSource() {
  try {
    if (process.env.METAS_JSON) {
      return JSON.parse(process.env.METAS_JSON);
    }
    const metasPath = path.join(process.cwd(), 'data', 'metas.json');
    if (fs.existsSync(metasPath)) {
      return JSON.parse(fs.readFileSync(metasPath, 'utf8'));
    }
    return [];
  } catch (err) {
    console.error('Erro ao ler METAS JSON:', err);
    return [];
  }
}

export function getCargos() {
  // returns array in memory (synchronous) to avoid repeated fs reads in hot loops
  return getCargosFromSource();
}
