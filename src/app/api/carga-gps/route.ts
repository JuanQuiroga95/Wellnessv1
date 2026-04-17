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

    const autoTotal = (Number(bl.atacantes)||0) + (Number(bl.defensores)||0) + (Number(bl.comodines)||0)
    
    // FIX JUGADORES: Detección flexible del "20"
    let jug = autoTotal > 0 ? autoTotal : (Number(bl.jugadores) || Number(bl.num_jugadores) || 0)
    
    if (!jug && bl.equipos && typeof bl.equipos === 'object') {
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

    const hasOverrides = Object.keys(ov).some(k => ov[k] !== undefined && ov[k] !== '')

    if (hasOverrides) {
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
      const densidad   = (largo * ancho) / jug
      const tiempoAct  = series * minutos
      t.distTotal  += Math.max(0, (19.243 * Math.log(densidad) - 5.029)  * tiempoAct)
      t.distMP     += Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoAct)
      t.distAcel   += Math.max(0, (1.321  * Math.log(densidad) - 0.629)  * tiempoAct)
      t.distDecel  += Math.max(0, (1.157  * Math.log(densidad) - 0.418)  * tiempoAct)
      t.nAcel      += Math.max(0, (0.212  * Math.log(densidad) - 0.23)   * tiempoAct)
      t.nDecel     += Math.max(0, (0.1041 * Math.log(densidad) - 0.096)  * tiempoAct)
      t.nAcel3     += Math.max(0, (0.212  * Math.log(densidad) - 0.23)   * tiempoAct * 0.22)
      t.nDecel3    += Math.max(0, (0.1041 * Math.log(densidad) - 0.096)  * tiempoAct * 0.22)
      // distSprint y nSprints: intercepto ajustado para producir valores realistas
      // en tareas de alta densidad (partidos reducidos, rondos).
      // La fórmula original (0.018d-0.844) da 0 para densidades <47m²/jug.
      // Usamos intercepto reducido (−0.1 / −0.005) que es proporcional al espacio
      // y produce valores razonables desde rondos hasta partidos oficiales.
      t.distSprint += Math.max(0, (0.018 * densidad - 0.1)  * tiempoAct)
      const rawNSprints = Math.max(0, (0.001 * densidad - 0.005) * tiempoAct)
      t.nSprints += rawNSprints > 0 ? Math.max(1, rawNSprints) : 0
    }
  }
  // nSprints ya viene con mínimo 1 por bloque — solo redondear el resto
  const nSprintsRounded = Math.round(t.nSprints)
  return {
    ...Object.fromEntries(Object.entries(t).filter(([k]) => k !== 'nSprints').map(([k,v]) => [k, Math.round(v as number)])),
    nSprints: nSprintsRounded,
  }
}

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

    // FIX FECHA: Incluir todo el día seleccionado
    const hastaInc = hasta + ' 23:59:59.999'

    const sql   = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (clubId) {
      try {
        await sql`UPDATE jugadores j SET club_id = ${clubId} FROM usuarios u WHERE u.id = j.usuario_id AND u.club_id = ${clubId} AND j.club_id IS NULL`
        await sql`UPDATE usuarios u SET club_id = ${clubId} FROM jugadores j WHERE j.usuario_id = u.id AND j.club_id = ${clubId} AND u.club_id IS NULL`
      } catch {}
    }

    const sesiones = clubId ? await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo, tipo FROM sesiones_plan WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`
    : await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo, tipo FROM sesiones_plan WHERE admin_id = ${s.userId} AND club_id IS NULL AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`

    const todosJugadores = clubId ? await sql`SELECT j.id AS jugador_id, u.nombre, j.posicion FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true ORDER BY u.nombre` : []

    const logs = clubId ? await sql`SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int FROM entrenamiento_logs el JOIN jugadores j ON j.id = el.jugador_id JOIN usuarios u ON u.id = j.usuario_id WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp AND u.activo = true AND (u.club_id = ${clubId} OR j.club_id = ${clubId}) ORDER BY el.fecha` : []

    const gpsPorFecha: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      // FIX: El partido (MD) nunca se cuenta como entrenamiento semanal
      if (ses.tipo === 'partido') continue
      const m = sumarMetricasBloques(ses.ejercicios || [])
      if (!gpsPorFecha[ses.fecha]) {
        gpsPorFecha[ses.fecha] = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, minActivo:0, minPausa:0, rpe_objetivo:0, tipo_sesion:'entrenamiento' }
      }
      const g = gpsPorFecha[ses.fecha]
      g.distTotal += m.distTotal; g.distSprint += m.distSprint; g.distMP += m.distMP; g.distAcel += m.distAcel; g.distDecel += m.distDecel
      g.nSprints += m.nSprints; g.nAcel += m.nAcel; g.nDecel += m.nDecel; g.nAcel3 += m.nAcel3||0; g.nDecel3 += m.nDecel3||0
      g.minActivo += m.minActivo; g.minPausa += m.minPausa
      if (Number(ses.rpe_objetivo) > 0) g.rpe_objetivo = Number(ses.rpe_objetivo)
    }

    const byPlayer: Record<number, any> = {}
    for (const p of todosJugadores as any[]) {
      byPlayer[p.jugador_id] = { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion || '—', sesiones: 0, total_rpe: 0, total_ua: 0, minActivo: 0, distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, diasConGps: 0 }
    }

    const rpeByPlayer: Record<number, any[]> = {}
    for (const log of logs as any[]) {
      if (!rpeByPlayer[log.jugador_id]) rpeByPlayer[log.jugador_id] = []
      rpeByPlayer[log.jugador_id].push(log)
    }

    const fechasConSesion = Object.keys(gpsPorFecha)
    for (const [jidStr, p] of Object.entries(byPlayer)) {
      const jid = Number(jidStr)
      const playerLogs = rpeByPlayer[jid] || []
      for (const log of playerLogs) {
        p.sesiones += 1; p.total_rpe += Number(log.rpe) || 0; p.total_ua += Number(log.carga_ua) || 0; p.minActivo += Number(log.duracion_min) || 0
      }
      const playerLogDates = new Set(playerLogs.map((l: any) => l.fecha))
      for (const fecha of fechasConSesion) {
        const gps = gpsPorFecha[fecha]
        // FIX: No saltear jugadores sin log. Si no tienen log, scale=1 (sesión completa planificada).
        const playerLog = playerLogs.find((l: any) => l.fecha === fecha)
        const playerMinutes = playerLog?.duracion_min ? Number(playerLog.duracion_min) : null
        const plannedMinutes = gps.minActivo
        // Si el jugador tiene log con duración diferente, escalar proporcionalmente.
        // Si no tiene log, scale=1 (valor completo de la sesión planificada).
        let scale = (playerMinutes !== null && plannedMinutes > 0) ? Math.min(playerMinutes / plannedMinutes, (gps.tipo_sesion === 'partido' ? 2.0 : 1.5)) : 1
        p.distTotal += Math.round(gps.distTotal * scale); p.distSprint += Math.round(gps.distSprint * scale); p.distMP += Math.round(gps.distMP * scale)
        p.distAcel += Math.round(gps.distAcel * scale); p.distDecel += Math.round(gps.distDecel * scale); p.nSprints += Math.round(gps.nSprints * scale)
        p.nAcel += Math.round(gps.nAcel * scale); p.nDecel += Math.round(gps.nDecel * scale); p.nAcel3 += Math.round((gps.nAcel3||0) * scale); p.nDecel3 += Math.round((gps.nDecel3||0) * scale)
        // FIX: Si el jugador no tiene log, sumar minutos planificados para que "Tiempo" no quede en —
        if (!playerLogDates.has(fecha)) p.minActivo += plannedMinutes
        p.diasConGps += 1
      }
    }

    const players = Object.values(byPlayer).map((p: any) => ({
      jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, sesiones: p.sesiones,
      rpe: p.sesiones > 0 ? Math.round((p.total_rpe / p.sesiones) * 10) / 10 : null,
      ua: p.sesiones > 0 ? Math.round(p.total_ua / p.sesiones) : null,
      ua_total: Math.round(p.total_ua), minActivo: p.minActivo, distTotal: Math.round(p.distTotal),
      distSprint: Math.round(p.distSprint), distMP: Math.round(p.distMP), distAcel: Math.round(p.distAcel),
      distDecel: Math.round(p.distDecel), nSprints: Math.round(p.nSprints), nAcel: Math.round(p.nAcel),
      nDecel: Math.round(p.nDecel), nAcel3: Math.round(p.nAcel3||0), nDecel3: Math.round(p.nDecel3||0), hasGps: p.distTotal > 0
    })).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

    // teamAvg: RPE/UA solo de jugadores con sesiones logueadas; GPS sobre todos los que tienen datos calculados
    const activePlayers = players.filter((p: any) => p.sesiones > 0)
    const playersWithGps = players.filter((p: any) => p.hasGps)
    const n = activePlayers.length || 1
    const nGps = playersWithGps.length || 1
    const avg = (field: string) => Math.round(activePlayers.reduce((s: number, p: any) => s + (p[field] || 0), 0) / n)
    const avgGps = (field: string) => Math.round(playersWithGps.reduce((s: number, p: any) => s + (p[field] || 0), 0) / nGps)
    const teamAvg = {
      rpe: Math.round((activePlayers.reduce((s: number, p: any) => s + (p.rpe || 0), 0) / n) * 10) / 10,
      ua: avg('ua'), ua_total: avg('ua_total'), distTotal: avgGps('distTotal'), distSprint: avgGps('distSprint'),
      distMP: avgGps('distMP'), distAcel: avgGps('distAcel'), distDecel: avgGps('distDecel'),
      nSprints: avgGps('nSprints'), nAcel: avgGps('nAcel'), nDecel: avgGps('nDecel'), nAcel3: avgGps('nAcel3'), nDecel3: avgGps('nDecel3'), sesiones: avg('sesiones')
    }

    const perSession: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      // FIX: Los partidos no se incluyen en los cálculos de carga de entrenamiento
      if (ses.tipo === 'partido') continue
      const label = ses.titulo || ses.fecha
      const m = sumarMetricasBloques(ses.ejercicios || [])
      const ua_total = Number(ses.rpe_objetivo) > 0 ? Math.round(Number(ses.rpe_objetivo) * m.minActivo) : 0
      if (perSession[label]) {
        // Acumular si hay múltiples sesiones con el mismo título (MD label)
        const p = perSession[label]
        const numKeys = ['distTotal','distSprint','distMP','distAcel','distDecel','nSprints','nAcel','nDecel','nAcel3','nDecel3','minActivo','minPausa']
        for (const k of numKeys) p[k] = (p[k] || 0) + (m[k] || 0)
        p.ua_total = (p.ua_total || 0) + ua_total
      } else {
        perSession[label] = { fecha: ses.fecha, rpe_objetivo: ses.rpe_objetivo, ...m, ua_total }
      }
    }

    // ── cePerSession: CE (Carga Específica) y UCE por sesión ──
    // CE = Min × NE (Nivel Especificidad). UCE = CE × RPE_objetivo.
    // NE defaults match the frontend CoachClient NE_DEFAULT map.
    const NE_DEFAULT: Record<string, number> = {
      'Partido oficial': 10, 'Partido amistoso': 9, 'Partido de entrenamiento': 8,
      'Partido modificado': 7, 'Partido reducido': 7, 'Juego de posición': 6,
      'Juego de posesión': 6, 'Transiciones': 5, 'Rondo': 5, 'Trabajo analítico': 4,
      'Gimnasio': 3, 'Activación en campo': 2, 'Activación en gimnasio': 2,
    }
    const cePerSession: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const label = ses.tipo === 'partido' ? (ses.titulo || 'MD') : (ses.titulo || ses.fecha)
      const ejercicios: any[] = Array.isArray(ses.ejercicios) ? ses.ejercicios : []
      // Group bloques by ventana (task type), summing minutos per group
      const ventanaMap: Record<string, { minTotal: number; ne: number }> = {}
      for (const bl of ejercicios) {
        const series  = Number(bl.series)  || 1
        const minutos = Number(bl.minutos) || 0
        if (!minutos) continue
        const ventana = bl.ventana || bl.tipo || 'Tarea'
        const ne = bl.ne ?? NE_DEFAULT[ventana] ?? 5
        if (!ventanaMap[ventana]) ventanaMap[ventana] = { minTotal: 0, ne }
        ventanaMap[ventana].minTotal += series * minutos
        ventanaMap[ventana].ne = ne  // use last ne seen for this ventana
      }
      let bloques = Object.entries(ventanaMap).map(([ventana, v]) => ({
        ventana,
        minTotal: Math.round(v.minTotal),
        ne: v.ne,
        ce: Math.round(v.minTotal * v.ne),
      }))
      // PARTIDO fallback: if no bloques, use avg player minutes from logs with NE=10
      if (ses.tipo === 'partido' && bloques.length === 0) {
        const logsDelDia = (logs as any[]).filter((l: any) => l.fecha === ses.fecha)
        const minutos = logsDelDia.length > 0
          ? Math.round(logsDelDia.reduce((s: number, l: any) => s + (Number(l.duracion_min) || 0), 0) / logsDelDia.length)
          : 90 // default 90 min if no logs
        if (minutos > 0) {
          const ne = 10
          bloques = [{ ventana: 'Partido oficial', minTotal: minutos, ne, ce: Math.round(minutos * ne) }]
        }
      }
      const ce_total = bloques.reduce((s, b) => s + b.ce, 0)
      const rpe_obj = Number(ses.rpe_objetivo) || 0
      cePerSession[label] = {
        fecha: ses.fecha,
        rpe_objetivo: rpe_obj,
        ce_total,
        uce_total: rpe_obj > 0 ? Math.round(ce_total * rpe_obj) : 0,
        bloques,
      }
    }

    // Cuadro 1 RPE por sesión (Fix Damián)
    const rpeByPlayerDate: Record<string, any> = {}
    for (const log of logs as any[]) { rpeByPlayerDate[`${log.jugador_id}_${log.fecha}`] = log }
    
    // sesionesInfo: includes ALL sessions (entrenamiento + partido) so the frontend
    // can show the MD column. Partidos with no titulo default to 'MD'.
    const sesionesInfo = (sesiones as any[])
      .map(s => {
        const defaultTitulo = s.tipo === 'partido' ? 'MD' : s.fecha
        return { id: s.id, fecha: s.fecha, titulo: s.titulo || defaultTitulo, rpe_objetivo: s.rpe_objetivo, tipo: s.tipo || 'entrenamiento' }
      })
    const perSessionPlayers: Record<string, any[]> = {}
    for (const ses of sesionesInfo) {
      perSessionPlayers[ses.titulo] = (todosJugadores as any[]).map((p: any) => {
        const log = rpeByPlayerDate[`${p.jugador_id}_${ses.fecha}`]
        return { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, rpe: log ? Number(log.rpe) : null, minActivo: log ? Number(log.duracion_min) : null, ua_total: log ? Number(log.carga_ua) : null }
      })
    }

    // Team averages per session (for Cuadro 1 PROM row)
    const perSessionTeamAvg: Record<string, any> = {}
    for (const ses of sesionesInfo) {
      const ps = perSessionPlayers[ses.titulo] || []
      const withRpe = ps.filter((p: any) => p.rpe !== null)
      const withMin = ps.filter((p: any) => p.minActivo !== null)
      const withUa  = ps.filter((p: any) => p.ua_total !== null)
      perSessionTeamAvg[ses.titulo] = {
        rpe: withRpe.length ? Math.round(withRpe.reduce((s: number, p: any) => s + p.rpe, 0) / withRpe.length * 10) / 10 : null,
        minActivo: withMin.length ? Math.round(withMin.reduce((s: number, p: any) => s + p.minActivo, 0) / withMin.length) : null,
        ua_total: withUa.length ? Math.round(withUa.reduce((s: number, p: any) => s + p.ua_total, 0) / withUa.length) : null,
      }
    }

    // ── GPS REAL desde gps_logs ─────────────────────────────────────────────
    // Devuelve datos reales importados por jugador y agrupados por sesión (MD label)
    let gpsReal: any[] = []
    let gpsPerMD: Record<string, any[]> = {}
    let allMetricCols: string[] = []
    const teamAvgGps: Record<string, number> = {}

    if (clubId) {
      // Dynamic columns: check which optional columns exist in gps_logs
      const GPS_BASE_COLS = ['dist_total','dist_hir','dist_v4','dist_v5','player_load','max_velocity','acc2','dec2','acc3','dec3','dist_per_min','n_sprints','duracion_min']
      // Fetch all gps_logs for the date range, joined with player info and optional session title
      // When gps_log has no sesion_id (imported without linking), fall back to matching by date
      const gpsLogs = await sql`
        SELECT
          g.jugador_id, u.nombre, j.posicion,
          g.fecha::text, g.sesion_id,
          COALESCE(sp_direct.titulo, sp_bydate.titulo) AS md_label,
          g.dist_total, g.dist_hir, g.dist_v4, g.dist_v5,
          g.player_load, g.max_velocity, g.acc2, g.dec2, g.acc3, g.dec3,
          g.dist_per_min, g.n_sprints, g.duracion_min, g.metricas
        FROM gps_logs g
        JOIN jugadores j ON j.id = g.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        LEFT JOIN sesiones_plan sp_direct ON sp_direct.id = g.sesion_id
        LEFT JOIN sesiones_plan sp_bydate ON sp_bydate.id = (
          SELECT id FROM sesiones_plan
          WHERE club_id = ${clubId}
            AND fecha::date = g.fecha::date
          ORDER BY id
          LIMIT 1
        ) AND g.sesion_id IS NULL
        WHERE g.club_id = ${clubId}
          AND g.fecha >= ${desde}::date AND g.fecha <= ${hastaInc}::timestamp
          AND u.activo = true
        ORDER BY g.fecha, u.nombre
      ` as any[]

      if (gpsLogs.length > 0) {
        // Determine which base columns have any data + dynamic metricas keys
        const metricaKeys = new Set<string>()
        for (const r of gpsLogs) {
          if (r.metricas && typeof r.metricas === 'object') {
            Object.keys(r.metricas).forEach(k => metricaKeys.add(k))
          }
        }
        const activeCols = GPS_BASE_COLS.filter(k => gpsLogs.some(r => r[k] !== null && r[k] !== undefined))
        allMetricCols = [...activeCols, ...Array.from(metricaKeys)]

        // Aggregate per player (sum across all sessions in range)
        // AVG_PLAYER_FIELDS: these must be averaged, not summed, across sessions
        const AVG_PLAYER_FIELDS = new Set(['max_velocity', 'dist_per_min', 'duracion_min'])
        const byPlayer: Record<number, any> = {}
        for (const r of gpsLogs) {
          if (!byPlayer[r.jugador_id]) {
            byPlayer[r.jugador_id] = { jugador_id: r.jugador_id, nombre: r.nombre, posicion: r.posicion || '—', sesiones_gps: 0 }
            for (const k of allMetricCols) byPlayer[r.jugador_id][k] = 0
            for (const k of AVG_PLAYER_FIELDS) { byPlayer[r.jugador_id][`_sum_${k}`] = 0; byPlayer[r.jugador_id][`_cnt_${k}`] = 0 }
          }
          const p = byPlayer[r.jugador_id]
          p.sesiones_gps += 1
          for (const k of activeCols) {
            if (r[k] !== null && r[k] !== undefined) {
              if (AVG_PLAYER_FIELDS.has(k)) {
                const v = Number(r[k]) || 0
                if (v > 0) { p[`_sum_${k}`] += v; p[`_cnt_${k}`] += 1 }
              } else {
                p[k] = (p[k] || 0) + (Number(r[k]) || 0)
              }
            }
          }
          if (r.metricas && typeof r.metricas === 'object') {
            for (const k of metricaKeys) {
              if (r.metricas[k] !== undefined) p[k] = (p[k] || 0) + (Number(r.metricas[k]) || 0)
            }
          }
        }
        // Round all numeric values; compute avg for AVG_PLAYER_FIELDS
        gpsReal = Object.values(byPlayer).map((p: any) => {
          const out: any = { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, sesiones_gps: p.sesiones_gps }
          for (const k of allMetricCols) {
            if (AVG_PLAYER_FIELDS.has(k)) {
              const cnt = p[`_cnt_${k}`] || 0
              out[k] = cnt > 0 ? Math.round((p[`_sum_${k}`] / cnt) * 10) / 10 : 0
            } else {
              out[k] = Math.round((p[k] || 0) * 10) / 10
            }
          }
          return out
        }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

        // Team avg GPS
        const nGps = gpsReal.length || 1
        const GPS_AVG_FIELDS = new Set(['max_velocity','dist_per_min','duracion_min'])
        const GPS_MAX_FIELDS = new Set(['max_velocity'])
        for (const k of allMetricCols) {
          const vals = gpsReal.map((p: any) => Number(p[k]) || 0).filter(x => x > 0)
          if (vals.length) {
            teamAvgGps[k] = GPS_MAX_FIELDS.has(k)
              ? Math.round(Math.max(...vals) * 10) / 10
              : GPS_AVG_FIELDS.has(k)
              ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10
              : Math.round(vals.reduce((a, b) => a + b, 0) / nGps * 10) / 10
          }
        }

        // Group by MD label (sesion titulo) for per-session breakdown
        // Players in same MD: aggregate (sum distances, max velocity)
        const mdMap: Record<string, Record<number, any>> = {}
        for (const r of gpsLogs) {
          const mdKey = r.md_label || r.fecha  // fall back to date if no session assigned
          if (!mdMap[mdKey]) mdMap[mdKey] = {}
          if (!mdMap[mdKey][r.jugador_id]) {
            mdMap[mdKey][r.jugador_id] = { jugador_id: r.jugador_id, nombre: r.nombre, posicion: r.posicion || '—', sesiones: 0 }
            for (const k of allMetricCols) mdMap[mdKey][r.jugador_id][k] = 0
          }
          const p = mdMap[mdKey][r.jugador_id]
          p.sesiones += 1
          for (const k of activeCols) {
            if (r[k] !== null && r[k] !== undefined) {
              if (k === 'max_velocity') p[k] = Math.max(p[k] || 0, Number(r[k]) || 0)
              else p[k] = (p[k] || 0) + (Number(r[k]) || 0)
            }
          }
          if (r.metricas && typeof r.metricas === 'object') {
            for (const k of metricaKeys) {
              if (r.metricas[k] !== undefined) p[k] = (p[k] || 0) + (Number(r.metricas[k]) || 0)
            }
          }
        }
        for (const [md, players] of Object.entries(mdMap)) {
          gpsPerMD[md] = Object.values(players).map((p: any) => {
            const out: any = { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, sesiones: p.sesiones }
            for (const k of allMetricCols) out[k] = Math.round((p[k] || 0) * 10) / 10
            return out
          }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
        }
      }
    }

    return NextResponse.json({ players, teamAvg, sesionesInfo, perSession, perSessionPlayers, perSessionTeamAvg, cePerSession, sesionesCount: sesiones.length, ciclo, gpsReal, gpsPerMD, teamAvgGps, allMetricCols, hasRealGps: gpsReal.length > 0 })
  } catch (err) {
    console.error('[GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// FIX DATOS FANTASMAS
export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(req.url); const desde = searchParams.get('desde'); const hasta = searchParams.get('hasta'); const clubId = s.clubId ? Number(s.clubId) : null
    if (!desde || !hasta) return NextResponse.json({ error: 'Faltan fechas' }, { status: 400 })
    const sql = getDb()
    await sql.begin(async (sql) => {
      await sql`DELETE FROM entrenamiento_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId}) AND fecha >= ${desde}::date AND fecha <= ${hasta}::date`
      await sql`DELETE FROM sesiones_plan WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hasta}::date`
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error al borrar datos' }, { status: 500 })
  }
}