export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function calcDuracionSesion(ejercicios: any[]): number {
  if (!Array.isArray(ejercicios)) return 0
  return ejercicios.reduce((acc, bl) => {
    const series = Number(bl.series) || 0
    const minutos = Number(bl.minutos) || 0
    return acc + series * minutos
  }, 0)
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde') || '2024-01-01'
  const hasta = searchParams.get('hasta') || new Date().toISOString().split('T')[0]
  const clubId = s.clubId ? Number(s.clubId) : null
  const isMaster = s.rol === 'master_admin' && !s.clubId
  const sql = getDb()

  if (!isMaster && !clubId) return NextResponse.json([])

  if (clubId) {
    try {
      await sql`UPDATE jugadores j SET club_id = ${clubId} FROM usuarios u WHERE u.id = j.usuario_id AND u.club_id = ${clubId} AND j.club_id IS NULL`
      await sql`UPDATE usuarios u SET club_id = ${clubId} FROM jugadores j WHERE j.usuario_id = u.id AND j.club_id = ${clubId} AND u.club_id IS NULL`
      // Repair sessions created without club_id (e.g. first deploy before fix)
      await sql`UPDATE sesiones_plan SET club_id = ${clubId} WHERE admin_id = ${s.userId} AND club_id IS NULL`
    } catch {}
  }

  const [trainLogs, match, sesionesCalendario, bimTLogs, bimM] = await Promise.all([
    sql`SELECT j.id AS jugador_id, u.nombre, j.posicion,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno_rpe,
               COUNT(e.id)::int AS sesiones_rpe
        FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
        LEFT JOIN entrenamiento_logs e ON e.jugador_id=j.id AND e.fecha BETWEEN ${desde} AND ${hasta}
        WHERE u.rol='jugador' AND u.activo=true
          AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY j.id, u.nombre, j.posicion`,

    sql`SELECT pl.jugador_id::int, COALESCE(SUM(pl.minutos),0)::int AS min_partido, COUNT(pl.id)::int AS partidos
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha BETWEEN ${desde} AND ${hasta}
          AND u.activo=true
          AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY pl.jugador_id`,

    sql`SELECT sp.fecha::text, sp.tipo, sp.titulo, sp.ejercicios, sp.hora_inicio::text, sp.hora_fin::text
        FROM sesiones_plan sp
        WHERE sp.fecha BETWEEN ${desde} AND ${hasta}
          AND sp.tipo = 'entrenamiento'
          AND (${isMaster}::boolean OR sp.club_id = ${clubId} OR sp.admin_id = ${s.userId})
        ORDER BY sp.fecha`,

    sql`SELECT e.jugador_id::int, TO_CHAR(DATE_TRUNC('month',e.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno
        FROM entrenamiento_logs e
        JOIN jugadores j ON j.id=e.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE e.fecha BETWEEN ${desde} AND ${hasta}
          AND u.activo=true
          AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY e.jugador_id, DATE_TRUNC('month',e.fecha)`,

    sql`SELECT pl.jugador_id::int, TO_CHAR(DATE_TRUNC('month',pl.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(pl.minutos),0)::int AS min_partido
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha BETWEEN ${desde} AND ${hasta}
          AND u.activo=true
          AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY pl.jugador_id, DATE_TRUNC('month',pl.fecha)`,
  ])

  // Calcular duración total de sesiones del calendario y por mes
  let sesionesCalCount = 0
  let minSesionesCal = 0
  const minSesionesPorMes: Record<string, number> = {}

  for (const ses of sesionesCalendario as any[]) {
    const ejercicios = Array.isArray(ses.ejercicios) ? ses.ejercicios : []
    let duracion = calcDuracionSesion(ejercicios)
    if (duracion === 0 && ses.hora_inicio && ses.hora_fin) {
      const [hi, hm] = ses.hora_inicio.slice(0, 5).split(':').map(Number)
      const [fi, fm] = ses.hora_fin.slice(0, 5).split(':').map(Number)
      const diff = (fi * 60 + fm) - (hi * 60 + hm)
      if (diff > 0) duracion = diff
    }
    if (duracion === 0) duracion = 90
    sesionesCalCount++
    minSesionesCal += duracion
    const mes = ses.fecha.slice(0, 7)
    minSesionesPorMes[mes] = (minSesionesPorMes[mes] || 0) + duracion
  }

  const mm: Record<number, any> = {}
  for (const r of match as any[]) mm[r.jugador_id] = { min_partido: r.min_partido, partidos: r.partidos }

  const players = (trainLogs as any[]).map(r => {
    const minRpe = Number(r.min_entreno_rpe) || 0
    const sesionesRpe = Number(r.sesiones_rpe) || 0
    const minEntreno = minRpe > 0 ? minRpe : minSesionesCal
    const sesiones = sesionesRpe > 0 ? sesionesRpe : sesionesCalCount
    const fuenteEntreno = minRpe > 0 ? 'rpe' : 'calendario'
    const minPartido = mm[r.jugador_id]?.min_partido || 0
    const partidos = mm[r.jugador_id]?.partidos || 0
    return {
      jugador_id: r.jugador_id,
      nombre: String(r.nombre),
      posicion: String(r.posicion || ''),
      min_entreno: minEntreno,
      sesiones,
      fuente_entreno: fuenteEntreno,
      min_partido: minPartido,
      partidos,
      min_total: minEntreno + minPartido,
    }
  }).sort((a, b) => b.min_total - a.min_total)

  // Bimestres: combinar RPE logs con estimados de calendario para jugadores sin RPE
  const jugadoresConRpe = new Set((bimTLogs as any[]).map((r: any) => r.jugador_id))
  const bimCalRows: any[] = []
  for (const jugador of (trainLogs as any[])) {
    if (!jugadoresConRpe.has(jugador.jugador_id)) {
      for (const [mes, minutos] of Object.entries(minSesionesPorMes)) {
        bimCalRows.push({ jugador_id: jugador.jugador_id, mes, min_entreno: minutos })
      }
    }
  }

  const bimT = [...(bimTLogs as any[]), ...bimCalRows]
  const months = Array.from(new Set([...bimT, ...(bimM as any[])].map((r: any) => r.mes))).sort() as string[]
  const bimestres: string[] = []
  for (let i = 0; i < months.length; i += 2) {
    bimestres.push(months[i] + (months[i + 1] ? '/' + months[i + 1] : ''))
  }

  return NextResponse.json({ players, bimestres, bimRows: bimT, bimMatch: bimM }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  })
}
