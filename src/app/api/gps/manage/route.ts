export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

/**
 * GET /api/gps/manage?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Lists GPS import history grouped by fecha + tipo_sesion.
 * Allows admins to see what's been imported and how many players per batch.
 */
export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (!clubId) {
      return NextResponse.json({ error: 'Se requiere club para gestionar GPS' }, { status: 400 })
    }

    // Default range: last 90 days
    const now = new Date()
    const defaultHasta = now.toISOString().split('T')[0]
    const defaultDesde = new Date(now.setDate(now.getDate() - 90)).toISOString().split('T')[0]

    const desde = searchParams.get('desde') || defaultDesde
    const hasta = searchParams.get('hasta') || defaultHasta

    // Summary: one row per fecha + tipo_sesion batch
    let batches: any[] = []
    try {
      batches = await sql`
        SELECT
          fecha::text,
          tipo_sesion,
          COUNT(DISTINCT jugador_id)::int    AS n_jugadores,
          COUNT(*)::int                       AS n_registros,
          ROUND(AVG(distancia_total)::numeric, 1)::float AS avg_distancia,
          ROUND(AVG(velocidad_max)::numeric, 1)::float   AS avg_vel_max,
          MIN(created_at)::text               AS importado_en
        FROM gps_logs
        WHERE club_id = ${clubId}
          AND fecha BETWEEN ${desde}::date AND ${hasta}::date
        GROUP BY fecha, tipo_sesion
        ORDER BY fecha DESC, tipo_sesion
      ` as any[]
    } catch {
      // gps_logs table may not exist yet
      return NextResponse.json({ batches: [], desde, hasta })
    }

    return NextResponse.json({ batches, desde, hasta })

  } catch (err) {
    console.error('[gps/manage GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

/**
 * DELETE /api/gps/manage
 * Body: { fecha: 'YYYY-MM-DD', tipo_sesion: string }
 * Deletes all gps_logs for the given club + fecha + tipo_sesion batch.
 *
 * Body: { fecha: 'YYYY-MM-DD' }   (no tipo_sesion)
 * Deletes ALL gps_logs for that date (all sessions on that day).
 */
export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (!clubId) {
      return NextResponse.json({ error: 'Se requiere club para gestionar GPS' }, { status: 400 })
    }

    const body = await req.json()
    const { fecha, tipo_sesion } = body

    if (!fecha) {
      return NextResponse.json({ error: 'fecha requerida' }, { status: 400 })
    }

    let deleted: number

    try {
      if (tipo_sesion) {
        // Delete specific batch: fecha + tipo_sesion
        const result = await sql`
          DELETE FROM gps_logs
          WHERE club_id = ${clubId}
            AND fecha = ${fecha}::date
            AND tipo_sesion = ${tipo_sesion}
          RETURNING id
        ` as any[]
        deleted = result.length
      } else {
        // Delete all batches for this date
        const result = await sql`
          DELETE FROM gps_logs
          WHERE club_id = ${clubId}
            AND fecha = ${fecha}::date
          RETURNING id
        ` as any[]
        deleted = result.length
      }
    } catch (err) {
      console.error('[gps/manage DELETE query error]', err)
      return NextResponse.json({ error: `Error al borrar: ${String(err)}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deleted, fecha, tipo_sesion: tipo_sesion || null })

  } catch (err) {
    console.error('[gps/manage DELETE error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
