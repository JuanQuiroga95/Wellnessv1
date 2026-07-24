export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    let errors: any[] = [];
    try {
      await sql`CREATE TABLE IF NOT EXISTS fuerza_mandamientos (
        id SERIAL PRIMARY KEY,
        numero INTEGER NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL
      )`;
    } catch(e) { errors.push({step: 'create_mandamientos', error: String(e)}) }
    
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
    } catch(e) { errors.push({step: 'create_ejercicios', error: String(e)}) }
    
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
    } catch(e) { errors.push({step: 'create_rutinas', error: String(e)}) }
    
    try {
      await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS imagen_url TEXT`;
    } catch(e) { errors.push({step: 'alter_ej_imagen', error: String(e)}) }
    
    try {
      await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS descripcion TEXT`;
    } catch(e) { errors.push({step: 'alter_ej_desc', error: String(e)}) }
    
    try {
      await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS mandamiento_id INTEGER REFERENCES fuerza_mandamientos(id) ON DELETE SET NULL`;
    } catch(e) { errors.push({step: 'alter_ej_mand', error: String(e)}) }
    
    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors })
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
