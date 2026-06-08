import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from './src/lib/db.ts';

async function check() {
  const sql = getDb();
  const logs = await sql`
    SELECT id, jugador_id, club_id, fecha::text, sesion_id, tipo_sesion
    FROM gps_logs
    WHERE fecha >= '2026-04-01' AND fecha <= '2026-05-31'
    ORDER BY fecha DESC
  `;
  console.log("GPS Logs in date range:", logs);

  const sesiones = await sql`
    SELECT id, club_id, fecha::text, tipo, titulo, rival
    FROM sesiones_plan
    WHERE fecha >= '2026-04-01' AND fecha <= '2026-05-31'
      AND (objetivo ILIKE '%Partido%' OR tipo ILIKE '%partido%')
  `;
  console.log("Matches in date range:", sesiones);
  
  process.exit(0);
}

check();
