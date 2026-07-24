import { config } from 'dotenv';
config({ path: '.env.local' });
import { getDb } from './src/lib/db';

async function run() {
  const sql = getDb();
  const res = await sql`SELECT u.nombre FROM jugadores j JOIN usuarios u ON j.usuario_id = u.id`;
  console.log(res);
  process.exit(0);
}
run();
