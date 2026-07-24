export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isMaster(s: any) { return s?.rol === 'master_admin' }

// POST /api/master/cleanup
// Purges all orphan/ghost data from the DB:
// - jugadores whose club_id doesn't exist in clubs
// - usuarios whose club_id doesn't exist in clubs
// - all logs from those jugadores
// - sesiones_plan from deleted admins
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const sql = getDb()
  const report: string[] = []

  try {
    // 1. Find jugadores whose club_id references a non-existent club
    const ghostJugadores = await sql`
      SELECT j.id, j.usuario_id, j.club_id
      FROM jugadores j
      WHERE j.club_id IS NOT NULL
        AND j.club_id NOT IN (SELECT id FROM clubs)`
    report.push(`Jugadores fantasma encontrados: ${(ghostJugadores as any[]).length}`)

    const ghostJids = (ghostJugadores as any[]).map(j => j.id)
    const ghostUids = (ghostJugadores as any[]).map(j => j.usuario_id).filter(Boolean)

    if (ghostJids.length > 0) {
      // Delete logs for ghost jugadores (most have ON DELETE CASCADE but belt+suspenders)
      const r1 = await sql`DELETE FROM wellness_logs      WHERE jugador_id = ANY(${ghostJids}::int[])`
      const r2 = await sql`DELETE FROM entrenamiento_logs WHERE jugador_id = ANY(${ghostJids}::int[])`
      const r3 = await sql`DELETE FROM partido_logs       WHERE jugador_id = ANY(${ghostJids}::int[])`
      const r4 = await sql`DELETE FROM lesiones           WHERE jugador_id = ANY(${ghostJids}::int[])`
      try { await sql`DELETE FROM gps_logs     WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM pesajes      WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM cmj_sessions WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM iso_sessions WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM rsi_tests    WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM dsi_tests    WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM pfv_puntos   WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM pfv_sesiones WHERE jugador_id = ANY(${ghostJids}::int[])` } catch(_) {}
      report.push('Logs de jugadores fantasma eliminados')

      // Delete jugadores rows
      await sql`DELETE FROM jugadores WHERE id = ANY(${ghostJids}::int[])`
      report.push(`Jugadores fantasma eliminados: ${ghostJids.length}`)
    }

    // 2. Find usuarios whose club_id references a non-existent club
    const ghostUsuarios = await sql`
      SELECT id FROM usuarios
      WHERE club_id IS NOT NULL
        AND club_id NOT IN (SELECT id FROM clubs)`
    const ghostUidsExtra = (ghostUsuarios as any[]).map(u => u.id)
    report.push(`Usuarios fantasma encontrados: ${ghostUidsExtra.length}`)

    if (ghostUidsExtra.length > 0) {
      // Delete their sesiones_plan
      await sql`DELETE FROM sesiones_plan WHERE admin_id = ANY(${ghostUidsExtra}::int[])`
      // Delete club_settings
      try { await sql`DELETE FROM club_settings WHERE admin_id = ANY(${ghostUidsExtra}::int[])` } catch(_) {}
      // Delete the ghost usuarios
      await sql`DELETE FROM usuarios WHERE id = ANY(${ghostUidsExtra}::int[])`
      report.push(`Usuarios fantasma eliminados: ${ghostUidsExtra.length}`)
    }

    // 3. Orphan logs — jugador_id not in jugadores at all
    await sql`DELETE FROM wellness_logs      WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM entrenamiento_logs WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM partido_logs       WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM lesiones           WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
    try { await sql`DELETE FROM gps_logs WHERE jugador_id NOT IN (SELECT id FROM jugadores)` } catch(_) {}
    report.push('Logs huérfanos (sin jugador) eliminados')

    // 4. Orphan jugadores — usuario_id not in usuarios
    const orphanJ = await sql`DELETE FROM jugadores WHERE usuario_id NOT IN (SELECT id FROM usuarios) RETURNING id`
    if ((orphanJ as any[]).length > 0) report.push(`Jugadores sin usuario eliminados: ${(orphanJ as any[]).length}`)

    // 5. Also report inactive jugadores (activo=false) so master knows they exist
    const inactiveJ = await sql`
      SELECT u.id, u.nombre, u.club_id, c.nombre AS club_nombre
      FROM usuarios u
      JOIN clubs c ON c.id = u.club_id
      WHERE u.rol = 'jugador' AND u.activo = false`
    if ((inactiveJ as any[]).length > 0) {
      report.push(`Jugadores inactivos (activo=false) encontrados: ${(inactiveJ as any[]).length} — ${(inactiveJ as any[]).map((u:any)=>u.nombre).join(', ')}`)
    }

    return NextResponse.json({ ok: true, report })
  } catch(e: any) {
    console.error('[master/cleanup error]', e)
    return NextResponse.json({ error: String(e), report }, { status: 500 })
  }
}
