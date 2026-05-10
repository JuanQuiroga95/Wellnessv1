export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    const results: any = { clubId, userId: s.userId }

    const total = await sql`SELECT COUNT(*)::int as n FROM gps_logs`
    results.totalGpsLogs = (total[0] as any)?.n ?? 0

    if (clubId) {
      const byClub = await sql`SELECT COUNT(*)::int as n FROM gps_logs WHERE club_id = ${clubId}`
      results.gpsLogsByClubId = (byClub[0] as any)?.n ?? 0

      const jugadores = await sql`SELECT COUNT(*)::int as n FROM jugadores WHERE club_id = ${clubId}`
      results.jugadoresInClub = (jugadores[0] as any)?.n ?? 0

      // GPS logs reachable via usuario.club_id chain (this is what /api/gps/fix will claim)
      const viaUsuario = await sql`
        SELECT COUNT(*)::int as n FROM gps_logs gl
        INNER JOIN jugadores j ON j.id = gl.jugador_id
        INNER JOIN usuarios u ON u.id = j.usuario_id
        WHERE u.club_id = ${clubId}
      `
      results.gpsLogsViaUsuario = (viaUsuario[0] as any)?.n ?? 0

      // Distribution: how are the 148 records distributed across clubs (via usuario)?
      const distribution = await sql`
        SELECT
          gl.club_id as gps_club_id,
          u.club_id as usuario_club_id,
          COUNT(*)::int as n
        FROM gps_logs gl
        LEFT JOIN jugadores j ON j.id = gl.jugador_id
        LEFT JOIN usuarios u ON u.id = j.usuario_id
        GROUP BY gl.club_id, u.club_id
        ORDER BY n DESC
        LIMIT 10
      `
      results.distribution = distribution
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
