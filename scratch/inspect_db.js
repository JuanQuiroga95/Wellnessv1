const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function run() {
  try {
    const tableInfo = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'gps_logs'
    `;
    console.log('--- GPS_LOGS COLUMNS ---');
    console.table(tableInfo);

    const samples = await sql`
      SELECT id, club_id, fecha, tipo_sesion, sesion_id 
      FROM gps_logs 
      WHERE fecha = '2026-05-01'
      ORDER BY id DESC 
    `;
    console.log('--- GPS_LOGS FOR 2026-05-01 ---');
    console.table(samples);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
