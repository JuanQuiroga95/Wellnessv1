export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

/**
 * POST /api/gps/repair-sesiones
 *
 * Migrates orphan sesiones_plan rows — those created by this admin
 * before the club was assigned (club_id IS NULL) — to the current club_id.
 *
 * This fixes "ghost sessions" that still appear in old queries using
 * (admin_id = X OR club_id = Y) but should now be owned by the club.
 *
 * Safe to call multiple times (idempotent — only touches club_id IS NULL rows).
 */
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const clubId = s.clubId ? Number(s.clubId) : null
    if (!clubId) {
      return NextResponse.json({ error: 'Este admin no tiene club asignado' }, { status: 400 })
    }

    const sql = getDb()

    // 1. Count orphans before repair (for reporting)
    let orphanCount = 0
    try {
      const [row] = await sql`
        SELECT COUNT(*)::int AS n
        FROM sesiones_plan
        WHERE admin_id = ${s.userId}
          AND club_id IS NULL
      ` as any[]
      orphanCount = row?.n ?? 0
    } catch {
      return NextResponse.json({ ok: true, repaired: 0, note: 'sesiones_plan table not found' })
    }

    if (orphanCount === 0) {
      return NextResponse.json({ ok: true, repaired: 0, note: 'No hay sesiones huérfanas' })
    }

    // 2. Migrate all orphan rows to the current club_id
    await sql`
      UPDATE sesiones_plan
      SET club_id = ${clubId}
      WHERE admin_id = ${s.userId}
        AND club_id IS NULL
    `

    return NextResponse.json({
      ok: true,
      repaired: orphanCount,
      club_id: clubId,
      note: `${orphanCount} sesión(es) migrada(s) al club ${clubId}`,
    })

  } catch (err) {
    console.error('[gps/repair-sesiones POST error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
