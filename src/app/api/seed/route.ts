import { NextRequest, NextResponse } from 'next/server'
import { getDb, SCHEMA_STATEMENTS } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

// GET → just checks if DB is already initialized (no credentials returned)
export async function GET() {
  try {
    const sql = getDb()
    const existing = await sql`SELECT id FROM usuarios WHERE rol='admin' LIMIT 1`
    return NextResponse.json({ initialized: existing.length > 0 })
  } catch {
    return NextResponse.json({ initialized: false })
  }
}

// POST → creates tables and runs all migrations
// Protected by middleware (requires master_admin) + verified here
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'master_admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  try {
    const sql = getDb()
    const results: string[] = []

    for (const stmt of SCHEMA_STATEMENTS) {
      try {
        await sql(stmt)
        results.push('ok')
      } catch (e) {
        const msg = String(e)
        if (!msg.includes('already exists') && !msg.includes('duplicate') && !msg.includes('does not exist')) {
          console.error('Schema stmt error:', msg.slice(0, 200))
          results.push('err: ' + msg.slice(0, 80))
        } else {
          results.push('skip')
        }
      }
    }

    try {
      await sql`ALTER TABLE club_settings ADD CONSTRAINT club_settings_admin_id_key UNIQUE (admin_id)`
    } catch(e) { /* Already exists */ }

    return NextResponse.json({ ok: true, message: 'Migrations completadas', results })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
