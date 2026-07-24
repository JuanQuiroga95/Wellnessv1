const { getDb } = require('./src/lib/db.ts');
(async () => {
  const sql = getDb();
  const res = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sesiones_plan'`;
  console.log(res);
  process.exit();
})();
