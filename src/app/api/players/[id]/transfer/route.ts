export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { target_club_id } = await req.json()
    const jugadorId = Number(params.id)
    const targetClubId = Number(target_club_id)

    if (!jugadorId || !targetClubId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const sql = getDb()

    // Verificamos que el coach tenga acceso al club de destino
    if (s.rol !== 'master_admin') {
      const access = await sql`SELECT 1 FROM admin_clubs WHERE admin_id = ${Number(s.userId)} AND club_id = ${targetClubId}`
      if (access.length === 0) {
        return NextResponse.json({ error: 'No tienes acceso al plantel destino' }, { status: 403 })
      }
    }

    // Buscamos el usuario asociado al jugador
    const jug = await sql`SELECT usuario_id FROM jugadores WHERE id = ${jugadorId}`
    if (jug.length === 0) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }
    const usuarioId = jug[0].usuario_id

    // Transferir al jugador y todo su historial de datos al nuevo club.
    await sql.begin(async (tx) => {
      // 1. Entidades base
      await tx`UPDATE jugadores SET club_id = ${targetClubId} WHERE id = ${jugadorId}`
      if (usuarioId) {
        await tx`UPDATE usuarios SET club_id = ${targetClubId} WHERE id = ${usuarioId}`
      }

      // 2. Logs diarios
      await tx`UPDATE wellness_logs SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE entrenamiento_logs SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE partido_logs SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE lesiones SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE gps_logs SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`

      // 3. Evaluaciones Físicas y Fuerza
      await tx`UPDATE pesajes SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE cmj_sessions SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE iso_sessions SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE pfv_sesiones SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE rsi_tests SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE dsi_tests SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
      await tx`UPDATE fuerza_rutinas SET club_id = ${targetClubId} WHERE jugador_id = ${jugadorId}`
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[transfer player error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
