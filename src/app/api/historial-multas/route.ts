import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getSession()
    if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin')) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
    
    const sql = getDb()
    const clubId = session.clubId ? Number(session.clubId) : null
    const isMaster = session.rol === 'master_admin'
    const filterByClub = !isMaster || clubId !== null

  // We will pull data for the last 30 days
  const dias = 30
  
  // 1. Get active players
  const players = await (filterByClub 
    ? sql`SELECT u.nombre, j.id as jugador_id
          FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id
          WHERE u.rol='jugador' AND u.activo=true AND u.club_id=${clubId} ORDER BY u.nombre`
    : sql`SELECT u.nombre, j.id as jugador_id
          FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id
          WHERE u.rol='jugador' AND u.activo=true ORDER BY u.nombre`)

  const playerIds = players.map((p: any) => p.jugador_id)
  
  if (playerIds.length === 0) {
    return new NextResponse('No hay jugadores activos', { status: 400 })
  }

  // 2. Get wellness logs for the last 30 days
  const wellness = await sql`
    SELECT jugador_id::int, fecha::text
    FROM wellness_logs
    WHERE jugador_id IN (SELECT unnest(${playerIds}::int[]))
      AND fecha::date >= CURRENT_DATE - INTERVAL '30 days'
  `

  // 3. Get RPE logs for the last 30 days
  // Consider RPE answered if they have an entry in entrenamiento_logs
  // Note: we just check if it exists for the date.
  const rpeLogs = await sql`
    SELECT jugador_id::int, fecha::text
    FROM entrenamiento_logs
    WHERE jugador_id IN (SELECT unnest(${playerIds}::int[]))
      AND fecha::date >= CURRENT_DATE - INTERVAL '30 days'
  `

  // 4. Get training sessions for the last 30 days
  const sesiones = await (filterByClub
    ? sql`SELECT DISTINCT fecha::text FROM sesiones_plan WHERE fecha::date >= CURRENT_DATE - INTERVAL '30 days' AND club_id = ${clubId}`
    : sql`SELECT DISTINCT fecha::text FROM sesiones_plan WHERE fecha::date >= CURRENT_DATE - INTERVAL '30 days'`)

  const sessionDates = new Set(sesiones.map((s: any) => String(s.fecha)))
  
  // 5. Get ausencias (absences) to avoid penalizing absent players
  const ausencias = await sql`
    SELECT jugador_id::int, fecha::text
    FROM ausencias
    WHERE jugador_id IN (SELECT unnest(${playerIds}::int[]))
      AND fecha::date >= CURRENT_DATE - INTERVAL '30 days'
  `.catch(() => [])

  // Create fast lookup maps
  const wellnessMap = new Set(wellness.map((w: any) => `${w.jugador_id}_${w.fecha}`))
  const rpeMap = new Set(rpeLogs.map((r: any) => `${r.jugador_id}_${r.fecha}`))
  const ausenciasMap = new Set((ausencias as any[]).map(a => `${a.jugador_id}_${a.fecha}`))

  // Build CSV
  // Usar BOM y punto y coma (;) para que Excel en español lo abra en columnas automáticamente
  let csv = '\uFEFFJugador;Fecha;Falta\n'

  // Go through the last 30 days
  const today = new Date()
  for (let i = 0; i < dias; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const hasSession = sessionDates.has(dateStr)

    let dayHadFaltas = false

    for (const p of players) {
      const isAbsent = ausenciasMap.has(`${p.jugador_id}_${dateStr}`)
      if (isAbsent) continue // Skip absent players

      // Solo reportar faltas en días donde SÍ hubo sesión (hasSession = true)
      const missedWellness = hasSession && !wellnessMap.has(`${p.jugador_id}_${dateStr}`)
      const missedRpe = hasSession && !rpeMap.has(`${p.jugador_id}_${dateStr}`)

      if (missedWellness) {
        csv += `"${p.nombre}";"${dateStr}";"Wellness"\n`
        dayHadFaltas = true
      }
      if (missedRpe) {
        csv += `"${p.nombre}";"${dateStr}";"RPE"\n`
        dayHadFaltas = true
      }
    }
    
    // Dejar un espacio en blanco después de cada día que tuvo faltas para que sea más legible
    if (dayHadFaltas && i < dias - 1) {
      csv += '\n'
    }
  }

    // Return as downloadable file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="historial_faltas.csv"',
      },
    })
  } catch (error: any) {
    console.error('Error in historial-multas:', error)
    return new NextResponse(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500 })
  }
}
