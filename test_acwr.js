const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  try {
    const res = await pool.query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('week', el.fecha), 'YYYY-MM-DD') AS semana,
        ROUND(AVG(el.carga_ua)::numeric, 2) AS avg_carga
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.fecha >= CURRENT_DATE - 365
        AND u.activo = true
      GROUP BY DATE_TRUNC('week', el.fecha)
      ORDER BY DATE_TRUNC('week', el.fecha) ASC
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

main();
