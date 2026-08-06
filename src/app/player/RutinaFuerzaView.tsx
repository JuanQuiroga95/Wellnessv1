'use client'
import React, { useState, useEffect, useRef } from 'react'

export default function RutinaFuerzaView({ jugadorId, today, recentLogs = [] }: { jugadorId: number, today: string, recentLogs?: any[] }) {
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [allRutinas, setAllRutinas] = useState<any[]>([])
  const [rutinas, setRutinas] = useState<any[]>([])
  const [rutinasFechas, setRutinasFechas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMandamiento, setExpandedMandamiento] = useState<number | null>(null)
  const rutinasContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (rutinas.length > 0 && rutinasContainerRef.current) {
      setTimeout(() => {
        rutinasContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [rutinas, selectedDate])

  // Fetch ALL routines once
  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        const res = await fetch(`/api/fuerza/rutinas?jugador_id=${jugadorId}`)
        const data = await res.json()
        if (data.rutinas) {
          setAllRutinas(data.rutinas)
          // Extract unique dates
          const uniqueDates = Array.from(new Set(data.rutinas.map((r: any) => r.fecha)))
          setRutinasFechas(uniqueDates as string[])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [jugadorId])

  // Filter locally when selectedDate changes
  useEffect(() => {
    const dailyRutinas = allRutinas.filter(r => r.fecha === selectedDate)
    setRutinas(dailyRutinas)
  }, [selectedDate, allRutinas])

  const header = (
    <div style={{ padding:'0 8px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <div>
        <h2 style={{ margin:0, fontSize:20, color:'var(--snow)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{color:'#ec4899'}}>💪</span> Los 10 Mandamientos
        </h2>
        <p style={{ margin:'4px 0 0 0', fontSize:13, color:'var(--silver)' }}>
          Rutina de fuerza del {selectedDate.split('-').reverse().join('/')}
        </p>
      </div>
      <input 
        type="date" 
        value={selectedDate} 
        onChange={(e) => setSelectedDate(e.target.value)} 
        style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, padding:'6px 12px', color:'var(--snow)', fontSize:13 }}
      />
    </div>
  )

  const renderCalendar = () => {
    // Render simple calendar for the month of selectedDate
    const date = new Date(selectedDate + 'T12:00:00')
    const year = date.getFullYear()
    const month = date.getMonth()
    let firstDay = new Date(year, month, 1).getDay() || 7 // 1 = Monday, 7 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days = []
    for(let i=1; i<firstDay; i++) days.push(null)
    for(let i=1; i<=daysInMonth; i++) days.push(new Date(year, month, i))

    return (
      <div style={{ marginTop: 24, padding: '20px 16px', background: 'var(--ink3)', borderRadius: 12, border: '1px solid var(--mist)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 14, color: 'var(--snow)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px 4px', textAlign: 'center' }}>
          {['L','M','M','J','V','S','D'].map((d, i) => <div key={i} style={{ fontSize: 11, color: 'var(--silver)', fontWeight: 600, marginBottom: 8 }}>{d}</div>)}
          {days.map((d, i) => {
            if (!d) return <div key={i} />
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
            const hasRutina = rutinasFechas.includes(dateStr)
            const isSelected = dateStr === selectedDate
            return (
              <button
                key={i}
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  background: isSelected ? '#ec4899' : (hasRutina ? 'rgba(236,72,153,0.15)' : 'transparent'),
                  color: isSelected ? '#fff' : (hasRutina ? '#fbcfe8' : 'var(--silver)'),
                  border: hasRutina && !isSelected ? '1px solid #ec4899' : '1px solid transparent',
                  borderRadius: '50%',
                  width: 34,
                  height: 34,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: hasRutina || isSelected ? 700 : 400,
                  transition: 'all 0.2s'
                }}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--silver)' }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: 'rgba(236,72,153,0.15)', border: '1px solid #ec4899' }}></span>
            Días con rutina
          </div>
        </div>
      </div>
    )
  }

  // Group by mandamiento
  const mandamientos = Array.from(new Set(rutinas.map(r => r.mandamiento_numero))).sort((a:any, b:any) => a - b)

  return (
    <div className="anim-up" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {header}
      {renderCalendar()}
      
      {rutinas.length === 0 ? (
        <div style={{ background:'var(--ink2)', border:'1px dashed var(--mist)', borderRadius:16, padding:'32px 20px', textAlign:'center', marginTop: 16 }}>
          <div style={{ fontSize:40, marginBottom:16 }}>😴</div>
          <h2 style={{ fontSize:18, color:'var(--snow)', marginBottom:8 }}>Día Libre de Fuerza</h2>
          <p style={{ color:'var(--silver)', fontSize:14, lineHeight:1.5 }}>
            No hay rutina de fuerza asignada para hoy.
          </p>
        </div>
      ) : (
        <div ref={rutinasContainerRef} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
          {mandamientos.map((num: any) => {
            const rutinasMand = rutinas.filter(r => r.mandamiento_numero === num)
        const isExpanded = expandedMandamiento === num
        
        return (
          <div key={num} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:12, overflow:'hidden' }}>
            {/* Header / Accordion toggle */}
            <button 
              onClick={() => setExpandedMandamiento(isExpanded ? null : num)}
              style={{ 
                width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', 
                padding:'16px 20px', background: isExpanded ? 'rgba(236,72,153,0.1)' : 'transparent', 
                border:'none', cursor:'pointer', textAlign:'left', transition:'background 0.2s'
              }}
            >
              <div style={{ color: isExpanded ? '#ec4899' : 'var(--snow)', fontWeight:700, fontSize:15, textTransform:'uppercase', letterSpacing:'0.05em' }}>
                {num}. {rutinasMand[0].mandamiento_nombre}
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isExpanded ? '#ec4899' : 'var(--fog)'} strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition:'transform 0.3s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {/* Content */}
            <div style={{ 
              maxHeight: isExpanded ? 2000 : 0, 
              opacity: isExpanded ? 1 : 0,
              transition: 'all 0.3s ease-in-out',
              overflow: 'hidden'
            }}>
              <div style={{ padding:'0 20px 20px 20px', display:'flex', flexDirection:'column', gap:12 }}>
                {rutinasMand.map(r => (
                  <div key={r.id} style={{ background:'var(--ink3)', borderRadius:8, padding:16, borderLeft:'4px solid #ec4899' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                        {r.ejercicio_imagen_url && (
                          <img src={r.ejercicio_imagen_url} alt="" style={{ width:60, height:60, objectFit:'cover', borderRadius:6, border:'1px solid var(--mist)' }} />
                        )}
                        <h4 style={{ margin:'0', fontSize:16, color:'var(--snow)' }}>{r.ejercicio_nombre}</h4>
                      </div>
                      {r.ejercicio_video && (
                        <a href={r.ejercicio_video} target="_blank" rel="noreferrer" style={{ background:'rgba(236,72,153,0.15)', color:'#fbcfe8', padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                          <span>▶</span> Ver Demo
                        </a>
                      )}
                    </div>
                    
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:8, marginTop:12 }}>
                      {r.series && (
                        <div style={{ background:'var(--ink)', padding:8, borderRadius:6 }}>
                          <div style={{ fontSize:10, color:'var(--fog)', textTransform:'uppercase' }}>Series</div>
                          <div style={{ fontSize:15, fontWeight:600, color:'var(--snow)' }}>{r.series}</div>
                        </div>
                      )}
                      {r.repeticiones && (
                        <div style={{ background:'var(--ink)', padding:8, borderRadius:6 }}>
                          <div style={{ fontSize:10, color:'var(--fog)', textTransform:'uppercase' }}>Repeticiones</div>
                          <div style={{ fontSize:15, fontWeight:600, color:'var(--snow)' }}>{r.repeticiones}</div>
                        </div>
                      )}
                      {r.peso && (
                        <div style={{ background:'var(--ink)', padding:8, borderRadius:6 }}>
                          <div style={{ fontSize:10, color:'var(--fog)', textTransform:'uppercase' }}>Peso / Carga</div>
                          <div style={{ fontSize:14, fontWeight:600, color:'var(--lime)' }}>{r.peso}</div>
                        </div>
                      )}
                      {r.rpe && (
                        <div style={{ background:'var(--ink)', padding:8, borderRadius:6 }}>
                          <div style={{ fontSize:10, color:'var(--fog)', textTransform:'uppercase' }}>RPE / Esfuerzo</div>
                          <div style={{ fontSize:14, fontWeight:600, color:'#f59e0b' }}>{r.rpe}</div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
      </div>
      )}

      {recentLogs && recentLogs.filter(l => l.rpe_gimnasio > 0).length > 0 && (
        <div style={{ marginTop:24, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:24 }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:16, color:'var(--snow)' }}>Mi Historial RPE Gimnasio</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {recentLogs.filter(l => l.rpe_gimnasio > 0).slice(0, 7).map((log: any, i) => {
              const rpe = log.rpe_gimnasio
              const rpeColor = rpe > 7 ? '#ef4444' : rpe > 4 ? '#f59e0b' : '#22c55e'
              return (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--ink)', padding:'12px 16px', borderRadius:8 }}>
                  <div style={{ fontSize:14, color:'var(--silver)' }}>{log.fecha.split('-').reverse().join('/')}</div>
                  <div style={{ 
                    background:`${rpeColor}22`, color:rpeColor, border:`1px solid ${rpeColor}44`,
                    padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 
                  }}>
                    RPE {rpe}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
