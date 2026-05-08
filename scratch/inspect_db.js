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
      SELECT id, club_id, fecha::text, tipo_sesion, sesion_id 
      FROM gps_logs 
      WHERE fecha = '2026-05-01'
    `;
    console.log('--- GPS_LOGS FOR 2026-05-01 ---');
    console.table(samples);

    const clubIds = await sql`SELECT DISTINCT club_id FROM gps_logs`;
    console.log('--- DISTINCT CLUB_IDS ---');
    console.log(clubIds);
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
