import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from './src/lib/db';

async function run() {
  const sql = getDb();
  await sql`DELETE FROM gps_logs`;
  console.log('gps_logs cleared');
  process.exit(0);
}
run();
