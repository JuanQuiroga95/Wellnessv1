import { neon } from '@neondatabase/serverless';
import { loadEnvConfig } from '@next/env';
import { schema } from './src/lib/db';

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  console.log('Running migrations...');
  for (const q of schema) {
    try {
      await sql(q);
      console.log('OK');
    } catch (e) {
      console.error('Error on query:', e.message);
    }
  }
  console.log('Done!');
}

run().catch(console.error);
