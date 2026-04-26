export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { cookies } from 'next/headers'
import crypto from 'crypto'

// Ensure table exists
async function ensureTable(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS invite_tokens (
      id SERIAL PRIMARY KEY,
      token VARCHAR(64) NOT NULL UNIQUE,
      created_by INTEGER REFERENCES usuarios(id),
      used_by INTEGER REFERENCES usuarios(id),
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      nota TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

// GET — list all tokens (master only)
export async function GET(req: NextRequest) {
  const session = await getSession(cookies())
  if (!session || session.rol !== 'master_admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const sql = getDb()
  await ensureTable(sql)
  const rows = await sql`
    SELECT it.*, 
           u.nombre AS used_by_nombre,
           u.usuario AS used_by_usuario,
           cu.nombre AS created_by_nombre
    FROM invite_tokens it
    LEFT JOIN usuarios u ON u.id = it.used_by
    LEFT JOIN usuarios cu ON cu.id = it.created_by
    ORDER BY it.created_at DESC
    LIMIT 100
  `
  return NextResponse.json(rows)
}

// POST — create a new token
export async function POST(req: NextRequest) {
  const session = await getSession(cookies())
  if (!session || session.rol !== 'master_admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const sql = getDb()
  await ensureTable(sql)

  const body = await req.json()
  const expiraDias = Math.min(Math.max(parseInt(body.expiraDias) || 3, 1), 30)
  const nota = (body.nota || '').slice(0, 100)

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + expiraDias * 24 * 60 * 60 * 1000)

  const [row] = await sql`
    INSERT INTO invite_tokens (token, created_by, expires_at, nota)
    VALUES (${token}, ${session.userId}, ${expiresAt}, ${nota || null})
    RETURNING *
  `
  return NextResponse.json({ ok: true, token: (row as any).token, expiresAt })
}

// PATCH — update nota on a token
export async function PATCH(req: NextRequest) {
  const session = await getSession(cookies())
  if (!session || session.rol !== 'master_admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { token, nota } = await req.json()
  if (!token) return NextResponse.json({ error: 'Falta token' }, { status: 400 })
  const sql = getDb()
  await sql`UPDATE invite_tokens SET nota = ${(nota || '').slice(0, 100)} WHERE token = ${token}`
  return NextResponse.json({ ok: true })
}

// DELETE — revoke a token
export async function DELETE(req: NextRequest) {
  const session = await getSession(cookies())
  if (!session || session.rol !== 'master_admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }
  const { token } = await req.json()
  const sql = getDb()
  await sql`DELETE FROM invite_tokens WHERE token = ${token} AND used_at IS NULL`
  return NextResponse.json({ ok: true })
}
