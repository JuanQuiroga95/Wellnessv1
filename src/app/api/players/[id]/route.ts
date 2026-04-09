export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { sanitizeString, sanitizeInt } from '@/lib/security'
import bcrypt from 'bcryptjs'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

async function verifyPlayerInClub(sql: any, userId: number, clubId: number | null | undefined): Promise<boolean> {
  if (!clubId) return false
  const rows = await sql`SELECT 1 FROM usuarios WHERE id = ${userId} AND club_id = ${clubId} AND rol = 'jugador' LIMIT 1`
  return rows.length > 0
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const userId = sanitizeInt(params.id, 1, 9999999)
  if (!userId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const sql = getDb()

  // Verify the player belongs to this coach's club
  if (!(await verifyPlayerInClub(sql, userId, s.clubId))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const b = await req.json()

  if (b.activo !== undefined) {
    await sql`UPDATE usuarios SET activo = ${!!b.activo} WHERE id = ${userId}`
  }

  if (b.nombre) {
    const nombre = sanitizeString(b.nombre, 100)
    if (nombre && nombre.length >= 2) {
      await sql`UPDATE usuarios SET nombre = ${nombre} WHERE id = ${userId}`
    }
  }

  if (b.password) {
    const pwd = sanitizeString(b.password, 200)
    if (!pwd || pwd.length < 6) return NextResponse.json({ error: 'Contraseña muy corta' }, { status: 400 })
    const h = await bcrypt.hash(pwd, 12)
    try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_plain TEXT` } catch {}
    await sql`UPDATE usuarios SET password_hash = ${h}, password_plain = ${pwd} WHERE id = ${userId}`
  }

  if (b.foto_url !== undefined) {
    await sql`UPDATE jugadores SET foto_url = ${b.foto_url || null} WHERE usuario_id = ${userId}`
  }

  // Update jugador fields
  const fields = ['posicion','edad','peso_kg','estatura_cm','pie_habil','email','fecha_nacimiento','hora_recordatorio','peso_ideal_min','peso_ideal_max']
  if (fields.some(f => b[f] !== undefined)) {
    await sql`UPDATE jugadores SET
      posicion          = COALESCE(${b.posicion ?? null}, posicion),
      edad              = COALESCE(${sanitizeInt(b.edad, 0, 150)}, edad),
      peso_kg           = COALESCE(${b.peso_kg ?? null}, peso_kg),
      estatura_cm       = COALESCE(${sanitizeInt(b.estatura_cm, 0, 300)}, estatura_cm),
      pie_habil         = COALESCE(${b.pie_habil ?? null}, pie_habil),
      email             = COALESCE(${sanitizeString(b.email, 200)}, email),
      fecha_nacimiento  = COALESCE(${b.fecha_nacimiento ?? null}, fecha_nacimiento),
      hora_recordatorio = COALESCE(${b.hora_recordatorio ?? null}, hora_recordatorio),
      peso_ideal_min    = ${b.peso_ideal_min != null ? b.peso_ideal_min : null},
      peso_ideal_max    = ${b.peso_ideal_max != null ? b.peso_ideal_max : null}
      WHERE usuario_id = ${userId}`
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const userId = sanitizeInt(params.id, 1, 9999999)
  if (!userId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const sql = getDb()

  // Verify ownership before deleting
  if (!(await verifyPlayerInClub(sql, userId, s.clubId))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  // Get ALL jugador rows for this user (defensive: avoids leaving orphan rows)
  const jugRows = await sql`SELECT id FROM jugadores WHERE usuario_id = ${userId}`

  for (const jug of jugRows as any[]) {
    const jugadorId = jug.id
    // Core logs
    await sql`DELETE FROM wellness_logs      WHERE jugador_id = ${jugadorId}`
    await sql`DELETE FROM entrenamiento_logs WHERE jugador_id = ${jugadorId}`
    await sql`DELETE FROM partido_logs       WHERE jugador_id = ${jugadorId}`
    await sql`DELETE FROM lesiones           WHERE jugador_id = ${jugadorId}`
    await sql`DELETE FROM gps_logs           WHERE jugador_id = ${jugadorId}`
    // Evaluation tables (belt + suspenders in case FK cascade isn't active)
    try { await sql`DELETE FROM pesajes      WHERE jugador_id = ${jugadorId}` } catch(_) {}
    try { await sql`DELETE FROM cmj_sessions WHERE jugador_id = ${jugadorId}` } catch(_) {}
    try { await sql`DELETE FROM iso_sessions WHERE jugador_id = ${jugadorId}` } catch(_) {}
    try { await sql`DELETE FROM rsi_tests    WHERE jugador_id = ${jugadorId}` } catch(_) {}
    try { await sql`DELETE FROM dsi_tests    WHERE jugador_id = ${jugadorId}` } catch(_) {}
    try { await sql`DELETE FROM pfv_puntos   WHERE jugador_id = ${jugadorId}` } catch(_) {}
    try { await sql`DELETE FROM pfv_sesiones WHERE jugador_id = ${jugadorId}` } catch(_) {}
    await sql`DELETE FROM jugadores WHERE id = ${jugadorId}`
  }

  // FIX: club_id = NULL never matches in SQL — must branch explicitly
  if (s.clubId != null) {
    await sql`DELETE FROM usuarios WHERE id = ${userId} AND rol = 'jugador' AND club_id = ${s.clubId}`
  } else {
    await sql`DELETE FROM usuarios WHERE id = ${userId} AND rol = 'jugador'`
  }
  return NextResponse.json({ ok: true })
}
