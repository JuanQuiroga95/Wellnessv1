require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  try {
    const stats = await sql`SELECT COUNT(*) as c, MIN(fecha) as min_fecha, MAX(fecha) as max_fecha FROM entrenamiento_logs`;
    console.log('STATS:', stats);
    const latest = await sql`SELECT * FROM entrenamiento_logs ORDER BY fecha DESC LIMIT 5`;
    console.log('LATEST:', latest);
  } catch(e) {
    console.error(e);
  }
}
main();
