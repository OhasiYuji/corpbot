import { GoogleSpreadsheet } from 'google-spreadsheet';
import 'dotenv/config';

const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
await doc.useServiceAccountAuth({
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
});

await doc.loadInfo();

const sheet = doc.sheetsByTitle['usuarios']; // sua aba de usuários

export async function getUsuariosTodos() {
  await sheet.loadCells();
  const rows = await sheet.getRows();
  return rows.map(r => ({
    userId: r.id_discord,
    nome: r.nome,
    minutos: parseInt(r.minutos) || 0,
  }));
}

export async function getUsuario(userId) {
  const rows = await sheet.getRows();
  const row = rows.find(r => r.id_discord === userId);
  if (!row) return null;
  return {
    userId: row.id_discord,
    nome: row.nome,
    minutos: parseInt(row.minutos) || 0,
  };
}

export async function atualizarHorasUsuario(userId, minutos) {
  const rows = await sheet.getRows();
  let row = rows.find(r => r.id_discord === userId);
  if (!row) {
    row = await sheet.addRow({ id_discord: userId, minutos });
    return minutos;
  }
  row.minutos = parseInt(row.minutos || 0) + minutos;
  await row.save();
  return row.minutos;
}
