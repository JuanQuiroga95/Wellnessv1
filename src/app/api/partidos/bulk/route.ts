export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export const maxDuration = 30

// Bulk insert: { entries: [{jugador_id, minutos}], fecha, rival, tipo_partido, rival_foto, sesion_id? }
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  try {
    const { entries, fecha, rival, tipo_partido, rival_foto, sesion_id } = await req.json()
    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'entries vacío' }, { status: 400 })
    }
    const sql = getDb()
    const d = fecha || new Date().toISOString().split('T')[0]
    const rivalVal = rival || null
    const results = []
    for (const e of entries) {
      if (!e.jugador_id || !e.minutos || Number(e.minutos) <= 0) continue
      const jid = Number(e.jugador_id)
      const mins = Number(e.minutos)
      // Remove any existing entry for this player+date+rival before inserting fresh
      await sql`
        DELETE FROM partido_logs
        WHERE jugador_id = ${jid}
          AND fecha = ${d}::date
          AND COALESCE(rival, '') = COALESCE(${rivalVal}, '')`
      const [r] = await sql`
        INSERT INTO partido_logs(jugador_id, fecha, rival, tipo_partido, minutos, titular, notas, rival_foto)
        VALUES(${jid}, ${d}, ${rivalVal}, ${tipo_partido || 'Oficial'},
               ${mins}, ${true}, ${null}, ${rival_foto || null})
        RETURNING id, fecha::text`
      results.push(r)
    }
    return NextResponse.json({ ok: true, count: results.length, inserted: results })
  } catch (err) {
    console.error('[partidos/bulk POST error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
