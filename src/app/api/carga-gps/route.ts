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
      t.distSprint += Math.max(0, (0.018 * densidad - 0.844)             * tiempoAct)
      t.distMP     += Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoAct)
      t.distAcel   += Math.max(0, (1.321  * Math.log(densidad) - 0.629)  * tiempoAct)
      t.distDecel  += Math.max(0, (1.157  * Math.log(densidad) - 0.418)  * tiempoAct)
      t.nSprints   += Math.max(0, (0.001  * densidad - 0.046)            * tiempoAct)
      t.nAcel      += Math.max(0, (0.212  * Math.log(densidad) - 0.23)   * tiempoAct)
      t.nDecel     += Math.max(0, (0.1041 * Math.log(densidad) - 0.096)  * tiempoAct)
      t.nAcel3     += Math.max(0, (0.212  * Math.log(densidad) - 0.23)   * tiempoAct * 0.22)
      t.nDecel3    += Math.max(0, (0.1041 * Math.log(densidad) - 0.096)  * tiempoAct * 0.22)
    }
  }
  return Object.fromEntries(Object.entries(t).map(([k,v]) => [k, Math.round(v as number)]))
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

    const sesiones = clubId ? await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo FROM sesiones_plan WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`
    : await sql`SELECT id, fecha::text, ejercicios, rpe_objetivo, titulo FROM sesiones_plan WHERE admin_id = ${s.userId} AND club_id IS NULL AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`

    const todosJugadores = clubId ? await sql`SELECT j.id AS jugador_id, u.nombre, j.posicion FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true ORDER BY u.nombre` : []

    const logs = clubId ? await sql`SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int, el.carga_ua::int FROM entrenamiento_logs el JOIN jugadores j ON j.id = el.jugador_id JOIN usuarios u ON u.id = j.usuario_id WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp AND u.activo = true AND (u.club_id = ${clubId} OR j.club_id = ${clubId}) ORDER BY el.fecha` : []

    const gpsPorFecha: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const m = sumarMetricasBloques(ses.ejercicios || [])
      if (!gpsPorFecha[ses.fecha]) {
        gpsPorFecha[ses.fecha] = { distTotal:0, distSprint:0, distMP:0, distAcel:0, distDecel:0, nSprints:0, nAcel:0, nDecel:0, nAcel3:0, nDecel3:0, minActivo:0, minPausa:0, rpe_objetivo:0, tipo_sesion:'entrenamiento' }
      }
      const g = gpsPorFecha[ses.fecha]
      g.distTotal += m.distTotal; g.distSprint += m.distSprint; g.distMP += m.distMP; g.distAcel += m.distAcel; g.distDecel += m.distDecel
      g.nSprints += m.nSprints; g.nAcel += m.nAcel; g.nDecel += m.nDecel; g.nAcel3 += m.nAcel3||0; g.nDecel3 += m.nDecel3||0
      g.minActivo += m.minActivo; g.minPausa += m.minPausa
      if (Number(ses.rpe_objetivo) > 0) g.rpe_objetivo = Number(ses.rpe_objetivo)
      if (ses.tipo === 'partido') g.tipo_sesion = 'partido'
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
        if (!playerLogDates.has(fecha)) continue
        const playerLog = playerLogs.find((l: any) => l.fecha === fecha)
        const playerMinutes = playerLog?.duracion_min ? Number(playerLog.duracion_min) : null
        const plannedMinutes = gps.minActivo
        let scale = (playerMinutes !== null && plannedMinutes > 0) ? Math.min(playerMinutes / plannedMinutes, (gps.tipo_sesion === 'partido' ? 2.0 : 1.5)) : 1
        p.distTotal += Math.round(gps.distTotal * scale); p.distSprint += Math.round(gps.distSprint * scale); p.distMP += Math.round(gps.distMP * scale)
        p.distAcel += Math.round(gps.distAcel * scale); p.distDecel += Math.round(gps.distDecel * scale); p.nSprints += Math.round(gps.nSprints * scale)
        p.nAcel += Math.round(gps.nAcel * scale); p.nDecel += Math.round(gps.nDecel * scale); p.nAcel3 += Math.round((gps.nAcel3||0) * scale); p.nDecel3 += Math.round((gps.nDecel3||0) * scale)
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

    // Mantenemos lógica de GPS real y agrupamiento MD
    const n = players.length || 1
    const avg = (field: string) => Math.round(players.reduce((s: number, p: any) => s + (p[field] || 0), 0) / n)
    const teamAvg = {
      rpe: Math.round((players.reduce((s: number, p: any) => s + (p.rpe || 0), 0) / n) * 10) / 10,
      ua: avg('ua'), ua_total: avg('ua_total'), distTotal: avg('distTotal'), distSprint: avg('distSprint'),
      distMP: avg('distMP'), distAcel: avg('distAcel'), distDecel: avg('distDecel'),
      nSprints: avg('nSprints'), nAcel: avg('nAcel'), nDecel: avg('nDecel'), nAcel3: avg('nAcel3'), nDecel3: avg('nDecel3'), sesiones: avg('sesiones')
    }

    const perSession: Record<string, any> = {}
    for (const ses of sesiones as any[]) {
      const label = ses.titulo || ses.fecha
      const m = sumarMetricasBloques(ses.ejercicios || [])
      perSession[label] = { fecha: ses.fecha, rpe_objetivo: ses.rpe_objetivo, ...m }
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
      const label = ses.titulo || ses.fecha
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
      const bloques = Object.entries(ventanaMap).map(([ventana, v]) => ({
        ventana,
        minTotal: Math.round(v.minTotal),
        ne: v.ne,
        ce: Math.round(v.minTotal * v.ne),
      }))
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
    
    const sesionesInfo = (sesiones as any[]).map(s => ({ id: s.id, fecha: s.fecha, titulo: s.titulo || s.fecha, rpe_objetivo: s.rpe_objetivo }))
    const perSessionPlayers: Record<string, any[]> = {}
    for (const ses of sesionesInfo) {
      perSessionPlayers[ses.titulo] = (todosJugadores as any[]).map((p: any) => {
        const log = rpeByPlayerDate[`${p.jugador_id}_${ses.fecha}`]
        return { jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, rpe: log ? Number(log.rpe) : null, minActivo: log ? Number(log.duracion_min) : null, ua_total: log ? Number(log.carga_ua) : null }
      })
    }

    return NextResponse.json({ players, teamAvg, sesionesInfo, perSession, perSessionPlayers, cePerSession, sesionesCount: sesiones.length, ciclo })
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