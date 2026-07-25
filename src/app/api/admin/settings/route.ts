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

  // Lookup club details from the clubs table using the current session's clubId
  let club = null
  if (session.clubId) {
    const clubs = await sql`SELECT nombre as club_nombre, logo_url as club_foto FROM clubs WHERE id=${session.clubId} LIMIT 1`
    club = clubs[0]
  }

  return NextResponse.json({
    email: (user as any)?.email || null,
    club_nombre: (club as any)?.club_nombre || 'Mi Club',
    club_foto: (club as any)?.club_foto || null,
    debug_userId: session.userId,
    debug_clubId: session.clubId,
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

  if (session.clubId && (club_nombre !== undefined || club_foto !== undefined)) {
    if (club_nombre !== undefined && club_nombre !== '') {
      await sql`UPDATE clubs SET nombre = ${club_nombre} WHERE id = ${session.clubId}`
    }
    if (club_foto !== undefined) {
      await sql`UPDATE clubs SET logo_url = ${club_foto} WHERE id = ${session.clubId}`
    }
  }

  return NextResponse.json({ ok: true })
}
