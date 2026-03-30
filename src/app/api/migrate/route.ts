import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// Protected by middleware (requires master_admin) + double-check here
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'master_admin') {
    return NextResponse.json({ error: 'No autorizado — se requiere master_admin' }, { status: 403 })
  }

  const sql = getDb()
  const done: string[] = []
  const errs: string[] = []

  const migrations = [
    [`ALTER TABLE partido_logs ADD COLUMN IF NOT EXISTS rival_foto TEXT`, 'rival_foto column'],
    [`CREATE TABLE IF NOT EXISTS club_settings (id SERIAL PRIMARY KEY, admin_id INTEGER UNIQUE, club_nombre VARCHAR(100) DEFAULT 'Mi Club', club_foto TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())`, 'club_settings table'],
    [`ALTER TABLE club_settings ADD COLUMN IF NOT EXISTS rival_fotos JSONB DEFAULT '[]'`, 'rival_fotos column'],
    [`CREATE TABLE IF NOT EXISTS clubs (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, logo_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`, 'clubs table'],
    [`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS club_id INTEGER`, 'usuarios.club_id'],
    [`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS club_id INTEGER`, 'jugadores.club_id'],
    [`ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`, 'entrenamiento_logs.club_id'],
    [`ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`, 'wellness_logs.club_id'],
    [`ALTER TABLE partido_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`, 'partido_logs.club_id'],
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS club_id INTEGER`, 'lesiones.club_id'],
    [`ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS objetivo_secundario VARCHAR(50)`, 'sesiones_plan.objetivo_secundario'],
  ]

  for (const [sql_stmt, label] of migrations) {
    try {
      await sql(sql_stmt as string)
      done.push(label as string)
    } catch (e: any) {
      const msg = String(e)
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        done.push(`${label} (ya existe)`)
      } else {
        errs.push(`${label}: ${msg.slice(0, 100)}`)
      }
    }
  }

  return NextResponse.json({ ok: true, done, errs })
}

// GET is kept for initial setup check but returns minimal info
export async function GET() {
  try {
    const sql = getDb()
    const existing = await sql`SELECT COUNT(*)::int AS n FROM usuarios WHERE rol = 'admin' LIMIT 1`
    return NextResponse.json({ initialized: (existing[0] as any).n > 0 })
  } catch {
    return NextResponse.json({ initialized: false })
  }
}
