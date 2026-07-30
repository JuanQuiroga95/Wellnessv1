export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  const clubId = 11 // Torrellano
  
  const desde = '2026-07-27'
  const hastaInc = '2026-07-28'

  const sesiones = await sql`SELECT id, fecha::text, titulo FROM sesiones_plan WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp ORDER BY fecha`
  
  const logs = await sql`SELECT el.jugador_id, el.fecha::text, el.rpe::int, el.duracion_min::int FROM entrenamiento_logs el JOIN jugadores j ON j.id = el.jugador_id JOIN usuarios u ON u.id = j.usuario_id WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp AND u.activo = true AND (u.club_id = ${clubId} OR j.club_id = ${clubId}) ORDER BY el.fecha`
  
  const rpeByPlayerDate: Record<string, any> = {}
  for (const log of logs as any[]) { 
    rpeByPlayerDate[`${log.jugador_id}_${log.fecha}`] = log 
  }
  
  const perSessionPlayers: Record<string, any[]> = {}
  for (const ses of sesiones) {
    const sesLogs = logs.filter((l: any) => l.fecha === ses.fecha)
    perSessionPlayers[ses.titulo] = {
      sesFecha: ses.fecha,
      matchCount: sesLogs.length,
      exampleKeys: sesLogs.slice(0, 2).map((l:any) => `${l.jugador_id}_${l.fecha}`),
      logsCount: logs.length
    }
  }

  return NextResponse.json({
    sesiones,
    logsSample: logs.slice(0, 3),
    rpeByPlayerDateSample: Object.keys(rpeByPlayerDate).slice(0, 3),
    perSessionPlayers
  })
}
