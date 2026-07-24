export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

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
  if (!s || !isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { searchParams } = new URL(req.url)

  // Accept desde/hasta OR weeks (fallback) so both the new date-range UI
  // and any legacy callers work without changes.
  const hasta   = searchParams.get('hasta') || localToday()
  const fromWeeks = parseInt(searchParams.get('weeks') || '4')
  const desdeDefault = (() => { const d = new Date(hasta); d.setDate(d.getDate() - fromWeeks * 7); return d.toISOString().split('T')[0] })()
  const desde   = searchParams.get('desde') || desdeDefault
  // hastaInc = hasta + 1 day so we use strict < in SQL and include the full hasta day
  const hastaInc = (() => { const d = new Date(hasta); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()

  const clubId  = s.clubId ? Number(s.clubId) : null
  const isMaster = s.rol === 'master_admin' && !s.clubId
  const sql = getDb()

  if (!isMaster && !clubId) return NextResponse.json({ wRows: [], rpeRows: [], todayRows: [] })

  // Auto-repair club_id on legacy rows
  if (clubId) {
    try {
      await sql`UPDATE jugadores j SET club_id=${clubId} FROM usuarios u WHERE u.id=j.usuario_id AND u.club_id=${clubId} AND j.club_id IS NULL`
      await sql`UPDATE usuarios u SET club_id=${clubId} FROM jugadores j WHERE j.usuario_id=u.id AND j.club_id=${clubId} AND u.club_id IS NULL`
    } catch {}
  }

  const wRows = await sql`
    SELECT j.id AS jugador_id, u.nombre, j.posicion, j.foto_url,
           DATE_TRUNC('week', w.fecha)::text AS semana,
           ROUND(AVG(w.fatiga+w.calidad_sueno+w.dolor_muscular+w.nivel_estres+w.estado_animo),1)::float AS total_wellness,
           ROUND(AVG(w.fatiga),2)::float         AS avg_fatiga,
           ROUND(AVG(w.calidad_sueno),2)::float  AS avg_sueno,
           ROUND(AVG(w.dolor_muscular),2)::float AS avg_dolor,
           ROUND(AVG(w.nivel_estres),2)::float   AS avg_estres,
           ROUND(AVG(w.estado_animo),2)::float   AS avg_animo,
           ROUND(AVG(w.tqr),2)::float            AS avg_tqr,
           COUNT(*)::int AS registros
    FROM wellness_logs w
    JOIN jugadores j ON j.id=w.jugador_id
    JOIN usuarios u  ON u.id=j.usuario_id
    WHERE w.fecha >= ${desde}::date AND w.fecha < ${hastaInc}::date
      AND w.fatiga IS NOT NULL
      AND u.activo=true AND u.rol='jugador'
      AND (${isMaster}::boolean OR (u.club_id=${clubId} OR j.club_id=${clubId}))
    GROUP BY j.id, u.nombre, j.posicion, j.foto_url, DATE_TRUNC('week',w.fecha)
    ORDER BY semana DESC, u.nombre`

  const rpeRows = await sql`
    SELECT el.jugador_id::int,
           DATE_TRUNC('week', el.fecha)::text AS semana,
           ROUND(AVG(el.rpe),2)::float        AS avg_rpe,
           ROUND(SUM(el.carga_ua),0)::float   AS total_carga,
           COUNT(*)::int AS sesiones
    FROM entrenamiento_logs el
    JOIN jugadores j ON j.id=el.jugador_id
    JOIN usuarios u  ON u.id=j.usuario_id
    WHERE el.fecha >= ${desde}::date AND el.fecha < ${hastaInc}::date
      AND u.activo=true AND u.rol='jugador'
      AND (${isMaster}::boolean OR (u.club_id=${clubId} OR j.club_id=${clubId}))
    GROUP BY el.jugador_id, DATE_TRUNC('week',el.fecha)
    ORDER BY semana DESC`

  // Bug fix: 2-day window handles UTC-3 (Argentina) timezone offset.
  // DISTINCT ON ensures one row per player (most recent submission).
  const todayRows = await sql`
    SELECT DISTINCT ON (j.id)
           j.id AS jugador_id, u.nombre, j.posicion, j.foto_url,
           COALESCE(w.fatiga+w.calidad_sueno+w.dolor_muscular+w.nivel_estres+w.estado_animo, null) AS total_wellness,
           w.fatiga, w.calidad_sueno, w.dolor_muscular, w.nivel_estres, w.estado_animo,
           w.tqr, w.dolor_zona, w.dolor_eva, w.entrena_grupo, w.fue_gimnasio,
           w.fecha AS registro_fecha
    FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
    LEFT JOIN wellness_logs w ON w.jugador_id=j.id AND w.fecha >= CURRENT_DATE - 2
    WHERE u.rol='jugador' AND u.activo=true
      AND (${isMaster}::boolean OR (u.club_id=${clubId} OR j.club_id=${clubId}))
    ORDER BY j.id, w.fecha DESC NULLS LAST`

  return NextResponse.json({ wRows, rpeRows, todayRows })
}
