export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !s.clubId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const sql = getDb()
  const clubId = s.clubId

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'delete') {
    try {
      const isMaster = s.rol === 'master_admin'
      const ts = Date.now()
      const beforeCount = await sql`SELECT /* ${ts} */ COUNT(*) as c FROM entrenamiento_logs WHERE fecha < '2026-07-27'`
      const del = await sql`
        DELETE /* ${ts} */ FROM entrenamiento_logs 
        WHERE fecha < '2026-07-27' 
        RETURNING id
      `
      const afterCount = await sql`SELECT /* ${ts} */ COUNT(*) as c FROM entrenamiento_logs WHERE fecha < '2026-07-27'`
      return NextResponse.json({ 
        success: true, 
        message: '¡Limpieza extrema MEGA completada!', 
        deleted_count: del.length, 
        before_count: beforeCount[0].c,
        after_count: afterCount[0].c
      })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  if (action === 'verify') {
    try {
      const isMaster = s.rol === 'master_admin'
      const ts = Date.now()
      const data = await sql`
        SELECT /* ${ts} */
          TO_CHAR(DATE_TRUNC('week', el.fecha), 'YYYY-MM-DD') AS semana,
          ROUND(AVG(el.carga_ua)::numeric, 2) AS avg_carga,
          COUNT(*) as num_logs
        FROM entrenamiento_logs el
        JOIN jugadores j ON j.id = el.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        WHERE el.fecha >= CURRENT_DATE - 365
          AND (${isMaster}::boolean OR j.club_id = ${clubId})
          AND u.activo = true
        GROUP BY DATE_TRUNC('week', el.fecha)
        ORDER BY DATE_TRUNC('week', el.fecha) ASC
      `
      return NextResponse.json({ success: true, data })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  if (action === 'test') {
    try {
      const isMaster = s.rol === 'master_admin'
      const teamLogs = await sql`
        SELECT 
          TO_CHAR(DATE_TRUNC('week', el.fecha), 'YYYY-MM-DD') AS semana,
          ROUND(AVG(el.carga_ua)::numeric, 2) AS avg_carga,
          COUNT(*) as num_logs
        FROM entrenamiento_logs el
        JOIN jugadores j ON j.id = el.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        WHERE el.fecha >= CURRENT_DATE - 365
          AND (${isMaster}::boolean OR j.club_id = ${clubId})
          AND u.activo = true
        GROUP BY DATE_TRUNC('week', el.fecha)
        ORDER BY DATE_TRUNC('week', el.fecha) ASC
      `
      return NextResponse.json({ success: true, teamLogs })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  if (action === 'inject') {
    try {
      const isMaster = s.rol === 'master_admin'
      
      const jugadores = await sql`
        SELECT j.id 
        FROM jugadores j 
        JOIN usuarios u ON u.id = j.usuario_id 
        WHERE (${isMaster}::boolean OR j.club_id = ${clubId}) AND u.activo = true 
        LIMIT 20
      `
      
      let rowsInserted = 0;
      
      // Inject 3 weeks of past data for each player
      for (const j of jugadores) {
        for (let i = 1; i <= 3; i++) {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() - (i * 7));
          const fechaStr = fecha.toISOString().split('T')[0];
          
          const rpe = 5 + Math.floor(Math.random() * 4); // 5 to 8
          const duracion = 60 + Math.floor(Math.random() * 30); // 60 to 90
          await sql`
            INSERT INTO entrenamiento_logs (jugador_id, fecha, rpe, duracion_min, tipo_sesion, club_id)
            VALUES (${j.id}, ${fechaStr}, ${rpe}, ${duracion}, 'TEST_SEED_ACWR', ${clubId})
          `
          rowsInserted++;
        }
      }
      return NextResponse.json({ success: true, message: `¡Datos falsos inyectados! Se insertaron ${rowsInserted} registros para ${jugadores.length} jugadores. Refrescá el panel principal.` })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Acción no válida. Usa ?action=inject o ?action=delete' })
}
