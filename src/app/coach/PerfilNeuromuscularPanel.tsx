'use client'
import { useState, useEffect } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, CartesianGrid, XAxis, YAxis, Legend, Line, AreaChart, Area } from 'recharts'

export default function PerfilNeuromuscularPanel() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        loadAnalysis: ar.loadAnalysis || [],
        dailyEvolution: ar.dailyEvolution || [],
        missingCourts: ar.missingCourts || 0,
        weeklyGps: ar.weeklyGps || []
      })
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const rows = data?.loadAnalysis || []
  const evolution = data?.dailyEvolution || []
  const missing = data?.missingCourts || 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>PERFIL NEUROMUSCULAR</h2>
          <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Balance Neuromuscular · Control de Cargas</p>
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

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:'var(--silver)', fontSize:13 }}>Cargando datos de análisis...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
          {missing > 0 && (
            <div style={{ background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', borderRadius:16, padding:'14px 20px', display:'flex', alignItems:'center', gap:14 }}>
              <span style={{ fontSize:24 }}>⚠️</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:'#f59e0b', fontSize:13 }}>Hay {missing} registros GPS sin cancha asignada</div>
                <p style={{ margin:0, fontSize:11, color:'var(--silver)', marginTop:2 }}>Para que aparezcan en el análisis, ve al Calendario y asigna un recinto a las sesiones correspondientes.</p>
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <div style={{ padding:60, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:16, border:'1px dashed var(--mist)' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>📊</div>
              <div style={{ fontWeight:600, color:'var(--snow)' }}>Sin datos de GPS vinculados</div>
              <div style={{ fontSize:12, color:'var(--fog)', marginTop:4 }}>Asegúrate de haber importado archivos GPS y que las sesiones tengan una cancha asignada.</div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                {( () => {
                  const r = rows[0] || {}
                  // Valores base del Excel "GPS APP"
                  const MD_PROMEDIO = {
                    acc_per_min: 3,         
                    mts_min: 85,            
                    sprints: 14,            
                    acc_int_tot: 75,        
                    dist_v4: 500,           
                    dist_v5: 150,           
                    dist_total: 10000,
                    acel: 25,
                    decel: 30,
                    vel_max: 30,
                    max_acc: 6,
                    max_dec: 7
                  }

                  const val_acc_per_min = r.avg_duracion ? (r.avg_acc_int / r.avg_duracion) : 0;
                  const val_mts_min = r.avg_mts_min || 0;
                  const val_sprints = r.avg_sprints || 0;
                  const val_acc_int_tot = r.avg_acc_int || 0;
                  const val_dist_v4 = r.avg_dist_v4 || 0;
                  const val_dist_v5 = 0; // No hay datos de Dist Sprint cargados
                  const val_dist_total = r.avg_dist_total || 0;
                  const val_acel = r.avg_acel || 0;
                  const val_decel = r.avg_decel || 0;
                  const val_vel_max = r.avg_max_vel || 0;
                  const val_max_acc = 0; // No hay datos
                  const val_max_dec = 0; // No hay datos

                  const calcPct = (val: number, base: number) => base ? Math.round((val / base) * 100) : 0;
                  const getIcon = (pct: number) => pct >= 85 ? '✅' : pct >= 60 ? '⚠️' : '❌'

                  const volumenData = [
                    { label: 'DT (m)', base: MD_PROMEDIO.dist_total, val: val_dist_total },
                    { label: 'HSR (m)', base: MD_PROMEDIO.dist_v4, val: val_dist_v4 },
                    { label: 'Dist Sprint', base: MD_PROMEDIO.dist_v5, val: val_dist_v5 },
                    { label: 'Acc Int Tot', base: MD_PROMEDIO.acc_int_tot, val: val_acc_int_tot },
                    { label: 'ACC', base: MD_PROMEDIO.acel, val: val_acel },
                    { label: 'DEC', base: MD_PROMEDIO.decel, val: val_decel }
                  ]

                  const intensidadData = [
                    { label: 'Mts/min', base: MD_PROMEDIO.mts_min, val: val_mts_min },
                    { label: 'Acc Int/min', base: MD_PROMEDIO.acc_per_min, val: val_acc_per_min },
                    { label: 'Vel Max', base: MD_PROMEDIO.vel_max, val: val_vel_max },
                    { label: 'Sprint (n)', base: MD_PROMEDIO.sprints, val: val_sprints },
                    { label: 'Max ACC', base: MD_PROMEDIO.max_acc, val: val_max_acc },
                    { label: 'Max DEC', base: MD_PROMEDIO.max_dec, val: val_max_dec }
                  ]

                  const pct_acc_per_min = calcPct(val_acc_per_min, MD_PROMEDIO.acc_per_min);
                  const pct_mts_min = calcPct(val_mts_min, MD_PROMEDIO.mts_min);
                  const pct_sprints = calcPct(val_sprints, MD_PROMEDIO.sprints);
                  const pct_acc_int_tot = calcPct(val_acc_int_tot, MD_PROMEDIO.acc_int_tot);
                  const pct_dist_v4 = calcPct(val_dist_v4, MD_PROMEDIO.dist_v4);
                  const pct_dist_v5 = calcPct(val_dist_v5, MD_PROMEDIO.dist_v5);

                  const impactData = [
                    { category: 'Intensidad', label: 'Tensión', sub: 'Acc Int/min', base: MD_PROMEDIO.acc_per_min.toFixed(1), val: val_acc_per_min.toFixed(2), pct: pct_acc_per_min, icon: getIcon(pct_acc_per_min) },
                    { category: 'Intensidad', label: 'Duración', sub: 'Mts/min', base: MD_PROMEDIO.mts_min.toFixed(0), val: val_mts_min.toFixed(1), pct: pct_mts_min, icon: getIcon(pct_mts_min) },
                    { category: 'Intensidad', label: 'Velocidad', sub: 'Sprint (n)', base: MD_PROMEDIO.sprints.toFixed(0), val: val_sprints.toFixed(1), pct: pct_sprints, icon: getIcon(pct_sprints) },
                    { category: 'Volumen', label: 'Tensión', sub: 'Acc Int Tot', base: MD_PROMEDIO.acc_int_tot.toFixed(0), val: val_acc_int_tot.toFixed(1), pct: pct_acc_int_tot, icon: getIcon(pct_acc_int_tot) },
                    { category: 'Volumen', label: 'Duración', sub: 'HSR (m)', base: MD_PROMEDIO.dist_v4.toFixed(0), val: val_dist_v4.toFixed(0), pct: pct_dist_v4, icon: getIcon(pct_dist_v4) },
                    { category: 'Volumen', label: 'Velocidad', sub: 'Dist Sprint', base: MD_PROMEDIO.dist_v5.toFixed(0), val: val_dist_v5.toFixed(0), pct: pct_dist_v5, icon: getIcon(pct_dist_v5) },
                  ]

                  return (
                    <>
                      {/* Excel Data Card */}
                      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:20, overflow:'hidden' }}>
                        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--mist)', background:'rgba(255,255,255,.02)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap: 'wrap', gap: 12 }}>
                          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--snow)', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Análisis de Sesión</h3>
                          {r.cancha && (
                            <div style={{ fontSize:12, color:'var(--silver)', fontWeight:600 }}>
                              Cancha: <span style={{ color:'var(--snow)' }}>{r.cancha}</span> {r.dimensiones ? `(${r.dimensiones}m)` : ''}
                            </div>
                          )}
                        </div>
                        <div style={{ padding:20, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:30 }}>
                          
                          {/* VOLUMEN */}
                          <div style={{ overflowX: 'auto' }}>
                            <h4 style={{ fontSize:12, fontWeight:800, color:'#eab308', marginBottom:12, textTransform:'uppercase' }}>Volumen</h4>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, textAlign:'center', minWidth: 400 }}>
                              <thead>
                                <tr style={{ color:'var(--fog)', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                                  <th style={{ padding:'8px 4px', fontWeight:600, textAlign:'left' }}>Métrica</th>
                                  {volumenData.map(d => <th key={d.label} style={{ padding:'8px 4px', fontWeight:600 }}>{d.label}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ color:'var(--silver)', borderBottom:'1px solid rgba(255,255,255,.02)' }}>
                                  <td style={{ padding:'8px 4px', fontWeight:700, textAlign:'left' }}>MD Prom.</td>
                                  {volumenData.map(d => <td key={d.label} style={{ padding:'8px 4px', fontFamily:'DM Mono,monospace' }}>{d.base}</td>)}
                                </tr>
                                <tr style={{ color:'var(--snow)', borderBottom:'1px solid rgba(255,255,255,.02)' }}>
                                  <td style={{ padding:'8px 4px', fontWeight:700, textAlign:'left' }}>MD</td>
                                  {volumenData.map(d => <td key={d.label} style={{ padding:'8px 4px', fontFamily:'DM Mono,monospace' }}>{typeof d.val === 'number' && !Number.isInteger(d.val) ? d.val.toFixed(1) : d.val}</td>)}
                                </tr>
                                <tr>
                                  <td style={{ padding:'8px 4px', fontWeight:700, textAlign:'left', color:'var(--silver)' }}>%</td>
                                  {volumenData.map(d => {
                                    const pct = calcPct(d.val, d.base);
                                    const color = pct >= 85 ? 'var(--lime)' : pct >= 60 ? '#f59e0b' : '#ef4444';
                                    return <td key={d.label} style={{ padding:'8px 4px', fontWeight:800, color }}>{pct}%</td>
                                  })}
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* INTENSIDAD */}
                          <div style={{ overflowX: 'auto' }}>
                            <h4 style={{ fontSize:12, fontWeight:800, color:'var(--lime)', marginBottom:12, textTransform:'uppercase' }}>Intensidad</h4>
                            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, textAlign:'center', minWidth: 400 }}>
                              <thead>
                                <tr style={{ color:'var(--fog)', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
                                  <th style={{ padding:'8px 4px', fontWeight:600, textAlign:'left' }}>Métrica</th>
                                  {intensidadData.map(d => <th key={d.label} style={{ padding:'8px 4px', fontWeight:600 }}>{d.label}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ color:'var(--silver)', borderBottom:'1px solid rgba(255,255,255,.02)' }}>
                                  <td style={{ padding:'8px 4px', fontWeight:700, textAlign:'left' }}>MD Prom.</td>
                                  {intensidadData.map(d => <td key={d.label} style={{ padding:'8px 4px', fontFamily:'DM Mono,monospace' }}>{d.base}</td>)}
                                </tr>
                                <tr style={{ color:'var(--snow)', borderBottom:'1px solid rgba(255,255,255,.02)' }}>
                                  <td style={{ padding:'8px 4px', fontWeight:700, textAlign:'left' }}>MD</td>
                                  {intensidadData.map(d => <td key={d.label} style={{ padding:'8px 4px', fontFamily:'DM Mono,monospace' }}>{typeof d.val === 'number' && !Number.isInteger(d.val) ? d.val.toFixed(1) : d.val}</td>)}
                                </tr>
                                <tr>
                                  <td style={{ padding:'8px 4px', fontWeight:700, textAlign:'left', color:'var(--silver)' }}>%</td>
                                  {intensidadData.map(d => {
                                    const pct = calcPct(d.val, d.base);
                                    const color = pct >= 85 ? 'var(--lime)' : pct >= 60 ? '#f59e0b' : '#ef4444';
                                    return <td key={d.label} style={{ padding:'8px 4px', fontWeight:800, color }}>{pct}%</td>
                                  })}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Impact Table */}
                      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:20, overflow:'hidden' }}>
                        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--mist)', background:'rgba(255,255,255,.02)' }}>
                          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--snow)', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>Sesión Impacto Porcentual por Zona</h3>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth: 500 }}>
                            <thead>
                              <tr style={{ background:'rgba(255,255,255,.03)' }}>
                                <th style={{ padding:10, textAlign:'left', color:'var(--silver)', fontWeight:600 }}>Zona</th>
                                <th style={{ padding:10, textAlign:'left', color:'var(--silver)', fontWeight:600 }}>Métrica</th>
                                <th style={{ padding:10, textAlign:'right', color:'var(--silver)', fontWeight:600 }}>MD Prom.</th>
                                <th style={{ padding:10, textAlign:'right', color:'var(--silver)', fontWeight:600 }}>MD</th>
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
                                  <td style={{ padding:10, textAlign:'right', fontFamily:'DM Mono,monospace', fontWeight:500, color:'var(--silver)' }}>{row.base}</td>
                                  <td style={{ padding:10, textAlign:'right', fontFamily:'DM Mono,monospace', fontWeight:700, color:'var(--lime)' }}>{row.val}</td>
                                  <td style={{ padding:10, textAlign:'center' }}>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                                      <span style={{ fontSize:10, color: row.pct >= 85 ? 'var(--lime)' : row.pct >= 60 ? '#f59e0b' : '#ef4444' }}>{row.pct}%</span>
                                      <span>{row.icon}</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Evolution Charts */}
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
                        <XAxis dataKey="objetivo" tick={{ fill:'var(--fog)', fontSize:9 }} axisLine={false} tickLine={false} />
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
                        <XAxis dataKey="objetivo" tick={{ fill:'var(--fog)', fontSize:9 }} axisLine={false} tickLine={false} />
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
                        <XAxis dataKey="objetivo" tick={{ fill:'var(--fog)', fontSize:9 }} axisLine={false} tickLine={false} />
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

              {/* Weekly Balance Chart */}
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:24, padding:24 }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--snow)', marginBottom:20, textTransform:'uppercase' }}>Balance Neuromuscular Semanal</h3>
                <div style={{ height:250 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.weeklyGps || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" vertical={false} />
                      <XAxis dataKey="semana" tick={{ fill:'var(--fog)', fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'var(--fog)', fontSize:10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--mist)', borderRadius:12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize:10, paddingTop:10 }} />
                      <Area name="Aceleraciones" type="monotone" dataKey="acel" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                      <Area name="Desaceleraciones" type="monotone" dataKey="decel" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.4} />
                      <Area name="Sprints" type="monotone" dataKey="sprints" stackId="1" stroke="#c8f135" fill="#c8f135" fillOpacity={0.4} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recinto Analysis section removed as requested, data integrated in header */}
            </>
          )}
        </div>
      )}
    </div>
  )
}
