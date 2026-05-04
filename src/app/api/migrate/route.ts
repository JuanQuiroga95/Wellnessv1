export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

// Protected by middleware (requires master_admin) + double-check here
export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || (s.rol !== 'master_admin' && s.rol !== 'admin')) {
    return NextResponse.json({ error: 'No autorizado — se requiere admin o master_admin' }, { status: 403 })
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
    [`CREATE TABLE IF NOT EXISTS gps_logs (
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
      metricas JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'gps_logs table'],
    [`CREATE INDEX IF NOT EXISTS idx_gps_logs_jugador_fecha ON gps_logs(jugador_id, fecha)`, 'gps_logs index jugador_fecha'],
    [`CREATE INDEX IF NOT EXISTS idx_gps_logs_club_fecha ON gps_logs(club_id, fecha)`, 'gps_logs index club_fecha'],
    // Historial lesivo — índices y columnas para el módulo de Enfermería
    [`CREATE INDEX IF NOT EXISTS idx_lesiones_jugador_fecha ON lesiones(jugador_id, fecha_inicio DESC)`, 'lesiones index jugador_fecha'],
    [`CREATE INDEX IF NOT EXISTS idx_lesiones_club_activa ON lesiones(club_id, activa)`, 'lesiones index club_activa'],
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS causa VARCHAR(150)`, 'lesiones.causa'],
    [`ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS metricas JSONB DEFAULT '{}'`, 'gps_logs.metricas jsonb'],
    [`CREATE TABLE IF NOT EXISTS evaluaciones (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL,
      pfv NUMERIC(5,2), dsi NUMERIC(5,2), cmj NUMERIC(5,2), rsi NUMERIC(5,2),
      iq NUMERIC(5,2), aduc_iso NUMERIC(5,2), fms NUMERIC(5,2),
      velocidad_lineal NUMERIC(5,2), velocidad_fuerza NUMERIC(5,2), yo_yo NUMERIC(7,1),
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'evaluaciones table'],
    [`CREATE TABLE IF NOT EXISTS biblioteca_tareas (
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
    )`, 'biblioteca_tareas table'],
    [`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS pais VARCHAR(100)`, 'clubs.pais'],
    // Cleanup orphan logs (jugadores/logs sin usuario)
    [`DELETE FROM wellness_logs WHERE jugador_id NOT IN (SELECT id FROM jugadores)`, 'cleanup orphan wellness_logs'],
    [`DELETE FROM entrenamiento_logs WHERE jugador_id NOT IN (SELECT id FROM jugadores)`, 'cleanup orphan entrenamiento_logs'],
    [`DELETE FROM partido_logs WHERE jugador_id NOT IN (SELECT id FROM jugadores)`, 'cleanup orphan partido_logs'],
    [`DELETE FROM lesiones WHERE jugador_id NOT IN (SELECT id FROM jugadores)`, 'cleanup orphan lesiones'],
    [`DELETE FROM gps_logs WHERE jugador_id NOT IN (SELECT id FROM jugadores)`, 'cleanup orphan gps_logs'],
    [`DELETE FROM jugadores WHERE usuario_id NOT IN (SELECT id FROM usuarios)`, 'cleanup orphan jugadores'],
    // ── Módulo Evaluaciones & Tests ───────────────────────────────────────────
    [`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS peso_ideal_min NUMERIC(5,1)`, 'jugadores.peso_ideal_min'],
    [`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS peso_ideal_max NUMERIC(5,1)`, 'jugadores.peso_ideal_max'],
    [`CREATE TABLE IF NOT EXISTS pesajes (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      peso_kg NUMERIC(5,1) NOT NULL,
      registrado_por VARCHAR(50) DEFAULT 'coach',
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'pesajes table'],
    [`CREATE INDEX IF NOT EXISTS idx_pesajes_jugador ON pesajes(jugador_id, fecha DESC)`, 'pesajes index jugador'],
    [`CREATE INDEX IF NOT EXISTS idx_pesajes_club ON pesajes(club_id, fecha DESC)`, 'pesajes index club'],
    [`CREATE TABLE IF NOT EXISTS cmj_sessions (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      salto1_cm NUMERIC(5,2) NOT NULL,
      salto2_cm NUMERIC(5,2) NOT NULL,
      salto3_cm NUMERIC(5,2) NOT NULL,
      promedio_cm NUMERIC(5,2) GENERATED ALWAYS AS (ROUND((salto1_cm + salto2_cm + salto3_cm) / 3.0, 2)) STORED,
      es_baseline BOOLEAN DEFAULT FALSE,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'cmj_sessions table'],
    [`CREATE INDEX IF NOT EXISTS idx_cmj_jugador ON cmj_sessions(jugador_id, fecha DESC)`, 'cmj_sessions index'],
    [`CREATE TABLE IF NOT EXISTS iso_sessions (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      grupo_muscular VARCHAR(60) NOT NULL,
      der_intento1 NUMERIC(7,2) NOT NULL,
      der_intento2 NUMERIC(7,2) NOT NULL,
      der_intento3 NUMERIC(7,2) NOT NULL,
      der_promedio NUMERIC(7,2) GENERATED ALWAYS AS (ROUND((der_intento1 + der_intento2 + der_intento3) / 3.0, 2)) STORED,
      izq_intento1 NUMERIC(7,2) NOT NULL,
      izq_intento2 NUMERIC(7,2) NOT NULL,
      izq_intento3 NUMERIC(7,2) NOT NULL,
      izq_promedio NUMERIC(7,2) GENERATED ALWAYS AS (ROUND((izq_intento1 + izq_intento2 + izq_intento3) / 3.0, 2)) STORED,
      unidad VARCHAR(20) DEFAULT 'N',
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'iso_sessions table'],
    [`CREATE INDEX IF NOT EXISTS idx_iso_jugador ON iso_sessions(jugador_id, fecha DESC)`, 'iso_sessions index jugador'],
    [`CREATE INDEX IF NOT EXISTS idx_iso_grupo ON iso_sessions(grupo_muscular)`, 'iso_sessions index grupo'],
    [`CREATE OR REPLACE VIEW cmj_con_diferencial AS
      SELECT s.*,
        b.promedio_cm AS baseline_cm,
        ROUND(s.promedio_cm - b.promedio_cm, 2) AS diferencial_cm,
        ROUND((b.promedio_cm - s.promedio_cm) / NULLIF(b.promedio_cm, 0) * 100.0, 2) AS pct_perdida,
        CASE
          WHEN b.promedio_cm IS NULL THEN 'sin_baseline'
          WHEN (b.promedio_cm - s.promedio_cm) / NULLIF(b.promedio_cm, 0) * 100.0 > 10 THEN 'fatiga'
          ELSE 'normal'
        END AS estado_fatiga
      FROM cmj_sessions s
      LEFT JOIN LATERAL (
        SELECT promedio_cm FROM cmj_sessions
        WHERE jugador_id = s.jugador_id AND es_baseline = TRUE
        ORDER BY fecha ASC LIMIT 1
      ) b ON TRUE`, 'view cmj_con_diferencial'],
    [`CREATE OR REPLACE VIEW iso_con_asimetria AS
      SELECT s.*,
        ROUND(ABS(s.der_promedio - s.izq_promedio) / NULLIF(GREATEST(s.der_promedio, s.izq_promedio), 0) * 100.0, 2) AS pct_asimetria,
        CASE
          WHEN ABS(s.der_promedio - s.izq_promedio) / NULLIF(GREATEST(s.der_promedio, s.izq_promedio), 0) * 100.0 < 10 THEN 'verde'
          WHEN ABS(s.der_promedio - s.izq_promedio) / NULLIF(GREATEST(s.der_promedio, s.izq_promedio), 0) * 100.0 BETWEEN 10 AND 15 THEN 'amarillo'
          ELSE 'rojo'
        END AS semaforo,
        CASE
          WHEN s.der_promedio >= s.izq_promedio THEN 'derecha'
          ELSE 'izquierda'
        END AS lado_dominante
      FROM iso_sessions s`, 'view iso_con_asimetria'],
    [`ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS dolor_descripcion TEXT`, 'wellness_logs.dolor_descripcion'],
    [`ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS n_sprints INTEGER`, 'gps_logs.n_sprints'],
    [`ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS duracion_min NUMERIC(6,1)`, 'gps_logs.duracion_min'],
    [`ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival VARCHAR(100)`, 'sesiones_plan.rival'],
    [`ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival_foto TEXT`, 'sesiones_plan.rival_foto'],
    [`CREATE UNIQUE INDEX IF NOT EXISTS idx_partido_logs_jugador_fecha_rival ON partido_logs(jugador_id, fecha, COALESCE(rival,''))`, 'partido_logs unique index jugador_fecha_rival'],
    // ── Módulo Canchas ────────────────────────────────────────────────────
    [`CREATE TABLE IF NOT EXISTS canchas (
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
    )`, 'canchas table'],
    [`CREATE INDEX IF NOT EXISTS idx_canchas_club ON canchas(club_id)`, 'canchas index club'],
    [`CREATE INDEX IF NOT EXISTS idx_canchas_admin ON canchas(admin_id)`, 'canchas index admin'],
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS fase_historial JSONB DEFAULT '{}'::jsonb`, 'lesiones.fase_historial'],
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

  // Additional migrations for login tracking and new indexes
  const extra_migrations = [
    [`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`, 'usuarios.last_login'],
    [`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0`, 'usuarios.login_count'],
    [`CREATE INDEX IF NOT EXISTS idx_sesiones_plan_club_fecha ON sesiones_plan(club_id, fecha)`, 'idx_sesiones_plan_club_fecha'],
    // ── Antropometría (Composición Corporal - Faulkner) ───────────────────
    [`CREATE TABLE IF NOT EXISTS antropometria (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      peso_kg NUMERIC(5,1) NOT NULL,
      altura_cm NUMERIC(5,1),
      pliegue_triceps NUMERIC(5,1) NOT NULL,
      pliegue_subescapular NUMERIC(5,1) NOT NULL,
      pliegue_suprailiaco NUMERIC(5,1) NOT NULL,
      pliegue_abdominal NUMERIC(5,1) NOT NULL,
      sum_4_pliegues NUMERIC(6,1),
      pct_grasa NUMERIC(5,2),
      masa_grasa_kg NUMERIC(5,2),
      masa_magra_kg NUMERIC(5,2),
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'antropometria table'],
    [`CREATE INDEX IF NOT EXISTS idx_antropometria_jugador ON antropometria(jugador_id, fecha DESC)`, 'antropometria index'],
    [`CREATE INDEX IF NOT EXISTS idx_antropometria_club ON antropometria(club_id, fecha DESC)`, 'antropometria index club'],
    // ── PFV (Perfil Fuerza-Velocidad) ────────────────────────────────────
    [`CREATE TABLE IF NOT EXISTS pfv_sesiones (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      nombre VARCHAR(100) NOT NULL,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'pfv_sesiones table'],
    [`CREATE TABLE IF NOT EXISTS pfv_puntos (
      id SERIAL PRIMARY KEY,
      sesion_id INTEGER NOT NULL REFERENCES pfv_sesiones(id) ON DELETE CASCADE,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      fecha DATE,
      carga_kg NUMERIC(6,2) NOT NULL,
      velocidad_ms NUMERIC(6,4),
      altura_salto_m NUMERIC(5,4),
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'pfv_puntos table'],
    [`ALTER TABLE pfv_puntos ADD COLUMN IF NOT EXISTS altura_salto_m NUMERIC(5,4)`, 'pfv_puntos.altura_salto_m'],
    [`ALTER TABLE pfv_puntos ALTER COLUMN velocidad_ms DROP NOT NULL`, 'pfv_puntos.velocidad_ms nullable'],
    [`ALTER TABLE pfv_sesiones ADD COLUMN IF NOT EXISTS h_po NUMERIC(5,4)`, 'pfv_sesiones.h_po'],
    [`ALTER TABLE pfv_sesiones ADD COLUMN IF NOT EXISTS masa_kg NUMERIC(5,1)`, 'pfv_sesiones.masa_kg'],
    // ── RSI (Reactive Strength Index) ────────────────────────────────────
    [`CREATE TABLE IF NOT EXISTS rsi_tests (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      altura_cm NUMERIC(6,2) NOT NULL,
      contacto_ms NUMERIC(6,2) NOT NULL,
      rsi NUMERIC(5,3),
      es_baseline BOOLEAN DEFAULT FALSE,
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'rsi_tests table'],
    // ── DSI (Dynamic Strength Index) ─────────────────────────────────────
    [`CREATE TABLE IF NOT EXISTS dsi_tests (
      id SERIAL PRIMARY KEY,
      jugador_id INTEGER NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
      club_id INTEGER,
      fecha DATE NOT NULL DEFAULT CURRENT_DATE,
      fuerza_balistico_n NUMERIC(8,2) NOT NULL,
      fuerza_isometrico_n NUMERIC(8,2) NOT NULL,
      dsi NUMERIC(5,3),
      notas TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'dsi_tests table'],
    // ── Jugadores: h_po para PFV ─────────────────────────────────────────
    [`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS h_po NUMERIC(5,4)`, 'jugadores.h_po'],
    // ── Enfermería: campos adicionales en lesiones ───────────────────────
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS mecanismo VARCHAR(100)`, 'lesiones.mecanismo'],
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS lateralidad VARCHAR(20) DEFAULT 'Bilateral'`, 'lesiones.lateralidad'],
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS recurrente BOOLEAN DEFAULT FALSE`, 'lesiones.recurrente'],
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS fase VARCHAR(50) DEFAULT 'F0 - Solo kinesio'`, 'lesiones.fase'],
    [`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS region_corporal VARCHAR(100)`, 'lesiones.region_corporal'],
    // ── Readaptación: checklist de actividades por lesión ────────────────
    [`CREATE TABLE IF NOT EXISTS readaptacion_checks (
      id SERIAL PRIMARY KEY,
      lesion_id INTEGER NOT NULL REFERENCES lesiones(id) ON DELETE CASCADE,
      gimnasio VARCHAR(20) DEFAULT 'pendiente',
      campo_ind VARCHAR(20) DEFAULT 'pendiente',
      tecnica VARCHAR(20) DEFAULT 'pendiente',
      reducido VARCHAR(20) DEFAULT 'pendiente',
      intermitente VARCHAR(20) DEFAULT 'pendiente',
      sprint VARCHAR(20) DEFAULT 'pendiente',
      contacto VARCHAR(20) DEFAULT 'pendiente',
      con_categ VARCHAR(20) DEFAULT 'pendiente',
      nota_kinesio TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`, 'readaptacion_checks table'],
    [`CREATE INDEX IF NOT EXISTS idx_readaptacion_lesion ON readaptacion_checks(lesion_id)`, 'readaptacion_checks index'],
    // ── Biblioteca: tactical_diagram for whiteboard data ─────────────────
    [`ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS tactical_diagram TEXT`, 'biblioteca_tareas.tactical_diagram'],
    [`ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS diagram_preview TEXT`, 'biblioteca_tareas.diagram_preview'],
  ]
  for (const [sql_str, label] of extra_migrations) {
    try {
      await sql(sql_str as string)
      done.push(label as string)
    } catch(e: any) {
      const msg = e?.message || String(e)
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('ya existe')) {
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
