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
    SELECT * FROM rsi_tests
    WHERE jugador_id = ${jugadorId}
      AND (${s.clubId ? Number(s.clubId) : null}::int IS NULL OR club_id = ${s.clubId ? Number(s.clubId) : null})
    ORDER BY fecha DESC, id DESC`
  if (rows.length > 0 && !rows.some((r: any) => r.es_baseline)) {
    const oldest = rows[rows.length - 1] as any
    await sql`UPDATE rsi_tests SET es_baseline = TRUE WHERE id = ${oldest.id}`
    oldest.es_baseline = true
  }
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const { jugador_id, fecha, altura_cm, contacto_ms, notas } = b
  if (!jugador_id || !altura_cm || !contacto_ms) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  const sql = getDb()
  if (s.clubId) {
    const owns = await sql`
      SELECT 1 FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id
      WHERE j.id = ${jugador_id} AND u.club_id = ${s.clubId} LIMIT 1`
    if (!owns.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const existing = await sql`SELECT COUNT(*) AS cnt FROM rsi_tests WHERE jugador_id = ${jugador_id}`
  const isFirst = Number((existing[0] as any).cnt) === 0
  await sql`INSERT INTO rsi_tests (jugador_id, club_id, fecha, altura_cm, contacto_ms, notas, es_baseline)
    VALUES (${jugador_id}, ${s.clubId ? Number(s.clubId) : null}, ${fecha}, ${altura_cm}, ${contacto_ms}, ${notas ?? null}, ${isFirst})`
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  await sql`DELETE FROM rsi_tests WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
