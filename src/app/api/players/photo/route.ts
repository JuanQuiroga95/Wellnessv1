import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'admin') return NextResponse.json({error:'No autorizado'},{status:403})
  const { jugador_id, foto_url } = await req.json()
  const sql = getDb()
  await sql`UPDATE jugadores SET foto_url=${foto_url} WHERE id=${jugador_id}`
  return NextResponse.json({ok:true})
}
