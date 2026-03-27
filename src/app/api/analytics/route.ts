import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const weeks = parseInt(searchParams.get('weeks') || '4')
  const clubId = s.clubId ?? null
  const sql = getDb()

  const wellnessWeekly = await sql`
    SELECT j.id AS jugador_id, u.nombre, j.posicion, j.foto_url,
           TO_CHAR(DATE_TRUNC('week', w.fecha), 'YYYY-MM-DD') AS semana,
           ROUND(AVG(w.fatiga)::numeric, 2)         AS avg_fatiga,
           ROUND(AVG(w.calidad_sueno)::numeric, 2)  AS avg_sueno,
           ROUND(AVG(w.dolor_muscular)::numeric, 2) AS avg_dolor,
           ROUND(AVG(w.nivel_estres)::numeric, 2)   AS avg_estres,
           ROUND(AVG(w.estado_animo)::numeric, 2)   AS avg_animo,
           ROUND((AVG(w.fatiga)+AVG(w.calidad_sueno)+AVG(w.dolor_muscular)+AVG(w.nivel_estres)+AVG(w.estado_animo))::numeric, 1) AS total_wellness,
           COUNT(w.id)::int AS registros
    FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
    LEFT JOIN wellness_logs w ON w.jugador_id=j.id AND w.fecha>=CURRENT_DATE-(${weeks}*7)
    WHERE u.rol='jugador' AND u.activo=true AND u.club_id=${clubId}
    GROUP BY j.id, u.nombre, j.posicion, j.foto_url, DATE_TRUNC('week', w.fecha)
    HAVING w.fecha IS NOT NULL ORDER BY u.nombre, semana`

  const rpeWeekly = await sql`
    SELECT el.jugador_id::int,
           TO_CHAR(DATE_TRUNC('week', el.fecha), 'YYYY-MM-DD') AS semana,
           ROUND(AVG(el.rpe)::numeric, 2) AS avg_rpe,
           ROUND(AVG(el.duracion_min)::numeric, 1) AS avg_duracion,
           COUNT(el.id)::int AS sesiones
    FROM entrenamiento_logs el
    JOIN jugadores j ON j.id=el.jugador_id
    JOIN usuarios u ON u.id=j.usuario_id
    WHERE el.fecha>=CURRENT_DATE-(${weeks}*7) AND u.club_id=${clubId}
    GROUP BY el.jugador_id, DATE_TRUNC('week', el.fecha)
    ORDER BY el.jugador_id, semana`

  const readinessToday = await sql`
    SELECT j.id AS jugador_id, u.nombre, j.posicion, j.foto_url,
           w.fecha::text, w.fatiga::int, w.calidad_sueno::int, w.dolor_muscular::int,
           w.nivel_estres::int, w.estado_animo::int,
           (COALESCE(w.fatiga,0)+COALESCE(w.calidad_sueno,0)+COALESCE(w.dolor_muscular,0)+COALESCE(w.nivel_estres,0)+COALESCE(w.estado_animo,0))::int AS total_wellness
    FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
    LEFT JOIN wellness_logs w ON w.jugador_id=j.id AND w.fecha=CURRENT_DATE
    WHERE u.rol='jugador' AND u.activo=true AND u.club_id=${clubId}
    ORDER BY total_wellness DESC NULLS LAST`

  return NextResponse.json({
    wellnessWeekly: wellnessWeekly.map(r => ({ ...r, semana:String(r.semana||''), avg_fatiga:Number(r.avg_fatiga)||0, avg_sueno:Number(r.avg_sueno)||0, avg_dolor:Number(r.avg_dolor)||0, avg_estres:Number(r.avg_estres)||0, avg_animo:Number(r.avg_animo)||0, total_wellness:Number(r.total_wellness)||0 })),
    rpeWeekly: rpeWeekly.map(r => ({ ...r, semana:String(r.semana||''), avg_rpe:Number(r.avg_rpe)||0, avg_duracion:Number(r.avg_duracion)||0 })),
    readinessToday: readinessToday.map(r => ({ jugador_id:Number(r.jugador_id), nombre:String(r.nombre||''), posicion:String(r.posicion||''), foto_url:r.foto_url?String(r.foto_url):null, fecha:r.fecha?String(r.fecha):null, fatiga:Number(r.fatiga)||0, calidad_sueno:Number(r.calidad_sueno)||0, dolor_muscular:Number(r.dolor_muscular)||0, nivel_estres:Number(r.nivel_estres)||0, estado_animo:Number(r.estado_animo)||0, total_wellness:Number(r.total_wellness)||0 })),
  })
}
