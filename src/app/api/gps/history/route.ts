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

    // Últimas 20 cargas agrupadas
    const history = await sql`
      SELECT 
        g.fecha::text, 
        g.tipo_sesion, 
        g.sesion_id, 
        COUNT(*)::int as n_jugadores,
        s.titulo as sesion_titulo
      FROM gps_logs g
      LEFT JOIN sesiones_plan s ON s.id = g.sesion_id
      WHERE g.club_id = ${clubId}
      GROUP BY g.fecha, g.tipo_sesion, g.sesion_id, s.titulo
      ORDER BY g.fecha DESC, g.tipo_sesion
      LIMIT 20
    `

    console.log('[GPS history]', { clubId, historyCount: history.length })
    return NextResponse.json(history)
  } catch (err: any) {
    console.error('[GPS history error]', err)
    return NextResponse.json({ error: String(err), details: err.message }, { status: 500 })
  }
}
