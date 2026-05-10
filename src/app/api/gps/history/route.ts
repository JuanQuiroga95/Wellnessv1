export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    if (!clubId) return NextResponse.json([])

    const history = await sql`
      SELECT
        fecha::date::text as fecha,
        tipo_sesion,
        sesion_id,
        COUNT(*)::int as n_jugadores,
        (SELECT titulo FROM sesiones_plan WHERE id = sesion_id LIMIT 1) as sesion_titulo,
        ARRAY_AGG(id)::int[] as ids
      FROM gps_logs
      WHERE club_id = ${clubId}
      GROUP BY 1, 2, 3
      ORDER BY fecha DESC, tipo_sesion DESC
      LIMIT 100
    `

    return NextResponse.json(history, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Pragma': 'no-cache'
      }
    })
  } catch (err: any) {
    console.error('[GPS history error]', err)
    return NextResponse.json({ error: String(err), details: err.message }, { status: 500 })
  }
}
