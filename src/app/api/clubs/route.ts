export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isMaster(s: any) { return s?.rol === 'master_admin' }

async function ensurePaisColumn(sql: any) {
  try { await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS pais VARCHAR(100)` } catch(_) {}
  try { await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS deporte VARCHAR(20) DEFAULT 'FUTBOL'` } catch(_) {}
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  await ensurePaisColumn(sql)
  try {
    const clubs = await sql`
      SELECT c.id, c.nombre, c.logo_url, c.pais, c.deporte, c.created_at::text,
             COUNT(DISTINCT CASE WHEN u.rol='admin' AND u.activo=true THEN u.id END)::int AS coaches,
             COUNT(DISTINCT CASE WHEN u.rol='jugador' AND u.activo=true THEN u.id END)::int AS jugadores
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
  const { nombre, logo_url, pais, deporte } = await req.json()
  if (!nombre) return NextResponse.json({error:'Nombre requerido'},{status:400})
  const sql = getDb()
  await ensurePaisColumn(sql)
  const [club] = await sql`
    INSERT INTO clubs(nombre,logo_url,pais,deporte)
    VALUES(${nombre},${logo_url||null},${pais||null},${deporte||'FUTBOL'})
    RETURNING id,nombre,logo_url,pais,deporte`
  return NextResponse.json(club)
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { id, nombre, logo_url, pais, deporte } = await req.json()
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  const sql = getDb()
  await ensurePaisColumn(sql)
  try {
    if (nombre !== undefined) await sql`UPDATE clubs SET nombre=${nombre} WHERE id=${id}`
    if (logo_url !== undefined) await sql`UPDATE clubs SET logo_url=${logo_url||null} WHERE id=${id}`
    if (pais !== undefined) await sql`UPDATE clubs SET pais=${pais||null} WHERE id=${id}`
    if (deporte !== undefined) await sql`UPDATE clubs SET deporte=${deporte} WHERE id=${id}`
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
    // Step 1: get all jugador IDs for this club (before deleting anything)
    const jugadores = await sql`SELECT id FROM jugadores WHERE club_id = ${id}`
    const jids = (jugadores as any[]).map(j => j.id)

    // Step 2: delete tables that reference jugador_id or club_id WITHOUT ON DELETE CASCADE
    // (tables with ON DELETE CASCADE will auto-delete when jugadores row is deleted)
    // sesiones_plan references admin (usuario), not jugador — delete separately
    await sql`DELETE FROM sesiones_plan WHERE club_id = ${id}`
    
    // Step 2b: delete canchas and other club-level entities
    try { await sql`DELETE FROM canchas WHERE club_id = ${id}` } catch(_) {}

    // Step 2c: delete invite_tokens linked to users of this club
    try {
      await sql`DELETE FROM invite_tokens WHERE created_by IN (SELECT id FROM usuarios WHERE club_id = ${id})`
      await sql`DELETE FROM invite_tokens WHERE used_by IN (SELECT id FROM usuarios WHERE club_id = ${id})`
    } catch(_) {}

    // Step 2d: delete biblioteca_tareas and club_settings linked to users of this club
    try { await sql`DELETE FROM biblioteca_tareas WHERE admin_id IN (SELECT id FROM usuarios WHERE club_id = ${id})` } catch(_) {}
    try { await sql`DELETE FROM club_settings WHERE admin_id IN (SELECT id FROM usuarios WHERE club_id = ${id})` } catch(_) {}

    // Step 3: delete evaluacion tables that have jugador FK but no cascade on club deletion
    // Most have ON DELETE CASCADE on jugador_id, so they'll clean up automatically.
    // gps_logs may not — delete explicitly
    if (jids.length > 0) {
      try { await sql`DELETE FROM gps_logs WHERE jugador_id = ANY(${jids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM pfv_puntos WHERE jugador_id = ANY(${jids}::int[])` } catch(_) {}
      try { await sql`DELETE FROM pfv_sesiones WHERE jugador_id = ANY(${jids}::int[])` } catch(_) {}
    }

    // Step 4: delete usuarios with rol='jugador' for this club
    // → triggers ON DELETE CASCADE on jugadores
    // → triggers ON DELETE CASCADE on wellness_logs, entrenamiento_logs, partido_logs, lesiones, etc.
    await sql`DELETE FROM usuarios WHERE club_id = ${id} AND rol = 'jugador'`

    // Step 5: delete any orphan jugadores rows still tied to this club
    // (in case jugadores.club_id is set but usuario was already gone)
    await sql`DELETE FROM jugadores WHERE club_id = ${id}`

    // Step 6: Do NOT delete coach/admin usuarios. They might have other clubs or want to be reassigned.
    // We just remove this club from their active club_id. The admin_clubs association is auto-deleted via ON DELETE CASCADE.
    await sql`UPDATE usuarios SET club_id = NULL WHERE club_id = ${id}`


    // Step 8: delete the club itself
    await sql`DELETE FROM clubs WHERE id = ${id}`

    return NextResponse.json({ok:true})
  } catch(e: any) {
    console.error('[clubs DELETE error]', e)
    return NextResponse.json({error: String(e)},{status:500})
  }
}
