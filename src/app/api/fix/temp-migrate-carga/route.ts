import { getDb } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sql = getDb()
  try {
    await sql`ALTER TABLE entrenamiento_logs DROP COLUMN IF EXISTS carga_ua`
    await sql`ALTER TABLE entrenamiento_logs ADD COLUMN carga_ua INTEGER`
    await sql`UPDATE entrenamiento_logs SET carga_ua = COALESCE(rpe,0) * COALESCE(duracion_min,0)`
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
