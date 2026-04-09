export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// GET /api/gps/sesiones?fecha=YYYY-MM-DD
// Returns sessions (entrenamientos + partidos) near a given date for the import selector
// Also returns existing GPS logs for that date
export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]

    // Date range: ±7 days around the given date
    const desde = new Date(fecha)
    desde.setDate(desde.getDate() - 7)
    const hasta = new Date(fecha)
    hasta.setDate(hasta.getDate() + 1)
    const desdeStr = desde.toISOString().split('T')[0]
    const hastaStr = hasta.toISOString().split('T')[0]

    const sql = getDb()
    // Normalize clubId to null to avoid undefined being passed to Neon template literals
    const clubId = s.clubId ? Number(s.clubId) : null

    // Planned training sessions
    let sesiones: any[] = []
    try {
      sesiones = await sql`
        SELECT id, fecha::text, tipo, titulo, hora_inicio::text, objetivo
        FROM sesiones_plan
        WHERE admin_id = ${s.userId}
          AND fecha BETWEEN ${desdeStr} AND ${hastaStr}
        ORDER BY fecha DESC, hora_inicio
      ` as any[]
    } catch { /* table may not exist yet */ }

    // Also check for partido_logs on that date (these don't have a sesion_id)
    let partidos: any[] = []
    if (clubId) {
      try {
        partidos = await sql`
          SELECT DISTINCT pl.fecha::text, pl.rival, pl.tipo_partido
          FROM partido_logs pl
          JOIN jugadores j ON j.id = pl.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE u.club_id = ${clubId}
            AND pl.fecha BETWEEN ${desdeStr} AND ${hastaStr}
          ORDER BY pl.fecha DESC
        ` as any[]
      } catch { /* table may not exist yet */ }
    }

    // Existing GPS imports for this date (gps_logs may not exist if migrations haven't run)
    let existing: any[] = []
    if (clubId) {
      try {
        existing = await sql`
          SELECT fecha::text, tipo_sesion, COUNT(*)::int as n_jugadores
          FROM gps_logs
          WHERE club_id = ${clubId}
            AND fecha = ${fecha}
          GROUP BY fecha, tipo_sesion
        ` as any[]
      } catch {
        // Table doesn't exist yet — ignore
      }
    }

    return NextResponse.json({
      sesiones,
      partidos,
      existing,
      fecha,
    })

  } catch (err) {
    console.error('[GPS sesiones error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
