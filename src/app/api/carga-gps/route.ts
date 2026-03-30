import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function sumarMetricasBloques(ejercicios: any[]): Record<string, number> {
  const t = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, minActivo:0, minPausa:0 }
  if (!Array.isArray(ejercicios)) return t
  for (const bl of ejercicios) {
    const series  = Number(bl.series)  || 0
    const minutos = Number(bl.minutos) || 0
    const pausa   = Number(bl.pausa)   || 0
    const largo   = Number(bl.largo)   || 0
    const ancho   = Number(bl.ancho)   || 0
    const ov      = bl.overrides || {}

    // Count players from either bl.jugadores or equipo1..4 arrays
    let jug = Number(bl.jugadores) || 0
    if (!jug) {
      for (let i = 1; i <= 4; i++) {
        const eq = bl[`equipo${i}`]
        if (Array.isArray(eq)) jug += eq.length
        else if (typeof eq === 'number') jug += eq
      }
    }

    t.minActivo += series * minutos
    t.minPausa  += series * pausa

    // Override manual GPS data takes priority over formula
    const hasOverrides = Object.keys(ov).some(k => ov[k] !== undefined && ov[k] !== '')

    if (hasOverrides) {
      // Use override values directly if present
      t.distTotal  += Number(ov.distTotal  ?? 0)
      t.distSprint += Number(ov.distSprint ?? 0)
      t.distMP     += Number(ov.distMP     ?? 0)
      t.distAcel   += Number(ov.distAcel   ?? 0)
      t.distDecel  += Number(ov.distDecel  ?? 0)
      t.nSprints   += Number(ov.nSprints   ?? 0)
      t.nAcel      += Number(ov.nAcel      ?? 0)
      t.nDecel     += Number(ov.nDecel     ?? 0)
    } else if (series && minutos && jug && largo && ancho) {
      // Calculate from formula
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
    const desde = searchParams.get('desde') || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
    const ciclo = searchParams.get('ciclo') || 'microciclo'
    const sql   = getDb()

    // 1. All planned sessions in range with their task blocks
    const sesiones = await sql`
      SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo
      FROM sesiones_plan
      WHERE admin_id = ${s.userId}
        AND fecha BETWEEN ${desde} AND ${hasta}
      ORDER BY fecha`

    // 2. All active players from this club
    const todosJugadores = s.clubId ? await sql`
      SELECT j.id AS jugador_id, u.nombre, j.posicion
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id = ${s.clubId} AND u.activo = true
      ORDER BY u.nombre` : []

    // 3. RPE logs from players in range
    const logs = s.clubId ? await sql`
      SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.fecha BETWEEN ${desde} AND ${hasta}
        AND u.activo = true AND u.club_id = ${s.clubId}
      ORDER BY el.fecha` : []

    // 4. Compute GPS totals per date from planned sessions
    //    Sum ALL sessions on same date
    const gpsPorFecha: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const m = sumarMetricasBloques(ses.ejercicios || [])
      if (!gpsPorFecha[ses.fecha]) {
        gpsPorFecha[ses.fecha] = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, minActivo:0, minPausa:0, rpe_objetivo:0 }
      }
      const g = gpsPorFecha[ses.fecha]
      g.distTotal  += m.distTotal;  g.distSprint += m.distSprint; g.distMP    += m.distMP
      g.distAcel   += m.distAcel;   g.distDecel  += m.distDecel
      g.nSprints   += m.nSprints;   g.nAcel      += m.nAcel;     g.nDecel    += m.nDecel
      g.minActivo  += m.minActivo;  g.minPausa   += m.minPausa
      if (Number(ses.rpe_objetivo) > 0) g.rpe_objetivo = Number(ses.rpe_objetivo)
    }

    // 5. Build player map — pre-populate ALL players
    const byPlayer: Record<number, any> = {}
    for (const p of todosJugadores as any[]) {
      byPlayer[p.jugador_id] = {
        jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion || '—',
        sesiones: 0, total_rpe: 0, total_ua: 0, minActivo: 0,
        distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0,
        diasConGps: 0,
      }
    }

    // 6. Build RPE index: jugador_id → [logs]
    const rpeByPlayer: Record<number, any[]> = {}
    for (const log of logs as any[]) {
      if (!rpeByPlayer[log.jugador_id]) rpeByPlayer[log.jugador_id] = []
      rpeByPlayer[log.jugador_id].push(log)
    }

    // 7. For each player, accumulate RPE and GPS
    //    GPS comes from planned sessions. RPE comes from their individual logs.
    //    A player gets GPS for a day if: they registered RPE that day AND there's a planned session
    //    OR if there's a planned session and no RPE logs at all (assign GPS anyway — player was there)
    const fechasConSesion = Object.keys(gpsPorFecha)
    const totalFechasConSesion = fechasConSesion.length

    for (const [jidStr, p] of Object.entries(byPlayer)) {
      const jid = Number(jidStr)
      const playerLogs = rpeByPlayer[jid] || []

      // Accumulate RPE
      for (const log of playerLogs) {
        p.sesiones   += 1
        p.total_rpe  += Number(log.rpe) || 0
        p.total_ua   += Number(log.carga_ua) || 0
        p.minActivo  += Number(log.duracion_min) || 0
      }

      // Accumulate GPS: assign session GPS to this player for each day with a planned session
      // If player has a RPE log that day → they were definitely there
      // If player has NO logs at all in range → still assign GPS (e.g. coach viewing planned load)
      const playerLogDates = new Set(playerLogs.map((l: any) => l.fecha))
      const nLogs = playerLogs.length

      for (const fecha of fechasConSesion) {
        const gps = gpsPorFecha[fecha]
        // Assign GPS if: player logged RPE that day, OR player has no logs at all
        if (playerLogDates.has(fecha) || nLogs === 0) {
          p.distTotal  += gps.distTotal
          p.distSprint += gps.distSprint
          p.distMP     += gps.distMP
          p.distAcel   += gps.distAcel
          p.distDecel  += gps.distDecel
          p.nSprints   += gps.nSprints
          p.nAcel      += gps.nAcel
          p.nDecel     += gps.nDecel
          p.diasConGps += 1
        }
      }
    }

    // 8. Shape output
    const players = Object.values(byPlayer).map((p: any) => ({
      jugador_id:  p.jugador_id,
      nombre:      p.nombre,
      posicion:    p.posicion,
      sesiones:    p.sesiones,
      rpe:         p.sesiones > 0 ? Math.round((p.total_rpe / p.sesiones) * 10) / 10 : null,
      ua:          p.sesiones > 0 ? Math.round(p.total_ua / p.sesiones) : null,
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
    })).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

    // 9. Real GPS data from imported Excel (gps_logs table)
    const gpsReal = s.clubId ? await sql`
      SELECT
        g.jugador_id,
        u.nombre,
        j.posicion,
        SUM(g.dist_total)::int      AS dist_total,
        SUM(g.dist_hir)::int        AS dist_hir,
        SUM(g.dist_v4)::int         AS dist_v4,
        SUM(g.dist_v5)::int         AS dist_v5,
        ROUND(SUM(g.player_load)::numeric, 1) AS player_load,
        MAX(g.max_velocity)::numeric(5,2)     AS max_velocity,
        SUM(g.acc2)::int            AS acc2,
        SUM(g.dec2)::int            AS dec2,
        SUM(g.acc3)::int            AS acc3,
        SUM(g.dec3)::int            AS dec3,
        ROUND(AVG(g.dist_per_min)::numeric, 1) AS dist_per_min,
        COUNT(g.id)::int            AS sesiones_gps
      FROM gps_logs g
      JOIN jugadores j ON j.id = g.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE g.club_id = ${s.clubId}
        AND g.fecha BETWEEN ${desde} AND ${hasta}
        AND u.activo = true
      GROUP BY g.jugador_id, u.nombre, j.posicion
      ORDER BY u.nombre
    ` : []

    const n = players.length || 1
    const avg = (field: string) => Math.round(players.reduce((s: number, p: any) => s + (p[field] || 0), 0) / n)
    const teamAvg = {
      rpe:        Math.round((players.reduce((s: number, p: any) => s + (p.rpe || 0), 0) / n) * 10) / 10,
      ua:         avg('ua'), ua_total: avg('ua_total'),
      distTotal:  avg('distTotal'), distSprint: avg('distSprint'), distMP:    avg('distMP'),
      distAcel:   avg('distAcel'),  distDecel:  avg('distDecel'),
      nSprints:   avg('nSprints'),  nAcel:      avg('nAcel'),     nDecel:    avg('nDecel'),
      sesiones:   avg('sesiones'),
    }

    const nGps = (gpsReal as any[]).length || 1
    const avgGps = (field: string) => Math.round((gpsReal as any[]).reduce((s: number, p: any) => s + (Number(p[field]) || 0), 0) / nGps)
    const teamAvgGps = {
      dist_total:   avgGps('dist_total'),
      dist_hir:     avgGps('dist_hir'),
      dist_v4:      avgGps('dist_v4'),
      dist_v5:      avgGps('dist_v5'),
      player_load:  Math.round((gpsReal as any[]).reduce((s: number, p: any) => s + (Number(p.player_load) || 0), 0) / nGps * 10) / 10,
      max_velocity: Math.round((gpsReal as any[]).reduce((s: number, p: any) => s + (Number(p.max_velocity) || 0), 0) / nGps * 100) / 100,
      acc2:         avgGps('acc2'),
      dec2:         avgGps('dec2'),
      acc3:         avgGps('acc3'),
      dec3:         avgGps('dec3'),
      dist_per_min: Math.round((gpsReal as any[]).reduce((s: number, p: any) => s + (Number(p.dist_per_min) || 0), 0) / nGps * 10) / 10,
      sesiones_gps: avgGps('sesiones_gps'),
    }

    return NextResponse.json({
      players, teamAvg,
      gpsReal, teamAvgGps,
      hasGpsData:    players.some((p: any) => p.hasGps),
      hasRealGps:    (gpsReal as any[]).length > 0,
      sesionesCount: sesiones.length,
      ciclo,
    })
  } catch (err) {
    console.error('[carga-gps GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
