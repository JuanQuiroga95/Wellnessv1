export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const jugadorId = Number(req.nextUrl.searchParams.get('jugador_id'))
  if (!jugadorId) return NextResponse.json({ error: 'jugador_id requerido' }, { status: 400 })
  const sql = getDb()
  try {
    const clubId = s.clubId ? Number(s.clubId) : null
    let sesiones
    if (clubId) {
      sesiones = await sql`
        SELECT * FROM pfv_sesiones
        WHERE jugador_id = ${jugadorId} AND club_id = ${clubId}
        ORDER BY fecha DESC, id DESC`
    } else {
      sesiones = await sql`
        SELECT * FROM pfv_sesiones
        WHERE jugador_id = ${jugadorId}
        ORDER BY fecha DESC, id DESC`
    }
    const result = await Promise.all((sesiones as any[]).map(async (ses: any) => {
      const puntos = await sql`SELECT * FROM pfv_puntos WHERE sesion_id = ${ses.id} ORDER BY carga_kg ASC`
      return {
        sesion_id: ses.id,
        nombre: ses.nombre,
        fecha: ses.fecha,
        puntos: (puntos as any[]).map((p: any) => ({
          id: p.id,
          carga: Number(p.carga_kg),
          vel: Number(p.velocidad_ms || 0),
          altura_salto_m: p.altura_salto_m != null ? Number(p.altura_salto_m) : null,
          notas: p.notas,
        })),
      }
    }))
    return NextResponse.json(result)
  } catch (e: any) {
    if (String(e).includes('does not exist')) return NextResponse.json([])
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const b = await req.json()
  const { jugador_id, sesion_id, fecha, carga_kg, velocidad_ms, altura_salto_m, notas } = b
  if (!jugador_id || !sesion_id || carga_kg == null) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  if (!velocidad_ms && !altura_salto_m) return NextResponse.json({ error: 'Falta velocidad_ms o altura_salto_m' }, { status: 400 })
  const sql = getDb()
  // Verify the sesion belongs to this coach's club
  if (s.clubId) {
    const owns = await sql`SELECT 1 FROM pfv_sesiones WHERE id = ${sesion_id} AND club_id = ${s.clubId} LIMIT 1`
    if (!owns.length) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  try {
    await sql`INSERT INTO pfv_puntos (sesion_id, jugador_id, fecha, carga_kg, velocidad_ms, altura_salto_m, notas)
      VALUES (${sesion_id}, ${jugador_id}, ${fecha}, ${carga_kg}, ${velocidad_ms ?? null}, ${altura_salto_m ?? null}, ${notas ?? null})`
  } catch (e: any) {
    // If altura_salto_m column doesn't exist yet, try without it
    if (String(e).includes('altura_salto_m')) {
      await sql`INSERT INTO pfv_puntos (sesion_id, jugador_id, fecha, carga_kg, velocidad_ms, notas)
        VALUES (${sesion_id}, ${jugador_id}, ${fecha}, ${carga_kg}, ${velocidad_ms ?? null}, ${notas ?? null})`
    } else {
      return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = Number(req.nextUrl.searchParams.get('id'))
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  await sql`DELETE FROM pfv_puntos WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
