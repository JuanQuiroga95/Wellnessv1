export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { sanitizeInt, verifyJugadorOwnership } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// GET /api/ausencias?jugadorId=X&desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// GET /api/ausencias?desde=YYYY-MM-DD&hasta=YYYY-MM-DD  (all players in club)
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jid = sanitizeInt(searchParams.get('jugadorId'), 1, 9999999)
  const desde = searchParams.get('desde') || new Date(Date.now() - 28*86400000).toISOString().split('T')[0]
  const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]

  const sql = getDb()

  if (jid) {
    // Single player query
    if (s.rol === 'jugador' && s.jugadorId !== jid) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (isAdmin(s) && s.clubId) {
      if (!(await verifyJugadorOwnership(sql, jid, s.clubId))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }
    const rows = await sql`
      SELECT id, jugador_id, fecha::text, motivo, created_at
      FROM ausencias
      WHERE jugador_id = ${jid} AND fecha BETWEEN ${desde}::date AND ${hasta}::date
      ORDER BY fecha DESC`
    return NextResponse.json(rows)
  }

  // All players in club (coach view)
  if (!isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const rows = await sql`
    SELECT a.id, a.jugador_id, a.fecha::text, a.motivo, j.nombre AS jugador_nombre
    FROM ausencias a
    JOIN jugadores j ON j.id = a.jugador_id
    WHERE a.club_id = ${Number(s.clubId)} AND a.fecha BETWEEN ${desde}::date AND ${hasta}::date
    ORDER BY a.fecha DESC`
  return NextResponse.json(rows)
}

// POST /api/ausencias  { jugador_id, fecha, motivo? }
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'Solo el Coach puede registrar ausencias' }, { status: 403 })

  const body = await req.json()
  const jugador_id = sanitizeInt(body.jugador_id, 1, 9999999)
  const fecha = body.fecha || new Date().toISOString().split('T')[0]
  const motivo = (body.motivo || 'ausente').toString().slice(0, 100)

  if (!jugador_id) return NextResponse.json({ error: 'jugador_id inválido' }, { status: 400 })

  const sql = getDb()

  if (s.clubId && !(await verifyJugadorOwnership(sql, jugador_id, Number(s.clubId)))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Upsert — one absence per player per day
  const [row] = await sql`
    INSERT INTO ausencias (jugador_id, club_id, fecha, motivo, registrado_por)
    VALUES (${jugador_id}, ${Number(s.clubId)}, ${fecha}::date, ${motivo}, ${Number(s.id)})
    ON CONFLICT (jugador_id, fecha) DO UPDATE SET motivo = EXCLUDED.motivo
    RETURNING id, jugador_id, fecha::text, motivo`
  return NextResponse.json(row)
}

// DELETE /api/ausencias?jugadorId=X&fecha=YYYY-MM-DD
export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const jugador_id = sanitizeInt(searchParams.get('jugadorId'), 1, 9999999)
  const fecha = searchParams.get('fecha')

  if (!jugador_id || !fecha) return NextResponse.json({ error: 'jugadorId y fecha requeridos' }, { status: 400 })

  const sql = getDb()
  await sql`
    DELETE FROM ausencias
    WHERE jugador_id = ${jugador_id} AND fecha = ${fecha}::date AND club_id = ${Number(s.clubId)}`
  return NextResponse.json({ ok: true })
}
