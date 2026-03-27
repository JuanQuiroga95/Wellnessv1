import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { calcACWR } from '@/lib/acwr'
import PlayerClient from './PlayerClient'

export default async function PlayerPage() {
  const session = await getSession()
  if (!session || session.rol !== 'jugador') redirect('/login')
  const sql = getDb()
  const jugadorId = session.jugadorId
  if (!jugadorId) redirect('/login')
  const today = new Date().toISOString().split('T')[0]

  const [jRows, logs, wRows, todayRows] = await Promise.all([
    sql`SELECT u.nombre, j.posicion, j.edad, j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url, j.email, j.hora_recordatorio FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id WHERE u.id=${session.userId}`,
    sql`SELECT fecha::text, carga_ua::int, rpe::int, duracion_min::int, tipo_sesion FROM entrenamiento_logs WHERE jugador_id=${jugadorId} AND fecha>=CURRENT_DATE-28 ORDER BY fecha ASC`,
    sql`SELECT fecha::text, fatiga::int, calidad_sueno::int, dolor_muscular::int, nivel_estres::int, estado_animo::int, dolor_zona, COALESCE(tqr::int,0) AS tqr, COALESCE(recovery::int,0) AS recovery, COALESCE(dolor_eva::int,0) AS dolor_eva, COALESCE(entrena_grupo::text,'true') AS entrena_grupo, COALESCE(fue_gimnasio::text,'false') AS fue_gimnasio, COALESCE(grupos_musculares,'') AS grupos_musculares FROM wellness_logs WHERE jugador_id=${jugadorId} ORDER BY fecha DESC LIMIT 10`,
    sql`SELECT fecha::text, fatiga::int, calidad_sueno::int, dolor_muscular::int, nivel_estres::int, estado_animo::int, dolor_zona, COALESCE(tqr::int,0) AS tqr, COALESCE(recovery::int,0) AS recovery, COALESCE(dolor_eva::int,0) AS dolor_eva, COALESCE(entrena_grupo::text,'true') AS entrena_grupo, COALESCE(fue_gimnasio::text,'false') AS fue_gimnasio, COALESCE(grupos_musculares,'') AS grupos_musculares FROM wellness_logs WHERE jugador_id=${jugadorId} AND fecha=${today} LIMIT 1`,
  ])

  const pw = (w) => ({ fecha:String(w.fecha), fatiga:Number(w.fatiga)||0, calidad_sueno:Number(w.calidad_sueno)||0, dolor_muscular:Number(w.dolor_muscular)||0, nivel_estres:Number(w.nivel_estres)||0, estado_animo:Number(w.estado_animo)||0, dolor_zona:String(w.dolor_zona||''), tqr:Number(w.tqr)||0, recovery:Number(w.recovery)||0, entrena_grupo:String(w.entrena_grupo)!=='false', fue_gimnasio:String(w.fue_gimnasio)==='true', grupos_musculares:String(w.grupos_musculares||''), dolor_eva:Number(w.dolor_eva)||0 })
  const j = jRows[0] ? { posicion:String(jRows[0].posicion||''), edad:Number(jRows[0].edad)||null, peso_kg:String(jRows[0].peso_kg||''), estatura_cm:Number(jRows[0].estatura_cm)||null, pie_habil:String(jRows[0].pie_habil||''), foto_url:jRows[0].foto_url?String(jRows[0].foto_url):null, email:jRows[0].email?String(jRows[0].email):'', hora_recordatorio:String(jRows[0].hora_recordatorio||'08:00') } : null
  const sl = logs.map(l => ({ fecha:String(l.fecha), carga_ua:Number(l.carga_ua)||0 }))
  const rl = logs.map(l => ({ fecha:String(l.fecha), carga_ua:Number(l.carga_ua)||0, rpe:Number(l.rpe)||0, duracion_min:Number(l.duracion_min)||0, tipo_sesion:String(l.tipo_sesion||'') }))

    // Calculate acute load for player's own status card (no ratio shown)
  const acwrData = calcACWR(sl)
  return <PlayerClient session={session} jugador={j} jugadorId={jugadorId} acuteLoad={acwrData.acuteLoad} recentLogs={rl} recentWellness={wRows.map(pw)} todayWellness={todayRows[0]?pw(todayRows[0]):null} today={today} />
}
