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
  // La vista cmj_con_diferencial calcula baseline, diferencial y estado_fatiga
  const rows = await sql`
    SELECT * FROM cmj_con_diferencial
    WHERE jugador_id = ${Number(jugador_id)}
    ORDER BY fecha DESC
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

  // Calcular el promedio del nuevo registro
  const nuevoPromedio = (Number(salto1_cm) + Number(salto2_cm) + Number(salto3_cm)) / 3

  // Obtener el baseline actual (si existe)
  const [baselineActual] = await sql`
    SELECT id, promedio_cm FROM cmj_sessions
    WHERE jugador_id = ${Number(jugador_id)} AND es_baseline = TRUE
    LIMIT 1
  `

  // Es baseline si: no hay ninguno todavía, O si el nuevo promedio supera al actual
  const esBaseline = !baselineActual || nuevoPromedio > Number(baselineActual.promedio_cm)

  // Si el nuevo registro va a ser baseline, quitar el flag del anterior
  if (esBaseline && baselineActual) {
    await sql`
      UPDATE cmj_sessions SET es_baseline = FALSE
      WHERE jugador_id = ${Number(jugador_id)}
    `
  }

  const [row] = await sql`
    INSERT INTO cmj_sessions (
      jugador_id, club_id, fecha,
      salto1_cm, salto2_cm, salto3_cm,
      es_baseline, notas
    ) VALUES (
      ${Number(jugador_id)},
      ${s.clubId ?? null},
      ${fecha ?? new Date().toISOString().split('T')[0]},
      ${Number(salto1_cm)},
      ${Number(salto2_cm)},
      ${Number(salto3_cm)},
      ${esBaseline},
      ${notas ?? null}
    )
    RETURNING *
  `
  return NextResponse.json({ ...row, es_baseline_nuevo: esBaseline })
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
    WHERE id = ${Number(id)} AND club_id = ${s.clubId ?? null}
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
    WHERE jugador_id = ${Number(jugador_id)} AND club_id = ${s.clubId ?? null}
  `
  await sql`
    UPDATE cmj_sessions SET es_baseline = TRUE
    WHERE id = ${Number(id)} AND club_id = ${s.clubId ?? null}
  `
  return NextResponse.json({ ok: true })
}
