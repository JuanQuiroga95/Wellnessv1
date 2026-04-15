export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { rateLimit } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || localToday().slice(0,7) + '-01'
    const hasta = searchParams.get('hasta') || localToday()
    const sql = getDb()

    const hastaInc = (() => {
      const d = new Date(hasta + 'T12:00:00Z')
      d.setUTCDate(d.getUTCDate() + 1)
      return d.toISOString().split('T')[0]
    })()

    const clubId = s.clubId ? Number(s.clubId) : null

    const sesiones = clubId ? await sql`
      SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
             objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
             rival, rival_foto
      FROM sesiones_plan
      WHERE club_id = ${clubId}
        AND fecha >= ${desde}::date AND fecha < ${hastaInc}::date
      ORDER BY fecha, hora_inicio NULLS LAST`
    : await sql`
      SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
             objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
             rival, rival_foto
      FROM sesiones_plan
      WHERE admin_id = ${s.userId}
        AND club_id IS NULL
        AND fecha >= ${desde}::date AND fecha < ${hastaInc}::date
      ORDER BY fecha, hora_inicio NULLS LAST`

    let partidos: any[] = []
    try {
      if (s.clubId != null) {
        const raw = await sql`
          SELECT pl.fecha::text, pl.rival, pl.tipo_partido, pl.rival_foto
          FROM partido_logs pl
          JOIN jugadores j ON j.id = pl.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE pl.fecha >= ${desde}::date AND pl.fecha < ${hastaInc}::date
            AND u.club_id = ${s.clubId}
          ORDER BY pl.fecha DESC`
        const seen = new Set<string>()
        for (const r of raw as any[]) {
          const key = `${r.fecha}__${r.rival}`
          if (!seen.has(key)) { seen.add(key); partidos.push(r) }
        }
      }
    } catch { partidos = [] }

    let logs: any[] = []
    try {
      if (s.clubId != null) {
        logs = await sql`
          SELECT el.fecha::text, MAX(el.rpe)::int AS max_rpe, ROUND(AVG(el.rpe)::numeric,1)::float AS avg_rpe, COUNT(*)::int AS n
          FROM entrenamiento_logs el
          JOIN jugadores j ON j.id = el.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE el.fecha >= ${desde}::date AND el.fecha < ${hastaInc}::date
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
            descripcion, ejercicios, rpe_objetivo, notas, rival, rival_foto } = b
    if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    const sql = getDb()

    const [r] = await sql`
      INSERT INTO sesiones_plan(admin_id, club_id, fecha, hora_inicio, hora_fin, tipo, titulo,
                                objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
                                rival, rival_foto)
      VALUES(${s.userId}, ${s.clubId ? Number(s.clubId) : null}, ${fecha},
             ${hora_inicio || null}, ${hora_fin || null},
             ${tipo || 'entrenamiento'}, ${titulo || null}, ${objetivo || null},
             ${objetivo_secund
