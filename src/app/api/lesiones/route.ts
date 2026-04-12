export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const {searchParams} = new URL(req.url)
  const activas = searchParams.get('activas')!=='false'
  const jugadorId = searchParams.get('jugador_id') ? Number(searchParams.get('jugador_id')) : null
  const historialResumen = searchParams.get('historial_resumen') === 'true'
  const clubId = s.clubId ? Number(s.clubId) : null
  const isMaster = s.rol === 'master_admin' && !s.clubId
  const sql = getDb()

  // Seguridad: si no es master y no tiene clubId, no puede ver datos de otros clubes
  if (!isMaster && !clubId) return NextResponse.json([])

  // Resumen acumulativo por jugador (para tabla de historial en enfermería)
  if (historialResumen) {
    const rows = await sql`
      SELECT
        j.id AS jugador_id,
        u.nombre,
        COUNT(l.id)::int AS total_lesiones,
        COALESCE(SUM(
          (COALESCE(l.fecha_alta::date, CURRENT_DATE) - l.fecha_inicio::date)
        ), 0)::int AS dias_totales,
        MAX(l.fecha_inicio)::text AS ultima_lesion
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      LEFT JOIN lesiones l ON l.jugador_id = j.id
      WHERE (${isMaster}::boolean OR (u.club_id = ${clubId} AND j.club_id = ${clubId}))
        AND u.activo = true
      GROUP BY j.id, u.nombre
      HAVING COUNT(l.id) > 0
      ORDER BY dias_totales DESC
    `
    return NextResponse.json(rows)
  }

  // Historial de un jugador específico (todos sus registros, activos o no)
  if (jugadorId) {
    const r = await sql`SELECT l.id,l.jugador_id::int,l.fecha_inicio::text,l.fecha_alta::text,l.tipo_lesion,l.zona,
                               l.descripcion,l.eta_dias::int,l.estado,l.activa,u.nombre AS jugador_nombre,j.posicion
                        FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id JOIN usuarios u ON u.id=j.usuario_id
                        WHERE l.jugador_id=${jugadorId} AND (${isMaster}::boolean OR u.club_id=${clubId})
                        ORDER BY l.fecha_inicio DESC`
    return NextResponse.json(r)
  }

  const r = activas
    ? await sql`SELECT l.id,l.jugador_id::int,l.fecha_inicio::text,l.fecha_alta::text,l.tipo_lesion,l.zona,
                       l.descripcion,l.eta_dias::int,l.estado,l.activa,u.nombre AS jugador_nombre,j.posicion
                FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id JOIN usuarios u ON u.id=j.usuario_id
                WHERE l.activa=true AND u.activo=true AND (${isMaster}::boolean OR u.club_id=${clubId}) ORDER BY l.fecha_inicio DESC`
    : await sql`SELECT l.id,l.jugador_id::int,l.fecha_inicio::text,l.fecha_alta::text,l.tipo_lesion,l.zona,
                       l.descripcion,l.eta_dias::int,l.estado,l.activa,u.nombre AS jugador_nombre,j.posicion
                FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id JOIN usuarios u ON u.id=j.usuario_id
                WHERE u.activo=true AND u.club_id=${clubId} ORDER BY l.fecha_inicio DESC`
  return NextResponse.json(r)
}
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req); if(!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const {jugador_id,fecha_inicio,tipo_lesion,zona,descripcion,eta_dias,estado} = await req.json()
  const sql = getDb(); const d = fecha_inicio||new Date().toISOString().split('T')[0]
  const [r] = await sql`INSERT INTO lesiones(jugador_id,fecha_inicio,tipo_lesion,zona,descripcion,eta_dias,estado,activa,club_id)
    VALUES(${jugador_id},${d},${tipo_lesion||null},${zona||null},${descripcion||null},${eta_dias||null},${estado||'Tratamiento'},true,${s.clubId??null})
    RETURNING id`
  return NextResponse.json(r)
}
export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { id, estado, activa, fecha_alta, eta_dias } = await req.json()
  const sql = getDb()

  try {
    if (estado !== undefined) {
      await sql`UPDATE lesiones SET estado = ${estado} WHERE id = ${id}`
    }

    if (activa !== undefined) {
      if (activa === false) {
        const alta = fecha_alta || new Date().toISOString().split('T')[0]
        await sql`UPDATE lesiones SET activa = false, fecha_alta = ${alta}, estado = 'Alta' WHERE id = ${id}`
      } else {
        await sql`UPDATE lesiones SET activa = true, fecha_alta = null, estado = 'Tratamiento' WHERE id = ${id}`
      }
    }

    if (eta_dias !== undefined) {
      await sql`UPDATE lesiones SET eta_dias = ${eta_dias} WHERE id = ${id}`
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('PATCH lesiones error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
