'use client'
import { useState, useEffect } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area } from 'recharts'
import { PanelHeader, Icons } from './Headers'

// ── Readiness logic ─────────────────────────────────────────────────────────
function readiness(total) {
  if (!total) return { label:'Sin datos', color:'#555', bg:'rgba(85,85,85,.08)', border:'rgba(85,85,85,.2)' }
  if (total <= 12) return { label:'Listo ✓',  color:'#c8f135', bg:'rgba(200,241,53,.08)', border:'rgba(200,241,53,.25)' }
  if (total <= 18) return { label:'Atención', color:'#f59e0b', bg:'rgba(245,158,11,.08)', border:'rgba(245,158,11,.25)' }
  return              { label:'Bajar Carga', color:'#ef4444', bg:'rgba(239,68,68,.08)',  border:'rgba(239,68,68,.25)'  }
}

const WK = ['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo']
const WL = ['Fatiga','Sueño','Dolor','Estrés','Ánimo']

// ── Custom scatter dot with player photo/initials ────────────────────────────
function PlayerDot(props) {
  const { cx, cy, payload } = props
  const size = 28
  const initials = payload.nombre ? payload.nombre.split(' ').map(w=>w[0]).slice(0,2).join('') : '?'
  const col = payload.dotColor || '#4a6cf7'
  return (
    <g>
      <defs>
        <clipPath id={`cp-${payload.jugador_id}`}>
          <circle cx={cx} cy={cy} r={size/2}/>
        </clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={size/2+2} fill={col} opacity={0.9}/>
      {payload.foto_url
        ? <image href={payload.foto_url} x={cx-size/2} y={cy-size/2} width={size} height={size} clipPath={`url(#cp-${payload.jugador_id})`} preserveAspectRatio="xMidYMid slice"/>
        : <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill="white">{initials}</text>
      }
    </g>
  )
}

const ScatterTip = ({ active, payload }: any) => {
  if (!active||!payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:'10px 14px', fontSize:12, minWidth:160 }}>
      <div style={{ fontWeight:600, color:'var(--snow)', marginBottom:6 }}>{d.nombre}</div>
      <div style={{ color:'var(--silver)' }}>RPE prom: <span style={{ color:'var(--lime)', fontFamily:'DM Mono,monospace' }}>{d.avg_rpe?.toFixed(1)}</span></div>
      <div style={{ color:'var(--silver)' }}>Wellness prom: <span style={{ color:'var(--lime)', fontFamily:'DM Mono,monospace' }}>{d.avg_wellness?.toFixed(1)}</span></div>
      {d.avg_dolor !== undefined && <div style={{ color:'var(--silver)' }}>Dolor prom: <span style={{ color:'#f87171', fontFamily:'DM Mono,monospace' }}>{d.avg_dolor?.toFixed(1)}</span></div>}
      <div style={{ color:'var(--silver)' }}>Semana: {d.semana}</div>
    </div>
  )
}

export default function AnalyticsPanel({ isPanama }: { isPanama?: boolean }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('readiness')

  const todayStr = new Date().toISOString().split('T')[0]
  const defaultDesde = (() => { const d = new Date(); d.setDate(d.getDate()-28); return d.toISOString().split('T')[0] })()
  const [desde, setDesde] = useState(defaultDesde)
  const [hasta, setHasta] = useState(todayStr)

  useEffect(() => { load() }, [desde, hasta])

  useEffect(() => {
    const handleClear = () => { setData(null); load(); };
    window.addEventListener('calendario-cleared', handleClear);
    return () => window.removeEventListener('calendario-cleared', handleClear);
  }, [desde, hasta]);

  async function load() {
    setLoading(true)
    try {
      const ar = await fetch(`/api/analytics?desde=${desde}&hasta=${hasta}`).then(r=>r.json())
      setData({
        readiness: { todayRows: ar.readinessToday || [] },
        analytics: {
          wellnessWeekly: ar.wellnessWeekly || [],
          rpeWeekly: ar.rpeWeekly || [],
        },
        loadAnalysis: ar.loadAnalysis || [],
        dailyEvolution: ar.dailyEvolution || [],
        weeklyGps: ar.weeklyGps || [],
        missingCourts: ar.missingCourts || 0
      })
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  function ReadinessView() {
    const today = data?.readiness?.todayRows || []
    const sorted = [...today].sort((a,b) => {
      const totA = a.fatiga&&a.calidad_sueno ? (a.fatiga+a.calidad_sueno+a.dolor_muscular+a.nivel_estres+a.estado_animo) : 99
      const totB = b.fatiga&&b.calidad_sueno ? (b.fatiga+b.calidad_sueno+b.dolor_muscular+b.nivel_estres+b.estado_animo) : 99
      return totB - totA
    })

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:4 }}>
          {[
            {label:'Listos',      col:'#c8f135', count: today.filter(p=>{ if(p.fatiga==null) return false; const t=p.fatiga+p.calidad_sueno+p.dolor_muscular+p.nivel_estres+p.estado_animo; return t>0&&t<=12}).length },
            {label:'Atención',    col:'#f59e0b', count: today.filter(p=>{ if(p.fatiga==null) return false; const t=p.fatiga+p.calidad_sueno+p.dolor_muscular+p.nivel_estres+p.estado_animo; return t>12&&t<=18}).length },
            {label:'Bajar Carga',col:'#ef4444', count: today.filter(p=>{ if(p.fatiga==null) return false; const t=p.fatiga+p.calidad_sueno+p.dolor_muscular+p.nivel_estres+p.estado_animo; return t>18}).length },
          ].map(s=>(
            <div key={s.label} style={{ background:`${s.col}10`, border:`1px solid ${s.col}33`, borderRadius:12, padding:'14px 10px', textAlign:'center' }}>
              <div className="display" style={{ fontSize:42, color:s.col, lineHeight:1 }}>{s.count}</div>
              <div style={{ fontSize:10, color:s.col, fontFamily:'DM Mono,monospace', marginTop:4, letterSpacing:'0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {sorted.map(p => {
          const total = p.fatiga != null ? p.fatiga+p.calidad_sueno+p.dolor_muscular+p.nivel_estres+p.estado_animo : null
          const rd = readiness(total)
          const hasDolor = Boolean(p.dolor_zona || (p.dolor_eva && p.dolor_eva > 0))
          return (
            <div key={p.jugador_id} style={{ background:'var(--ink2)', border:`1px solid ${rd.border}`, borderRadius:14, padding:'14px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: total ? 10 : 0 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:`${rd.color}20`, border:`2px solid ${rd.color}44`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {p.foto_url
                    ? <img src={p.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <span style={{ fontSize:11, fontWeight:700, color:rd.color }}>{p.nombre.split(' ').map(w=>w[0]).slice(0,2).join('')}</span>
                  }
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:14, color:'var(--snow)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</div>
                  <div style={{ fontSize:11, color:'var(--silver)' }}>{p.posicion||'—'}</div>
                </div>
                {total ? (
                  <div style={{ textAlign:'right' }}>
                    <div className="display" style={{ fontSize:28, color:rd.color, lineHeight:1 }}>{total}</div>
                    <div style={{ fontSize:9, color:rd.color, fontFamily:'DM Mono,monospace', letterSpacing:'0.05em' }}>/25</div>
                  </div>
                ) : (
                  <span style={{ fontSize:11, color:'var(--silver)', fontStyle:'italic' }}>Sin registro hoy</span>
                )}
                <span style={{ fontSize:11, padding:'4px 10px', borderRadius:20, background:rd.bg, color:rd.color, border:`1px solid ${rd.border}`, fontWeight:600, flexShrink:0 }}>{rd.label}</span>
              </div>
              {total && (
                <>
                  <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:28, marginBottom:6 }}>
                    {WK.map((k,i) => {
                      const v = Number(p[k])||0
                      let c = '#888'
                      if (isPanama && i < 4) {
                        const pCols = ['#22c55e','#84cc16','#eab308','#f97316','#ef4444']
                        c = pCols[v-1] || '#888'
                      } else if (isPanama && i === 4) {
                        const hCols = ['#ffffff','#fef9c3','#fef08a','#eab308','#ef4444']
                        c = hCols[v-1] || '#888'
                      } else {
                        const barColors = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']
                        c = barColors[v-1] || '#888'
                      }
                      const label = isPanama ? ['Recuperación','Sueño','Músculos','Energía','Hidratación'][i] : WL[i]
                      return (
                        <div key={k} title={`${label}: ${v}`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <span style={{ fontSize:9, color:c, fontFamily:'DM Mono,monospace' }}>{v}</span>
                          <div style={{ width:'100%', height:`${v*4+4}px`, background:c, borderRadius:'2px 2px 0 0', opacity:.85 }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: hasDolor?8:0 }}>
                    {(isPanama ? ['Recuperación','Sueño','Músculos','Energía','Hidratación'] : WL).map(l => <span key={l} style={{ fontSize:8, color:'var(--fog)' }}>{l}</span>)}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop: 5 }}>
                    {p.dolor_zona && (() => {
                      let z = p.dolor_zona;
                      try { z = JSON.parse(p.dolor_zona).join(', ') } catch(e){}
                      return <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>📍 {z}</span>
                    })()}
                    {p.dolor_eva>0 && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>EVA {p.dolor_eva}/10</span>}
                    {p.tqr>0 && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:p.tqr>=8?'rgba(200,241,53,.1)':p.tqr>=6?'rgba(34,197,94,.1)':p.tqr>=4?'rgba(245,158,11,.1)':'rgba(239,68,68,.1)', color:p.tqr>=8?'#c8f135':p.tqr>=6?'#22c55e':p.tqr>=4?'#f59e0b':'#ef4444', border:`1px solid ${p.tqr>=8?'rgba(200,241,53,.25)':p.tqr>=6?'rgba(34,197,94,.25)':p.tqr>=4?'rgba(245,158,11,.25)':'rgba(239,68,68,.25)'}` }}>TQR {p.tqr}</span>}
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:p.fue_gimnasio?'rgba(200,241,53,.1)':'rgba(255,255,255,.05)', color:p.fue_gimnasio?'var(--lime)':'var(--fog)', border:`1px solid ${p.fue_gimnasio?'rgba(200,241,53,.25)':'rgba(255,255,255,.1)'}` }}>
                      {p.fue_gimnasio ? '🏋️ Gimnasio: SÍ' : '❌ Gimnasio: NO'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function ScatterView() {
    const wRows = data?.analytics?.wellnessWeekly || []
    const rpeRows = data?.analytics?.rpeWeekly || []
    const rpeMap = {}
    for (const r of rpeRows) { rpeMap[`${r.jugador_id}_${r.semana}`] = r }
    const rawMerged = wRows.filter(w=>w.total_wellness).map(w => {
      const rpe = rpeMap[`${w.jugador_id}_${w.semana}`]
      return {
        jugador_id: w.jugador_id,
        nombre: w.nombre,
        posicion: w.posicion,
        foto_url: w.foto_url,
        semana: w.semana,
        avg_wellness: Number(w.total_wellness),
        avg_rpe: rpe ? Number(rpe.avg_rpe) : null,
        avg_dolor: Number(w.avg_dolor||0),
      }
    }).filter(d => d.avg_rpe !== null)

    const playerAcc: Record<number, any> = {}
    for (const d of rawMerged) {
      if (!playerAcc[d.jugador_id]) {
        playerAcc[d.jugador_id] = { ...d, _n: 1 }
      } else {
        const p = playerAcc[d.jugador_id]
        p.avg_wellness = (p.avg_wellness * p._n + d.avg_wellness) / (p._n + 1)
        p.avg_rpe      = (p.avg_rpe      * p._n + d.avg_rpe)      / (p._n + 1)
        p.avg_dolor    = (p.avg_dolor    * p._n + d.avg_dolor)     / (p._n + 1)
        p._n++
        p.semana = 'Prom. período'
      }
    }
    const merged = Object.values(playerAcc).map(p => ({
      ...p,
      avg_wellness: Math.round(p.avg_wellness * 10) / 10,
      avg_rpe:      Math.round(p.avg_rpe      * 10) / 10,
      avg_dolor:    Math.round(p.avg_dolor    * 10) / 10,
      dotColor: p.avg_wellness <= 12 ? '#c8f135' : p.avg_wellness <= 18 ? '#f59e0b' : '#ef4444',
    }))

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Gráfico A — RPE vs. Total Wellness</p>
          <p style={{ fontSize:11, color:'var(--fog)', marginBottom:14 }}>Zona verde = carga alta con buen bienestar (ideal). Zona roja = carga alta con mal bienestar (riesgo).</p>
          {merged.length === 0
            ? <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--silver)', fontSize:13 }}>Sin datos suficientes.</div>
            : <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top:10, right:20, bottom:20, left:10 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)"/>
                  <XAxis dataKey="avg_rpe" type="number" name="RPE" domain={[0,11]} tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'RPE promedio', position:'insideBottom', offset:-10, fill:'#555', fontSize:11 }}/>
                  <YAxis dataKey="avg_wellness" type="number" name="Wellness" domain={[5,26]} tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'Total Wellness', angle:-90, position:'insideLeft', fill:'#555', fontSize:11 }}/>
                  <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray:'3 3', stroke:'rgba(255,255,255,.1)' }}/>
                  <ReferenceLine y={12} stroke="#c8f135" strokeDasharray="3 3" strokeWidth={1} opacity={.4}/>
                  <ReferenceLine y={18} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} opacity={.4}/>
                  <Scatter isAnimationActive={true} animationDuration={1000} data={merged} shape={<PlayerDot/>}>
                    {merged.map((d,i) => <Cell key={i} fill={d.dotColor}/>)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
          }
        </div>
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Gráfico B — RPE vs. Dolor Muscular</p>
          <p style={{ fontSize:11, color:'var(--fog)', marginBottom:14 }}>Detecta jugadores con alta carga y alta percepción de dolor (riesgo lesión).</p>
          {merged.length === 0
            ? <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--silver)', fontSize:13 }}>Sin datos suficientes.</div>
            : <ResponsiveContainer width="100%" height={280}>
                <ScatterChart margin={{ top:10, right:20, bottom:20, left:10 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)"/>
                  <XAxis dataKey="avg_rpe" type="number" name="RPE" domain={[0,11]} tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'RPE promedio', position:'insideBottom', offset:-10, fill:'#555', fontSize:11 }}/>
                  <YAxis dataKey="avg_dolor" type="number" name="Dolor" domain={[1,6]} tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'Dolor muscular', angle:-90, position:'insideLeft', fill:'#555', fontSize:11 }}/>
                  <Tooltip content={<ScatterTip />} cursor={{ strokeDasharray:'3 3', stroke:'rgba(255,255,255,.1)' }}/>
                  <ReferenceLine x={6}   stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} opacity={.4}/>
                  <ReferenceLine y={3.5} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} opacity={.4}/>
                  <Scatter isAnimationActive={true} animationDuration={1000} data={merged} shape={<PlayerDot/>}>
                    {merged.map((d,i) => <Cell key={i} fill={d.avg_dolor>=4?'#ef4444':d.avg_dolor>=3?'#f59e0b':'#22c55e'}/>)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
          }
        </div>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', padding:'0 4px' }}>
          {[['#c8f135','Readiness óptimo (≤12)'],['#f59e0b','Atención (13-18)'],['#ef4444','Bajar carga (>18)']].map(([c,l])=>(
            <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--silver)' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:c }}/>{l}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function AcumView() {
    const wRows = data?.analytics?.wellnessWeekly || []
    const rpeRows = data?.analytics?.rpeWeekly || []
    const playerMap = {}
    for (const w of wRows) {
      if (w.total_wellness == null || w.registros === 0) continue
      if (!playerMap[w.jugador_id]) playerMap[w.jugador_id] = { ...w, weeks:[], rpe_weeks:[] }
      playerMap[w.jugador_id].weeks.push(w)
    }
    for (const r of rpeRows) {
      if (playerMap[r.jugador_id]) playerMap[r.jugador_id].rpe_weeks.push(r)
    }
    const players = Object.values(playerMap).map((p: any) => {
      const n = p.weeks.length
      const avg = (key) => p.weeks.reduce((s,w) => s+(Number(w[key])||0), 0) / n
      const avgRpe = p.rpe_weeks.length ? p.rpe_weeks.reduce((s,r)=>s+(Number(r.avg_rpe)||0),0)/p.rpe_weeks.length : null
      const totalWellness = avg('total_wellness')
      const rd = readiness(totalWellness)
      return {
        jugador_id: p.jugador_id, nombre: p.nombre, posicion: p.posicion, foto_url: p.foto_url, semanas: n,
        avg_fatiga:   avg('avg_fatiga'), avg_sueno:    avg('avg_sueno'), avg_dolor:    avg('avg_dolor'),
        avg_estres:   avg('avg_estres'), avg_animo:    avg('avg_animo'), avg_wellness: totalWellness,
        avg_rpe: avgRpe, rd,
      }
    }).sort((a,b) => b.avg_wellness - a.avg_wellness)

    const cols = ['Fatiga','Sueño','Dolor','Estrés','Ánimo']
    const keys = ['avg_fatiga','avg_sueno','avg_dolor','avg_estres','avg_animo']

    return (
      <div>
        <p style={{ fontSize:11, color:'var(--silver)', marginBottom:16 }}>Promedio de indicadores del período {desde} → {hasta}.</p>
        {players.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Sin datos suficientes.</div>
          : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid var(--mist)' }}>
                    <th style={{ textAlign:'left', padding:'8px 12px', color:'var(--silver)', fontSize:10, fontWeight:700, textTransform:'uppercase', minWidth:160 }}>Jugador</th>
                    {cols.map(c => <th key={c} style={{ textAlign:'center', padding:'8px 8px', color:'var(--silver)', fontSize:10, fontWeight:700, textTransform:'uppercase', minWidth:55 }}>{c}</th>)}
                    <th style={{ textAlign:'center', padding:'8px 8px', color:'var(--silver)', fontSize:10, fontWeight:700, textTransform:'uppercase', minWidth:65 }}>Total W.</th>
                    <th style={{ textAlign:'center', padding:'8px 8px', color:'var(--silver)', fontSize:10, fontWeight:700, textTransform:'uppercase', minWidth:55 }}>RPE</th>
                    <th style={{ textAlign:'center', padding:'8px 8px', color:'var(--silver)', fontSize:10, fontWeight:700, textTransform:'uppercase', minWidth:80 }}>Readiness</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p,i) => {
                    const barC = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']
                    return (
                      <tr key={p.jugador_id} style={{ borderBottom:'1px solid var(--mist)', background: i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:28, height:28, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:`${p.rd.color}20`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                              {p.foto_url
                                ? <img src={p.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                                : <span style={{ fontSize:9, fontWeight:700, color:p.rd.color }}>{p.nombre.split(' ').map(w=>w[0]).slice(0,2).join('')}</span>
                              }
                            </div>
                            <div>
                              <div style={{ fontWeight:500, color:'var(--snow)', whiteSpace:'nowrap' }}>{p.nombre}</div>
                              <div style={{ fontSize:10, color:'var(--silver)' }}>{p.posicion||'—'} · {p.semanas}sem</div>
                            </div>
                          </div>
                        </td>
                        {keys.map((k,ki) => {
                          const v = p[k]; const c = barC[Math.round(v)-1]||'#888'
                          return (
                            <td key={k} style={{ textAlign:'center', padding:'10px 8px' }}>
                              <div style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color:c, fontSize:13 }}>{v?.toFixed(1)||'—'}</div>
                              <div style={{ height:3, background:'var(--mist)', borderRadius:2, marginTop:3, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${((v||0)/5)*100}%`, background:c, borderRadius:2 }}/>
                              </div>
                            </td>
                          )
                        })}
                        <td style={{ textAlign:'center', padding:'10px 8px' }}>
                          <div style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:p.rd.color, fontSize:14 }}>{p.avg_wellness?.toFixed(1)||'—'}</div>
                        </td>
                        <td style={{ textAlign:'center', padding:'10px 8px' }}>
                          <div style={{ fontFamily:'DM Mono,monospace', color:'var(--lime)', fontSize:13 }}>{p.avg_rpe?.toFixed(1)||'—'}</div>
                        </td>
                        <td style={{ textAlign:'center', padding:'10px 8px' }}>
                          <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:p.rd.bg, color:p.rd.color, border:`1px solid ${p.rd.border}`, fontWeight:600, whiteSpace:'nowrap' }}>{p.rd.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    )
  }



  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <PanelHeader 
          icon={Icons.metricas} 
          title="ANALYTICS" 
          subtitle="MÉTRICAS" 
          description="Readiness · Scatter Plots · Acumulado" 
          color="#a855f7" 
        />
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <label style={{ fontSize:10, color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>DESDE</label>
            <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{ background:'var(--ink3)', border:'1px solid var(--fog)', borderRadius:8, padding:'6px 10px', fontSize:12, color:'var(--silver)', outline:'none' }} />
          </div>
          <span style={{ color:'var(--fog)', fontSize:12 }}>→</span>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <label style={{ fontSize:10, color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>HASTA</label>
            <input type="date" value={hasta} onChange={e=>setHasta(e.target.value)} style={{ background:'var(--ink3)', border:'1px solid var(--fog)', borderRadius:8, padding:'6px 10px', fontSize:12, color:'var(--silver)', outline:'none' }} />
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:6, background:'var(--ink2)', borderRadius:12, padding:4, border:'1px solid var(--mist)' }}>
        {[
          ['readiness', 'Readiness Hoy'],
          ['scatter',   'Scatter Plots'],
          ['acum',      'Bienestar Microciclo'],
        ].map(([id,lbl]) => (
          <button key={id} type="button" onClick={()=>setView(id)} style={{
            flex:1, padding:'8px 12px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:600,
            border: 'none', background: view===id ? 'var(--lime)' : 'transparent', color: view===id ? 'var(--ink)' : 'var(--silver)', transition:'all .15s',
          }}>{lbl}</button>
        ))}
      </div>

      {loading
        ? <div style={{ padding:60, textAlign:'center', color:'var(--silver)', fontSize:13 }}>Cargando datos de análisis...</div>
        : data === null 
          ? <div style={{ padding:60, textAlign:'center', color:'var(--silver)', fontSize:13 }}>No hay datos registrados en este período.</div>
          : view==='readiness'     ? <ReadinessView />
          : view==='scatter'       ? <ScatterView />
          :                          <AcumView />
      }
    </div>
  )
}
