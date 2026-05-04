import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { buildACWRHistory, calcACWR, TrainingLog } from '@/lib/acwr'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const jugadorId = req.nextUrl.searchParams.get('jugador_id')
  const dias = Math.min(Number(req.nextUrl.searchParams.get('dias') || '90'), 365)
  const clubId = session.clubId ? Number(session.clubId) : null

  const sql = getDb()

  // ── Team risk summary (all players) ─────────────────────────────────────────
  if (!jugadorId) {
    const players = clubId
      ? await sql`SELECT j.id, u.nombre FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id WHERE j.club_id=${clubId} AND u.activo=true ORDER BY u.nombre`
      : await sql`SELECT j.id, u.nombre FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id WHERE u.activo=true ORDER BY u.nombre`

    const teamRisk = await Promise.all(players.map(async (p: any) => {
      const since = new Date(); since.setDate(since.getDate() - 28)
      const logs = await sql`SELECT fecha::text, carga_ua FROM entrenamiento_logs WHERE jugador_id=${p.id} AND fecha >= ${since.toISOString().split('T')[0]} ORDER BY fecha`
      const typedLogs: TrainingLog[] = logs.map((l: any) => ({ fecha: l.fecha, carga_ua: Number(l.carga_ua) }))
      const acwr = calcACWR(typedLogs)
      return { jugador_id: p.id, nombre: p.nombre, acwr: acwr.ratio, status: acwr.status, acuteLoad: acwr.acuteLoad, chronicLoad: acwr.chronicLoad }
    }))

    return NextResponse.json({ teamRisk })
  }

  const jId = Number(jugadorId)

  // ── Training logs ────────────────────────────────────────────────────────────
  const since = new Date(); since.setDate(since.getDate() - dias - 28) // extra 28d for ACWR context
  const rawLogs = await sql`SELECT fecha::text, carga_ua, tipo_sesion FROM entrenamiento_logs WHERE jugador_id=${jId} AND fecha >= ${since.toISOString().split('T')[0]} ORDER BY fecha`
  const trainingLogs: TrainingLog[] = rawLogs.map((l: any) => ({ fecha: l.fecha, carga_ua: Number(l.carga_ua) }))

  // ── GPS logs ─────────────────────────────────────────────────────────────────
  const gpsLogs = await sql`SELECT fecha::text, player_load::text, dist_total::text, dist_hir::text FROM gps_logs WHERE jugador_id=${jId} AND fecha >= ${since.toISOString().split('T')[0]} ORDER BY fecha`

  // ── Wellness logs ─────────────────────────────────────────────────────────────
  const wellnessLogs = await sql`SELECT fecha::text, fatiga, dolor_muscular, tqr FROM wellness_logs WHERE jugador_id=${jId} AND fecha >= ${since.toISOString().split('T')[0]} ORDER BY fecha`

  // ── Lesiones ─────────────────────────────────────────────────────────────────
  const rawLesiones = await sql`SELECT id, fecha_inicio::text, fecha_alta::text, tipo_lesion, zona, mecanismo, descripcion, eta_dias, activa FROM lesiones WHERE jugador_id=${jId} ORDER BY fecha_inicio DESC`

  // ── Build ACWR history for chart ─────────────────────────────────────────────
  const acwrHistory = buildACWRHistory(trainingLogs, dias)

  // ── Enrich each lesion with causal analysis ───────────────────────────────────
  const lesionesEnriched = rawLesiones.map((l: any) => {
    const fechaLesion = new Date(l.fecha_inicio + 'T12:00:00')

    // ACWR on day of injury
    const acwrDia0 = calcACWR(trainingLogs, fechaLesion)

    // ACWR 7 days before
    const fecha7 = new Date(fechaLesion); fecha7.setDate(fecha7.getDate() - 7)
    const acwrDia7 = calcACWR(trainingLogs, fecha7)

    // ACWR 14 days before
    const fecha14 = new Date(fechaLesion); fecha14.setDate(fecha14.getDate() - 14)
    const acwrDia14 = calcACWR(trainingLogs, fecha14)

    // Carga acumulada 7 days before injury
    const logsPreLesion7 = trainingLogs.filter(t => {
      const fd = new Date(t.fecha + 'T12:00:00')
      return fd >= fecha7 && fd < fechaLesion
    })
    const cargaPrevia7 = logsPreLesion7.reduce((s, t) => s + Number(t.carga_ua), 0)

    // Carga acumulada 14 days before
    const logsPreLesion14 = trainingLogs.filter(t => {
      const fd = new Date(t.fecha + 'T12:00:00')
      return fd >= fecha14 && fd < fechaLesion
    })
    const cargaPrevia14 = logsPreLesion14.reduce((s, t) => s + Number(t.carga_ua), 0)

    // Detect load spike
    const picoDetectado = acwrDia0.ratio > 1.3 || acwrDia7.ratio > 1.3 || acwrDia14.ratio > 1.3

    // Dias sin carga pre-lesion (rest days)
    const diasSinCarga = (() => {
      let count = 0
      for (let d = 1; d <= 7; d++) {
        const check = new Date(fechaLesion); check.setDate(check.getDate() - d)
        const checkStr = check.toISOString().split('T')[0]
        if (!trainingLogs.find(t => t.fecha === checkStr)) count++
        else break
      }
      return count
    })()

    // Weekly load variation (week before vs 2 weeks before)
    const weekBefore = logsPreLesion7.reduce((s, t) => s + Number(t.carga_ua), 0)
    const fecha21 = new Date(fechaLesion); fecha21.setDate(fecha21.getDate() - 21)
    const week2Before = trainingLogs.filter(t => {
      const fd = new Date(t.fecha + 'T12:00:00')
      return fd >= fecha14 && fd < fecha7
    }).reduce((s, t) => s + Number(t.carga_ua), 0)
    const variacionSemanal = week2Before > 0 ? Math.round(((weekBefore - week2Before) / week2Before) * 100) : null

    return {
      ...l,
      acwrPrevio: {
        dia0: acwrDia0.ratio,
        dia7: acwrDia7.ratio,
        dia14: acwrDia14.ratio,
        statusDia0: acwrDia0.status,
      },
      cargaPrevia7,
      cargaPrevia14,
      picoDetectado,
      diasSinCargaPrevia: diasSinCarga,
      variacionSemanal,
    }
  })

  // ── Current risk ──────────────────────────────────────────────────────────────
  const acwrActual = calcACWR(trainingLogs)
  const diasEnRiesgo = (() => {
    const h = buildACWRHistory(trainingLogs, 14)
    let count = 0
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i].status === 'precaucion' || h[i].status === 'peligro') count++
      else break
    }
    return count
  })()

  return NextResponse.json({
    acwrHistory,
    lesiones: lesionesEnriched,
    gpsLogs,
    wellnessLogs,
    riesgoActual: {
      acwr: acwrActual.ratio,
      status: acwrActual.status,
      acuteLoad: acwrActual.acuteLoad,
      chronicLoad: acwrActual.chronicLoad,
      diasEnRiesgo,
    },
  })
}
