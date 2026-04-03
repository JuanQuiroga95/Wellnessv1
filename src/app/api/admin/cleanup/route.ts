export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'master_admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()

  const orphans = await sql`SELECT id FROM jugadores WHERE usuario_id NOT IN (SELECT id FROM usuarios)`
  if (orphans.length === 0) return NextResponse.json({ ok: true, deleted: 0, msg: 'Nada que limpiar' })

  const ids = orphans.map((r: any) => r.id)
  for (const jid of ids) {
    await sql`DELETE FROM wellness_logs WHERE jugador_id = ${jid}`
    await sql`DELETE FROM entrenamiento_logs WHERE jugador_id = ${jid}`
    await sql`DELETE FROM partido_logs WHERE jugador_id = ${jid}`
    await sql`DELETE FROM gps_logs WHERE jugador_id = ${jid}`
    await sql`DELETE FROM lesiones WHERE jugador_id = ${jid}`
    await sql`DELETE FROM jugadores WHERE id = ${jid}`
  }

  return NextResponse.json({ ok: true, deleted: ids.length, jugador_ids: ids })
}
