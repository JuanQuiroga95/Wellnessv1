const { getDb } = require('./src/lib/db')
async function run() {
  const sql = getDb()
  const res = await sql`SELECT fue_gimnasio FROM wellness_logs ORDER BY id DESC LIMIT 5`
  console.log(res)
}
run().then(() => process.exit())
