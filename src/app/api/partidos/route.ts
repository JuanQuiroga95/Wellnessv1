export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// Allow large bodies for rival_foto base64
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const jid = searchParams.get('jugadorId')
  const desde = searchParams.get('desde') || '2024-01-01'
  const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
  const sql = getDb()

  if (!jid) {
    // No player filter — return all partido_logs as before
    const r = await sql`SELECT pl.id, pl.jugador_id::int, pl.fecha::text, pl.rival, pl.tipo_partido, pl.minutos::int, pl.titular, pl.rival_foto
                        FROM partido_logs pl JOIN jugadores j ON j.id = pl.jugador_id
                        JOIN usuarios u ON u.id = j.usuario_id
                        WHERE pl.fecha BETWEEN ${desde} AND ${hasta}
                          AND u.activo = true
                        ORDER BY pl.fecha DESC`
    return NextResponse.json(r)
  }

  // For a specific player: get their partido_logs + calendar partidos not yet assigned
  const [logs, calPartidos] = await Promise.all([
    sql`SELECT pl.id, pl.jugador_id::int, pl.fecha::text, pl.rival, pl.tipo_partido,
               pl.minutos::int, pl.titular, pl.rival_foto
        FROM partido_logs pl
        WHERE pl.jugador_id = ${jid} AND pl.fecha BETWEEN ${desde} AND ${hasta}
        ORDER BY pl.fecha DESC`,
    sql`SELECT sp.id AS sesion_id, sp.fecha::text, sp.rival, sp.rival_foto,
               sp.titulo, sp.hora_inicio::text, sp.hora_fin::text
        FROM sesiones_plan sp
        WHERE sp.tipo = 'partido'
          AND sp.admin_id = ${s.userId}
          AND sp.fecha BETWEEN ${desde} AND ${hasta}
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
  const d = fecha || new Date().toISOString().split('T')[0]
  const [r] = await sql`INSERT INTO partido_logs(jugador_id, fecha, rival, tipo_partido, minutos, titular, notas, rival_foto)
    VALUES(${jugador_id}, ${d}, ${rival||null}, ${tipo_partido||'Oficial'}, ${minutos||0}, ${titular!==false}, ${notas||null}, ${rival_foto||null})
    RETURNING id, fecha::text`
  return NextResponse.json(r)
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const fecha = searchParams.get('fecha')
    const rival = searchParams.get('rival')
    const borrarTodo = searchParams.get('all') === 'true'
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (borrarTodo) {
      if (clubId) {
        await sql`
          DELETE FROM partido_logs pl
          USING jugadores j
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE pl.jugador_id = j.id
            AND (u.club_id = ${clubId} OR j.club_id = ${clubId})`
      } else {
        await sql`
          DELETE FROM partido_logs pl
          USING jugadores j
          WHERE pl.jugador_id = j.id AND j.usuario_id = ${s.userId}`
      }
      return NextResponse.json({ ok: true, deleted: 'all_partidos' })
    }

    // Delete by ID (single partido_log entry)
    if (id) {
      await sql`DELETE FROM partido_logs WHERE id = ${id}`
      return NextResponse.json({ ok: true })
    }

    // Delete all partido_logs for a specific fecha+rival for this club
    if (fecha && clubId) {
      if (rival) {
        await sql`
          DELETE FROM partido_logs pl
          USING jugadores j JOIN usuarios u ON u.id = j.usuario_id
          WHERE pl.jugador_id = j.id
            AND (u.club_id = ${clubId} OR j.club_id = ${clubId})
            AND pl.fecha = ${fecha}
            AND pl.rival = ${rival}`
      } else {
        await sql`
          DELETE FROM partido_logs pl
          USING jugadores j JOIN usuarios u ON u.id = j.usuario_id
          WHERE pl.jugador_id = j.id
            AND (u.club_id = ${clubId} OR j.club_id = ${clubId})
            AND pl.fecha = ${fecha}`
      }
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'id, fecha o all requerido' }, { status: 400 })
  } catch (err) {
    console.error('[partidos DELETE error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
