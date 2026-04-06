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
  if (!jugador_id) return NextResponse.json({ error: 'Falta jugador_id' }, { status: 400 })

  const sql = getDb()
  const rows = await sql`
    SELECT j.id, u.nombre, j.posicion, j.edad, j.estatura_cm,
           j.peso_kg, j.peso_ideal_min, j.peso_ideal_max
    FROM jugadores j
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE j.id = ${Number(jugador_id)}
      AND j.club_id = ${s.clubId ?? null}
  `
  return NextResponse.json(rows[0] ?? null)
}

export async function PUT(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { jugador_id, posicion, edad, estatura_cm, peso_kg } = body
  if (!jugador_id) return NextResponse.json({ error: 'Falta jugador_id' }, { status: 400 })

  const sql = getDb()
  await sql`
    UPDATE jugadores
    SET posicion    = ${posicion    ?? null},
        edad        = ${edad        ?? null},
        estatura_cm = ${estatura_cm ?? null},
        peso_kg     = ${peso_kg     ?? null}
    WHERE id = ${Number(jugador_id)}
      AND club_id = ${s.clubId ?? null}
  `
  return NextResponse.json({ ok: true })
}
