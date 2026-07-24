const { getDb } = require('./src/lib/db')
const sql = getDb()

async function check() {
  try {
    const rows = await sql`
      SELECT id, fecha, tipo_sesion, sesion_id, club_id 
      FROM gps_logs 
      ORDER BY id DESC 
      LIMIT 10
    `
    console.log('Last 10 GPS logs:')
    console.table(rows.map(r => ({
      ...r,
      fecha_type: typeof r.fecha,
      fecha_val: r.fecha
    })))
  } catch (e) {
    console.error(e)
  } finally {
    process.exit()
  }
}

check()
