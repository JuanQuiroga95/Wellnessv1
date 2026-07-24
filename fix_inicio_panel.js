const fs = require('fs')

let content = fs.readFileSync('src/app/coach/InicioPanel.tsx', 'utf8')

// 1. Add constants at the top (after imports)
const constants = `
const ENTRENAMIENTO_OPTIMIZADOR = {
  COMPETITIVO: ['PARTIDO COMPETICIÓN', 'PARTIDO AMISTOSO', 'PARTIDO ENTRENAMIENTO', 'PARTIDO SITUACIÓN 11c11-8c8', 'PARTIDO REDUCIDO 7c7-3c3'],
  ESPECIAL: ['JUEGO POSICIÓN GRANDE 8c8-11c11', 'JUEGO POSICIÓN REDUCIDO 7c7-3c3', 'EVOLUCIÓN CON OPOSICIÓN', 'ABP CON OPOSICIÓN', 'EVOLUCIÓN SIN OPOSICIÓN', 'ABP SIN OPOSICIÓN', 'RONDOS', 'TRANSICIONES']
}

const ENTRENAMIENTO_COADYUVANTE = {
  DIRIGIDO: ['CIRCUITO TÉCNICO CON FINALIZACIÓN', 'CIRCUITO DIRIGIDO CON FINALIZACIÓN', 'CIRCUITO TÉCNICO', 'CIRCUITO DIRIGIDO', 'JUEGO LÚDICO'],
  GENERAL: ['DOMINIO BALÓN', 'CIRCUITO PROPIOCEPCIÓN', 'CIRCUITO CONDICIONAL', 'ACTIVACIÓN NEUROMUSCULAR', 'CUALIDADES ESPECÍFICAS', 'PREVENTIVO', 'ESTRUCTURAL', 'RESTAURACIÓN']
}

const getSubtareasArr = (bloque: any) => {
  try {
    if (typeof bloque.subtareas === 'string') return JSON.parse(bloque.subtareas)
    if (Array.isArray(bloque.subtareas)) return bloque.subtareas
  } catch(e) {}
  if (bloque.subtarea) return [bloque.subtarea]
  return []
}
`
content = content.replace(/(import .*?\n\n)/, '$1' + constants + '\n')

// 2. Add states for mandamientos and task distribution
const states = `  const [orientacionData, setOrientacionData] = useState<any[]>([])
  const [fuerzaMandamientos, setFuerzaMandamientos] = useState<any[]>([])
  const [distribucionTareas, setDistribucionTareas] = useState<any>(null)
`
content = content.replace("  const [orientacionData, setOrientacionData] = useState<any[]>([])", states)

// 3. Add fetch for mandamientos in useEffect
const fetch_call = `        // Fetch Agenda (Last 14 days to today+1 for volume relativity)
        const mandRes = await fetch('/api/fuerza/mandamientos')
        const mandD = await mandRes.json()
        const mandamientos = mandD.mandamientos || []
        setFuerzaMandamientos(mandamientos)

        const calRes = await fetch(\`/api/calendario?desde=\${past14Days}&hasta=\${tomorrow}\`)`
content = content.replace("        // Fetch Agenda (Last 14 days to today+1 for volume relativity)\n        const calRes = await fetch(`/api/calendario?desde=${past14Days}&hasta=${tomorrow}`)", fetch_call)

// 4. Add logic for Distribucion de Tareas inside useEffect
const dist_logic = `
        let totalOptimizadorMin = 0
        let totalCoadyuvanteMin = 0
        const optimizadorEspecial: Record<string, number> = {}
        const optimizadorCompetitivo: Record<string, number> = {}
        const coadyuvanteGeneral: Record<string, number> = {}
        const coadyuvanteDirigido: Record<string, number> = {}
        const ejesDetalle: Record<string, number> = {}

        allEvents.forEach((ev: any) => {
          if (ev.fecha >= pastWeek && ev.fecha <= tomorrow) {
            if (ev.ejercicios && Array.isArray(ev.ejercicios)) {
              ev.ejercicios.forEach((bl:any) => {
                const mins = (Number(bl.series)||1) * (Number(bl.minutos)||0)
                if (mins <= 0) return

                let tName = bl.ventana || 'Sin especificar'

                if (bl.tipo_entrenamiento === 'OPTIMIZADOR') {
                  totalOptimizadorMin += mins
                  if (bl.orientacion === 'COMPETITIVO') optimizadorCompetitivo[tName] = (optimizadorCompetitivo[tName] || 0) + mins
                  else optimizadorEspecial[tName] = (optimizadorEspecial[tName] || 0) + mins
                } else if (bl.tipo_entrenamiento === 'COADYUVANTE') {
                  totalCoadyuvanteMin += mins
                  if (bl.orientacion === 'GENERAL') coadyuvanteGeneral[tName] = (coadyuvanteGeneral[tName] || 0) + mins
                  else coadyuvanteDirigido[tName] = (coadyuvanteDirigido[tName] || 0) + mins

                  // Sumar a los Ejes Estructurales
                  const ejes = bl.ejes_estructurales || []
                  ejes.forEach((eId: string) => {
                    const m = mandamientos.find((fm:any) => fm.id === eId)
                    if (m) {
                      const mName = \`M\${m.numero}. \${m.nombre.split(' (')[0]}\`
                      ejesDetalle[mName] = (ejesDetalle[mName] || 0) + (mins / (ejes.length || 1))
                    }
                  })
                } else {
                  // Fallback
                  let fallbackName = tName
                  const nameUpper = tName.toUpperCase()
                  if (nameUpper.includes('ACTIVACIÓN EN CAMPO') || nameUpper.includes('ACTIVACION EN CAMPO') || nameUpper.includes('ACTIVACIÓN EN GIMNASIO') || nameUpper.includes('ACTIVACION EN GIMNASIO')) fallbackName = 'ACTIVACIÓN NEUROMUSCULAR'
                  else if (nameUpper.includes('FUERZA ESTRUCTURAL')) fallbackName = 'ESTRUCTURAL'
                  else if (nameUpper.includes('PARTIDO REDUCIDO')) fallbackName = 'PARTIDO REDUCIDO 7c7-3c3'
                  
                  const fbUpper = fallbackName.toUpperCase()
                  if (ENTRENAMIENTO_OPTIMIZADOR.COMPETITIVO.includes(fbUpper) || fbUpper.includes('PARTIDO')) {
                    totalOptimizadorMin += mins; optimizadorCompetitivo[fallbackName] = (optimizadorCompetitivo[fallbackName] || 0) + mins;
                  } else if (ENTRENAMIENTO_OPTIMIZADOR.ESPECIAL.includes(fbUpper) || fbUpper.includes('POSESION') || fbUpper.includes('POSESIÓN') || fbUpper.includes('RUEDA') || fbUpper.includes('TRANSICION') || fbUpper.includes('TRANSICIÓN') || fbUpper.includes('ANALITICO') || fbUpper.includes('ANALÍTICO') || fbUpper.includes('RONDO') || fbUpper.includes('EVOLUCION') || fbUpper.includes('EVOLUCIÓN')) {
                    totalOptimizadorMin += mins; optimizadorEspecial[fallbackName] = (optimizadorEspecial[fallbackName] || 0) + mins;
                  } else if (ENTRENAMIENTO_COADYUVANTE.DIRIGIDO.includes(fbUpper) || fbUpper.includes('LUDICO') || fbUpper.includes('LÚDICO') || fbUpper.includes('BALON') || fbUpper.includes('BALÓN') || fbUpper.includes('DIRIGIDO')) {
                    totalCoadyuvanteMin += mins; coadyuvanteDirigido[fallbackName] = (coadyuvanteDirigido[fallbackName] || 0) + mins;
                  } else if (ENTRENAMIENTO_COADYUVANTE.GENERAL.includes(fbUpper) || fbUpper.includes('ACTIVACION') || fbUpper.includes('ACTIVACIÓN') || fbUpper.includes('FUERZA') || fbUpper.includes('PREVENTIVO') || fbUpper.includes('ESTRUCTURAL') || fbUpper.includes('GIMNASIO') || fbUpper.includes('PROPIOCEPCION')) {
                    totalCoadyuvanteMin += mins; coadyuvanteGeneral[fallbackName] = (coadyuvanteGeneral[fallbackName] || 0) + mins;
                    let subtareas = getSubtareasArr(bl)
                    if (subtareas.length === 0) subtareas = [bl.ventana || 'Sin especificar']
                    subtareas.forEach((st:any) => {
                      const gymMap: Record<string, string> = {
                        'Movilidad': 'M1. Preparación Articular',
                        'Preparación Articular (Movilidad)': 'M1. Preparación Articular',
                        'Pliometría': 'M2. Potencia y Reactividad',
                        'Potencia y Reactividad (Balísticos y CEA)': 'M2. Potencia y Reactividad',
                        'Tracción (Fuerza Posterior/Escapular)': 'M3. Tracción (Posterior)',
                        'Empuje (Fuerza Anterior)': 'M4. Empuje (Anterior)',
                        'Excéntricos (Control de Carga y Prevención)': 'M5. Excéntricos (Prevención)',
                        'Isométricos': 'M6. Isométricos',
                        'Isométricos (Resiliencia Estructural)': 'M6. Isométricos',
                        'Estabilidad': 'M7. Estabilidad Estática',
                        'Estabilidad Estática (Anti-movimiento/Core)': 'M7. Estabilidad Estática',
                        'Estabilidad Dinámica (Transferencia de Fuerzas)': 'M8. Estabilidad Dinámica',
                        'Coordinación y Transferencia Propioceptiva': 'M9. Coordinación',
                        'Recuperación y Mantenimiento Tisular': 'M10. Recuperación'
                      };
                      const mappedSt = gymMap[st] || st;
                      ejesDetalle[mappedSt] = (ejesDetalle[mappedSt] || 0) + (mins / (subtareas.length || 1))
                    })
                  } else {
                    totalOptimizadorMin += mins; optimizadorEspecial[fallbackName] = (optimizadorEspecial[fallbackName] || 0) + mins;
                  }
                }
              })
            }
          }
        })
        
        const optEspecialSorted = ENTRENAMIENTO_OPTIMIZADOR.ESPECIAL.map(k => [k, optimizadorEspecial[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
        const optCompSorted = ENTRENAMIENTO_OPTIMIZADOR.COMPETITIVO.map(k => [k, optimizadorCompetitivo[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
        const coadGenSorted = ENTRENAMIENTO_COADYUVANTE.GENERAL.map(k => [k, coadyuvanteGeneral[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
        const coadDirSorted = ENTRENAMIENTO_COADYUVANTE.DIRIGIDO.map(k => [k, coadyuvanteDirigido[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
        const ejesSorted = mandamientos.map((m:any) => {
          const mName = \`M\${m.numero}. \${m.nombre.split(' (')[0]}\`
          return [mName, ejesDetalle[mName] || 0] as [string, number]
        }).filter((x:any)=>x[1]>0).sort((a:any,b:any)=>b[1]-a[1])

        setDistribucionTareas({
          totalMin: totalOptimizadorMin + totalCoadyuvanteMin,
          totalOptimizadorMin, totalCoadyuvanteMin,
          optEspecialSorted, optCompSorted, coadGenSorted, coadDirSorted, ejesSorted
        })

        if (totalBloquesOrientacion > 0) {`
content = content.replace("        if (totalBloquesOrientacion > 0) {", dist_logic)

// 5. Replace orientacionData rendering
const old_orientacion = `<div style={{ width: '100%', height: 160, marginTop: 16 }}>
                {!loading && orientacionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orientacionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--mist)" horizontal={true} vertical={false} />
                      <XAxis type="number" stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} hide />
                      <YAxis dataKey="name" type="category" stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} width={80} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={({active, payload}: any) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ background:'rgba(8,8,8,0.9)', border:'1px solid var(--mist)', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
                              <p style={{ margin:0, color:'var(--silver)', marginBottom:4 }}>{data.name}</p>
                              <p style={{ margin:0, color:'var(--snow)', fontWeight:700 }}>
                                {data.value} {data.value === 1 ? 'tarea' : 'tareas'} ({data.percent}%)
                              </p>
                            </div>
                          )
                        }
                        return null;
                      }} />
                      <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={20}>
                        {orientacionData.map((entry, index) => (
                          <Cell key={\`cell-\${index}\`} fill={entry.name==='A-R'?'#10b981':entry.name==='Fuerza'?'#a855f7':entry.name==='Resistencia'?'#f59e0b':entry.name==='Velocidad'?'#3b82f6':'var(--mist)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--fog)', fontSize: 13, textAlign:'center', padding:'0 20px' }}>
                    {loading ? 'Cargando...' : 'No hay tareas planificadas esta semana para analizar'}
                  </div>
                )}
              </div>`

const new_orientacion = `<div style={{ width: '100%', marginTop: 24, padding: 12 }}>
                {!loading && orientacionData.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: 24, display:'flex', borderRadius:4, overflow:'hidden', gap:1 }}>
                       {orientacionData.map(d => (
                         <div key={d.name} title={\`\${d.name}: \${d.value} tareas (\${d.percent}%)\`} style={{ width: \`\${d.percent}%\`, background: d.name==='A-R'?'#10b981':d.name==='Fuerza'?'#a855f7':d.name==='Resistencia'?'#f59e0b':d.name==='Velocidad'?'#3b82f6':'var(--mist)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', transition:'width 0.3s' }}>
                           {d.percent >= 3 ? \`\${d.percent}%\` : ''}
                         </div>
                       ))}
                    </div>
                    <div style={{ display:'flex', gap:16, marginTop:16, flexWrap:'wrap', justifyContent:'center' }}>
                       {orientacionData.map(d => (
                         <div key={d.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--silver)', fontWeight:600 }}>
                           <div style={{ width:10, height:10, borderRadius:'50%', background: d.name==='A-R'?'#10b981':d.name==='Fuerza'?'#a855f7':d.name==='Resistencia'?'#f59e0b':d.name==='Velocidad'?'#3b82f6':'var(--mist)' }} />
                           {d.name} ({d.value})
                         </div>
                       ))}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', height: 160, alignItems: 'center', justifyContent: 'center', color: 'var(--fog)', fontSize: 13, textAlign:'center', padding:'0 20px' }}>
                    {loading ? 'Cargando...' : 'No hay tareas planificadas esta semana para analizar'}
                  </div>
                )}
              </div>`
content = content.replace(old_orientacion, new_orientacion)

// Change the height of the container for orientacion to auto instead of 240
content = content.replace("height: 240 }}>\n              <CuadroHeader title=\"DISTRIBUCIÓN DE CARGA\"", "}}>\n              <CuadroHeader title=\"DISTRIBUCIÓN DE CARGA\"")


// 6. Add "DISTRIBUCION DE TAREAS" section
const dist_ui = `      {/* Distribucion de Tareas */}
      {distribucionTareas && distribucionTareas.totalMin > 0 && (
        <AnimateOnScroll delay={400}>
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20, marginTop: 16 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>Distribución de Tareas (Semana Actual)</h2>
          <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>
            {/* Gráfico de Torta: Optimizador vs Coadyuvante */}
            <div style={{ flex:1, minWidth:250, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <p style={{ fontSize:11, color:'var(--fog)', marginBottom:4, textAlign:'center' }}>TOTAL: <strong style={{color:'var(--snow)', fontSize:14}}>{distribucionTareas.totalMin}m</strong></p>
              <div style={{ position:'relative', width:180, height:180 }}>
                <AnimatedPieChart width={180} height={180}>
                  <Pie
                    isAnimationActive={true} data={[
                      { name: 'Optimizador', value: distribucionTareas.totalOptimizadorMin, color: '#c8f135' },
                      { name: 'Coadyuvante', value: distribucionTareas.totalCoadyuvanteMin, color: '#60a5fa' }
                    ].filter(d => d.value > 0)}
                    cx={90} cy={90} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none" animationDuration={2500}
                  >
                    { [ { name: 'Optimizador', value: distribucionTareas.totalOptimizadorMin, color: '#c8f135' }, { name: 'Coadyuvante', value: distribucionTareas.totalCoadyuvanteMin, color: '#60a5fa' } ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Pie>
                </AnimatedPieChart>
                <div style={{ position:'absolute', top:0, left:0, width:180, height:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <span style={{ fontSize:11, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.05em' }}>TOTAL</span>
                  <span style={{ fontSize:20, fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{distribucionTareas.totalMin}m</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:20, fontSize:12, marginTop:12 }}>
                <span style={{ color:'#c8f135', fontWeight:700 }}>Optimizador ({Math.round(distribucionTareas.totalOptimizadorMin/distribucionTareas.totalMin*100)}%)</span>
                <span style={{ color:'#60a5fa', fontWeight:700 }}>Coadyuvante ({Math.round(distribucionTareas.totalCoadyuvanteMin/distribucionTareas.totalMin*100)}%)</span>
              </div>
            </div>

            {/* Desglose Optimizador */}
            {(distribucionTareas.optEspecialSorted.length > 0 || distribucionTareas.optCompSorted.length > 0) && (
              <div style={{ flex:2, minWidth:300 }}>
                <p style={{ fontSize:11, color:'var(--lime)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Entrenamiento Optimizador</p>
                {distribucionTareas.optCompSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>Competición</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {distribucionTareas.optCompSorted.map(([nombre, mins]: any) => {
                        const p = distribucionTareas.totalOptimizadorMin > 0 ? Math.round((mins / distribucionTareas.totalOptimizadorMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#ef4444', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ width:\`\${p}%\`, height:'100%', background:'#ef4444' }} />
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
                {distribucionTareas.optEspecialSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>Especial</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {distribucionTareas.optEspecialSorted.map(([nombre, mins]: any) => {
                        const p = distribucionTareas.totalOptimizadorMin > 0 ? Math.round((mins / distribucionTareas.totalOptimizadorMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(249,115,22,.05)', border:'1px solid rgba(249,115,22,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#f97316', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ width:\`\${p}%\`, height:'100%', background:'#f97316' }} />
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Desglose Coadyuvante */}
            {(distribucionTareas.coadGenSorted.length > 0 || distribucionTareas.coadDirSorted.length > 0) && (
              <div style={{ flex:2, minWidth:300 }}>
                <p style={{ fontSize:11, color:'#60a5fa', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Entrenamiento Coadyuvante</p>
                {distribucionTareas.coadDirSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>Dirigido</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {distribucionTareas.coadDirSorted.map(([nombre, mins]: any) => {
                        const p = distribucionTareas.totalCoadyuvanteMin > 0 ? Math.round((mins / distribucionTareas.totalCoadyuvanteMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(234,179,8,.05)', border:'1px solid rgba(234,179,8,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#eab308', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ width:\`\${p}%\`, height:'100%', background:'#eab308' }} />
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
                {distribucionTareas.coadGenSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>General</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {distribucionTareas.coadGenSorted.map(([nombre, mins]: any) => {
                        const p = distribucionTareas.totalCoadyuvanteMin > 0 ? Math.round((mins / distribucionTareas.totalCoadyuvanteMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(34,197,94,.05)', border:'1px solid rgba(34,197,94,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ width:\`\${p}%\`, height:'100%', background:'#22c55e' }} />
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Ejes Estructurales */}
                {distribucionTareas.ejesSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:16 }}>Ejes Estructurales</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {distribucionTareas.ejesSorted.map(([nombre, mins]: any) => {
                        const p = distribucionTareas.totalCoadyuvanteMin > 0 ? Math.round((mins / distribucionTareas.totalCoadyuvanteMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(168,85,247,.05)', border:'1px solid rgba(168,85,247,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#a855f7', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div style={{ width:\`\${p}%\`, height:'100%', background:'#a855f7' }} />
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{mins} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        </AnimateOnScroll>
      )}

      {/* KPIs Section */}`

content = content.replace("{/* KPIs Section */}", dist_ui)

// Add AnimatedPieChart, Pie, Cell to imports if not present
if (content.includes("import { BarChart, Bar,") && !content.includes("PieChart,")) {
    content = content.replace("import { BarChart, Bar,", "import { BarChart, Bar, PieChart as AnimatedPieChart, Pie, Cell,")
} else {
    if (!content.includes("PieChart as AnimatedPieChart")) {
        content = content.replace(/import \{ ([^\}]*) \} from 'recharts'/, "import { $1, PieChart as AnimatedPieChart, Pie, Cell } from 'recharts'")
    }
}

fs.writeFileSync('src/app/coach/InicioPanel.tsx', content, 'utf8')
console.log("Done patching InicioPanel.tsx")
