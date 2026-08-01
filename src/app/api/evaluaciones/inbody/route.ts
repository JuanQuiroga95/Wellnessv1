export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function isCoachOrAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' || s?.rol === 'coach' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isCoachOrAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const jugador_id = searchParams.get('jugador_id')
  
  if (!jugador_id) return NextResponse.json({ error: 'Falta jugador_id' }, { status: 400 })

  const sql = getDb()
  try {
    const rows = await sql`SELECT * FROM inbody_tests WHERE jugador_id = ${jugador_id} ORDER BY fecha DESC, id DESC`
    return NextResponse.json(rows)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  try {
    const body = await req.json()
    const { jugador_id, fecha, peso_kg, mme_kg, masa_grasa_kg, imc, pgc_pct, notas } = body
    if (!jugador_id || !peso_kg || !mme_kg || !masa_grasa_kg || !imc || !pgc_pct) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    const result = await sql`
      INSERT INTO inbody_tests (
        jugador_id, club_id, fecha, peso_kg, mme_kg, masa_grasa_kg, imc, pgc_pct, notas
      ) VALUES (
        ${jugador_id}, ${clubId}, ${fecha || new Date().toISOString().split('T')[0]},
        ${peso_kg}, ${mme_kg}, ${masa_grasa_kg}, ${imc}, ${pgc_pct}, ${notas || null}
      )
      RETURNING *
    `
    return NextResponse.json({ ok: true, data: result[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const sql = getDb()
  try {
    await sql`DELETE FROM inbody_tests WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
