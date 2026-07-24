import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = neon(process.env.DATABASE_URL!);
async function run() {
  console.log('Running...');
  await sql`CREATE TABLE IF NOT EXISTS fuerza_mandamientos (id SERIAL PRIMARY KEY, numero INTEGER NOT NULL UNIQUE, nombre VARCHAR(255) NOT NULL)`;
  await sql`CREATE TABLE IF NOT EXISTS fuerza_ejercicios (id SERIAL PRIMARY KEY, club_id INTEGER, nombre VARCHAR(255) NOT NULL, url_video TEXT, categoria VARCHAR(100), created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS fuerza_rutinas (id SERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL, club_id INTEGER, fecha DATE NOT NULL DEFAULT CURRENT_DATE, mandamiento_id INTEGER NOT NULL, ejercicio_id INTEGER NOT NULL, series INTEGER, repeticiones INTEGER, peso VARCHAR(50), rpe VARCHAR(50), orden INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW())`;
  console.log('Done!');
}
run().catch(console.error);
