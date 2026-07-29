export const dynamic = 'force-dynamic'
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

  const [jRows, logs, wRows, todayRows, gpsRows, wAllRows, cRows, inbodyRows] = await Promise.all([
    sql`SELECT u.nombre, j.posicion, j.edad, j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url, j.email, j.hora_recordatorio, j.club_id FROM usuarios u JOIN jugadores j ON j.usuario_id=u.id WHERE u.id=${session.userId}`,
    sql`SELECT fecha::text, carga_ua::int, rpe::int, rpe_gimnasio::int, duracion_min::int, tipo_sesion FROM entrenamiento_logs WHERE jugador_id=${jugadorId} AND fecha>=CURRENT_DATE-28 ORDER BY fecha ASC`,
    sql`SELECT fecha::text, fatiga::int, calidad_sueno::int, dolor_muscular::int, nivel_estres::int, estado_animo::int, dolor_zona, COALESCE(horas_sueno::numeric,0) AS horas_sueno, COALESCE(tqr::int,0) AS tqr, COALESCE(recovery::int,0) AS recovery, COALESCE(dolor_eva::int,0) AS dolor_eva, COALESCE(entrena_grupo::text,'true') AS entrena_grupo, COALESCE(fue_gimnasio::text,'false') AS fue_gimnasio, COALESCE(grupos_musculares,'') AS grupos_musculares FROM wellness_logs WHERE jugador_id=${jugadorId} ORDER BY fecha DESC LIMIT 10`,
    sql`SELECT id, fecha::text, fatiga::int, calidad_sueno::int, dolor_muscular::int, nivel_estres::int, estado_animo::int, dolor_zona, COALESCE(horas_sueno::numeric,0) AS horas_sueno, COALESCE(tqr::int,0) AS tqr, COALESCE(recovery::int,0) AS recovery, COALESCE(dolor_eva::int,0) AS dolor_eva, COALESCE(entrena_grupo::text,'true') AS entrena_grupo, COALESCE(fue_gimnasio::text,'false') AS fue_gimnasio, COALESCE(grupos_musculares,'') AS grupos_musculares FROM wellness_logs WHERE jugador_id=${jugadorId} AND fecha=${today} ORDER BY id DESC`,
    sql`SELECT MAX(max_velocity)::text AS max_vel, MAX(dist_total)::text AS max_dist, MAX(dist_hir)::text AS max_hir, MAX(n_sprints)::int AS max_sprints, COUNT(*)::int AS total_sesiones_gps FROM gps_logs WHERE jugador_id=${jugadorId}`.catch(()=>[]),
    sql`SELECT fecha::text FROM wellness_logs WHERE jugador_id=${jugadorId} ORDER BY fecha DESC LIMIT 60`.catch(()=>[]),
    sql`SELECT c.nombre FROM jugadores j JOIN clubs c ON j.club_id = c.id WHERE j.usuario_id = ${session.userId}`.catch(()=>[]),
    sql`SELECT fecha::text, peso_kg::text, mme_kg::text, masa_grasa_kg::text, imc::text, pgc_pct::text, notas FROM inbody_tests WHERE jugador_id=${jugadorId} ORDER BY fecha DESC`.catch(()=>[])
  ])

  const pw = (w) => ({ fecha:String(w.fecha), fatiga:Number(w.fatiga)||0, calidad_sueno:Number(w.calidad_sueno)||0, dolor_muscular:Number(w.dolor_muscular)||0, nivel_estres:Number(w.nivel_estres)||0, estado_animo:Number(w.estado_animo)||0, dolor_zona:String(w.dolor_zona||''), horas_sueno:parseFloat(w.horas_sueno)||0, tqr:Number(w.tqr)||0, recovery:Number(w.recovery)||0, entrena_grupo:String(w.entrena_grupo)!=='false', fue_gimnasio:String(w.fue_gimnasio)==='true', grupos_musculares:String(w.grupos_musculares||''), dolor_eva:Number(w.dolor_eva)||0 })
  const j = jRows[0] ? { posicion:String(jRows[0].posicion||''), edad:Number(jRows[0].edad)||null, peso_kg:String(jRows[0].peso_kg||''), estatura_cm:Number(jRows[0].estatura_cm)||null, pie_habil:String(jRows[0].pie_habil||''), foto_url:jRows[0].foto_url?String(jRows[0].foto_url):null, email:jRows[0].email?String(jRows[0].email):'', hora_recordatorio:String(jRows[0].hora_recordatorio||'08:00') } : null
  const sl = logs.map(l => ({ fecha:String(l.fecha), carga_ua:Number(l.carga_ua)||0 }))
  const rl = logs.map(l => ({ fecha:String(l.fecha), carga_ua:Number(l.carga_ua)||0, rpe:Number(l.rpe)||0, rpe_gimnasio:Number(l.rpe_gimnasio)||0, duracion_min:Number(l.duracion_min)||0, tipo_sesion:String(l.tipo_sesion||'') }))

  // GPS personal bests
  const gpsStats = gpsRows[0] ? {
    maxVelocidad: parseFloat(gpsRows[0].max_vel||'0') || null,
    maxDistancia: parseFloat(gpsRows[0].max_dist||'0') || null,
    maxHir: parseFloat(gpsRows[0].max_hir||'0') || null,
    maxSprints: Number(gpsRows[0].max_sprints)||null,
    totalSesionesGps: Number(gpsRows[0].total_sesiones_gps)||0,
  } : null

  // Wellness streak: consecutive days from today backwards
  const wDates = new Set((wAllRows as any[]).map((r:any) => String(r.fecha)))
  let wellnessStreak = 0
  const todayD = new Date(today)
  for (let i = 0; i < 60; i++) {
    const d = new Date(todayD); d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (wDates.has(ds)) wellnessStreak++
    else break
  }

  // Season totals from the 28-day window
  const totalSesiones = rl.length
  const totalUA = rl.reduce((s, l) => s + l.carga_ua, 0)
  const mejorRpe = rl.length ? Math.min(...rl.filter(l=>l.rpe>0).map(l=>l.rpe)) : null

  const isPanama = cRows[0] ? cRows[0].nombre.toLowerCase().includes('panam') : false;

  const inbody = inbodyRows.map((r:any) => ({
    fecha: String(r.fecha),
    peso_kg: parseFloat(r.peso_kg) || 0,
    mme_kg: parseFloat(r.mme_kg) || 0,
    masa_grasa_kg: parseFloat(r.masa_grasa_kg) || 0,
    imc: parseFloat(r.imc) || 0,
    pgc_pct: parseFloat(r.pgc_pct) || 0,
    notas: String(r.notas || '')
  }))

  const acwrData = calcACWR(sl)
  return <PlayerClient isPanama={isPanama} session={session} jugador={j} jugadorId={jugadorId} acuteLoad={acwrData.acuteLoad} recentLogs={rl} recentWellness={wRows.map(pw)} todayWellness={todayRows[0]?pw(todayRows[0]):null} todayWellnessCount={todayRows.length} today={today} gpsStats={gpsStats} wellnessStreak={wellnessStreak} totalSesiones={totalSesiones} totalUA={totalUA} mejorRpe={mejorRpe} inbodyLogs={inbody} />
}
