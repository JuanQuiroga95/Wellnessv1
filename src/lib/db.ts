import { neon } from '@neondatabase/serverless'
export function getDb() { return neon(process.env.DATABASE_URL!) }

export const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS usuarios (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, usuario VARCHAR(50) NOT NULL UNIQUE, password_hash TEXT NOT NULL, rol VARCHAR(20) NOT NULL DEFAULT 'jugador', activo BOOLEAN NOT NULL DEFAULT true, email VARCHAR(200), created_at TIMESTAMPTZ DEFAULT NOW())`,
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`,
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0`,
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
  `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS pais VARCHAR(100)`,
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id)`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id)`,
  `ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  `ALTER TABLE partido_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  `ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS club_id INTEGER`,
  // Calendario & Planificación de sesiones
  `CREATE TABLE IF NOT EXISTS sesiones_plan (
    id SERIAL PRIMARY KEY,
    club_id INTEGER,
    admin_id INTEGER REFERENCES usuarios(id),
    fecha DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    tipo VARCHAR(20) NOT NULL DEFAULT 'entrenamiento',
    titulo VARCHAR(150),
    objetivo VARCHAR(50),
    objetivo_secundario VARCHAR(50),
    descripcion TEXT,
    ejercicios JSONB DEFAULT '[]',
    rpe_objetivo SMALLINT,
    materiales TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_sesiones_plan_fecha ON sesiones_plan(admin_id, fecha)`,
  `CREATE INDEX IF NOT EXISTS idx_sesiones_plan_club_fecha ON sesiones_plan(club_id, fecha)`,
  `ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS objetivo_secundario VARCHAR(50)`,
  `CREATE TABLE IF NOT EXISTS gps_logs (
    id SERIAL PRIMARY KEY,
    jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
    club_id INTEGER,
    fecha DATE NOT NULL,
    sesion_id INTEGER REFERENCES sesiones_plan(id) ON DELETE SET NULL,
    tipo_sesion VARCHAR(20) NOT NULL DEFAULT 'entrenamiento',
    dist_total NUMERIC(8,1),
    dist_hir NUMERIC(8,1),
    dist_v4 NUMERIC(8,1),
    dist_v5 NUMERIC(8,1),
    player_load NUMERIC(7,2),
    max_velocity NUMERIC(5,2),
    acc2 INTEGER,
    dec2 INTEGER,
    acc3 INTEGER,
    dec3 INTEGER,
    dist_per_min NUMERIC(6,2),
    fuente VARCHAR(20) DEFAULT 'excel',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_gps_logs_jugador_fecha ON gps_logs(jugador_id, fecha)`,
  `CREATE INDEX IF NOT EXISTS idx_gps_logs_club_fecha ON gps_logs(club_id, fecha)`,
  // ── Módulo Evaluaciones & Tests ──────────────────────────────────────────────
  // Variables simples: rango de peso ideal (nutricionista)
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS peso_ideal_min NUMERIC(5,1)`,
  `ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS peso_ideal_max NUMERIC(5,1)`,
  // Historial de pesajes
  `CREATE TABLE IF NOT EXISTS pesajes (id SERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE, club_id INTEGER, fecha DATE NOT NULL DEFAULT CURRENT_DATE, peso_kg NUMERIC(5,1) NOT NULL, registrado_por VARCHAR(50) DEFAULT 'coach', notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_pesajes_jugador ON pesajes(jugador_id, fecha DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_pesajes_club ON pesajes(club_id, fecha DESC)`,
  // CMJ — Countermovement Jump (3 saltos, promedio generado, flag baseline)
  `CREATE TABLE IF NOT EXISTS cmj_sessions (id SERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE, club_id INTEGER, fecha DATE NOT NULL DEFAULT CURRENT_DATE, salto1_cm NUMERIC(5,2) NOT NULL, salto2_cm NUMERIC(5,2) NOT NULL, salto3_cm NUMERIC(5,2) NOT NULL, promedio_cm NUMERIC(5,2) GENERATED ALWAYS AS (ROUND((salto1_cm + salto2_cm + salto3_cm) / 3.0, 2)) STORED, es_baseline BOOLEAN DEFAULT FALSE, notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_cmj_jugador ON cmj_sessions(jugador_id, fecha DESC)`,
  // Tests isométricos — estructura genérica por grupo muscular
  `CREATE TABLE IF NOT EXISTS iso_sessions (id SERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE, club_id INTEGER, fecha DATE NOT NULL DEFAULT CURRENT_DATE, grupo_muscular VARCHAR(60) NOT NULL, der_intento1 NUMERIC(7,2) NOT NULL, der_intento2 NUMERIC(7,2) NOT NULL, der_intento3 NUMERIC(7,2) NOT NULL, der_promedio NUMERIC(7,2) GENERATED ALWAYS AS (ROUND((der_intento1 + der_intento2 + der_intento3) / 3.0, 2)) STORED, izq_intento1 NUMERIC(7,2) NOT NULL, izq_intento2 NUMERIC(7,2) NOT NULL, izq_intento3 NUMERIC(7,2) NOT NULL, izq_promedio NUMERIC(7,2) GENERATED ALWAYS AS (ROUND((izq_intento1 + izq_intento2 + izq_intento3) / 3.0, 2)) STORED, unidad VARCHAR(20) DEFAULT 'N', notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_iso_jugador ON iso_sessions(jugador_id, fecha DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_iso_grupo ON iso_sessions(grupo_muscular)`,
  // Vista CMJ con diferencial vs baseline y estado de fatiga
  `CREATE OR REPLACE VIEW cmj_con_diferencial AS SELECT s.*, b.promedio_cm AS baseline_cm, ROUND(s.promedio_cm - b.promedio_cm, 2) AS diferencial_cm, ROUND((b.promedio_cm - s.promedio_cm) / NULLIF(b.promedio_cm, 0) * 100.0, 2) AS pct_perdida, CASE WHEN b.promedio_cm IS NULL THEN 'sin_baseline' WHEN (b.promedio_cm - s.promedio_cm) / NULLIF(b.promedio_cm, 0) * 100.0 > 10 THEN 'fatiga' ELSE 'normal' END AS estado_fatiga FROM cmj_sessions s LEFT JOIN LATERAL (SELECT promedio_cm FROM cmj_sessions WHERE jugador_id = s.jugador_id AND es_baseline = TRUE ORDER BY fecha ASC LIMIT 1) b ON TRUE`,
  // Vista isométrico con asimetría y semáforo
  `CREATE OR REPLACE VIEW iso_con_asimetria AS SELECT s.*, ROUND(ABS(s.der_promedio - s.izq_promedio) / NULLIF(GREATEST(s.der_promedio, s.izq_promedio), 0) * 100.0, 2) AS pct_asimetria, CASE WHEN ABS(s.der_promedio - s.izq_promedio) / NULLIF(GREATEST(s.der_promedio, s.izq_promedio), 0) * 100.0 < 10 THEN 'verde' WHEN ABS(s.der_promedio - s.izq_promedio) / NULLIF(GREATEST(s.der_promedio, s.izq_promedio), 0) * 100.0 BETWEEN 10 AND 15 THEN 'amarillo' ELSE 'rojo' END AS semaforo, CASE WHEN s.der_promedio >= s.izq_promedio THEN 'derecha' ELSE 'izquierda' END AS lado_dominante FROM iso_sessions s`,
  // ── Calculadoras avanzadas: PFV, RSI, DSI ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pfv_sesiones (id SERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE, club_id INTEGER, nombre VARCHAR(100) NOT NULL DEFAULT 'Sesión', fecha DATE NOT NULL DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS pfv_puntos (id SERIAL PRIMARY KEY, sesion_id INTEGER NOT NULL REFERENCES pfv_sesiones(id) ON DELETE CASCADE, jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE, fecha DATE NOT NULL DEFAULT CURRENT_DATE, carga_kg NUMERIC(6,2) NOT NULL, velocidad_ms NUMERIC(5,3) NOT NULL, notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_pfv_puntos_sesion ON pfv_puntos(sesion_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pfv_sesiones_jugador ON pfv_sesiones(jugador_id)`,
  `CREATE TABLE IF NOT EXISTS rsi_tests (id SERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE, club_id INTEGER, fecha DATE NOT NULL DEFAULT CURRENT_DATE, altura_cm NUMERIC(5,1) NOT NULL, contacto_ms NUMERIC(6,1) NOT NULL, rsi NUMERIC(6,3) GENERATED ALWAYS AS (ROUND((altura_cm / 100.0) / (contacto_ms / 1000.0), 3)) STORED, es_baseline BOOLEAN DEFAULT FALSE, notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_rsi_jugador ON rsi_tests(jugador_id, fecha DESC)`,
  `CREATE TABLE IF NOT EXISTS dsi_tests (id SERIAL PRIMARY KEY, jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE, club_id INTEGER, fecha DATE NOT NULL DEFAULT CURRENT_DATE, fuerza_balistico_n NUMERIC(8,2) NOT NULL, fuerza_isometrico_n NUMERIC(8,2) NOT NULL, dsi NUMERIC(6,4) GENERATED ALWAYS AS (ROUND(fuerza_balistico_n / NULLIF(fuerza_isometrico_n, 0), 4)) STORED, notas TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_dsi_jugador ON dsi_tests(jugador_id, fecha DESC)`,
  // ── Wellness upsert: unique index on (jugador_id, fecha) — created only if no duplicates exist
  // Uses DO block so it's a no-op if the index already exists or if duplicates prevent creation
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'idx_wellness_jugador_fecha_unique'
    ) AND NOT EXISTS (
      SELECT jugador_id, fecha FROM wellness_logs GROUP BY jugador_id, fecha HAVING COUNT(*) > 1
    ) THEN
      CREATE UNIQUE INDEX idx_wellness_jugador_fecha_unique ON wellness_logs(jugador_id, fecha);
    END IF;
  END $$`,
  // ── Biblioteca: intensidad and objetivo columns for grouping ─────────────────
  `ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS intensidad INTEGER`,
  `ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS objetivo VARCHAR(50)`,
  `ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS imagen TEXT`,
  `CREATE TABLE IF NOT EXISTS biblioteca_tareas (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER,
    nombre VARCHAR(200) NOT NULL,
    ventana VARCHAR(100),
    subtarea VARCHAR(100),
    jugadores INTEGER,
    series INTEGER,
    minutos INTEGER,
    pausa INTEGER,
    largo INTEGER,
    ancho INTEGER,
    descripcion TEXT,
    veces_usada INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS tactical_diagram TEXT`,
  `ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS diagram_preview TEXT`,
  // ── Missing column migrations ─────────────────────────────────────────────
  `ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS dolor_descripcion TEXT`,
  `ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS n_sprints INTEGER`,
  `ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS duracion_min NUMERIC(6,1)`,
  `ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS metricas JSONB`,
  `UPDATE gps_logs SET club_id = (SELECT j.club_id FROM jugadores j WHERE j.id = gps_logs.jugador_id) WHERE club_id IS NULL AND jugador_id IS NOT NULL`,
  `ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival VARCHAR(100)`,
  `ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival_foto TEXT`,
  // ── Demo accounts & invite tokens ────────────────────────────────────────────
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS demo_expires_at TIMESTAMPTZ`,
  `CREATE TABLE IF NOT EXISTS invite_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    created_by INTEGER REFERENCES usuarios(id),
    used_by INTEGER REFERENCES usuarios(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    nota TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // ── Módulo Canchas ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS canchas (
    id SERIAL PRIMARY KEY,
    club_id INTEGER,
    admin_id INTEGER REFERENCES usuarios(id),
    nombre VARCHAR(200) NOT NULL,
    direccion TEXT,
    lat NUMERIC(10,7),
    lng NUMERIC(10,7),
    largo_m NUMERIC(6,1),
    ancho_m NUMERIC(6,1),
    area_m2 NUMERIC(8,1),
    tipo_cancha VARCHAR(20),
    superficie VARCHAR(50),
    notas TEXT,
    osm_id BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_canchas_club ON canchas(club_id)`,
  `CREATE INDEX IF NOT EXISTS idx_canchas_admin ON canchas(admin_id)`,
  `ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS cancha_id INTEGER REFERENCES canchas(id) ON DELETE SET NULL`,
  // ── Backfill jugadores.club_id from their linked usuario ─────────────────────
  // Jugadores created before multi-tenancy have club_id = NULL; link via usuario.club_id
  `UPDATE jugadores j SET club_id = u.club_id FROM usuarios u WHERE j.usuario_id = u.id AND j.club_id IS NULL AND u.club_id IS NOT NULL`,
  // Re-run GPS logs club_id backfill now that jugadores have club_id populated
  `UPDATE gps_logs SET club_id = (SELECT j.club_id FROM jugadores j WHERE j.id = gps_logs.jugador_id) WHERE club_id IS NULL AND jugador_id IS NOT NULL`,
]
