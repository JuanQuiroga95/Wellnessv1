export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function sumarMetricasBloques(ejercicios: any[]): Record<string, number> {
  const t = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, minActivo:0, minPausa:0 }
  if (!Array.isArray(ejercicios)) return t
  for (const bl of ejercicios) {
    const series  = Number(bl.series)  || 0
    const minutos = Number(bl.minutos) || 0
    const pausa   = Number(bl.pausa)   || 0
    const largo   = Number(bl.largo)   || 0
    const ancho   = Number(bl.ancho)   || 0
    const ov      = bl.overrides || {}

    // Count players: atacantes+defensores+comodines → equipos object → equipo1..4 → jugadores field
    const autoTotal = (Number(bl.atacantes)||0) + (Number(bl.defensores)||0) + (Number(bl.comodines)||0)
    let jug = autoTotal > 0 ? autoTotal : (Number(bl.jugadores) || 0)
    if (!jug && bl.equipos && typeof bl.equipos === 'object') {
      // Stored as { "1": [id,id], "2": [id], ... }
      for (const arr of Object.values(bl.equipos as Record<string,any>)) {
        if (Array.isArray(arr)) jug += arr.length
        else if (typeof arr === 'number') jug += arr
      }
    }
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
      t.nAcel3     += Number(ov.nAcel3     ?? 0)
      t.nDecel3    += Number(ov.nDecel3    ?? 0)
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
      // ACE>3 and DEC>3: ~22% of B2-3 (Casamichana 2013)
      t.nAcel3     += Math.max(0, (0.212  * Math.log(densidad) - 0.23)   * tiempoAct * 0.22)
      t.nDecel3    += Math.max(0, (0.1041 * Math.log(densidad) - 0.096)  * tiempoAct * 0.22)
    }
  }
  return Object.fromEntries(Object.entries(t).map(([k,v]) => [k, Math.round(v as number)]))
}

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
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || localDaysAgo(7)
    const hasta = searchParams.get('hasta') || localToday()
    const ciclo = searchParams.get('ciclo') || 'microciclo'
    // hastaInc: suma 1 día para que el BETWEEN sea verdaderamente inclusivo.
    // El driver de Neon puede tratar el string como TIMESTAMP '...00:00:00',
    // excluyendo registros creados durante el día. Con +1 día y < hastaInc
    // todos los registros del día "hasta" quedan incluidos.
    const hastaInc = (() => {
      const d = new Date(hasta + 'T12:00:00Z')
      d.setUTCDate(d.getUTCDate() + 1)
      return d.toISOString().split('T')[0]
    })()
    const sql   = getDb()
    // Normalize clubId to null — undefined breaks Neon template literals
    const clubId = s.clubId ? Number(s.clubId) : null

    // Auto-reparar jugadores sin club_id asignado (legacy data)
    if (clubId) {
      try {
        await sql`
          UPDATE jugadores j SET club_id = ${clubId}
          FROM usuarios u WHERE u.id = j.usuario_id AND u.club_id = ${clubId} AND j.club_id IS NULL`
        await sql`
          UPDATE usuarios u SET club_id = ${clubId}
          FROM jugadores j WHERE j.usuario_id = u.id AND j.club_id = ${clubId} AND u.club_id IS NULL`
      } catch {}
    }

    // 1. All planned sessions in range with their task blocks
    const sesiones = clubId ? await sql`
      SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo
      FROM sesiones_plan
      WHERE club_id = ${clubId}
        AND fecha >= ${desde}::date AND fecha < ${hastaInc}::date
      ORDER BY fecha`
    : await sql`
      SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo
      FROM sesiones_plan
      WHERE admin_id = ${s.userId}
        AND club_id IS NULL
        AND fecha >= ${desde}::date AND fecha < ${hastaInc}::date
      ORDER BY fecha`

    // 2. All active players from this club
    // Check both u.club_id and j.club_id to handle legacy data where one may be NULL
    const todosJugadores = clubId ? await sql`
      SELECT j.id AS jugador_id, u.nombre, j.posicion
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true
      ORDER BY u.nombre` : []

    // 3. RPE logs from players in range
    // Join via jugadores.club_id (más robusto que u.club_id para datos legacy)
    const logs = clubId ? await sql`
      SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int
      FROM entrenamiento_logs el
      JOIN jugadores j ON j.id = el.jugador_id
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE el.fecha >= ${desde}::date AND el.fecha < ${hastaInc}::date
        AND u.activo = true
        AND (u.club_id = ${clubId} OR j.club_id = ${clubId})
      ORDER BY el.fecha` : []

    // 4. Compute GPS totals per date from planned sessions
    //    Sum ALL sessions on same date
    const gpsPorFecha: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const m = sumarMetricasBloques(ses.ejercicios || [])
      if (!gpsPorFecha[ses.fecha]) {
        gpsPorFecha[ses.fecha] = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, minActivo:0, minPausa:0, rpe_objetivo:0, tipo_sesion:'entrenamiento' }
      }
      const g = gpsPorFecha[ses.fecha]
      g.distTotal  += m.distTotal;  g.distSprint += m.distSprint; g.distMP    += m.distMP
      g.distAcel   += m.distAcel;   g.distDecel  += m.distDecel
      g.nSprints   += m.nSprints;   g.nAcel      += m.nAcel;     g.nDecel    += m.nDecel
      g.nAcel3     += m.nAcel3||0;  g.nDecel3    += m.nDecel3||0
      g.minActivo  += m.minActivo;  g.minPausa   += m.minPausa
      if (Number(ses.rpe_objetivo) > 0) g.rpe_objetivo = Number(ses.rpe_objetivo)
      // Track session type: if any session that day is a partido, mark the day as partido
      if (ses.tipo === 'partido') g.tipo_sesion = 'partido'
    }

    // 5. Build player map — pre-populate ALL players
    const byPlayer: Record<number, any> = {}
    for (const p of todosJugadores as any[]) {
      byPlayer[p.jugador_id] = {
        jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion || '—',
        sesiones: 0, total_rpe: 0, total_ua: 0, minActivo: 0,
        distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0,
        diasConGps: 0,
      }
    }

    // 6. Build RPE index: jugador_id → [logs]
    const rpeByPlayer: Record<number, any[]> = {}
    for (const log of logs as any[]) {
      if (!rpeByPlayer[log.jugador_id]) rpeByPlayer[log.jugador_id] = []
      rpeByPlayer[log.jugador_id].push(log)
    }

    // 7. For each player, accumulate RPE and GPS.
    //    A player receives GPS for a given day only if they logged RPE that day
    //    AND there is a planned session for that date. Players with no attendance
    //    (no RPE log) correctly receive zero GPS for sessions they missed.
    const fechasConSesion = Object.keys(gpsPorFecha)

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

      for (const fecha of fechasConSesion) {
        const gps = gpsPorFecha[fecha]

        // Fix 1: Only assign GPS if the player actually logged RPE that day.
        // Previously "nLogs === 0" caused players with zero attendance to receive
        // full session GPS, inflating their numbers incorrectly.
        if (!playerLogDates.has(fecha)) continue

        const playerLog = playerLogs.find((l: any) => l.fecha === fecha)
        const playerMinutes = playerLog?.duracion_min ? Number(playerLog.duracion_min) : null

        // Fix 2: plannedMinutes comes from sumarMetricasBloques (series × minutos).
        // When sessions use only GPS overrides (no task blocks with duration),
        // minActivo is 0 and scaling must be skipped — scale = 1 is correct but
        // we make this explicit and log it so the coach isn't confused.
        const plannedMinutes = gps.minActivo

        let scale: number
        if (playerMinutes !== null && plannedMinutes > 0) {
          // Fix 3: Use a higher cap for partido sessions to handle extra time.
          // Entrenamientos cap at 1.5x; partidos allow up to 2.0x (extra time + penalties).
          const sessionType = gps.tipo_sesion || 'entrenamiento'
          const cap = sessionType === 'partido' ? 2.0 : 1.5
          scale = Math.min(playerMinutes / plannedMinutes, cap)
        } else {
          // plannedMinutes is 0 (override-only session) or player has no duration logged.
          // In both cases assign full session GPS without scaling.
          scale = 1
        }

        p.distTotal  += Math.round(gps.distTotal  * scale)
        p.distSprint += Math.round(gps.distSprint * scale)
        p.distMP     += Math.round(gps.distMP     * scale)
        p.distAcel   += Math.round(gps.distAcel   * scale)
        p.distDecel  += Math.round(gps.distDecel  * scale)
        p.nSprints   += Math.round(gps.nSprints   * scale)
        p.nAcel      += Math.round(gps.nAcel      * scale)
        p.nDecel     += Math.round(gps.nDecel     * scale)
        p.nAcel3     += Math.round((gps.nAcel3||0) * scale)
        p.nDecel3    += Math.round((gps.nDecel3||0) * scale)
        p.diasConGps += 1
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
      nAcel3:      Math.round(p.nAcel3||0),
      nDecel3:     Math.round(p.nDecel3||0),
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
            g.n_sprints, g.duracion_min,
            g.metricas
          FROM gps_logs g
          JOIN jugadores j ON j.id = g.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE (g.club_id = ${clubId} OR j.club_id = ${clubId})
            AND g.fecha >= ${desde}::date AND g.fecha < ${hastaInc}::date
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
            g.n_sprints, g.duracion_min,
            g.metricas
          FROM gps_logs g
          JOIN jugadores j ON j.id = g.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          LEFT JOIN sesiones_plan sp ON sp.id = g.sesion_id
          WHERE (g.club_id = ${clubId} OR j.club_id = ${clubId})
            AND g.fecha >= ${desde}::date AND g.fecha < ${hastaInc}::date
            AND u.activo = true
          ORDER BY g.fecha, u.nombre
        ` as any[]
      } catch { gpsPerSessionRaw = [] }
    }

    // Build gpsPerMD: { [md_label]: { [jugador_id]: { nombre, posicion, ...fields } } }
    const GPS_AVG_FIELDS = new Set(['dist_per_min','max_velocity','hr_avg','hr_max','avg_metabolic_power','duracion_min'])
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
        n_sprints: row.n_sprints, duracion_min: row.duracion_min,
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
        n_sprints: fixedNum(row.n_sprints), duracion_min: fixedNum(row.duracion_min),
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
      const AVG_FIELDS = new Set(['dist_per_min', 'hr_avg', 'hr_max', 'max_velocity', 'avg_metabolic_power', 'duracion_min'])
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
      nAcel3:     avg('nAcel3'),    nDecel3:    avg('nDecel3'),
      sesiones:   avg('sesiones'),
    }

    const nGps = (gpsReal as any[]).length || 1
    // avgGpsNonZero: only averages players who actually have a non-zero value for the field
    const avgGps = (field: string) => {
      const nonZero = (gpsReal as any[]).filter(p => Number(p[field]) > 0)
      if (!nonZero.length) return 0
      return Math.round(nonZero.reduce((s: number, p: any) => s + Number(p[field]), 0) / nonZero.length)
    }
    const avgGpsDecimal = (field: string, decimals: number) => {
      const nonZero = (gpsReal as any[]).filter(p => Number(p[field]) > 0)
      if (!nonZero.length) return 0
      const factor = Math.pow(10, decimals)
      return Math.round(nonZero.reduce((s: number, p: any) => s + Number(p[field]), 0) / nonZero.length * factor) / factor
    }
    const teamAvgGps = {
      dist_total:   avgGps('dist_total'),
      dist_hir:     avgGps('dist_hir'),
      dist_v4:      avgGps('dist_v4'),
      dist_v5:      avgGps('dist_v5'),
      player_load:  avgGpsDecimal('player_load', 1),
      // max_velocity: average of non-zero individual maxes (excludes players without sensor data)
      max_velocity: avgGpsDecimal('max_velocity', 2),
      acc2:         avgGps('acc2'),
      dec2:         avgGps('dec2'),
      acc3:         avgGps('acc3'),
      dec3:         avgGps('dec3'),
      dist_per_min: avgGpsDecimal('dist_per_min', 1),
      sesiones_gps: avgGps('sesiones_gps'),
    }

    // Build sesionesInfo: deduplicated by MD label, sorted MD+1→MD+3→MD-4→MD-3→MD-2→MD-1→MD
    const MD_ORDER = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']

    // Build perSession: one entry per MD label (last session per label wins for distTotal etc.)
    // This avoids distTotal doubling when a date has 2 sesiones_plan entries sharing the same titulo.
    const perSession: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const label = ses.titulo || ses.fecha
      const m = sumarMetricasBloques(ses.ejercicios || [])
      perSession[label] = { fecha: ses.fecha, rpe_objetivo: ses.rpe_objetivo, ...m }
    }

    // Compute CE (NE-based) per session — sum(min_bloque × ne_bloque)
    const NE_DEFAULT_SRV: Record<string,number> = {
      'Partido oficial':10,'Partido amistoso':9,'Partido de entrenamiento':8,
      'Partido modificado':7,'Partido reducido':7,'Juego de posición':6,
      'Juego de posesión':6,'Transiciones':5,'Rondo':5,'Trabajo analítico':4,
      'Gimnasio':3,'Activación en campo':2,'Activación en gimnasio':2,
    }
    const cePerSession: Record<string, { ce_total: number; bloques: any[]; rpe_objetivo: number }> = {}
    for (const ses of sesiones as any[]) {
      const label = ses.titulo || ses.fecha
      let ceTotal = 0
      const bloques: any[] = []
      for (const bl of (ses.ejercicios || [])) {
        const minTotal = (Number(bl.series)||1) * (Number(bl.minutos)||0)
        if (!minTotal) continue  // skip blocks with no duration
        const ne = Number(bl.ne) > 0 ? Number(bl.ne) : (NE_DEFAULT_SRV[bl.ventana] ?? 5)
        const ce = Math.round(minTotal * ne)
        ceTotal += ce
        bloques.push({ ventana: bl.ventana || bl.nombre || 'Tarea', minTotal, ne, ce })
      }
      if (!cePerSession[label]) {
        cePerSession[label] = { ce_total: ceTotal, bloques, rpe_objetivo: Number(ses.rpe_objetivo)||0 }
      } else {
        cePerSession[label].ce_total += ceTotal
        cePerSession[label].bloques.push(...bloques)
        if (!cePerSession[label].rpe_objetivo && ses.rpe_objetivo)
          cePerSession[label].rpe_objetivo = Number(ses.rpe_objetivo)
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

    // Build perSessionPlayers: for each MD label → array of players with their
    // specific RPE/duration/UA for that single session date (not aggregated over range).
    // This fixes the "RPE 4.5 instead of 3" bug: Cuadro 1 must show per-session data.
    //
    // Logic:
    //   - Find the session's fecha from sesionesInfo (by MD label)
    //   - For each player, find their entrenamiento_log on that exact fecha
    //   - Show that log's rpe + duracion_min (or null if they didn't log that day)
    const rpeByPlayerDate: Record<string, any> = {}  // key = `${jugador_id}_${fecha}`
    for (const log of logs as any[]) {
      rpeByPlayerDate[`${log.jugador_id}_${log.fecha}`] = log
    }

    const perSessionPlayers: Record<string, any[]> = {}
    for (const ses of sesionesInfo) {
      const md = ses.titulo
      const fecha = ses.fecha
      perSessionPlayers[md] = (todosJugadores as any[]).map((p: any) => {
        const log = rpeByPlayerDate[`${p.jugador_id}_${fecha}`]
        const rpe = log ? (Number(log.rpe) || null) : null
        const duracion = log ? (Number(log.duracion_min) || null) : null
        const ua = log ? (Number(log.carga_ua) || null) : null
        return {
          jugador_id: p.jugador_id,
          nombre: p.nombre,
          posicion: p.posicion || '—',
          rpe,
          minActivo: duracion,
          ua_total: ua,
        }
      }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
    }

    // Team avg per session (only players who logged that day)
    const perSessionTeamAvg: Record<string, any> = {}
    for (const [md, plist] of Object.entries(perSessionPlayers)) {
      const active = (plist as any[]).filter((p: any) => p.rpe !== null)
      const n = active.length || 1
      perSessionTeamAvg[md] = {
        rpe:       active.length ? Math.round(active.reduce((s: number, p: any) => s + p.rpe, 0) / n * 10) / 10 : null,
        minActivo: active.length ? Math.round(active.reduce((s: number, p: any) => s + (p.minActivo || 0), 0) / n) : null,
        ua_total:  active.length ? Math.round(active.reduce((s: number, p: any) => s + (p.ua_total || 0), 0) / n) : null,
        count:     active.length,
      }
    }

    return NextResponse.json({
      players, teamAvg,
      gpsReal, teamAvgGps,
      allMetricCols,
      sesionesInfo,
      perSession,
      perSessionPlayers,
      perSessionTeamAvg,
      cePerSession,
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
