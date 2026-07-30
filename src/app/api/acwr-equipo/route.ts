export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const clubId = s.clubId ? Number(s.clubId) : null
  const isMaster = s.rol === 'master_admin'
  const sql = getDb()

  try {
    // Calcular el promedio de carga UA (rpe * duracion) por semana de todo el equipo
    // en el ultimo año (52 semanas)
    const ts = Date.now()
    const data = await sql`
      SELECT /* ${ts} */
        TO_CHAR(DATE_TRUNC('week', el.fecha), 'YYYY-MM-DD') AS semana,
        ROUND(AVG(el.carga_ua)::numeric, 2) AS avg_carga,
        COUNT(*) as num_logs
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.fecha >= CURRENT_DATE - 365
        AND (${isMaster}::boolean OR j.club_id = ${clubId})
        AND u.activo = true
      GROUP BY DATE_TRUNC('week', el.fecha)
      ORDER BY DATE_TRUNC('week', el.fecha) ASC
    `

    return NextResponse.json(data)
  } catch (err) {
    console.error('Error in /api/acwr-equipo:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
