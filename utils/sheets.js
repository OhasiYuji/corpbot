import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Converte valores da planilha para minutos
function parseToMinutes(value) {
  const s = String(value || '').trim();
  if (!s) return 0;
  if (!isNaN(s)) return Math.round(parseFloat(s) * 60); // assume decimal horas
  return 0;
}

export async function registrarUsuario(userId, nome, idJogo, login) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F',
      valueInputOption: 'RAW',
      requestBody: { values: [[userId, nome, idJogo, login, 0, 0]] }
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
  }
}

export async function atualizarHorasUsuario(userId, minutosAdicionados) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });
    const values = res.data.values || [];
    const rowIndex = values.findIndex(r => r[0] === userId);
    if (rowIndex === -1) return null;

    const atual = parseInt(values[rowIndex][5] || '0', 10);
    const total = atual + minutosAdicionados;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!F${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(total)]] }
    });

    return total;
  } catch (err) {
    console.error('Erro ao atualizar horas:', err);
    return null;
  }
}

export async function getUsuario(userId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });
    const values = res.data.values || [];
    const row = values.find(r => r[0] === userId);
    if (!row) return null;
    return { userId: row[0], nome: row[1], idJogo: row[2], login: row[3], minutos: parseInt(row[5] || '0', 10) };
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return null;
  }
}

export async function getUsuariosTodos() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });
    return res.data.values?.map(r => ({ userId: r[0], nome: r[1], idJogo: r[2], login: r[3], minutos: parseInt(r[5] || '0', 10) })) || [];
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    return [];
  }
}

export async function getCargos() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'cargos!A:C'
    });
    const rows = res.data.values || [];
    return rows.slice(1).map(r => ({
      nome: r[0],
      roleId: r[1],
      minutos: Math.round(parseFloat(r[2] || '0') * 60)
    }));
  } catch (err) {
    console.error('Erro ao buscar cargos:', err);
    return [];
  }
}
