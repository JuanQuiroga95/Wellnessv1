export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// One-time backfill: links orphaned GPS records to the current admin's club.
// Step 1: jugadores without club_id → inherit from their linked usuario
// Step 2: gps_logs without club_id → inherit from their jugador
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    if (!clubId) return NextResponse.json({ error: 'No club' }, { status: 400 })

    // Step 1: set club_id on jugadores whose usuario has club_id set
    const jugadoresFixed = await sql`
      UPDATE jugadores j SET club_id = u.club_id
      FROM usuarios u
      WHERE j.usuario_id = u.id
        AND j.club_id IS NULL
        AND u.club_id IS NOT NULL
      RETURNING j.id
    `

    // Step 2: backfill gps_logs.club_id from jugadores.club_id (now populated)
    const gpsFixed = await sql`
      UPDATE gps_logs
      SET club_id = (SELECT j.club_id FROM jugadores j WHERE j.id = gps_logs.jugador_id)
      WHERE club_id IS NULL
        AND jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})
      RETURNING id
    `

    // Verify result
    const countAfter = await sql`
      SELECT COUNT(*)::int as n FROM gps_logs
      WHERE club_id = ${clubId} OR jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})
    `

    return NextResponse.json({
      ok: true,
      jugadoresFixed: jugadoresFixed.length,
      gpsLogsFixed: gpsFixed.length,
      totalGpsForClub: (countAfter[0] as any)?.n ?? 0,
    })
  } catch (err: any) {
    console.error('[GPS fix error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
