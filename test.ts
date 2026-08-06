import { getDb } from './src/lib/db.js';

async function test() {
  try {
    const sql = getDb();
    const res = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('usuarios', 'clubes', 'suscripciones')
    `;
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
