export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  
  // Check recent routines in DB
  const recentRoutines = await sql`SELECT id, jugador_id, fecha::text FROM fuerza_rutinas ORDER BY id DESC LIMIT 5`
  
  return NextResponse.json({
    recentRoutines
  })
}
