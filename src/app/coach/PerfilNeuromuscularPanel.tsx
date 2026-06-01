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
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(350px, 1fr))', gap:20 }}>
                {/* Impact Table */}
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
                      {( () => {
                        const r = rows[0]
                        const impactData = [
                          { category: 'Intensidad', label: 'Tensión', sub: 'Acc/min', val: (r.avg_acel / (r.avg_duracion||1)).toFixed(2), pct: 115, icon: '✅' },
                          { category: 'Intensidad', label: 'Duración', sub: 'Mts/min', val: r.avg_mts_min.toFixed(1), pct: 99, icon: '✅' },
                          { category: 'Intensidad', label: 'Velocidad', sub: 'Sprint', val: r.avg_sprints.toFixed(1), pct: 13, icon: '❌' },
                          { category: 'Volumen', label: 'Tensión', sub: 'Acc int', val: r.avg_acc_int.toFixed(1), pct: 46, icon: '✅' },
                          { category: 'Volumen', label: 'Duración', sub: 'Dist 19 km/h', val: r.avg_dist_v4.toFixed(0), pct: 27, icon: '⚠️' },
                          { category: 'Volumen', label: 'Velocidad', sub: 'Dist 24 km/h', val: r.avg_dist_v5.toFixed(0), pct: 9, icon: '❌' },
                        ]
                        return impactData.map((row, idx) => (
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
                        ))
                      })() }
                    </tbody>
                  </table>
                </div>
                {/* Balance Pie */}
                <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:20, padding:24, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'var(--silver)', marginBottom:20, textTransform:'uppercase' }}>Balance Neuromuscular</h3>
                  <div style={{ width:'100%', height:220 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={( () => {
                          const r = rows[0]
                          const total = r.avg_acel + r.avg_decel + r.avg_sprints
                          return [
                            { name: 'Aceleraciones', value: r.avg_acel, color: '#3b82f6', pct: ((r.avg_acel/total)*100).toFixed(1) },
                            { name: 'Desaceleraciones', value: r.avg_decel, color: '#f97316', pct: ((r.avg_decel/total)*100).toFixed(1) },
                            { name: 'Sprints', value: r.avg_sprints, color: '#c8f135', pct: ((r.avg_sprints/total)*100).toFixed(1) }
                          ]
                        })()} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                          {[0,1,2].map((i) => <Cell key={i} fill={['#3b82f6','#f97316','#c8f135'][i]} stroke="none" />)}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ background:'var(--ink)', border:'1px solid var(--mist)', borderRadius:12, fontSize:12 }} 
                          itemStyle={{ color:'var(--snow)' }}
                          formatter={(value: any, name: any, props: any) => [`${value.toFixed(1)} (${props.payload.pct}%)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display:'flex', gap:16, marginTop:10 }}>
                    {[ ['#3b82f6','Aceleraciones'], ['#f97316','Desacel.'], ['#c8f135','Sprints'] ].map(d => (
                      <div key={d[1]} style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:'var(--fog)' }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:d[0] }} /> {d[1]}
                      </div>
                    ))}
                  </div>
                </div>
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

              {/* Recinto Analysis */}
              <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:12 }}>
                <h4 style={{ fontSize:12, fontWeight:700, color:'var(--silver)', margin:0, textTransform:'uppercase' }}>Análisis por Recinto</h4>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:16 }}>
                  {rows.map((r: any, i: number) => {
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
