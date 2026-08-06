import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log('Running migrations for Selección mode...');
  
  await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS es_seleccion BOOLEAN DEFAULT FALSE`;
  console.log('Added es_seleccion to clubs');
  
  await sql`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS club_origen VARCHAR(100)`;
  console.log('Added club_origen to jugadores');
  
  await sql`ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS observaciones TEXT`;
  console.log('Added observaciones to entrenamiento_logs');
  
  console.log('Done!');
}

run().catch(console.error);
