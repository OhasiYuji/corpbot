import 'dotenv/config';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const auth = new google.auth.GoogleAuth({
  credentials: CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Registra um novo usuário na planilha.
 * Inicializa a coluna F (minutos) com 0.
 */
export async function registrarUsuario(userId, nome, idJogo, login) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[userId, nome, idJogo, login, 0, 0]] // A=userId, B=nome, C=idJogo, D=login, E=?, F=minutos
      }
    });
  } catch (err) {
    console.error('Erro ao registrar usuário:', err);
  }
}

/**
 * Atualiza os minutos de um usuário na coluna F.
 */
export async function atualizarHorasUsuario(userId, minutosAdicionados) {
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

    const currentMinutes = parseInt(values[rowIndex][5] || '0', 10); // coluna F
    const newTotalMinutes = currentMinutes + minutosAdicionados;
    const rowNumber = rowIndex + 1;

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

/**
 * Busca os dados de um usuário.
 */
export async function getUsuario(userId) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'usuarios!A:F'
    });

    const values = res.data.values || [];
    const row = values.find(r => r[0] === userId);
    if (!row) return null;

    const totalMinutes = parseInt(row[5] || '0', 10); // coluna F
    return {
      userId: row[0],
      nome: row[1],
      idJogo: row[2],
      login: row[3],
      totalMinutes
    };
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    return null;
  }
}

/**
 * Busca os cargos/metas da planilha.
 */
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
      const minutesNeeded = parseInt(row[2], 10) || 0; // coluna de metas já em minutos
      return { nome, roleId, minutes: minutesNeeded };
    });

    cargos.sort((a, b) => a.minutes - b.minutes);
    return cargos;
  } catch (err) {
    console.error('Erro ao buscar cargos:', err);
    return [];
  }
}
