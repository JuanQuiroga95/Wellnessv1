import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { rateLimit, sanitizeInt, verifyJugadorOwnership } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jid = sanitizeInt(searchParams.get('jugadorId'), 1, 9999999)
  const days = sanitizeInt(searchParams.get('days'), 1, 365) || 28

  if (!jid) return NextResponse.json({ error: 'jugadorId inválido' }, { status: 400 })

  const sql = getDb()

  // Players can only see their own logs
  if (s.rol === 'jugador') {
    if (s.jugadorId !== jid) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  // Admins can only see logs of players in their own club
  else if (isAdmin(s)) {
    if (s.clubId && !(await verifyJugadorOwnership(sql, jid, s.clubId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const r = await sql`
    SELECT id, fecha::text, carga_ua::int, rpe::int, duracion_min::int, tipo_sesion
    FROM entrenamiento_logs
    WHERE jugador_id = ${jid}
      AND fecha >= CURRENT_DATE - ${days}::int
    ORDER BY fecha ASC`
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 60, windowMs: 60 * 1000, key: 'logs-post' })
  if (!rl.allowed) return rl.response!

  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const jugador_id = sanitizeInt(body.jugador_id, 1, 9999999)
  const rpe = sanitizeInt(body.rpe, 1, 10)
  const duracion_min = sanitizeInt(body.duracion_min, 0, 600) || 0

  if (!jugador_id) return NextResponse.json({ error: 'jugador_id inválido' }, { status: 400 })
  if (rpe === null) return NextResponse.json({ error: 'RPE requerido (1-10)' }, { status: 400 })

  // Players can only post their own logs
  if (s.rol === 'jugador' && s.jugadorId !== jugador_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const sql = getDb()

  // Admins must own the player
  if (isAdmin(s) && s.clubId) {
    if (!(await verifyJugadorOwnership(sql, jugador_id, s.clubId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const tipo_sesion = body.tipo_sesion === 'PARTIDO' ? 'PARTIDO' : 'EQUIPO'
  const fecha = body.fecha || new Date().toISOString().split('T')[0]
  const clubId = s.clubId ?? null

  const [r] = await sql`
    INSERT INTO entrenamiento_logs(jugador_id, rpe, duracion_min, tipo_sesion, fecha, club_id)
    VALUES(${jugador_id}, ${rpe}, ${duracion_min}, ${tipo_sesion}, ${fecha}, ${clubId})
    RETURNING id, fecha::text, carga_ua::int`
  return NextResponse.json(r)
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'Solo el Coach puede editar' }, { status: 403 })

  const body = await req.json()
  const id = sanitizeInt(body.id, 1, 9999999)
  const duracion_min = sanitizeInt(body.duracion_min, 1, 600)

  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  if (!duracion_min) return NextResponse.json({ error: 'duracion_min debe ser mayor a 0' }, { status: 400 })

  const sql = getDb()

  // Verify the log belongs to the coach's club before updating
  const existing = await sql`
    SELECT el.id FROM entrenamiento_logs el
    JOIN jugadores j ON j.id = el.jugador_id
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE el.id = ${id} AND u.club_id = ${s.clubId ?? null} LIMIT 1`
  if (!existing.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const [r] = await sql`
    UPDATE entrenamiento_logs SET duracion_min = ${duracion_min}
    WHERE id = ${id}
    RETURNING id, fecha::text, carga_ua::int, duracion_min::int, rpe::int`
  return NextResponse.json(r)
}
