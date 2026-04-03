import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// App Router route segment config — needed for Vercel to allow larger bodies
export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()
  const [user] = await sql`SELECT email FROM usuarios WHERE id=${session.userId}`

  // Simple lookup by admin_id (now has UNIQUE constraint)
  const [club] = await sql`SELECT club_nombre, club_foto FROM club_settings WHERE admin_id=${session.userId} LIMIT 1`

  return NextResponse.json({
    email: (user as any)?.email || null,
    club_nombre: (club as any)?.club_nombre || 'Mi Club',
    club_foto: (club as any)?.club_foto || null,
    debug_userId: session.userId,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin'))
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { email, club_nombre, club_foto } = body
  const sql = getDb()

  if (email !== undefined) {
    await sql`UPDATE usuarios SET email=${email || null} WHERE id=${session.userId}`
  }

  if (club_nombre !== undefined || club_foto !== undefined) {
    // True upsert using ON CONFLICT — requires UNIQUE(admin_id)
    await sql`
      INSERT INTO club_settings(admin_id, club_nombre, club_foto, updated_at)
      VALUES(
        ${session.userId},
        ${club_nombre || 'Mi Club'},
        ${club_foto || null},
        NOW()
      )
      ON CONFLICT (admin_id) DO UPDATE SET
        club_nombre = CASE WHEN EXCLUDED.club_nombre IS NOT NULL AND EXCLUDED.club_nombre != '' 
                          THEN EXCLUDED.club_nombre 
                          ELSE club_settings.club_nombre END,
        club_foto   = CASE WHEN EXCLUDED.club_foto IS NOT NULL 
                          THEN EXCLUDED.club_foto 
                          ELSE club_settings.club_foto END,
        updated_at  = NOW()
    `
  }

  return NextResponse.json({ ok: true })
}
