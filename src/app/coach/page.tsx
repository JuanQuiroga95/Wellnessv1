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

  // Ensure password_plain column exists before querying it
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_plain TEXT` } catch {}

  // isMaster sin clubId = super-vista de todos los clubes
  // isMaster con clubId = ve solo su club (igual que un admin normal)
  const filterByClub = !isMaster || clubId !== null
  const [players, lesionesRows] = await Promise.all([
    filterByClub
      ? sql`SELECT u.id, u.nombre, u.usuario, u.activo, u.password_plain, j.id AS jugador_id, j.posicion, j.edad,
                   j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url
            FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id
            WHERE u.rol='jugador' AND u.activo=true AND u.club_id=${clubId} ORDER BY u.nombre`
      : sql`SELECT u.id, u.nombre, u.usuario, u.activo, u.password_plain, j.id AS jugador_id, j.posicion, j.edad,
                   j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url
            FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id
            WHERE u.rol='jugador' AND u.activo=true ORDER BY u.nombre`,
    filterByClub
      ? sql`SELECT l.jugador_id::int, l.tipo_lesion, l.zona, l.estado, l.eta_dias::int, l.fecha_inicio::text
            FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id
            WHERE l.activa=true AND j.club_id=${clubId}`
      : sql`SELECT l.jugador_id::int, l.tipo_lesion, l.zona, l.estado, l.eta_dias::int, l.fecha_inicio::text
            FROM lesiones l JOIN jugadores j ON j.id=l.jugador_id WHERE l.activa=true`,
  ])

  const lesionMap = {}
  for (const l of lesionesRows) {
    lesionMap[l.jugador_id] = { tipo_lesion:String(l.tipo_lesion||''), zona:String(l.zona||''), estado:String(l.estado||''), eta_dias:Number(l.eta_dias)||null, fecha_inicio:String(l.fecha_inicio||'') }
  }

  // Bulk-load all training logs, last sessions, and last wellness in 3 queries
  // instead of 3 queries × N players (N+1 problem)
  const jugadorIds = players.map(p => p.jugador_id)

  const [allLogs, allLastSessions, allLastWellness, allAusencias] = jugadorIds.length === 0
    ? [[], [], [], []]
    : await Promise.all([
        sql`SELECT id, jugador_id::int, fecha::text, carga_ua::int, rpe::int, duracion_min::int
            FROM entrenamiento_logs
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
              AND fecha >= CURRENT_DATE - 28
            ORDER BY jugador_id, fecha ASC`,
        sql`SELECT DISTINCT ON (jugador_id) jugador_id::int, fecha::text
            FROM entrenamiento_logs
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
            ORDER BY jugador_id, fecha DESC`,
        sql`SELECT DISTINCT ON (jugador_id)
              jugador_id::int, fecha::text, fatiga::int, calidad_sueno::int,
              dolor_muscular::int, nivel_estres::int, estado_animo::int, dolor_zona,
              COALESCE(tqr::int,0) AS tqr, COALESCE(recovery::int,0) AS recovery,
              COALESCE(entrena_grupo::text,'true') AS entrena_grupo,
              COALESCE(fue_gimnasio::text,'false') AS fue_gimnasio,
              COALESCE(grupos_musculares,'') AS grupos_musculares
            FROM wellness_logs
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
            ORDER BY jugador_id, fecha DESC`,
        sql`SELECT jugador_id::int, fecha::text
            FROM ausencias
            WHERE jugador_id IN (SELECT unnest(${jugadorIds}::int[]))
              AND fecha >= CURRENT_DATE - 28
            ORDER BY jugador_id, fecha ASC`.catch(() => []),
      ])

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
    } : null
    const respondedToday = lastW?.fecha === today
    const jugadorAusencias = new Set(
      (allAusencias as any[]).filter((a:any) => Number(a.jugador_id) === p.jugador_id).map((a:any) => String(a.fecha))
    )
    return {
      id: p.id, nombre: String(p.nombre), usuario: String(p.usuario), activo: Boolean(p.activo),
      password_plain: p.password_plain ? String(p.password_plain) : null,
      jugador_id: p.jugador_id, posicion: String(p.posicion||''), edad: Number(p.edad)||null,
      peso_kg: String(p.peso_kg||''), estatura_cm: Number(p.estatura_cm)||null, pie_habil: String(p.pie_habil||''),
      foto_url: p.foto_url ? String(p.foto_url) : null,
      posicion_orden: posOrder(p.posicion), acwr: calcACWR(sl, new Date(), 'ua', jugadorAusencias),
      recentLogs: logs.map(l => ({ id: Number(l.id), fecha: String(l.fecha), carga_ua: Number(l.carga_ua)||0, rpe: Number(l.rpe)||0, duracion_min: Number(l.duracion_min)||0 })),
      lastWellness: lastW, respondedToday, entrena_grupo: respondedToday ? (lastW?.entrena_grupo ?? null) : null,
      lesion: lesionMap[p.jugador_id] || null,
      last_session_fecha: lastSessionByPlayer[p.jugador_id] ? String(lastSessionByPlayer[p.jugador_id].fecha) : null,
    }
  })

  const sorted = [...teamData].sort((a,b) => a.posicion_orden!==b.posicion_orden ? a.posicion_orden-b.posicion_orden : a.nombre.localeCompare(b.nombre))
  return <CoachClient session={session} teamData={sorted} today={today} />
}
