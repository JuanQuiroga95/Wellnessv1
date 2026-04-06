'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/ui/Topbar'
import WellnessForm from '@/components/forms/WellnessForm'
import RPEForm from '@/components/forms/RPEForm'
import WellnessTrend from '@/components/charts/WellnessTrend'

// VERSION 2 - NO ACWR VISIBLE AL JUGADOR
const PLAYER_TABS = [
  { id:'dashboard', label:'Mi Estado' },
  { id:'wellness',  label:'Wellness Pre-Entreno' },
  { id:'rpe',       label:'Registrar Carga' },
  { id:'config',    label:'⚙️ Mi Perfil' },
]

const WELLNESS_KEYS   = ['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo']
const WELLNESS_LABELS = ['Fatiga','Sueño','Dolor','Estrés','Ánimo']
const WELLNESS_COLORS = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']
const toNum = (v) => Number(v) || 0
const toStr = (v) => v == null ? '—' : String(v)

function getReadiness(total) {
  if (!total) return { label:'Completá el wellness', msg:'Completá el cuestionario pre-entrenamiento.', col:'#888', emoji:'📋' }
  if (total <= 12) return { label:'Listo para entrenar', msg:'Tu bienestar es óptimo para la sesión de hoy. ¡A darle!', col:'#c8f135', emoji:'💪' }
  if (total <= 18) return { label:'Atención Wellness', msg:'Prestá atención a cómo te sentís durante el entrenamiento.', col:'#f59e0b', emoji:'⚠️' }
  return { label:'Descarga recomendada', msg:'Tu bienestar está bajo. Contale al preparador cómo estás hoy.', col:'#ef4444', emoji:'🔴' }
}

export default function PlayerDashboard({ session, jugador, jugadorId, acuteLoad, recentLogs, recentWellness, todayWellness, today }) {
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

              <div className="card anim-up delay-2" style={{ padding:20 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
                  Último Wellness
                  {lastWellness && <span style={{ color:'var(--fog)', fontWeight:400, fontSize:10, marginLeft:6 }}>{lastWellness.fecha}</span>}
                </p>
                {lastWellness ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {WELLNESS_KEYS.map((k,i) => {
                      const v = toNum(lastWellness[k])
                      const col = WELLNESS_COLORS[v-1] || '#888'
                      return (
                        <div key={k} style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, color:'var(--silver)', minWidth:46 }}>{WELLNESS_LABELS[i]}</span>
                          <div style={{ flex:1, height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${v*20}%`, height:'100%', background:col, borderRadius:3 }} />
                          </div>
                          <span className="mono" style={{ fontSize:12, color:col, minWidth:14, textAlign:'right' }}>{v||'—'}</span>
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

        {activeTab === 'wellness' && (
          <div className="anim-up">
            <div style={{ marginBottom:24 }}>
              <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>PRE-ENTRENO</h2>
              <p style={{ color:'var(--silver)', fontSize:14, marginTop:4 }}>Completá ANTES del entrenamiento de hoy.</p>
            </div>
            <div className="card" style={{ padding:28 }}>
              <WellnessForm jugadorId={jugadorId} todayWellness={todayWellness} onSuccess={() => { setActiveTab('dashboard'); router.refresh() }} />
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

        {activeTab === 'config' && (
          <NotificationConfig jugadorId={jugadorId} jugador={jugador} onSaved={() => router.refresh()} />
        )}

      </main>
    </div>
  )
}


function NotificationConfig({ jugadorId, jugador, onSaved }) {
  const [email, setEmail]   = useState(jugador?.email || '')
  const [hora, setHora]     = useState(jugador?.hora_recordatorio || '08:00')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [err, setErr]       = useState('')

  const HORAS = ['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00','23:30']

  async function guardar() {
    setSaving(true); setErr('')
    try {
      const res = await fetch('/api/players/config', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ email:email||null, hora_recordatorio:hora }),
      })
      if (!res.ok) { const d = await res.json(); setErr(d.error||'Error'); return }
      setSaved(true); onSaved()
      setTimeout(() => setSaved(false), 3000)
    } catch { setErr('Error de conexión') }
    finally { setSaving(false) }
  }

  return (
    <div className="anim-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>MI PERFIL</h2>
        <p style={{ color:'var(--silver)', fontSize:14, marginTop:4 }}>Configurá tus notificaciones de recordatorio.</p>
      </div>

      <div className="card" style={{ padding:24 }}>
        <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
          🔔 Recordatorio Diario de Wellness
        </p>
        <p style={{ fontSize:13, color:'var(--silver)', marginBottom:20, lineHeight:1.6 }}>
          Cada día a las 08:00 hs, si todavía no completaste el wellness, la app te manda un email recordatorio con link directo al formulario.
        </p>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
              📧 Tu email
            </label>
            <input
              className="wp-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tuemail@gmail.com"
            />
            <p style={{ fontSize:11, color:'var(--fog)', marginTop:5 }}>
              Solo se usa para recordatorios. El preparador no lo ve.
            </p>
          </div>

          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
              ⏰ Horario del recordatorio
            </label>
            <select
              className="wp-input"
              value={hora}
              onChange={e => setHora(e.target.value)}
              style={{ appearance:'none' }}
            >
              {HORAS.map(h => (
                <option key={h} value={h} style={{ background:'var(--ink2)' }}>{h} hs</option>
              ))}
            </select>
            <p style={{ fontSize:11, color:'var(--fog)', marginTop:5 }}>
              El recordatorio se envía a las 08:00 hs cada día si no completaste el wellness.
            </p>
          </div>
        </div>

        {err && <p style={{ fontSize:12, color:'#f87171', marginTop:12 }}>{err}</p>}

        <button
          onClick={guardar}
          disabled={saving}
          className="btn-lime"
          style={{ width:'100%', padding:14, fontSize:14, marginTop:20 }}
        >
          {saved ? '✓ GUARDADO' : saving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN →'}
        </button>
      </div>

      <div style={{ background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:18 }}>
        <p style={{ fontSize:12, color:'var(--lime)', fontWeight:600, marginBottom:10 }}>¿Cómo funcionan los recordatorios?</p>
        {[
          '📋 Cada día a la hora elegida, el sistema verifica si completaste el wellness',
          '📧 Si no completaste, te llega un email con link directo al formulario',
          '✓ Si ya completaste, no te molesta',
          '⚙️ Podés cambiar el horario en cualquier momento desde esta pantalla',
        ].map((txt,i) => (
          <p key={i} style={{ fontSize:12, color:'var(--silver)', lineHeight:1.6, marginBottom:4 }}>{txt}</p>
        ))}
      </div>
    </div>
  )
}
