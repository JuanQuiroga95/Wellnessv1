const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const rows = await sql`
      SELECT id, fecha, tipo_sesion, sesion_id, club_id 
      FROM gps_logs 
      WHERE fecha = '2026-05-01'
    `;
    console.log('Rows for 2026-05-01:');
    console.table(rows);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
