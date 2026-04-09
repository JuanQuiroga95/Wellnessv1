export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdminOrMaster(s: any) {
  return s?.rol === 'admin' || s?.rol === 'master_admin'
}

/**
 * POST /api/master/purge-player
 * Body: { usuario_id: number } OR { nombre: string, club_id: number }
 *
 * Force-deletes a player and ALL their data across every table.
 * Used when the standard DELETE leaves ghost rows.
 * Requires admin or master_admin session.
 */
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdminOrMaster(s)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const sql = getDb()
  const report: string[] = []

  // ── Resolve usuario_id ──────────────────────────────────────────────────────
  let resolvedUsuarioIds: number[] = []

  if (body.usuario_id) {
    // Direct ID lookup (most reliable)
    resolvedUsuarioIds = [Number(body.usuario_id)]
  } else if (body.nombre && body.club_id) {
    // Lookup by name + club (for when you only know the display name)
    const rows = await sql`
      SELECT id FROM usuarios
      WHERE LOWER(nombre) = LOWER(${String(body.nombre).trim()})
        AND club_id = ${Number(body.club_id)}
        AND rol = 'jugador'`
    resolvedUsuarioIds = (rows as any[]).map(r => r.id)
  } else if (body.nombre && s.clubId) {
    // Lookup by name using session club
    const rows = await sql`
      SELECT id FROM usuarios
      WHERE LOWER(nombre) = LOWER(${String(body.nombre).trim()})
        AND club_id = ${s.clubId}
        AND rol = 'jugador'`
    resolvedUsuarioIds = (rows as any[]).map(r => r.id)
  }

  if (resolvedUsuarioIds.length === 0) {
    return NextResponse.json({ error: 'Jugador no encontrado', report }, { status: 404 })
  }

  // Non-master admins can only purge players from their own club
  if (s.rol !== 'master_admin') {
    const check = await sql`
      SELECT id FROM usuarios
      WHERE id = ANY(${resolvedUsuarioIds}::int[])
        AND club_id = ${s.clubId ?? null}
        AND rol = 'jugador'`
    resolvedUsuarioIds = (check as any[]).map(r => r.id)
    if (resolvedUsuarioIds.length === 0) {
      return NextResponse.json({ error: 'No autorizado: jugador no pertenece a tu club' }, { status: 403 })
    }
  }

  report.push(`Usuarios a purgar: ${resolvedUsuarioIds.join(', ')}`)

  // ── Get ALL jugador rows for these usuarios ─────────────────────────────────
  const jugRows = await sql`
    SELECT id FROM jugadores
    WHERE usuario_id = ANY(${resolvedUsuarioIds}::int[])`
  const jugadorIds = (jugRows as any[]).map(r => r.id)
  report.push(`Jugador IDs encontrados: ${jugadorIds.join(', ') || 'ninguno'}`)

  if (jugadorIds.length > 0) {
    // Delete all data tables
    const d1 = await sql`DELETE FROM wellness_logs      WHERE jugador_id = ANY(${jugadorIds}::int[])`
    const d2 = await sql`DELETE FROM entrenamiento_logs WHERE jugador_id = ANY(${jugadorIds}::int[])`
    const d3 = await sql`DELETE FROM partido_logs       WHERE jugador_id = ANY(${jugadorIds}::int[])`
    const d4 = await sql`DELETE FROM lesiones           WHERE jugador_id = ANY(${jugadorIds}::int[])`
    const d5 = await sql`DELETE FROM gps_logs           WHERE jugador_id = ANY(${jugadorIds}::int[])`
    report.push(`Logs eliminados: wellness=${(d1 as any).count ?? '?'}, entreno=${(d2 as any).count ?? '?'}, partidos=${(d3 as any).count ?? '?'}, lesiones=${(d4 as any).count ?? '?'}, gps=${(d5 as any).count ?? '?'}`)

    // Evaluation tables (ignore if they don't exist yet)
    try { await sql`DELETE FROM pesajes      WHERE jugador_id = ANY(${jugadorIds}::int[])` } catch(_) {}
    try { await sql`DELETE FROM cmj_sessions WHERE jugador_id = ANY(${jugadorIds}::int[])` } catch(_) {}
    try { await sql`DELETE FROM iso_sessions WHERE jugador_id = ANY(${jugadorIds}::int[])` } catch(_) {}
    try { await sql`DELETE FROM rsi_tests    WHERE jugador_id = ANY(${jugadorIds}::int[])` } catch(_) {}
    try { await sql`DELETE FROM dsi_tests    WHERE jugador_id = ANY(${jugadorIds}::int[])` } catch(_) {}
    try { await sql`DELETE FROM pfv_puntos   WHERE jugador_id = ANY(${jugadorIds}::int[])` } catch(_) {}
    try { await sql`DELETE FROM pfv_sesiones WHERE jugador_id = ANY(${jugadorIds}::int[])` } catch(_) {}
    report.push('Tablas de evaluación limpiadas')

    // Delete jugadores rows
    await sql`DELETE FROM jugadores WHERE id = ANY(${jugadorIds}::int[])`
    report.push(`Jugadores eliminados: ${jugadorIds.length}`)
  }

  // Delete usuarios rows (also any orphan jugadores pointing to these users)
  await sql`DELETE FROM jugadores WHERE usuario_id = ANY(${resolvedUsuarioIds}::int[])`
  await sql`DELETE FROM usuarios   WHERE id         = ANY(${resolvedUsuarioIds}::int[])`
  report.push(`Usuarios eliminados: ${resolvedUsuarioIds.length}`)

  return NextResponse.json({ ok: true, report })
}
