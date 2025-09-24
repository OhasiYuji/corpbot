// utils/format.js

// Formata a data/hora para o formato brasileiro (00:00)
export function formatTime(date) {
    return date.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Formata timestamp completo (opcional para Discord `<t:...:t>`)
export function formatTimestamp(date) {
    const unix = Math.floor(date.getTime() / 1000);
    return `<t:${unix}:t>`;
}
