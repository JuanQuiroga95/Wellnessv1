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
  const [partidosBase, setPartidosBase] = useState<number[]>([])

  useEffect(() => { load() }, [desde, hasta, partidosBase])

  useEffect(() => {
    const handleClear = () => { setData(null); load(); };
    window.addEventListener('calendario-cleared', handleClear);
    return () => window.removeEventListener('calendario-cleared', handleClear);
  }, [desde, hasta]);

  async function load() {
    setLoading(true)
    try {
      const qs = `?desde=${desde}&hasta=${hasta}&partidos_base=${partidosBase.join(',')}`
      const ar = await fetch(`/api/analytics${qs}`).then(r=>r.json())
      setData({
        loadAnalysis: ar.loadAnalysis || [],
        dailyEvolution: ar.dailyEvolution || [],
        missingCourts: ar.missingCourts || 0,
        weeklyGps: ar.weeklyGps || [],
        partidosDisponibles: ar.partidosDisponibles || [],
        mdPromedio: ar.mdPromedio || null
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
            <label style={{ fontSize:10, color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>PARTIDOS BASE (MD PROM)</label>
            <div style={{ position: 'relative' }}>
              <select
                multiple
                value={partidosBase.map(String)}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions, o => parseInt(o.value))
                  if (vals.length <= 3) setPartidosBase(vals)
                }}
                style={{ background:'var(--ink3)', border:'1px solid var(--fog)', borderRadius:8, padding:'6px 10px', fontSize:12, color:'var(--silver)', outline:'none', height: 32, minWidth: 150 }}
              >
                {(data?.partidosDisponibles || []).map((p: any) => (
                  <option key={p.id} value={p.id}>{p.fecha} - {p.rival || p.titulo || 'Partido'}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', top: -8, right: -8, background: '#3b82f6', color: 'white', fontSize: 9, borderRadius: 10, padding: '2px 6px', fontWeight: 'bold' }}>{partidosBase.length}/3</div>
            </div>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--mist)', margin: '0 8px' }}></div>
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
                  
                  // Valores base calculados dinámicamente o 0
                  const p = data?.mdPromedio;
                  const base_dist_total = p ? p.avg_dist_total : 0;
                  const base_dist_v4 = p ? p.avg_dist_v4 : 0;
                  const base_dist_v5 = p ? p.avg_dist_v5 : 0;
                  const base_acc_int_tot = p ? p.avg_acc_int : 0;
                  const base_acel = p ? p.avg_acel : 0;
                  const base_decel = p ? p.avg_decel : 0;
                  
                  const base_mts_min = p ? p.avg_mts_min : 0;
                  const base_acc_per_min = p && p.avg_duracion ? (p.avg_acc_int / p.avg_duracion) : 0;
                  const base_vel_max = p ? p.avg_max_vel : 0;
                  const base_sprints = p ? p.avg_sprints : 0;
                  const base_max_acc = 0; // Sin datos aún
                  const base_max_dec = 0; // Sin datos aún

                  // Valores de la sesión
                  const val_dist_total = r.avg_dist_total || 0;
                  const val_dist_v4 = r.avg_dist_v4 || 0;
                  const val_dist_v5 = r.avg_dist_v5 || 0;
                  const val_acc_int_tot = r.avg_acc_int || 0;
                  const val_acel = r.avg_acel || 0;
                  const val_decel = r.avg_decel || 0;

                  const val_mts_min = r.avg_mts_min || 0;
                  const val_acc_per_min = r.avg_duracion ? (r.avg_acc_int / r.avg_duracion) : 0;
                  const val_vel_max = r.avg_max_vel || 0;
                  const val_sprints = r.avg_sprints || 0;
                  const val_max_acc = 0;
                  const val_max_dec = 0;

                  const renderPct = (val: number, base: number) => {
                    if (!base) return <td style={{ border: '1px solid black', padding: 6, fontWeight: 'bold', color: 'black', background: '#f8fafc' }}>0%</td>;
                    const pct = Math.round((val / base) * 100);
                    const color = pct >= 85 ? '#385d22' : pct >= 60 ? '#b45309' : '#b91c1c';
                    const bg = pct >= 85 ? '#e2efda' : pct >= 60 ? '#fef3c7' : '#fee2e2';
                    return <td style={{ border: '1px solid black', padding: 6, fontWeight: 'bold', color, background: bg }}>{pct}%</td>
                  }

                  return (
                    <div style={{ background: '#ffffff', borderRadius: 12, padding: 16, overflowX: 'auto', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ color: 'black', fontWeight: 'bold', fontSize: 16 }}>Análisis de Sesión (Formato Excel)</div>
                        {r.cancha && (
                          <div style={{ fontSize:12, color:'#475569', fontWeight:600 }}>
                            Cancha: <span style={{ color:'black' }}>{r.cancha}</span> {r.dimensiones ? `(${r.dimensiones}m)` : ''}
                          </div>
                        )}
                      </div>
                      
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: 12, minWidth: 600 }}>
                        <tbody>
                          {/* ======================= MD PROMEDIO ======================= */}
                          <tr>
                            <td colSpan={6} style={{ color: '#00b0f0', fontWeight: 'bold', fontSize: 14, padding: 8, border: '2px solid #00b0f0', borderRadius: '8px 8px 0 0', textTransform: 'uppercase' }}>MD PROMEDIO</td>
                          </tr>
                          <tr>
                            <td colSpan={6} style={{ background: '#9bc2e6', color: 'black', fontWeight: 'bold', padding: 6, border: '1px solid black', textTransform: 'uppercase' }}>VOLUMEN</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>DT (m)</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>HSR (m)</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Dist Sprint</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Acc Int Tot</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>ACC</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>DEC</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_dist_total.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_dist_v4.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_dist_v5.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_acc_int_tot.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_acel.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_decel.toFixed(0)}</td>
                          </tr>
                          <tr style={{ background: '#e2efda', color: '#385d22', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                          </tr>
                          
                          <tr>
                            <td colSpan={6} style={{ background: '#f4b084', color: 'black', fontWeight: 'bold', padding: 6, border: '1px solid black', textTransform: 'uppercase' }}>INTENSIDAD</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>Mts/min</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Acc Int/min</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Vel Max</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Sprint (n)</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Max ACC</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Max DEC</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_mts_min.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_acc_per_min.toFixed(1)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_vel_max.toFixed(1)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_sprints.toFixed(1)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_max_acc.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{base_max_dec.toFixed(0)}</td>
                          </tr>
                          <tr style={{ background: '#e2efda', color: '#385d22', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>100%</td>
                          </tr>
                          
                          {/* ======================= ESPACIO ======================= */}
                          <tr><td colSpan={6} style={{ height: 20, borderLeft: '1px solid white', borderRight: '1px solid white' }}></td></tr>

                          {/* ======================= MD (SESION ACTUAL) ======================= */}
                          <tr>
                            <td colSpan={6} style={{ color: 'black', fontWeight: 'bold', fontSize: 14, padding: 8, border: '2px solid black', borderRadius: '8px 8px 0 0' }}>MD</td>
                          </tr>
                          <tr>
                            <td colSpan={6} style={{ background: '#9bc2e6', color: 'black', fontWeight: 'bold', padding: 6, border: '1px solid black' }}>VOLUMEN</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>DT (m)</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>HSR (m)</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Dist Sprint</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Acc Int Tot</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>ACC</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>DEC</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_dist_total.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_dist_v4.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_dist_v5.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_acc_int_tot.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_acel.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_decel.toFixed(0)}</td>
                          </tr>
                          <tr>
                            {renderPct(val_dist_total, base_dist_total)}
                            {renderPct(val_dist_v4, base_dist_v4)}
                            {renderPct(val_dist_v5, base_dist_v5)}
                            {renderPct(val_acc_int_tot, base_acc_int_tot)}
                            {renderPct(val_acel, base_acel)}
                            {renderPct(val_decel, base_decel)}
                          </tr>
                          
                          <tr>
                            <td colSpan={6} style={{ background: '#f4b084', color: 'black', fontWeight: 'bold', padding: 6, border: '1px solid black' }}>INTENSIDAD</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black', fontWeight: 'bold' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>Mts/min</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Acc Int/min</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Vel Max</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Sprint (n)</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Max ACC</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>Max DEC</td>
                          </tr>
                          <tr style={{ background: 'white', color: 'black' }}>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_mts_min.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_acc_per_min.toFixed(1)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_vel_max.toFixed(1)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_sprints.toFixed(1)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_max_acc.toFixed(0)}</td>
                            <td style={{ border: '1px solid black', padding: 6 }}>{val_max_dec.toFixed(0)}</td>
                          </tr>
                          <tr>
                            {renderPct(val_mts_min, base_mts_min)}
                            {renderPct(val_acc_per_min, base_acc_per_min)}
                            {renderPct(val_vel_max, base_vel_max)}
                            {renderPct(val_sprints, base_sprints)}
                            {renderPct(val_max_acc, base_max_acc)}
                            {renderPct(val_max_dec, base_max_dec)}
                          </tr>
                        </tbody>
                      </table>
                    </div>
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
