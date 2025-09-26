// utils/sheets.js
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

  if (s.includes(':')) {
    const [hs, ms] = s.split(':').map(x => parseInt(x, 10) || 0);
    return hs * 60 + ms;
  }

  const num = parseFloat(s.replace(',', '.'));
  if (isNaN(num)) return 0;

  if (s.includes('.') || s.includes(',')) {
    return Math.round(num * 60); // horas decimais
  }

  if (Number.isInteger(num)) {
    if (num <= 24) return Math.round(num * 60); // "3" → 180 min
    return Math.round(num); // assume minutos
  }

  return Math.round(num * 60);
}

function minutesToHHMM(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

export async function registrarUsuario(userId, nome, idJogo, login) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:H',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[userId, nome, idJogo, login, 0, 0, '0', '0:00']], 
        // A=userId, B=nome, C=idJogo, D=login, E=?, F=horasAntigas, G=minutos, H=HH:MM
      }
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
  }
}

export async function atualizarHorasUsuario(userId, horas, minutos) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:H'
    });

    const values = res.data.values || [];
    const rowIndex = values.findIndex(row => row[0] === userId);
    if (rowIndex === -1) {
      console.error('Usuário não encontrado para atualizar horas');
      return null;
    }

    const stored = values[rowIndex][6] || values[rowIndex][5] || '0'; // tenta G (minutos) ou F (antigo)
    const currentMinutes = parseStoredToMinutes(stored);

    const added = (parseInt(horas, 10) || 0) * 60 + (parseInt(minutos, 10) || 0);
    const newTotalMinutes = currentMinutes + added;

    const rowNumber = rowIndex + 1;

    // grava minutos inteiros na coluna G
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!G${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[String(newTotalMinutes)]] }
    });

    // grava HH:MM na coluna H
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!H${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[minutesToHHMM(newTotalMinutes)]] }
    });

    return { totalMinutes: newTotalMinutes, formatted: minutesToHHMM(newTotalMinutes) };
  } catch (err) {
    console.error('Erro ao atualizar horas do usuário:', err);
    return null;
  }
}

export async function getUsuario(userId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:H'
    });
    const values = res.data.values || [];
    const row = values.find(r => r[0] === userId);
    if (!row) return null;

    const totalMinutes = parseStoredToMinutes(row[6] || row[5] || '0');
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
