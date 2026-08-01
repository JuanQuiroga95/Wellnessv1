'use client'
import { useState, useEffect, useCallback } from 'react'
import { PanelHeader, Icons } from './Headers'

const STATUS_COLOR: Record<string,string> = { optimo:'#22c55e', precaucion:'#f59e0b', peligro:'#ef4444', peligro_bajo:'#3b82f6', sin_datos:'#555' }
const STATUS_LABEL: Record<string,string> = { optimo:'ÓPTIMO', precaucion:'PRECAUCIÓN', peligro:'RIESGO ALTO', peligro_bajo:'CARGA BAJA', sin_datos:'Sin datos' }

export default function VinculacionesPanel({ teamData, initialPlayerId }: { teamData: any[], initialPlayerId?: number | null }) {
  const [jugadorId, setJugadorId] = useState<number|null>(initialPlayerId || null)
  const [dias, setDias] = useState(90)
  const [data, setData] = useState<any>(null)
  const [teamRisk, setTeamRisk] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLesion, setSelectedLesion] = useState<any>(null)
  const [subtab, setSubtab] = useState<'timeline'|'equipo'>('timeline')

  // Load team risk on mount
  useEffect(() => {
    fetch('/api/vinculaciones').then(r=>r.json()).then(d=>{ if(d.teamRisk) setTeamRisk(d.teamRisk) }).catch(()=>{})
  }, [])

  const load = useCallback(async () => {
    if (!jugadorId) return
    setLoading(true)
    setSelectedLesion(null)
    const r = await fetch(`/api/vinculaciones?jugador_id=${jugadorId}&dias=${dias}`)
    const d = await r.json()
    setData(d)
    setLoading(false)
  }, [jugadorId, dias])

  useEffect(() => { load() }, [load])

  const C = {
    card: { background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 } as any,
    btnGhost: { background:'transparent', color:'var(--silver)', border:'1px solid var(--fog)', borderRadius:10, padding:'8px 16px', fontSize:12, cursor:'pointer' } as any,
  }

  // ── Timeline SVG ──────────────────────────────────────────────────────────────
  const TimelineSVG = ({ history, lesiones }: { history: any[], lesiones: any[] }) => {
    if (!history?.length) return <p style={{color:'var(--fog)',textAlign:'center',padding:40}}>Sin datos de carga</p>
    const W=800, H=220, pad={l:50,r:35,t:20,b:30}
    const pW=W-pad.l-pad.r, pH=H-pad.t-pad.b
    const maxLoad = Math.max(...history.map(h=>h.acuteLoad||0), 1)
    const toX = (i:number) => pad.l + (i/(history.length-1||1))*pW
    const toY = (v:number, max:number) => pad.t + pH - (v/max)*pH
    const toYAcwr = (v:number) => pad.t + pH - Math.min(v/2.5,1)*pH

    // Area paths for load
    const loadPts = history.map((h,i)=>`${toX(i)},${toY(h.acuteLoad||0,maxLoad)}`)
    const acwrPts = history.map((h,i)=>`${toX(i)},${toYAcwr(h.ratio||0)}`)
    const loadArea = `M${toX(0)},${pad.t+pH} L${loadPts.join(' L')} L${toX(history.length-1)},${pad.t+pH} Z`
    const acwrLine = `M${acwrPts.join(' L')}`

    // X ticks every ~10 days
    const step = Math.max(1, Math.floor(history.length/8))
    const xTicks = history.reduce((acc,h,i)=>{ if(i%step===0)acc.push({i,label:h.label}); return acc }, [] as any[])

    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%'}}>
        <defs>
          <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02"/>
          </linearGradient>
          {/* Zone bands for ACWR */}
          <clipPath id="chartClip"><rect x={pad.l} y={pad.t} width={pW} height={pH}/></clipPath>
        </defs>

        {/* ACWR zone backgrounds */}
        <rect x={pad.l} y={toYAcwr(2.5)} width={pW} height={toYAcwr(1.5)-toYAcwr(2.5)} fill="rgba(239,68,68,.07)" clipPath="url(#chartClip)"/>
        <rect x={pad.l} y={toYAcwr(1.5)} width={pW} height={toYAcwr(1.3)-toYAcwr(1.5)} fill="rgba(245,158,11,.07)" clipPath="url(#chartClip)"/>
        <rect x={pad.l} y={toYAcwr(1.3)} width={pW} height={toYAcwr(0.8)-toYAcwr(1.3)} fill="rgba(34,197,94,.07)" clipPath="url(#chartClip)"/>
        <rect x={pad.l} y={toYAcwr(0.8)} width={pW} height={toYAcwr(0)-toYAcwr(0.8)} fill="rgba(56,189,248,.07)" clipPath="url(#chartClip)"/>

        {/* Grid lines */}
        {[0,0.8,1.3,1.5,2.0].map(v=>(
          <g key={v}>
            <line x1={pad.l} y1={toYAcwr(v)} x2={W-pad.r} y2={toYAcwr(v)} stroke="var(--mist)" strokeWidth={0.5} strokeDasharray={v===0?'none':'4 3'}/>
            <text x={W-pad.r+3} y={toYAcwr(v)+3} fontSize={8} fill="var(--fog)">{v}</text>
          </g>
        ))}

        {/* Load area */}
        <path d={loadArea} fill="url(#loadGrad)" clipPath="url(#chartClip)"/>
        <polyline points={loadPts.join(' ')} fill="none" stroke="#3b82f6" strokeWidth={1.5} clipPath="url(#chartClip)"/>

        {/* ACWR line */}
        <path d={acwrLine} fill="none" stroke="#f97316" strokeWidth={2} strokeLinejoin="round" clipPath="url(#chartClip)"/>

        {/* Injury markers */}
        {(lesiones||[]).map((l:any) => {
          const idx = history.findIndex(h=>h.date===l.fecha_inicio)
          if (idx<0) return null
          const x = toX(idx)
          return (
            <g key={l.id} style={{cursor:'pointer'}} onClick={()=>setSelectedLesion(l)}>
              <line x1={x} y1={pad.t} x2={x} y2={pad.t+pH} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 3"/>
              <circle cx={x} cy={pad.t+pH/2} r={7} fill="#ef4444" stroke="var(--ink)" strokeWidth={1.5}/>
              <text x={x} y={pad.t+pH/2+4} textAnchor="middle" fontSize={9} fill="white" fontWeight="700">!</text>
              {l.picoDetectado && <circle cx={x} cy={pad.t} r={4} fill="#f59e0b"/>}
            </g>
          )
        })}

        {/* X axis ticks */}
        <line x1={pad.l} y1={pad.t+pH} x2={W-pad.r} y2={pad.t+pH} stroke="var(--mist)" strokeWidth={0.5}/>
        {xTicks.map(({i,label}:any)=>(
          <text key={i} x={toX(i)} y={pad.t+pH+14} textAnchor="middle" fontSize={9} fill="var(--fog)">{label}</text>
        ))}

        {/* Y axis label */}
        <text x={pad.l-8} y={pad.t+pH/2} textAnchor="middle" fontSize={8} fill="var(--fog)" transform={`rotate(-90,${pad.l-8},${pad.t+pH/2})`}>Carga UA</text>
        <text x={W-pad.r+20} y={pad.t+pH/2} textAnchor="middle" fontSize={8} fill="#f97316" transform={`rotate(90,${W-pad.r+20},${pad.t+pH/2})`}>ACWR</text>

        {/* Legend */}
        <g transform={`translate(${pad.l},${pad.t-5})`}>
          <rect width={10} height={6} fill="#3b82f6" opacity={0.7} rx={1}/>
          <text x={13} y={6} fontSize={8} fill="var(--silver)">Carga aguda</text>
          <line x1={80} y1={3} x2={92} y2={3} stroke="#f97316" strokeWidth={2}/>
          <text x={95} y={6} fontSize={8} fill="var(--silver)">ACWR</text>
          <line x1={140} y1={3} x2={152} y2={3} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 3"/>
          <text x={155} y={6} fontSize={8} fill="var(--silver)">Lesión</text>
          <circle cx={202} cy={3} r={3} fill="#f59e0b"/>
          <text x={207} y={6} fontSize={8} fill="var(--silver)">Pico previo</text>
        </g>
      </svg>
    )
  }

  const pctConPico = data?.lesiones?.length ? Math.round((data.lesiones.filter((l:any)=>l.picoDetectado).length / data.lesiones.length)*100) : 0
  const noLoad = !!data && !data.acwrHistory?.length
  const noLesiones = !!data && !data.lesiones?.length

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <PanelHeader 
          icon={Icons.balanza} 
          title="ACWR" 
          subtitle="MÉTRICAS" 
          description="Análisis causal · Lesión ↔ Pico de Carga" 
          color="#a855f7" 
        />
        <div style={{display:'flex',gap:6}}>
          {(['timeline','equipo'] as const).map(t=>(
            <button key={t} onClick={()=>setSubtab(t)} style={{...C.btnGhost, background:subtab===t?'rgba(200,241,53,.1)':'transparent', color:subtab===t?'var(--lime)':'var(--silver)', borderColor:subtab===t?'rgba(200,241,53,.3)':'var(--fog)', fontWeight:subtab===t?700:500}}>
              {t==='timeline'?'📊 Timeline':'👥 Equipo'}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB: TIMELINE ─── */}
      {subtab==='timeline' && (
        <>
          {/* Controls */}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
            <select value={jugadorId||''} onChange={e=>setJugadorId(Number(e.target.value)||null)} style={{background:'var(--ink3)',border:'1px solid var(--fog)',borderRadius:10,padding:'10px 14px',fontSize:14,color:'var(--snow)',outline:'none',flex:1,minWidth:200}}>
              <option value="">— Seleccionar jugador —</option>
              {teamData.map((p:any)=><option key={p.jugador_id} value={p.jugador_id}>{p.nombre}</option>)}
            </select>
            {(['30','60','90','180'] as const).map(d=>(
              <button key={d} onClick={()=>setDias(Number(d))} style={{...C.btnGhost, background:dias===Number(d)?'rgba(200,241,53,.1)':'transparent', color:dias===Number(d)?'var(--lime)':'var(--silver)', borderColor:dias===Number(d)?'rgba(200,241,53,.3)':'var(--fog)', padding:'8px 14px'}}>
                {d}d
              </button>
            ))}
          </div>

          {loading && <div style={{padding:40,textAlign:'center',color:'var(--silver)'}}>⏳ Calculando ACWR...</div>}

          {!loading && !jugadorId && (
            <div style={{...C.card, textAlign:'center', padding:60}}>
              <div style={{fontSize:48,marginBottom:12}}>🔗</div>
              <p style={{fontSize:16,fontWeight:700,color:'var(--snow)'}}>Seleccioná un jugador para ver su análisis de vinculación</p>
              <p style={{fontSize:13,color:'var(--silver)',marginTop:6}}>Cruzamos el historial de ACWR con todos sus episodios de lesión</p>
            </div>
          )}

          {!loading && data && jugadorId && (
            <>
              {(noLoad || noLesiones) && (
                <div style={{...C.card,border:'1px solid rgba(245,158,11,.25)',background:'rgba(245,158,11,.04)',padding:20}}>
                  <p style={{fontSize:11,fontWeight:700,color:'#f59e0b',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>⚠️ Qué falta para ver el análisis</p>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{display:'flex',gap:10,padding:'10px 14px',background:'var(--ink3)',borderRadius:10,border:`1px solid ${noLoad?'rgba(239,68,68,.2)':'rgba(34,197,94,.2)'}`}}>
                      <span>{noLoad?'❌':'✅'}</span>
                      <div>
                        <b style={{color:noLoad?'#f87171':'#4ade80',fontSize:13}}>{noLoad?'Sin registros de carga':'Carga registrada ✓'}</b>
                        {noLoad&&<p style={{fontSize:12,color:'var(--silver)',margin:'4px 0 0'}}>Cargá sesiones en <b style={{color:'var(--snow)'}}>Control de Carga Calc</b> (RPE × minutos). Necesitás al menos 28 días para ver la línea de tiempo.</p>}
                      </div>
                    </div>
                    <div style={{display:'flex',gap:10,padding:'10px 14px',background:'var(--ink3)',borderRadius:10,border:`1px solid ${noLesiones?'rgba(245,158,11,.2)':'rgba(34,197,94,.2)'}`}}>
                      <span>{noLesiones?'⚠️':'✅'}</span>
                      <div>
                        <b style={{color:noLesiones?'#fbbf24':'#4ade80',fontSize:13}}>{noLesiones?'Sin lesiones en el período':`${data.lesiones.length} lesión/es ✓`}</b>
                        {noLesiones&&<p style={{fontSize:12,color:'var(--silver)',margin:'4px 0 0'}}>Registrá episodios en <b style={{color:'var(--snow)'}}>Enfermería</b> para ver el análisis causal. Sin lesiones es una buena noticia 🙌</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* KPIs */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10}}>
                {[
                  {label:'ACWR Actual', value:data.riesgoActual?.acwr||0, sub:STATUS_LABEL[data.riesgoActual?.status]||'—', color:STATUS_COLOR[data.riesgoActual?.status]||'#555'},
                  {label:'Días en Riesgo', value:data.riesgoActual?.diasEnRiesgo||0, sub:'consecutivos', color:data.riesgoActual?.diasEnRiesgo>3?'#ef4444':'var(--snow)'},
                  {label:'Total Lesiones', value:data.lesiones?.length||0, sub:`últimos ${dias} días`, color:'var(--snow)'},
                  {label:'Con Pico Previo', value:`${pctConPico}%`, sub:`${data.lesiones?.filter((l:any)=>l.picoDetectado).length||0} de ${data.lesiones?.length||0}`, color:pctConPico>50?'#ef4444':'#f59e0b'},
                  {label:'Carga Aguda', value:data.riesgoActual?.acuteLoad||0, sub:'UA semana actual', color:'#3b82f6'},
                  {label:'Carga Crónica', value:data.riesgoActual?.chronicLoad||0, sub:'UA promedio 4 sem', color:'#64748b'},
                ].map((k,i)=>(
                  <div key={i} style={{...C.card,padding:'16px 20px'}}>
                    <div style={{fontSize:36,fontWeight:900,color:k.color,fontFamily:'DM Mono,monospace',lineHeight:1}}>{k.value}</div>
                    <div style={{fontSize:10,fontWeight:700,color:'var(--fog)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:4}}>{k.label}</div>
                    <div style={{fontSize:11,color:'var(--silver)',marginTop:2}}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div style={C.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <p style={{fontSize:11,fontWeight:700,color:'var(--silver)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
                    📊 Timeline ACWR + Lesiones · {dias} días
                  </p>
                  {data.lesiones?.length>0 && (
                    <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:'rgba(239,68,68,.1)',color:'#f87171',border:'1px solid rgba(239,68,68,.2)',fontWeight:700}}>
                      {data.lesiones.length} lesión{data.lesiones.length>1?'es':''} · Click para analizar
                    </span>
                  )}
                </div>
                <TimelineSVG history={data.acwrHistory||[]} lesiones={data.lesiones||[]}/>
                <div style={{display:'flex',gap:16,marginTop:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:10,color:'var(--fog)'}}>🟢 Zona óptima ACWR 0.8–1.3</span>
                  <span style={{fontSize:10,color:'var(--fog)'}}>🟡 Precaución 1.3–1.5</span>
                  <span style={{fontSize:10,color:'var(--fog)'}}>🔴 Riesgo &gt;1.5</span>
                  <span style={{fontSize:10,color:'var(--fog)'}}>🟠 Pico detectado pre-lesión</span>
                </div>
              </div>

              {/* Selected lesion detail */}
              {selectedLesion && (
                <div style={{...C.card, border:'1px solid rgba(239,68,68,.25)', background:'rgba(239,68,68,.04)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                    <div>
                      <p style={{fontSize:11,fontWeight:700,color:'#ef4444',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>🔍 Análisis Causal</p>
                      <h3 style={{fontSize:20,fontWeight:800,color:'var(--snow)',margin:0}}>{selectedLesion.tipo_lesion||'Lesión'} · {selectedLesion.zona||selectedLesion.region_corporal||'—'}</h3>
                      <p style={{fontSize:12,color:'var(--fog)',marginTop:4}}>{selectedLesion.fecha_inicio} · {selectedLesion.mecanismo||'Mecanismo no registrado'}</p>
                    </div>
                    <button onClick={()=>setSelectedLesion(null)} style={{background:'none',border:'none',color:'var(--fog)',cursor:'pointer',fontSize:18}}>✕</button>
                  </div>

                  {/* Causal indicators */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:16}}>
                    {[
                      {label:'ACWR Día Lesión', value:selectedLesion.acwrPrevio?.dia0?.toFixed(2)||'—', color:STATUS_COLOR[selectedLesion.acwrPrevio?.statusDia0]||'#555'},
                      {label:'ACWR -7 días', value:selectedLesion.acwrPrevio?.dia7?.toFixed(2)||'—', color:'var(--snow)'},
                      {label:'ACWR -14 días', value:selectedLesion.acwrPrevio?.dia14?.toFixed(2)||'—', color:'var(--snow)'},
                      {label:'Carga UA (7d prev.)', value:selectedLesion.cargaPrevia7||0, color:'#3b82f6'},
                      {label:'Variación Semanal', value:selectedLesion.variacionSemanal!=null?`${selectedLesion.variacionSemanal>0?'+':''}${selectedLesion.variacionSemanal}%`:'—', color:Math.abs(selectedLesion.variacionSemanal||0)>10?'#ef4444':'var(--snow)'},
                      {label:'Días sin carga previos', value:selectedLesion.diasSinCargaPrevia||0, color:'var(--snow)'},
                    ].map((k,i)=>(
                      <div key={i} style={{background:'var(--ink3)',border:'1px solid var(--mist)',borderRadius:12,padding:'12px 16px',textAlign:'center'}}>
                        <div style={{fontSize:28,fontWeight:900,color:k.color,fontFamily:'DM Mono,monospace',lineHeight:1}}>{k.value}</div>
                        <div style={{fontSize:9,color:'var(--fog)',textTransform:'uppercase',letterSpacing:'0.06em',marginTop:4}}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Verdict */}
                  <div style={{padding:'14px 20px',borderRadius:12,background:selectedLesion.picoDetectado?'rgba(239,68,68,.08)':'rgba(34,197,94,.08)',border:`1px solid ${selectedLesion.picoDetectado?'rgba(239,68,68,.25)':'rgba(34,197,94,.25)'}`}}>
                    <p style={{fontSize:14,fontWeight:700,color:selectedLesion.picoDetectado?'#f87171':'#4ade80',margin:0}}>
                      {selectedLesion.picoDetectado ? '⚠️ PICO DE CARGA DETECTADO PREVIO A LA LESIÓN' : '✅ Sin pico de carga previo detectado'}
                    </p>
                    <p style={{fontSize:12,color:'var(--silver)',marginTop:6,margin:'6px 0 0'}}>
                      {selectedLesion.picoDetectado
                        ? `El ACWR superó 1.3 en los 14 días previos a la lesión. Alta probabilidad de lesión por sobrecargas acumuladas.${selectedLesion.variacionSemanal>10?' La carga aumentó '+selectedLesion.variacionSemanal+'% respecto a la semana anterior.':''}`
                        : 'El ACWR se mantuvo en zona segura antes de la lesión. Posiblemente lesión por contacto, azar, o factores no relacionados con la carga de entrenamiento.'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* All injuries list */}
              {data.lesiones?.length > 0 && (
                <div style={C.card}>
                  <p style={{fontSize:11,fontWeight:700,color:'var(--silver)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:12}}>📋 Historial de Lesiones con Análisis</p>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {data.lesiones.map((l:any)=>(
                      <button key={l.id} onClick={()=>setSelectedLesion(l)} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:selectedLesion?.id===l.id?'rgba(239,68,68,.08)':'transparent',border:selectedLesion?.id===l.id?'1px solid rgba(239,68,68,.2)':'1px solid var(--mist)',borderRadius:12,cursor:'pointer',textAlign:'left',transition:'all .12s'}}>
                        <div style={{fontSize:22}}>{l.picoDetectado?'⚠️':'✅'}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,fontSize:14,color:'var(--snow)'}}>{l.tipo_lesion||'Lesión'} · {l.zona||'—'}</div>
                          <div style={{fontSize:12,color:'var(--silver)',marginTop:2}}>{l.fecha_inicio} · ACWR: <span style={{color:STATUS_COLOR[l.acwrPrevio?.statusDia0]||'#555',fontWeight:700}}>{l.acwrPrevio?.dia0?.toFixed(2)||'—'}</span></div>
                        </div>
                        <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:l.picoDetectado?'rgba(239,68,68,.1)':'rgba(34,197,94,.1)',color:l.picoDetectado?'#f87171':'#4ade80',border:`1px solid ${l.picoDetectado?'rgba(239,68,68,.2)':'rgba(34,197,94,.2)'}`,fontWeight:700,flexShrink:0}}>
                          {l.picoDetectado?'Pico previo':'Sin pico'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ─── TAB: EQUIPO ─── */}
      {subtab==='equipo' && (
        <>
          {/* Team risk detector */}
          <div style={C.card}>
            <p style={{fontSize:11,fontWeight:700,color:'var(--silver)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:14}}>🚨 Detector de Riesgo · Estado Actual del Plantel</p>
            {teamRisk.length===0
              ? <p style={{color:'var(--fog)',textAlign:'center',padding:20}}>Sin datos de carga en el equipo</p>
              : (
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {[...teamRisk].sort((a,b)=>(b.acwr||0)-(a.acwr||0)).map((p:any)=>{
                  const col = STATUS_COLOR[p.status]||'#555'
                  const lbl = STATUS_LABEL[p.status]||'—'
                  return (
                    <div key={p.jugador_id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',background:'var(--ink3)',border:`1px solid ${p.status==='peligro'?'rgba(239,68,68,.2)':p.status==='precaucion'?'rgba(245,158,11,.2)':'var(--mist)'}`,borderRadius:12}}>
                      <div style={{width:10,height:10,borderRadius:'50%',background:col,flexShrink:0}}/>
                      <div style={{flex:1,fontWeight:600,fontSize:14,color:'var(--snow)'}}>{p.nombre}</div>
                      <div style={{fontSize:12,color:'var(--silver)'}}>UA aguda: <b style={{color:'var(--snow)'}}>{p.acuteLoad}</b></div>
                      <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:`${col}18`,color:col,border:`1px solid ${col}44`,fontWeight:700,minWidth:80,textAlign:'center'}}>{lbl}</span>
                      <span style={{fontSize:22,fontWeight:900,color:col,fontFamily:'DM Mono,monospace',minWidth:50,textAlign:'right'}}>{p.acwr?.toFixed(2)||'—'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Team causal stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
            {[
              {icon:'🔴', label:'En Zona Riesgo', value:teamRisk.filter((p:any)=>p.status==='peligro').length, sub:'ACWR > 1.5', color:'#ef4444'},
              {icon:'🟡', label:'En Precaución', value:teamRisk.filter((p:any)=>p.status==='precaucion').length, sub:'ACWR 1.3–1.5', color:'#f59e0b'},
              {icon:'🟢', label:'En Zona Óptima', value:teamRisk.filter((p:any)=>p.status==='optimo').length, sub:'ACWR 0.8–1.3', color:'#22c55e'},
              {icon:'⬇️', label:'Carga Baja', value:teamRisk.filter((p:any)=>p.status==='peligro_bajo'||p.status==='sin_datos').length, sub:'ACWR < 0.8', color:'#3b82f6'},
            ].map((k,i)=>(
              <div key={i} style={{...C.card,textAlign:'center',padding:'20px 24px'}}>
                <div style={{fontSize:32,marginBottom:8}}>{k.icon}</div>
                <div style={{fontSize:42,fontWeight:900,color:k.color,fontFamily:'DM Mono,monospace',lineHeight:1}}>{k.value}</div>
                <div style={{fontSize:11,fontWeight:700,color:'var(--fog)',textTransform:'uppercase',marginTop:4}}>{k.label}</div>
                <div style={{fontSize:11,color:'var(--silver)',marginTop:2}}>{k.sub}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
