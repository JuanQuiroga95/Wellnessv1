export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// MOTOR DE CÁLCULO: Mantenemos tu lógica de metros original pero arreglamos la detección de jugadores
function sumarMetricasBloques(ejercicios: any[]): Record<string, number> {
  const t = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, minActivo:0, minPausa:0 }
  if (!Array.isArray(ejercicios)) return t
  for (const bl of ejercicios) {
    const series  = Number(bl.series)  || 1
    const minutos = Number(bl.minutos) || 0
    const pausa   = Number(bl.pausa)   || 0
    const largo   = Number(bl.largo)   || 0
    const ancho   = Number(bl.ancho)   || 0
    const ov      = bl.overrides || {}

    // FIX JUGADORES: Buscamos el "20" en cualquier lado para que no dé 0
    const autoTotal = (Number(bl.atacantes)||0) + (Number(bl.defensores)||0) + (Number(bl.comodines)||0)
    let jug = autoTotal > 0 ? autoTotal : (Number(bl.jugadores) || Number(bl.num_jugadores) || 0)
    if (!jug) jug = 1 // Evitamos división por cero

    t.minActivo += series * minutos
    t.minPausa  += series * pausa

    const hasOverrides = Object.keys(ov).some(k => ov[k] !== undefined && ov[k] !== '')

    if (hasOverrides) {
      t.distTotal  += Number(ov.distTotal  ?? 0); t.distSprint += Number(ov.distSprint ?? 0)
      t.distMP     += Number(ov.distMP     ?? 0); t.distAcel   += Number(ov.distAcel   ?? 0)
      t.distDecel  += Number(ov.distDecel  ?? 0); t.nSprints   += Number(ov.nSprints   ?? 0)
      t.nAcel      += Number(ov.nAcel      ?? 0); t.nDecel     += Number(ov.nDecel     ?? 0)
    } else if (largo && ancho) {
      const densidad   = (largo * ancho) / jug
      const tiempoAct  = series * minutos
      t.distTotal  += Math.max(0, (19.243 * Math.log(densidad) - 5.029)  * tiempoAct)
      t.distSprint += Math.max(0, (0.018 * densidad - 0.844)             * tiempoAct)
      t.distMP     += Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoAct)
      t.distAcel   += Math.max(0, (1.321  * Math.log(densidad) - 0.629)  * tiempoAct)
      t.distDecel  += Math.max(0, (1.157  * Math.log(densidad) - 0.418)  * tiempoAct)
      t.nSprints   += Math.max(0, (0.001  * densidad - 0.046)            * tiempoAct)
      t.nAcel      += Math.max(0, (0.212  * Math.log(densidad) - 0.23)   * tiempoAct)
      t.nDecel     += Math.max(0, (0.1041 * Math.log(densidad) - 0.096)  * tiempoAct)
    }
  }
  return Object.fromEntries(Object.entries(t).map(([k,v]) => [k, Math.round(v as number)]))
}

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || '2024-01-01'
    const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
    const hastaInc = hasta + ' 23:59:59'

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    // 1. Datos base
    const sesiones = await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo, tipo FROM sesiones_plan WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`
    const todosJugadores = await sql`SELECT j.id AS jugador_id, u.nombre, j.posicion FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true ORDER BY u.nombre`
    const logs = await sql`SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int FROM entrenamiento_logs el WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp AND el.jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`

    // 2. Procesar GPS por fecha para los cuadros de abajo
    const perSession: Record<string, any> = {}
    sesiones.forEach((ses: any) => {
      const label = ses.titulo || ses.fecha
      const m = sumarMetricasBloques(ses.ejercicios || [])
      perSession[label] = { fecha: ses.fecha, rpe_objetivo: ses.rpe_objetivo, ...m }
    })

    // 3. Procesar jugadores (Tabla izquierda)
    const playerMap: Record<number, any> = {}
    logs.forEach((log: any) => {
      if (!playerMap[log.jugador_id]) {
        const pInfo = todosJugadores.find((j: any) => j.jugador_id === log.jugador_id)
        playerMap[log.jugador_id] = { jugador_id: log.jugador_id, nombre: pInfo?.nombre || '?', total_ua: 0, total_rpe: 0, total_min: 0, count: 0 }
      }
      playerMap[log.jugador_id].total_ua += Number(log.carga_ua) || 0
      playerMap[log.jugador_id].total_rpe += Number(log.rpe) || 0
      playerMap[log.jugador_id].total_min += Number(log.duracion_min) || 0
      playerMap[log.jugador_id].count += 1
    })

    const players = Object.values(playerMap).map((p: any) => ({
      jugador_id: p.jugador_id, nombre: p.nombre, rpe: Math.round((p.total_rpe / p.count) * 10) / 10,
      ua: Math.round(p.total_ua / p.count), tiempo: p.total_min, sesiones: p.count
    }))

    // 4. Datos para el gráfico principal (UCE/UA)
    const dailyMap: Record<string, any> = {}
    logs.forEach((log: any) => {
      if (!dailyMap[log.fecha]) dailyMap[log.fecha] = { total_ua: 0, total_rpe: 0, count: 0 }
      dailyMap[log.fecha].total_ua += Number(log.carga_ua) || 0
      dailyMap[log.fecha].total_rpe += Number(log.rpe) || 0
      dailyMap[log.fecha].count += 1
    })

    const daily = Object.keys(dailyMap).sort().map(fecha => {
      const d = dailyMap[fecha]; const rpe_avg = d.total_rpe / d.count
      return { fecha, avg_ua: Math.round(d.total_ua / d.count), avg_rpe: Math.round(rpe_avg * 10) / 10, avg_uce: Math.round(d.total_ua / d.count), n: d.count }
    })

    return NextResponse.json({ daily, players, perSession, sesionesInfo: sesiones, qualifyingCount: players.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
