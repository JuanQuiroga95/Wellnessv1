import { neon } from '@neondatabase/serverless'
export function getDb() { return neon(process.env.DATABASE_URL!) }

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, usuario VARCHAR(50) NOT NULL UNIQUE, password_hash TEXT NOT NULL, rol VARCHAR(20) NOT NULL DEFAULT 'jugador', activo BOOLEAN NOT NULL DEFAULT true, email VARCHAR(200), created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS jugadores (id SERIAL PRIMARY KEY, usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE, posicion VARCHAR(50), posicion_orden INTEGER DEFAULT 99, edad INTEGER, peso_kg NUMERIC(5,1), estatura_cm INTEGER, pie_habil VARCHAR(20) DEFAULT 'Derecho', foto_url TEXT, email VARCHAR(200), fecha_nacimiento DATE, hora_recordatorio VARCHAR(5) DEFAULT '08:00', created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS wellness_logs (id SERIAL PRIMARY KEY, jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE, fecha DATE NOT NULL DEFAULT CURRENT_DATE, fatiga SMALLINT, calidad_sueno SMALLINT, dolor_muscular SMALLINT, nivel_estres SMALLINT, estado_animo SMALLINT, dolor_zona TEXT, dolor_eva SMALLINT, tqr SMALLINT, recovery SMALLINT, entrena_grupo BOOLEAN DEFAULT true, fue_gimnasio BOOLEAN DEFAULT false, grupos_musculares TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS entrenamiento_logs (id SERIAL PRIMARY KEY, jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE, fecha DATE NOT NULL DEFAULT CURRENT_DATE, tipo_sesion VARCHAR(30) DEFAULT 'EQUIPO', rpe SMALLINT, duracion_min INTEGER, carga_ua INTEGER GENERATED ALWAYS AS (rpe * duracion_min) STORED, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS partido_logs (id SERIAL PRIMARY KEY, jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE, fecha DATE NOT NULL DEFAULT CURRENT_DATE, rival VARCHAR(100), tipo_partido VARCHAR(30) DEFAULT 'Oficial', minutos INTEGER NOT NULL DEFAULT 0, titular BOOLEAN DEFAULT true, notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS lesiones (id SERIAL PRIMARY KEY, jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE, fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE, fecha_alta DATE, tipo_lesion VARCHAR(50), zona VARCHAR(100), descripcion TEXT, eta_dias INTEGER, estado VARCHAR(30) DEFAULT 'Tratamiento', activa BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_entreno_j ON entrenamiento_logs(jugador_id, fecha DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_wellness_j ON wellness_logs(jugador_id, fecha DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_partido_j ON partido_logs(jugador_id, fecha DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_lesiones_j ON lesiones(jugador_id, activa)`,
  // Migrations
  // Club settings & rival photo
  `ALTER TABLE partido_logs ADD COLUMN IF NOT EXISTS rival_foto TEXT`,
  `CREATE TABLE IF NOT EXISTS club_settings (id SERIAL PRIMARY KEY, admin_id INTEGER UNIQUE, club_nombre VARCHAR(100) DEFAULT 'Mi Club', club_foto TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `ALTER TABLE club_settings ADD COLUMN IF NOT EXISTS rival_fotos JSONB DEFAULT '[]'`,
  // Ensure unique constraint exists (migration safe)
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='club_settings_admin_id_key') THEN ALTER TABLE club_settings ADD CONSTRAINT club_settings_admin_id_key UNIQUE (admin_id); END IF; END $$`,
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(200)`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS email VARCHAR(200)`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS hora_recordatorio VARCHAR(5) DEFAULT '08:00'`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS posicion_orden INTEGER DEFAULT 99`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS foto_url TEXT`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS tqr SMALLINT`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS recovery SMALLINT`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS entrena_grupo BOOLEAN DEFAULT true`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS fue_gimnasio BOOLEAN DEFAULT false`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS grupos_musculares TEXT`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS dolor_eva SMALLINT`,
  // Multitenancy — clubs & master_admin
  `CREATE TABLE IF NOT EXISTS clubs (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, logo_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id)`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id)`,
  `ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  `ALTER TABLE partido_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  `ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  // Backfill: if clubs exist and rows have null club_id, assign first club
  // (handled in seed/migration API separately)
]
