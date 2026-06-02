export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    
    const { searchParams } = new URL(req.url)
    const hasta = searchParams.get('hasta') || localToday()
    const fromWeeks = parseInt(searchParams.get('weeks') || '4')
    const desdeDefault = (() => { 
      const d = new Date(hasta); 
      d.setDate(d.getDate() - fromWeeks * 7); 
      return d.toISOString().split('T')[0] 
    })()
    const desde = searchParams.get('desde') || desdeDefault

    // FIX: Formato de fecha robusto para evitar el Error 500
    const fDesde = desde;
    const fHasta = hasta + ' 23:59:59.999';

    const clubId = s.clubId ? Number(s.clubId) : null
    const isMaster = s.rol === 'master_admin' && !s.clubId
    const sql = getDb()
    if (!isMaster && !clubId) return NextResponse.json([])

    // Wellness semanal: recuperamos TODAS tus métricas de promedio
    const wellnessWeekly = await sql`
      SELECT j.id AS jugador_id, u.nombre, j.posicion, j.foto_url,
             TO_CHAR(DATE_TRUNC('week', w.fecha), 'YYYY-MM-DD') AS semana,
             ROUND(AVG(w.fatiga)::numeric, 2)          AS avg_fatiga,
             ROUND(AVG(w.calidad_sueno)::numeric, 2)   AS avg_sueno,
             ROUND(AVG(w.dolor_muscular)::numeric, 2)  AS avg_dolor,
             ROUND(AVG(w.nivel_estres)::numeric, 2)    AS avg_estres,
             ROUND(AVG(w.estado_animo)::numeric, 2)    AS avg_animo,
             ROUND((AVG(w.fatiga)+AVG(w.calidad_sueno)+AVG(w.dolor_muscular)+AVG(w.nivel_estres)+AVG(w.estado_animo))::numeric, 1) AS total_wellness,
             COUNT(w.id)::int AS registros
      FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
      JOIN wellness_logs w ON w.jugador_id=j.id 
      WHERE w.fecha >= ${fDesde}::date AND w.fecha <= ${fHasta}::timestamp
        AND u.rol='jugador' AND u.activo=true
        AND (${isMaster}::boolean OR (u.club_id=${clubId} AND j.club_id=${clubId}))
      GROUP BY j.id, u.nombre, j.posicion, j.foto_url, DATE_TRUNC('week', w.fecha)
      ORDER BY u.nombre, semana`

    // RPE semanal
    const rpeWeekly = await sql`
      SELECT el.jugador_id::int,
             TO_CHAR(DATE_TRUNC('week', el.fecha), 'YYYY-MM-DD') AS semana,
             ROUND(AVG(el.rpe)::numeric, 2)         AS avg_rpe,
             ROUND(AVG(el.duracion_min)::numeric, 1) AS avg_duracion,
             COUNT(el.id)::int AS sesiones
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id=el.jugador_id
      JOIN usuarios u  ON u.id=j.usuario_id
      WHERE el.fecha >= ${fDesde}::date AND el.fecha <= ${fHasta}::timestamp
        AND u.activo=true
        AND (${isMaster}::boolean OR (u.club_id=${clubId} AND j.club_id=${clubId}))
      GROUP BY el.jugador_id, DATE_TRUNC('week', el.fecha)
      ORDER BY el.jugador_id, semana`

    // Readiness: Estado actual
    const readinessToday = await sql`
      SELECT DISTINCT ON (j.id)
             j.id AS jugador_id, u.nombre, j.posicion, j.foto_url,
             w.fecha::text,
             w.fatiga::int, w.calidad_sueno::int, w.dolor_muscular::int,
             w.nivel_estres::int, w.estado_animo::int,
             (COALESCE(w.fatiga,0)+COALESCE(w.calidad_sueno,0)+COALESCE(w.dolor_muscular,0)+COALESCE(w.nivel_estres,0)+COALESCE(w.estado_animo,0))::int AS total_wellness
      FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
      LEFT JOIN wellness_logs w ON w.jugador_id=j.id AND w.fecha >= CURRENT_DATE - 1
      WHERE u.rol='jugador' AND u.activo=true
        AND (${isMaster}::boolean OR (u.club_id=${clubId} AND j.club_id=${clubId}))
      ORDER BY j.id, w.fecha DESC NULLS LAST`

    // Análisis de carga: Neuromuscular vs Metabólica x Estadio + métricas detalladas
    const loadAnalysis = await sql`
      WITH session_avgs AS (
        SELECT COALESCE(
                 s.titulo,
                 s.objetivo,
                 (SELECT COALESCE(s2.titulo, s2.objetivo) FROM sesiones_plan s2 WHERE s2.fecha = g.fecha::date AND s2.club_id = g.club_id AND (s2.titulo ILIKE 'MD%' OR s2.objetivo ILIKE 'MD%') LIMIT 1),
                 'MD'
               ) AS md_label,
               g.fecha::date AS session_date,
               MAX(c.nombre) AS cancha_nombre, MAX(c.largo_m) AS largo_m, MAX(c.ancho_m) AS ancho_m,
               AVG(g.dist_total) AS avg_dist_total,
               AVG(COALESCE(g.dist_hir,0)) AS avg_dist_hir,
               AVG(COALESCE(g.dist_v4,0)) AS avg_dist_v4,
               AVG(COALESCE(g.dist_v5,0)) AS avg_dist_v5,
               AVG(COALESCE(g.acc2,0) + COALESCE(g.acc3,0)) AS avg_acel_total,
               AVG(COALESCE(g.dec2,0) + COALESCE(g.dec3,0)) AS avg_decel_total,
               AVG(COALESCE(g.acc3,0)) AS avg_acc_int,
               AVG(COALESCE(g.n_sprints,0)) AS avg_sprints,
               AVG(NULLIF(COALESCE(g.max_velocity,0), 0)) AS avg_max_vel,
               AVG(NULLIF(COALESCE(g.dist_per_min,0), 0)) AS avg_mts_min,
               AVG(NULLIF(COALESCE(g.duracion_min,0), 0)) AS avg_duracion,
               COUNT(g.id)::int AS registros
        FROM gps_logs g
        JOIN jugadores j ON j.id = g.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        LEFT JOIN sesiones_plan s ON s.id = g.sesion_id
        LEFT JOIN canchas c ON c.id = s.cancha_id
        WHERE g.fecha >= ${fDesde}::date AND g.fecha <= ${fHasta}::timestamp
          AND u.activo = true
          AND (${isMaster}::boolean OR g.club_id = ${clubId})
        GROUP BY 1, 2
      )
      SELECT DISTINCT ON (md_label) *
      FROM session_avgs
      ORDER BY md_label, session_date DESC`

    // Evolución diaria para gráficos de línea (Image 3)
    const dailyEvolution = await sql`
      SELECT g.fecha::text,
             s.objetivo,
             AVG(NULLIF(g.max_velocity, 0)) AS max_vel,
             AVG(NULLIF(g.dist_per_min, 0)) AS mts_min,
             AVG(g.acc2 + g.acc3) AS acel,
             AVG(g.dec2 + g.dec3) AS decel,
             AVG(g.n_sprints) AS sprints
      FROM gps_logs g
      JOIN jugadores j ON j.id = g.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      LEFT JOIN sesiones_plan s ON s.id = g.sesion_id
      WHERE g.fecha >= ${fDesde}::date AND g.fecha <= ${fHasta}::timestamp
        AND u.activo = true
        AND (${isMaster}::boolean OR g.club_id = ${clubId})
      GROUP BY g.fecha, s.objetivo
      ORDER BY g.fecha ASC`

    // Balance neuromuscular semanal
    const weeklyGps = await sql`
      SELECT TO_CHAR(DATE_TRUNC('week', g.fecha), 'YYYY-MM-DD') AS semana,
             AVG(g.acc2 + g.acc3) AS acel,
             AVG(g.dec2 + g.dec3) AS decel,
             AVG(g.n_sprints) AS sprints
      FROM gps_logs g
      JOIN jugadores j ON j.id = g.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      LEFT JOIN sesiones_plan s ON s.id = g.sesion_id
      WHERE g.fecha >= ${fDesde}::date AND g.fecha <= ${fHasta}::timestamp
        AND u.activo = true
        AND (${isMaster}::boolean OR g.club_id = ${clubId})
      GROUP BY DATE_TRUNC('week', g.fecha)
      ORDER BY semana ASC`

    // Contar logs sin cancha asignada para avisar al usuario
    const missingCourts = await sql`
      SELECT COUNT(g.id)::int AS count
      FROM gps_logs g
      LEFT JOIN sesiones_plan s ON s.id = g.sesion_id
      WHERE (g.sesion_id IS NULL OR s.cancha_id IS NULL)
        AND g.fecha >= ${fDesde}::date AND g.fecha <= ${fHasta}::timestamp
        AND (${isMaster}::boolean OR g.club_id = ${clubId})`

    // Partidos disponibles para seleccionar como MD PROMEDIO
    const partidosDisponibles = await sql`
      SELECT id, fecha::text, titulo, rival
      FROM sesiones_plan
      WHERE (objetivo ILIKE '%Partido%' OR tipo ILIKE '%partido%')
        AND (${isMaster}::boolean OR club_id = ${clubId})
      ORDER BY fecha DESC LIMIT 30`

    // Cálculo dinámico de MD Promedio si se envían IDs de partidos_base
    let mdPromedio = null;
    const pBase = searchParams.get('partidos_base');
    if (pBase) {
      const ids = pBase.split(',').map(n => Number(n)).filter(n => !isNaN(n));
      if (ids.length > 0) {
        const res = await sql`
          SELECT 
            AVG(dist_total) AS avg_dist_total,
            AVG(COALESCE(dist_v4,0)) AS avg_dist_v4,
            AVG(COALESCE(dist_v5,0)) AS avg_dist_v5,
            AVG(COALESCE(acc2,0) + COALESCE(acc3,0)) AS avg_acel,
            AVG(COALESCE(dec2,0) + COALESCE(dec3,0)) AS avg_decel,
            AVG(COALESCE(acc3,0)) AS avg_acc_int,
            AVG(COALESCE(n_sprints,0)) AS avg_sprints,
            AVG(NULLIF(COALESCE(max_velocity,0), 0)) AS avg_max_vel,
            AVG(NULLIF(COALESCE(dist_per_min,0), 0)) AS avg_mts_min,
            AVG(COALESCE(duracion_min,0)) AS avg_duracion
          FROM gps_logs g
          JOIN jugadores j ON j.id = g.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE g.sesion_id = ANY(${ids}::int[]) AND u.activo = true`
        
        if (res.length > 0 && res[0].avg_dist_total != null) {
          mdPromedio = {
            avg_dist_total: Number(res[0].avg_dist_total),
            avg_dist_v4: Number(res[0].avg_dist_v4),
            avg_dist_v5: Number(res[0].avg_dist_v5),
            avg_acel: Number(res[0].avg_acel),
            avg_decel: Number(res[0].avg_decel),
            avg_acc_int: Number(res[0].avg_acc_int),
            avg_sprints: Number(res[0].avg_sprints),
            avg_max_vel: Number(res[0].avg_max_vel),
            avg_mts_min: Number(res[0].avg_mts_min),
            avg_duracion: Number(res[0].avg_duracion)
          }
        }
      }
    }

    return NextResponse.json({
      wellnessWeekly: wellnessWeekly.map(r => ({ ...r, semana:String(r.semana||''), avg_fatiga:Number(r.avg_fatiga)||0, avg_sueno:Number(r.avg_sueno)||0, avg_dolor:Number(r.avg_dolor)||0, avg_estres:Number(r.avg_estres)||0, avg_animo:Number(r.avg_animo)||0, total_wellness:Number(r.total_wellness)||0 })),
      rpeWeekly: rpeWeekly.map(r => ({ ...r, semana:String(r.semana||''), avg_rpe:Number(r.avg_rpe)||0, avg_duracion:Number(r.avg_duracion)||0 })),
      readinessToday: readinessToday.map(r => ({ jugador_id:Number(r.jugador_id), nombre:String(r.nombre||''), posicion:String(r.posicion||''), foto_url:r.foto_url?String(r.foto_url):null, fecha:r.fecha?String(r.fecha):null, fatiga:Number(r.fatiga)||0, calidad_sueno:Number(r.calidad_sueno)||0, dolor_muscular:Number(r.dolor_muscular)||0, nivel_estres:Number(r.nivel_estres)||0, estado_animo:Number(r.estado_animo)||0, total_wellness:Number(r.total_wellness)||0 })),
      loadAnalysis: loadAnalysis.map(r => ({
        md_label: String(r.md_label || 'MD'),
        cancha: r.cancha_nombre,
        dimensiones: `${r.largo_m}x${r.ancho_m}`,
        area: Number(r.largo_m) * Number(r.ancho_m),
        metabolic: Number(r.avg_dist_total) + Number(r.avg_dist_hir),
        neuromuscular: Number(r.avg_acel_total) + Number(r.avg_decel_total),
        avg_dist_total: Number(r.avg_dist_total),
        avg_dist_v4: Number(r.avg_dist_v4),
        avg_dist_v5: Number(r.avg_dist_v5),
        avg_acc_int: Number(r.avg_acc_int),
        avg_sprints: Number(r.avg_sprints),
        avg_max_vel: Number(r.avg_max_vel),
        avg_mts_min: Number(r.avg_mts_min),
        avg_duracion: Number(r.avg_duracion),
        avg_acel: Number(r.avg_acel_total),
        avg_decel: Number(r.avg_decel_total),
        registros: r.registros
      })),
      dailyEvolution: dailyEvolution.map(r => ({
        fecha: r.fecha,
        objetivo: r.objetivo,
        max_vel: Number(r.max_vel),
        mts_min: Number(r.mts_min),
        acel: Number(r.acel),
        decel: Number(r.decel),
        sprints: Number(r.sprints)
      })),
      weeklyGps: weeklyGps.map(r => ({
        semana: r.semana,
        acel: Number(r.acel),
        decel: Number(r.decel),
        sprints: Number(r.sprints)
      })),
      missingCourts: missingCourts[0]?.count || 0,
      partidosDisponibles: partidosDisponibles.map(p => ({
        id: p.id, fecha: p.fecha, titulo: p.titulo, rival: p.rival
      })),
      mdPromedio
    })
  } catch (err) {
    console.error('[Analytics GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (clubId) {
      await sql`DELETE FROM wellness_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`;
      await sql`DELETE FROM entrenamiento_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}