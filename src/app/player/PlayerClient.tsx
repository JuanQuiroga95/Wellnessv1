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
  { id:'gps',       label:'📡 Mis GPS' },
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

        {activeTab === 'gps' && (
          <PlayerGpsView jugador={session} />
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

// GPS view for player profile — Catapult-style report
function PlayerGpsView({ jugador }: { jugador: any }) {
  const [logs, setLogs] = useState<any[]>([])
  const [resumen, setResumen] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rango, setRango] = useState<'30'|'90'|'180'>('90')

  useEffect(() => {
    setLoading(true)
    const hasta = new Date().toISOString().split('T')[0]
    const d = new Date(); d.setDate(d.getDate() - Number(rango))
    const desde = d.toISOString().split('T')[0]
    fetch(`/api/gps/player?desde=${desde}&hasta=${hasta}`)
      .then(r=>r.json())
      .then(d => { setLogs(d.logs||[]); setResumen(d.resumen||null) })
      .catch(()=>{})
      .finally(()=>setLoading(false))
  }, [rango])

  const GPS_METRICS = [
    {key:'dist_total',label:'Tot Dist',unit:'m',color:'#60a5fa',res:'dist_total_avg',resLabel:'prom/ses'},
    {key:'dist_hir',label:'High Speed',unit:'m',color:'#f59e0b',res:'dist_hir_avg',resLabel:'prom/ses'},
    {key:'dist_v4',label:'Vel B4',unit:'m',color:'#34d399',res:'dist_v4_sum',resLabel:'total'},
    {key:'dist_v5',label:'Vel B6',unit:'m',color:'#f97316',res:'dist_v5_sum',resLabel:'total'},
    {key:'max_velocity',label:'Vel. Máx',unit:'km/h',color:'#ef4444',res:'max_velocity_max',resLabel:'máx'},
    {key:'acc2',label:'Acc B2-3',unit:'nº',color:'#a78bfa',res:'acc2_avg',resLabel:'prom/ses'},
    {key:'dec2',label:'Dec B2-3',unit:'nº',color:'#a78bfa',res:'dec2_avg',resLabel:'prom/ses'},
    {key:'dist_per_min',label:'m/min',unit:'',color:'#c8f135',res:'dist_per_min_avg',resLabel:'prom'},
  ]

  // Bar chart helper
  const renderMiniBar = (vals: number[], color: string) => {
    const maxV = Math.max(...vals, 1)
    return (
      <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:32, marginTop:6 }}>
        {vals.slice(-10).map((v,i)=>(
          <div key={i} style={{ flex:1, borderRadius:'2px 2px 0 0', minHeight:2,
            height:`${Math.max((v/maxV)*30, v>0?2:0)}px`,
            background: v>0 ? color : `${color}22` }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding:'20px 0' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:10, marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'var(--snow)', letterSpacing:'0.04em', marginBottom:2 }}>📡 MIS DATOS GPS</h2>
          <p style={{ fontSize:12, color:'var(--silver)' }}>Carga externa · Datos importados por el preparador</p>
        </div>
        <div style={{ display:'flex', gap:4, background:'var(--ink2)', borderRadius:8, padding:3, border:'1px solid var(--mist)' }}>
          {(['30','90','180'] as const).map(r=>(
            <button key={r} onClick={()=>setRango(r)} style={{ padding:'5px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', border:'none',
              background:rango===r?'var(--lime)':'transparent', color:rango===r?'var(--ink)':'var(--silver)' }}>
              {r}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
      ) : !logs.length ? (
        <div style={{ padding:32, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:14, border:'1px solid var(--mist)' }}>
          <div style={{ fontSize:28, marginBottom:8 }}>📡</div>
          <p style={{ fontSize:13, marginBottom:6 }}>Sin datos GPS para este período</p>
          <p style={{ fontSize:11, color:'var(--fog)' }}>El preparador importa los datos GPS después de cada sesión.</p>
        </div>
      ) : (<>

        {/* KPIs resumen */}
        {resumen && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
            {GPS_METRICS.map(m => {
              const val = resumen[m.res]
              return (
                <div key={m.key} style={{ background:'var(--ink2)', borderRadius:12, padding:14, textAlign:'center', border:`1px solid ${m.color}22` }}>
                  <div style={{ fontSize:22, fontWeight:700, fontFamily:'DM Mono,monospace', color:m.color, lineHeight:1 }}>
                    {val || '—'}
                  </div>
                  <div style={{ fontSize:8, color:'var(--fog)', marginTop:2, textTransform:'uppercase', letterSpacing:'0.04em' }}>{m.resLabel}</div>
                  <div style={{ fontSize:9, color:'var(--silver)', marginTop:3, fontWeight:600, textTransform:'uppercase' }}>{m.label}</div>
                  {val > 0 && renderMiniBar(logs.map(l=>Number(l[m.key])||0).reverse(), m.color)}
                </div>
              )
            })}
          </div>
        )}

        {/* Sesiones count */}
        <div style={{ display:'flex', gap:12, marginBottom:16, fontSize:11, color:'var(--fog)' }}>
          <span style={{ color:'var(--lime)', fontWeight:700 }}>{resumen?.sesiones || logs.length} sesiones</span>
          <span>en los últimos {rango} días</span>
          {resumen?.dist_total_sum && <span>· {(resumen.dist_total_sum/1000).toFixed(1)} km totales</span>}
          {resumen?.max_velocity_max && <span>· Vel. máx {resumen.max_velocity_max} km/h</span>}
        </div>

        {/* Tabla de sesiones — estilo informe Catapult */}
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.08em' }}>CUADRO RESUMEN · SESIONES</p>
            <p style={{ fontSize:10, color:'var(--fog)' }}>{logs.length} registros</p>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(96,165,250,.05)' }}>
                  {['Fecha','MD','Tipo','Tot Dist','m/min','Vel B4','High Speed','Vel B6','Vel Máx','Acc B2-3','Dec B2-3'].map(h=>(
                    <th key={h} style={{ padding:'7px 8px', textAlign:h==='Fecha'||h==='MD'||h==='Tipo'?'left':'center', color:'#93c5fd', fontSize:8, fontWeight:600, textTransform:'uppercase', whiteSpace:'nowrap', letterSpacing:'0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l:any,i:number)=>{
                  // Merge fixed cols + metricas JSON
                  const met = typeof l.metricas === 'object' ? l.metricas : {}
                  const get = (k:string) => l[k] ?? met[k] ?? null
                  const fmt = (v:any) => (v !== null && v !== undefined && v !== 0) ? v : '—'
                  return (
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                      <td style={{ padding:'7px 8px', color:'var(--snow)', whiteSpace:'nowrap', fontFamily:'DM Mono,monospace', fontSize:10 }}>{l.fecha}</td>
                      <td style={{ padding:'7px 8px', color:'var(--lime)', fontWeight:600, fontSize:10 }}>{l.md_label||'—'}</td>
                      <td style={{ padding:'7px 8px', fontSize:9 }}>
                        <span style={{ padding:'2px 6px', borderRadius:4, background:l.tipo_sesion==='partido'?'rgba(59,130,246,.15)':'rgba(200,241,53,.1)', color:l.tipo_sesion==='partido'?'#93c5fd':'var(--lime)', fontWeight:600 }}>
                          {l.tipo_sesion==='partido'?'🏆 Partido':'⚽ Ent.'}
                        </span>
                      </td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:get('dist_total')?'#60a5fa':'var(--fog)' }}>{fmt(get('dist_total'))}</td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:get('dist_per_min')?'#c8f135':'var(--fog)' }}>{fmt(get('dist_per_min'))}</td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:get('dist_v4')?'#34d399':'var(--fog)' }}>{fmt(get('dist_v4'))}</td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:get('dist_hir')?'#f59e0b':'var(--fog)' }}>{fmt(get('dist_hir'))}</td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:get('dist_v5')?'#f97316':'var(--fog)' }}>{fmt(get('dist_v5'))}</td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:get('max_velocity')?'#ef4444':'var(--fog)' }}>{fmt(get('max_velocity'))}</td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:get('acc2')?'#a78bfa':'var(--fog)' }}>{fmt(get('acc2'))}</td>
                      <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:get('dec2')?'#a78bfa':'var(--fog)' }}>{fmt(get('dec2'))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>)}
    </div>
  )
}
