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
      AND fecha >= CURRENT_DATE - ${days}::int
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
  const clamp = (v: any) => (v != null ? Math.min(10, Math.max(1, parseInt(v))) : null)
  const fecha = b.fecha || new Date().toISOString().split('T')[0]

  let clubId = s.clubId ?? null
  if (s.rol === 'jugador') {
    const rows = await sql`SELECT club_id FROM jugadores WHERE id = ${jugador_id} LIMIT 1`
    clubId = (rows[0] as any)?.club_id ?? null
  }

  // Try with dolor_descripcion first; fall back without it if column doesn't exist yet
  let r: any
  try {
    ;[r] = await sql`
      INSERT INTO wellness_logs(
        jugador_id, fecha, fatiga, calidad_sueno, dolor_muscular, nivel_estres, estado_animo,
        dolor_zona, dolor_descripcion, dolor_eva, tqr, recovery, entrena_grupo, fue_gimnasio, grupos_musculares, club_id
      ) VALUES(
        ${jugador_id}, ${fecha}, ${clamp(b.fatiga)}, ${clamp(b.calidad_sueno)},
        ${clamp(b.dolor_muscular)}, ${clamp(b.nivel_estres)}, ${clamp(b.estado_animo)},
        ${b.dolor_zona || null}, ${b.dolor_descripcion || null}, ${clamp(b.dolor_eva)}, ${clamp(b.tqr)}, ${clamp(b.recovery)},
        ${b.entrena_grupo ?? true}, ${b.fue_gimnasio ?? false},
        ${b.grupos_musculares || null}, ${clubId}
      )
      ON CONFLICT (jugador_id, fecha) DO UPDATE SET
        fatiga            = EXCLUDED.fatiga,
        calidad_sueno     = EXCLUDED.calidad_sueno,
        dolor_muscular    = EXCLUDED.dolor_muscular,
        nivel_estres      = EXCLUDED.nivel_estres,
        estado_animo      = EXCLUDED.estado_animo,
        dolor_zona        = EXCLUDED.dolor_zona,
        dolor_descripcion = EXCLUDED.dolor_descripcion,
        dolor_eva         = EXCLUDED.dolor_eva,
        tqr               = EXCLUDED.tqr,
        recovery          = EXCLUDED.recovery,
        entrena_grupo     = EXCLUDED.entrena_grupo,
        fue_gimnasio      = EXCLUDED.fue_gimnasio,
        grupos_musculares = EXCLUDED.grupos_musculares
      RETURNING id, fecha::text`
  } catch (e: any) {
    // Fallback: insert without dolor_descripcion (column not migrated yet)
    if (String(e).includes('dolor_descripcion')) {
      ;[r] = await sql`
        INSERT INTO wellness_logs(
          jugador_id, fecha, fatiga, calidad_sueno, dolor_muscular, nivel_estres, estado_animo,
          dolor_zona, dolor_eva, tqr, recovery, entrena_grupo, fue_gimnasio, grupos_musculares, club_id
        ) VALUES(
          ${jugador_id}, ${fecha}, ${clamp(b.fatiga)}, ${clamp(b.calidad_sueno)},
          ${clamp(b.dolor_muscular)}, ${clamp(b.nivel_estres)}, ${clamp(b.estado_animo)},
          ${b.dolor_zona || null}, ${clamp(b.dolor_eva)}, ${clamp(b.tqr)}, ${clamp(b.recovery)},
          ${b.entrena_grupo ?? true}, ${b.fue_gimnasio ?? false},
          ${b.grupos_musculares || null}, ${clubId}
        )
        ON CONFLICT (jugador_id, fecha) DO UPDATE SET
          fatiga            = EXCLUDED.fatiga,
          calidad_sueno     = EXCLUDED.calidad_sueno,
          dolor_muscular    = EXCLUDED.dolor_muscular,
          nivel_estres      = EXCLUDED.nivel_estres,
          estado_animo      = EXCLUDED.estado_animo,
          dolor_zona        = EXCLUDED.dolor_zona,
          dolor_eva         = EXCLUDED.dolor_eva,
          tqr               = EXCLUDED.tqr,
          recovery          = EXCLUDED.recovery,
          entrena_grupo     = EXCLUDED.entrena_grupo,
          fue_gimnasio      = EXCLUDED.fue_gimnasio,
          grupos_musculares = EXCLUDED.grupos_musculares
        RETURNING id, fecha::text`
    } else {
      throw e
    }
  }
  return NextResponse.json(r)
}
