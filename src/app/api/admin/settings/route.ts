import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const { email } = await req.json()
  const sql = getDb()
  await sql`UPDATE usuarios SET email=${email||null} WHERE id=${session.userId}`
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session || session.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const sql = getDb()
  const rows = await sql`SELECT email FROM usuarios WHERE id=${session.userId}`
  return NextResponse.json({ email: rows[0]?.email || null })
}
