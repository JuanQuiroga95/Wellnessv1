export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s:any){return s?.rol==='admin'||s?.rol==='master_admin'}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const rows = await sql`
    SELECT * FROM biblioteca_tareas
    WHERE admin_id=${s.userId}
    ORDER BY veces_usada DESC, created_at DESC
    LIMIT 100
  `
  return NextResponse.json({ tareas: rows })
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const body = await req.json()
  const sql = getDb()
  if (body.action === 'usar') {
    await sql`UPDATE biblioteca_tareas SET veces_usada=veces_usada+1 WHERE id=${body.id} AND admin_id=${s.userId}`
    return NextResponse.json({ ok: true })
  }
  const { nombre, ventana, subtarea, jugadores, series, minutos, pausa, largo, ancho, descripcion } = body
  await sql`
    INSERT INTO biblioteca_tareas (admin_id,nombre,ventana,subtarea,jugadores,series,minutos,pausa,largo,ancho,descripcion)
    VALUES (${s.userId},${nombre},${ventana||null},${subtarea||null},${jugadores||null},${series||null},${minutos||null},${pausa||null},${largo||null},${ancho||null},${descripcion||null})
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({error:'Falta id'},{status:400})
  const sql = getDb()
  await sql`DELETE FROM biblioteca_tareas WHERE id=${Number(id)} AND admin_id=${s.userId}`
  return NextResponse.json({ ok: true })
}
