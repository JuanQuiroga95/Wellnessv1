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
    await sql`UPDATE usuarios SET password_hash = ${h} WHERE id = ${userId}`
  }

  if (b.foto_url !== undefined) {
    await sql`UPDATE jugadores SET foto_url = ${b.foto_url || null} WHERE usuario_id = ${userId}`
  }

  // Update jugador fields
  const fields = ['posicion','edad','peso_kg','estatura_cm','pie_habil','email','fecha_nacimiento','hora_recordatorio']
  if (fields.some(f => b[f] !== undefined)) {
    await sql`UPDATE jugadores SET
      posicion          = COALESCE(${b.posicion ?? null}, posicion),
      edad              = COALESCE(${sanitizeInt(b.edad, 0, 150)}, edad),
      peso_kg           = COALESCE(${b.peso_kg ?? null}, peso_kg),
      estatura_cm       = COALESCE(${sanitizeInt(b.estatura_cm, 0, 300)}, estatura_cm),
      pie_habil         = COALESCE(${b.pie_habil ?? null}, pie_habil),
      email             = COALESCE(${sanitizeString(b.email, 200)}, email),
      fecha_nacimiento  = COALESCE(${b.fecha_nacimiento ?? null}, fecha_nacimiento),
      hora_recordatorio = COALESCE(${b.hora_recordatorio ?? null}, hora_recordatorio)
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

  await sql`DELETE FROM usuarios WHERE id = ${userId} AND rol = 'jugador' AND club_id = ${s.clubId ?? null}`
  return NextResponse.json({ ok: true })
}
