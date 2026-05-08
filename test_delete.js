const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    // Check if it exists
    const rows = await sql`
      SELECT id, fecha, tipo_sesion, sesion_id, club_id 
      FROM gps_logs 
      WHERE fecha = '2026-05-01' AND tipo_sesion = 'partido' AND sesion_id IS NULL
    `;
    console.log('Matching rows before delete:', rows.length);
    
    if (rows.length > 0) {
      const del = await sql`
        DELETE FROM gps_logs 
        WHERE fecha = '2026-05-01' AND tipo_sesion = 'partido' AND sesion_id IS NULL
      `;
      console.log('Deleted rows:', del.count);
    }
  } catch (e) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
