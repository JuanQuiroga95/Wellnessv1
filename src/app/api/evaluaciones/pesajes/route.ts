
// tz-safe date helpers
function localToday(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function localDaysAgo(n: number): string { const d=new Date(); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
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
    SELECT p.*, j.peso_ideal_min, j.peso_ideal_max
    FROM pesajes p
    JOIN jugadores j ON j.id = p.jugador_id
    WHERE p.jugador_id = ${Number(jugador_id)}
      AND p.club_id = ${s.clubId ? Number(s.clubId) : null}
    ORDER BY p.fecha DESC
    LIMIT 50
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { jugador_id, fecha, peso_kg, notas } = body
  if (!jugador_id || !peso_kg) {
    return NextResponse.json({ error: 'Faltan campos requeridos: jugador_id, peso_kg' }, { status: 400 })
  }

  const sql = getDb()
  const [row] = await sql`
    INSERT INTO pesajes (jugador_id, club_id, fecha, peso_kg, notas, registrado_por)
    VALUES (
      ${Number(jugador_id)},
      ${s.clubId ? Number(s.clubId) : null},
      ${fecha ?? localToday()},
      ${Number(peso_kg)},
      ${notas ?? null},
      ${s.rol}
    )
    RETURNING *
  `
  // Update the player's current weight to reflect the latest measured value
  await sql`
    UPDATE jugadores SET peso_kg = ${Number(peso_kg)}
    WHERE id = ${Number(jugador_id)}
  `
  return NextResponse.json(row)
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const sql = getDb()
  await sql`
    DELETE FROM pesajes
    WHERE id = ${Number(id)} AND club_id = ${s.clubId ? Number(s.clubId) : null}
  `
  return NextResponse.json({ ok: true })
}
