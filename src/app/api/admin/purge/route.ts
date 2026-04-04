export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
 
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'master_admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()
 
  try {
    // Verificar qué hay antes
    const antes = await sql`SELECT id FROM jugadores`
    const antesW = await sql`SELECT COUNT(*)::int AS c FROM wellness_logs`
    
    // Borrar en orden correcto
    await sql`DELETE FROM evaluaciones WHERE jugador_id IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM wellness_logs WHERE jugador_id IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM entrenamiento_logs WHERE jugador_id IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM partido_logs WHERE jugador_id IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM gps_logs WHERE jugador_id IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM lesiones WHERE jugador_id IN (SELECT id FROM jugadores)`
    await sql`DELETE FROM jugadores`
    await sql`DELETE FROM usuarios WHERE rol = 'jugador'`
 
    // Verificar qué queda
    const despues = await sql`SELECT id FROM jugadores`
    const despuesW = await sql`SELECT COUNT(*)::int AS c FROM wellness_logs`
 
    return NextResponse.json({
      ok: true,
      antes: { jugadores: antes.length, wellness_logs: (antesW[0] as any).c },
      despues: { jugadores: despues.length, wellness_logs: (despuesW[0] as any).c },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
