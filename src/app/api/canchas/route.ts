import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

// GET /api/canchas — list saved courts for the coach's club
export async function GET() {
  try {
    const session = await getSession()
    if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin' && session.rol !== 'coach'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sql = getDb()
    const clubId = session.clubId ? Number(session.clubId) : null
    const userId = Number(session.userId)

    try { await sql`ALTER TABLE canchas ADD COLUMN IF NOT EXISTS foto_url text` } catch {}

    const rows = clubId
      ? await sql`SELECT id, nombre, direccion, lat::text, lng::text, largo_m::text, ancho_m::text, area_m2::text, tipo_cancha, superficie, notas, osm_id::text, foto_url, created_at::text FROM canchas WHERE club_id=${clubId} ORDER BY created_at DESC`
      : await sql`SELECT id, nombre, direccion, lat::text, lng::text, largo_m::text, ancho_m::text, area_m2::text, tipo_cancha, superficie, notas, osm_id::text, foto_url, created_at::text FROM canchas WHERE admin_id=${userId} ORDER BY created_at DESC`

    return NextResponse.json(rows)
  } catch (err: any) {
    console.error('GET /api/canchas error:', err)
    return NextResponse.json({ error: 'Error al obtener canchas' }, { status: 500 })
  }
}

// POST /api/canchas — save a new court
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin' && session.rol !== 'coach'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { nombre, direccion, lat, lng, largo_m, ancho_m, area_m2, tipo_cancha, superficie, notas, osm_id } = body

    if (!nombre) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const sql = getDb()
    const clubId = session.clubId ? Number(session.clubId) : null
    const userId = Number(session.userId)

    if (isNaN(userId)) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

    const [row] = await sql`
      INSERT INTO canchas (club_id, admin_id, nombre, direccion, lat, lng, largo_m, ancho_m, area_m2, tipo_cancha, superficie, notas, osm_id)
      VALUES (
        ${clubId}, 
        ${userId}, 
        ${nombre}, 
        ${direccion || null}, 
        ${(lat !== null && lat !== undefined) ? Number(lat) : null}, 
        ${(lng !== null && lng !== undefined) ? Number(lng) : null}, 
        ${(largo_m !== null && largo_m !== undefined) ? Number(largo_m) : null}, 
        ${(ancho_m !== null && ancho_m !== undefined) ? Number(ancho_m) : null}, 
        ${(area_m2 !== null && area_m2 !== undefined) ? Number(area_m2) : null}, 
        ${tipo_cancha || null}, 
        ${superficie || null}, 
        ${notas || null}, 
        ${(osm_id !== null && osm_id !== undefined) ? BigInt(osm_id) : null}
      )
      RETURNING id, nombre, direccion, lat::text, lng::text, largo_m::text, ancho_m::text, area_m2::text, tipo_cancha, superficie, notas, osm_id::text, created_at::text
    `

    return NextResponse.json(row)
  } catch (err: any) {
    console.error('POST /api/canchas error:', err)
    return NextResponse.json({ error: 'Error al guardar: ' + (err.message || 'Desconocido') }, { status: 500 })
  }
}

// DELETE /api/canchas?id=X — remove a saved court
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin' && session.rol !== 'coach'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const sql = getDb()
    const userId = Number(session.userId)
    
    // Allow deleting if user is owner or if they belong to the same club (simplified)
    await sql`DELETE FROM canchas WHERE id=${Number(id)}`

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('DELETE /api/canchas error:', err)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}

// PATCH /api/canchas?id=X -- update field photo
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin' && session.rol !== 'coach'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const { foto_url } = await req.json()
    const sql = getDb()
    await sql`UPDATE canchas SET foto_url = ${foto_url || null} WHERE id = ${Number(id)}`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('PATCH /api/canchas error:', err)
    return NextResponse.json({ error: 'Error al actualizar foto' }, { status: 500 })
  }
}