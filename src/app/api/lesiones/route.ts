import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const {searchParams} = new URL(req.url)
  const activas = searchParams.get('activas')!=='false'
  const clubId = s.clubId ?? null
  const sql = getDb()
  const r = activas
    ? await sql`SELECT l.id,l.jugador_id::int,l.fecha_inicio::text,l.fecha_alta::text,l.tipo_lesion,l.zona,
                       l.descripcion,l.eta_dias::int,l.estado,l.activa,u.nombre AS jugador_nombre,j.posicion
                FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id JOIN usuarios u ON u.id=j.usuario_id
                WHERE l.activa=true AND u.club_id=${clubId} ORDER BY l.fecha_inicio DESC`
    : await sql`SELECT l.id,l.jugador_id::int,l.fecha_inicio::text,l.fecha_alta::text,l.tipo_lesion,l.zona,
                       l.descripcion,l.eta_dias::int,l.estado,l.activa,u.nombre AS jugador_nombre,j.posicion
                FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id JOIN usuarios u ON u.id=j.usuario_id
                WHERE u.club_id=${clubId} ORDER BY l.fecha_inicio DESC`
  return NextResponse.json(r)
}
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const {jugador_id,fecha_inicio,tipo_lesion,zona,descripcion,eta_dias,estado} = await req.json()
  const sql = getDb(); const d = fecha_inicio||new Date().toISOString().split('T')[0]
  const [r] = await sql`INSERT INTO lesiones(jugador_id,fecha_inicio,tipo_lesion,zona,descripcion,eta_dias,estado,activa,club_id)
    VALUES(${jugador_id},${d},${tipo_lesion||null},${zona||null},${descripcion||null},${eta_dias||null},${estado||'Tratamiento'},true,${s.clubId??null})
    RETURNING id`
  return NextResponse.json(r)
}
export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const {id,estado,activa,fecha_alta,eta_dias} = await req.json(); const sql = getDb()
  if (estado!==undefined) await sql`UPDATE lesiones SET estado=${estado} WHERE id=${id}`
  if (activa!==undefined) await sql`UPDATE lesiones SET activa=${activa}${activa===false?sql`,fecha_alta=${fecha_alta||new Date().toISOString().split('T')[0]}`:sql``} WHERE id=${id}`
  if (eta_dias!==undefined) await sql`UPDATE lesiones SET eta_dias=${eta_dias} WHERE id=${id}`
  return NextResponse.json({ok:true})
}
