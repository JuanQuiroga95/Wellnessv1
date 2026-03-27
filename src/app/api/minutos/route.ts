import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s||s.rol!=='admin') return NextResponse.json({error:'No autorizado'},{status:403})
  const {searchParams} = new URL(req.url)
  const desde = searchParams.get('desde')||'2024-01-01'
  const hasta = searchParams.get('hasta')||new Date().toISOString().split('T')[0]
  const clubId = s.clubId ?? null
  const sql = getDb()
  const [train,match,bimT,bimM] = await Promise.all([
    sql`SELECT j.id AS jugador_id,u.nombre,j.posicion,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno,
               COUNT(e.id)::int AS sesiones
        FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
        LEFT JOIN entrenamiento_logs e ON e.jugador_id=j.id AND e.fecha BETWEEN ${desde} AND ${hasta}
        WHERE u.rol='jugador' AND u.activo=true AND u.club_id=${clubId}
        GROUP BY j.id,u.nombre,j.posicion`,
    sql`SELECT pl.jugador_id::int, COALESCE(SUM(pl.minutos),0)::int AS min_partido, COUNT(pl.id)::int AS partidos
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha BETWEEN ${desde} AND ${hasta} AND u.club_id=${clubId}
        GROUP BY pl.jugador_id`,
    sql`SELECT e.jugador_id::int, TO_CHAR(DATE_TRUNC('month',e.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(e.duracion_min),0)::int AS min_entreno
        FROM entrenamiento_logs e
        JOIN jugadores j ON j.id=e.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE e.fecha BETWEEN ${desde} AND ${hasta} AND u.club_id=${clubId}
        GROUP BY e.jugador_id,DATE_TRUNC('month',e.fecha)`,
    sql`SELECT pl.jugador_id::int, TO_CHAR(DATE_TRUNC('month',pl.fecha),'YYYY-MM') AS mes,
               COALESCE(SUM(pl.minutos),0)::int AS min_partido
        FROM partido_logs pl
        JOIN jugadores j ON j.id=pl.jugador_id
        JOIN usuarios u ON u.id=j.usuario_id
        WHERE pl.fecha BETWEEN ${desde} AND ${hasta} AND u.club_id=${clubId}
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
