export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const jugadorId = Number(req.nextUrl.searchParams.get('jugador_id'))
  if (!jugadorId) return NextResponse.json({ error: 'jugador_id requerido' }, { status: 400 })
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM dsi_tests
    WHERE jugador_id = ${jugadorId}
      AND (${s.clubId ? Number(s.clubId) : null}::int IS NULL OR club_id = ${s.clubId ? Number(s.clubId) : null})
    ORDER BY fecha DESC, id DESC`
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const { jugador_id, fecha, fuerza_balistico_n, fuerza_isometrico_n, notas } = b
  if (!jugador_id || !fuerza_balistico_n || !fuerza_isometrico_n) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  const sql = getDb()
  if (s.clubId) {
    const owns = await sql`
      SELECT 1 FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id
      WHERE j.id = ${jugador_id} AND u.club_id = ${s.clubId} LIMIT 1`
    if (!owns.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  await sql`INSERT INTO dsi_tests (jugador_id, club_id, fecha, fuerza_balistico_n, fuerza_isometrico_n, notas)
    VALUES (${jugador_id}, ${s.clubId ? Number(s.clubId) : null}, ${fecha}, ${fuerza_balistico_n}, ${fuerza_isometrico_n}, ${notas ?? null})`
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
