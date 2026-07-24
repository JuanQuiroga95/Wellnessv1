import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET(req) {
  try {
    const sql = getDb()
    const clubId = 1 // Assuming clubId is 1 for testing
    const desde = '2026-07-01'
    const hastaInc = '2026-07-31 23:59:59'
    
    const gpsLogs = await sql`
      SELECT
        g.jugador_id, u.nombre, j.posicion,
        g.fecha::text, g.sesion_id,
        COALESCE(sp_direct.titulo, sp_bydate.titulo) AS md_label,
        g.dist_total, g.dist_hir, g.dist_v4, g.dist_v5,
        g.player_load, g.max_velocity, g.acc2, g.dec2, g.acc3, g.dec3,
        g.dist_per_min, g.n_sprints, g.duracion_min, g.metricas
      FROM gps_logs g
      JOIN jugadores j ON j.id = g.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      LEFT JOIN sesiones_plan sp_direct ON sp_direct.id = g.sesion_id
      LEFT JOIN sesiones_plan sp_bydate ON sp_bydate.id = (
        SELECT id FROM sesiones_plan
        WHERE club_id = ${clubId}
          AND fecha::date = g.fecha::date
        ORDER BY id
        LIMIT 1
      ) AND g.sesion_id IS NULL
      WHERE g.club_id = ${clubId}
        AND g.fecha >= ${desde}::date AND g.fecha <= ${hastaInc}::timestamp
        AND u.activo = true
      ORDER BY g.fecha, u.nombre
    `
    return NextResponse.json({ count: gpsLogs.length, logs: gpsLogs })
  } catch (e) {
    return NextResponse.json({ error: e.message })
  }
}
