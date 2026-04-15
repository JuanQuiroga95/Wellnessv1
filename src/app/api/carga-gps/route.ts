export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

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

    // FIX DETECCIÓN JUGADORES: Buscamos el "20" en cualquier variante
    const autoTotal = (Number(bl.atacantes)||0) + (Number(bl.defensores)||0) + (Number(bl.comodines)||0)
    let jug = autoTotal > 0 ? autoTotal : (Number(bl.jugadores) || Number(bl.num_jugadores) || Number(bl.total_jugadores) || 0)
    
    // Si no hay jugadores pero hay equipos seleccionados
    if (!jug && bl.equipos && typeof bl.equipos === 'object') {
      for (const arr of Object.values(bl.equipos as Record<string,any>)) {
        if (Array.isArray(arr)) jug += arr.length
      }
    }

    t.minActivo += series * minutos
    t.minPausa  += series * pausa

    const hasOverrides = Object.keys(ov).some(k => ov[k] !== undefined && ov[k] !== '')

    if (hasOverrides) {
      t.distTotal  += Number(ov.distTotal  ?? 0)
      t.distSprint += Number(ov.distSprint ?? 0)
      t.distMP     += Number(ov.distMP     ?? 0)
      t.distAcel   += Number(ov.distAcel   ?? 0)
      t.distDecel  += Number(ov.distDecel  ?? 0)
      t.nSprints   += Number(ov.nSprints   ?? 0)
    } else if (series && minutos && jug > 0 && largo && ancho) {
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

    // FIX FECHA: Incluir hasta el último segundo
    const hastaInc = new Date(hasta + 'T23:59:59.999Z').toISOString()
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    // Buscamos sesiones, jugadores y logs
    const sesiones = await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo, tipo FROM sesiones_plan WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`
    const todosJugadores = await sql`SELECT j.id AS jugador_id, u.nombre, j.posicion FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true ORDER BY u.nombre`
    const logs = await sql`SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int FROM entrenamiento_logs el WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp AND el.jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`

    const dailyMap: Record<string, any> = {}
    logs.forEach((log: any) => {
      if (!dailyMap[log.fecha]) dailyMap[log.fecha] = { total_ua: 0, total_rpe: 0, count: 0 }
      dailyMap[log.fecha].total_ua += Number(log.carga_ua) || 0
      dailyMap[log.fecha].total_rpe += Number(log.rpe) || 0
      dailyMap[log.fecha].count += 1
    })

    const daily = Object.keys(dailyMap).sort().map(fecha => {
      const d = dailyMap[fecha]
      const avg_ua = Math.round(d.total_ua / d.count)
      const avg_rpe = d.total_rpe / d.count
      return { fecha, avg_ua, avg_rpe: Math.round(avg_rpe * 10) / 10, avg_uce: avg_ua, n: d.count }
    })

    const players = (todosJugadores as any[]).map(p => {
      const pLogs = (logs as any[]).filter(l => l.jugador_id === p.jugador_id)
      const totalUA = pLogs.reduce((acc, curr) => acc + (curr.carga_ua || 0), 0)
      return { jugador_id: p.jugador_id, nombre: p.nombre, ua_total: totalUA, sesiones: pLogs.length }
    })

    return NextResponse.json({ daily, players, qualifyingCount: players.length, sesionesInfo: sesiones })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const borrarTodo = searchParams.get('all') === 'true'
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (borrarTodo && clubId) {
      await sql`DELETE FROM sesiones_plan WHERE club_id = ${clubId}`
      await sql`DELETE FROM entrenamiento_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`
      await sql`DELETE FROM partido_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ ok: false })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
