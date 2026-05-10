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

    // Count all gps_logs (no filter)
    const total = await sql`SELECT COUNT(*)::int as n FROM gps_logs`
    results.totalGpsLogs = (total[0] as any)?.n ?? 0

    // Count gps_logs with club_id = clubId
    if (clubId) {
      const byClub = await sql`SELECT COUNT(*)::int as n FROM gps_logs WHERE club_id = ${clubId}`
      results.gpsLogsByClubId = (byClub[0] as any)?.n ?? 0

      // Count jugadores in this club
      const jugadores = await sql`SELECT COUNT(*)::int as n FROM jugadores WHERE club_id = ${clubId}`
      results.jugadoresInClub = (jugadores[0] as any)?.n ?? 0

      // Count gps_logs via jugadores subquery
      const byJugadores = await sql`SELECT COUNT(*)::int as n FROM gps_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`
      results.gpsLogsByJugadores = (byJugadores[0] as any)?.n ?? 0

      // Count with either condition
      const byEither = await sql`SELECT COUNT(*)::int as n FROM gps_logs WHERE club_id = ${clubId} OR jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`
      results.gpsLogsByEither = (byEither[0] as any)?.n ?? 0

      // Raw rows (last 20, no grouping)
      const rawRows = await sql`SELECT id, jugador_id, club_id, fecha::text, tipo_sesion, sesion_id, created_at::text FROM gps_logs ORDER BY id DESC LIMIT 20`
      results.rawRows = rawRows

      // History query result (current)
      const history = await sql`
        SELECT fecha::date::text as fecha, tipo_sesion, sesion_id, COUNT(*)::int as n, ARRAY_AGG(id)::int[] as ids
        FROM gps_logs
        WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})
        GROUP BY 1, 2, 3 ORDER BY fecha DESC LIMIT 20
      `
      results.historyByJugadores = history

      // History with club_id OR jugadores
      const history2 = await sql`
        SELECT fecha::date::text as fecha, tipo_sesion, sesion_id, COUNT(*)::int as n, ARRAY_AGG(id)::int[] as ids
        FROM gps_logs
        WHERE club_id = ${clubId} OR jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})
        GROUP BY 1, 2, 3 ORDER BY fecha DESC LIMIT 20
      `
      results.historyByEither = history2
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
