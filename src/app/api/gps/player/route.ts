export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// GET /api/gps/player?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Returns GPS logs for the logged-in player
// Local-date helper: avoids UTC-midnight shift from localToday()
function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || s.rol !== 'jugador') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || (() => { const d=new Date(); d.setDate(d.getDate()-90); return d.toISOString().split('T')[0] })()
    const hasta = searchParams.get('hasta') || localToday()
  // hastaInc: +1 día para inclusividad total del día "hasta" con el driver Neon
  const hastaInc = (() => {
    const d = new Date(hasta + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().split('T')[0]
  })()

    const sql = getDb()

    // Get jugador_id for this user
    const jug = await sql`SELECT id FROM jugadores WHERE usuario_id = ${s.userId} LIMIT 1` as any[]
    if (!jug.length) return NextResponse.json({ logs: [], resumen: null })

    const jugadorId = jug[0].id

    // Get GPS logs for this player
    const logs = await sql`
      SELECT
        g.id, g.fecha::text, g.tipo_sesion, g.fuente,
        g.dist_total, g.dist_hir, g.dist_v4, g.dist_v5,
        g.player_load, g.max_velocity, g.acc2, g.dec2, g.acc3, g.dec3,
        g.dist_per_min, g.metricas,
        sp.titulo AS md_label, sp.objetivo
      FROM gps_logs g
      LEFT JOIN sesiones_plan sp ON sp.id = g.sesion_id
      WHERE g.jugador_id = ${jugadorId}
        AND g.fecha >= ${desde}::date AND g.fecha < ${hastaInc}::date
      ORDER BY g.fecha DESC
    ` as any[]

    // Build summary (totals + averages)
    const n = logs.length || 1
    const sum = (field: string) => logs.reduce((acc, r) => acc + (Number(r[field]) || 0), 0)
    const avg = (field: string) => Math.round(sum(field) / n * 10) / 10
    const max = (field: string) => Math.max(...logs.map(r => Number(r[field]) || 0))

    const resumen = logs.length ? {
      sesiones: logs.length,
      dist_total_sum: Math.round(sum('dist_total')),
      dist_total_avg: Math.round(avg('dist_total')),
      dist_hir_sum: Math.round(sum('dist_hir')),
      dist_hir_avg: Math.round(avg('dist_hir')),
      dist_v4_sum: Math.round(sum('dist_v4')),
      dist_v5_sum: Math.round(sum('dist_v5')),
      player_load_avg: Math.round(avg('player_load') * 10) / 10,
      max_velocity_max: Math.round(max('max_velocity') * 10) / 10,
      acc2_avg: Math.round(avg('acc2') * 10) / 10,
      dec2_avg: Math.round(avg('dec2') * 10) / 10,
      dist_per_min_avg: Math.round(avg('dist_per_min') * 10) / 10,
    } : null

    // Enrich metricas JSON for dynamic fields
    const enriched = logs.map(r => ({
      ...r,
      metricas: typeof r.metricas === 'object' ? r.metricas : {},
    }))

    return NextResponse.json({ logs: enriched, resumen })
  } catch (err) {
    console.error('[gps/player error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
