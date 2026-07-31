export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { rateLimit, sanitizeInt, verifyJugadorOwnership } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// NE lookup — same table as ControlCargaCalcPanel
const NE_TABLE: Record<string, number> = {
  'Partido oficial': 10, 'Partido amistoso': 9, 'Partido de entrenamiento': 9,
  'Partido modificado': 8, 'Partido reducido': 7, 'Juego de posición': 6,
  'Juego de posesión': 6, 'Transiciones': 7, 'Rondo': 5, 'Posesión reducida': 5,
  'Trabajo analítico': 2, 'Circuito técnico': 2, 'Circuito condicional': 1,
  'Activación en campo': 1, 'Activación en gimnasio': 0.4,
  'Trabajo preventivo': 0.4, 'Restauración': 0.2, 'Cualidades específicas': 0.8,
}

function calcNeProm(ejercicios: any[]): number {
  if (!Array.isArray(ejercicios) || !ejercicios.length) return 1
  let totalMin = 0, totalCE = 0
  for (const bl of ejercicios) {
    if (!bl.ventana) continue
    const min = (Number(bl.series) || 1) * (Number(bl.minutos) || 0)
    const ne = bl.ne ?? NE_TABLE[bl.ventana] ?? 1
    totalMin += min
    totalCE += min * ne
  }
  return totalMin > 0 ? totalCE / totalMin : 1
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jid = sanitizeInt(searchParams.get('jugadorId'), 1, 9999999)
  const days = sanitizeInt(searchParams.get('days'), 1, 365) || 28

  if (!jid) return NextResponse.json({ error: 'jugadorId inválido' }, { status: 400 })

  const sql = getDb()

  if (s.rol === 'jugador') {
    if (s.jugadorId !== jid) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  } else if (isAdmin(s)) {
    if (s.clubId && !(await verifyJugadorOwnership(sql, jid, s.clubId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  // Fetch logs joined with sesion plan (for md_label and ejercicios for UCE)
  const r = await sql`
    SELECT el.id, el.fecha::text, el.carga_ua::int, el.rpe::int, el.rpe_gimnasio::int, el.duracion_min::int, el.tipo_sesion,
           sp.titulo   AS md_label,
           sp.ejercicios AS sp_ejercicios
    FROM entrenamiento_logs el
    LEFT JOIN sesiones_plan sp
      ON sp.fecha = el.fecha
      AND sp.admin_id = (
        SELECT u.id FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE j.id = ${jid} LIMIT 1
      )
      AND sp.club_id = el.club_id
    WHERE el.jugador_id = ${jid}
      AND el.fecha >= CURRENT_DATE - ${days}::int
    ORDER BY el.fecha ASC`

  // Compute UCE = rpe × duracion × NE_prom for each log
  const enriched = (r as any[]).map(row => {
    const ejercicios = Array.isArray(row.sp_ejercicios) ? row.sp_ejercicios : []
    const neProm = calcNeProm(ejercicios)
    const rpe = Number(row.rpe) || 0
    const dur = Number(row.duracion_min) || 0
    const carga_uce = rpe > 0 && dur > 0 ? Math.round(rpe * dur * neProm) : null
    return {
      id: row.id,
      fecha: row.fecha,
      carga_ua: row.carga_ua,
      carga_uce,       // UCE = RPE × min × NE_prom
      ne_prom: Math.round(neProm * 100) / 100,
      rpe: row.rpe,
      rpe_gimnasio: row.rpe_gimnasio,
      duracion_min: row.duracion_min,
      tipo_sesion: row.tipo_sesion,
      md_label: row.md_label ?? null,
    }
  })

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 60, windowMs: 60 * 1000, key: 'logs-post' })
  if (!rl.allowed) return rl.response!

  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const jugador_id = sanitizeInt(body.jugador_id, 1, 9999999)
  const rpe = sanitizeInt(body.rpe, 1, 10)
  const rpe_gimnasio = sanitizeInt(body.rpe_gimnasio, 1, 10)
  const duracion_min = sanitizeInt(body.duracion_min, 0, 600) || 0

  if (!jugador_id) return NextResponse.json({ error: 'jugador_id inválido' }, { status: 400 })
  if (rpe === null) return NextResponse.json({ error: 'RPE requerido (1-10)' }, { status: 400 })

  if (s.rol === 'jugador' && s.jugadorId !== jugador_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const sql = getDb()

  if (isAdmin(s) && s.clubId) {
    if (!(await verifyJugadorOwnership(sql, jugador_id, s.clubId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  let tipo_sesion = 'EQUIPO'
  if (['PARTIDO', 'PARCIAL', 'READAPTACION'].includes(body.tipo_sesion)) {
    tipo_sesion = body.tipo_sesion
  }
  const fecha = body.fecha || new Date().toISOString().split('T')[0]
  const clubId = s.clubId ? Number(s.clubId) : null

  // Ensure column exists
  try { await sql`ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS rpe_gimnasio SMALLINT` } catch {}

  const existing = await sql`SELECT id, rpe, rpe_gimnasio, tipo_sesion FROM entrenamiento_logs WHERE jugador_id = ${jugador_id} AND fecha = ${fecha} AND tipo_sesion IN ('EQUIPO', 'PARCIAL', 'READAPTACION', 'PARTIDO')`
  
  if (existing.length > 0) {
    const ext = existing[0]
    const newRpe = Math.max(ext.rpe || 0, rpe || 0)
    const newRpeGym = Math.max(ext.rpe_gimnasio || 0, rpe_gimnasio || 0)
    const [r] = await sql`
      UPDATE entrenamiento_logs 
      SET rpe = ${newRpe}, rpe_gimnasio = ${newRpeGym}, duracion_min = GREATEST(COALESCE(duracion_min,0), ${duracion_min}), tipo_sesion = ${tipo_sesion}
      WHERE id = ${ext.id}
      RETURNING id, fecha::text, carga_ua::int`
    return NextResponse.json(r)
  }

  const [r] = await sql`
    INSERT INTO entrenamiento_logs(jugador_id, rpe, rpe_gimnasio, duracion_min, tipo_sesion, fecha, club_id)
    VALUES(${jugador_id}, ${rpe}, ${rpe_gimnasio}, ${duracion_min}, ${tipo_sesion}, ${fecha}, ${clubId})
    RETURNING id, fecha::text, carga_ua::int`
  return NextResponse.json(r)
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'Solo el Coach puede editar' }, { status: 403 })

  const body = await req.json()
  const id = sanitizeInt(body.id, 1, 9999999)
  const duracion_min = sanitizeInt(body.duracion_min, 1, 600)
  const tipo_sesion = ['EQUIPO', 'PARCIAL', 'READAPTACION', 'PARTIDO'].includes(body.tipo_sesion) ? body.tipo_sesion : undefined

  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  if (!duracion_min && !tipo_sesion) return NextResponse.json({ error: 'nada para actualizar' }, { status: 400 })

  const sql = getDb()

  const existing = await sql`
    SELECT el.id FROM entrenamiento_logs el
    JOIN jugadores j ON j.id = el.jugador_id
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE el.id = ${id} AND u.club_id = ${s.clubId ? Number(s.clubId) : null} LIMIT 1`
  if (!existing.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let r;
  if (duracion_min && tipo_sesion) {
    [r] = await sql`UPDATE entrenamiento_logs SET duracion_min = ${duracion_min}, tipo_sesion = ${tipo_sesion} WHERE id = ${id} RETURNING id, fecha::text, carga_ua::int, duracion_min::int, rpe::int, tipo_sesion`
  } else if (duracion_min) {
    [r] = await sql`UPDATE entrenamiento_logs SET duracion_min = ${duracion_min} WHERE id = ${id} RETURNING id, fecha::text, carga_ua::int, duracion_min::int, rpe::int, tipo_sesion`
  } else if (tipo_sesion) {
    [r] = await sql`UPDATE entrenamiento_logs SET tipo_sesion = ${tipo_sesion} WHERE id = ${id} RETURNING id, fecha::text, carga_ua::int, duracion_min::int, rpe::int, tipo_sesion`
  }

  return NextResponse.json(r)
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'Solo el Coach puede eliminar' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const fecha = searchParams.get('fecha')
  const id = sanitizeInt(searchParams.get('id'), 1, 9999999)
  const jugador_id = sanitizeInt(searchParams.get('jugador_id'), 1, 9999999)

  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null

  if (id) {
    await sql`DELETE FROM entrenamiento_logs WHERE id = ${id} AND (club_id = ${clubId} OR jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId}))`
    return NextResponse.json({ success: true })
  }

  if (fecha) {
    if (jugador_id) {
      await sql`DELETE FROM entrenamiento_logs WHERE fecha = ${fecha} AND jugador_id = ${jugador_id} AND (club_id = ${clubId} OR jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId}))`
    } else {
      await sql`DELETE FROM entrenamiento_logs WHERE fecha = ${fecha} AND (club_id = ${clubId} OR jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId}))`
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Falta fecha o id' }, { status: 400 })
}
