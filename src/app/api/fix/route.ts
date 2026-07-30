import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sql = getDb()
    
    // Find Franco Tosoni's club
    const users = await sql`SELECT id, nombre, club_id FROM usuarios WHERE nombre ILIKE '%Franco Tosoni%' OR nombre ILIKE '%Tosoni%'`
    if (users.length === 0) {
      return NextResponse.json({ error: 'No user found' })
    }
    
    const clubId = users[0].club_id
    
    if (!clubId) {
      return NextResponse.json({ error: 'User has no club_id', user: users[0] })
    }

    const { searchParams } = new URL(req.url)
    const fromDate = searchParams.get('from') // e.g. 2026-07-27
    const toDate = searchParams.get('to')     // e.g. 2026-07-26

    if (!fromDate || !toDate) {
      // Find what dates are currently populated for his club
      const eDates = await sql`
        SELECT el.fecha::text, count(el.id)::int as cnt
        FROM entrenamiento_logs el
        JOIN jugadores j ON j.id = el.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId})
        GROUP BY el.fecha
        ORDER BY el.fecha DESC
        LIMIT 10
      `
      return NextResponse.json({ 
        message: 'Need ?from=YYYY-MM-DD&to=YYYY-MM-DD',
        club_id: clubId,
        user: users[0].nombre,
        recent_log_dates: eDates
      })
    }

    // Get the logs to update for training
    const eLogs = await sql`
      SELECT el.id, el.fecha, u.nombre
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId})
      AND el.fecha = ${fromDate}::date
    `

    // Update training logs
    const eUpdate = await sql`
      UPDATE entrenamiento_logs el
      SET fecha = ${toDate}::date
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.jugador_id = j.id
      AND (u.club_id = ${clubId} OR j.club_id = ${clubId})
      AND el.fecha = ${fromDate}::date
      RETURNING el.id
    `

    // Update wellness logs
    const wUpdate = await sql`
      UPDATE wellness_logs wl
      SET fecha = ${toDate}::date
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE wl.jugador_id = j.id
      AND (u.club_id = ${clubId} OR j.club_id = ${clubId})
      AND wl.fecha = ${fromDate}::date
      RETURNING wl.id
    `

    return NextResponse.json({
      message: 'Success',
      eLogsFound: eLogs,
      eLogsUpdated: eUpdate.length,
      wLogsUpdated: wUpdate.length
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message })
  }
}
