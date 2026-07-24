import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL found");
    return;
  }
  const sql = neon(process.env.DATABASE_URL);
  
  console.log("Creating tables...");
  try {
    await sql`CREATE TABLE IF NOT EXISTS fuerza_mandamientos (
      id SERIAL PRIMARY KEY,
      numero INTEGER NOT NULL UNIQUE,
      nombre VARCHAR(255) NOT NULL
    )`;
    console.log("Created fuerza_mandamientos");
  } catch(e) { console.error("Error mandamientos:", e); }

  try {
    await sql`CREATE TABLE IF NOT EXISTS fuerza_ejercicios (
      id SERIAL PRIMARY KEY,
      club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
      nombre VARCHAR(255) NOT NULL,
      url_video TEXT,
      categoria VARCHAR(100),
      mandamiento_id INTEGER REFERENCES fuerza_mandamientos(id) ON DELETE SET NULL,
      imagen_url TEXT,
      descripcion TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    console.log("Created fuerza_ejercicios");
  } catch(e) { console.error("Error ejercicios:", e); }

  try {
    await sql`CREATE TABLE IF NOT EXISTS fuerza_rutinas (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      mandamiento_id INTEGER NOT NULL REFERENCES fuerza_mandamientos(id) ON DELETE RESTRICT,
      ejercicio_id INTEGER NOT NULL REFERENCES fuerza_ejercicios(id) ON DELETE CASCADE,
      series INTEGER,
      repeticiones INTEGER,
      peso VARCHAR(50),
      rpe VARCHAR(50),
      orden INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
    console.log("Created fuerza_rutinas");
  } catch(e) { console.error("Error rutinas:", e); }

  try {
    await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS imagen_url TEXT`;
  } catch(e) {}
  try {
    await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS descripcion TEXT`;
  } catch(e) {}
  try {
    await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS mandamiento_id INTEGER REFERENCES fuerza_mandamientos(id) ON DELETE SET NULL`;
  } catch(e) {}

  console.log("Checking if mandamientos exist...");
  try {
    const res = await sql`SELECT * FROM fuerza_mandamientos`;
    console.log("Mandamientos count:", res.length);
    if (res.length === 0) {
        console.log("Seeding mandamientos...");
        const MANDAMIENTOS_DEFAULT = [
          { numero: 1, nombre: 'Preparación Articular (Movilidad)' },
          { numero: 2, nombre: 'Potencia y Reactividad (Balísticos y CEA)' },
          { numero: 3, nombre: 'Tracción (Fuerza Posterior/Escapular)' },
          { numero: 4, nombre: 'Empuje (Fuerza Anterior)' },
          { numero: 5, nombre: 'Excéntricos (Control de Carga y Prevención)' },
          { numero: 6, nombre: 'Isométricos (Resiliencia Estructural)' },
          { numero: 7, nombre: 'Estabilidad Estática (Anti-movimiento/Core)' },
          { numero: 8, nombre: 'Estabilidad Dinámica (Transferencia de Fuerzas)' },
          { numero: 9, nombre: 'Coordinación y Transferencia Propioceptiva (Integración Sensoriomotora)' },
          { numero: 10, nombre: 'Recuperación y Mantenimiento Tisular (Work Capacity / Recovery)' }
        ];
        for (const m of MANDAMIENTOS_DEFAULT) {
            await sql`
              INSERT INTO fuerza_mandamientos (numero, nombre) 
              VALUES (${m.numero}, ${m.nombre})
              ON CONFLICT (numero) DO NOTHING
            `
        }
        console.log("Seeded successfully.");
    }
  } catch (e) {
    console.error("Error querying mandamientos:", e);
  }
}

run().catch(console.error);
