export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const { jugador_id, nombre } = b
  if (!jugador_id || !nombre) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  const sql = getDb()
  const [row] = await sql`
    INSERT INTO pfv_sesiones (jugador_id, club_id, nombre)
    VALUES (${jugador_id}, ${s.clubId ? Number(s.clubId) : null}, ${nombre})
    RETURNING id
  `
  return NextResponse.json({ sesion_id: (row as any).id })
}
