import { NextResponse } from 'next/server'
import { getDb, SCHEMA_STATEMENTS } from '@/lib/db'
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

// POST → creates tables and runs all migrations (safe to call multiple times)
export async function POST() {
  try {
    const sql = getDb()
    const results: string[] = []

    for (const stmt of SCHEMA_STATEMENTS) {
      try {
        await sql(stmt)
        results.push('ok')
      } catch (e) {
        const msg = String(e)
        // Ignore benign errors
        if (!msg.includes('already exists') && !msg.includes('duplicate') && !msg.includes('does not exist')) {
          console.error('Schema stmt error:', msg.slice(0, 200))
          results.push('err: ' + msg.slice(0, 80))
        } else {
          results.push('skip')
        }
      }
    }

    // Ensure Franco.Toso exists
    const existing = await sql`SELECT id FROM usuarios WHERE usuario='Franco.Toso' LIMIT 1`
    if (existing.length === 0) {
      const hash = await bcrypt.hash('12345678', 12)
      await sql`INSERT INTO usuarios(nombre,usuario,password_hash,rol) VALUES('Franco Toso','Franco.Toso',${hash},'admin')`
    }

    // Critical: fix club_settings unique constraint if it doesn't exist
    try {
      await sql`ALTER TABLE club_settings ADD CONSTRAINT club_settings_admin_id_key UNIQUE (admin_id)`
    } catch(e) {
      // Already exists — fine
    }

    return NextResponse.json({ ok: true, message: 'Migrations completadas', results })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
