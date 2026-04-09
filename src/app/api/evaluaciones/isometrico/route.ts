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
  const grupo = searchParams.get('grupo') ?? '%'

  if (!jugador_id) return NextResponse.json({ error: 'Falta jugador_id' }, { status: 400 })

  const sql = getDb()
  const rows = await sql`
    SELECT ia.* FROM iso_con_asimetria ia
    JOIN iso_sessions iso ON iso.id = ia.id
    WHERE ia.jugador_id = ${Number(jugador_id)}
      AND ia.grupo_muscular ILIKE ${grupo}
      AND (${s.clubId ? Number(s.clubId) : null}::int IS NULL OR iso.club_id = ${s.clubId ? Number(s.clubId) : null})
    ORDER BY ia.fecha DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const {
    jugador_id, fecha, grupo_muscular,
    der_intento1, der_intento2, der_intento3,
    izq_intento1, izq_intento2, izq_intento3,
    unidad, notas,
  } = body

  if (
    !jugador_id || !grupo_muscular ||
    der_intento1 == null || der_intento2 == null || der_intento3 == null ||
    izq_intento1 == null || izq_intento2 == null || izq_intento3 == null
  ) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: jugador_id, grupo_muscular, 3 intentos por pierna' },
      { status: 400 }
    )
  }

  const sql = getDb()

  // Verify the player belongs to this coach's club before writing
  if (s.clubId) {
    const owns = await sql`
      SELECT 1 FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id
      WHERE j.id = ${Number(jugador_id)} AND u.club_id = ${s.clubId} LIMIT 1`
    if (!owns.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const [row] = await sql`
    INSERT INTO iso_sessions (
      jugador_id, club_id, fecha, grupo_muscular,
      der_intento1, der_intento2, der_intento3,
      izq_intento1, izq_intento2, izq_intento3,
      unidad, notas
    ) VALUES (
      ${Number(jugador_id)},
      ${s.clubId ? Number(s.clubId) : null},
      ${fecha ?? new Date().toISOString().split('T')[0]},
      ${grupo_muscular},
      ${Number(der_intento1)}, ${Number(der_intento2)}, ${Number(der_intento3)},
      ${Number(izq_intento1)}, ${Number(izq_intento2)}, ${Number(izq_intento3)},
      ${unidad ?? 'N'},
      ${notas ?? null}
    )
    RETURNING *
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
    DELETE FROM iso_sessions
    WHERE id = ${Number(id)} AND club_id = ${s.clubId ? Number(s.clubId) : null}
  `
  return NextResponse.json({ ok: true })
}
