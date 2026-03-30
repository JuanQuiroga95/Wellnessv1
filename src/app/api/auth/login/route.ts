import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createToken } from '@/lib/auth'
import { rateLimit, sanitizeString } from '@/lib/security'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // Rate limit: max 10 login attempts per IP per 15 minutes
  const rl = rateLimit(req, { limit: 10, windowMs: 15 * 60 * 1000, key: 'login' })
  if (!rl.allowed) return rl.response!

  try {
    const body = await req.json()
    const usuario = sanitizeString(body.usuario, 50)
    const password = sanitizeString(body.password, 200)

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
    }

    const sql = getDb()
    const rows = await sql`
      SELECT u.id, u.nombre, u.usuario, u.password_hash, u.rol, u.activo, u.club_id,
             j.id AS jugador_id
      FROM usuarios u
      LEFT JOIN jugadores j ON j.usuario_id = u.id
      WHERE u.usuario = ${usuario} LIMIT 1`

    // Always run bcrypt compare to prevent timing attacks (even if user not found)
    const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxxxxxxxxxxxxxx'
    const foundUser = rows[0] as any
    const hashToCompare = foundUser?.password_hash || dummyHash
    const passwordMatch = await bcrypt.compare(password, hashToCompare)

    if (!rows.length || !passwordMatch) {
      return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 })
    }

    const u = foundUser
    if (!u.activo) {
      return NextResponse.json({ error: 'Usuario desactivado' }, { status: 403 })
    }

    // Get club name
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
      clubNombre,
    })

    cookies().set('wp_token', token, {
      httpOnly: true,           // Not accessible via JS
      secure: true,             // HTTPS only
      sameSite: 'strict',       // Stronger than 'lax' - prevents CSRF
      maxAge: 604800,           // 7 days
      path: '/',
    })

    return NextResponse.json({ rol: u.rol, nombre: u.nombre })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
