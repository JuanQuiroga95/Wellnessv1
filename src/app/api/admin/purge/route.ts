export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'master_admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()

  const ids = [1, 2, 3, 4, 5]

  for (const jid of ids) {
    await sql`DELETE FROM wellness_logs      WHERE jugador_id = ${jid}`
    await sql`DELETE FROM entrenamiento_logs WHERE jugador_id = ${jid}`
    await sql`DELETE FROM partido_logs       WHERE jugador_id = ${jid}`
    await sql`DELETE FROM gps_logs           WHERE jugador_id = ${jid}`
    await sql`DELETE FROM lesiones           WHERE jugador_id = ${jid}`
    await sql`DELETE FROM jugadores          WHERE id         = ${jid}`
  }
  await sql`DELETE FROM usuarios WHERE rol = 'jugador'`

  return NextResponse.json({ ok: true, msg: 'Jugadores y logs eliminados', ids })
}
