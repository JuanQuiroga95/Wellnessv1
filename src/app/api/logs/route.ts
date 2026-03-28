import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s) return NextResponse.json({error:'No autorizado'},{status:401})
  const {searchParams} = new URL(req.url); const jid = searchParams.get('jugadorId'); const days = parseInt(searchParams.get('days')||'28')
  if (s.rol==='jugador'&&String(s.jugadorId)!==jid) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const r = await sql`SELECT id,fecha::text,carga_ua::int,rpe::int,duracion_min::int,tipo_sesion FROM entrenamiento_logs WHERE jugador_id=${jid} AND fecha>=CURRENT_DATE-${days}::int ORDER BY fecha ASC`
  return NextResponse.json(r)
}
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s) return NextResponse.json({error:'No autorizado'},{status:401})
  const {jugador_id,rpe,duracion_min,tipo_sesion,fecha} = await req.json()
  if (s.rol==='jugador'&&s.jugadorId!==jugador_id) return NextResponse.json({error:'No autorizado'},{status:403})
  if (rpe===null||rpe===undefined) return NextResponse.json({error:'RPE requerido'},{status:400})
  const sql = getDb(); const d = fecha||new Date().toISOString().split('T')[0]
  const mins = duracion_min || 0
  const clubId = s.clubId ?? null
  const [r] = await sql`INSERT INTO entrenamiento_logs(jugador_id,rpe,duracion_min,tipo_sesion,fecha,club_id) VALUES(${jugador_id},${rpe},${mins},${tipo_sesion||'EQUIPO'},${d},${clubId}) RETURNING id,fecha::text,carga_ua::int`
  return NextResponse.json(r)
}
export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s) return NextResponse.json({error:'No autorizado'},{status:401})
  if (!isAdmin(s)) return NextResponse.json({error:'Solo el Coach puede editar minutos'},{status:403})
  const {id,duracion_min} = await req.json()
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  if (!duracion_min || duracion_min <= 0) return NextResponse.json({error:'duracion_min debe ser mayor a 0'},{status:400})
  const sql = getDb()
  const [r] = await sql`UPDATE entrenamiento_logs SET duracion_min=${duracion_min} WHERE id=${id} RETURNING id,fecha::text,carga_ua::int,duracion_min::int,rpe::int`
  return NextResponse.json(r)
}
