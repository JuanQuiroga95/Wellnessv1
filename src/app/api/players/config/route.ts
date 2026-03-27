import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.rol !== 'jugador') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { email, hora_recordatorio } = await req.json()
  const sql = getDb()
  // Update jugador record
  await sql`UPDATE jugadores SET email=${email||null}, hora_recordatorio=${hora_recordatorio||'08:00'} WHERE id=${session.jugadorId}`
  // Also update email on usuario for future use
  if (email) await sql`UPDATE usuarios SET email=${email} WHERE id=${session.userId}`
  return NextResponse.json({ ok: true })
}
