import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde') || new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
  const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
  const minEntrenamiento = parseInt(searchParams.get('minEntrenamiento') || '60')
  const minPartido = parseInt(searchParams.get('minPartido') || '0')

  const clubId = s.clubId ?? null
  const sql = getDb()

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
      AND u.club_id = ${clubId}
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
      AND u.club_id = ${clubId}
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

  // Group by date: only sessions where player qualifies and trained >= minEntrenamiento
  const byDate: Record<string, { total_ua: number; total_rpe: number; count: number; players: string[] }> = {}
  for (const log of trainLogs as any[]) {
    if (!qualifyingPlayers.has(log.jugador_id)) continue
    if (log.duracion_min < minEntrenamiento) continue
    if (!byDate[log.fecha]) byDate[log.fecha] = { total_ua: 0, total_rpe: 0, count: 0, players: [] }
    byDate[log.fecha].total_ua += log.carga_ua || 0
    byDate[log.fecha].total_rpe += log.rpe || 0
    byDate[log.fecha].count += 1
    if (!byDate[log.fecha].players.includes(log.nombre)) {
      byDate[log.fecha].players.push(log.nombre)
    }
  }

  // Build daily array sorted by date
  const dailyDates = Object.keys(byDate).sort()
  const daily = dailyDates.map((fecha, i) => {
    const avg = byDate[fecha].count > 0 ? Math.round(byDate[fecha].total_ua / byDate[fecha].count) : 0
    const avg_rpe = byDate[fecha].count > 0 ? byDate[fecha].total_rpe / byDate[fecha].count : 0
    const prev = i > 0 ? Math.round(byDate[dailyDates[i - 1]].total_ua / byDate[dailyDates[i - 1]].count) : null
    const pct = prev !== null && prev > 0 ? Math.round(((avg - prev) / prev) * 100) : null
    return {
      fecha,
      label: fecha,
      avg_ua: avg,
      avg_rpe: Math.round(avg_rpe * 10) / 10,
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
    if (log.duracion_min < minEntrenamiento) continue
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

  return NextResponse.json({ daily, weekly, qualifyingCount: qualifyingPlayers.size })
}
