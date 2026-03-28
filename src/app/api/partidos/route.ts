import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const jid = searchParams.get('jugadorId')
  const desde = searchParams.get('desde') || '2024-01-01'
  const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
  const sql = getDb()
  const r = jid
    ? await sql`SELECT pl.id, pl.jugador_id::int, pl.fecha::text, pl.rival, pl.tipo_partido, pl.minutos::int, pl.titular, pl.rival_foto
                FROM partido_logs pl JOIN jugadores j ON j.id = pl.jugador_id
                WHERE pl.jugador_id = ${jid} AND pl.fecha BETWEEN ${desde} AND ${hasta}
                ORDER BY pl.fecha DESC`
    : await sql`SELECT pl.id, pl.jugador_id::int, pl.fecha::text, pl.rival, pl.tipo_partido, pl.minutos::int, pl.titular, pl.rival_foto
                FROM partido_logs pl JOIN jugadores j ON j.id = pl.jugador_id
                WHERE pl.fecha BETWEEN ${desde} AND ${hasta}
                ORDER BY pl.fecha DESC`
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { jugador_id, fecha, rival, tipo_partido, minutos, titular, notas, rival_foto } = await req.json()
  const sql = getDb()
  const d = fecha || new Date().toISOString().split('T')[0]
  const [r] = await sql`INSERT INTO partido_logs(jugador_id, fecha, rival, tipo_partido, minutos, titular, notas, rival_foto)
    VALUES(${jugador_id}, ${d}, ${rival||null}, ${tipo_partido||'Oficial'}, ${minutos||0}, ${titular!==false}, ${notas||null}, ${rival_foto||null})
    RETURNING id, fecha::text`
  return NextResponse.json(r)
}
