export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// Allow large bodies for rival_foto base64
export const maxDuration = 30

// Local-date helper: avoids UTC-midnight shift from localToday()
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const jid = searchParams.get('jugadorId')
  const desde = searchParams.get('desde') || '2024-01-01'
  const hasta = searchParams.get('hasta') || localToday()
  // hastaInc: +1 día para inclusividad total del día "hasta" con el driver Neon
  const hastaInc = (() => {
    const d = new Date(hasta + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().split('T')[0]
  })()
  const sql = getDb()

  if (!jid) {
    // No player filter — return all partido_logs as before
    const r = await sql`SELECT pl.id, pl.jugador_id::int, pl.fecha::text, pl.rival, pl.tipo_partido, pl.minutos::int, pl.titular, pl.rival_foto
                        FROM partido_logs pl JOIN jugadores j ON j.id = pl.jugador_id
                        JOIN usuarios u ON u.id = j.usuario_id
                        WHERE pl.fecha >= ${desde}::date AND pl.fecha < ${hastaInc}::date
                          AND u.activo = true
                        ORDER BY pl.fecha DESC`
    return NextResponse.json(r)
  }

  // For a specific player: get their partido_logs + calendar partidos not yet assigned
  const [logs, calPartidos] = await Promise.all([
    sql`SELECT pl.id, pl.jugador_id::int, pl.fecha::text, pl.rival, pl.tipo_partido,
               pl.minutos::int, pl.titular, pl.rival_foto
        FROM partido_logs pl
        WHERE pl.jugador_id = ${jid} AND pl.fecha >= ${desde}::date AND pl.fecha < ${hastaInc}::date
        ORDER BY pl.fecha DESC`,
    sql`SELECT sp.id AS sesion_id, sp.fecha::text, sp.rival, sp.rival_foto,
               sp.titulo, sp.hora_inicio::text, sp.hora_fin::text
        FROM sesiones_plan sp
        WHERE sp.tipo = 'partido'
          AND (sp.club_id = ${s.clubId ? Number(s.clubId) : null} OR (sp.admin_id = ${s.userId} AND sp.club_id IS NULL))
          AND sp.fecha >= ${desde}::date AND sp.fecha < ${hastaInc}::date
          AND NOT EXISTS (
            SELECT 1 FROM partido_logs pl
            WHERE pl.jugador_id = ${jid}
              AND pl.fecha = sp.fecha
              AND (pl.rival = sp.rival OR sp.rival IS NULL)
          )
        ORDER BY sp.fecha DESC`
  ])

  // Combine: existing logs first, then pending calendar partidos
  const result = [
    ...(logs as any[]).map(r => ({ ...r, sin_minutos: false })),
    ...(calPartidos as any[]).map(r => ({
      id: null,
      sesion_id: r.sesion_id,
      jugador_id: Number(jid),
      fecha: r.fecha,
      rival: r.rival,
      rival_foto: r.rival_foto,
      tipo_partido: r.titulo || 'Partido',
      minutos: null,
      titular: null,
      sin_minutos: true,
    }))
  ]
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { jugador_id, fecha, rival, tipo_partido, minutos, titular, notas, rival_foto } = await req.json()
  const sql = getDb()
  const d = fecha || localToday()
  const clubId = s.clubId ? Number(s.clubId) : null
  const [r] = await sql`INSERT INTO partido_logs(jugador_id, fecha, rival, tipo_partido, minutos, titular, notas, rival_foto, club_id)
    VALUES(${jugador_id}, ${d}, ${rival||null}, ${tipo_partido||'Oficial'}, ${minutos||0}, ${titular!==false}, ${notas||null}, ${rival_foto||null}, ${clubId})
    RETURNING id, fecha::text`
  return NextResponse.json(r)
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null
  // Only allow deleting logs that belong to this club
  await sql`DELETE FROM partido_logs 
    WHERE id = ${id} 
      AND (${s.rol === 'master_admin'}::boolean 
           OR jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId}))`
  return NextResponse.json({ ok: true })
}
