// utils/sheets.js
import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
if (!SPREADSHEET_ID) throw new Error('Missing SPREADSHEET_ID env variable');

let CREDENTIALS = null;
try {
  const raw = process.env.GOOGLE_CREDENTIALS || process.env.SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_CREDENTIALS env var not set');
  CREDENTIALS = JSON.parse(raw);
} catch (err) {
  console.error('Failed to parse GOOGLE_CREDENTIALS env var:', err);
  throw err;
}

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// Helper: detect if first row is header
function looksLikeHeader(firstRow = []) {
  return firstRow.some(cell =>
    typeof cell === 'string' && /id|nome|minutos|login|advertencia/i.test(cell)
  );
}

function rowToUser(row = []) {
  return {
    userId: row[0]?.toString() || '',
    nome: row[1] || '',
    idEmJogo: row[2] || '',
    login: row[3] || '',
    advertencia: parseInt(row[4] || '0', 10) || 0,
    minutos: parseInt(row[5] || '0', 10) || 0
  };
}

export async function getUsuariosTodos() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });
    const values = res.data.values || [];
    if (!values.length) return [];
    const header = values[0];
    const start = looksLikeHeader(header) ? 1 : 0;
    const dataRows = values.slice(start);
    return dataRows.map(rowToUser);
  } catch (err) {
    console.error('getUsuariosTodos error:', err);
    return [];
  }
}

export async function getUsuario(userId) {
  try {
    const usuarios = await getUsuariosTodos();
    return usuarios.find(u => u.userId === userId) || null;
  } catch (err) {
    console.error('getUsuario error:', err);
    return null;
  }
}

export async function atualizarHorasUsuario(userId, minutosDelta) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });
    const values = res.data.values || [];
    const start = looksLikeHeader(values[0] || []) ? 1 : 0;
    const data = values.slice(start);

    const idx = data.findIndex(r => r[0]?.toString() === userId);

    if (idx === -1) {
      const initial = Math.max(0, minutosDelta);
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'usuarios!A:F',
        valueInputOption: 'RAW',
        requestBody: { values: [[userId, '', '', '', '0', String(initial)]] }
      });
      return initial;
    }

    const absoluteRow = start + idx + 1;
    const current = parseInt(data[idx][5] || '0', 10) || 0;
    let updated = current + minutosDelta;
    if (updated < 0) updated = 0;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!F${absoluteRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(updated)]] }
    });

    return updated;
  } catch (err) {
    console.error('atualizarHorasUsuario error:', err);
    return null;
  }
}

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
    console.error('registrarUsuario error:', err);
    return null;
  }
}

export function getCargosFromEnvOrFile() {
  try {
    if (process.env.METAS_JSON) {
      const parsed = JSON.parse(process.env.METAS_JSON);
      return Array.isArray(parsed) ? parsed : [];
    }
    const metasPath = path.join(process.cwd(), 'data', 'metas.json');
    if (fs.existsSync(metasPath)) {
      const parsed = JSON.parse(fs.readFileSync(metasPath, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (err) {
    console.error('getCargosFromEnvOrFile error:', err);
    return [];
  }
}

export function getCargos() {
  return getCargosFromEnvOrFile();
}
