// utils/sheets.js
import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const CREDENTIALS = JSON.parse(fs.readFileSync(process.env.GOOGLE_CREDENTIALS_PATH));

const auth = new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

export async function registrarUsuario(userId, nome, idJogo, login) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'usuarios!A:D',
            valueInputOption: 'RAW',
            requestBody: {
                values: [[userId, nome, idJogo, login, 0, 0]] // Sexta coluna é horas acumuladas
            }
        });
    } catch (err) {
        console.error('Erro ao registrar usuário:', err);
    }
}

export async function atualizarHorasUsuario(userId, horas, minutos) {
    try {
        // Pega todos os usuários
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'usuarios!A:F'
        });

        const values = res.data.values || [];
        const rowIndex = values.findIndex(row => row[0] === userId);

        if (rowIndex === -1) {
            console.error('Usuário não encontrado para atualizar horas');
            return;
        }

        // Coluna F (index 5) é horas acumuladas
        const current = parseFloat(values[rowIndex][5] || 0);
        const totalHoras = current + horas + minutos / 60;

        // Atualiza a célula
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `usuarios!F${rowIndex + 1}`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [[totalHoras.toFixed(2)]]
            }
        });
    } catch (err) {
        console.error('Erro ao atualizar horas do usuário:', err);
    }
}
