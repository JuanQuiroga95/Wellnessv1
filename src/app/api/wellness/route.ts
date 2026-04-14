export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { rateLimit, sanitizeInt, verifyJugadorOwnership } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientDate = searchParams.get('clientDate') || localToday()
  const jid = sanitizeInt(searchParams.get('jugadorId'), 1, 9999999)
  const days = sanitizeInt(searchParams.get('days'), 1, 365) || 14

  if (!jid) return NextResponse.json({ error: 'jugadorId inválido' }, { status: 400 })

  const sql = getDb()

  if (s.rol === 'jugador') {
    if (s.jugadorId !== jid) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  } else if (isAdmin(s) && s.clubId) {
    if (!(await verifyJugadorOwnership(sql, jid, s.clubId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  const r = await sql`
    SELECT fecha::text, fatiga::int, calidad_sueno::int, dolor_muscular::int,
           nivel_estres::int, estado_animo::int, dolor_zona,
           COALESCE(dolor_descripcion, '') AS dolor_descripcion,
           COALESCE(dolor_eva::int, 0) AS dolor_eva,
           COALESCE(tqr::int, 0) AS tqr,
           COALESCE(recovery::int, 0) AS recovery,
           COALESCE(entrena_grupo::text, 'true') AS entrena_grupo,
           COALESCE(fue_gimnasio::text, 'false') AS fue_gimnasio,
           COALESCE(grupos_musculares, '') AS grupos_musculares
    FROM wellness_logs
    WHERE jugador_id = ${jid}
      AND fecha >= ${clientDate}::date - ${days}::int
    ORDER BY fecha DESC`
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 100, windowMs: 60 * 1000, key: 'wellness-post' })
  if (!rl.allowed) return rl.response!

  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const b = await req.json()
  const jugador_id = sanitizeInt(b.jugador_id, 1, 9999999)
  if (!jugador_id) return NextResponse.json({ error: 'jugador_id inválido' }, { status: 400 })

  if (s.rol === 'jugador' && s.jugadorId !== jugador_id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const sql = getDb()

  if (isAdmin(s) && s.clubId) {
    if (!(await verifyJugadorOwnership(sql, jugador_id, s.clubId))) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
  }

  // Sanitize all numeric wellness fields (scale 1-10)
  const clamp = (v: any) => {
    if (v == null) return null
    const n = parseInt(v)
    if (isNaN(n)) return null
    return Math.min(10, Math.max(1, n))
  }
  const clamp0 = (v: any) => {
    // Like clamp but allows 0 (for dolor_eva which can be 0 = sin dolor)
    if (v == null) return null
    const n = parseInt(v)
    if (isNaN(n)) return null
    return Math.min(10, Math.max(0, n))
  }
  const fecha = b.fecha || localToday()

  let clubId = s.clubId ? Number(s.clubId) : null
  if (s.rol === 'jugador') {
    const rows = await sql`SELECT club_id FROM jugadores WHERE id = ${jugador_id} LIMIT 1`
    clubId = (rows[0] as any)?.club_id ?? null
  }

  // Manual upsert: no depende de UNIQUE INDEX (que puede no existir si hay duplicados históricos)
  // 1) Buscar si ya existe un registro para hoy
  const existing = await sql`
    SELECT id FROM wellness_logs
    WHERE jugador_id = ${jugador_id} AND fecha = ${fecha}
    ORDER BY id DESC LIMIT 1`

  let r: any
  try {
    if (existing.length > 0) {
      // UPDATE del registro más reciente
      ;[r] = await sql`
        UPDATE wellness_logs SET
          fatiga            = ${clamp(b.fatiga)},
          calidad_sueno     = ${clamp(b.calidad_sueno)},
          dolor_muscular    = ${clamp(b.dolor_muscular)},
          nivel_estres      = ${clamp(b.nivel_estres)},
          estado_animo      = ${clamp(b.estado_animo)},
          dolor_zona        = ${b.dolor_zona || null},
          dolor_descripcion = ${b.dolor_descripcion || null},
          dolor_eva         = ${clamp0(b.dolor_eva)},
          tqr               = ${clamp(b.tqr)},
          recovery          = ${clamp(b.recovery)},
          entrena_grupo     = ${b.entrena_grupo ?? true},
          fue_gimnasio      = ${b.fue_gimnasio ?? false},
          grupos_musculares = ${b.grupos_musculares || null}
        WHERE id = ${(existing[0] as any).id}
        RETURNING id, fecha::text`
    } else {
      // INSERT nuevo
      ;[r] = await sql`
        INSERT INTO wellness_logs(
          jugador_id, fecha, fatiga, calidad_sueno, dolor_muscular, nivel_estres, estado_animo,
          dolor_zona, dolor_descripcion, dolor_eva, tqr, recovery, entrena_grupo, fue_gimnasio, grupos_musculares, club_id
        ) VALUES(
          ${jugador_id}, ${fecha}, ${clamp(b.fatiga)}, ${clamp(b.calidad_sueno)},
          ${clamp(b.dolor_muscular)}, ${clamp(b.nivel_estres)}, ${clamp(b.estado_animo)},
          ${b.dolor_zona || null}, ${b.dolor_descripcion || null}, ${clamp0(b.dolor_eva)},
          ${clamp(b.tqr)}, ${clamp(b.recovery)},
          ${b.entrena_grupo ?? true}, ${b.fue_gimnasio ?? false},
          ${b.grupos_musculares || null}, ${clubId}
        )
        RETURNING id, fecha::text`
    }
  } catch (e: any) {
    // Fallback: columna dolor_descripcion puede no existir en DB vieja
    if (String(e).includes('dolor_descripcion')) {
      if (existing.length > 0) {
        ;[r] = await sql`
          UPDATE wellness_logs SET
            fatiga            = ${clamp(b.fatiga)},
            calidad_sueno     = ${clamp(b.calidad_sueno)},
            dolor_muscular    = ${clamp(b.dolor_muscular)},
            nivel_estres      = ${clamp(b.nivel_estres)},
            estado_animo      = ${clamp(b.estado_animo)},
            dolor_zona        = ${b.dolor_zona || null},
            dolor_eva         = ${clamp0(b.dolor_eva)},
            tqr               = ${clamp(b.tqr)},
            recovery          = ${clamp(b.recovery)},
            entrena_grupo     = ${b.entrena_grupo ?? true},
            fue_gimnasio      = ${b.fue_gimnasio ?? false},
            grupos_musculares = ${b.grupos_musculares || null}
          WHERE id = ${(existing[0] as any).id}
          RETURNING id, fecha::text`
      } else {
        ;[r] = await sql`
          INSERT INTO wellness_logs(
            jugador_id, fecha, fatiga, calidad_sueno, dolor_muscular, nivel_estres, estado_animo,
            dolor_zona, dolor_eva, tqr, recovery, entrena_grupo, fue_gimnasio, grupos_musculares, club_id
          ) VALUES(
            ${jugador_id}, ${fecha}, ${clamp(b.fatiga)}, ${clamp(b.calidad_sueno)},
            ${clamp(b.dolor_muscular)}, ${clamp(b.nivel_estres)}, ${clamp(b.estado_animo)},
            ${b.dolor_zona || null}, ${clamp0(b.dolor_eva)}, ${clamp(b.tqr)}, ${clamp(b.recovery)},
            ${b.entrena_grupo ?? true}, ${b.fue_gimnasio ?? false},
            ${b.grupos_musculares || null}, ${clubId}
          )
          RETURNING id, fecha::text`
      }
    } else {
      console.error('[wellness POST] DB error:', String(e))
      return NextResponse.json({ error: 'Error interno del servidor', detail: String(e) }, { status: 500 })
    }
  }
  if (!r) return NextResponse.json({ error: 'No se pudo guardar el registro' }, { status: 500 })
  return NextResponse.json(r)
}
