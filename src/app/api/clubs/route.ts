export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isMaster(s: any) { return s?.rol === 'master_admin' }

async function ensurePaisColumn(sql: any) {
  try { await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS pais VARCHAR(100)` } catch(_) {}
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  await ensurePaisColumn(sql)
  try {
    const clubs = await sql`
      SELECT c.id, c.nombre, c.logo_url, c.pais, c.created_at::text,
             COUNT(DISTINCT CASE WHEN u.rol='admin' THEN u.id END)::int AS coaches,
             COUNT(DISTINCT CASE WHEN u.rol='jugador' THEN u.id END)::int AS jugadores
      FROM clubs c
      LEFT JOIN usuarios u ON u.club_id=c.id AND u.activo=true
      GROUP BY c.id ORDER BY c.nombre`
    return NextResponse.json(clubs)
  } catch(e: any) {
    return NextResponse.json({error: String(e)}, {status:500})
  }
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { nombre, logo_url, pais } = await req.json()
  if (!nombre) return NextResponse.json({error:'Nombre requerido'},{status:400})
  const sql = getDb()
  await ensurePaisColumn(sql)
  const [club] = await sql`
    INSERT INTO clubs(nombre,logo_url,pais)
    VALUES(${nombre},${logo_url||null},${pais||null})
    RETURNING id,nombre,logo_url,pais`
  return NextResponse.json(club)
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { id, nombre, logo_url, pais } = await req.json()
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  const sql = getDb()
  await ensurePaisColumn(sql)
  try {
    if (nombre !== undefined) await sql`UPDATE clubs SET nombre=${nombre} WHERE id=${id}`
    if (logo_url !== undefined) await sql`UPDATE clubs SET logo_url=${logo_url||null} WHERE id=${id}`
    if (pais !== undefined) await sql`UPDATE clubs SET pais=${pais||null} WHERE id=${id}`
    return NextResponse.json({ok:true})
  } catch(e: any) {
    return NextResponse.json({error: String(e)},{status:500})
  }
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  const sql = getDb()
  try {
    // Delete in dependency order to avoid FK constraint violations
    // 1. Logs and data tied to jugadores of this club
    await sql`DELETE FROM wellness_logs      WHERE club_id = ${id}`
    await sql`DELETE FROM entrenamiento_logs WHERE club_id = ${id}`
    await sql`DELETE FROM partido_logs       WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${id})`
    await sql`DELETE FROM lesiones           WHERE club_id = ${id}`
    // Evaluaciones tables (best-effort — tables may not exist yet)
    try { await sql`DELETE FROM pesajes          WHERE club_id = ${id}` } catch(_) {}
    try { await sql`DELETE FROM cmj_sessions     WHERE club_id = ${id}` } catch(_) {}
    try { await sql`DELETE FROM iso_sessions     WHERE club_id = ${id}` } catch(_) {}
    try { await sql`DELETE FROM rsi_sessions     WHERE club_id = ${id}` } catch(_) {}
    try { await sql`DELETE FROM dsi_sessions     WHERE club_id = ${id}` } catch(_) {}
    try { await sql`DELETE FROM pfv_sesiones     WHERE club_id = ${id}` } catch(_) {}
    try { await sql`DELETE FROM gps_logs         WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${id})` } catch(_) {}
    // 2. Sesiones del calendario del coach del club
    await sql`DELETE FROM sesiones_plan WHERE club_id = ${id}`
    // 3. Jugadores (usuarios jugador)
    await sql`DELETE FROM usuarios WHERE club_id = ${id} AND rol = 'jugador'`
    await sql`DELETE FROM jugadores WHERE club_id = ${id}`
    // 4. Coaches (admin usuarios) of this club
    await sql`DELETE FROM usuarios WHERE club_id = ${id} AND rol = 'admin'`
    // 5. Finally delete the club
    await sql`DELETE FROM clubs WHERE id = ${id}`
    return NextResponse.json({ok:true})
  } catch(e: any) {
    console.error('[clubs DELETE error]', e)
    return NextResponse.json({error: String(e)},{status:500})
  }
}
