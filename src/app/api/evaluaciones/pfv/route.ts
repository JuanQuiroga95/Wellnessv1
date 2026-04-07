export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

async function ensureTables(sql: any) {
  await sql`CREATE TABLE IF NOT EXISTS pfv_sesiones (
    id SERIAL PRIMARY KEY,
    jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    club_id INTEGER,
    nombre VARCHAR(100) NOT NULL DEFAULT 'Sesión',
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS pfv_puntos (
    id SERIAL PRIMARY KEY,
    sesion_id INTEGER NOT NULL REFERENCES pfv_sesiones(id) ON DELETE CASCADE,
    jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    carga_kg NUMERIC(6,2) NOT NULL,
    velocidad_ms NUMERIC(5,3) NOT NULL,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_pfv_puntos_sesion ON pfv_puntos(sesion_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_pfv_sesiones_jugador ON pfv_sesiones(jugador_id)`
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const jugadorId = Number(req.nextUrl.searchParams.get('jugador_id'))
  if (!jugadorId) return NextResponse.json({ error: 'jugador_id requerido' }, { status: 400 })
  const sql = getDb()
  await ensureTables(sql)
  const sesiones = await sql`SELECT * FROM pfv_sesiones WHERE jugador_id = ${jugadorId} ORDER BY fecha DESC, id DESC`
  const result = await Promise.all(sesiones.map(async (ses: any) => {
    const puntos = await sql`SELECT * FROM pfv_puntos WHERE sesion_id = ${ses.id} ORDER BY carga_kg ASC`
    return {
      sesion_id: ses.id,
      nombre: ses.nombre,
      fecha: ses.fecha,
      puntos: puntos.map((p: any) => ({ id: p.id, carga: Number(p.carga_kg), vel: Number(p.velocidad_ms), notas: p.notas })),
    }
  }))
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const { jugador_id, sesion_id, fecha, carga_kg, velocidad_ms, notas } = b
  if (!jugador_id || !sesion_id || !carga_kg || !velocidad_ms) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  const sql = getDb()
  await ensureTables(sql)
  await sql`INSERT INTO pfv_puntos (sesion_id, jugador_id, fecha, carga_kg, velocidad_ms, notas)
    VALUES (${sesion_id}, ${jugador_id}, ${fecha}, ${carga_kg}, ${velocidad_ms}, ${notas ?? null})`
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  await sql`DELETE FROM pfv_puntos WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
