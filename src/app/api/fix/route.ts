export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    await sql`UPDATE entrenamiento_logs SET carga_ua = COALESCE(rpe,0) * COALESCE(duracion_min,0)`
    return NextResponse.json({ success: true, msg: 'Datos de carga_ua recalculados exitosamente.' })
  } catch (error: any) {
    console.error("API FIX ERROR:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
