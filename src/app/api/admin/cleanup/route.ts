export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'master_admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()
  const { searchParams } = new URL(req.url)
  const dryRun = searchParams.get('dry') === '1'
  const clubId = s.clubId ?? null

  // 1. Jugadores del club (con o sin usuario activo)
  const jugadores = clubId
    ? await sql`SELECT j.id FROM jugadores j LEFT JOIN usuarios u ON u.id = j.usuario_id WHERE COALESCE(u.club_id, j.club_id) = ${clubId}`
    : await sql`SELECT id FROM jugadores`

  // 2. Logs huérfanos (jugador_id que ya no existe en jugadores)
  const orphanLogs = await sql`
    SELECT jugador_id FROM (
      SELECT jugador_id FROM wellness_logs
      UNION SELECT jugador_id FROM entrenamiento_logs
      UNION SELECT jugador_id FROM partido_logs
      UNION SELECT jugador_id FROM gps_logs
    ) all_logs
    WHERE jugador_id NOT IN (SELECT id FROM jugadores)`

  const jIds = jugadores.map((r: any) => r.id)
  const orphanIds = orphanLogs.map((r: any) => r.jugador_id)

  if (dryRun) {
    return NextResponse.json({ dry_run: true, jugadores_a_borrar: jIds.length, orphan_logs: orphanIds.length, jugador_ids: jIds, orphan_ids: orphanIds })
  }

  // 3. Borrar logs huérfanos
  if (orphanIds.length > 0) {
    await sql`DELETE FROM wellness_logs      WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM entrenamiento_logs WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM partido_logs       WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM gps_logs           WHERE jugador_id NOT IN (SELECT id FROM jugadores)`
  }

  // 4. Borrar todos los datos de cada jugador del club
  for (const jid of jIds) {
    await sql`DELETE FROM wellness_logs      WHERE jugador_id = ${jid}`
    await sql`DELETE FROM entrenamiento_logs WHERE jugador_id = ${jid}`
    await sql`DELETE FROM partido_logs       WHERE jugador_id = ${jid}`
    await sql`DELETE FROM gps_logs           WHERE jugador_id = ${jid}`
    await sql`DELETE FROM lesiones           WHERE jugador_id = ${jid}`
  }
  if (jIds.length > 0) {
    await sql`DELETE FROM jugadores WHERE id IN ${sql(jIds)}`
    clubId
      ? await sql`DELETE FROM usuarios WHERE rol = 'jugador' AND club_id = ${clubId}`
      : await sql`DELETE FROM usuarios WHERE rol = 'jugador'`
  }

  return NextResponse.json({ ok: true, deleted_jugadores: jIds.length, deleted_orphan_logs: orphanIds.length })
}
