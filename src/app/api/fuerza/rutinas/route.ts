export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha')
    const jugadorId = searchParams.get('jugador_id')
    
    // Si es jugador, solo puede ver lo suyo
    if (s.rol === 'jugador' && Number(jugadorId) !== Number(s.jugadorId)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!fecha || !jugadorId) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

    const sql = getDb()
    
    // Obtener rutinas con inner joins a mandamientos y ejercicios
    const rutinas = await sql`
      SELECT 
        r.*, 
        m.numero as mandamiento_numero, 
        m.nombre as mandamiento_nombre,
        e.nombre as ejercicio_nombre,
        e.url_video as ejercicio_video,
        e.imagen_url as ejercicio_imagen_url
      FROM fuerza_rutinas r
      JOIN fuerza_mandamientos m ON r.mandamiento_id = m.id
      JOIN fuerza_ejercicios e ON r.ejercicio_id = e.id
      WHERE r.jugador_id = ${Number(jugadorId)} AND r.fecha = ${fecha}
      ORDER BY m.numero ASC, r.orden ASC, r.id ASC
    `

    return NextResponse.json({ success: true, rutinas })
  } catch (err) {
    console.error('[GET /api/fuerza/rutinas]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await req.json()
    const { jugador_id, fecha, mandamiento_id, ejercicio_id, series, repeticiones, peso, rpe, orden } = body
    
    if (!jugador_id || !fecha || !mandamiento_id || !ejercicio_id) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    
    if (jugador_id === 'todos') {
      const jugadores = clubId 
        ? await sql`SELECT id FROM jugadores WHERE club_id = ${clubId}`
        : await sql`SELECT id FROM jugadores WHERE club_id IS NULL`

      for (const j of jugadores) {
        await sql`
          INSERT INTO fuerza_rutinas (
            jugador_id, club_id, fecha, mandamiento_id, ejercicio_id, 
            series, repeticiones, peso, rpe, orden
          ) VALUES (
            ${j.id}, ${clubId}, ${fecha}, ${mandamiento_id}, ${ejercicio_id},
            ${series || null}, ${repeticiones || null}, ${peso || null}, ${rpe || null}, ${orden || 0}
          )
        `
      }
    } else {
      await sql`
        INSERT INTO fuerza_rutinas (
          jugador_id, club_id, fecha, mandamiento_id, ejercicio_id, 
          series, repeticiones, peso, rpe, orden
        ) VALUES (
          ${jugador_id}, ${clubId}, ${fecha}, ${mandamiento_id}, ${ejercicio_id},
          ${series || null}, ${repeticiones || null}, ${peso || null}, ${rpe || null}, ${orden || 0}
        )
      `
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/fuerza/rutinas]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { id, series, repeticiones, peso, rpe, orden } = await req.json()
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const sql = getDb()
    await sql`
      UPDATE fuerza_rutinas 
      SET 
        series = ${series || null}, 
        repeticiones = ${repeticiones || null}, 
        peso = ${peso || null}, 
        rpe = ${rpe || null},
        orden = ${orden || 0}
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[PUT /api/fuerza/rutinas]', err)
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
    const action = searchParams.get('action')
    const jugadorId = searchParams.get('jugador_id')
    const fecha = searchParams.get('fecha')

    const sql = getDb()

    if (id) {
      await sql`DELETE FROM fuerza_rutinas WHERE id = ${Number(id)}`
      return NextResponse.json({ success: true })
    } 
    
    if (action === 'dia' && jugadorId && fecha) {
      if (jugadorId === 'todos') {
        const clubId = s.clubId ? Number(s.clubId) : null
        if (clubId) {
          await sql`DELETE FROM fuerza_rutinas WHERE fecha = ${fecha} AND club_id = ${clubId}`
        } else {
          await sql`DELETE FROM fuerza_rutinas WHERE fecha = ${fecha} AND club_id IS NULL`
        }
      } else {
        await sql`DELETE FROM fuerza_rutinas WHERE jugador_id = ${Number(jugadorId)} AND fecha = ${fecha}`
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'semana' && jugadorId && fecha) {
      if (jugadorId === 'todos') {
        const clubId = s.clubId ? Number(s.clubId) : null
        if (clubId) {
          await sql`DELETE FROM fuerza_rutinas WHERE club_id = ${clubId} AND fecha >= date_trunc('week', ${fecha}::date) AND fecha < date_trunc('week', ${fecha}::date) + interval '1 week'`
        } else {
          await sql`DELETE FROM fuerza_rutinas WHERE club_id IS NULL AND fecha >= date_trunc('week', ${fecha}::date) AND fecha < date_trunc('week', ${fecha}::date) + interval '1 week'`
        }
      } else {
        await sql`DELETE FROM fuerza_rutinas WHERE jugador_id = ${Number(jugadorId)} AND fecha >= date_trunc('week', ${fecha}::date) AND fecha < date_trunc('week', ${fecha}::date) + interval '1 week'`
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 })
  } catch (err) {
    console.error('[DELETE /api/fuerza/rutinas]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

