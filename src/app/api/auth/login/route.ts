import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { usuario, password } = await req.json()
    if (!usuario || !password) return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
    const sql = getDb()

    // Use simple query without clubs JOIN to avoid failure if table doesn't exist yet
    const rows = await sql`
      SELECT u.id, u.nombre, u.usuario, u.password_hash, u.rol, u.activo, u.club_id,
             j.id AS jugador_id
      FROM usuarios u
      LEFT JOIN jugadores j ON j.usuario_id = u.id
      WHERE u.usuario = ${usuario} LIMIT 1`

    if (!rows.length) return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    const u = rows[0] as any
    if (!u.activo) return NextResponse.json({ error: 'Usuario desactivado' }, { status: 403 })
    if (!await bcrypt.compare(password, u.password_hash)) return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })

    // Try to get club name separately — won't crash if clubs table missing
    let clubNombre: string | undefined
    if (u.club_id) {
      try {
        const clubRows = await sql`SELECT nombre FROM clubs WHERE id = ${u.club_id} LIMIT 1`
        clubNombre = (clubRows[0] as any)?.nombre
      } catch { /* clubs table may not exist yet */ }
    }

    const token = await createToken({
      userId: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      jugadorId: u.jugador_id ?? undefined,
      clubId: u.club_id ?? undefined,
      clubNombre: clubNombre,
    })

    cookies().set('wp_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 604800,
      path: '/',
    })

    return NextResponse.json({ rol: u.rol, nombre: u.nombre })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
