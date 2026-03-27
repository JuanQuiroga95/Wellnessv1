import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||s.rol!=='admin') return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const players = await sql`SELECT id FROM jugadores`
  for (const p of players as any[]) {
    for (let i=27;i>=0;i--) {
      if (Math.random()>.15) {
        const rpe=Math.floor(Math.random()*7)+3, dur=Math.floor(Math.random()*40)+60
        const d=new Date(); d.setDate(d.getDate()-i)
        try { await sql`INSERT INTO entrenamiento_logs(jugador_id,fecha,rpe,duracion_min,tipo_sesion) VALUES(${p.id},${d.toISOString().split('T')[0]},${rpe},${dur},'EQUIPO') ON CONFLICT DO NOTHING` } catch{}
      }
    }
  }
  return NextResponse.json({ok:true})
}
