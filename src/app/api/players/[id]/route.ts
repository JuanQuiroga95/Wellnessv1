import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()
  const b = await req.json()
  const id = parseInt(params.id)
  if (b.activo !== undefined) await sql`UPDATE usuarios SET activo=${b.activo} WHERE id=${id}`
  if (b.password) {
    const h = await bcrypt.hash(b.password, 12)
    await sql`UPDATE usuarios SET password_hash=${h} WHERE id=${id}`
  }
  if (b.foto_url !== undefined) {
    await sql`UPDATE jugadores SET foto_url=${b.foto_url} WHERE usuario_id=${id}`
  }
  if (b.posicion !== undefined || b.edad !== undefined || b.peso_kg !== undefined || b.estatura_cm !== undefined || b.pie_habil !== undefined || b.email !== undefined || b.fecha_nacimiento !== undefined || b.hora_recordatorio !== undefined) {
    await sql`UPDATE jugadores SET
      posicion=COALESCE(${b.posicion??null},posicion),
      edad=COALESCE(${b.edad??null},edad),
      peso_kg=COALESCE(${b.peso_kg??null},peso_kg),
      estatura_cm=COALESCE(${b.estatura_cm??null},estatura_cm),
      pie_habil=COALESCE(${b.pie_habil??null},pie_habil),
      email=COALESCE(${b.email??null},email),
      fecha_nacimiento=COALESCE(${b.fecha_nacimiento??null},fecha_nacimiento),
      hora_recordatorio=COALESCE(${b.hora_recordatorio??null},hora_recordatorio)
      WHERE usuario_id=${id}`
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()
  await sql`DELETE FROM usuarios WHERE id=${parseInt(params.id)} AND rol='jugador'`
  return NextResponse.json({ ok: true })
}
