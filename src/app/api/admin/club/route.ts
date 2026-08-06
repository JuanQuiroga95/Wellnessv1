import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (!s.clubId) return NextResponse.json({ error: 'No tiene club asignado' }, { status: 400 })

  const sql = getDb()
  try {
    const [club] = await sql`SELECT id, nombre, logo_url, es_seleccion FROM clubs WHERE id = ${s.clubId}`
    return NextResponse.json({ club })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  if (!s.clubId) return NextResponse.json({ error: 'No tiene club asignado' }, { status: 400 })

  const { es_seleccion } = await req.json()
  const sql = getDb()

  try {
    if (es_seleccion !== undefined) {
      await sql`UPDATE clubs SET es_seleccion = ${es_seleccion} WHERE id = ${s.clubId}`
    }
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
