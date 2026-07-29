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
    const usuarioId = Number(params.id)
    const targetClubId = Number(target_club_id)

    if (!usuarioId || !targetClubId) {
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

    // Buscamos el jugador asociado al usuario
    const jug = await sql`SELECT id FROM jugadores WHERE usuario_id = ${usuarioId}`
    if (jug.length === 0) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }
    const jugadorId = jug[0].id

    // Transferir al jugador y todo su historial de datos al nuevo club.
    // 1. Entidades base
    await sql`UPDATE jugadores SET club_id = ${targetClubId} WHERE id = ${jugadorId}`
    if (usuarioId) {
      await sql`UPDATE usuarios SET club_id = ${targetClubId} WHERE id = ${usuarioId}`
    }

    // 2. We don't need to update logs tables, as they don't have a club_id column.
    // They are associated via jugador_id, so they will automatically follow the player.

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[transfer player error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
