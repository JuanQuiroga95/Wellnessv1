export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

async function ensureTable(sql: any) {
  await sql`CREATE TABLE IF NOT EXISTS dsi_tests (
    id SERIAL PRIMARY KEY,
    jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
    club_id INTEGER,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    fuerza_balistico_n NUMERIC(8,2) NOT NULL,
    fuerza_isometrico_n NUMERIC(8,2) NOT NULL,
    dsi NUMERIC(6,4) GENERATED ALWAYS AS (ROUND(fuerza_balistico_n / NULLIF(fuerza_isometrico_n, 0), 4)) STORED,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
  await sql`CREATE INDEX IF NOT EXISTS idx_dsi_jugador ON dsi_tests(jugador_id, fecha DESC)`
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const jugadorId = Number(req.nextUrl.searchParams.get('jugador_id'))
  if (!jugadorId) return NextResponse.json({ error: 'jugador_id requerido' }, { status: 400 })
  const sql = getDb()
  await ensureTable(sql)
  const rows = await sql`SELECT * FROM dsi_tests WHERE jugador_id = ${jugadorId} ORDER BY fecha DESC, id DESC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const { jugador_id, fecha, fuerza_balistico_n, fuerza_isometrico_n, notas } = b
  if (!jugador_id || !fuerza_balistico_n || !fuerza_isometrico_n) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  const sql = getDb()
  await ensureTable(sql)
  await sql`INSERT INTO dsi_tests (jugador_id, club_id, fecha, fuerza_balistico_n, fuerza_isometrico_n, notas)
    VALUES (${jugador_id}, ${s.clubId ?? null}, ${fecha}, ${fuerza_balistico_n}, ${fuerza_isometrico_n}, ${notas ?? null})`
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  await sql`DELETE FROM dsi_tests WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
