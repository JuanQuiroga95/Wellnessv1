export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { createToken } from '@/lib/auth'
import { rateLimit, sanitizeString } from '@/lib/security'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const usuario = sanitizeString(body.usuario, 50)
    const password = sanitizeString(body.password, 200)

    if (!usuario || !password) {
      return NextResponse.json({ error: 'Campos requeridos' }, { status: 400 })
    }

    // Rate limit per username (not just IP) — so one user's failures don't lock others out
    // Max 5 attempts per 2 minutes per username
    const rl = rateLimit(req, { limit: 5, windowMs: 2 * 60 * 1000, key: `login:${usuario}` })
    if (!rl.allowed) return rl.response!

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

    // Get club name — resolved after admin_clubs sync below
    let clubNombre: string | undefined

    // Ensure login tracking columns exist (safe migration — runs only if columns missing)
    try {
      await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`
      await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0`
    } catch {}

    // Track login date and count
    try {
      await sql`UPDATE usuarios SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1 WHERE id = ${u.id}`
    } catch {}

    // For admins: ensure admin_clubs is in sync and pick active club
    let activeClubId = u.club_id ?? undefined
    if (u.rol === 'admin') {
      try {
        // If user has club_id but no admin_clubs row, create one (backfill)
        if (u.club_id) {
          await sql`INSERT INTO admin_clubs (admin_id, club_id) VALUES (${u.id}, ${u.club_id}) ON CONFLICT (admin_id, club_id) DO NOTHING`
        }
        // If user has no club_id but has admin_clubs entries, use the first one
        if (!u.club_id) {
          const firstClub = await sql`SELECT club_id FROM admin_clubs WHERE admin_id = ${u.id} ORDER BY created_at ASC LIMIT 1`
          if (firstClub.length > 0) {
            activeClubId = Number((firstClub[0] as any).club_id)
            await sql`UPDATE usuarios SET club_id = ${activeClubId} WHERE id = ${u.id}`
          }
        }
      } catch { /* admin_clubs table may not exist yet */ }
    }

    // Resolve club name from the active club
    if (activeClubId) {
      try {
        const clubRows = await sql`SELECT nombre FROM clubs WHERE id = ${activeClubId} LIMIT 1`
        clubNombre = (clubRows[0] as any)?.nombre
      } catch { /* clubs table may not exist yet */ }
    }

    const token = await createToken({
      userId: u.id,
      usuario: u.usuario,
      nombre: u.nombre,
      rol: u.rol,
      jugadorId: u.jugador_id ?? undefined,
      clubId: activeClubId,
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
