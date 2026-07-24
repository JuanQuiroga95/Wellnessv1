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

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null
  try {
    // Delete points first (CASCADE should handle it, but just in case)
    await sql`DELETE FROM pfv_puntos WHERE sesion_id = ${Number(id)}`
    await sql`DELETE FROM pfv_sesiones WHERE id = ${Number(id)} AND (${clubId}::int IS NULL OR club_id = ${clubId})`
  } catch {}
  return NextResponse.json({ ok: true })
}
