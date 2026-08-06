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
    const fechasOnly = searchParams.get('fechas_only') === 'true'
    
    // Si es jugador, solo puede ver lo suyo
    if (s.rol === 'jugador' && Number(jugadorId) !== Number(s.jugadorId)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (!jugadorId) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

    const sql = getDb()

    if (fechasOnly) {
      const fechas = await sql`
        SELECT DISTINCT fecha::text as fecha
        FROM fuerza_rutinas 
        WHERE jugador_id = ${Number(jugadorId)}
      `
      return NextResponse.json({ success: true, fechas: fechas.map((f:any) => f.fecha || f.text || f['?column?']) })
    }

    let rutinas = []
    if (fecha) {
      // Obtener rutinas con inner joins a mandamientos y ejercicios para una fecha
      rutinas = await sql`
        SELECT 
          r.*, 
          m.numero as mandamiento_numero, 
          m.nombre as mandamiento_nombre,
          e.nombre as ejercicio_nombre,
          e.url_video as ejercicio_video,
          e.imagen_url as ejercicio_imagen_url,
          r.fecha::text as fecha
        FROM fuerza_rutinas r
        JOIN fuerza_mandamientos m ON r.mandamiento_id = m.id
        JOIN fuerza_ejercicios e ON r.ejercicio_id = e.id
        WHERE r.jugador_id = ${Number(jugadorId)} AND r.fecha = ${fecha}
        ORDER BY m.numero ASC, r.orden ASC, r.id ASC
      `
    } else {
      // Obtener TODAS las rutinas del jugador (para cacheo local en frontend)
      rutinas = await sql`
        SELECT 
          r.*, 
          m.numero as mandamiento_numero, 
          m.nombre as mandamiento_nombre,
          e.nombre as ejercicio_nombre,
          e.url_video as ejercicio_video,
          e.imagen_url as ejercicio_imagen_url,
          r.fecha::text as fecha
        FROM fuerza_rutinas r
        JOIN fuerza_mandamientos m ON r.mandamiento_id = m.id
        JOIN fuerza_ejercicios e ON r.ejercicio_id = e.id
        WHERE r.jugador_id = ${Number(jugadorId)}
        ORDER BY r.fecha DESC, m.numero ASC, r.orden ASC, r.id ASC
      `
    }

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
    if (!id) return NextResponse.json({ error: 'Falta ID' }, { status: 400 })

    const sql = getDb()
    await sql`DELETE FROM fuerza_rutinas WHERE id = ${Number(id)}`

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/fuerza/rutinas]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
