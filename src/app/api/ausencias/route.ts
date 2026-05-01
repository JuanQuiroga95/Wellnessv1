export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { sanitizeInt } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// GET /api/ausencias?jugadorId=X&days=28
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jid = sanitizeInt(searchParams.get('jugadorId'), 1, 9999999)
  const days = sanitizeInt(searchParams.get('days'), 1, 365) || 28
  if (!jid) return NextResponse.json({ error: 'jugadorId inválido' }, { status: 400 })

  const sql = getDb()
  const rows = await sql`
    SELECT id, jugador_id::int, fecha::text, motivo, created_at::text
    FROM ausencias
    WHERE jugador_id = ${jid}
      AND fecha >= CURRENT_DATE - ${days}::int
    ORDER BY fecha DESC`

  return NextResponse.json(rows)
}

// POST /api/ausencias  { jugador_id, fecha, motivo }
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'Solo el Coach puede registrar ausencias' }, { status: 403 })

  const body = await req.json()
  const jugador_id = sanitizeInt(body.jugador_id, 1, 9999999)
  const fecha = String(body.fecha || '').slice(0, 10)
  const motivo = ['Ausente','Personal','Enfermedad','Lesión','Suspensión'].includes(body.motivo) ? body.motivo : 'Ausente'

  if (!jugador_id || !fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null

  await sql`
    CREATE TABLE IF NOT EXISTS ausencias (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL,
      motivo VARCHAR(50) DEFAULT 'Ausente',
      registrado_por INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(jugador_id, fecha)
    )`

  const [row] = await sql`
    INSERT INTO ausencias(jugador_id, club_id, fecha, motivo, registrado_por)
    VALUES(${jugador_id}, ${clubId}, ${fecha}, ${motivo}, ${s.id ? Number(s.id) : null})
    ON CONFLICT (jugador_id, fecha) DO UPDATE SET motivo = EXCLUDED.motivo
    RETURNING id, jugador_id::int, fecha::text, motivo`

  return NextResponse.json(row)
}

// DELETE /api/ausencias?id=X
export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'Solo el Coach puede eliminar ausencias' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = sanitizeInt(searchParams.get('id'), 1, 9999999)
  if (!id) return NextResponse.json({ error: 'id inválido' }, { status: 400 })

  const sql = getDb()
  await sql`DELETE FROM ausencias WHERE id = ${id} AND club_id = ${s.clubId ? Number(s.clubId) : null}`
  return NextResponse.json({ ok: true })
}
