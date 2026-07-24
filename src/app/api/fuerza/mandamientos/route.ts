export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

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

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sql = getDb()
    
    // Auto-migrate tables to guarantee they exist without manual user action
    try {
      await sql`CREATE TABLE IF NOT EXISTS fuerza_mandamientos (
        id SERIAL PRIMARY KEY,
        numero INTEGER NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL
      )`;
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
      try { await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS imagen_url TEXT`; } catch(e) {}
      try { await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS descripcion TEXT`; } catch(e) {}
      try { await sql`ALTER TABLE fuerza_ejercicios ADD COLUMN IF NOT EXISTS mandamiento_id INTEGER REFERENCES fuerza_mandamientos(id) ON DELETE SET NULL`; } catch(e) {}
    } catch (migErr) {
      console.error('[Migration Error]', migErr);
    }
    
    // Check if empty
    let mandamientos = await sql`SELECT * FROM fuerza_mandamientos ORDER BY numero ASC`
    
    if (mandamientos.length === 0) {
      // Initialize
      for (const m of MANDAMIENTOS_DEFAULT) {
        await sql`
          INSERT INTO fuerza_mandamientos (numero, nombre) 
          VALUES (${m.numero}, ${m.nombre})
          ON CONFLICT (numero) DO NOTHING
        `
      }
      mandamientos = await sql`SELECT * FROM fuerza_mandamientos ORDER BY numero ASC`
    }

    return NextResponse.json({ success: true, mandamientos })
  } catch (err) {
    console.error('[GET /api/fuerza/mandamientos]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { numero, nombre } = await req.json()
    if (!numero || !nombre) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const sql = getDb()
    
    // Auto-migrate tables to guarantee they exist without manual user action
    try {
      await sql`CREATE TABLE IF NOT EXISTS fuerza_mandamientos (
        id SERIAL PRIMARY KEY,
        numero INTEGER NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL
      )`;
    } catch (migErr) {
      console.error('[Migration Error in POST]', migErr);
    }

    await sql`
      INSERT INTO fuerza_mandamientos (numero, nombre) 
      VALUES (${numero}, ${nombre})
      ON CONFLICT (numero) DO UPDATE SET nombre = EXCLUDED.nombre
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/fuerza/mandamientos]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const sql = getDb()
    await sql`DELETE FROM fuerza_mandamientos WHERE id = ${id}`

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/fuerza/mandamientos]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
