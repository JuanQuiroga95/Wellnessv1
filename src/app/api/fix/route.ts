export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  await sql`DELETE FROM fuerza_rutinas WHERE id = 10 AND jugador_id = 267`
  
  return NextResponse.json({
    success: true,
    deleted: 10
  })
}
