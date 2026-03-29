import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde') || new Date().toISOString().split('T')[0].slice(0,7) + '-01'
  const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
  const sql = getDb()

  // Sesiones planificadas
  const sesiones = await sql`
    SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
           objetivo, descripcion, ejercicios, rpe_objetivo, materiales, notas
    FROM sesiones_plan
    WHERE admin_id=${s.userId} AND fecha BETWEEN ${desde} AND ${hasta}
    ORDER BY fecha, hora_inicio`

  // Partidos registrados (ya existentes)
  const partidos = await sql`
    SELECT DISTINCT ON (pl.fecha, pl.rival) 
           pl.fecha::text, pl.rival, pl.tipo_partido, pl.rival_foto
    FROM partido_logs pl
    JOIN jugadores j ON j.id=pl.jugador_id
    JOIN usuarios u ON u.id=j.usuario_id
    WHERE pl.fecha BETWEEN ${desde} AND ${hasta}
      AND (u.club_id=${s.clubId??null} OR ${s.clubId??null} IS NULL)
    ORDER BY pl.fecha, pl.rival, pl.fecha DESC`

  // Logs de entrenamiento reales (para calcular recuperación)
  const logs = await sql`
    SELECT el.fecha::text, MAX(el.rpe)::int AS max_rpe
    FROM entrenamiento_logs el
    JOIN jugadores j ON j.id=el.jugador_id
    JOIN usuarios u ON u.id=j.usuario_id
    WHERE el.fecha BETWEEN ${desde} AND ${hasta}
      AND (u.club_id=${s.clubId??null} OR ${s.clubId??null} IS NULL)
    GROUP BY el.fecha
    ORDER BY el.fecha`

  return NextResponse.json({ sesiones, partidos, logs })
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const { fecha, hora_inicio, hora_fin, tipo, titulo, objetivo, descripcion,
          ejercicios, rpe_objetivo, materiales, notas } = b
  if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
  const sql = getDb()
  const [r] = await sql`
    INSERT INTO sesiones_plan(admin_id, club_id, fecha, hora_inicio, hora_fin, tipo, titulo,
                              objetivo, descripcion, ejercicios, rpe_objetivo, materiales, notas)
    VALUES(${s.userId}, ${s.clubId??null}, ${fecha}, ${hora_inicio||null}, ${hora_fin||null},
           ${tipo||'entrenamiento'}, ${titulo||null}, ${objetivo||null}, ${descripcion||null},
           ${JSON.stringify(ejercicios||[])}::jsonb, ${rpe_objetivo||null}, ${materiales||null}, ${notas||null})
    RETURNING id, fecha::text`
  return NextResponse.json(r)
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id, ...fields } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  await sql`
    UPDATE sesiones_plan SET
      hora_inicio  = COALESCE(${fields.hora_inicio??null}, hora_inicio),
      hora_fin     = COALESCE(${fields.hora_fin??null}, hora_fin),
      tipo         = COALESCE(${fields.tipo??null}, tipo),
      titulo       = COALESCE(${fields.titulo??null}, titulo),
      objetivo     = COALESCE(${fields.objetivo??null}, objetivo),
      descripcion  = COALESCE(${fields.descripcion??null}, descripcion),
      ejercicios   = COALESCE(${fields.ejercicios ? JSON.stringify(fields.ejercicios) : null}::jsonb, ejercicios),
      rpe_objetivo = COALESCE(${fields.rpe_objetivo??null}, rpe_objetivo),
      materiales   = COALESCE(${fields.materiales??null}, materiales),
      notas        = COALESCE(${fields.notas??null}, notas)
    WHERE id=${id} AND admin_id=${s.userId}`
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  await sql`DELETE FROM sesiones_plan WHERE id=${id} AND admin_id=${s.userId}`
  return NextResponse.json({ ok: true })
}
