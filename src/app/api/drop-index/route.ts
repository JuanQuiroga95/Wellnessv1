import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  try {
    await sql`DROP INDEX IF EXISTS idx_wellness_jugador_fecha_unique`
    return NextResponse.json({ ok: true, message: 'Dropped idx_wellness_jugador_fecha_unique' })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
