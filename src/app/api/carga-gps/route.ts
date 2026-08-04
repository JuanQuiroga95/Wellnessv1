export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function sumarMetricasBloques(ejercicios: any[]): Record<string, number> {
  const t: Record<string, number> = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, dist_acc_hi:0, dist_dec_hi:0, sprintN25:0, distSprint25:0, minActivo:0, minPausa:0 }
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
    t.minPausa  += Math.max(0, series - 1) * pausa

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
      t.dist_acc_hi+= Number(ov.dist_acc_hi ?? 0)
      t.dist_dec_hi+= Number(ov.dist_dec_hi ?? 0)
      t.sprintN25  += Number(ov.sprintN25  ?? 0)
      t.distSprint25 += Number(ov.distSprint25 ?? 0)
    } else if (series && minutos && jug && largo && ancho) {
      const densidad   = (largo * ancho) / jug
      const tiempoAct  = series * minutos
      t.distTotal  += Math.max(0, (19.243 * Math.log(densidad) - 5.029)  * tiempoAct)
      t.distMP     += Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoAct)
      t.distAcel   += Math.max(0, (1.321  * Math.log(densidad) - 0.629)  * tiempoAct)
      t.distDecel  += Math.max(0, (1.157  * Math.log(densidad) - 0.418)  * tiempoAct)
      let nAcelRate = 0;
      let nDecelRate = 0;
      if (densidad < 100) { nAcelRate = 3.0; nDecelRate = 3.3; }
      else if (densidad <= 200) { nAcelRate = 2.1; nDecelRate = 2.3; }
      else { nAcelRate = 1.25; nDecelRate = 1.4; }
      const calcNAcel = nAcelRate * tiempoAct;
      const calcNDecel = nDecelRate * tiempoAct;
      t.nAcel      += calcNAcel;
      t.nDecel     += calcNDecel;
      t.nAcel3     += calcNAcel * 0.22;
      t.nDecel3    += calcNDecel * 0.22;

      // HSR (m) — density-based rate
      let hsrRate = 0;
      if (densidad < 100) { hsrRate = 0.5; }
      else if (densidad <= 180) { hsrRate = 1.85; }
      else if (densidad <= 280) { hsrRate = 4.5; }
      else { hsrRate = 9.5; }
      t.distSprint += hsrRate * tiempoAct;

      // HSR (n) — density-based rate
      let hsrNRate = 0;
      if (densidad < 100) { hsrNRate = 0.03; }
      else if (densidad <= 180) { hsrNRate = 0.115; }
      else if (densidad <= 280) { hsrNRate = 0.275; }
      else { hsrNRate = 0.55; }
      t.nSprints += hsrNRate * tiempoAct;
      
      let factorAcc = 0;
      let factorDec = 0;
      if (densidad < 100) { factorAcc = 1.0; factorDec = 1.8; }
      else if (densidad <= 180) { factorAcc = 3.0; factorDec = 1.5; }
      else { factorAcc = 4.25; factorDec = 0.85; }
      t.dist_acc_hi += factorAcc * tiempoAct;
      t.dist_dec_hi += factorDec * tiempoAct;

      // Sprint >25 km/h (n) and (m)
      let sprintN25Rate = 0;
      let distSprint25Rate = 0;
      if (densidad < 100) { sprintN25Rate = 0; distSprint25Rate = 0; }
      else if (densidad <= 180) { sprintN25Rate = 0.075; distSprint25Rate = 1.15; }
      else { sprintN25Rate = 0.225; distSprint25Rate = 4.5; }
      t.sprintN25 += sprintN25Rate * tiempoAct;
      t.distSprint25 += distSprint25Rate * tiempoAct;
    }
  }
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
    const calcOnly = searchParams.get('calcOnly') === 'true'

    // FIX FECHA: Incluir todo el día seleccionado
    const hastaInc = hasta + ' 23:59:59.999'

    const sql   = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (clubId) {
      try {
        // Solo reparar si realmente hay registros sin club_id — evita writes innecesarios en cada request
        const needsRepair = await sql`
          SELECT 1 FROM jugadores j
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE u.club_id = ${clubId} AND j.club_id IS NULL
          LIMIT 1
        `
        if ((needsRepair as any[]).length > 0) {
          await sql`UPDATE jugadores j SET club_id = ${clubId} FROM usuarios u WHERE u.id = j.usuario_id AND u.club_id = ${clubId} AND j.club_id IS NULL`
          await sql`UPDATE usuarios u SET club_id = ${clubId} FROM jugadores j WHERE j.usuario_id = u.id AND j.club_id = ${clubId} AND u.club_id IS NULL`
        }
      } catch {}
    }

    const sesiones = clubId ? await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo FROM sesiones_plan WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`
    : await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo FROM sesiones_plan WHERE admin_id = ${s.userId} AND club_id IS NULL AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`

    const todosJugadores = clubId ? await sql`SELECT j.id AS jugador_id, u.nombre, j.posicion FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true ORDER BY u.nombre` : []

    const logs = clubId ? await sql`SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int, el.tipo_sesion FROM entrenamiento_logs el JOIN jugadores j ON j.id = el.jugador_id JOIN usuarios u ON u.id = j.usuario_id WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp AND u.activo = true AND (u.club_id = ${clubId} OR j.club_id = ${clubId}) ORDER BY el.fecha` : []

    // Cache sumarMetricasBloques por sesión — evita triple cálculo del mismo JSON
    const metricsCache: Record<number, Record<string, number>> = {}
    const getMetrics = (ses: any) => {
      if (!metricsCache[ses.id]) metricsCache[ses.id] = sumarMetricasBloques(ses.ejercicios || [])
      return metricsCache[ses.id]
    }

    const gpsPorFecha: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const m = getMetrics(ses)
      if (!gpsPorFecha[ses.fecha]) {
        gpsPorFecha[ses.fecha] = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, sprintN25:0, distSprint25:0, minActivo:0, minPausa:0, rpe_objetivo:0, tipo_sesion:'entrenamiento' }
      }
      const g = gpsPorFecha[ses.fecha]
      g.distTotal += m.distTotal; g.distSprint += m.distSprint; g.distMP += m.distMP; g.distAcel += m.distAcel; g.distDecel += m.distDecel
      g.nSprints += m.nSprints; g.nAcel += m.nAcel; g.nDecel += m.nDecel; g.nAcel3 += m.nAcel3||0; g.nDecel3 += m.nDecel3||0
      g.sprintN25 += m.sprintN25||0; g.distSprint25 += m.distSprint25||0
      g.minActivo += m.minActivo; g.minPausa += m.minPausa
      if (Number(ses.rpe_objetivo) > 0) g.rpe_objetivo = Number(ses.rpe_objetivo)
      if (ses.tipo === 'partido') g.tipo_sesion = 'partido'
    }

    const byPlayer: Record<number, any> = {}
    for (const p of todosJugadores as any[]) {
      byPlayer[p.jugador_id] = { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion || '—', sesiones: 0, total_rpe: 0, total_ua: 0, minActivo: 0, distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, sprintN25:0, distSprint25:0, diasConGps: 0 }
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
        p.sesiones += 1; p.total_ua += Number(log.carga_ua) || 0; p.minActivo += Number(log.duracion_min) || 0
        if (log.tipo_sesion !== 'PARCIAL' && log.tipo_sesion !== 'READAPTACION') {
          p.sesiones_rpe = (p.sesiones_rpe || 0) + 1
          p.total_rpe = (p.total_rpe || 0) + (Number(log.rpe) || 0)
        }
      }
      const playerLogDates = new Set(playerLogs.map((l: any) => l.fecha))
      for (const fecha of fechasConSesion) {
        const gps = gpsPorFecha[fecha]
        const playerLog = playerLogs.find((l: any) => l.fecha === fecha)
        const playerMinutes = playerLog?.duracion_min ? Number(playerLog.duracion_min) : null
        const plannedMinutes = gps.minActivo
        let scale = (playerMinutes !== null && plannedMinutes > 0) ? Math.min(playerMinutes / plannedMinutes, (gps.tipo_sesion === 'partido' ? 2.0 : 1.5)) : 1
        p.distTotal += Math.round(gps.distTotal * scale); p.distSprint += Math.round(gps.distSprint * scale); p.distMP += Math.round(gps.distMP * scale)
        p.distAcel += Math.round(gps.distAcel * scale); p.distDecel += Math.round(gps.distDecel * scale); p.nSprints += Math.round(gps.nSprints * scale)
        p.nAcel += Math.round(gps.nAcel * scale); p.nDecel += Math.round(gps.nDecel * scale); p.nAcel3 += Math.round((gps.nAcel3||0) * scale); p.nDecel3 += Math.round((gps.nDecel3||0) * scale)
        p.sprintN25 += Math.round((gps.sprintN25||0) * scale); p.distSprint25 += Math.round((gps.distSprint25||0) * scale)
        if (!playerLogDates.has(fecha)) p.minActivo += plannedMinutes
        p.diasConGps += 1
      }
    }

    const players = Object.values(byPlayer).map((p: any) => ({
      jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, sesiones: p.sesiones,
      rpe: p.sesiones_rpe > 0 ? Math.round((p.total_rpe / p.sesiones_rpe) * 10) / 10 : null,
      ua: p.sesiones > 0 ? Math.round(p.total_ua / p.sesiones) : null,
      ua_total: Math.round(p.total_ua), minActivo: p.minActivo, distTotal: Math.round(p.distTotal),
      distSprint: Math.round(p.distSprint), distMP: Math.round(p.distMP), distAcel: Math.round(p.distAcel),
      distDecel: Math.round(p.distDecel), nSprints: Math.round(p.nSprints), nAcel: Math.round(p.nAcel),
      nDecel: Math.round(p.nDecel), nAcel3: Math.round(p.nAcel3||0), nDecel3: Math.round(p.nDecel3||0),
      sprintN25: Math.round(p.sprintN25||0), distSprint25: Math.round(p.distSprint25||0), hasGps: p.distTotal > 0
    })).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

    const activePlayers = players.filter((p: any) => p.sesiones > 0)
    const playersWithGps = players.filter((p: any) => p.hasGps)
    const n = activePlayers.length || 1
    const nGps = playersWithGps.length || 1
    const avg = (field: string) => Math.round(activePlayers.reduce((s: number, p: any) => s + (p[field] || 0), 0) / n)
    const avgGps = (field: string) => Math.round(playersWithGps.reduce((s: number, p: any) => s + (p[field] || 0), 0) / nGps)
    const teamAvg = {
      rpe: (() => {
        const validRpePlayers = activePlayers.filter((p: any) => p.rpe !== null)
        return validRpePlayers.length ? Math.round((validRpePlayers.reduce((s: number, p: any) => s + p.rpe, 0) / validRpePlayers.length) * 10) / 10 : 0
      })(),
      ua: avg('ua'), ua_total: avg('ua_total'), distTotal: avgGps('distTotal'), distSprint: avgGps('distSprint'),
      distMP: avgGps('distMP'), distAcel: avgGps('distAcel'), distDecel: avgGps('distDecel'),
      nSprints: avgGps('nSprints'), nAcel: avgGps('nAcel'), nDecel: avgGps('nDecel'), nAcel3: avgGps('nAcel3'), nDecel3: avgGps('nDecel3'), sesiones: avg('sesiones')
    }

    const perSession: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const label = ses.titulo || ses.fecha
      const m = getMetrics(ses)
      const ua_total = Number(ses.rpe_objetivo) > 0 ? Math.round(Number(ses.rpe_objetivo) * m.minActivo) : 0
      if (perSession[label]) {
        const p = perSession[label]
        const numKeys = ['distTotal','distSprint','distMP','distAcel','distDecel','nSprints','nAcel','nDecel','nAcel3','nDecel3','sprintN25','distSprint25','minActivo','minPausa']
        for (const k of numKeys) p[k] = (p[k] || 0) + (m[k] || 0)
        p.ua_total = (p.ua_total || 0) + ua_total
      } else {
        perSession[label] = { fecha: ses.fecha, rpe_objetivo: ses.rpe_objetivo, ...m, ua_total }
      }
    }

    const NE_DEFAULT: Record<string, number> = {
      'Partido oficial': 10, 'Partido amistoso': 9, 'Partido de entrenamiento': 8,
      'Partido modificado': 7, 'Partido reducido': 7, 'Juego de posición': 6,
      'Juego de posesión': 6, 'Transiciones': 5, 'Rondo': 5, 'Trabajo analítico': 4,
      'Activación en campo': 2, 'Activación en gimnasio': 2,
    }
    const cePerSession: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const label = ses.titulo || ses.fecha
      const ejercicios: any[] = Array.isArray(ses.ejercicios) ? ses.ejercicios : []
      const ventanaMap: Record<string, { minTotal: number; ne: number }> = {}
      for (const bl of ejercicios) {
        const series  = Number(bl.series)  || 1
        const minutos = Number(bl.minutos) || 0
        if (!minutos) continue
        const ventana = bl.ventana || bl.tipo || 'Tarea'
        const ne = bl.ne ?? NE_DEFAULT[ventana] ?? 5
        if (!ventanaMap[ventana]) ventanaMap[ventana] = { minTotal: 0, ne }
        ventanaMap[ventana].minTotal += series * minutos
        ventanaMap[ventana].ne = ne
      }
      const bloques = Object.entries(ventanaMap).map(([ventana, v]) => ({
        ventana, minTotal: Math.round(v.minTotal), ne: v.ne, ce: Math.round(v.minTotal * v.ne),
      }))
      const ce_total = bloques.reduce((s, b) => s + b.ce, 0)
      const rpe_obj = Number(ses.rpe_objetivo) || 0
      const uce_total = rpe_obj > 0 ? Math.round(ce_total * rpe_obj) : 0
      if (cePerSession[label]) {
        cePerSession[label].ce_total += ce_total
        cePerSession[label].uce_total += uce_total
        cePerSession[label].rpe_objetivo = Math.max(cePerSession[label].rpe_objetivo, rpe_obj)
        for (const b of bloques) {
          const ex = cePerSession[label].bloques.find((x:any) => x.ventana === b.ventana)
          if (ex) {
            ex.minTotal += b.minTotal
            ex.ce += b.ce
          } else {
            cePerSession[label].bloques.push(b)
          }
        }
      } else {
        cePerSession[label] = { fecha: ses.fecha, rpe_objetivo: rpe_obj, ce_total, uce_total, bloques }
      }
    }

    const rpeByPlayerDate: Record<string, any> = {}
    for (const log of logs as any[]) { 
      const dStr = typeof log.fecha === 'string' ? log.fecha.slice(0, 10) : String(log.fecha).slice(0,10)
      rpeByPlayerDate[`${log.jugador_id}_${dStr}`] = log 
    }
    
    const sesionesInfo = (sesiones as any[]).map(s => ({ id: s.id, fecha: typeof s.fecha === 'string' ? s.fecha.slice(0, 10) : String(s.fecha).slice(0, 10), titulo: s.titulo || s.fecha, rpe_objetivo: s.rpe_objetivo }))
    const perSessionPlayers: Record<string, any[]> = {}
    for (const ses of sesionesInfo) {
      const sessionPlayers = (todosJugadores as any[]).map((p: any) => {
        const log = rpeByPlayerDate[`${p.jugador_id}_${ses.fecha}`]
        return { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, rpe: log ? Number(log.rpe) : null, minActivo: log ? Number(log.duracion_min) : null, ua_total: log ? Number(log.carga_ua) : null, tipo_sesion: log?.tipo_sesion || null }
      })
      
      if (!perSessionPlayers[ses.titulo]) {
        perSessionPlayers[ses.titulo] = sessionPlayers
      } else {
        // Merge players, prioritizing those with actual data so Sunday's empty MD+1 doesn't erase Monday's MD+1 logs
        perSessionPlayers[ses.titulo] = perSessionPlayers[ses.titulo].map(existingP => {
          const newP = sessionPlayers.find(p => p.jugador_id === existingP.jugador_id)
          return {
            ...existingP,
            rpe: existingP.rpe !== null ? existingP.rpe : (newP?.rpe ?? null),
            minActivo: existingP.minActivo !== null ? existingP.minActivo : (newP?.minActivo ?? null),
            ua_total: existingP.ua_total !== null ? existingP.ua_total : (newP?.ua_total ?? null),
            tipo_sesion: existingP.tipo_sesion !== null ? existingP.tipo_sesion : (newP?.tipo_sesion ?? null),
          }
        })
      }
    }

    const perSessionTeamAvg: Record<string, any> = {}
    for (const ses of sesionesInfo) {
      const ps = perSessionPlayers[ses.titulo] || []
      const validPs = ps.filter((p: any) => p.tipo_sesion !== 'PARCIAL' && p.tipo_sesion !== 'READAPTACION')
      const withRpe = validPs.filter((p: any) => p.rpe !== null)
      const withMin = validPs.filter((p: any) => p.minActivo !== null)
      const withUa  = validPs.filter((p: any) => p.ua_total !== null)
      perSessionTeamAvg[ses.titulo] = {
        rpe: withRpe.length ? Math.round(withRpe.reduce((s: number, p: any) => s + p.rpe, 0) / withRpe.length * 10) / 10 : null,
        minActivo: withMin.length ? Math.round(withMin.reduce((s: number, p: any) => s + p.minActivo, 0) / withMin.length) : null,
        ua_total: withUa.length ? Math.round(withUa.reduce((s: number, p: any) => s + p.ua_total, 0) / withUa.length) : null,
      }
      if (cePerSession[ses.titulo]) {
        cePerSession[ses.titulo].rpe_real = perSessionTeamAvg[ses.titulo].rpe
      }
    }

    // ── GPS REAL desde gps_logs ─────────────────────────────────────────────
    let gpsReal: any[] = []
    let gpsPerMD: Record<string, any[]> = {}
    let allMetricCols: string[] = []
    const teamAvgGps: Record<string, number> = {}

    if (clubId && !calcOnly) {
      const GPS_BASE_COLS = ['dist_total','dist_hir','dist_v4','dist_v5','player_load','max_velocity','acc2','dec2','acc3','dec3','dist_per_min','n_sprints','duracion_min']
      
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
        const metricaKeys = new Set<string>()
        
        for (const r of gpsLogs) {
          if (r.metricas && typeof r.metricas === 'object') {
            Object.keys(r.metricas).forEach(k => {
              // FIX: SOLO agregamos la clave si no es una de las columnas base, 
              // para evitar sumar el valor 2 veces (columna + JSON)
              if (!GPS_BASE_COLS.includes(k)) metricaKeys.add(k)
            })
          }
        }
        
        const activeCols = GPS_BASE_COLS.filter(k => gpsLogs.some(r => r[k] !== null && r[k] !== undefined))
        
        // FIX: acc3/dec3 pueden estar en metricas JSON en vez de columnas directas (importaciones viejas)
        // Si no están en activeCols pero sí en algún metricas, agregarlos explícitamente
        const fallbackCols: string[] = []
        for (const k of ['acc3', 'dec3']) {
          if (!activeCols.includes(k) && gpsLogs.some(r => r.metricas?.[k] !== undefined)) {
            fallbackCols.push(k)
          }
        }
        
        allMetricCols = [...activeCols, ...fallbackCols, ...Array.from(metricaKeys)]

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
              // Ya no corremos el riesgo de sumar dist_total porque lo bloqueamos arriba
              if (r.metricas[k] !== undefined) p[k] = (p[k] || 0) + (Number(r.metricas[k]) || 0)
            }
            // Fallback para cols base que no llegaron como columnas directas (e.g. acc3/dec3 en imports viejos)
            for (const k of fallbackCols) {
              if (r.metricas[k] !== undefined) p[k] = (p[k] || 0) + (Number(r.metricas[k]) || 0)
            }
          }
        }
        
        gpsReal = Object.values(byPlayer).map((p: any) => {
          const out: any = { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, sesiones_gps: p.sesiones_gps }
          for (const k of allMetricCols) {
            if (AVG_PLAYER_FIELDS.has(k)) {
              const cnt = p[`_cnt_${k}`] || 0
              out[k] = cnt > 0 ? Math.round((p[`_sum_${k}`] / cnt) * 1000) / 1000 : 0
            } else {
              out[k] = Math.round((p[k] || 0) * 1000) / 1000
            }
          }
          return out
        }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

        const nGps = gpsReal.length || 1
        const GPS_AVG_FIELDS = new Set(['max_velocity','dist_per_min','duracion_min'])
        for (const k of allMetricCols) {
          const vals = gpsReal.map((p: any) => Number(p[k]) || 0).filter(x => x > 0)
          if (vals.length) {
            teamAvgGps[k] = GPS_AVG_FIELDS.has(k)
              ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 1000) / 1000
              : Math.round(vals.reduce((a, b) => a + b, 0) / nGps * 1000) / 1000
          }
        }

        const mdMap: Record<string, Record<number, any>> = {}
        for (const r of gpsLogs) {
          const mdKey = r.md_label || r.fecha  
          if (!mdMap[mdKey]) mdMap[mdKey] = {}
          if (!mdMap[mdKey][r.jugador_id]) {
            mdMap[mdKey][r.jugador_id] = { jugador_id: r.jugador_id, nombre: r.nombre, posicion: r.posicion || '—', sesiones: 0 }
            for (const k of allMetricCols) mdMap[mdKey][r.jugador_id][k] = 0
          }
          const p = mdMap[mdKey][r.jugador_id]
          p.sesiones += 1
          
          for (const k of activeCols) {
            if (r[k] !== null && r[k] !== undefined) {
              const val = Number(r[k]) || 0
              if (k === 'max_velocity') {
                p[k] = Math.max(p[k] || 0, val)
              } else if (k === 'dist_per_min') {
                // Para Mts/min en el mismo día, si hay múltiples logs (ej: bloques), 
                // lo ideal es el promedio ponderado o simplemente el promedio si no tenemos duración.
                // Usamos _sum/_cnt interno para promediar al final.
                p[`_sum_${k}`] = (p[`_sum_${k}`] || 0) + val
                p[`_cnt_${k}`] = (p[`_cnt_${k}`] || 0) + 1
              } else {
                p[k] = (p[k] || 0) + val
              }
            }
          }
          
          if (r.metricas && typeof r.metricas === 'object') {
            for (const k of metricaKeys) {
              // Misma protección para la tabla por sesión
              if (r.metricas[k] !== undefined) p[k] = (p[k] || 0) + (Number(r.metricas[k]) || 0)
            }
            // Fallback para cols base que no llegaron como columnas directas (acc3/dec3 en imports viejos)
            for (const k of fallbackCols) {
              if (r.metricas[k] !== undefined) p[k] = (p[k] || 0) + (Number(r.metricas[k]) || 0)
            }
          }
        }
        for (const [md, players] of Object.entries(mdMap)) {
          gpsPerMD[md] = Object.values(players).map((p: any) => {
            const out: any = { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, sesiones: p.sesiones }
            for (const k of allMetricCols) {
              if (AVG_PLAYER_FIELDS.has(k)) {
                const cnt = p[`_cnt_${k}`] || 0
                out[k] = cnt > 0 ? Math.round((p[`_sum_${k}`] / cnt) * 1000) / 1000 : 0
              } else {
                out[k] = Math.round((p[k] || 0) * 1000) / 1000
              }
            }
            return out
          }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
        }
      }
    }

    return NextResponse.json({ players, teamAvg, sesionesInfo, perSession, perSessionPlayers, perSessionTeamAvg, cePerSession, sesionesCount: sesiones.length, ciclo, gpsReal, gpsPerMD, teamAvgGps, allMetricCols, hasRealGps: gpsReal.length > 0 }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
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
