import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  
  const stmts = [
    `ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS imagen_url TEXT`,
    `ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS descripcion TEXT`,
    `ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS mandamiento_id INTEGER REFERENCES fuerza_mandamientos(id) ON DELETE SET NULL`
  ];

  for (const s of stmts) {
    try {
      console.log('Running:', s);
      await sql(s);
      console.log('Success');
    } catch (err: any) {
      if (!String(err).includes('already exists') && !String(err).includes('column "imagen_url" of relation "fuerza_ejercicios" already exists')) {
        console.error('Error:', err);
      } else {
        console.log('Already exists, skipping');
      }
    }
  }
}

run();
