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
    return Math.round(num * 60); // assume todas as horas em decimal → minutos
}

export async function registrarUsuario(userId, nome, idJogo, login) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'usuarios!A:F',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[userId, nome, idJogo, login, 0, 0]]
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

        const currentMinutes = parseInt(values[rowIndex][5] || '0', 10);
        const newMinutes = Math.max(0, currentMinutes + minutos);

        const rowNumber = rowIndex + 1;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `usuarios!F${rowNumber}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[String(newMinutes)]] }
        });

        return { totalMinutes: newMinutes };
    } catch (err) {
        console.error('Erro ao atualizar horas do usuário:', err);
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

        return {
            userId: row[0],
            nome: row[1],
            idJogo: row[2],
            login: row[3],
            totalMinutes: parseInt(row[5] || '0', 10)
        };
    } catch (err) {
        console.error('Erro ao buscar usuário:', err);
        return null;
    }
}

// NOVA: retorna todos os usuários
export async function getTodosUsuarios() {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'usuarios!A:F'
        });
        const values = res.data.values || [];
        return values.map(row => ({
            userId: row[0],
            nome: row[1],
            idJogo: row[2],
            login: row[3],
            totalMinutes: parseInt(row[5] || '0', 10)
        }));
    } catch (err) {
        console.error('Erro ao buscar todos os usuários:', err);
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
        return rows.slice(1).map(row => ({
            nome: row[0],
            roleId: row[1],
            minutes: Math.round((parseFloat((row[2] || '0').replace(',', '.')) || 0) * 60)
        }));
    } catch (err) {
        console.error('Erro ao buscar cargos:', err);
        return [];
    }
}
