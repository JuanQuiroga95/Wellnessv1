export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const jugador_id = searchParams.get('jugador_id')
  const all = searchParams.get('all')

  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null

  try {
    if (all === 'true') {
      const rows = await sql`
        SELECT DISTINCT ON (a.jugador_id)
          a.*, u.nombre, j.posicion
        FROM antropometria a
        JOIN jugadores j ON j.id = a.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        WHERE a.club_id = ${clubId}
          AND u.activo = true
        ORDER BY a.jugador_id, a.fecha DESC, a.id DESC
      `
      return NextResponse.json(rows)
    }

    if (!jugador_id) return NextResponse.json({ error: 'Falta jugador_id' }, { status: 400 })

    const rows = await sql`
      SELECT * FROM antropometria
      WHERE jugador_id = ${Number(jugador_id)}
        AND club_id = ${clubId}
      ORDER BY fecha DESC, id DESC
      LIMIT 50
    `
    return NextResponse.json(rows)
  } catch (e: any) {
    if (String(e).includes('does not exist')) return NextResponse.json([])
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { jugador_id, fecha, peso_kg, altura_cm,
    pliegue_triceps, pliegue_subescapular, pliegue_suprailiaco, pliegue_abdominal,
    notas } = body

  if (!jugador_id || !peso_kg || pliegue_triceps == null || pliegue_subescapular == null
    || pliegue_suprailiaco == null || pliegue_abdominal == null) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null

  if (clubId) {
    const owns = await sql`
      SELECT 1 FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id
      WHERE j.id = ${Number(jugador_id)} AND (u.club_id = ${clubId} OR j.club_id = ${clubId}) LIMIT 1`
    if (!owns.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const sum4 = Number(pliegue_triceps) + Number(pliegue_subescapular)
    + Number(pliegue_suprailiaco) + Number(pliegue_abdominal)
  const pct_grasa = (sum4 * 0.153) + 5.783
  const masa_grasa_kg = (Number(peso_kg) * pct_grasa) / 100
  const masa_magra_kg = Number(peso_kg) - masa_grasa_kg

  try {
    const [row] = await sql`
      INSERT INTO antropometria (
        jugador_id, club_id, fecha, peso_kg, altura_cm,
        pliegue_triceps, pliegue_subescapular, pliegue_suprailiaco, pliegue_abdominal,
        sum_4_pliegues, pct_grasa, masa_grasa_kg, masa_magra_kg, notas
      ) VALUES (
        ${Number(jugador_id)}, ${clubId},
        ${fecha ?? new Date().toISOString().split('T')[0]},
        ${Number(peso_kg)}, ${altura_cm ? Number(altura_cm) : null},
        ${Number(pliegue_triceps)}, ${Number(pliegue_subescapular)},
        ${Number(pliegue_suprailiaco)}, ${Number(pliegue_abdominal)},
        ${sum4}, ${Math.round(pct_grasa * 100) / 100},
        ${Math.round(masa_grasa_kg * 100) / 100},
        ${Math.round(masa_magra_kg * 100) / 100},
        ${notas ?? null}
      )
      RETURNING *
    `
    await sql`UPDATE jugadores SET peso_kg = ${Number(peso_kg)} WHERE id = ${Number(jugador_id)}`
    return NextResponse.json(row)
  } catch (e: any) {
    if (String(e).includes('does not exist')) {
      return NextResponse.json({ error: 'Tabla no existe. Ejecutá migraciones: /api/migrate' }, { status: 500 })
    }
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const sql = getDb()
  try {
    await sql`DELETE FROM antropometria WHERE id = ${Number(id)} AND club_id = ${s.clubId ? Number(s.clubId) : null}`
  } catch {}
  return NextResponse.json({ ok: true })
}
