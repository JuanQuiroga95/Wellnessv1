export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { calcACWR } from '@/lib/acwr'
import CoachClient from './CoachClient'

const POS_ORDER = {'portero':1,'defensa central':2,'lateral derecho':2,'lateral izquierdo':2,'defensa':2,'mediocampista':3,'mediocentro':3,'mediocentro defensivo':3,'mediocentro ofensivo':3,'volante':4,'volante derecho':4,'volante izquierdo':4,'extremo':5,'extremo derecho':5,'extremo izquierdo':5,'delantero':6,'centro delantero':6}
function posOrder(pos) { return pos ? (POS_ORDER[String(pos).toLowerCase()] ?? 99) : 99 }

export default async function CoachPage() {
  const session = await getSession()
  if (!session || session.rol !== 'admin' && session.rol !== 'master_admin') redirect('/login')
  const sql = getDb()
  const today = new Date().toISOString().split('T')[0]
  const clubId = session.clubId ? Number(session.clubId) : null
  const isMaster = session.rol === 'master_admin'

  // Ensure columns exist before querying them
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_plain TEXT` } catch {}
  try { await sql`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS nacionalidad VARCHAR(100)` } catch {}
  try { await sql`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS peso_ideal_min NUMERIC(5,1)` } catch {}
  try { await sql`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS peso_ideal_max NUMERIC(5,1)` } catch {}

  // isMaster sin clubId = super-vista de todos los clubes
  // isMaster con clubId = ve solo su club (igual que un admin normal)
  const filterByClub = !isMaster || clubId !== null
  let isPanama = false
  let esSeleccion = false
  if (clubId) {
    const cr = await sql`SELECT nombre, es_seleccion FROM clubs WHERE id=${clubId}`
    if (cr.length > 0) {
      if (String(cr[0].nombre).toLowerCase().includes('panam')) isPanama = true
      esSeleccion = !!cr[0].es_seleccion
    }
  }

  const [players, lesionesRows] = await Promise.all([
    filterByClub
      ? sql`SELECT u.id, u.nombre, u.usuario, u.activo, u.password_plain, j.id AS jugador_id, j.posicion, j.edad,
                   j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url, j.fecha_nacimiento::text AS fecha_nacimiento, j.nacionalidad,
                   j.peso_ideal_min::text AS peso_ideal_min, j.peso_ideal_max::text AS peso_ideal_max,
                   j.email, j.hora_recordatorio
            FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id
            WHERE u.rol='jugador' AND u.activo=true AND u.club_id=${clubId} ORDER BY u.nombre`
      : sql`SELECT u.id, u.nombre, u.usuario, u.activo, u.password_plain, j.id AS jugador_id, j.posicion, j.edad,
                   j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url, j.nacionalidad,
                   j.peso_ideal_min::text AS peso_ideal_min, j.peso_ideal_max::text AS peso_ideal_max,
                   j.email, j.hora_recordatorio
            FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id
            WHERE u.rol='jugador' AND u.activo=true ORDER BY u.nombre`,
    filterByClub
      ? sql`SELECT l.jugador_id::int, l.tipo_lesion, l.zona, l.estado, l.eta_dias::int, l.fecha_inicio::text, l.fecha_alta::text, l.activa
            FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id
            WHERE (l.activa=true OR l.fecha_alta >= CURRENT_DATE - 14) AND j.club_id=${clubId}`
      : sql`SELECT l.jugador_id::int, l.tipo_lesion, l.zona, l.estado, l.eta_dias::int, l.fecha_inicio::text, l.fecha_alta::text, l.activa
            FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id 
            WHERE l.activa=true OR l.fecha_alta >= CURRENT_DATE - 14`,
  ])

  const lesionMap = {}
  const recientesMap = {}
  for (const l of lesionesRows) {
    if (l.activa) {
      lesionMap[l.jugador_id] = { tipo_lesion:String(l.tipo_lesion||''), zona:String(l.zona||''), estado:String(l.estado||''), eta_dias:Number(l.eta_dias)||null, fecha_inicio:String(l.fecha_inicio||'') }
    } else {
      recientesMap[l.jugador_id] = { fecha_alta: String(l.fecha_alta||'') }
    }
  }

  // Bulk-load all training logs, last sessions, and last wellness in 3 queries
  // instead of 3 queries × N players (N+1 problem)
  const jugadorIds = players.map(p => p.jugador_id)

  const [allLogs, allLastSessions, allLastWellness, allAusencias, sessionTodayRows] = jugadorIds.length === 0
    ? [[], [], [], [], []]
    : await Promise.all([
        sql`SELECT id, jugador_id::int, fecha::text, carga_ua::int, rpe::int, rpe_gimnasio::int, duracion_min::int, tipo_sesion
            FROM entrenamiento_logs
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
              AND fecha >= CURRENT_DATE - 120
            ORDER BY jugador_id, fecha ASC`,
        sql`SELECT DISTINCT ON (jugador_id) jugador_id::int, fecha::text
            FROM entrenamiento_logs
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
            ORDER BY jugador_id, fecha DESC`,
        sql`SELECT DISTINCT ON (jugador_id)
              jugador_id::int, fecha::text, 
              ROUND(AVG(fatiga))::int AS fatiga, 
              ROUND(AVG(calidad_sueno))::int AS calidad_sueno,
              ROUND(AVG(dolor_muscular))::int AS dolor_muscular, 
              ROUND(AVG(nivel_estres))::int AS nivel_estres, 
              ROUND(AVG(estado_animo))::int AS estado_animo, 
              MAX(dolor_zona) AS dolor_zona,
              ROUND(AVG(COALESCE(horas_sueno::numeric,0)))::numeric AS horas_sueno,
              ROUND(AVG(COALESCE(tqr::int,0)))::int AS tqr, 
              ROUND(AVG(COALESCE(recovery::int,0)))::int AS recovery,
              MAX(COALESCE(entrena_grupo::text,'true')) AS entrena_grupo,
              MAX(COALESCE(fue_gimnasio::text,'false')) AS fue_gimnasio,
              MAX(COALESCE(grupos_musculares,'')) AS grupos_musculares
            FROM wellness_logs
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
            GROUP BY jugador_id, fecha
            ORDER BY jugador_id, fecha DESC`,
        sql`SELECT jugador_id::int, fecha::text
            FROM ausencias
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
              AND fecha >= CURRENT_DATE - 120
            ORDER BY jugador_id, fecha ASC`.catch(() => []),
        filterByClub 
          ? sql`SELECT 1 FROM sesiones_plan WHERE fecha = CURRENT_DATE AND club_id = ${clubId} LIMIT 1`
          : sql`SELECT 1 FROM sesiones_plan WHERE fecha = CURRENT_DATE LIMIT 1`
      ])

  const hasSessionToday = Array.isArray(sessionTodayRows) && sessionTodayRows.length > 0;

  // Index by jugador_id for O(1) lookup
  const logsByPlayer: Record<number, any[]> = {}
  for (const l of allLogs as any[]) {
    if (!logsByPlayer[l.jugador_id]) logsByPlayer[l.jugador_id] = []
    logsByPlayer[l.jugador_id].push(l)
  }
  const lastSessionByPlayer: Record<number, any> = {}
  for (const r of allLastSessions as any[]) lastSessionByPlayer[r.jugador_id] = r
  const lastWellnessByPlayer: Record<number, any> = {}
  for (const r of allLastWellness as any[]) lastWellnessByPlayer[r.jugador_id] = r

  const teamData = players.map((p) => {
    const logs = logsByPlayer[p.jugador_id] || []
    const sl = logs.map(l => ({ fecha: String(l.fecha), carga_ua: Number(l.carga_ua) || 0 }))
    const rw = lastWellnessByPlayer[p.jugador_id] || null
    const lastW = rw ? {
      fecha: String(rw.fecha), fatiga: Number(rw.fatiga)||0, calidad_sueno: Number(rw.calidad_sueno)||0,
      dolor_muscular: Number(rw.dolor_muscular)||0, nivel_estres: Number(rw.nivel_estres)||0,
      estado_animo: Number(rw.estado_animo)||0, dolor_zona: String(rw.dolor_zona||''),
      tqr: Number(rw.tqr)||0, recovery: Number(rw.recovery)||0,
      entrena_grupo: String(rw.entrena_grupo) !== 'false',
      fue_gimnasio: String(rw.fue_gimnasio) === 'true',
      grupos_musculares: String(rw.grupos_musculares||''),
      horas_sueno: parseFloat(rw.horas_sueno)||0,
    } : null
    const respondedToday = lastW?.fecha === today
    const logsToday = logs.filter(l => String(l.fecha) === today)
    const fueGimnasioHoy = lastW?.fue_gimnasio || logsToday.some(l => Number(l.rpe_gimnasio) > 0)
    const jugadorAusencias = new Set(
      (allAusencias as any[]).filter((a:any) => Number(a.jugador_id) === p.jugador_id).map((a:any) => String(a.fecha))
    )
    return {
      id: p.id, nombre: String(p.nombre), usuario: String(p.usuario), activo: Boolean(p.activo),
      password_plain: p.password_plain ? String(p.password_plain) : null,
      jugador_id: p.jugador_id, posicion: String(p.posicion||''), edad: Number(p.edad)||null,
      peso_kg: String(p.peso_kg||''), estatura_cm: Number(p.estatura_cm)||null, pie_habil: String(p.pie_habil||''),
      foto_url: p.foto_url ? String(p.foto_url) : null,
      fecha_nacimiento: p.fecha_nacimiento ? String(p.fecha_nacimiento) : null,
      nacionalidad: p.nacionalidad ? String(p.nacionalidad) : null,
      club_origen: p.club_origen ? String(p.club_origen) : null,
      email: p.email ? String(p.email) : null,
      hora_recordatorio: p.hora_recordatorio ? String(p.hora_recordatorio) : null,
      peso_ideal_min: p.peso_ideal_min ? String(p.peso_ideal_min) : null,
      peso_ideal_max: p.peso_ideal_max ? String(p.peso_ideal_max) : null,
      posicion_orden: posOrder(p.posicion), acwr: calcACWR(sl, new Date(), 'ua', jugadorAusencias),
      recentLogs: (() => {
        const uniqueLogsMap = new Map();
        logs.forEach(l => {
          const fechaStr = String(l.fecha);
          const currentRpe = Number(l.rpe) || 0;
          const currentUa = Number(l.carga_ua) || 0;
          if (!uniqueLogsMap.has(fechaStr)) {
            uniqueLogsMap.set(fechaStr, l);
          } else {
            const existing = uniqueLogsMap.get(fechaStr);
            if (currentRpe > (Number(existing.rpe) || 0) || currentUa > (Number(existing.carga_ua) || 0)) {
              uniqueLogsMap.set(fechaStr, l);
            }
          }
        });
        return Array.from(uniqueLogsMap.values()).map(l => ({ id: Number(l.id), fecha: String(l.fecha), carga_ua: Number(l.carga_ua)||0, rpe: Number(l.rpe)||0, rpe_gimnasio: Number(l.rpe_gimnasio)||null, duracion_min: Number(l.duracion_min)||0, tipo_sesion: l.tipo_sesion||'EQUIPO' }));
      })(),
      lastWellness: lastW ? { ...lastW, fue_gimnasio: fueGimnasioHoy } : { fue_gimnasio: fueGimnasioHoy }, respondedToday, rpeToday: logsToday.length > 0,
      entrena_grupo: respondedToday ? (lastW?.entrena_grupo ?? null) : null,
      lesion: lesionMap[p.jugador_id] || null,
      alta_reciente: recientesMap[p.jugador_id] || null,
      last_session_fecha: lastSessionByPlayer[p.jugador_id] ? String(lastSessionByPlayer[p.jugador_id].fecha) : null,
    }
  })

  const sorted = [...teamData].sort((a,b) => a.posicion_orden!==b.posicion_orden ? a.posicion_orden-b.posicion_orden : a.nombre.localeCompare(b.nombre))
  return <CoachClient isPanama={isPanama} esSeleccion={esSeleccion} session={session} teamData={sorted} today={today} hasSessionToday={hasSessionToday} />
}
