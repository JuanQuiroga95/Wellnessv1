import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s:any){return s?.rol==='admin'||s?.rol==='master_admin'}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const rows = s.clubId ? await sql`
    SELECT e.*, u.nombre, j.posicion
    FROM evaluaciones e
    JOIN jugadores j ON j.id=e.jugador_id
    JOIN usuarios u ON u.id=j.usuario_id
    WHERE e.club_id=${s.clubId} AND u.activo=true
    ORDER BY e.fecha DESC, u.nombre
  ` : []
  return NextResponse.json({ evaluaciones: rows })
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const body = await req.json()
  const sql = getDb()
  const { jugador_id, fecha, pfv, dsi, cmj, rsi, iq, aduc_iso, fms, velocidad_lineal, velocidad_fuerza, yo_yo, notas } = body
  await sql`
    INSERT INTO evaluaciones (jugador_id,club_id,fecha,pfv,dsi,cmj,rsi,iq,aduc_iso,fms,velocidad_lineal,velocidad_fuerza,yo_yo,notas)
    VALUES (${jugador_id},${s.clubId||null},${fecha},${pfv||null},${dsi||null},${cmj||null},${rsi||null},${iq||null},${aduc_iso||null},${fms||null},${velocidad_lineal||null},${velocidad_fuerza||null},${yo_yo||null},${notas||null})
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
  await sql`DELETE FROM evaluaciones WHERE id=${Number(id)} AND club_id=${s.clubId||null}`
  return NextResponse.json({ ok: true })
}
