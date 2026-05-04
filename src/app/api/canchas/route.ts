import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

// GET /api/canchas — list saved courts for the coach's club
export async function GET() {
  const session = await getSession()
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sql = getDb()
  const clubId = session.clubId ? Number(session.clubId) : null

  const rows = clubId
    ? await sql`SELECT id, nombre, direccion, lat::text, lng::text, largo_m::text, ancho_m::text, area_m2::text, tipo_cancha, superficie, notas, osm_id::text, created_at::text FROM canchas WHERE club_id=${clubId} ORDER BY created_at DESC`
    : await sql`SELECT id, nombre, direccion, lat::text, lng::text, largo_m::text, ancho_m::text, area_m2::text, tipo_cancha, superficie, notas, osm_id::text, created_at::text FROM canchas WHERE admin_id=${Number(session.id)} ORDER BY created_at DESC`

  return NextResponse.json(rows)
}

// POST /api/canchas — save a new court
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { nombre, direccion, lat, lng, largo_m, ancho_m, area_m2, tipo_cancha, superficie, notas, osm_id } = body

  if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const sql = getDb()
  const clubId = session.clubId ? Number(session.clubId) : null

  const [row] = await sql`
    INSERT INTO canchas (club_id, admin_id, nombre, direccion, lat, lng, largo_m, ancho_m, area_m2, tipo_cancha, superficie, notas, osm_id)
    VALUES (${clubId}, ${Number(session.id)}, ${nombre}, ${direccion || null}, ${lat || null}, ${lng || null}, ${largo_m || null}, ${ancho_m || null}, ${area_m2 || null}, ${tipo_cancha || null}, ${superficie || null}, ${notas || null}, ${osm_id || null})
    RETURNING id, nombre, direccion, lat::text, lng::text, largo_m::text, ancho_m::text, area_m2::text, tipo_cancha, superficie, notas, osm_id::text, created_at::text
  `

  return NextResponse.json(row)
}

// DELETE /api/canchas?id=X — remove a saved court
export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const sql = getDb()
  await sql`DELETE FROM canchas WHERE id=${Number(id)} AND admin_id=${Number(session.id)}`

  return NextResponse.json({ ok: true })
}
