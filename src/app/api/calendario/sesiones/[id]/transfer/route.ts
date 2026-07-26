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
    const sesionId = Number(params.id)
    const targetClubId = Number(target_club_id)

    if (!sesionId || !targetClubId) {
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

    // Actualizar el club_id de la sesión (microciclo o sesión individual)
    await sql`UPDATE sesiones_plan SET club_id = ${targetClubId} WHERE id = ${sesionId}`

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[transfer sesion error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
