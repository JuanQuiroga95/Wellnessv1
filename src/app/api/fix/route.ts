export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  
  await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS es_seleccion BOOLEAN DEFAULT FALSE`
  await sql`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS club_origen VARCHAR(100)`
  await sql`ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS observaciones TEXT`
  
  return NextResponse.json({
    message: 'Migrations applied successfully'
  })
}
