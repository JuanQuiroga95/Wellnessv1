export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isMaster(s: any) { return s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const clubs = await sql`
    SELECT c.id, c.nombre, c.logo_url, c.pais, c.created_at::text,
           COUNT(DISTINCT CASE WHEN u.rol='admin' THEN u.id END)::int AS coaches,
           COUNT(DISTINCT CASE WHEN u.rol='jugador' THEN u.id END)::int AS jugadores
    FROM clubs c
    LEFT JOIN usuarios u ON u.club_id=c.id AND u.activo=true
    GROUP BY c.id ORDER BY c.nombre`
  return NextResponse.json(clubs)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { nombre, logo_url, pais } = await req.json()
  if (!nombre) return NextResponse.json({error:'Nombre requerido'},{status:400})
  const sql = getDb()
  const [club] = await sql`INSERT INTO clubs(nombre,logo_url,pais) VALUES(${nombre},${logo_url||null},${pais||null}) RETURNING id,nombre,logo_url,pais`
  return NextResponse.json(club)
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { id, nombre, logo_url, pais } = await req.json()
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  const sql = getDb()
  await sql`UPDATE clubs SET nombre=COALESCE(${nombre??null},nombre), logo_url=COALESCE(${logo_url??null},logo_url), pais=COALESCE(${pais??null},pais) WHERE id=${id}`
  return NextResponse.json({ok:true})
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  const sql = getDb()
  await sql`DELETE FROM clubs WHERE id=${id}`
  return NextResponse.json({ok:true})
}
