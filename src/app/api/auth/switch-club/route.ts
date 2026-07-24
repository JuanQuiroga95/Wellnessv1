export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest, createToken } from '@/lib/auth'
import { cookies } from 'next/headers'

/**
 * POST /api/auth/switch-club
 * Switches the active club for a multi-club coach.
 * Re-issues a new JWT with the new clubId/clubNombre.
 * Also updates usuarios.club_id so next login defaults to this club.
 */
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin'))
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { club_id } = await req.json()
    if (!club_id) return NextResponse.json({ error: 'club_id requerido' }, { status: 400 })

    const sql = getDb()
    const clubIdNum = Number(club_id)

    // Verify the coach has access to this club via admin_clubs
    const access = await sql`
      SELECT ac.id, c.nombre AS club_nombre, c.logo_url
      FROM admin_clubs ac
      JOIN clubs c ON c.id = ac.club_id
      WHERE ac.admin_id = ${s.userId} AND ac.club_id = ${clubIdNum}
      LIMIT 1`

    if (access.length === 0) {
      // Admins check their admin_clubs array OR club_ids array
      const hasAccess = await sql`SELECT id FROM usuarios WHERE id = ${s.userId} AND (${clubIdNum} = ANY(admin_clubs) OR ${clubIdNum} = ANY(club_ids))`
      
      if (hasAccess.length > 0) {
        const club = await sql`SELECT nombre FROM clubs WHERE id = ${clubIdNum} LIMIT 1`
        if (club.length === 0) return NextResponse.json({ error: 'Club no existe' }, { status: 404 })
        
        const token = await createToken({
          userId: s.userId,
          usuario: s.usuario,
          nombre: s.nombre,
          rol: s.rol,
          jugadorId: s.jugadorId,
          clubId: clubIdNum,
          clubNombre: String((club[0] as any).nombre),
        })
        cookies().set('wp_token', token, {
          httpOnly: true, secure: true, sameSite: 'strict', maxAge: 604800, path: '/',
        })
        return NextResponse.json({ ok: true, clubId: clubIdNum, clubNombre: String((club[0] as any).nombre) })
      }

      // master_admin can access any club
      if (s.rol === 'master_admin') {
        const club = await sql`SELECT nombre FROM clubs WHERE id = ${clubIdNum} LIMIT 1`
        if (club.length === 0) return NextResponse.json({ error: 'Club no existe' }, { status: 404 })
        
        const token = await createToken({
          userId: s.userId,
          usuario: s.usuario,
          nombre: s.nombre,
          rol: s.rol,
          jugadorId: s.jugadorId,
          clubId: clubIdNum,
          clubNombre: String((club[0] as any).nombre),
        })
        cookies().set('wp_token', token, {
          httpOnly: true, secure: true, sameSite: 'strict', maxAge: 604800, path: '/',
        })
        return NextResponse.json({ ok: true, clubId: clubIdNum, clubNombre: String((club[0] as any).nombre) })
      }
      return NextResponse.json({ error: 'No tenés acceso a este club' }, { status: 403 })
    }

    const clubNombre = String((access[0] as any).club_nombre)

    // Update usuarios.club_id to remember the last selected club
    await sql`UPDATE usuarios SET club_id = ${clubIdNum} WHERE id = ${s.userId}`

    // Issue new JWT with updated clubId
    const token = await createToken({
      userId: s.userId,
      usuario: s.usuario,
      nombre: s.nombre,
      rol: s.rol,
      jugadorId: s.jugadorId,
      clubId: clubIdNum,
      clubNombre,
    })

    cookies().set('wp_token', token, {
      httpOnly: true, secure: true, sameSite: 'strict', maxAge: 604800, path: '/',
    })

    return NextResponse.json({ ok: true, clubId: clubIdNum, clubNombre })
  } catch (err) {
    console.error('[switch-club error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
