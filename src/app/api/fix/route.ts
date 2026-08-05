export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  
  // Find Panama club ID
  const clubs = await sql`SELECT id, nombre FROM clubs WHERE nombre ILIKE '%panama%' OR nombre ILIKE '%caid%' OR nombre ILIKE '%c.a.i%' OR nombre ILIKE '%cai%'`
  const clubId = clubs[0]?.id

  if (!clubId) return NextResponse.json({ error: 'Club not found', clubs })

  const logsRPE = await sql`SELECT el.id, el.fecha, el.rpe, el.created_at FROM entrenamiento_logs el JOIN jugadores j ON j.id = el.jugador_id JOIN usuarios u ON u.id = j.usuario_id WHERE u.club_id = ${clubId} OR j.club_id = ${clubId} ORDER BY el.id DESC LIMIT 10`
  const logsWellness = await sql`SELECT id, fecha, created_at FROM wellness WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId} OR usuario_id IN (SELECT id FROM usuarios WHERE club_id = ${clubId})) ORDER BY id DESC LIMIT 10`

  return NextResponse.json({
    club: clubs[0],
    logsRPE,
    logsWellness
  })
}
