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

  // Only return data for players belonging to this coach's club
  const rows = await sql`
    SELECT c.* FROM cmj_con_diferencial c
    JOIN cmj_sessions cs ON cs.id = c.id
    WHERE c.jugador_id = ${Number(jugador_id)}
      AND (${s.clubId ? Number(s.clubId) : null}::int IS NULL OR cs.club_id = ${s.clubId ? Number(s.clubId) : null})
    ORDER BY c.fecha DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { jugador_id, fecha, salto1_cm, salto2_cm, salto3_cm, notas } = body

  if (!jugador_id || salto1_cm == null || salto2_cm == null || salto3_cm == null) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos: jugador_id, salto1_cm, salto2_cm, salto3_cm' },
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

  // El baseline es siempre el primer test registrado para ese jugador
  const [existsBaseline] = await sql`
    SELECT id FROM cmj_sessions
    WHERE jugador_id = ${Number(jugador_id)} AND es_baseline = TRUE
    LIMIT 1
  `
  const esBaseline = !existsBaseline

  // Calcular si este nuevo test rompe el récord personal
  const nuevoPromedio = (Number(salto1_cm) + Number(salto2_cm) + Number(salto3_cm)) / 3
  const [recordActual] = await sql`
    SELECT MAX(promedio_cm) AS max_cm FROM cmj_sessions
    WHERE jugador_id = ${Number(jugador_id)}
  `
  const esNuevoRecord = !recordActual?.max_cm || nuevoPromedio > Number(recordActual.max_cm)

  const [row] = await sql`
    INSERT INTO cmj_sessions (
      jugador_id, club_id, fecha,
      salto1_cm, salto2_cm, salto3_cm,
      es_baseline, notas
    ) VALUES (
      ${Number(jugador_id)},
      ${s.clubId ? Number(s.clubId) : null},
      ${fecha ?? new Date().toISOString().split('T')[0]},
      ${Number(salto1_cm)},
      ${Number(salto2_cm)},
      ${Number(salto3_cm)},
      ${esBaseline},
      ${notas ?? null}
    )
    RETURNING *
  `
  return NextResponse.json({ ...row, es_baseline_nuevo: esBaseline, es_nuevo_record: esNuevoRecord })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const sql = getDb()
  await sql`
    DELETE FROM cmj_sessions
    WHERE id = ${Number(id)} AND club_id = ${s.clubId ? Number(s.clubId) : null}
  `
  return NextResponse.json({ ok: true })
}

// PATCH: permite cambiar el baseline manualmente
export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { id, jugador_id } = await req.json()
  if (!id || !jugador_id) return NextResponse.json({ error: 'Faltan id y jugador_id' }, { status: 400 })

  const sql = getDb()
  // Quitar baseline anterior y asignar al nuevo
  await sql`
    UPDATE cmj_sessions SET es_baseline = FALSE
    WHERE jugador_id = ${Number(jugador_id)} AND club_id = ${s.clubId ? Number(s.clubId) : null}
  `
  await sql`
    UPDATE cmj_sessions SET es_baseline = TRUE
    WHERE id = ${Number(id)} AND club_id = ${s.clubId ? Number(s.clubId) : null}
  `
  return NextResponse.json({ ok: true })
}
