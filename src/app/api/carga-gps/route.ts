import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// Suma las métricas GPS de todos los bloques de una sesión planificada
function sumarMetricasBloques(ejercicios: any[]): Record<string, number> {
  const totales = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, minActivo:0, minPausa:0 }
  if (!Array.isArray(ejercicios)) return totales
  for (const bl of ejercicios) {
    const series  = Number(bl.series)  || 0
    const minutos = Number(bl.minutos) || 0
    const pausa   = Number(bl.pausa)   || 0
    const jug     = Number(bl.jugadores) || 0
    const largo   = Number(bl.largo)   || 0
    const ancho   = Number(bl.ancho)   || 0
    const overrides = bl.overrides || {}

    totales.minActivo += series * minutos
    totales.minPausa  += series * pausa

    // Si hay métricas (calculadas o GPS manual via overrides)
    if (series && minutos && jug && largo && ancho) {
      const espacioM2  = largo * ancho
      const densidad   = espacioM2 / jug
      const tiempoAct  = series * minutos
      const calcV = (key: string, formula: () => number) =>
        overrides[key] !== undefined && overrides[key] !== '' ? Number(overrides[key]) : Math.max(0, formula())

      totales.distTotal  += calcV('distTotal',  () => (19.243 * Math.log(densidad) - 5.029)   * tiempoAct)
      totales.distSprint += calcV('distSprint', () => (0.018 * densidad - 0.844)               * tiempoAct)
      totales.distMP     += calcV('distMP',     () => (7.0421 * Math.log(densidad) - 15.255)   * tiempoAct)
      totales.distAcel   += calcV('distAcel',   () => (1.321  * Math.log(densidad) - 0.629)    * tiempoAct)
      totales.distDecel  += calcV('distDecel',  () => (1.157  * Math.log(densidad) - 0.418)    * tiempoAct)
      totales.nSprints   += calcV('nSprints',   () => (0.001  * densidad - 0.046)              * tiempoAct)
      totales.nAcel      += calcV('nAcel',      () => (0.212  * Math.log(densidad) - 0.23)     * tiempoAct)
      totales.nDecel     += calcV('nDecel',     () => (0.1041 * Math.log(densidad) - 0.096)    * tiempoAct)
    }
  }
  // Round all
  return Object.fromEntries(Object.entries(totales).map(([k,v]) => [k, Math.round(v)]))
}

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const desde  = searchParams.get('desde')  || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const hasta  = searchParams.get('hasta')  || new Date().toISOString().split('T')[0]
    const ciclo  = searchParams.get('ciclo')  || 'microciclo'
    const sql    = getDb()

    // 1. Sesiones planificadas con sus bloques de tareas en el rango
    const sesiones = await sql`
      SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo
      FROM sesiones_plan
      WHERE admin_id = ${s.userId}
        AND fecha BETWEEN ${desde} AND ${hasta}
      ORDER BY fecha`

    // 2. Todos los jugadores del club con sus logs de entrenamiento en el rango
    const logs = await sql`
      SELECT el.jugador_id, u.nombre, j.posicion,
             el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.fecha BETWEEN ${desde} AND ${hasta}
        AND u.activo = true
        AND u.club_id = ${s.clubId ?? null}
      ORDER BY el.fecha`

    // 3. Para cada sesión planificada, sumar métricas GPS de sus bloques
    // Mapear por fecha → métricas GPS totales de la sesión del día
    const gpsPorFecha: Record<string, Record<string, number> & { rpe_objetivo: number }> = {}
    for (const ses of sesiones as any[]) {
      const metricas = sumarMetricasBloques(ses.ejercicios || [])
      gpsPorFecha[ses.fecha] = { ...metricas, rpe_objetivo: Number(ses.rpe_objetivo) || 0 }
    }

    // 4. Agrupar logs por jugador, cruzar con GPS por fecha
    const byPlayer: Record<number, {
      jugador_id: number; nombre: string; posicion: string
      sesiones: number; total_rpe: number; total_ua: number
      distTotal: number; distSprint: number; distMP: number
      distAcel: number; distDecel: number; nSprints: number; nAcel: number; nDecel: number
      minActivo: number
    }> = {}

    for (const log of logs as any[]) {
      const jid = log.jugador_id
      if (!byPlayer[jid]) {
        byPlayer[jid] = { jugador_id: jid, nombre: log.nombre, posicion: log.posicion || '—',
          sesiones:0, total_rpe:0, total_ua:0,
          distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0,
          nSprints:0, nAcel:0, nDecel:0, minActivo:0 }
      }
      const p = byPlayer[jid]
      p.sesiones  += 1
      p.total_rpe += Number(log.rpe) || 0
      p.total_ua  += Number(log.carga_ua) || 0
      p.minActivo += Number(log.duracion_min) || 0

      // Cruzar con GPS del día si existe sesión planificada
      const gps = gpsPorFecha[log.fecha]
      if (gps) {
        p.distTotal  += gps.distTotal  || 0
        p.distSprint += gps.distSprint || 0
        p.distMP     += gps.distMP     || 0
        p.distAcel   += gps.distAcel   || 0
        p.distDecel  += gps.distDecel  || 0
        p.nSprints   += gps.nSprints   || 0
        p.nAcel      += gps.nAcel      || 0
        p.nDecel     += gps.nDecel     || 0
      }
    }

    const players = Object.values(byPlayer).map(p => ({
      jugador_id:  p.jugador_id,
      nombre:      p.nombre,
      posicion:    p.posicion,
      sesiones:    p.sesiones,
      rpe:         p.sesiones > 0 ? Math.round((p.total_rpe / p.sesiones) * 10) / 10 : 0,
      ua:          p.sesiones > 0 ? Math.round(p.total_ua / p.sesiones) : 0,
      ua_total:    Math.round(p.total_ua),
      minActivo:   p.minActivo,
      distTotal:   Math.round(p.distTotal),
      distSprint:  Math.round(p.distSprint),
      distMP:      Math.round(p.distMP),
      distAcel:    Math.round(p.distAcel),
      distDecel:   Math.round(p.distDecel),
      nSprints:    Math.round(p.nSprints),
      nAcel:       Math.round(p.nAcel),
      nDecel:      Math.round(p.nDecel),
      hasGps:      p.distTotal > 0,
    })).sort((a, b) => a.nombre.localeCompare(b.nombre))

    // 5. Totales y promedios del equipo
    const n = players.length || 1
    const teamAvg = {
      rpe:        Math.round((players.reduce((s,p)=>s+p.rpe,0)/n)*10)/10,
      ua:         Math.round(players.reduce((s,p)=>s+p.ua,0)/n),
      ua_total:   Math.round(players.reduce((s,p)=>s+p.ua_total,0)/n),
      distTotal:  Math.round(players.reduce((s,p)=>s+p.distTotal,0)/n),
      distSprint: Math.round(players.reduce((s,p)=>s+p.distSprint,0)/n),
      distMP:     Math.round(players.reduce((s,p)=>s+p.distMP,0)/n),
      distAcel:   Math.round(players.reduce((s,p)=>s+p.distAcel,0)/n),
      distDecel:  Math.round(players.reduce((s,p)=>s+p.distDecel,0)/n),
      nSprints:   Math.round(players.reduce((s,p)=>s+p.nSprints,0)/n),
      nAcel:      Math.round(players.reduce((s,p)=>s+p.nAcel,0)/n),
      nDecel:     Math.round(players.reduce((s,p)=>s+p.nDecel,0)/n),
      sesiones:   Math.round(players.reduce((s,p)=>s+p.sesiones,0)/n),
    }

    const hasGpsData = players.some(p => p.hasGps)

    return NextResponse.json({ players, teamAvg, hasGpsData, sesionesCount: sesiones.length, ciclo })
  } catch (err) {
    console.error('[carga-gps GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
