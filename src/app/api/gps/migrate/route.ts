export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// Migrates GPS logs (and the jugadores they reference) from fromClubId to the
// admin's current clubId. Use case: admin originally registered under another
// club and wants to bring their historical data to the current account.
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const sql = getDb()
    const toClubId = s.clubId ? Number(s.clubId) : null
    if (!toClubId) return NextResponse.json({ error: 'No tenés club asignado' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const fromClubId = Number(body.fromClubId)
    if (!fromClubId || isNaN(fromClubId)) return NextResponse.json({ error: 'fromClubId inválido' }, { status: 400 })
    if (fromClubId === toClubId) return NextResponse.json({ error: 'fromClubId y toClubId son iguales' }, { status: 400 })

    // Move jugadores from fromClub to toClub (their gps_logs/wellness_logs/etc keep referencing them via jugador_id)
    const jugadoresMoved = await sql`
      UPDATE jugadores SET club_id = ${toClubId}
      WHERE club_id = ${fromClubId}
      RETURNING id
    `

    // Move usuarios (the players' user accounts) from fromClub to toClub
    const usuariosMoved = await sql`
      UPDATE usuarios SET club_id = ${toClubId}
      WHERE club_id = ${fromClubId}
        AND id != ${s.userId}
      RETURNING id
    `

    // Move all gps_logs from fromClub to toClub
    const gpsMoved = await sql`
      UPDATE gps_logs SET club_id = ${toClubId}
      WHERE club_id = ${fromClubId}
      RETURNING id
    `

    // Move related per-jugador tables that have club_id
    const wellnessMoved = await sql`UPDATE wellness_logs SET club_id = ${toClubId} WHERE club_id = ${fromClubId} RETURNING id`
    const entrenoMoved = await sql`UPDATE entrenamiento_logs SET club_id = ${toClubId} WHERE club_id = ${fromClubId} RETURNING id`
    const partidoMoved = await sql`UPDATE partido_logs SET club_id = ${toClubId} WHERE club_id = ${fromClubId} RETURNING id`
    const lesionesMoved = await sql`UPDATE lesiones SET club_id = ${toClubId} WHERE club_id = ${fromClubId} RETURNING id`

    // Sesiones planificadas
    const sesionesMoved = await sql`UPDATE sesiones_plan SET club_id = ${toClubId} WHERE club_id = ${fromClubId} RETURNING id`

    return NextResponse.json({
      ok: true,
      fromClubId,
      toClubId,
      jugadores: jugadoresMoved.length,
      usuarios: usuariosMoved.length,
      gps: gpsMoved.length,
      wellness: wellnessMoved.length,
      entrenamientos: entrenoMoved.length,
      partidos: partidoMoved.length,
      lesiones: lesionesMoved.length,
      sesiones: sesionesMoved.length,
    })
  } catch (err: any) {
    console.error('[GPS migrate error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
