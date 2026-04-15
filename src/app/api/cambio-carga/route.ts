export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

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
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || localDaysAgo(28)
    const hasta = searchParams.get('hasta') || localToday()
    const minEntrenamiento = parseInt(searchParams.get('minEntrenamiento') || '10')
    const minPartido = parseInt(searchParams.get('minPartido') || '0')

    // FIX FECHA: Rango inclusivo hasta el último segundo
    const hastaInc = (() => {
      const d = new Date(hasta + 'T23:59:59.999Z')
      return d.toISOString()
    })()

    const clubId = s.clubId ? Number(s.clubId) : null
    const isMaster = s.rol === 'master_admin' && !s.clubId
    const sql = getDb()

    if (!isMaster && !clubId) return NextResponse.json([])

    const trainLogs = await sql`
      SELECT el.jugador_id, u.nombre, el.fecha::text, el.carga_ua, el.duracion_min, el.rpe
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp
        AND u.activo = true
        AND (${isMaster}::boolean OR (u.club_id = ${clubId} AND j.club_id = ${clubId}))
      ORDER BY el.fecha ASC
    `

    const matchLogs = await sql`
      SELECT pl.jugador_id, pl.fecha::text, pl.minutos
      FROM partido_logs pl
      JOIN jugadores j ON j.id = pl.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE pl.fecha >= ${desde}::date AND pl.fecha <= ${hastaInc}::timestamp
        AND u.activo = true
        AND (${isMaster}::boolean OR (u.club_id = ${clubId} AND j.club_id = ${clubId}))
      ORDER BY pl.fecha ASC
    `

    const qualifyingPlayers = new Set<number>()
    if (minPartido === 0) {
      for (const log of trainLogs as any[]) { qualifyingPlayers.add(log.jugador_id) }
    } else {
      for (const m of matchLogs as any[]) {
        if (m.minutos >= minPartido) qualifyingPlayers.add(m.jugador_id)
      }
    }

    const NE_DEFAULT_API: Record<string,number> = {
      'Partido oficial':10,'Partido amistoso':9,'Partido de entrenamiento':8,
      'Partido modificado':7,'Partido reducido':7,'Juego de posición':6,
      'Juego de posesión':6,'Transiciones':5,'Rondo':5,'Trabajo analítico':4,
      'Gimnasio':3,'Activación en campo':2,'Activación en gimnasio':2,
    }

    const sesionesParaUCE = clubId ? await sql`
      SELECT fecha::text, ejercicios FROM sesiones_plan
      WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp`
    : await sql`
      SELECT fecha::text, ejercicios FROM sesiones_plan
      WHERE admin_id = ${s.userId} AND club_id IS NULL AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp`

    const ceByDate: Record<string, number> = {}
    for (const ses of sesionesParaUCE as any[]) {
      let ceTotal = 0
      for (const bl of (ses.ejercicios || [])) {
        if (!bl.ventana) continue
        const ne = bl.ne ?? NE_DEFAULT_API[bl.ventana] ?? 5
        const minTotal = (Number(bl.series)||1) * (Number(bl.minutos)||0)
        
        // FIX DETECCIÓN JUGADORES: Buscamos el "20" en todas las variantes
        const autoTotal = (Number(bl.atacantes)||0) + (Number(bl.defensores)||0) + (Number(bl.comodines)||0)
        let jug = autoTotal > 0 ? autoTotal : (Number(bl.jugadores) || Number(bl.num_jugadores) || 0)
        
        // FÓRMULA DE CARGA EXTERNA (Basada en Casamichana/Densidad)
        if (minTotal > 0 && jug > 0 && bl.largo && bl.ancho) {
          const densidad = (Number(bl.largo) * Number(bl.ancho)) / jug
          // Usamos la fórmula de tu motor para estimar la carga del bloque
          const distEstimada = Math.max(0, (19.243 * Math.log(densidad) - 5.029) * minTotal)
          ceTotal += Math.round(distEstimada * (ne / 5)) // Ajustado por Intensidad (NE)
        } else if (minTotal > 0) {
          // Fallback simple si no hay medidas pero sí tiempo
          ceTotal += Math.round(minTotal * ne)
        }
      }
      if (ceTotal > 0) ceByDate[ses.fecha] = (ceByDate[ses.fecha] || 0) + ceTotal
    }

    const byDate: Record<string, { total_ua: number; total_rpe: number; count: number; players: string[] }> = {}
    for (const log of trainLogs as any[]) {
      if (!qualifyingPlayers.has(log.jugador_id)) continue
      if ((log.duracion_min || 0) < minEntrenamiento) continue
      if (!byDate[log.fecha]) byDate[log.fecha] = { total_ua: 0, total_rpe: 0, count: 0, players: [] }
      byDate[log.fecha].total_ua += log.carga_ua || 0
      byDate[log.fecha].total_rpe += log.rpe || 0
      byDate[log.fecha].count += 1
      if (!byDate[log.fecha].players.includes(log.nombre)) byDate[log.fecha].players.push(log.nombre)
    }

    const dailyDates = Object.keys(byDate).sort()
    const daily = dailyDates.map((fecha, i) => {
      const avg = Math.round(byDate[fecha].total_ua / byDate[fecha].count)
      const avg_rpe = byDate[fecha].total_rpe / byDate[fecha].count
      const ce = ceByDate[fecha] || 0
      
      // FIX UCE: Ahora sí debería dar un número mayor a 0
      const avg_uce = ce > 0 ? Math.round(ce * (avg_rpe / 5)) : 0

      return {
        fecha, label: fecha, avg_ua: avg, avg_rpe: Math.round(avg_rpe * 10) / 10,
        avg_uce, count: byDate[fecha].count, players: byDate[fecha].players
      }
    })

    const byPlayer: Record<number, any> = {}
    for (const log of trainLogs as any[]) {
      if (!byPlayer[log.jugador_id]) byPlayer[log.jugador_id] = { jugador_id: log.jugador_id, nombre: log.nombre, total_ua: 0, total_rpe: 0, count: 0 }
      byPlayer[log.jugador_id].total_ua += Number(log.carga_ua) || 0
      byPlayer[log.jugador_id].total_rpe += Number(log.rpe) || 0
      byPlayer[log.jugador_id].count += 1
    }
    const players = Object.values(byPlayer).map((p:any) => ({
      jugador_id: p.jugador_id, nombre: p.nombre,
      rpe: Math.round((p.total_rpe / p.count) * 10) / 10,
      ua: Math.round(p.total_ua / p.count),
      ua_total: Math.round(p.total_ua),
      sesiones: p.count,
    })).sort((a, b) => a.nombre.localeCompare(b.nombre))

    return NextResponse.json({ daily, weekly: [], qualifyingCount: players.length, players })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
