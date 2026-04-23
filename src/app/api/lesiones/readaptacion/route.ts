export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// GET: fetch readaptacion checks for a lesion or all active
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const lesionId = req.nextUrl.searchParams.get('lesion_id')
  const all = req.nextUrl.searchParams.get('all')
  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null

  try {
    if (all === 'true') {
      // Fetch all checks for active injuries in this club
      const rows = await sql`
        SELECT rc.*, l.jugador_id, l.fase, l.tipo_lesion, l.zona, l.region_corporal,
               l.lateralidad, l.fecha_inicio, l.eta_dias, l.mecanismo,
               u.nombre AS jugador_nombre, j.posicion
        FROM readaptacion_checks rc
        JOIN lesiones l ON l.id = rc.lesion_id
        JOIN jugadores j ON j.id = l.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        WHERE l.activa = true
          AND (${clubId}::int IS NULL OR l.club_id = ${clubId})
        ORDER BY u.nombre
      `
      return NextResponse.json(rows)
    }

    if (!lesionId) return NextResponse.json({ error: 'Falta lesion_id' }, { status: 400 })

    const rows = await sql`
      SELECT * FROM readaptacion_checks WHERE lesion_id = ${Number(lesionId)}
    `
    return NextResponse.json(rows.length > 0 ? rows[0] : null)
  } catch (e: any) {
    if (String(e).includes('does not exist')) return NextResponse.json(all ? [] : null)
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 })
  }
}

// POST: create or update readaptacion checks for a lesion
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { lesion_id, gimnasio, campo_ind, tecnica, reducido, intermitente, sprint, contacto, con_categ, nota_kinesio } = body

  if (!lesion_id) return NextResponse.json({ error: 'Falta lesion_id' }, { status: 400 })

  const sql = getDb()

  try {
    // Upsert: check if exists
    const existing = await sql`SELECT id FROM readaptacion_checks WHERE lesion_id = ${Number(lesion_id)}`

    if (existing.length > 0) {
      await sql`
        UPDATE readaptacion_checks SET
          gimnasio = ${gimnasio ?? 'pendiente'},
          campo_ind = ${campo_ind ?? 'pendiente'},
          tecnica = ${tecnica ?? 'pendiente'},
          reducido = ${reducido ?? 'pendiente'},
          intermitente = ${intermitente ?? 'pendiente'},
          sprint = ${sprint ?? 'pendiente'},
          contacto = ${contacto ?? 'pendiente'},
          con_categ = ${con_categ ?? 'pendiente'},
          nota_kinesio = ${nota_kinesio ?? null},
          updated_at = NOW()
        WHERE lesion_id = ${Number(lesion_id)}
      `
    } else {
      await sql`
        INSERT INTO readaptacion_checks (lesion_id, gimnasio, campo_ind, tecnica, reducido, intermitente, sprint, contacto, con_categ, nota_kinesio)
        VALUES (${Number(lesion_id)}, ${gimnasio ?? 'pendiente'}, ${campo_ind ?? 'pendiente'}, ${tecnica ?? 'pendiente'},
                ${reducido ?? 'pendiente'}, ${intermitente ?? 'pendiente'}, ${sprint ?? 'pendiente'},
                ${contacto ?? 'pendiente'}, ${con_categ ?? 'pendiente'}, ${nota_kinesio ?? null})
      `
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 })
  }
}
