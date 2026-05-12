'use client'
import { useState, useEffect } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, PieChart, Pie, Legend, LineChart, Line, AreaChart, Area } from 'recharts'

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

const ScatterTip = ({ active, payload }) => {
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

export default function AnalyticsPanel() {
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
        dailyEvolution: ar.dailyEvolution || []
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
          const hasDolor = p.dolor_zona || (p.dolor_eva && p.dolor_eva > 0)
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
                      const barColors = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']
                      const c = barColors[v-1]||'#888'
                      return (
                        <div key={k} title={`${WL[i]}: ${v}`} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                          <span style={{ fontSize:9, color:c, fontFamily:'DM Mono,monospace' }}>{v}</span>
                          <div style={{ width:'100%', height:`${v*4+4}px`, background:c, borderRadius:'2px 2px 0 0', opacity:.85 }} />
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom: hasDolor?8:0 }}>
                    {WL.map(l => <span key={l} style={{ fontSize:8, color:'var(--fog)' }}>{l}</span>)}
                  </div>
                  {hasDolor && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {p.dolor_zona && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>📍 {p.dolor_zona}</span>}
                      {p.dolor_eva>0 && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>EVA {p.dolor_eva}/10</span>}
                    </div>
                  )}
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
                  <Scatter data={merged} shape={<PlayerDot/>}>
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
                  <Scatter data={merged} shape={<PlayerDot/>}>
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

  function PerfilNeuromuscularView() {
    const rows = data?.loadAnalysis || []
    const evolution = data?.dailyEvolution || []
    
    if (rows.length === 0) return (
      <div style={{ padding:60, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:16, border:'1px dashed var(--mist)' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>📊</div>
        <div style={{ fontWeight:600, color:'var(--snow)' }}>Sin datos de GPS vinculados</div>
        <div style={{ fontSize:12, color:'var(--fog)', marginTop:4 }}>Asegúrate de haber importado archivos GPS y que las sesiones tengan una cancha asignada.</div>
      </div>
    )

    const r = rows[0]
    const balanceData = [
      { name: 'Aceleraciones', value: r.avg_acel, color: '#3b82f6' },
      { name: 'Desaceleraciones', value: r.avg_decel, color: '#f97316' },
      { name: 'Sprints', value: r.avg_sprints * 10, color: '#c8f135' }
    ]

    const impactData = [
      { category: 'Intensidad', label: 'Tensión', sub: 'Acc/min', val: (r.avg_acel / (r.avg_duracion||1)).toFixed(2), pct: 115, icon: '✅' },
      { category: 'Intensidad', label: 'Duración', sub: 'Mts/min', val: r.avg_mts_min.toFixed(1), pct: 99, icon: '✅' },
      { category: 'Intensidad', label: 'Velocidad', sub: 'Sprint', val: r.avg_sprints.toFixed(1), pct: 13, icon: '❌' },
      { category: 'Volumen', label: 'Tensión', sub: 'Acc int', val: r.avg_acc_int.toFixed(1), pct: 46, icon: '✅' },
      { category: 'Volumen', label: 'Duración', sub: 'Dist 19 km/h', val: r.avg_dist_v4.toFixed(0), pct: 27, icon: '⚠️' },
      { category: 'Volumen', label: 'Velocidad', sub: 'Dist 24 km/h', val: r.avg_dist_v5.toFixed(0), pct: 9, icon: '❌' },
    ]

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(350px, 1fr))', gap:20 }}>
          <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:20, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--mist)', background:'rgba(255,255,255,.02)' }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:'var(--snow)', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Sesión Impacto Porcentual por Zona</h3>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,.03)' }}>
                  <th style={{ padding:10, textAlign:'left', color:'var(--silver)', fontWeight:600 }}>Zona</th>
                  <th style={{ padding:10, textAlign:'left', color:'var(--silver)', fontWeight:600 }}>Métrica</th>
                  <th style={{ padding:10, textAlign:'right', color:'var(--silver)', fontWeight:600 }}>Valor</th>
                  <th style={{ padding:10, textAlign:'center', color:'var(--silver)', fontWeight:600 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {impactData.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                    {idx % 3 === 0 && (
                      <td rowSpan={3} style={{ 
                        padding:12, fontWeight:800, verticalAlign:'middle', textAlign:'center',
                        background: row.category === 'Intensidad' ? 'rgba(200,241,53,.1)' : 'rgba(234,179,8,.1)',
                        color: row.category === 'Intensidad' ? 'var(--lime)' : '#eab308',
                        fontSize:10, textTransform:'uppercase', writingMode:'vertical-lr', transform:'rotate(180deg)'
                      }}>{row.category}</td>
                    )}
                    <td style={{ padding:10 }}>
                      <div style={{ fontWeight:600, color:'var(--snow)' }}>{row.label}</div>
                      <div style={{ fontSize:10, color:'var(--fog)' }}>{row.sub}</div>
                    </td>
                    <td style={{ padding:10, textAlign:'right', fontFamily:'DM Mono,monospace', fontWeight:700, color:'var(--lime)' }}>{row.val}</td>
                    <td style={{ padding:10, textAlign:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                        <span style={{ fontSize:10, color: row.pct > 80 ? 'var(--lime)' : row.pct > 40 ? '#f59e0b' : '#ef4444' }}>{row.pct}%</span>
                        <span>{row.icon}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:20, padding:24, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--silver)', marginBottom:20, textTransform:'uppercase' }}>Balance Neuromuscular</h3>
            <div style={{ width:'100%', height:220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={balanceData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                    {balanceData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--mist)', borderRadius:12, fontSize:12 }} itemStyle={{ color:'var(--snow)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', gap:16, marginTop:10 }}>
              {balanceData.map(d => (
                <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'var(--fog)' }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:d.color }} /> {d.name}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:24, padding:24 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--snow)', margin:0 }}>Control de Cargas e Impacto</h3>
              <p style={{ fontSize:12, color:'var(--fog)', marginTop:4 }}>Evolución diaria de métricas de intensidad y volumen</p>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:30 }}>
            <div style={{ height:250 }}>
              <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', marginBottom:12 }}>EVOLUCIÓN VEL MÁX (km/h)</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                  <XAxis dataKey="fecha" hide />
                  <YAxis domain={['auto', 'auto']} tick={{ fill:'var(--fog)', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--mist)', borderRadius:12 }} />
                  <Line type="monotone" dataKey="max_vel" stroke="#3b82f6" strokeWidth={3} dot={{ r:4, fill:'#3b82f6' }} activeDot={{ r:6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ height:250 }}>
              <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', marginBottom:12 }}>EVOLUCIÓN MTS/MIN</p>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution}>
                  <defs>
                    <linearGradient id="colorMts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c8f135" stopOpacity={0.3}/><stop offset="95%" stopColor="#c8f135" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                  <XAxis dataKey="fecha" hide />
                  <YAxis domain={['auto', 'auto']} tick={{ fill:'var(--fog)', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--mist)', borderRadius:12 }} />
                  <Area type="monotone" dataKey="mts_min" stroke="#c8f135" strokeWidth={3} fillOpacity={1} fill="url(#colorMts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ height:250 }}>
              <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', marginBottom:12 }}>CONTROL CARGAS NEUROMUSCULARES</p>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                  <XAxis dataKey="fecha" hide />
                  <YAxis tick={{ fill:'var(--fog)', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--mist)', borderRadius:12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize:10, paddingTop:10 }} />
                  <Line name="Aceleraciones" type="monotone" dataKey="acel" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line name="Desacel" type="monotone" dataKey="decel" stroke="#f97316" strokeWidth={2} dot={false} />
                  <Line name="Sprints" type="monotone" dataKey="sprints" stroke="#c8f135" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:12 }}>
          <h4 style={{ fontSize:12, fontWeight:700, color:'var(--silver)', margin:0, textTransform:'uppercase' }}>Análisis por Recinto</h4>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16 }}>
            {rows.map((r, i) => {
              const isSmallPitch = r.area < 4500
              return (
                <div key={i} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:18, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, right:0, width:4, height:'100%', background: isSmallPitch ? '#a855f7' : '#3b82f6' }} />
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:'var(--snow)' }}>{r.cancha}</div>
                      <div style={{ fontSize:10, color:'var(--fog)' }}>{r.dimensiones}m · {r.area}m²</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:9, fontWeight:800, color:isSmallPitch?'#a855f7':'#3b82f6', textTransform:'uppercase' }}>{isSmallPitch?'Neuromuscular':'Metabólico'}</div>
                      <div style={{ fontSize:9, color:'var(--fog)' }}>{r.registros} logs</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ height:6, background:'var(--mist)', borderRadius:3, overflow:'hidden', marginBottom:4 }}>
                        <div style={{ width:`${(r.metabolic/(r.metabolic+r.neuromuscular))*100}%`, height:'100%', background:'#3b82f6' }} />
                      </div>
                      <div style={{ height:6, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:`${(r.neuromuscular/(r.metabolic+r.neuromuscular))*100}%`, height:'100%', background:'#a855f7' }} />
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:'var(--snow)', fontWeight:700 }}>{Math.round((r.neuromuscular/(r.metabolic+r.neuromuscular))*100)}% <span style={{ color:'var(--fog)', fontWeight:400 }}>Acc/Dec</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>ANALYTICS</h2>
          <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Readiness · Scatter Plots · Acumulado</p>
        </div>
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
          ['neuromuscular', 'Perfil Neuromuscular'],
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
          : view==='neuromuscular' ? <PerfilNeuromuscularView />
          :                          <AcumView />
      }
    </div>
  )
}
