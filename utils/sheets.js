// utils/sheets.js
import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

// Converte valor da planilha para minutos
function parseStoredToMinutes(value) {
  const s = String(value || '').trim();
  if (!s) return 0;

  const num = parseFloat(s.replace(',', '.'));
  if (isNaN(num)) return 0;

  return Math.round(num); // já estamos usando apenas minutos
}

// Função auxiliar para atualizar minutos do usuário
export async function atualizarHorasUsuario(userId, horas, minutos) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const values = res.data.values || [];
    const rowIndex = values.findIndex(row => row[0] === userId);
    if (rowIndex === -1) {
      console.error('Usuário não encontrado para atualizar horas');
      return null;
    }

    const rowNumber = rowIndex + 1;
    const newTotalMinutes = (parseInt(horas, 10) || 0) * 60 + (parseInt(minutos, 10) || 0);

    // Atualiza coluna F com minutos
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!F${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(newTotalMinutes)]] }
    });

    return { totalMinutes: newTotalMinutes };
  } catch (err) {
    console.error('Erro ao atualizar horas do usuário:', err);
    return null;
  }
}

// Registrar novo usuário
export async function registrarUsuario(userId, nome, idJogo, login) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[userId, nome, idJogo, login, 0, 0]] // F = minutos
      }
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
  }
}

// Buscar um usuário específico
export async function getUsuario(userId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const values = res.data.values || [];
    const row = values.find(r => r[0] === userId);
    if (!row) return null;

    const totalMinutes = parseStoredToMinutes(row[5] || '0');
    return {
      userId: row[0],
      nome: row[1],
      idJogo: row[2],
      login: row[3],
      totalMinutes,
      hoursFloat: totalMinutes / 60
    };
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return null;
  }
}

// Buscar todos os usuários (para painel de horas)
export async function getUsuariosTodos() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const values = res.data.values || [];
    return values.map(r => ({
      userId: r[0],
      nome: r[1],
      totalMinutes: parseStoredToMinutes(r[5] || '0')
    }));
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    return [];
  }
}

// Buscar cargos e metas
export async function getCargos() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'cargos!A:C'
    });

    const rows = res.data.values || [];
    const start = (rows[0] && rows[0][1] && rows[0][1].match(/^\d+$/)) ? 0 : 1;

    const cargos = rows.slice(start).map(row => {
      const nome = row[0];
      const roleId = row[1];
      const horas = parseFloat((row[2] || '0').toString().replace(',', '.')) || 0;
      const minutesNeeded = Math.round(horas * 60);
      return { nome, roleId, hours: horas, minutes: minutesNeeded };
    });

    cargos.sort((a, b) => a.minutes - b.minutes);
    return cargos;
  } catch (err) {
    console.error('Erro ao buscar cargos:', err);
    return [];
  }
}
