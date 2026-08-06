export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  const recentRoutines = await sql`SELECT id, jugador_id, club_id, fecha::text FROM fuerza_rutinas ORDER BY id DESC LIMIT 10`
  const david = await sql`SELECT j.id, j.club_id FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE u.nombre ILIKE '%David Naranjo%'`
  
  return NextResponse.json({
    recentRoutines,
    david: david[0]
  })
}
