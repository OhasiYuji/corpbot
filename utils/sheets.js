import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

function parseStoredToMinutes(value) {
  const s = String(value || '').trim();
  if (!s) return 0;
  const num = parseFloat(s.replace(',', '.'));
  if (isNaN(num)) return 0;
  return Math.round(num); // armazenamos **somente minutos**
}

export async function registrarUsuario(userId, nome, idJogo, login) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[userId, nome, idJogo, login, 0, 0]], 
        // A=userId, B=nome, C=idJogo, D=login, E=? F=totalMinutes
      }
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
  }
}

export async function atualizarHorasUsuario(userId, minutos) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const values = res.data.values || [];
    const rowIndex = values.findIndex(row => row[0] === userId);
    if (rowIndex === -1) return null;

    const currentMinutes = parseStoredToMinutes(values[rowIndex][5]);
    const newTotal = currentMinutes + minutos;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!F${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(newTotal)]] }
    });

    return newTotal;
  } catch (err) {
    console.error('Erro ao atualizar horas do usuário:', err);
    return null;
  }
}

export async function setHorasUsuario(userId, minutos) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const values = res.data.values || [];
    const rowIndex = values.findIndex(row => row[0] === userId);
    if (rowIndex === -1) return null;

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!F${rowIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(minutos)]] }
    });

    return minutos;
  } catch (err) {
    console.error('Erro ao setar horas do usuário:', err);
    return null;
  }
}

export async function getUsuario(userId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const row = (res.data.values || []).find(r => r[0] === userId);
    if (!row) return null;

    return {
      userId: row[0],
      nome: row[1],
      idJogo: row[2],
      login: row[3],
      totalMinutes: parseStoredToMinutes(row[5]),
    };
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return null;
  }
}

export async function getUsuarios() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    return (res.data.values || []).slice(1).map(r => ({
      userId: r[0],
      nome: r[1],
      idJogo: r[2],
      login: r[3],
      totalMinutes: parseStoredToMinutes(r[5])
    }));
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
    const cargos = rows.slice(1).map(row => {
      const nome = row[0];
      const roleId = row[1];
      const horas = parseFloat((row[2] || '0').toString().replace(',', '.')) || 0;
      return { nome, roleId, minutes: Math.round(horas * 60) };
    });

    cargos.sort((a, b) => a.minutes - b.minutes);
    return cargos;
  } catch (err) {
    console.error('Erro ao buscar cargos:', err);
    return [];
  }
}
