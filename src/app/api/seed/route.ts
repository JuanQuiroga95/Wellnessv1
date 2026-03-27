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
    // Table doesn't exist yet → not initialized
    return NextResponse.json({ initialized: false })
  }
}

// POST → creates tables and admin user (only used on first deploy)
export async function POST() {
  try {
    const sql = getDb()
    for (const stmt of SCHEMA_STATEMENTS) {
      try { await sql(stmt) } catch (e) {
        const msg = String(e)
        if (!msg.includes('already exists') && !msg.includes('duplicate')) {
          console.error('Schema stmt error:', msg.slice(0,100))
        }
      }
    }
    const existing = await sql`SELECT id FROM usuarios WHERE usuario='Franco.Toso' LIMIT 1`
    if (existing.length === 0) {
      const hash = await bcrypt.hash('12345678', 12)
      await sql`INSERT INTO usuarios(nombre,usuario,password_hash,rol) VALUES('Franco Toso','Franco.Toso',${hash},'admin')`
    }
    return NextResponse.json({ ok: true, message: 'Base de datos inicializada' })
  } catch (err) {
    console.error('Seed error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
