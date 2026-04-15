export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }
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
  const s = await getSessionFromRequest(req); if(!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const {searchParams} = new URL(req.url)
  const desde = searchParams.get('desde')||'2024-01-01'
  const hasta = searchParams.get('hasta')||localToday()
  // hastaInc: +1 día para inclusividad total del día "hasta" con el driver Neon
  const hastaInc = (() => {
    const d = new Date(hasta + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() + 1)
    return d.toISOString().split('T')[0]
  })()
  const clubId = s.clubId ? Number(s.clubId) : null
  const isMaster = s.rol === 'master_admin' && !s.clubId
  const sql = getDb()

  // Seguridad: si no es master y no tiene clubId, no puede ver datos
  if (!isMaster && !clubId) return NextResponse.json([])

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

  const [train,match,bimT,bimM] = await Promise.all([
    sql`SELECT j.id AS jugador_id,u.nombre,j.posicion,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno,
               COUNT(e.id)::int AS sesiones
        FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
        LEFT JOIN entrenamiento_logs e ON e.jugador_id=j.id AND e.fecha >= ${desde}::date AND e.fecha < ${hastaInc}::date
        WHERE u.rol='jugador' AND u.activo=true
          AND (${isMaster}::boolean OR u.club_id=${clubId} OR j.club_id=${clubId})
        GROUP BY j.id,u.nombre,j.posicion`,
    sql`SELECT pl.jugador_id::int, COALESCE(SUM(pl.minutos),0)::int AS min_partido, COUNT(pl.id)::int AS partidos
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha >= ${desde}::date AND pl.fecha < ${hastaInc}::date
          AND u.activo=true
          AND (${isMaster}::boolean OR ((u.club_id=${clubId} OR j.club_id=${clubId}) AND (pl.club_id IS NULL OR pl.club_id=${clubId})))
        GROUP BY pl.jugador_id`,
    sql`SELECT e.jugador_id::int, TO_CHAR(DATE_TRUNC('month',e.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno
        FROM entrenamiento_logs e
        JOIN jugadores j ON j.id=e.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE e.fecha >= ${desde}::date AND e.fecha < ${hastaInc}::date
          AND u.activo=true
          AND (${isMaster}::boolean OR u.club_id=${clubId} OR j.club_id=${clubId})
        GROUP BY e.jugador_id,DATE_TRUNC('month',e.fecha)`,
    sql`SELECT pl.jugador_id::int, TO_CHAR(DATE_TRUNC('month',pl.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(pl.minutos),0)::int AS min_partido
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha >= ${desde}::date AND pl.fecha < ${hastaInc}::date
          AND u.activo=true
          AND (${isMaster}::boolean OR ((u.club_id=${clubId} OR j.club_id=${clubId}) AND (pl.club_id IS NULL OR pl.club_id=${clubId})))
        GROUP BY pl.jugador_id,DATE_TRUNC('month',pl.fecha)`,
  ])
  const mm: Record<number,any> = {}
  for (const r of match as any[]) mm[r.jugador_id]={min_partido:r.min_partido,partidos:r.partidos}
  const players = (train as any[]).map(r=>({
    jugador_id:r.jugador_id, nombre:String(r.nombre), posicion:String(r.posicion||''),
    min_entreno:Number(r.min_entreno), sesiones:Number(r.sesiones),
    min_partido:mm[r.jugador_id]?.min_partido||0, partidos:mm[r.jugador_id]?.partidos||0,
    min_total:Number(r.min_entreno)+(mm[r.jugador_id]?.min_partido||0)
  })).sort((a,b)=>b.min_total-a.min_total)
  const months=[...new Set([...bimT,...bimM].map((r:any)=>r.mes))].sort() as string[]
  const bimestres: string[]=[]
  for(let i=0;i<months.length;i+=2) bimestres.push(months[i]+(months[i+1]?'/'+months[i+1]:''))
  return NextResponse.json({players,bimestres,bimRows:bimT,bimMatch:bimM})
}
