export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    
    let ejercicios;
    if (clubId) {
      ejercicios = await sql`SELECT * FROM fuerza_ejercicios WHERE club_id = ${clubId} ORDER BY nombre ASC`
    } else {
      ejercicios = await sql`SELECT * FROM fuerza_ejercicios WHERE club_id IS NULL ORDER BY nombre ASC`
    }

    return NextResponse.json({ success: true, ejercicios })
  } catch (err) {
    console.error('[GET /api/fuerza/ejercicios]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { nombre, url_video, categoria, imagen_url, descripcion, mandamiento_id } = await req.json()
    if (!nombre) return NextResponse.json({ error: 'Falta nombre' }, { status: 400 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    
    await sql`
      INSERT INTO fuerza_ejercicios (club_id, nombre, url_video, categoria, imagen_url, descripcion, mandamiento_id) 
      VALUES (${clubId}, ${nombre}, ${url_video || null}, ${categoria || null}, ${imagen_url || null}, ${descripcion || null}, ${mandamiento_id ? Number(mandamiento_id) : null})
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/fuerza/ejercicios]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, nombre, url_video, categoria, imagen_url, descripcion, mandamiento_id } = await req.json()
    if (!id || !nombre) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const sql = getDb()
    await sql`
      UPDATE fuerza_ejercicios 
      SET nombre = ${nombre}, url_video = ${url_video || null}, categoria = ${categoria || null},
          imagen_url = ${imagen_url || null}, descripcion = ${descripcion || null}, mandamiento_id = ${mandamiento_id ? Number(mandamiento_id) : null}
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PUT /api/fuerza/ejercicios]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const sql = getDb()
    await sql`DELETE FROM fuerza_ejercicios WHERE id = ${Number(id)}`

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/fuerza/ejercicios]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
