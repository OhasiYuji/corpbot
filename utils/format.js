// utils/format.js
import { DateTime } from 'luxon';

export function formatTimeBR(date = new Date()) {
    return DateTime.fromJSDate(date)
        .setZone('America/Sao_Paulo')
        .toFormat('HH:mm');
}

export function formatTimestampBR(date = new Date()) {
    return Math.floor(DateTime.fromJSDate(date)
        .setZone('America/Sao_Paulo')
        .toSeconds());
}
