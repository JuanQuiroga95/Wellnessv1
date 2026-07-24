import { getDb } from './src/lib/db';
async function run() {
  const sql = getDb();
  const res = await sql`SELECT DISTINCT objetivo, tipo FROM sesiones_plan LIMIT 20`;
  console.log(res);
  process.exit(0);
}
run();
