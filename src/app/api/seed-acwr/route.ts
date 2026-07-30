export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !s.clubId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const sql = getDb()
  const clubId = s.clubId

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'delete') {
    try {
      await sql`DELETE FROM entrenamiento_logs WHERE sesion_id = -9999`
      return NextResponse.json({ success: true, message: '¡Datos falsos eliminados con éxito!' })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  if (action === 'inject') {
    try {
      const jugadores = await sql`
        SELECT j.id 
        FROM jugadores j 
        JOIN usuarios u ON u.id = j.usuario_id 
        WHERE j.club_id = ${clubId} AND u.activo = true 
        LIMIT 20
      `
      
      // Inject 3 weeks of past data for each player
      for (const j of jugadores) {
        for (let i = 1; i <= 3; i++) {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() - (i * 7));
          const fechaStr = fecha.toISOString().split('T')[0];
          
          const rpe = 5 + Math.floor(Math.random() * 4); // 5 to 8
          const duracion = 60 + Math.floor(Math.random() * 30); // 60 to 90
          const carga_ua = rpe * duracion;

          await sql`
            INSERT INTO entrenamiento_logs (jugador_id, fecha, rpe, duracion_min, carga_ua, tipo_sesion, sesion_id)
            VALUES (${j.id}, ${fechaStr}, ${rpe}, ${duracion}, ${carga_ua}, 'Campo', -9999)
          `
        }
      }
      return NextResponse.json({ success: true, message: '¡Datos falsos inyectados! Refrescá el panel principal para ver el gráfico.' })
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Acción no válida. Usa ?action=inject o ?action=delete' })
}
