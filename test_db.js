const Database = require('better-sqlite3');
const db = new Database('wellness.db');

const rows = db.prepare("SELECT fecha, titulo, tipo FROM sesiones_plan WHERE fecha >= '2026-05-05' AND fecha <= '2026-07-28' ORDER BY fecha").all();
console.log('Sesiones:', rows.length);
