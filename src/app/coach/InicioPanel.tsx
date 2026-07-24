import React, { useState, useEffect } from 'react'
import { getCuadrante } from './CoachClient'
import { Icons, PanelHeader, CuadroHeader } from './Headers'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart as AnimatedPieChart, Pie } from 'recharts'

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

function getWeekBounds(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const day = date.getDay()
  const diffToMon = date.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(date)
  monday.setDate(diffToMon)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: localDateStr(monday), end: localDateStr(sunday) }
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

const CustomTooltip = ({ active, payload, label, isReadiness = false, isVolumen = false }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background:'rgba(8,8,8,0.9)', border:'1px solid var(--mist)', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
        <p style={{ margin:0, color:'var(--silver)', marginBottom:4 }}>{label}</p>
        <p style={{ margin:0, color:'var(--snow)', fontWeight:700 }}>
          {payload[0].value} {isReadiness ? 'pts' : isVolumen ? 'min' : 'RPE/Load'}
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
  const [topPerformers, setTopPerformers] = useState<any[]>([])
  const [mdHistoryData, setMdHistoryData] = useState<any[]>([])
  const [orientacionData, setOrientacionData] = useState<any[]>([])
  const [fuerzaMandamientos, setFuerzaMandamientos] = useState<any[]>([])
  const [distribucionTareas, setDistribucionTareas] = useState<any>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const tomorrow = addDays(today, 1)
        const pastWeek = addDays(today, -7)
        const bounds = getWeekBounds(today)
        const weekStart = bounds.start
        const weekEnd = bounds.end
        
        const past14Days = addDays(today, -14)
        
        // Fetch Agenda (Last 14 days to today+1 for volume relativity)
        const mandRes = await fetch('/api/fuerza/mandamientos')
        const mandD = await mandRes.json()
        const mandamientos = mandD.mandamientos || []
        setFuerzaMandamientos(mandamientos)

        const calRes = await fetch(`/api/calendario?desde=${past14Days}&hasta=${weekEnd}`)
        const calData = await calRes.json()
        const allEvents = [...(calData.sesiones || []), ...(calData.partidos || [])]
        const hoy = allEvents.filter((d: any) => d.fecha.startsWith(today))
        const manana = allEvents.filter((d: any) => d.fecha.startsWith(tomorrow))
        setAgenda({ hoy, manana })

        const sessionVolMap: Record<string, number> = {}
        const orientacionCounts: Record<string, number> = { 'A-R': 0, 'Fuerza': 0, 'Resistencia': 0, 'Velocidad': 0, 'S/D': 0 }
        let totalBloquesOrientacion = 0

        allEvents.forEach(ev => {
          if (ev.fecha) {
            let totalMin = 0
            if (ev.ejercicios && Array.isArray(ev.ejercicios)) {
               ev.ejercicios.forEach((ej: any) => {
                 totalMin += (Number(ej.series) || 1) * (Number(ej.minutos) || 0)
                 
                 // Process Orientacion Física for the week
                 if (ev.fecha >= weekStart && ev.fecha <= weekEnd) {
                   let ori = ej.orientacion_fisica
                   if (!ori || ori === '') {
                     const jug = Number(ej.jugadores) || ((Number(ej.atacantes)||0) + (Number(ej.defensores)||0) + (Number(ej.comodines)||0))
                     const l = Number(ej.largo) || 0
                     const a = Number(ej.ancho) || 0
                     if (jug > 0 && l > 0 && a > 0) {
                       const densidad = (l * a) / jug
                       const cuad = getCuadrante(densidad, jug)
                       ori = cuad.objetivo
                     } else {
                       ori = 'S/D'
                     }
                   }
                   if (ori && ori.includes('Activación')) ori = 'A-R'
                   if (orientacionCounts[ori] !== undefined) orientacionCounts[ori]++
                   else orientacionCounts['S/D']++
                   totalBloquesOrientacion++
                 }
               })
            } else if (ev.tipo === 'partido') {
               totalMin = 90
            }
            if (totalMin === 0) totalMin = 60
            sessionVolMap[ev.fecha.slice(0, 10)] = totalMin
          }
        })

        let totalOptimizadorMin = 0
        let totalCoadyuvanteMin = 0
        const optimizadorEspecial: Record<string, number> = {}
        const optimizadorCompetitivo: Record<string, number> = {}
        const coadyuvanteGeneral: Record<string, number> = {}
        const coadyuvanteDirigido: Record<string, number> = {}
        const ejesDetalle: Record<string, number> = {}

        allEvents.forEach((ev: any) => {
          if (ev.fecha >= weekStart && ev.fecha <= weekEnd) {
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
                      const mName = `M${m.numero}. ${m.nombre.split(' (')[0]}`
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
          const mName = `M${m.numero}. ${m.nombre.split(' (')[0]}`
          return [mName, ejesDetalle[mName] || 0] as [string, number]
        }).filter((x:any)=>x[1]>0).sort((a:any,b:any)=>b[1]-a[1])

        const sumOptEspecial = optEspecialSorted.reduce((acc, curr) => acc + curr[1], 0)
        const sumOptComp = optCompSorted.reduce((acc, curr) => acc + curr[1], 0)
        const sumCoadGen = coadGenSorted.reduce((acc, curr) => acc + curr[1], 0)
        const sumCoadDir = coadDirSorted.reduce((acc, curr) => acc + curr[1], 0)

        setDistribucionTareas({
          totalMin: totalOptimizadorMin + totalCoadyuvanteMin,
          totalOptimizadorMin, totalCoadyuvanteMin,
          optEspecialSorted, optCompSorted, coadGenSorted, coadDirSorted, ejesSorted,
          sumOptEspecial, sumOptComp, sumCoadGen, sumCoadDir
        })

        if (totalBloquesOrientacion > 0) {
          const orientacionArr = Object.entries(orientacionCounts)
            .filter(([k, v]) => v > 0)
            .map(([k, v]) => ({ name: k, value: v, percent: Math.round((v / totalBloquesOrientacion) * 100) }))
          setOrientacionData(orientacionArr)
        }

        // Fetch Load Trend (Last 14 days for MD history)
        const loadRes = await fetch(`/api/carga-gps?desde=${past14Days}&hasta=${today}&ciclo=microciclo`)
        const loadD = await loadRes.json()
        if (loadD.sesionesInfo) {
          const dailyLoad = loadD.sesionesInfo.map((s: any) => {
            const avg = loadD.perSessionTeamAvg && loadD.perSessionTeamAvg[s.titulo];
            const dateStr = s.fecha.slice(0, 10)
            const minProgramados = sessionVolMap[dateStr] || 60
            const relVol = avg && avg.avg_minActivo ? Math.round((parseFloat(avg.avg_minActivo) / minProgramados) * 100) : 0
            return {
              fecha: s.fecha,
              titulo: s.titulo || '',
              name: s.fecha.slice(5, 10),
              load: avg && avg.avg_rpe ? parseFloat(avg.avg_rpe) : 0,
              volumen: relVol
            }
          })
          setLoadData(dailyLoad.slice(-7)) // Last 7 for trend
          
          const mdMap = new Map<string, { md:string; actual:number; anterior:number }>()
          const mdLabels = ['MD-4','MD-3','MD-2','MD-1','MD','MD+1','MD+2']
          mdLabels.forEach(md => mdMap.set(md, { md, actual:0, anterior:0 }))
          
          const sorted = [...dailyLoad].sort((a,b)=>a.fecha.localeCompare(b.fecha))
          const pivotDate = addDays(today, -6)
          sorted.forEach(s => {
             const isActual = s.fecha >= pivotDate
             const mdMatch = s.titulo.match(/MD[-+]\d+|MD/)
             if (mdMatch) {
               const md = mdMatch[0]
               if (mdMap.has(md)) {
                  if (isActual) mdMap.get(md)!.actual = s.volumen
                  else mdMap.get(md)!.anterior = s.volumen
               }
             }
          })
          setMdHistoryData(Array.from(mdMap.values()).filter(x => x.actual > 0 || x.anterior > 0))
        }
        if (loadD.players) {
          setTopPerformers(loadD.players.filter((p:any) => p.ua_total > 0).sort((a:any, b:any) => b.ua_total - a.ua_total))
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
  
  // Performance calculation based on UA (Carga) last 7 days
  const performancePlayers = [...teamData].map(p => {
    const totalCarga = (p.recentLogs || []).reduce((sum: number, log: any) => sum + (Number(log.carga_ua) || 0), 0);
    return { ...p, totalCarga };
  }).filter(p => p.totalCarga > 0).sort((a, b) => b.totalCarga - a.totalCarga);

  const top3 = performancePlayers.slice(0, 3);
  const bottom3 = performancePlayers.length >= 6 ? performancePlayers.slice(-3).reverse() : [];

  const hasAlerts = upcomingBirthdays.length > 0 || readaptacionPlayers.length > 0 || top3.length > 0;


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

      {/* Distribucion de Tareas */}
      {distribucionTareas && (
        <AnimateOnScroll delay={400}>
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20, marginTop: 16 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>Distribución de Tareas (Inicio)</h2>
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </AnimatedPieChart>
                <div style={{ position:'absolute', top:0, left:0, width:180, height:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <span style={{ fontSize:11, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.05em' }}>TOTAL</span>
                  <span style={{ fontSize:20, fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{distribucionTareas.totalMin}m</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:20, fontSize:12, marginTop:12 }}>
                <span style={{ color:'#c8f135', fontWeight:700 }}>Optimizador ({distribucionTareas.totalMin > 0 ? Math.round(distribucionTareas.totalOptimizadorMin/distribucionTareas.totalMin*100) : 0}%)</span>
                <span style={{ color:'#60a5fa', fontWeight:700 }}>Coadyuvante ({distribucionTareas.totalMin > 0 ? Math.round(distribucionTareas.totalCoadyuvanteMin/distribucionTareas.totalMin*100) : 0}%)</span>
              </div>
            </div>

            {/* Nuevo Gráfico de Barras: Especial, Competición, General, Dirigido */}
            <div style={{ flex:2, minWidth:300, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ height: 220, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Especial', valor: distribucionTareas.totalOptimizadorMin > 0 ? Math.round((distribucionTareas.sumOptEspecial / distribucionTareas.totalOptimizadorMin) * 100) : 0, fill: '#f97316', grupo: 'E. Optimizador' },
                    { name: 'Competición', valor: distribucionTareas.totalOptimizadorMin > 0 ? Math.round((distribucionTareas.sumOptComp / distribucionTareas.totalOptimizadorMin) * 100) : 0, fill: '#ef4444', grupo: 'E. Optimizador' },
                    { name: 'General', valor: distribucionTareas.totalCoadyuvanteMin > 0 ? Math.round((distribucionTareas.sumCoadGen / distribucionTareas.totalCoadyuvanteMin) * 100) : 0, fill: '#22c55e', grupo: 'E. Coadyuvante' },
                    { name: 'Dirigido', valor: distribucionTareas.totalCoadyuvanteMin > 0 ? Math.round((distribucionTareas.sumCoadDir / distribucionTareas.totalCoadyuvanteMin) * 100) : 0, fill: '#eab308', grupo: 'E. Coadyuvante' }
                  ]} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div style={{ background:'rgba(8,8,8,0.9)', border:'1px solid var(--mist)', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
                            <p style={{ margin:0, color:'var(--silver)', marginBottom:4, fontSize: 10 }}>{payload[0].payload.grupo}</p>
                            <p style={{ margin:0, color:'var(--snow)', fontWeight:700 }}>{payload[0].payload.name}: <span style={{color: payload[0].payload.fill}}>{payload[0].value}%</span></p>
                          </div>
                        )
                      }
                      return null
                    }} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]} barSize={40}>
                      {
                        [
                          { name: 'Especial', valor: distribucionTareas.totalOptimizadorMin > 0 ? Math.round((distribucionTareas.sumOptEspecial / distribucionTareas.totalOptimizadorMin) * 100) : 0, fill: '#f97316', grupo: 'E. Optimizador' },
                          { name: 'Competición', valor: distribucionTareas.totalOptimizadorMin > 0 ? Math.round((distribucionTareas.sumOptComp / distribucionTareas.totalOptimizadorMin) * 100) : 0, fill: '#ef4444', grupo: 'E. Optimizador' },
                          { name: 'General', valor: distribucionTareas.totalCoadyuvanteMin > 0 ? Math.round((distribucionTareas.sumCoadGen / distribucionTareas.totalCoadyuvanteMin) * 100) : 0, fill: '#22c55e', grupo: 'E. Coadyuvante' },
                          { name: 'Dirigido', valor: distribucionTareas.totalCoadyuvanteMin > 0 ? Math.round((distribucionTareas.sumCoadDir / distribucionTareas.totalCoadyuvanteMin) * 100) : 0, fill: '#eab308', grupo: 'E. Coadyuvante' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Nuevos Gráficos: Distribución de Carga Condicional & Distribución de Ejes Estructurales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--mist)' }}>
            
            {/* Distribución de Carga Condicional (JR) */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize:12, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16, textAlign: 'center' }}>Distribución de Carga Condicional (JR)</h3>
              <div style={{ height: 220, width: '100%' }}>
                {orientacionData && orientacionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orientacionData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="name" type="category" stroke="var(--fog)" fontSize={10} tickLine={false} axisLine={false} width={80} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background:'rgba(8,8,8,0.9)', border:'1px solid var(--mist)', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
                              <p style={{ margin:0, color:'var(--snow)', fontWeight:700 }}>{payload[0].payload.name}: <span style={{color: '#3b82f6'}}>{payload[0].payload.percent}%</span></p>
                            </div>
                          )
                        }
                        return null
                      }} />
                      <Bar dataKey="percent" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fog)', fontSize: 13 }}>No hay datos suficientes</div>
                )}
              </div>
            </div>

            {/* Distribución de Ejes Estructurales */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontSize:12, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16, textAlign: 'center' }}>Distribución de Ejes Estructurales</h3>
              <div style={{ height: 220, width: '100%', position: 'relative' }}>
                {distribucionTareas.ejesSorted && distribucionTareas.ejesSorted.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AnimatedPieChart>
                      <Pie
                        isAnimationActive={true} 
                        data={distribucionTareas.ejesSorted.map((e: any) => ({ name: e[0], value: e[1] }))}
                        cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none" animationDuration={2500}
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 20;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          
                          if (percent < 0.05) return null; // No mostrar etiqueta si es muy chico
                          
                          return (
                            <text x={x} y={y} fill="var(--fog)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{fontSize: 9}}>
                              {`${(percent * 100).toFixed(0)}%`}
                            </text>
                          );
                        }}
                      >
                        {
                          distribucionTareas.ejesSorted.map((entry: any, index: number) => {
                            const colors = ['#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6'];
                            return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                          })
                        }
                      </Pie>
                      <Tooltip content={({ active, payload }: any) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ background:'rgba(8,8,8,0.9)', border:'1px solid var(--mist)', padding:'8px 12px', borderRadius:8, fontSize:12 }}>
                              <p style={{ margin:0, color:'var(--snow)', fontWeight:700 }}>{payload[0].name}</p>
                              <p style={{ margin:0, color:'var(--fog)', fontSize: 11, marginTop: 4 }}>
                                {payload[0].value.toFixed(0)} min ({(payload[0].percent! * 100).toFixed(1)}%)
                              </p>
                            </div>
                          )
                        }
                        return null
                      }} />
                    </AnimatedPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fog)', fontSize: 13 }}>No hay datos suficientes</div>
                )}
              </div>
            </div>

          </div>
        </div>
        </AnimateOnScroll>
      )}

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
            <CuadroHeader title="AGENDA" subtitle="Próximas actividades" icon={Icons.planificacion} description="Resumen de entrenamientos, partidos y eventos programados para hoy y mañana." />
            
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
              <CuadroHeader title="ALERTAS DEL PLANTEL" subtitle="Novedades y avisos" icon={Icons.campana} description="Jugadores con rendimiento destacado o en riesgo de lesión por sobrecarga." />
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {topPerformers.length >= 3 && (
                  <>
                    <details style={{ background: 'var(--ink3)', border: '1px solid var(--mist)', borderRadius: 8, overflow: 'hidden' }}>
                      <summary style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#10b981', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>🚀 TOP 3 HIGH PERFORMANCE</span>
                        <span style={{ fontSize: 10, color: 'var(--silver)' }}>Ver listado ▼</span>
                      </summary>
                      <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {topPerformers.slice(0, 3).map((p, i) => (
                          <div key={i} style={{ background: 'var(--ink2)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 18 }}>🔥</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                              <div style={{ fontSize: 11, color: 'var(--silver)' }}>Carga Semanal (UA): <span style={{color: '#10b981', fontWeight: 600}}>{p.ua_total}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                    
                    <details style={{ background: 'var(--ink3)', border: '1px solid var(--mist)', borderRadius: 8, overflow: 'hidden' }}>
                      <summary style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#ef4444', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>📉 TOP 3 LOW PERFORMANCE</span>
                        <span style={{ fontSize: 10, color: 'var(--silver)' }}>Ver listado ▼</span>
                      </summary>
                      <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[...topPerformers].slice(-3).reverse().map((p, i) => (
                          <div key={i} style={{ background: 'var(--ink2)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 18 }}>❄️</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                              <div style={{ fontSize: 11, color: 'var(--silver)' }}>Carga Semanal (UA): <span style={{color: '#ef4444', fontWeight: 600}}>{p.ua_total}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </>
                )}

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

                {top3.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🚀 TOP 3 HIGH PERFORMANCE</h4>
                    {top3.map((p, i) => (
                      <div key={i} style={{ background: 'var(--ink3)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 20 }}>🔥</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2 }}>Carga UA Semanal: {Math.round(p.totalCarga)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {bottom3.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>📉 TOP 3 LOW PERFORMANCE</h4>
                    {bottom3.map((p, i) => (
                      <div key={i} style={{ background: 'var(--ink3)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 20 }}>⚠️</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2 }}>Carga UA Semanal: {Math.round(p.totalCarga)}</div>
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
              <CuadroHeader title="TENDENCIA READINESS" subtitle="Últimos 7 días (Promedio Plantel)" icon={Icons.neuromuscular} description="Evolución del estado de recuperación, estrés, sueño y fatiga del equipo." />
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
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 24 }}>
          <AnimateOnScroll delay={650}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20 }}>
              <CuadroHeader title="DISTRIBUCIÓN DE CARGA" subtitle="Orientación Física (Semana Actual)" icon={Icons.metricas || '📊'} description="Porcentaje de tareas asignadas a cada capacidad física durante esta semana." />
              <div style={{ width: '100%', marginTop: 24, padding: 12 }}>
                {!loading && orientacionData.length > 0 ? (
                  <>
                    <div style={{ width: '100%', height: 24, display:'flex', borderRadius:4, overflow:'hidden', gap:1 }}>
                       {orientacionData.map(d => (
                         <div key={d.name} title={`${d.name}: ${d.value} tareas (${d.percent}%)`} style={{ width: `${d.percent}%`, background: d.name==='A-R'?'#10b981':d.name==='Fuerza'?'#a855f7':d.name==='Resistencia'?'#f59e0b':d.name==='Velocidad'?'#3b82f6':'var(--mist)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', transition:'width 0.3s' }}>
                           {d.percent >= 3 ? `${d.percent}%` : ''}
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
              </div>
            </div>
          </AnimateOnScroll>
          <AnimateOnScroll delay={700}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: 240 }}>
              <CuadroHeader title="TENDENCIA CARGA (RPE)" subtitle="Últimos 7 días (Promedio Sesiones)" icon={Icons.metricas} description="Evolución del esfuerzo percibido (RPE) por el plantel en los últimos entrenamientos." />
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

          <AnimateOnScroll delay={800}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: 240 }}>
              <CuadroHeader title="TENDENCIA VOLUMEN RELATIVO" subtitle="Últimos 7 días (Promedio Sesiones)" icon={Icons.reloj} description="Variación de la carga de entrenamiento (RPE × Duración) en la última semana." />
              <div style={{ width: '100%', height: 160, marginTop: 16 }}>
                {!loading && loadData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={loadData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--mist)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip isVolumen={true} />} />
                      <Area 
                        isAnimationActive={true} 
                        animationDuration={15000} 
                        type="monotone" 
                        dataKey="volumen" 
                        stroke="#60a5fa" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorVol)" 
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

          <AnimateOnScroll delay={900}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: 240 }}>
              <CuadroHeader title="HISTORIAL MD vs MD" subtitle="Volumen Relativo vs Microciclo Anterior" icon={Icons.vs} color="#eab308" description="Comparativa de la carga acumulada entre el microciclo actual y el anterior." />
              <div style={{ width: '100%', height: 160, marginTop: 16 }}>
                {!loading && mdHistoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mdHistoryData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--mist)" vertical={false} />
                      <XAxis dataKey="md" stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--silver)" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{background:'rgba(8,8,8,0.9)', border:'1px solid var(--mist)', borderRadius:8}} />
                      <Legend wrapperStyle={{fontSize: 10, paddingTop: 10}} />
                      <Bar dataKey="actual" name="Semana Actual" fill="#eab308" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="anterior" name="Semana Anterior" fill="rgba(234,179,8,0.3)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--fog)', fontSize: 13 }}>
                    {loading ? 'Cargando...' : 'No hay datos de historial de MDs'}
                  </div>
                )}
              </div>
            </div>
          </AnimateOnScroll>
        </div>
    </div>
  )
}
