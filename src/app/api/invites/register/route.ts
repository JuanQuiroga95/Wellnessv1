export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createToken } from '@/lib/auth'
import { sanitizeString } from '@/lib/security'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

// GET — validate a token (check if it's valid before showing the form)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

  const sql = getDb()
  try {
    const rows = await sql`
      SELECT id, expires_at, used_at, nota
      FROM invite_tokens
      WHERE token = ${token}
      LIMIT 1
    `
    if (!rows.length) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
    const row = rows[0] as any
    if (row.used_at) return NextResponse.json({ error: 'Este link ya fue usado' }, { status: 410 })
    if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: 'Este link expiró' }, { status: 410 })
    return NextResponse.json({ ok: true, nota: row.nota, expiresAt: row.expires_at })
  } catch {
    return NextResponse.json({ error: 'Error validando token' }, { status: 500 })
  }
}

// POST — complete registration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = sanitizeString(body.token, 64)
    const nombre = sanitizeString(body.nombre, 100)
    const usuario = sanitizeString(body.usuario, 50)
    const password = sanitizeString(body.password, 200)
    const clubNombre = sanitizeString(body.clubNombre, 100)
    const pais = sanitizeString(body.pais, 80)

    if (!token || !nombre || !usuario || !password || !clubNombre) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const sql = getDb()

    // 1. Validate token (atomic check)
    const rows = await sql`
      SELECT id, expires_at, used_at
      FROM invite_tokens
      WHERE token = ${token}
      LIMIT 1
    `
    if (!rows.length) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
    const inv = rows[0] as any
    if (inv.used_at) return NextResponse.json({ error: 'Este link ya fue usado' }, { status: 410 })
    if (new Date(inv.expires_at) < new Date()) return NextResponse.json({ error: 'Este link expiró' }, { status: 410 })

    // 2. Check username not taken
    const existing = await sql`SELECT id FROM usuarios WHERE usuario = ${usuario} LIMIT 1`
    if (existing.length) return NextResponse.json({ error: 'Ese nombre de usuario ya existe, elegí otro' }, { status: 409 })

    // 3. Create club
    const [club] = await sql`
      INSERT INTO clubs (nombre, pais) VALUES (${clubNombre}, ${pais || null})
      RETURNING id
    `
    const clubId = (club as any).id

    // 4. Create demo user (expires in 7 days)
    const demoExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const hash = await bcrypt.hash(password, 12)
    const [user] = await sql`
      INSERT INTO usuarios (nombre, usuario, password_hash, rol, club_id, activo, demo_expires_at)
      VALUES (${nombre}, ${usuario}, ${hash}, 'admin', ${clubId}, true, ${demoExpires})
      RETURNING id, nombre, usuario, rol, club_id
    ` as any[]

    // 5. Mark token as used
    await sql`
      UPDATE invite_tokens
      SET used_at = NOW(), used_by = ${user.id}
      WHERE token = ${token}
    `

    // 6. Auto-login
    const authToken = await createToken({
      userId: user.id,
      usuario: user.usuario,
      nombre: user.nombre,
      rol: user.rol,
      clubId: user.club_id,
      clubNombre,
    })

    cookies().set('wp_token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 604800,
      path: '/',
    })

    return NextResponse.json({ ok: true, rol: user.rol, nombre: user.nombre, demoExpires })
  } catch (e: any) {
    console.error('Register error:', e)
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 })
  }
}
