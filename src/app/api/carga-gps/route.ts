export const dynamic = 'force-dynamic'
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
    // Normalize clubId to null — undefined breaks Neon template literals
    const clubId = s.clubId ?? null

    // 1. All planned sessions in range with their task blocks
    const sesiones = await sql`
      SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo
      FROM sesiones_plan
      WHERE admin_id = ${s.userId}
        AND fecha BETWEEN ${desde} AND ${hasta}
      ORDER BY fecha`

    // 2. All active players from this club
    const todosJugadores = clubId ? await sql`
      SELECT j.id AS jugador_id, u.nombre, j.posicion
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id = ${clubId} AND u.activo = true
      ORDER BY u.nombre` : []

    // 3. RPE logs from players in range
    const logs = clubId ? await sql`
      SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.fecha BETWEEN ${desde} AND ${hasta}
        AND u.activo = true AND u.club_id = ${clubId}
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

    // 9. Real GPS data from imported files (gps_logs table)
    // Pull raw rows + metricas JSON, aggregate in JS to support any variable set
    // Wrapped in try/catch: gps_logs table may not exist yet if migrations haven't run
    let gpsRawRows: any[] = []
    if (clubId) {
      try {
        gpsRawRows = await sql`
          SELECT
            g.jugador_id,
            u.nombre,
            j.posicion,
            g.dist_total, g.dist_hir, g.dist_v4, g.dist_v5,
            g.player_load, g.max_velocity,
            g.acc2, g.dec2, g.acc3, g.dec3, g.dist_per_min,
            g.metricas
          FROM gps_logs g
          JOIN jugadores j ON j.id = g.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE g.club_id = ${clubId}
            AND g.fecha BETWEEN ${desde} AND ${hasta}
            AND u.activo = true
          ORDER BY u.nombre
        ` as any[]
      } catch (gpsErr: any) {
        // Table doesn't exist yet — silently return empty (run /api/migrate to create it)
        console.warn('[carga-gps] gps_logs table not found, skipping real GPS data:', gpsErr?.message)
      }
    }

    // ── Per-session per-player GPS data ─────────────────────────────────────
    // Group gps_logs by (sesion_id OR fecha) x jugador_id for Cuadro 1 GPS
    let gpsPerSessionRaw: any[] = []
    if (clubId) {
      try {
        gpsPerSessionRaw = await sql`
          SELECT
            g.jugador_id, u.nombre, j.posicion,
            g.fecha::text, g.sesion_id,
            COALESCE(sp.titulo, g.fecha::text) AS md_label,
            g.dist_total, g.dist_hir, g.dist_v4, g.dist_v5,
            g.player_load, g.max_velocity,
            g.acc2, g.dec2, g.acc3, g.dec3, g.dist_per_min,
            g.metricas
          FROM gps_logs g
          JOIN jugadores j ON j.id = g.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          LEFT JOIN sesiones_plan sp ON sp.id = g.sesion_id
          WHERE g.club_id = ${clubId}
            AND g.fecha BETWEEN ${desde} AND ${hasta}
            AND u.activo = true
          ORDER BY g.fecha, u.nombre
        ` as any[]
      } catch { gpsPerSessionRaw = [] }
    }

    // Build gpsPerMD: { [md_label]: { [jugador_id]: { nombre, posicion, ...fields } } }
    const GPS_AVG_FIELDS = new Set(['dist_per_min','max_velocity'])
    const gpsPerMD: Record<string, Record<number, any>> = {}
    for (const row of gpsPerSessionRaw as any[]) {
      const md = row.md_label || row.fecha
      if (!gpsPerMD[md]) gpsPerMD[md] = {}
      const jid = row.jugador_id
      if (!gpsPerMD[md][jid]) {
        gpsPerMD[md][jid] = {
          jugador_id: jid, nombre: row.nombre, posicion: row.posicion,
          _sums:{}, _counts:{}, _maxes:{}, sesiones:0
        }
      }
      const p = gpsPerMD[md][jid]
      p.sesiones++
      const fixedRow: Record<string,any> = {
        dist_total: row.dist_total, dist_hir: row.dist_hir,
        dist_v4: row.dist_v4, dist_v5: row.dist_v5,
        player_load: row.player_load, max_velocity: row.max_velocity,
        acc2: row.acc2, dec2: row.dec2, acc3: row.acc3, dec3: row.dec3,
        dist_per_min: row.dist_per_min,
      }
      const met: Record<string,any> = (typeof row.metricas === 'object' && row.metricas) ? row.metricas : {}
      const allF = { ...fixedRow, ...met }
      for (const [k, v] of Object.entries(allF)) {
        if (v === null || v === undefined) continue
        const num = Number(v); if (isNaN(num)) continue
        if (k === 'max_velocity') { p._maxes[k] = Math.max(p._maxes[k]??0, num) }
        else { p._sums[k] = (p._sums[k]??0)+num; p._counts[k]=(p._counts[k]??0)+1 }
      }
    }
    // Shape: for each MD, array of players with their GPS values
    const gpsPerMDShaped: Record<string, any[]> = {}
    for (const [md, players_map] of Object.entries(gpsPerMD)) {
      gpsPerMDShaped[md] = Object.values(players_map).map((p:any) => {
        const result: Record<string,any> = {
          jugador_id:p.jugador_id, nombre:p.nombre, posicion:p.posicion, sesiones:p.sesiones
        }
        for (const [k,sum] of Object.entries(p._sums as Record<string,number>)) {
          result[k] = GPS_AVG_FIELDS.has(k)
            ? Math.round((sum/(p._counts[k]||1))*10)/10
            : Math.round(sum)
        }
        for (const [k,max] of Object.entries(p._maxes as Record<string,number>)) {
          result[k] = Math.round(max*100)/100
        }
        return result
      }).sort((a:any,b:any)=>a.nombre.localeCompare(b.nombre))
    }

    // Aggregate rows per player, merging fixed cols + metricas JSON
    const gpsPlayerMap: Record<number, any> = {}
    for (const row of gpsRawRows as any[]) {
      const jid = row.jugador_id
      if (!gpsPlayerMap[jid]) {
        gpsPlayerMap[jid] = { jugador_id: jid, nombre: row.nombre, posicion: row.posicion, sesiones_gps: 0, _sums: {}, _counts: {}, _maxes: {} }
      }
      const p = gpsPlayerMap[jid]
      p.sesiones_gps++

      // Merge fixed columns
      const fixedNum = (v: any) => (v !== null && v !== undefined) ? Number(v) : null
      const fixedRow: Record<string, number | null> = {
        dist_total: fixedNum(row.dist_total), dist_hir: fixedNum(row.dist_hir),
        dist_v4: fixedNum(row.dist_v4), dist_v5: fixedNum(row.dist_v5),
        player_load: fixedNum(row.player_load), max_velocity: fixedNum(row.max_velocity),
        acc2: fixedNum(row.acc2), dec2: fixedNum(row.dec2),
        acc3: fixedNum(row.acc3), dec3: fixedNum(row.dec3),
        dist_per_min: fixedNum(row.dist_per_min),
      }

      // Merge JSON metricas (newer imports) — these take priority / supplement fixed cols
      const met: Record<string, number> = (typeof row.metricas === 'object' && row.metricas) ? row.metricas : {}
      const allFields = { ...fixedRow, ...met }

      // Max-velocity fields use MAX aggregation; everything else is SUM
      const MAX_FIELDS = new Set(['max_velocity'])

      for (const [k, v] of Object.entries(allFields)) {
        if (v === null || v === undefined) continue
        const num = Number(v)
        if (isNaN(num)) continue
        if (MAX_FIELDS.has(k)) {
          p._maxes[k] = Math.max(p._maxes[k] ?? 0, num)
        } else {
          p._sums[k] = (p._sums[k] ?? 0) + num
          p._counts[k] = (p._counts[k] ?? 0) + 1
        }
      }
    }

    // Shape final gpsReal array
    const gpsReal = Object.values(gpsPlayerMap).map((p: any) => {
      const result: Record<string, any> = {
        jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, sesiones_gps: p.sesiones_gps
      }
      // AVG fields (dist_per_min, hr_avg, etc.) vs SUM fields
      const AVG_FIELDS = new Set(['dist_per_min', 'hr_avg', 'hr_max', 'max_velocity', 'avg_metabolic_power'])
      for (const [k, sum] of Object.entries(p._sums as Record<string,number>)) {
        result[k] = AVG_FIELDS.has(k)
          ? Math.round((sum / (p._counts[k] || 1)) * 10) / 10
          : Math.round(sum)
      }
      for (const [k, max] of Object.entries(p._maxes as Record<string,number>)) {
        result[k] = Math.round(max * 100) / 100
      }
      return result
    }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

    // Detect all metric columns present across all players (for dynamic table)
    const allMetricCols = Array.from(
      new Set((gpsReal as any[]).flatMap(p => Object.keys(p).filter(k => !['jugador_id','nombre','posicion','sesiones_gps'].includes(k))))
    )

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

    // Build sesionesInfo: deduplicated by MD label, sorted MD+1→MD+3→MD-4→MD-3→MD-2→MD-1→MD
    const MD_ORDER = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']

    // Build perSession: accumulate metrics per MD label (sum if multiple sessions share same label)
    const perSession: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const label = ses.titulo || ses.fecha
      const m = sumarMetricasBloques(ses.ejercicios || [])
      if (!perSession[label]) {
        perSession[label] = { fecha: ses.fecha, rpe_objetivo: ses.rpe_objetivo, ...m }
      } else {
        // Accumulate: sum numeric values for duplicate MD labels
        for (const k of Object.keys(m)) {
          perSession[label][k] = (perSession[label][k] || 0) + (m[k] || 0)
        }
      }
    }

    // Deduplicate sesionesInfo by MD label (keep first occurrence per label)
    const seenTitulos = new Set<string>()
    const sesionesInfo = (sesiones as any[])
      .map(s => ({ id: s.id, fecha: s.fecha, titulo: s.titulo || s.fecha, rpe_objetivo: s.rpe_objetivo }))
      .filter(s => {
        if (seenTitulos.has(s.titulo)) return false
        seenTitulos.add(s.titulo)
        return true
      })
      .sort((a, b) => {
        const ai = MD_ORDER.indexOf(a.titulo)
        const bi = MD_ORDER.indexOf(b.titulo)
        // Known MD labels → sort by MD_ORDER
        if (ai !== -1 && bi !== -1) return ai - bi
        // Known before unknown
        if (ai !== -1) return -1
        if (bi !== -1) return 1
        // Unknown → sort by date
        return a.fecha.localeCompare(b.fecha)
      })

    return NextResponse.json({
      players, teamAvg,
      gpsReal, teamAvgGps,
      allMetricCols,
      sesionesInfo,
      perSession,
      gpsPerMD: gpsPerMDShaped,
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
