'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/ui/Topbar'
import WellnessForm from '@/components/forms/WellnessForm'
import RPEForm from '@/components/forms/RPEForm'
import WellnessTrend from '@/components/charts/WellnessTrend'
import InBodyPlayerChart from '@/components/charts/InBodyPlayerChart'
import PushNotificationManager, { PushToggle } from '@/components/ui/PushNotificationManager'
import RutinaFuerzaView from './RutinaFuerzaView'

// VERSION 2 - NO ACWR VISIBLE AL JUGADOR
const PLAYER_TABS = [
  { id:'dashboard', label:'Mi Estado' },
  { id:'fuerza',    label:'💪 Mi Rutina' },
  { id:'stats',     label:'🔥 Mis Stats' },
  { id:'wellness',  label:'Wellness Pre-Entreno' },
  { id:'rpe',       label:'Registrar Carga' },
  { id:'config',    label:'⚙️ Mi Perfil' },
]

const WELLNESS_KEYS   = ['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo']
const WELLNESS_LABELS = ['Fatiga','Sueño','Dolor','Estrés','Ánimo']
const WELLNESS_LABELS_PANAMA = ['Recuperación','Sueño','Músculos','Energía','Hidratación']
const WELLNESS_COLORS = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']
const toNum = (v) => Number(v) || 0
const toStr = (v) => v == null ? '—' : String(v)

function getReadiness(total) {
  if (!total) return { label:'Completá el wellness', msg:'Completá el cuestionario pre-entrenamiento.', col:'#888', emoji:'📋' }
  if (total <= 12) return { label:'Listo para entrenar', msg:'Tu bienestar es óptimo para la sesión de hoy. ¡A darle!', col:'#c8f135', emoji:'💪' }
  if (total <= 18) return { label:'Atención Wellness', msg:'Prestá atención a cómo te sentís durante el entrenamiento.', col:'#f59e0b', emoji:'⚠️' }
  return { label:'Descarga recomendada', msg:'Tu bienestar está bajo. Contale al preparador cómo estás hoy.', col:'#ef4444', emoji:'🔴' }
}

export default function PlayerDashboard({ isPanama, session, jugador, jugadorId, acuteLoad, recentLogs, recentWellness, todayWellness, todayWellnessCount, today, gpsStats, wellnessStreak, totalSesiones, totalUA, mejorRpe, inbodyLogs = [] }: any) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const router = useRouter()
  const lastWellness = recentWellness[0]

  const wellnessTotal = lastWellness?.fecha === today
    ? toNum(lastWellness.fatiga) + toNum(lastWellness.calidad_sueno) + toNum(lastWellness.dolor_muscular) + toNum(lastWellness.nivel_estres) + toNum(lastWellness.estado_animo)
    : 0

  const readiness = getReadiness(wellnessTotal)

  return (
    <div style={{ minHeight:'100vh', background:'var(--ink)' }}>
      <Topbar nombre={session.nombre} rol="jugador" tabs={PLAYER_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <main style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px' }}>

        {activeTab === 'dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Status banners */}
            <div className="anim-up" style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:140, background:todayWellness?'rgba(200,241,53,.08)':'rgba(239,68,68,.08)', border:`1px solid ${todayWellness?'rgba(200,241,53,.25)':'rgba(239,68,68,.25)'}`, borderRadius:12, padding:'12px 16px', cursor:todayWellness?'default':'pointer' }}
                onClick={() => !todayWellness && setActiveTab('wellness')}>
                <div style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:todayWellness?'var(--lime)':'#f87171', marginBottom:4, letterSpacing:'0.06em' }}>
                  {todayWellness ? '✓ WELLNESS COMPLETADO' : '⚠ WELLNESS PENDIENTE'}
                </div>
                <div style={{ fontSize:12, color:'var(--silver)' }}>
                  {todayWellness ? `Registrado el ${todayWellness.fecha}` : 'Tocá para completar ahora →'}
                </div>
              </div>
              {todayWellness && (
                <div style={{ flex:1, minWidth:140, background:todayWellness.entrena_grupo?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)', border:`1px solid ${todayWellness.entrena_grupo?'rgba(34,197,94,.25)':'rgba(239,68,68,.25)'}`, borderRadius:12, padding:'12px 16px' }}>
                  <div style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:todayWellness.entrena_grupo?'#4ade80':'#f87171', marginBottom:4, letterSpacing:'0.06em' }}>
                    {todayWellness.entrena_grupo ? '✓ DISPONIBLE HOY' : '✗ DIFERENCIADO'}
                  </div>
                  <div style={{ fontSize:12, color:'var(--silver)' }}>
                    {todayWellness.fue_gimnasio ? '🏋 Fue al gimnasio' : 'No fue al gimnasio'}
                  </div>
                </div>
              )}
            </div>

            {/* Perfil + último wellness */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              <div className="card anim-up delay-2" style={{ padding:20 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Mi perfil</p>
                {jugador?.foto_url && (
                  <div style={{ textAlign:'center', marginBottom:14 }}>
                    <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', margin:'0 auto', border:'2px solid var(--lime)' }}>
                      <img src={jugador.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                    </div>
                  </div>
                )}
                {[
                  ['Posición', toStr(jugador?.posicion)],
                  ['Edad', jugador?.edad ? `${jugador.edad} años` : '—'],
                  ['Peso', jugador?.peso_kg ? `${jugador.peso_kg} kg` : '—'],
                  ['Estatura', jugador?.estatura_cm ? `${jugador.estatura_cm} cm` : '—'],
                  ['Pie hábil', toStr(jugador?.pie_habil)],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--mist)', fontSize:13 }}>
                    <span style={{ color:'var(--silver)' }}>{k}</span>
                    <span style={{ fontWeight:500 }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Botón a Mi Rutina de Fuerza */}
              <div 
                className="anim-up delay-1" 
                onClick={() => setActiveTab('fuerza')}
                style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:12, padding:'16px 20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', transition:'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#ec4899'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--mist)'}
              >
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:24 }}>💪</span>
                  <div>
                    <div style={{ fontSize:16, fontWeight:700, color:'var(--snow)', marginBottom:2 }}>Mi Rutina de Fuerza</div>
                    <div style={{ fontSize:12, color:'var(--silver)' }}>Ver los 10 Mandamientos del día</div>
                  </div>
                </div>
                <span style={{ color:'#ec4899' }}>▶</span>
              </div>

              {/* Widgets */}
              <div className="card anim-up delay-2" style={{ padding:20 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
                  Último Wellness
                  {lastWellness && <span style={{ color:'var(--fog)', fontWeight:400, fontSize:10, marginLeft:6 }}>{lastWellness.fecha}</span>}
                </p>
                {lastWellness ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {WELLNESS_KEYS.map((k,i) => {
                      const v = toNum(lastWellness[k])
                      let col = WELLNESS_COLORS[v-1] || '#888'
                      // Para Panamá, los campos 0 a 3 se invirtieron al guardar, los mostramos des-invertidos. Hidratación (4) se muestra normal
                      const displayVal = (isPanama && i < 4 && v > 0) ? (6 - v) : v
                      const label = isPanama ? WELLNESS_LABELS_PANAMA[i] : WELLNESS_LABELS[i]
                      
                      if (isPanama && i === 4) {
                        if (v === 3) col = '#22c55e'; // Óptimo
                        else if (v === 2 || v === 4) col = '#f59e0b'; // Regular
                        else if (v === 1 || v === 5) col = '#ef4444'; // Mal
                      }
                      
                      return (
                        <div key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, color:'var(--silver)', minWidth:46 }}>{label}</span>
                          <div style={{ flex:1, height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${v*20}%`, height:'100%', background:col, borderRadius:3 }} />
                          </div>
                          <span className="mono" style={{ fontSize:12, color:col, minWidth:14, textAlign:'right' }}>{displayVal||'—'}</span>
                        </div>
                      )
                    })}
                    {toNum(lastWellness.tqr) > 0 && (
                      <div style={{ marginTop:4, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                        <span className="mono" style={{ fontSize:16, color:toNum(lastWellness.tqr)>=7?'#c8f135':toNum(lastWellness.tqr)>=4?'#f59e0b':'#ef4444' }}>{toNum(lastWellness.tqr)}</span>
                        <span style={{ fontSize:10, color:'var(--silver)', marginLeft:6 }}>TQR</span>
                      </div>
                    )}
                    {lastWellness.dolor_zona && (
                      <p style={{ fontSize:11, color:'#f87171', marginTop:2 }}>📍 {lastWellness.dolor_zona}</p>
                    )}
                  </div>
                ) : (
                  <p style={{ fontSize:13, color:'var(--silver)' }}>Sin registros aún.</p>
                )}
              </div>
            </div>

            {recentWellness.length > 1 && (
              <div className="card anim-up delay-3" style={{ padding:'20px 20px 16px' }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Tendencia Wellness</p>
                <WellnessTrend data={recentWellness} />
              </div>
            )}

            {recentLogs.length > 0 && (
              <div className="card anim-up delay-3" style={{ padding:20 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Últimas sesiones</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[...recentLogs].reverse().slice(0,7).map((log,i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--mist)', fontSize:12, gap:8 }}>
                      <span className="mono" style={{ fontSize:11, color:'var(--fog)' }}>{String(log.fecha)}</span>
                      <span style={{ color:'var(--silver)' }}>{log.tipo_sesion||'—'}</span>
                      <span style={{ color:'var(--silver)' }}>{log.duracion_min ? `${log.duracion_min} min` : '—'}</span>
                      <span className="mono" style={{ color:'var(--lime)', fontWeight:600 }}>{log.carga_ua ? `${log.carga_ua} UA` : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="anim-up delay-4">
              <button className="btn-ghost" style={{ padding:14, fontSize:14, width:'100%', position:'relative' }} onClick={() => setActiveTab('wellness')}>
                📋 Wellness Pre-Entreno
                {todayWellness && <span style={{ position:'absolute', top:8, right:10, width:8, height:8, borderRadius:'50%', background:'var(--lime)' }} />}
              </button>
              <button className="btn-lime" style={{ padding:14, fontSize:14, width:'100%' }} onClick={() => setActiveTab('rpe')}>
                ⚡ Registrar Carga →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'fuerza' && <RutinaFuerzaView jugadorId={jugadorId} today={today} recentLogs={recentLogs} />}

        {activeTab === 'wellness' && (
          <div className="anim-up">
            <div style={{ marginBottom:24 }}>
              <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>PRE-ENTRENO</h2>
              <p style={{ color:'var(--silver)', fontSize:14, marginTop:4 }}>Completá ANTES del entrenamiento de hoy.</p>
            </div>
            <div className="card" style={{ padding:28 }}>
              <WellnessForm isPanama={isPanama} jugadorId={jugadorId} todayWellness={todayWellness} todayWellnessCount={todayWellnessCount || 0} onSuccess={() => { setActiveTab('dashboard'); router.refresh() }} />
            </div>
          </div>
        )}

        {activeTab === 'rpe' && (
          <div className="anim-up">
            <div style={{ marginBottom:24 }}>
              <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>POST-ENTRENO</h2>
              <p style={{ color:'var(--silver)', fontSize:14, marginTop:4 }}>Completar 15–30 min después de finalizar.</p>
            </div>
            <div className="card" style={{ padding:28 }}>
              <RPEForm jugadorId={jugadorId} onSuccess={() => { setActiveTab('dashboard'); router.refresh() }} />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <StatsTab isPanama={isPanama} jugador={jugador} gpsStats={gpsStats} wellnessStreak={wellnessStreak} totalSesiones={totalSesiones} totalUA={totalUA} mejorRpe={mejorRpe} recentLogs={recentLogs} recentWellness={recentWellness} />
        )}

        {activeTab === 'config' && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            {/* InBody Section */}
            {inbodyLogs && inbodyLogs.length > 0 && (
              <div style={{ background:'var(--ink2)', borderRadius:16, border:'1px solid var(--border)', overflow:'hidden' }}>
                <div style={{ padding:'20px 20px 16px', borderBottom:'1px solid var(--border)', background:'linear-gradient(to right, rgba(168,85,247,0.1), transparent)' }}>
                  <h3 style={{ fontSize:15, color:'var(--snow)', fontWeight:700, margin:0, display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ color:'#a855f7' }}>⚡</span> Composición Corporal InBody
                  </h3>
                  <p style={{ fontSize:12, color:'var(--silver)', margin:'4px 0 0' }}>Tu evolución de pesajes y recomendaciones.</p>
                </div>
                
                <div style={{ padding:20, display:'flex', flexDirection:'column', gap:20 }}>
                  {/* Latest entry highlighted */}
                  <div style={{ display:'flex', flexDirection:'column', gap:12, background:'rgba(255,255,255,0.03)', padding:16, borderRadius:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:11, color:'var(--silver)', textTransform:'uppercase', letterSpacing:1 }}>Último Pesaje</span>
                      <span style={{ fontSize:11, color:'var(--lime)', fontWeight:600, background:'rgba(200,241,53,0.1)', padding:'4px 8px', borderRadius:4 }}>{inbodyLogs[0].fecha}</span>
                    </div>
                    
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12 }}>
                      <div>
                        <p style={{ fontSize:11, color:'var(--silver)', marginBottom:4 }}>Peso</p>
                        <p style={{ fontSize:16, color:'var(--snow)', fontWeight:700 }}>{inbodyLogs[0].peso_kg}<span style={{fontSize:11, fontWeight:400, color:'var(--silver)'}}> kg</span></p>
                      </div>
                      <div>
                        <p style={{ fontSize:11, color:'var(--silver)', marginBottom:4 }}>Músculo</p>
                        <p style={{ fontSize:16, color:'var(--snow)', fontWeight:700 }}>{inbodyLogs[0].mme_kg}<span style={{fontSize:11, fontWeight:400, color:'var(--silver)'}}> kg</span></p>
                      </div>
                      <div>
                        <p style={{ fontSize:11, color:'var(--silver)', marginBottom:4 }}>% Grasa</p>
                        <p style={{ fontSize:16, color:'#f87171', fontWeight:700 }}>{inbodyLogs[0].pgc_pct}<span style={{fontSize:11, fontWeight:400, color:'var(--silver)'}}> %</span></p>
                      </div>
                    </div>

                    {inbodyLogs[0].notas && (
                      <div style={{ marginTop:8, padding:12, background:'rgba(168,85,247,0.1)', borderLeft:'3px solid #a855f7', borderRadius:'0 8px 8px 0' }}>
                        <p style={{ fontSize:11, fontWeight:700, color:'#c084fc', marginBottom:4, textTransform:'uppercase' }}>Recomendación Médica</p>
                        <p style={{ fontSize:13, color:'var(--snow)', lineHeight:1.4 }}>{inbodyLogs[0].notas}</p>
                      </div>
                    )}
                  </div>

                  {/* History Chart */}
                  {inbodyLogs.length > 1 && (
                    <div style={{ marginTop: 10 }}>
                      <p style={{ fontSize:12, color:'var(--silver)', marginBottom:12, fontWeight:600 }}>Historial de Pesajes</p>
                      <InBodyPlayerChart data={inbodyLogs} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Existing Config */}
            <NotificationConfig jugadorId={jugadorId} jugador={jugador} onSaved={() => router.refresh()} />
          </div>
        )}

      </main>
      <PushNotificationManager />
    </div>
  )
}


const NOTIF_TIMEZONES = [
  { flag: '🇦🇷', tz: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { flag: '🇺🇾', tz: 'America/Montevideo', label: 'Uruguay (Montevideo)' },
  { flag: '🇧🇷', tz: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { flag: '🇨🇱', tz: 'America/Santiago', label: 'Chile (Santiago)' },
  { flag: '🇵🇾', tz: 'America/Asuncion', label: 'Paraguay (Asunción)' },
  { flag: '🇧🇴', tz: 'America/La_Paz', label: 'Bolivia (La Paz)' },
  { flag: '🇵🇪', tz: 'America/Lima', label: 'Perú (Lima)' },
  { flag: '🇨🇴', tz: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { flag: '🇪🇨', tz: 'America/Guayaquil', label: 'Ecuador (Quito)' },
  { flag: '🇻🇪', tz: 'America/Caracas', label: 'Venezuela (Caracas)' },
  { flag: '🇲🇽', tz: 'America/Mexico_City', label: 'México (CDMX)' },
  { flag: '🇨🇷', tz: 'America/Costa_Rica', label: 'Costa Rica' },
  { flag: '🇵🇦', tz: 'America/Panama', label: 'Panamá' },
  { flag: '🇩🇴', tz: 'America/Santo_Domingo', label: 'Rep. Dominicana' },
  { flag: '🇺🇸', tz: 'America/New_York', label: 'EEUU (Este)' },
  { flag: '🇺🇸', tz: 'America/Chicago', label: 'EEUU (Centro)' },
  { flag: '🇺🇸', tz: 'America/Los_Angeles', label: 'EEUU (Pacífico)' },
  { flag: '🇪🇸', tz: 'Europe/Madrid', label: 'España (Madrid)' },
]

const NOTIF_HOURS: string[] = []
for (let h = 0; h < 24; h++) {
  NOTIF_HOURS.push(`${String(h).padStart(2, '0')}:00`)
  NOTIF_HOURS.push(`${String(h).padStart(2, '0')}:30`)
}

function NotificationConfig({ jugadorId, jugador, onSaved }: any) {
  const [email, setEmail]   = useState(jugador?.email || '')
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'idle'|'saving'|'ok'|'error'>('idle')
  const [prefs, setPrefs] = useState({
    push_enabled: true,
    timezone: 'America/Argentina/Buenos_Aires',
    hora_manana: '08:00',
    hora_tarde: '20:00',
    alerta_wellness_reminder: true,
    alerta_sesion_manana: true,
  })
  const [hasSubscription, setHasSubscription] = useState(false)

  // Fetch push preferences
  useEffect(() => {
    fetch('/api/push/preferences')
      .then(r => r.json())
      .then(d => {
        if (d.preferences) setPrefs(p => ({ ...p, ...d.preferences }))
        setHasSubscription(!!d.hasSubscription)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function guardar() {
    setSaving('saving')
    try {
      // Save email in player's table
      await fetch('/api/players/config', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ email:email||null }),
      })
      
      // Save push prefs
      await fetch('/api/push/preferences', {
        method:'PUT',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(prefs),
      })
      
      setSaving('ok'); onSaved()
      setTimeout(() => setSaving('idle'), 3000)
    } catch { 
      setSaving('error')
      setTimeout(() => setSaving('idle'), 3000)
    }
  }

  const togglePref = (key: string) => {
    setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))
  }

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>

  return (
    <div className="anim-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <h2 className="display" style={{ fontSize:48, color:'var(--snow)', marginBottom:4 }}>MI PERFIL</h2>
        <p style={{ color:'var(--silver)', fontSize:14 }}>Configurá tus alertas y zona horaria.</p>
      </div>

      {/* Push Toggle */}
      <div className="card anim-up delay-1" style={{ padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Notificaciones en el Celular
        </p>
        <PushToggle onSubscriptionChange={(sub) => setHasSubscription(sub)} />
        {!hasSubscription && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,.2)' }}>
            ⚠ Activá las notificaciones push para recibir alertas de entrenamientos y partidos directamente en tu pantalla.
          </p>
        )}
      </div>

      {/* Timezone & Hours */}
      <div className="card anim-up delay-2" style={{ padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          🌍 Zona Horaria y Horarios
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--silver)', fontWeight: 600, marginBottom: 6, display: 'block' }}>País / Zona horaria</label>
            <select
              className="wp-input"
              value={prefs.timezone}
              onChange={(e) => setPrefs(p => ({ ...p, timezone: e.target.value }))}
            >
              {NOTIF_TIMEZONES.map(tz => <option key={tz.tz} value={tz.tz}>{tz.flag} {tz.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--silver)', fontWeight: 600, marginBottom: 6, display: 'block' }}>🌅 Alertas de mañana</label>
              <select className="wp-input" value={prefs.hora_manana} onChange={(e) => setPrefs(p => ({ ...p, hora_manana: e.target.value }))}>
                {NOTIF_HOURS.map(h => <option key={`m-${h}`} value={h}>{h} hs</option>)}
              </select>
              <p style={{ fontSize: 10, color: 'var(--fog)', marginTop: 4 }}>Día de partido</p>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--silver)', fontWeight: 600, marginBottom: 6, display: 'block' }}>🌙 Alertas de tarde</label>
              <select className="wp-input" value={prefs.hora_tarde} onChange={(e) => setPrefs(p => ({ ...p, hora_tarde: e.target.value }))}>
                {NOTIF_HOURS.map(h => <option key={`t-${h}`} value={h}>{h} hs</option>)}
              </select>
              <p style={{ fontSize: 10, color: 'var(--fog)', marginTop: 4 }}>Recordatorio wellness y sesión de mañana</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts selection */}
      <div className="card anim-up delay-3" style={{ padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          📬 Tipos de alertas
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { key: 'alerta_wellness_reminder', icon: '📋', label: 'Recordatorio Wellness', desc: 'Si no lo completaste, a la tarde te avisamos' },
            { key: 'alerta_sesion_manana', icon: '📅', label: 'Sesión del día siguiente', desc: 'Te avisamos a la tarde qué toca mañana (entrenamiento o partido)' }
          ].map(opt => {
            const checked = !!prefs[opt.key as keyof typeof prefs]
            return (
              <button
                key={opt.key} onClick={() => togglePref(opt.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: checked ? 'rgba(200,241,53,.04)' : 'transparent',
                  border: 'none', borderRadius: 10, cursor: 'pointer', width: '100%', textAlign: 'left',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: checked ? '2px solid var(--lime)' : '2px solid var(--fog)',
                  background: checked ? 'var(--lime)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {checked && <span style={{ fontSize: 12, color: '#000', fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: checked ? 'var(--snow)' : 'var(--silver)' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fog)' }}>{opt.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card anim-up delay-4" style={{ padding:24 }}>
        <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
          📧 Email (Respaldo)
        </p>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:12 }}>
          Si fallan las notificaciones push, te enviaremos recordatorios por email.
        </p>
        <input
          className="wp-input"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tuemail@gmail.com"
        />
      </div>

      {saving === 'error' && <p style={{ fontSize:13, color:'#ef4444', textAlign:'right' }}>Error al guardar.</p>}
      
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button
          onClick={guardar}
          disabled={saving === 'saving'}
          className="btn-lime"
          style={{ padding:'12px 28px', fontSize:14 }}
        >
          {saving === 'ok' ? '✓ GUARDADO' : saving === 'saving' ? 'GUARDANDO...' : '💾 GUARDAR CONFIGURACIÓN'}
        </button>
      </div>
    </div>
  )
}

// ─── Mis Stats ────────────────────────────────────────────────────────────────
function StatsTab({ isPanama, jugador, gpsStats, wellnessStreak, totalSesiones, totalUA, mejorRpe, recentLogs, recentWellness }: any) {
  const card: any = { background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }

  const streakEmoji = wellnessStreak >= 14 ? '🔥' : wellnessStreak >= 7 ? '⚡' : wellnessStreak >= 3 ? '✅' : '📋'
  const streakLabel = wellnessStreak >= 14 ? '¡En racha!' : wellnessStreak >= 7 ? 'Constante' : wellnessStreak >= 3 ? 'Bien encaminado' : 'Empezá hoy'

  // Carga por semana (últimas 4 semanas)
  const weeklyUA: number[] = [0, 0, 0, 0]
  const now = new Date()
  recentLogs.forEach((l: any) => {
    const daysAgo = Math.floor((now.getTime() - new Date(l.fecha + 'T12:00:00').getTime()) / 86400000)
    const wi = Math.floor(daysAgo / 7)
    if (wi < 4) weeklyUA[wi] += Number(l.carga_ua) || 0
  })
  weeklyUA.reverse()
  const maxWeekUA = Math.max(...weeklyUA, 1)

  // RPE Streak: días consecutivos contestando RPE (hacia atrás desde hoy o ayer)
  let rpeStreak = 0
  const rpeDates = new Set(recentLogs.filter((l:any) => l.rpe > 0).map((l:any) => String(l.fecha)))
  const todayD2 = new Date()
  for (let i = 0; i < 30; i++) {
    const d = new Date(todayD2); d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    if (rpeDates.has(ds)) {
      rpeStreak++
    } else {
      if (i > 0) break // permits missing today, but if missed yesterday, breaks
    }
  }

  const wAvg = recentWellness.slice(0, 7).length > 0
    ? Math.round(recentWellness.slice(0, 7).reduce((s: number, w: any) =>
        s + Number(w.fatiga) + Number(w.calidad_sueno) + Number(w.dolor_muscular) + Number(w.nivel_estres) + Number(w.estado_animo), 0
      ) / recentWellness.slice(0, 7).length)
    : null

  const STAT_CARDS = [
    { icon:'🔥', label:'Racha Wellness', value: wellnessStreak, unit:'días', sub: streakLabel, color: wellnessStreak >= 7 ? '#c8f135' : wellnessStreak >= 3 ? '#f59e0b' : '#94a3b8', badge: streakEmoji },
    { icon:'💨', label:'Velocidad Máxima', value: gpsStats?.maxVelocidad ? Number(gpsStats.maxVelocidad).toFixed(1) : '—', unit:'km/h', sub: gpsStats?.maxVelocidad ? 'Récord personal GPS' : 'Sin datos GPS aún', color:'#06b6d4', badge: null },
    { icon:'⚡', label:'Racha RPE', value: rpeStreak, unit:'días', sub: rpeStreak > 0 ? 'Contestando carga post-entreno' : 'Últimos 30 días', color:'#a3e635', badge: null },
    { icon:'🏃', label:'Sesiones (28 días)', value: totalSesiones, unit:'sesiones', sub: `${totalUA} UA acumuladas`, color:'#f97316', badge: null },
    { icon:'🏅', label:'Sesiones GPS', value: gpsStats?.totalSesionesGps ?? 0, unit:'', sub: gpsStats?.maxSprints ? `Máx. ${gpsStats.maxSprints} sprints` : 'Sin datos GPS', color:'#8b5cf6', badge: null },
  ]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="anim-up">
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:48, color:'var(--snow)', margin:0, letterSpacing:'0.04em' }}>MIS STATS</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Tus números personales · Temporada en curso</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }} className="anim-up">
        {STAT_CARDS.map((s, i) => (
          <div key={i} style={{ ...card, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:12, right:14, fontSize:24, opacity:0.12 }}>{s.icon}</div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{s.label}</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
              <span style={{ fontSize:36, fontWeight:900, color:s.color, fontFamily:'DM Mono,monospace', lineHeight:1 }}>{s.value}</span>
              {s.unit && <span style={{ fontSize:12, color:'var(--silver)' }}>{s.unit}</span>}
              {s.badge && <span style={{ fontSize:18, marginLeft:4 }}>{s.badge}</span>}
            </div>
            <div style={{ fontSize:11, color:'var(--fog)' }}>{s.sub}</div>
          </div>
        ))}
      </div>



      {/* Récords GPS */}
      {gpsStats && (gpsStats.maxVelocidad || gpsStats.maxDistancia) && (
        <div style={card} className="anim-up">
          <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>🛰 Récords GPS personales</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              { label:'Velocidad máxima', value: gpsStats.maxVelocidad ? `${Number(gpsStats.maxVelocidad).toFixed(1)} km/h` : '—', color:'#06b6d4', pct: gpsStats.maxVelocidad ? Math.min((Number(gpsStats.maxVelocidad)/38)*100, 100) : 0 },
              { label:'Distancia máxima (una sesión)', value: gpsStats.maxDistancia ? `${(Number(gpsStats.maxDistancia)/1000).toFixed(1)} km` : '—', color:'#a3e635', pct: gpsStats.maxDistancia ? Math.min((Number(gpsStats.maxDistancia)/14000)*100, 100) : 0 },
              { label:'Distancia máxima en HSR', value: gpsStats.maxHir ? `${Number(gpsStats.maxHir).toFixed(0)} m` : '—', color:'#f59e0b', pct: gpsStats.maxHir ? Math.min((Number(gpsStats.maxHir)/2000)*100, 100) : 0 },
              { label:'Sprints máximos (una sesión)', value: gpsStats.maxSprints ? `${gpsStats.maxSprints} sprints` : '—', color:'#f97316', pct: gpsStats.maxSprints ? Math.min((gpsStats.maxSprints/30)*100, 100) : 0 },
            ].map((r, i) => (
              <div key={i}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:12, color:'var(--silver)' }}>{r.label}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:r.color, fontFamily:'DM Mono,monospace' }}>{r.value}</span>
                </div>
                <div style={{ height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${r.pct}%`, height:'100%', background:r.color, borderRadius:3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bienestar promedio */}
      {wAvg !== null && (
        <div style={{ ...card, background: wAvg <= 12 ? 'rgba(200,241,53,.05)' : wAvg <= 18 ? 'rgba(245,158,11,.05)' : 'rgba(239,68,68,.05)', border:`1px solid ${wAvg <= 12 ? 'rgba(200,241,53,.2)' : wAvg <= 18 ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)'}` }} className="anim-up">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Bienestar promedio · últimos 7 días</p>
              <p style={{ fontSize:12, color:'var(--silver)' }}>
                {wAvg <= 12 ? '💪 Zona óptima — seguí así' : wAvg <= 18 ? '⚠ Bienestar moderado' : '🔴 Bajo — hablá con el profe'}
              </p>
            </div>
            <div style={{ fontSize:44, fontWeight:900, color: wAvg <= 12 ? 'var(--lime)' : wAvg <= 18 ? '#f59e0b' : '#ef4444', fontFamily:'DM Mono,monospace', lineHeight:1 }}>{wAvg}</div>
          </div>
        </div>
      )}

      {/* Historial de Sesiones */}
      <div style={card} className="anim-up">
        <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>📅 Historial de Sesiones (Últimos 28 días)</p>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--mist)' }}>
                {['Fecha', 'RPE', 'Duración', 'Carga (UA)'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'8px 4px', color:'var(--fog)', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr><td colSpan={4} style={{ padding:20, textAlign:'center', color:'var(--fog)' }}>Sin sesiones registradas recientemente.</td></tr>
              ) : recentLogs.map((l: any, i: number) => (
                <tr key={i} style={{ borderBottom:'1px solid rgba(255,255,255,.03)' }}>
                  <td style={{ padding:'10px 4px', color:'var(--silver)' }}>{l.fecha?.split('-').slice(1).reverse().join('/')}</td>
                  <td style={{ padding:'10px 4px' }}>
                    <span style={{ 
                      padding:'2px 8px', borderRadius:4, background: l.rpe > 7 ? '#ef444422' : l.rpe > 4 ? '#f59e0b22' : '#22c55e22',
                      color: l.rpe > 7 ? '#ef4444' : l.rpe > 4 ? '#f59e0b' : '#22c55e', fontWeight:700
                    }}>
                      {l.rpe || '—'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 4px', color:'var(--silver)' }}>{l.duracion_min} min</td>
                  <td style={{ padding:'10px 4px', fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{l.carga_ua}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
