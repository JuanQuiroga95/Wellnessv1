import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { rateLimit, sanitizeString, sanitizeInt } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || new Date().toISOString().split('T')[0].slice(0,7) + '-01'
    const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
    const sql = getDb()

    // Sesiones planificadas por este admin
    const sesiones = await sql`
      SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
             objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas
      FROM sesiones_plan
      WHERE admin_id = ${s.userId}
        AND fecha BETWEEN ${desde} AND ${hasta}
      ORDER BY fecha, hora_inicio NULLS LAST`

    // Partidos ya registrados (distintos por fecha+rival)
    let partidos: any[] = []
    try {
      if (s.clubId != null) {
        const raw = await sql`
          SELECT pl.fecha::text, pl.rival, pl.tipo_partido, pl.rival_foto
          FROM partido_logs pl
          JOIN jugadores j ON j.id = pl.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE pl.fecha BETWEEN ${desde} AND ${hasta}
            AND u.club_id = ${s.clubId}
          ORDER BY pl.fecha DESC`
        // Deduplicate by fecha+rival in JS to avoid DISTINCT ON issues
        const seen = new Set<string>()
        for (const r of raw as any[]) {
          const key = `${r.fecha}__${r.rival}`
          if (!seen.has(key)) { seen.add(key); partidos.push(r) }
        }
      }
    } catch { partidos = [] }

    // Logs de entrenamiento reales agrupados por día
    let logs: any[] = []
    try {
      if (s.clubId != null) {
        logs = await sql`
          SELECT el.fecha::text, MAX(el.rpe)::int AS max_rpe, ROUND(AVG(el.rpe)::numeric,1)::float AS avg_rpe, COUNT(*)::int AS n
          FROM entrenamiento_logs el
          JOIN jugadores j ON j.id = el.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE el.fecha BETWEEN ${desde} AND ${hasta}
            AND u.club_id = ${s.clubId}
          GROUP BY el.fecha
          ORDER BY el.fecha` as any[]
      }
    } catch { logs = [] }

    return NextResponse.json({ sesiones, partidos, logs })
  } catch (err) {
    console.error('[calendario GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 100, windowMs: 60 * 1000, key: 'calendario' })
  if (!rl.allowed) return rl.response!
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const b = await req.json()
    const { fecha, hora_inicio, hora_fin, tipo, titulo, objetivo, objetivo_secundario,
            descripcion, ejercicios, rpe_objetivo, notas } = b
    if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    const sql = getDb()
    const [r] = await sql`
      INSERT INTO sesiones_plan(admin_id, club_id, fecha, hora_inicio, hora_fin, tipo, titulo,
                                objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas)
      VALUES(${s.userId}, ${s.clubId ?? null}, ${fecha},
             ${hora_inicio || null}, ${hora_fin || null},
             ${tipo || 'entrenamiento'}, ${titulo || null}, ${objetivo || null},
             ${objetivo_secundario || null}, ${descripcion || null},
             ${JSON.stringify(ejercicios || [])}::jsonb,
             ${rpe_objetivo || null}, ${notas || null})
      RETURNING id, fecha::text`
    return NextResponse.json(r)
  } catch (err) {
    console.error('[calendario POST error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { id, fecha, hora_inicio, hora_fin, tipo, titulo, objetivo, objetivo_secundario,
            descripcion, ejercicios, rpe_objetivo, notas } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const sql = getDb()
    await sql`
      UPDATE sesiones_plan SET
        fecha              = COALESCE(${fecha ?? null}, fecha),
        hora_inicio        = COALESCE(${hora_inicio ?? null}, hora_inicio),
        hora_fin           = COALESCE(${hora_fin ?? null}, hora_fin),
        tipo               = COALESCE(${tipo ?? null}, tipo),
        titulo             = COALESCE(${titulo ?? null}, titulo),
        objetivo           = COALESCE(${objetivo ?? null}, objetivo),
        objetivo_secundario= COALESCE(${objetivo_secundario ?? null}, objetivo_secundario),
        descripcion        = COALESCE(${descripcion ?? null}, descripcion),
        ejercicios         = ${JSON.stringify(ejercicios ?? [])}::jsonb,
        rpe_objetivo       = COALESCE(${rpe_objetivo ?? null}, rpe_objetivo),
        notas              = COALESCE(${notas ?? null}, notas)
      WHERE id = ${id} AND admin_id = ${s.userId}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[calendario PATCH error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const sql = getDb()
    await sql`DELETE FROM sesiones_plan WHERE id = ${id} AND admin_id = ${s.userId}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[calendario DELETE error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
