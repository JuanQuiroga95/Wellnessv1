import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin')) 
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()
  const [user] = await sql`SELECT email FROM usuarios WHERE id=${session.userId}`
  
  // Try to find club settings by admin_id (userId)
  let rows = await sql`SELECT club_nombre, club_foto FROM club_settings WHERE admin_id=${session.userId} LIMIT 1`
  
  // Fallback: if no record found, try to find by matching club_id from usuarios table
  if (!(rows as any[]).length && session.clubId) {
    rows = await sql`SELECT cs.club_nombre, cs.club_foto FROM club_settings cs 
      JOIN usuarios u ON u.id = cs.admin_id 
      WHERE u.club_id = ${session.clubId} AND u.rol = 'admin' LIMIT 1`
  }
  
  const club = (rows as any[])[0]
  return NextResponse.json({ 
    email: (user as any)?.email || null,
    club_nombre: club?.club_nombre || 'Mi Club',
    club_foto: club?.club_foto || null,
    debug_userId: session.userId,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || (session.rol !== 'admin' && session.rol !== 'master_admin')) 
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { email, club_nombre, club_foto } = await req.json()
  const sql = getDb()
  
  if (email !== undefined) {
    await sql`UPDATE usuarios SET email=${email||null} WHERE id=${session.userId}`
  }
  
  if (club_nombre !== undefined || club_foto !== undefined) {
    // Upsert club_settings for this admin
    const existing = await sql`SELECT id FROM club_settings WHERE admin_id=${session.userId} LIMIT 1`
    if ((existing as any[]).length > 0) {
      await sql`UPDATE club_settings SET 
        club_nombre = COALESCE(${club_nombre||null}, club_nombre),
        club_foto = CASE WHEN ${club_foto||null} IS NOT NULL THEN ${club_foto||null} ELSE club_foto END,
        updated_at = NOW()
        WHERE admin_id = ${session.userId}`
    } else {
      await sql`INSERT INTO club_settings(admin_id, club_nombre, club_foto) 
        VALUES(${session.userId}, ${club_nombre||'Mi Club'}, ${club_foto||null})`
    }
  }
  
  return NextResponse.json({ ok: true })
}
