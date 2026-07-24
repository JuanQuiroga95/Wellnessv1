require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function main() {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) {
      console.log('No DATABASE_URL found');
      return;
    }
    const sql = neon(url);
    await sql`ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS horas_sueno NUMERIC(4,2)`;
    console.log('Added horas_sueno to wellness_logs');
    await sql`ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS rpe_gimnasio INTEGER`;
    console.log('Added rpe_gimnasio to entrenamiento_logs');
  } catch (err) {
    console.error(err);
  }
}

main();
