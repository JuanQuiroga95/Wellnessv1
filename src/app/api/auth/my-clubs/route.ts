export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

/**
 * GET /api/auth/my-clubs
 * Returns the list of clubs the authenticated coach has access to.
 * Used by the Topbar to render the club selector.
 */
export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // Only admins (coaches) can have multiple clubs
    if (s.rol !== 'admin' && s.rol !== 'master_admin') {
      return NextResponse.json([])
    }

    const sql = getDb()

    // Ensure admin_clubs table exists (graceful fallback for pre-migration)
    let clubs: any[] = []
    try {
      if (s.rol === 'master_admin') {
        clubs = await sql`
          SELECT id, nombre, logo_url, pais,
                 (id = ${s.clubId || 0}) AS is_active
          FROM clubs
          ORDER BY nombre`
      } else {
        clubs = await sql`
          SELECT c.id, c.nombre, c.logo_url, c.pais,
                 (c.id = ${s.clubId || 0}) AS is_active
          FROM clubs c
          JOIN usuarios u ON (c.id = ANY(u.admin_clubs) OR c.id = ANY(u.club_ids))
          WHERE u.id = ${s.userId}
          ORDER BY c.nombre`
      }
    } catch {
      // Table doesn't exist yet — fallback to single club from JWT
      if (s.clubId) {
        try {
          const fallback = await sql`SELECT id, nombre, logo_url, pais FROM clubs WHERE id = ${s.clubId} LIMIT 1`
          if (fallback.length > 0) {
            clubs = [{ ...fallback[0], is_active: true }]
          }
        } catch {}
      }
    }

    return NextResponse.json(clubs.map(c => ({
      id: Number(c.id),
      nombre: String(c.nombre || ''),
      logo_url: c.logo_url ? String(c.logo_url) : null,
      pais: c.pais ? String(c.pais) : null,
      is_active: !!c.is_active,
    })))
  } catch (err) {
    console.error('[my-clubs error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
