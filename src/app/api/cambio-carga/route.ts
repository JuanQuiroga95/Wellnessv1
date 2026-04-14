export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

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
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde') || localDaysAgo(28)
  const hasta = searchParams.get('hasta') || localToday()
  const minEntrenamiento = parseInt(searchParams.get('minEntrenamiento') || '60')
  const minPartido = parseInt(searchParams.get('minPartido') || '0')

  const clubId = s.clubId ? Number(s.clubId) : null
  const isMaster = s.rol === 'master_admin' && !s.clubId
  const sql = getDb()

  // Seguridad: si no es master y no tiene clubId, no puede ver datos de otros clubes
  if (!isMaster && !clubId) return NextResponse.json([])

  // Get all training logs with player names in date range
  const trainLogs = await sql`
    SELECT 
      el.jugador_id,
      u.nombre,
      el.fecha::text,
      el.carga_ua,
      el.duracion_min,
      el.rpe
    FROM entrenamiento_logs el
    JOIN jugadores j ON j.id = el.jugador_id
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE el.fecha BETWEEN ${desde} AND ${hasta}
      AND u.activo = true
      AND (${isMaster}::boolean OR (u.club_id = ${clubId} AND j.club_id = ${clubId}))
    ORDER BY el.fecha ASC
  `

  // Get all match logs in date range
  const matchLogs = await sql`
    SELECT 
      pl.jugador_id,
      pl.fecha::text,
      pl.minutos
    FROM partido_logs pl
    JOIN jugadores j ON j.id = pl.jugador_id
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE pl.fecha BETWEEN ${desde} AND ${hasta}
      AND u.activo = true
      AND (${isMaster}::boolean OR (u.club_id = ${clubId} AND j.club_id = ${clubId}))
    ORDER BY pl.fecha ASC
  `

  // Determine qualifying players:
  // If minPartido === 0 → no match requirement, all players with training data qualify
  // If minPartido > 0  → only players with at least one match with >= minPartido minutes
  const qualifyingPlayers = new Set<number>()
  if (minPartido === 0) {
    for (const log of trainLogs as any[]) {
      qualifyingPlayers.add(log.jugador_id)
    }
  } else {
    for (const m of matchLogs as any[]) {
      if (m.minutos >= minPartido) qualifyingPlayers.add(m.jugador_id)
    }
  }

  // Load planned sessions to compute CE per date (for UCE = CE × RPE_real)
  const NE_DEFAULT_API: Record<string,number> = {
    'Partido oficial':10,'Partido amistoso':9,'Partido de entrenamiento':8,
    'Partido modificado':7,'Partido reducido':7,'Juego de posición':6,
    'Juego de posesión':6,'Transiciones':5,'Rondo':5,'Trabajo analítico':4,
    'Gimnasio':3,'Activación en campo':2,'Activación en gimnasio':2,
  }
  const sesionesParaUCE = clubId ? await sql`
    SELECT fecha::text, ejercicios
    FROM sesiones_plan
    WHERE club_id = ${clubId}
      AND fecha BETWEEN ${desde} AND ${hasta}
    ORDER BY fecha`
  : await sql`
    SELECT fecha::text, ejercicios
    FROM sesiones_plan
    WHERE admin_id = ${s.userId}
      AND club_id IS NULL
      AND fecha BETWEEN ${desde} AND ${hasta}
    ORDER BY fecha`

  // Build CE per date from session blocks
  const ceByDate: Record<string, number> = {}
  for (const ses of sesionesParaUCE as any[]) {
    let ceTotal = 0
    for (const bl of (ses.ejercicios || [])) {
      if (!bl.ventana) continue
      const ne = bl.ne ?? NE_DEFAULT_API[bl.ventana] ?? 5
      const minTotal = (Number(bl.series)||1) * (Number(bl.minutos)||0)
      if (!minTotal) continue
      ceTotal += Math.round(minTotal * ne)
    }
    if (ceTotal > 0) ceByDate[ses.fecha] = (ceByDate[ses.fecha] || 0) + ceTotal
  }

  // Group by date: only sessions where player qualifies and trained >= minEntrenamiento
  const byDate: Record<string, { total_ua: number; total_rpe: number; count: number; players: string[] }> = {}
  for (const log of trainLogs as any[]) {
    if (!qualifyingPlayers.has(log.jugador_id)) continue
    if ((log.duracion_min || 0) < minEntrenamiento) continue
    if (!byDate[log.fecha]) byDate[log.fecha] = { total_ua: 0, total_rpe: 0, count: 0, players: [] }
    byDate[log.fecha].total_ua += log.carga_ua || 0
    byDate[log.fecha].total_rpe += log.rpe || 0
    byDate[log.fecha].count += 1
    if (!byDate[log.fecha].players.includes(log.nombre)) {
      byDate[log.fecha].players.push(log.nombre)
    }
  }

  // Build daily array sorted by date
  // pct_change: compare to last day that had data (not just previous index)
  const dailyDates = Object.keys(byDate).sort()
  const daily = dailyDates.map((fecha, i) => {
    const avg = byDate[fecha].count > 0 ? Math.round(byDate[fecha].total_ua / byDate[fecha].count) : 0
    const avg_rpe = byDate[fecha].count > 0 ? byDate[fecha].total_rpe / byDate[fecha].count : 0
    const ce = ceByDate[fecha] || 0
    const avg_uce = ce > 0 && avg_rpe > 0 ? Math.round(ce * avg_rpe) : 0
    // Find last previous date that had actual data (ua > 0)
    let prevAvg: number | null = null
    for (let j = i - 1; j >= 0; j--) {
      const pDate = dailyDates[j]
      const pAvg = byDate[pDate].count > 0 ? Math.round(byDate[pDate].total_ua / byDate[pDate].count) : 0
      if (pAvg > 0) { prevAvg = pAvg; break }
    }
    // pct: if current=0 and prev>0 → -100%. if current>0 and prev=0/null → +100%. else normal calc
    let pct: number | null = null
    if (prevAvg !== null) {
      if (prevAvg === 0 && avg > 0) pct = 100
      else if (prevAvg > 0 && avg === 0) pct = -100
      else if (prevAvg > 0) pct = Math.round(((avg - prevAvg) / prevAvg) * 100)
    } else if (avg > 0) {
      pct = null // first data point, no comparison
    }
    return {
      fecha,
      label: fecha,
      avg_ua: avg,
      avg_rpe: Math.round(avg_rpe * 10) / 10,
      avg_uce,
      n: byDate[fecha].count,
      count: byDate[fecha].count,
      players: byDate[fecha].players,
      pct_change: pct,
    }
  })

  // Group by ISO week
  function getWeekKey(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00Z')
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${d.getUTCFullYear()}-S${String(week).padStart(2, '0')}`
  }

  const byWeek: Record<string, { total_ua: number; count: number; label: string }> = {}
  for (const log of trainLogs as any[]) {
    if (!qualifyingPlayers.has(log.jugador_id)) continue
    if ((log.duracion_min || 0) < minEntrenamiento) continue
    const wk = getWeekKey(log.fecha)
    if (!byWeek[wk]) {
      const d = new Date(log.fecha + 'T12:00:00Z')
      const label = `${wk} (${d.getUTCDate().toString().padStart(2,'0')}/${(d.getUTCMonth()+1).toString().padStart(2,'0')})`
      byWeek[wk] = { total_ua: 0, count: 0, label }
    }
    byWeek[wk].total_ua += log.carga_ua || 0
    byWeek[wk].count += 1
  }

  const weekKeys = Object.keys(byWeek).sort()
  const weekly = weekKeys.map((wk, i) => {
    const avg = byWeek[wk].count > 0 ? Math.round(byWeek[wk].total_ua / byWeek[wk].count) : 0
    const prev = i > 0 ? Math.round(byWeek[weekKeys[i - 1]].total_ua / byWeek[weekKeys[i - 1]].count) : null
    const pct = prev !== null && prev > 0 ? Math.round(((avg - prev) / prev) * 100) : null
    return {
      semana: wk,
      label: byWeek[wk].label,
      avg_ua: avg,
      count: byWeek[wk].count,
      pct_change: pct,
    }
  })

  // Build per-player aggregates — usa carga_ua si existe, sino rpe como UA aproximada
  const byPlayer: Record<number, { jugador_id: number; nombre: string; total_ua: number; total_rpe: number; count: number; count_ua: number }> = {}
  for (const log of trainLogs as any[]) {
    if (!byPlayer[log.jugador_id]) {
      byPlayer[log.jugador_id] = { jugador_id: log.jugador_id, nombre: log.nombre, total_ua: 0, total_rpe: 0, count: 0, count_ua: 0 }
    }
    const ua = Number(log.carga_ua) || 0
    byPlayer[log.jugador_id].total_ua += ua
    byPlayer[log.jugador_id].total_rpe += Number(log.rpe) || 0
    byPlayer[log.jugador_id].count += 1
    if (ua > 0) byPlayer[log.jugador_id].count_ua += 1
  }
  const players = Object.values(byPlayer).map(p => ({
    jugador_id: p.jugador_id,
    nombre: p.nombre,
    rpe: p.count > 0 ? Math.round((p.total_rpe / p.count) * 10) / 10 : 0,
    ua: p.count_ua > 0 ? Math.round(p.total_ua / p.count_ua) : 0,
    ua_total: Math.round(p.total_ua),
    sesiones: p.count,
  })).sort((a, b) => a.nombre.localeCompare(b.nombre))

  return NextResponse.json({ daily, weekly, qualifyingCount: qualifyingPlayers.size, players })
}
