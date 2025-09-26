import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
if (!SPREADSHEET_ID) throw new Error('Missing SPREADSHEET_ID env variable');

let CREDENTIALS = null;
try {
  const raw = process.env.GOOGLE_CREDENTIALS || process.env.SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_CREDENTIALS env var not set');

  // Substitui os \n literais por quebras de linha reais (importante para Railway)
  const fixed = raw.replace(/\\n/g, '\n');
  CREDENTIALS = JSON.parse(fixed);
} catch (err) {
  console.error('Failed to parse GOOGLE_CREDENTIALS env var:', err);
  throw err;
}

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

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
    const start = looksLikeHeader(values[0]) ? 1 : 0;
    return values.slice(start).map(rowToUser);
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
