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
          SELECT id, nombre, logo_url, pais, deporte,
                 (id = COALESCE(${s.clubId ? Number(s.clubId) : 0}, 0)) AS is_active
          FROM clubs
          ORDER BY nombre`
      } else {
        clubs = await sql`
          SELECT c.id, c.nombre, c.logo_url, c.pais, c.deporte,
                 (c.id = COALESCE(${s.clubId ? Number(s.clubId) : 0}, 0)) AS is_active
          FROM clubs c
          JOIN admin_clubs ac ON ac.club_id = c.id
          WHERE ac.admin_id = ${Number(s.userId)}
          ORDER BY c.nombre`
      }
    } catch {
      // Table might not exist yet, try to create it and backfill
      try {
        await sql`CREATE TABLE IF NOT EXISTS admin_clubs (id SERIAL PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(admin_id, club_id))`
        if (s.clubId) {
          await sql`INSERT INTO admin_clubs (admin_id, club_id) VALUES (${Number(s.userId)}, ${Number(s.clubId)}) ON CONFLICT DO NOTHING`
        }
      } catch (e) {
        console.error('Error creando admin_clubs en fallback', e)
      }

      if (s.clubId) {
        try {
          const fallback = await sql`SELECT id, nombre, logo_url, pais, deporte FROM clubs WHERE id = ${Number(s.clubId)} LIMIT 1`
          if (fallback.length > 0) {
            clubs = [{ ...fallback[0], is_active: true }]
          }
        } catch (e) {
          console.error('Error en fallback club', e)
        }
      }
    }

    return NextResponse.json(clubs.map(c => ({
      id: Number(c.id),
      nombre: String(c.nombre || ''),
      logo_url: c.logo_url ? String(c.logo_url) : null,
      pais: c.pais ? String(c.pais) : null,
      deporte: c.deporte ? String(c.deporte) : 'FUTBOL',
      is_active: !!c.is_active,
    })))
  } catch (err) {
    console.error('[my-clubs error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
