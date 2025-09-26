import { GoogleSpreadsheet } from 'google-spreadsheet';
import 'dotenv/config';

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
});
await doc.loadInfo();

const usuariosSheet = doc.sheetsByTitle['usuarios'];
const metasSheet = doc.sheetsByTitle['metas'];
const cargosSheet = doc.sheetsByTitle['cargos'];

// Registrar novo usuário
export async function registrarUsuario(userId, nome, idJogo, login) {
    await usuariosSheet.loadCells('A:F');
    const rows = await usuariosSheet.getRows();
    const existing = rows.find(r => r.id_discord === userId);
    if (existing) return; // não duplica

    await usuariosSheet.addRow({
        id_discord: userId,
        nome,
        id_em_jogo: idJogo,
        login,
        advertencia: 0,
        minutos: 0
    });
}

// Pegar todos os usuários
export async function getUsuariosTodos() {
    await usuariosSheet.loadCells('A:F');
    const rows = await usuariosSheet.getRows();
    return rows.map(r => ({
        userId: r.id_discord,
        nome: r.nome,
        idJogo: r.id_em_jogo,
        login: r.login,
        totalMinutes: parseInt(r.minutos, 10) || 0
    }));
}

// Atualizar minutos de um usuário
export async function atualizarHorasUsuario(userId, minutos) {
    const rows = await usuariosSheet.getRows();
    const userRow = rows.find(r => r.id_discord === userId);
    if (!userRow) return false;
    userRow.minutos = parseInt(userRow.minutos || 0) + minutos;
    await userRow.save();
    return true;
}

// Setar horas de um usuário (para remover/zerar)
export async function setHorasUsuario(userId, minutos) {
    const rows = await usuariosSheet.getRows();
    const userRow = rows.find(r => r.id_discord === userId);
    if (!userRow) return false;
    userRow.minutos = minutos;
    await userRow.save();
    return true;
}

// Buscar cargos
export async function getCargos() {
    const rows = await cargosSheet.getRows();
    return rows.map(r => ({ nome: r.nome, cargoId: r.cargo_id }));
}

// Buscar metas
export async function getMetas() {
    const rows = await metasSheet.getRows();
    return rows.map(r => ({ nome: r.nome, minutos: parseInt(r.minutos, 10) || 0 }));
}
