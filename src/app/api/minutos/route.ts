export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const {searchParams} = new URL(req.url)
  const desde = searchParams.get('desde')||'2024-01-01'
  const hasta = searchParams.get('hasta')||new Date().toISOString().split('T')[0]
  const clubId = s.clubId ?? null
  const isMaster = s.rol === 'master_admin'
  const sql = getDb()
  const [train, match, sesionPartidos, bimT, bimM] = await Promise.all([
    sql`SELECT j.id AS jugador_id,u.nombre,j.posicion,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno,
               COUNT(e.id)::int AS sesiones
        FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
        LEFT JOIN entrenamiento_logs e ON e.jugador_id=j.id AND e.fecha BETWEEN ${desde} AND ${hasta}
        WHERE u.rol='jugador' AND u.activo=true AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY j.id,u.nombre,j.posicion`,
    sql`SELECT pl.jugador_id::int, COALESCE(SUM(pl.minutos),0)::int AS min_partido, COUNT(pl.id)::int AS partidos
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha BETWEEN ${desde} AND ${hasta} AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY pl.jugador_id`,
    // Partidos registrados en el Calendario (sesiones_plan tipo='partido')
    // Se calculan los minutos desde hora_inicio/hora_fin y se distribuyen a todos los jugadores del club
    sql`SELECT
          EXTRACT(EPOCH FROM (hora_fin::time - hora_inicio::time))/60 AS min_partido,
          club_id,
          COUNT(*)::int AS partidos_count
        FROM sesiones_plan
        WHERE tipo = 'partido'
          AND fecha BETWEEN ${desde} AND ${hasta}
          AND hora_inicio IS NOT NULL AND hora_fin IS NOT NULL
          AND (${isMaster}::boolean OR club_id = ${clubId})
        GROUP BY club_id, hora_fin, hora_inicio`,
    sql`SELECT e.jugador_id::int, TO_CHAR(DATE_TRUNC('month',e.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno
        FROM entrenamiento_logs e
        JOIN jugadores j ON j.id=e.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE e.fecha BETWEEN ${desde} AND ${hasta} AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY e.jugador_id,DATE_TRUNC('month',e.fecha)`,
    sql`SELECT pl.jugador_id::int, TO_CHAR(DATE_TRUNC('month',pl.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(pl.minutos),0)::int AS min_partido
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha BETWEEN ${desde} AND ${hasta} AND (${isMaster}::boolean OR u.club_id=${clubId})
        GROUP BY pl.jugador_id,DATE_TRUNC('month',pl.fecha)`,
  ])

  // Minutos de partidos desde partido_logs (registros manuales por jugador)
  const mm: Record<number,any> = {}
  for (const r of match as any[]) mm[r.jugador_id]={min_partido:r.min_partido,partidos:r.partidos}

  // Minutos de partidos desde sesiones_plan (partidos del calendario con hora_inicio/hora_fin)
  // Se suman a todos los jugadores del mismo club
  const sesionMinPorClub: Record<number,{min:number,count:number}> = {}
  for (const r of sesionPartidos as any[]) {
    const cid = Number(r.club_id)
    const min = Math.round(Math.max(0, Number(r.min_partido) || 0))
    const count = Number(r.partidos_count) || 1
    if (!sesionMinPorClub[cid]) sesionMinPorClub[cid] = { min: 0, count: 0 }
    sesionMinPorClub[cid].min += min * count
    sesionMinPorClub[cid].count += count
  }

  const players = (train as any[]).map(r => {
    const extraMin = sesionMinPorClub[Number(clubId)]?.min || 0
    const extraCount = sesionMinPorClub[Number(clubId)]?.count || 0
    const partidoLogMin = mm[r.jugador_id]?.min_partido || 0
    const partidoLogCount = mm[r.jugador_id]?.partidos || 0
    const totalMin = partidoLogMin + extraMin
    const totalCount = partidoLogCount + extraCount
    return {
      jugador_id: r.jugador_id, nombre: String(r.nombre), posicion: String(r.posicion||''),
      min_entreno: Number(r.min_entreno), sesiones: Number(r.sesiones),
      min_partido: totalMin, partidos: totalCount,
      min_total: Number(r.min_entreno) + totalMin
    }
  }).sort((a,b)=>b.min_total-a.min_total)

  const months=[...new Set([...bimT,...bimM].map((r:any)=>r.mes))].sort() as string[]
  const bimestres: string[]=[]
  for(let i=0;i<months.length;i+=2) bimestres.push(months[i]+(months[i+1]?'/'+months[i+1]:''))
  return NextResponse.json({players,bimestres,bimRows:bimT,bimMatch:bimM})
}
