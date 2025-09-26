import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

const sheets = google.sheets({ version: 'v4', auth });

function parseStoredToMinutes(value) {
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

export async function registrarUsuario(userId, nome, idJogo, login) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[userId, nome, idJogo, login, 0, 0]] // A=userId, B=nome, C=idJogo, D=login, E=?, F=totalMinutos
      }
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

    const atual = parseStoredToMinutes(values[rowIndex][5] || '0');
    const total = atual + (parseInt(minutosAdicionados, 10) || 0);

    const rowNumber = rowIndex + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `usuarios!F${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[total]] }
    });

    return { totalMinutes: total };
  } catch (err) {
    console.error('Erro ao atualizar horas:', err);
    return null;
  }
}

export async function getUsuarios() {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const values = res.data.values || [];
    return values.slice(1).map(r => ({
      userId: r[0],
      nome: r[1],
      idJogo: r[2],
      login: r[3],
      totalMinutes: parseStoredToMinutes(r[5] || '0')
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
    const cargos = rows.slice(1).map(r => ({
      nome: r[0],
      roleId: r[1],
      minutes: Math.round(parseFloat(r[2].replace(',', '.')) * 60 || 0)
    }));
    cargos.sort((a, b) => a.minutes - b.minutes);
    return cargos;
  } catch (err) {
    console.error('Erro ao buscar cargos:', err);
    return [];
  }
}
