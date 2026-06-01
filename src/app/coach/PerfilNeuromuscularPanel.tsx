'use client'
import { useState, useEffect } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, CartesianGrid, XAxis, YAxis, Legend, Line, AreaChart, Area, BarChart, Bar } from 'recharts'

export default function PerfilNeuromuscularPanel() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const todayStr = new Date().toISOString().split('T')[0]
  const defaultDesde = (() => { const d = new Date(); d.setDate(d.getDate()-28); return d.toISOString().split('T')[0] })()
  const [desde, setDesde] = useState(defaultDesde)
  const [hasta, setHasta] = useState(todayStr)
  const [partidosBase, setPartidosBase] = useState<number[]>([])
  const [showPartidosDropdown, setShowPartidosDropdown] = useState(false)

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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div 
                onClick={() => setShowPartidosDropdown(!showPartidosDropdown)}
                style={{ background:'var(--ink3)', border:'1px solid var(--fog)', borderRadius:8, padding:'6px 10px', fontSize:12, color:'var(--silver)', cursor:'pointer', minWidth: 160, display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 32 }}
              >
                <span>{partidosBase.length === 0 ? 'Selecciona (Max 5)' : `${partidosBase.length} partido(s)`}</span>
                <span style={{ fontSize: 10 }}>▼</span>
              </div>
              
              {showPartidosDropdown && (
                <>
                  <div onClick={() => setShowPartidosDropdown(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}></div>
                  <div style={{ position: 'absolute', top: 38, left: 0, background: 'var(--ink2)', border: '1px solid var(--fog)', borderRadius: 8, zIndex: 50, width: 250, maxHeight: 300, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    {(data?.partidosDisponibles || []).map((p: any) => {
                      const isSelected = partidosBase.includes(p.id);
                      const disabled = !isSelected && partidosBase.length >= 5;
                      return (
                        <div 
                          key={p.id}
                          onClick={() => {
                            if (isSelected) {
                              setPartidosBase(prev => prev.filter(id => id !== p.id));
                            } else if (!disabled) {
                              setPartidosBase(prev => [...prev, p.id]);
                            }
                          }}
                          style={{ padding: '8px 12px', cursor: disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', background: isSelected ? 'rgba(56,189,248,0.1)' : 'transparent', opacity: disabled ? 0.5 : 1 }}
                        >
                          <input type="checkbox" checked={isSelected} readOnly style={{ cursor: disabled ? 'not-allowed' : 'pointer' }} />
                          <span style={{ color: isSelected ? '#38bdf8' : 'var(--silver)', fontSize: 11, fontWeight: isSelected ? 'bold' : 'normal' }}>{p.fecha} - {p.rival || p.titulo || 'Partido'}</span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {partidosBase.length > 0 && (
                <button 
                  onClick={() => setPartidosBase([])}
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Limpiar selección"
                >✕</button>
              )}
              <div style={{ position: 'absolute', top: -8, right: partidosBase.length > 0 ? 20 : -8, background: '#3b82f6', color: 'white', fontSize: 9, borderRadius: 10, padding: '2px 6px', fontWeight: 'bold' }}>{partidosBase.length}/5</div>
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
                    if (!base) return <td style={{ padding: '10px 6px', fontWeight: 'bold', color: 'var(--fog)', fontSize: 11 }}>0%</td>;
                    const pct = Math.round((val / base) * 100);
                    const color = pct >= 85 ? 'var(--lime)' : pct >= 60 ? '#f59e0b' : '#ef4444';
                    return <td style={{ padding: '10px 6px', fontWeight: 'bold', color, fontSize: 13 }}>{pct}%</td>
                  }

                  const renderPctBadge = (val: number, base: number) => {
                    if (!base) return <span style={{ padding: '4px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--fog)', fontSize: 11, fontWeight: 'bold' }}>0%</span>;
                    const pct = Math.round((val / base) * 100);
                    const color = pct >= 85 ? 'var(--lime)' : pct >= 60 ? '#f59e0b' : '#ef4444';
                    const bg = pct >= 85 ? 'rgba(200,241,53,0.1)' : pct >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';
                    return <span style={{ padding: '4px 8px', borderRadius: 4, background: bg, color, fontSize: 11, fontWeight: 'bold' }}>{pct}%</span>
                  }

                  const thStyle = { color: 'var(--silver)', fontSize: 10, fontWeight: 600, padding: '12px 6px', textTransform: 'uppercase' as any, borderBottom: '1px solid rgba(255,255,255,0.05)' };
                  const tdStyle = { color: 'var(--snow)', fontSize: 13, fontWeight: 600, padding: '12px 6px', fontFamily: 'DM Mono, monospace', borderBottom: '1px solid rgba(255,255,255,0.02)' };

                  return (
                    <div style={{ background: 'var(--ink2)', borderRadius: 20, padding: 24, border: '1px solid var(--mist)', display: 'flex', flexDirection: 'column', gap: 32 }}>
                      
                      {/* HEADER */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h3 style={{ color: 'var(--snow)', fontWeight: 700, fontSize: 16, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impacto de Sesión</h3>
                          <p style={{ color: 'var(--silver)', fontSize: 12, margin: '4px 0 0 0' }}>Análisis comparativo vs MD Promedio</p>
                        </div>
                        {r.cancha && (
                          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 20, fontSize: 11, color: 'var(--silver)' }}>
                            Cancha: <span style={{ color: 'var(--snow)', fontWeight: 600 }}>{r.cancha}</span> {r.dimensiones ? `(${r.dimensiones}m)` : ''}
                          </div>
                        )}
                      </div>

                      {/* MD PROMEDIO */}
                      <div>
                        <div style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8' }}></div>
                          <h4 style={{ color: '#38bdf8', fontSize: 13, margin: 0, fontWeight: 700, letterSpacing: '0.05em' }}>MD PROMEDIO (BASE)</h4>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: '0 0 8px 8px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none' }}>
                          <div>
                            <h5 style={{ color: 'var(--silver)', fontSize: 11, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volumen</h5>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>DT (m)</th><th style={thStyle}>HSR (m)</th><th style={thStyle}>Dist Sprint</th>
                                  <th style={thStyle}>Acc Int Tot</th><th style={thStyle}>ACC</th><th style={thStyle}>DEC</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={tdStyle}>{base_dist_total.toFixed(0)}</td><td style={tdStyle}>{base_dist_v4.toFixed(0)}</td><td style={tdStyle}>{base_dist_v5.toFixed(0)}</td>
                                  <td style={tdStyle}>{base_acc_int_tot.toFixed(0)}</td><td style={tdStyle}>{base_acel.toFixed(0)}</td><td style={tdStyle}>{base_decel.toFixed(0)}</td>
                                </tr>
                                <tr>
                                  <td style={{...tdStyle, color:'var(--silver)', border: 'none'}} colSpan={6}><span style={{ color:'var(--lime)', fontSize:11 }}>100% de referencia</span></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <h5 style={{ color: 'var(--silver)', fontSize: 11, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intensidad</h5>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>Mts/min</th><th style={thStyle}>Acc Int/min</th><th style={thStyle}>Vel Max</th>
                                  <th style={thStyle}>Sprint (n)</th><th style={thStyle}>Max ACC</th><th style={thStyle}>Max DEC</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={tdStyle}>{base_mts_min.toFixed(0)}</td><td style={tdStyle}>{base_acc_per_min.toFixed(1)}</td><td style={tdStyle}>{base_vel_max.toFixed(1)}</td>
                                  <td style={tdStyle}>{base_sprints.toFixed(1)}</td><td style={tdStyle}>{base_max_acc.toFixed(0)}</td><td style={tdStyle}>{base_max_dec.toFixed(0)}</td>
                                </tr>
                                <tr>
                                  <td style={{...tdStyle, color:'var(--silver)', border: 'none'}} colSpan={6}><span style={{ color:'var(--lime)', fontSize:11 }}>100% de referencia</span></td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* MD (SESION ACTUAL) */}
                      <div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px 8px 0 0', display: 'flex', gap: 8, alignItems: 'center' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--snow)' }}></div>
                          <h4 style={{ color: 'var(--snow)', fontSize: 13, margin: 0, fontWeight: 700, letterSpacing: '0.05em' }}>MD (SESIÓN ACTUAL)</h4>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: '0 0 8px 8px', border: '1px solid rgba(255,255,255,0.05)', borderTop: 'none' }}>
                          <div>
                            <h5 style={{ color: 'var(--silver)', fontSize: 11, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volumen</h5>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>DT (m)</th><th style={thStyle}>HSR (m)</th><th style={thStyle}>Dist Sprint</th>
                                  <th style={thStyle}>Acc Int Tot</th><th style={thStyle}>ACC</th><th style={thStyle}>DEC</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={tdStyle}>{val_dist_total.toFixed(0)}</td><td style={tdStyle}>{val_dist_v4.toFixed(0)}</td><td style={tdStyle}>{val_dist_v5.toFixed(0)}</td>
                                  <td style={tdStyle}>{val_acc_int_tot.toFixed(0)}</td><td style={tdStyle}>{val_acel.toFixed(0)}</td><td style={tdStyle}>{val_decel.toFixed(0)}</td>
                                </tr>
                                <tr>
                                  {renderPct(val_dist_total, base_dist_total)}
                                  {renderPct(val_dist_v4, base_dist_v4)}
                                  {renderPct(val_dist_v5, base_dist_v5)}
                                  {renderPct(val_acc_int_tot, base_acc_int_tot)}
                                  {renderPct(val_acel, base_acel)}
                                  {renderPct(val_decel, base_decel)}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div>
                            <h5 style={{ color: 'var(--silver)', fontSize: 11, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Intensidad</h5>
                            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thStyle}>Mts/min</th><th style={thStyle}>Acc Int/min</th><th style={thStyle}>Vel Max</th>
                                  <th style={thStyle}>Sprint (n)</th><th style={thStyle}>Max ACC</th><th style={thStyle}>Max DEC</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td style={tdStyle}>{val_mts_min.toFixed(0)}</td><td style={tdStyle}>{val_acc_per_min.toFixed(1)}</td><td style={tdStyle}>{val_vel_max.toFixed(1)}</td>
                                  <td style={tdStyle}>{val_sprints.toFixed(1)}</td><td style={tdStyle}>{val_max_acc.toFixed(0)}</td><td style={tdStyle}>{val_max_dec.toFixed(0)}</td>
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
                        </div>
                      </div>

                      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }}></div>

                      {/* GRÁFICOS Y PROMEDIOS */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 32 }}>
                        <div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <h4 style={{ color: 'var(--snow)', fontSize: 12, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impacto Global (Promedios)</h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                <span style={{ color: 'var(--silver)', fontSize: 12, fontWeight: 600 }}>% Promedio Volumen</span>
                                {renderPctBadge(
                                  Math.round((val_acc_int_tot/base_acc_int_tot)*100 || 0) + 
                                  Math.round((val_dist_v4/base_dist_v4)*100 || 0) + 
                                  Math.round((val_dist_v5/base_dist_v5)*100 || 0), 300
                                )}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                                <span style={{ color: 'var(--silver)', fontSize: 12, fontWeight: 600 }}>% Promedio Intensidad</span>
                                {renderPctBadge(
                                  Math.round((val_acc_per_min/base_acc_per_min)*100 || 0) + 
                                  Math.round((val_mts_min/base_mts_min)*100 || 0) + 
                                  Math.round((val_sprints/base_sprints)*100 || 0), 300
                                )}
                              </div>
                            </div>

                            <div style={{ height: 200, width: '100%' }}>
                              <ResponsiveContainer>
                                <BarChart 
                                  data={[{
                                    name: 'Impacto', 
                                    "% Promedio Volumen": (() => {
                                      const p1 = base_acc_int_tot ? Math.round((val_acc_int_tot/base_acc_int_tot)*100) : 0;
                                      const p2 = base_dist_v4 ? Math.round((val_dist_v4/base_dist_v4)*100) : 0;
                                      const p3 = base_dist_v5 ? Math.round((val_dist_v5/base_dist_v5)*100) : 0;
                                      return Math.round((p1 + p2 + p3) / 3) || 0;
                                    })(),
                                    "% Promedio Intensidad": (() => {
                                      const p1 = base_acc_per_min ? Math.round((val_acc_per_min/base_acc_per_min)*100) : 0;
                                      const p2 = base_mts_min ? Math.round((val_mts_min/base_mts_min)*100) : 0;
                                      const p3 = base_sprints ? Math.round((val_sprints/base_sprints)*100) : 0;
                                      return Math.round((p1 + p2 + p3) / 3) || 0;
                                    })()
                                  }]} 
                                  margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                  <XAxis dataKey="name" hide />
                                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--fog)', fontSize: 10 }} tickFormatter={(val) => `${val}%`} axisLine={false} tickLine={false} />
                                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ background: 'var(--ink)', border: '1px solid var(--mist)', borderRadius: 12, color: 'var(--snow)' }} />
                                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, color: 'var(--silver)' }} />
                                  <Bar dataKey="% Promedio Volumen" fill="#3b82f6" radius={[4,4,0,0]} barSize={40} />
                                  <Bar dataKey="% Promedio Intensidad" fill="#f97316" radius={[4,4,0,0]} barSize={40} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        </div>

                        {/* IMPACTO DE LA SESION PORCENTUAL TABLE */}
                        <div>
                          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, border: '1px solid rgba(255,255,255,0.05)', height: '100%' }}>
                            <h4 style={{ color: 'var(--snow)', fontSize: 12, margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impacto Porcentual Detallado</h4>
                            
                            {(() => {
                              const pct_acc_int_tot = base_acc_int_tot ? Math.round((val_acc_int_tot/base_acc_int_tot)*100) : 0;
                              const pct_dist_v4 = base_dist_v4 ? Math.round((val_dist_v4/base_dist_v4)*100) : 0;
                              const pct_dist_v5 = base_dist_v5 ? Math.round((val_dist_v5/base_dist_v5)*100) : 0;
                              
                              const pct_acc_per_min = base_acc_per_min ? Math.round((val_acc_per_min/base_acc_per_min)*100) : 0;
                              const pct_mts_min = base_mts_min ? Math.round((val_mts_min/base_mts_min)*100) : 0;
                              const pct_sprints = base_sprints ? Math.round((val_sprints/base_sprints)*100) : 0;

                              const rowStyle = { borderBottom: '1px solid rgba(255,255,255,0.03)' };
                              const catStyle = { color: 'var(--silver)', fontSize: 10, fontWeight: 700, padding: 12, textTransform: 'uppercase' as any };
                              
                              return (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                  <tbody>
                                    {/* VOLUMEN */}
                                    <tr style={rowStyle}>
                                      <td rowSpan={3} style={{ ...catStyle, verticalAlign: 'middle', borderRight: '1px solid rgba(255,255,255,0.05)' }}>Volumen</td>
                                      <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></div>
                                          <div>
                                            <div style={{ color: 'var(--snow)', fontSize: 12, fontWeight: 600 }}>Tensión</div>
                                            <div style={{ color: 'var(--fog)', fontSize: 10 }}>Acc Int Tot</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{renderPctBadge(val_acc_int_tot, base_acc_int_tot)}</td>
                                    </tr>
                                    <tr style={rowStyle}>
                                      <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a3e635' }}></div>
                                          <div>
                                            <div style={{ color: 'var(--snow)', fontSize: 12, fontWeight: 600 }}>Duración</div>
                                            <div style={{ color: 'var(--fog)', fontSize: 10 }}>HSR (m)</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{renderPctBadge(val_dist_v4, base_dist_v4)}</td>
                                    </tr>
                                    <tr style={rowStyle}>
                                      <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></div>
                                          <div>
                                            <div style={{ color: 'var(--snow)', fontSize: 12, fontWeight: 600 }}>Velocidad</div>
                                            <div style={{ color: 'var(--fog)', fontSize: 10 }}>Dist Sprint</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{renderPctBadge(val_dist_v5, base_dist_v5)}</td>
                                    </tr>
                                    {/* INTENSIDAD */}
                                    <tr style={rowStyle}>
                                      <td rowSpan={3} style={{ ...catStyle, verticalAlign: 'middle', borderRight: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>Intensidad</td>
                                      <td style={{ padding: '10px 12px', paddingTop: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></div>
                                          <div>
                                            <div style={{ color: 'var(--snow)', fontSize: 12, fontWeight: 600 }}>Tensión</div>
                                            <div style={{ color: 'var(--fog)', fontSize: 10 }}>Acc Int/min</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '10px 12px', paddingTop: 20 }}>{renderPctBadge(val_acc_per_min, base_acc_per_min)}</td>
                                    </tr>
                                    <tr style={rowStyle}>
                                      <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a3e635' }}></div>
                                          <div>
                                            <div style={{ color: 'var(--snow)', fontSize: 12, fontWeight: 600 }}>Duración</div>
                                            <div style={{ color: 'var(--fog)', fontSize: 10 }}>Mts/min</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{renderPctBadge(val_mts_min, base_mts_min)}</td>
                                    </tr>
                                    <tr>
                                      <td style={{ padding: '10px 12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></div>
                                          <div>
                                            <div style={{ color: 'var(--snow)', fontSize: 12, fontWeight: 600 }}>Velocidad</div>
                                            <div style={{ color: 'var(--fog)', fontSize: 10 }}>Sprint (n)</div>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ textAlign: 'right', padding: '10px 12px' }}>{renderPctBadge(val_sprints, base_sprints)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              )
                            })()}
                          </div>
                        </div>
                      </div>

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
