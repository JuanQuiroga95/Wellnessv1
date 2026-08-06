export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  const whoIs267 = await sql`SELECT j.id, u.nombre, c.nombre as club FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id LEFT JOIN clubs c ON c.id = j.club_id WHERE j.id = 267`
  
  return NextResponse.json({
    whoIs267
  })
}
