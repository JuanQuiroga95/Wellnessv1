export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// Rebuilds the gps_logs.club_id linkage using the canonical chain:
//   gps_log → jugador → usuario → club
// This handles records inserted before multi-tenancy was wired up.
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    if (!clubId) return NextResponse.json({ error: 'No club' }, { status: 400 })

    // DIAGNOSE: how many gps_logs reference a jugador whose usuario belongs to this admin's club?
    const claimable = await sql`
      SELECT COUNT(*)::int as n
      FROM gps_logs gl
      INNER JOIN jugadores j ON j.id = gl.jugador_id
      INNER JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id = ${clubId}
        AND (gl.club_id IS NULL OR gl.club_id IS DISTINCT FROM ${clubId})
    `

    // Same chain — how many jugadores have wrong/missing club_id?
    const jugadoresWrong = await sql`
      SELECT COUNT(*)::int as n
      FROM jugadores j
      INNER JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id IS NOT NULL
        AND (j.club_id IS NULL OR j.club_id IS DISTINCT FROM u.club_id)
    `

    // FIX STEP 1: align jugadores.club_id to usuarios.club_id (global, all clubs)
    const jugadoresFixed = await sql`
      UPDATE jugadores j
      SET club_id = u.club_id
      FROM usuarios u
      WHERE j.usuario_id = u.id
        AND u.club_id IS NOT NULL
        AND (j.club_id IS NULL OR j.club_id IS DISTINCT FROM u.club_id)
      RETURNING j.id
    `

    // FIX STEP 2: align gps_logs.club_id to the usuario.club_id via jugador (global, all clubs)
    const gpsFixed = await sql`
      UPDATE gps_logs gl
      SET club_id = u.club_id
      FROM jugadores j, usuarios u
      WHERE gl.jugador_id = j.id
        AND j.usuario_id = u.id
        AND u.club_id IS NOT NULL
        AND (gl.club_id IS NULL OR gl.club_id IS DISTINCT FROM u.club_id)
      RETURNING gl.id
    `

    // VERIFY
    const countAfter = await sql`SELECT COUNT(*)::int as n FROM gps_logs WHERE club_id = ${clubId}`

    return NextResponse.json({
      ok: true,
      claimable: (claimable[0] as any)?.n ?? 0,
      jugadoresWrong: (jugadoresWrong[0] as any)?.n ?? 0,
      jugadoresFixed: jugadoresFixed.length,
      gpsLogsFixed: gpsFixed.length,
      totalGpsForClub: (countAfter[0] as any)?.n ?? 0,
    })
  } catch (err: any) {
    console.error('[GPS fix error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
