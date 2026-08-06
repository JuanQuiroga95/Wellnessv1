export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  
  // Find David Naranjo
  const david = await sql`SELECT j.id FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE u.nombre ILIKE '%David Naranjo%'`
  
  if (!david || david.length === 0) {
    const backup = await sql`SELECT j.id, u.nombre FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE u.nombre ILIKE '%David%'`
    return NextResponse.json({ error: 'David not found', backup })
  }
  
  const jId = david[0].id
  const fechasRaw = await sql`SELECT DISTINCT fecha::text FROM fuerza_rutinas WHERE jugador_id = ${jId}`
  const fechasCast = await sql`SELECT DISTINCT fecha::text as fecha FROM fuerza_rutinas WHERE jugador_id = ${jId}`
  
  return NextResponse.json({
    jugadorId: jId,
    fechasRaw,
    fechasCast
  })
}
