import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// Public endpoint to run pending migrations — safe because all are idempotent
export async function POST() {
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
    [`ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS dolor_eva SMALLINT`, 'dolor_eva column'],
    [`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS posicion_orden INTEGER DEFAULT 99`, 'posicion_orden'],
    [`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS foto_url TEXT`, 'foto_url'],
  ]

  for (const [stmt, label] of migrations) {
    try {
      await sql(stmt as string)
      done.push(label as string)
    } catch(e) {
      const msg = String(e)
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        done.push(`${label} (ya existía)`)
      } else {
        errs.push(`${label}: ${msg.slice(0,100)}`)
      }
    }
  }

  // Fix UNIQUE constraint on club_settings.admin_id
  try {
    await sql`ALTER TABLE club_settings ADD CONSTRAINT club_settings_admin_id_key UNIQUE (admin_id)`
    done.push('club_settings UNIQUE constraint')
  } catch {
    done.push('club_settings UNIQUE constraint (ya existía)')
  }

  return NextResponse.json({ ok: errs.length === 0, done, errs })
}
