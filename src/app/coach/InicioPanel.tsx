import React, { useState, useEffect } from 'react'
import { Icons, PanelHeader, CuadroHeader } from './Headers'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + n)
  return localDateStr(date)
}

function getObjetivoIcon(obj: string) {
  if (!obj) return null
  const s = obj.toLowerCase()
  if (s.includes('fuerza') || s.includes('tensi')) return '🏋️‍♂️'
  if (s.includes('velocidad') || s.includes('tappering')) return '⚡'
  if (s.includes('resistencia') || s.includes('duraci') || s.includes('aerob') || s.includes('potencia')) return '🏃‍♂️'
  if (s.includes('equilibrio') || s.includes('regeneraci') || s.includes('recuperaci')) return '🧘‍♂️'
  return null
}

const CustomTooltip = ({ active, payload, label, isReadiness = false }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background:'rgba(8,8,8,0.9)', border:'1px solid var(--mist)', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
        <p style={{ margin:0, color:'var(--silver)', marginBottom:4 }}>{label}</p>
        <p style={{ margin:0, color:'var(--snow)', fontWeight:700 }}>
          {payload[0].value} {isReadiness ? 'pts' : 'RPE/Load'}
        </p>
      </div>
    )
  }
  return null
}

export default function InicioPanel({ teamData, session, today }: { teamData: any[], session: any, today: string }) {
  const [loading, setLoading] = useState(true)
  const [agenda, setAgenda] = useState<{ hoy: any[], manana: any[] }>({ hoy: [], manana: [] })
  const [loadData, setLoadData] = useState<any[]>([])
  const [readinessData, setReadinessData] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const tomorrow = addDays(today, 1)
        const pastWeek = addDays(today, -7)
        
        // Fetch Agenda (Today and Tomorrow)
        const calRes = await fetch(`/api/calendario?desde=${today}&hasta=${tomorrow}`)
        const calData = await calRes.json()
        const allEvents = [...(calData.sesiones || []), ...(calData.partidos || [])]
        const hoy = allEvents.filter((d: any) => d.fecha.startsWith(today))
        const manana = allEvents.filter((d: any) => d.fecha.startsWith(tomorrow))
        setAgenda({ hoy, manana })

        // Fetch Load Trend (Last 7 days)
        const loadRes = await fetch(`/api/carga-gps?desde=${pastWeek}&hasta=${today}&ciclo=microciclo`)
        const loadD = await loadRes.json()
        if (loadD.sesionesInfo) {
          // Flatten sesiones into daily points for a simple chart
          const dailyLoad = loadD.sesionesInfo.map((s: any) => ({
            name: s.fecha.slice(5, 10), // MM-DD
            load: s.avg_rpe ? parseFloat(s.avg_rpe) : 0
          }))
          setLoadData(dailyLoad.slice(-7)) // Keep only last 7
        }

        // Fetch Readiness Trend
        const readRes = await fetch(`/api/readiness?desde=${pastWeek}&hasta=${today}`)
        const readD = await readRes.json()
        if (readD.daily) {
          const dailyReadiness = readD.daily.map((d: any) => ({
            name: d.date.slice(5, 10),
            readiness: Math.round(d.avgReadiness || 0)
          }))
          setReadinessData(dailyReadiness)
        }
      } catch (err) {
        console.error("Error fetching dashboard data", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [today])

  // KPIs
  const injured = teamData.filter(p => p.lesion).length
  const atRisk = teamData.filter(p => p.acwr?.status === 'peligro' || p.acwr?.status === 'precaucion').length
  const missingWellness = teamData.filter(p => !p.respondedToday && !p.lesion && p.entrena_grupo !== false).length

  // Helper for birthdays
  function isBirthdayUpcoming(dateStr, todayStr) {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-');
    const [ty, tm, td] = todayStr.split('-');
    
    const today = new Date(ty, tm - 1, td);
    const bday = new Date(ty, m - 1, d); // this year's birthday
    
    // If birthday passed this year, check next year
    if (bday < today) bday.setFullYear(parseInt(ty) + 1);
    
    const diffTime = Math.abs(bday - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  }
  
  const upcomingBirthdays = teamData.filter(p => isBirthdayUpcoming(p.fecha_nacimiento, today));
  const readaptacionPlayers = teamData.filter(p => p.lesion && p.lesion.estado === 'Readaptación');
  const hasAlerts = upcomingBirthdays.length > 0 || readaptacionPlayers.length > 0;


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <AnimateOnScroll delay={100}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, var(--ink2), var(--ink3))', border: '1px solid var(--mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            👋
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: 'var(--snow)', fontWeight: 800, letterSpacing: '-0.02em' }}>
              Hola, {session.nombre}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fog)', marginTop: 4 }}>
              Resumen del día • {new Date(today + 'T12:00:00Z').toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}
            </p>
          </div>
        </div>
      </AnimateOnScroll>

      {/* KPIs Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        <AnimateOnScroll delay={200}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: injured > 0 ? '#ef4444' : '#22c55e' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Enfermería</p>
                <div style={{ fontSize: 36, color: 'var(--snow)', fontWeight: 800, lineHeight: 1.2, marginTop: 8 }}>{injured}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>{injured === 1 ? 'jugador lesionado' : 'jugadores lesionados'}</p>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2 }}>🏥</div>
            </div>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={300}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: atRisk > 0 ? '#f59e0b' : '#22c55e' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Riesgo Carga (ACWR)</p>
                <div style={{ fontSize: 36, color: 'var(--snow)', fontWeight: 800, lineHeight: 1.2, marginTop: 8 }}>{atRisk}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>{atRisk === 1 ? 'jugador en alerta' : 'jugadores en alerta'}</p>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2 }}>⚠️</div>
            </div>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={400}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: missingWellness > 0 ? '#60a5fa' : '#22c55e' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Falta Wellness</p>
                <div style={{ fontSize: 36, color: 'var(--snow)', fontWeight: 800, lineHeight: 1.2, marginTop: 8 }}>{missingWellness}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>{missingWellness === 1 ? 'jugador sin responder' : 'jugadores sin responder'}</p>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📱</div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Agenda Section */}
        <AnimateOnScroll delay={500}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: '100%', minHeight: 350 }}>
            <CuadroHeader title="AGENDA" subtitle="Próximas actividades" icon={Icons.planificacion} />
            
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* HOY */}
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hoy</h4>
                {loading ? <div style={{ color: 'var(--fog)', fontSize: 13 }}>Cargando...</div> : 
                 agenda.hoy.length === 0 ? <div style={{ color: 'var(--fog)', fontSize: 13, padding: '12px', background: 'var(--ink3)', borderRadius: 8, border: '1px dashed var(--mist)' }}>Día Libre / Sin actividades</div> :
                 agenda.hoy.map((e, i) => (
                  <div key={i} style={{ 
                    background: e.tipo === 'partido' ? 'linear-gradient(90deg, rgba(239,68,68,0.1), transparent)' : 'var(--ink3)', 
                    border: `1px solid ${e.tipo === 'partido' ? '#ef444455' : 'var(--mist)'}`, 
                    borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 
                  }}>
                    <div style={{ fontSize: 24 }}>
                      {e.tipo === 'partido' ? '⚽' : getObjetivoIcon(e.objetivo) || '🏃'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: e.tipo === 'partido' ? '#ef4444' : 'var(--snow)' }}>
                        {e.titulo || (e.tipo === 'partido' ? 'Partido' : 'Entrenamiento')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>
                        {e.hora_inicio ? e.hora_inicio.slice(0,5) : ''} {e.hora_inicio && e.hora_fin ? '-' : ''} {e.hora_fin ? e.hora_fin.slice(0,5) : ''}
                      </div>
                    </div>
                  </div>
                 ))
                }
              </div>

              {/* MAÑANA */}
              <div style={{ marginTop: 8 }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Mañana</h4>
                {loading ? <div style={{ color: 'var(--fog)', fontSize: 13 }}>Cargando...</div> : 
                 agenda.manana.length === 0 ? <div style={{ color: 'var(--fog)', fontSize: 13, padding: '12px', background: 'var(--ink3)', borderRadius: 8, border: '1px dashed var(--mist)' }}>Día Libre / Sin actividades</div> :
                 agenda.manana.map((e, i) => (
                  <div key={i} style={{ 
                    background: e.tipo === 'partido' ? 'linear-gradient(90deg, rgba(239,68,68,0.1), transparent)' : 'var(--ink3)', 
                    border: `1px solid ${e.tipo === 'partido' ? '#ef444455' : 'var(--mist)'}`, 
                    borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 
                  }}>
                    <div style={{ fontSize: 24, opacity: 0.7 }}>
                      {e.tipo === 'partido' ? '⚽' : getObjetivoIcon(e.objetivo) || '🏃'}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: e.tipo === 'partido' ? '#ef4444' : 'var(--snow)', opacity: 0.9 }}>
                        {e.titulo || (e.tipo === 'partido' ? 'Partido' : 'Entrenamiento')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>
                        {e.hora_inicio ? e.hora_inicio.slice(0,5) : ''} {e.hora_inicio && e.hora_fin ? '-' : ''} {e.hora_fin ? e.hora_fin.slice(0,5) : ''}
                      </div>
                    </div>
                  </div>
                 ))
                }
              </div>
            </div>
          </div>
        </AnimateOnScroll>



        {/* Alerts Section */}
        {hasAlerts && (
          <AnimateOnScroll delay={550}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: '100%', minHeight: 350 }}>
              <CuadroHeader title="ALERTAS DEL PLANTEL" subtitle="Novedades y avisos" icon={Icons.jugadores} />
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {upcomingBirthdays.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🎂 Próximos Cumpleaños</h4>
                    {upcomingBirthdays.map((p, i) => (
                      <div key={i} style={{ background: 'var(--ink3)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 20 }}>🎉</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2 }}>
                            {p.fecha_nacimiento.slice(5).replace('-','/')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {readaptacionPlayers.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏃 Readaptación (Fase Final)</h4>
                    {readaptacionPlayers.map((p, i) => (
                      <div key={i} style={{ background: 'var(--ink3)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 20 }}>🔥</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2 }}>
                            {p.lesion.tipo_lesion} - {p.lesion.zona}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AnimateOnScroll>
        )}

        {/* Charts Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <AnimateOnScroll delay={600}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: 240 }}>
              <CuadroHeader title="TENDENCIA READINESS" subtitle="Últimos 7 días (Promedio Plantel)" icon={Icons.neuromuscular} />
              <div style={{ width: '100%', height: 160, marginTop: 16 }}>
                {!loading && readinessData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={readinessData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorReadiness" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--mist)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip isReadiness={true} />} />
                      <Area 
                        isAnimationActive={true} 
                        animationDuration={15000} 
                        type="monotone" 
                        dataKey="readiness" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorReadiness)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--fog)', fontSize: 13 }}>
                    {loading ? 'Cargando...' : 'No hay datos recientes de readiness'}
                  </div>
                )}
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={700}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: 240 }}>
              <CuadroHeader title="TENDENCIA CARGA (RPE)" subtitle="Últimos 7 días (Promedio Sesiones)" icon={Icons.metricas} />
              <div style={{ width: '100%', height: 160, marginTop: 16 }}>
                {!loading && loadData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={loadData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c8f135" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#c8f135" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--mist)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        isAnimationActive={true} 
                        animationDuration={15000} 
                        type="monotone" 
                        dataKey="load" 
                        stroke="#c8f135" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorLoad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--fog)', fontSize: 13 }}>
                    {loading ? 'Cargando...' : 'No hay sesiones registradas recientemente'}
                  </div>
                )}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </div>
  )
}
