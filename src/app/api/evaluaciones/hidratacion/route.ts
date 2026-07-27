export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) {
  return s?.rol === 'admin' || s?.rol === 'master_admin'
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const jugador_id = searchParams.get('jugador_id')
  const fecha = searchParams.get('fecha')
  
  const sql = getDb()

  if (jugador_id) {
    const rows = await sql`
      SELECT * FROM hidratacion_logs
      WHERE jugador_id = ${Number(jugador_id)}
        AND club_id = ${s.clubId ? Number(s.clubId) : null}
      ORDER BY fecha DESC
      LIMIT 50
    `
    return NextResponse.json(rows)
  }

  if (fecha) {
    const rows = await sql`
      SELECT h.*, j.id as j_id, j.usuario_id, u.nombre as j_nombre 
      FROM hidratacion_logs h
      JOIN jugadores j ON j.id = h.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE h.fecha = ${fecha}
        AND h.club_id = ${s.clubId ? Number(s.clubId) : null}
    `
    return NextResponse.json(rows)
  }

  return NextResponse.json({ error: 'Falta jugador_id o fecha' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { jugador_id, fecha, peso_pre, peso_post, duracion_min, perdida_ml, pct_perdida, reposicion_ml, tasa_sudoracion, estado } = body

  if (!jugador_id || !peso_pre || !peso_post) {
    return NextResponse.json({ error: 'Faltan campos requeridos: jugador_id, peso_pre, peso_post' }, { status: 400 })
  }

  const sql = getDb()
  const date = fecha ?? new Date().toISOString().split('T')[0]
  const clubId = s.clubId ? Number(s.clubId) : null

  // Delete previous log for same date to allow overwrite
  await sql`
    DELETE FROM hidratacion_logs
    WHERE jugador_id = ${Number(jugador_id)} AND fecha = ${date}
  `

  const [row] = await sql`
    INSERT INTO hidratacion_logs (jugador_id, club_id, fecha, peso_pre, peso_post, duracion_min, perdida_ml, pct_perdida, reposicion_ml, tasa_sudoracion, estado)
    VALUES (
      ${Number(jugador_id)},
      ${clubId},
      ${date},
      ${Number(peso_pre)},
      ${Number(peso_post)},
      ${duracion_min ? Number(duracion_min) : null},
      ${perdida_ml ? Number(perdida_ml) : null},
      ${pct_perdida ? Number(pct_perdida) : null},
      ${reposicion_ml ? Number(reposicion_ml) : null},
      ${tasa_sudoracion ? Number(tasa_sudoracion) : null},
      ${estado}
    )
    RETURNING *
  `
  return NextResponse.json(row)
}
