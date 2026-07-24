'use client'
import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/ui/Topbar'
import StatusBadge from '@/components/ui/StatusBadge'
import ACWRChart from '@/components/charts/ACWRChart'
import SleepChart from '@/components/charts/SleepChart'
import WellnessTrend from '@/components/charts/WellnessTrend'
import ReadinessChart from '@/components/charts/ReadinessChart'
import { buildACWRHistory, buildDailyDetail } from '@/lib/acwr'
import EvaluacionesPanelFull from './EvaluacionesPanel'
import AnalyticsPanel from './AnalyticsPanel'
import PerfilNeuromuscularPanel from './PerfilNeuromuscularPanel'
import EnfermeriaPanel from './EnfermeriaPanel'
import TacticalBoard, { TacticalPreview } from './TacticalBoard'
import CanchasPanel from './CanchasPanel'
import VinculacionesPanel from './VinculacionesPanel'
import PushNotificationManager, { PushToggle } from '@/components/ui/PushNotificationManager'
import { PanelHeader, CuadroHeader, Icons } from './Headers'
import { PieChart, Pie, Cell } from 'recharts'
import { AnimateOnScroll } from '@/components/AnimateOnScroll'
import InicioPanel from './InicioPanel'
import FuerzaPanel from './FuerzaPanel'
import TacticaPanel from './TacticaPanel'
import WellnessForm from '@/components/forms/WellnessForm'
import RPEForm from '@/components/forms/RPEForm'
// ─── GPS METRIC METADATA (shared between GpsPanel and CargaExternaPanel) ──────
// Maps metric key → { label, unit, group } for display purposes
const GPS_METRIC_META: Record<string, { label: string; unit: string; group: string }> = {
  dist_total:          { label: 'Dist. Total',     unit: 'm',      group: 'Distancia' },
  dist_per_min:        { label: 'Dist/min',         unit: 'm/min',  group: 'Distancia' },
  dist_hir:            { label: 'High Speed Dist',  unit: 'm',      group: 'Distancia' },
  dist_v1:             { label: 'Vel B1',           unit: 'm',      group: 'Distancia' },
  dist_v2:             { label: 'Vel B2',           unit: 'm',      group: 'Distancia' },
  dist_v3:             { label: 'Vel B3',           unit: 'm',      group: 'Distancia' },
  dist_v4:             { label: 'Vel B4',           unit: 'm',      group: 'Distancia' },
  dist_v5:             { label: 'Vel B5/B6',        unit: 'm',      group: 'Distancia' },
  player_load:         { label: 'Player Load',      unit: '',        group: 'Carga' },
  metabolic_power:     { label: 'Pot. Metabólica',  unit: 'W/kg',   group: 'Carga' },
  avg_metabolic_power: { label: 'Pot. Metab. Med.', unit: 'W/kg',   group: 'Carga' },
  equiv_distance:      { label: 'Dist. Equiv.',     unit: 'm',      group: 'Carga' },
  max_velocity:        { label: 'Vel. Máx.',        unit: 'km/h',   group: 'Velocidad' },
  n_sprints:           { label: 'Nº Sprints',        unit: 'nº',     group: 'Sprints' },
  acc1:                { label: 'Acc B1',            unit: 'nº',     group: 'Acc/Dec' },
  acc2:                { label: 'Acc B3',            unit: 'nº',     group: 'Acc/Dec' },
  acc3:                { label: 'Acc B2-3',          unit: 'nº',     group: 'Acc/Dec' },
  acc4:                { label: 'Acc B4',            unit: 'nº',     group: 'Acc/Dec' },
  acc_total:           { label: 'Acc Total',         unit: 'nº',     group: 'Acc/Dec' },
  dec1:                { label: 'Dec B1',            unit: 'nº',     group: 'Acc/Dec' },
  dec2:                { label: 'Dec B3',            unit: 'nº',     group: 'Acc/Dec' },
  dec3:                { label: 'Dec B2-3',          unit: 'nº',     group: 'Acc/Dec' },
  dec4:                { label: 'Dec B4',            unit: 'nº',     group: 'Acc/Dec' },
  dec_total:           { label: 'Dec Total',         unit: 'nº',     group: 'Acc/Dec' },
  hr_avg:              { label: 'FC Media',          unit: 'bpm',    group: 'FC' },
  hr_max:              { label: 'FC Máx.',           unit: 'bpm',    group: 'FC' },
  hr_z1:               { label: 'FC Zona 1',         unit: '%',      group: 'FC' },
  hr_z2:               { label: 'FC Zona 2',         unit: '%',      group: 'FC' },
  hr_z3:               { label: 'FC Zona 3',         unit: '%',      group: 'FC' },
  hr_z4:               { label: 'FC Zona 4',         unit: '%',      group: 'FC' },
  hr_z5:               { label: 'FC Zona 5',         unit: '%',      group: 'FC' },
  duracion_min:        { label: 'Duración',          unit: 'min',    group: 'Tiempo' },
  // Métricas derivadas y neuromusculares
  hsr_per_min:         { label: 'HSR/min',            unit: 'm/min',  group: 'Derivadas' },
  sprint_dist_per_min: { label: 'Sprint/min',         unit: 'm/min',  group: 'Derivadas' },
  acc_int_per_min:     { label: 'Acc Int/min',        unit: 'n/min',  group: 'Derivadas' },
  acc_per_min:         { label: 'Acc/min',            unit: 'n/min',  group: 'Derivadas' },
  dec_per_min:         { label: 'Dec/min',            unit: 'n/min',  group: 'Derivadas' },
  max_acc:             { label: 'Máx. Acc',           unit: 'm/s²',  group: 'Máximos' },
  max_dec:             { label: 'Máx. Dec',           unit: 'm/s²',  group: 'Máximos' },
}

// Order in which columns appear (known fields first, logical order)
const GPS_METRIC_ORDER = Object.keys(GPS_METRIC_META)

// Returns a display-ready string for a GPS metric value
function fmtGps(key: string, val: any): string {
  if (val === null || val === undefined || val === 0 || val === '') return '—'
  const n = Number(val)
  if (isNaN(n) || n === 0) return '—'
  if (key === 'dist_total' || key === 'equiv_distance') return `${Math.round(n)}m`
  if (key.startsWith('dist_')) return `${Math.round(n)}m`
  if (key === 'max_velocity') return `${n}km/h`
  if (key === 'dist_per_min') return `${Math.round(n)}`
  if (key === 'duracion_min') return `${Math.round(n)} min`
  if (key === 'player_load') return `${Math.round(n)}`
  if (key === 'metabolic_power' || key === 'avg_metabolic_power') return `${n.toFixed(1)}`
  // Métricas derivadas (por minuto) — mostrar con 1-2 decimales
  if (key === 'hsr_per_min' || key === 'sprint_dist_per_min') return `${n.toFixed(1)}`
  if (key === 'acc_int_per_min' || key === 'acc_per_min' || key === 'dec_per_min') return `${n.toFixed(2)}`
  if (key === 'max_acc' || key === 'max_dec') return `${n.toFixed(1)}`
  return `${Math.round(n)}`
}


// Compress image to max 400px and 0.7 quality before saving to DB
function compressImage(dataUrl: string, maxSize = 400, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

const TABS = [{id:'inicio',label:'🏠 Inicio'},{id:'team',label:'Equipo'},{id:'calendario',label:'📅 Calendario'},{id:'fuerza',label:'💪 Rutina Fuerza'},{id:'analytics',label:'Analytics'},{id:'neuromuscular',label:'Neuromuscular'},{id:'minutos',label:'Minutaje'},{id:'control-carga-calc',label:'📊 Ctrl. Carga Calc'},{id:'control-carga-gps',label:'📡 Ctrl. Carga GPS'},{id:'acumulado',label:'📈 Acumulado Ind.'},{id:'cambio-carga',label:'Cambio de Carga'},{id:'expo-ai',label:'🤖 Expo. AI'},{id:'evaluaciones',label:'📋 Evaluaciones'},{id:'comparativa',label:'⚖️ Comparativa'},{id:'tactica',label:'♟️ Táctica'},{id:'lesiones',label:'🏥 Enfermería'},{id:'gps',label:'📡 GPS'},{id:'vinculaciones',label:'🔗 ACWR'},{id:'canchas',label:'🏟️ Estadios'},{id:'players',label:'Jugadores'},{id:'biblioteca',label:'📚 Biblioteca'},{id:'manual',label:'📖 Manual'},{id:'notificaciones',label:'🔔 Notificaciones'}]

const SIDEBAR_GROUPS = [
  { label:'General', icon:'🏠', items:[
    {id:'inicio',label:'Inicio',icon:'🏠'},
    {id:'team',label:'Equipo',icon:'👥'},
    {id:'calendario',label:'Calendario',icon:'📅'},
    {id:'fuerza',label:'Rutina Fuerza',icon:'💪'},
    {id:'biblioteca',label:'Diseñador Tareas',icon:'🎨'},
    {id:'players',label:'Jugadores',icon:'👤'},
  ]},
  { label:'Control de Carga', icon:'📊', items:[
    {id:'control-carga-calc',label:'Ctrl. Carga Calc',icon:'🏋️'},
    {id:'control-carga-gps',label:'Ctrl. Carga GPS',icon:'📡'},
    {id:'cambio-carga',label:'Cambio de Carga',icon:'🔄'},
    {id:'acumulado',label:'Acumulado Ind.',icon:'📈'},
  ]},
  { label:'Análisis', icon:'🔍', items:[
    {id:'analytics',label:'Analytics',icon:'📊'},
    {id:'expo-ai',label:'Expo. AI',icon:'⚡'},
    {id:'neuromuscular',label:'Neuromuscular',icon:'🧠'},
    {id:'minutos',label:'Minutaje',icon:'⏱️'},
    {id:'comparativa',label:'Comparativa',icon:'⚖️'},
    {id:'tactica',label:'Métricas Tácticas',icon:'♟️'},
    {id:'gps',label:'GPS',icon:'🛰️'},
    {id:'vinculaciones',label:'ACWR',icon:'🔗'},
  ]},
  { label:'Evaluaciones', icon:'📋', items:[
    {id:'evaluaciones',label:'Tests & Eval.',icon:'📋'},
  ]},
  { label:'Médico', icon:'🏥', items:[
    {id:'lesiones',label:'Enfermería',icon:'🏥'},
  ]},
  { label:'Instalaciones', icon:'🏟️', items:[
    {id:'canchas',label:'Estadios',icon:'🏟️'},
  ]},
  { label:'Recursos', icon:'📚', items:[
    {id:'manual',label:'Manual',icon:'📖'},
  ]},
  { label:'Configuración', icon:'⚙️', items:[
    {id:'notificaciones',label:'Notificaciones',icon:'🔔'},
  ]},
]
const SC = {optimo:'#22c55e',precaucion:'#f59e0b',peligro:'#ef4444',sin_datos:'#555'}
const SL = {optimo:'ÓPTIMO',precaucion:'PRECAUCIÓN',peligro:'RIESGO',sin_datos:'—'}
const WK = ['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo']
const WL = ['Fatiga','Sueño','Dolor','Estrés','Ánimo']
const wCol = (v) => v===1?'#c8f135':v===2?'#22c55e':v===3?'#eab308':v===4?'#f97316':'#ef4444'
const PG = {1:'PORTEROS',2:'DEFENSAS',3:'MEDIOCAMPISTAS',4:'VOLANTES',5:'EXTREMOS',6:'DELANTEROS',99:'SIN POSICIÓN'}
const LTIPOS = ['Muscular','Articular','Ósea','Ligamentosa','Tendinosa','Contusión','Sobrecarga','Otra']
const LEST = ['Tratamiento','Readaptación','Campo','Alta']
const LCOL = {'Tratamiento':'#ef4444','Readaptación':'#f59e0b','Campo':'#22c55e','Alta':'#888'}
const POSICIONES = ['Portero','Defensa Central','Lateral Derecho','Lateral Izquierdo','Mediocentro Defensivo','Mediocentro','Mediocentro Ofensivo','Volante Derecho','Volante Izquierdo','Volante','Extremo Derecho','Extremo Izquierdo','Centro Delantero','Delantero']

const FLAG_CODES: Record<string,string> = {
  'Argentina':'ar','Bolivia':'bo','Brasil':'br','Chile':'cl','Colombia':'co',
  'Costa Rica':'cr','Cuba':'cu','Ecuador':'ec','El Salvador':'sv','Guatemala':'gt',
  'Honduras':'hn','México':'mx','Nicaragua':'ni','Panamá':'pa','Paraguay':'py',
  'Perú':'pe','República Dominicana':'do','Uruguay':'uy','Venezuela':'ve',
  'España':'es','Estados Unidos':'us','Francia':'fr','Italia':'it',
  'Alemania':'de','Inglaterra':'gb-eng','Portugal':'pt','Senegal':'sn','Japón':'jp',
  'Corea del Sur':'kr','Marruecos':'ma','Holanda':'nl','Bélgica':'be'
}
const NACIONALIDADES = Object.keys(FLAG_CODES).sort()
const getFlagUrl = (country: string) => { const c = FLAG_CODES[country]; return c ? `https://flagcdn.com/w40/${c}.png` : null }
const getFlag = (country: string) => FLAG_CODES[country]?.toUpperCase() || '🏳'
function FlagImg({ country, size=16 }: { country: string, size?: number }) {
  const url = getFlagUrl(country)
  if (!url) return <span>🏳</span>
  return <img src={url} alt={country} title={country} style={{ width: size, height: Math.round(size*0.75), objectFit:'cover', borderRadius: 2, verticalAlign:'middle', display:'inline-block' }} />
}
function NacionalidadSelect({ value, onChange, style }: { value: string, onChange: (v:string)=>void, style?: any }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])
  return (
    <div ref={ref} style={{ position:'relative', ...style }}>
      <button type="button" onClick={()=>setOpen(!open)} className="wp-input" style={{ width:'100%', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:8, appearance:'none' as any }}>
        {value ? <><FlagImg country={value} size={18} /> <span>{value}</span></> : <span style={{ color:'var(--fog)' }}>— Seleccionar —</span>}
        <span style={{ marginLeft:'auto', fontSize:10, color:'var(--fog)' }}>▼</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:999, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, maxHeight:240, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,.5)' }}>
          <button type="button" onClick={()=>{onChange('');setOpen(false)}} style={{ width:'100%', padding:'8px 12px', background:'transparent', border:'none', borderBottom:'1px solid var(--mist)', color:'var(--fog)', fontSize:12, cursor:'pointer', textAlign:'left', fontFamily:'inherit' }}>— Sin nacionalidad —</button>
          {NACIONALIDADES.map(n=>(
            <button type="button" key={n} onClick={()=>{onChange(n);setOpen(false)}} style={{ width:'100%', padding:'7px 12px', background: value===n ? 'rgba(200,241,53,.1)' : 'transparent', border:'none', borderBottom:'1px solid var(--mist)', color:'var(--snow)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8, textAlign:'left', fontFamily:'inherit' }}
              onMouseEnter={e=>(e.currentTarget.style.background='var(--ink3)')} onMouseLeave={e=>(e.currentTarget.style.background= value===n ? 'rgba(200,241,53,.1)' : 'transparent')}>
              <FlagImg country={n} size={20} /> {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── DATE UTILITIES ──────────────────────────────────────────────────────────
// 'YYYY-MM-DD' strings passed to new Date() are treated as UTC midnight,
// which shifts the date by 1 day in timezones behind UTC (e.g. Argentina UTC-3).
// All date arithmetic uses these helpers to stay in local time.

/** Parse 'YYYY-MM-DD' as a LOCAL date (not UTC). */
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format a Date to 'YYYY-MM-DD' using local time (not UTC). */
function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

/** Shift a 'YYYY-MM-DD' string by n days, returning 'YYYY-MM-DD'. */
function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}

/** Today as 'YYYY-MM-DD' in local time. */
function todayLocal(): string { return localDateStr(new Date()) }
function getObjetivoIcon(obj: string) {
  if (!obj) return null
  const s = obj.toLowerCase()
  let icon = ''
  if (s.includes('fuerza') || s.includes('tensi')) icon = '🏋️‍♂️'
  else if (s.includes('velocidad') || s.includes('tappering')) icon = '⚡'
  else if (s.includes('resistencia') || s.includes('duraci') || s.includes('aerob') || s.includes('potencia')) icon = '🏃‍♂️'
  else if (s.includes('equilibrio') || s.includes('regeneraci') || s.includes('recuperaci')) icon = '🧘‍♂️'
  
  if (!icon) return null
  return <span style={{ fontSize:14, margin:'2px 0', filter:'grayscale(1) brightness(3)', opacity:0.9, display:'block' }}>{icon}</span>
}

// ─────────────────────────────────────────────────────────────────────────────

const AnimatedPieChart = (props: any) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    
    const timeout = setTimeout(() => {
      const obs = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { setIsVisible(true); obs.disconnect(); }
      }, { threshold: 0.1 });
      obs.observe(el);
      
      // @ts-ignore
      el._obs = obs;
    }, 500);

    return () => {
      clearTimeout(timeout);
      // @ts-ignore
      if (el._obs) el._obs.disconnect();
    };
  }, []);
  return (
    <div ref={ref} style={{ width: props.width, height: props.height }}>
      {isVisible && <PieChart {...props}>{props.children}</PieChart>}
    </div>
  )
}

export default function CoachClient({ session, teamData, today }) {
  const [tab, setTab] = useState('inicio')
  const [selected, setSelected] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState({'General':true, 'Control de Carga':true, 'Análisis':true, 'Evaluaciones':true, 'Médico':true, 'Instalaciones':true, 'Recursos':true, 'Configuración':true})
  const [playerLogs, setPlayerLogs] = useState([])
  const [playerWellness, setPlayerWellness] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [clubLogo, setClubLogo] = useState<string|null>(null)
  const [logoSaving, setLogoSaving] = useState<'idle'|'saving'|'ok'|'error'>('idle')
  const [teamName, setTeamName] = useState<string>('PLANTEL')
  const [editingTeamName, setEditingTeamName] = useState(false)
  const [teamNameDraft, setTeamNameDraft] = useState<string>('PLANTEL')
  const [playerSearch, setPlayerSearch] = useState('')
  const [proxyMode, setProxyMode] = useState(false)
  const [showGlobalDeleteModal, setShowGlobalDeleteModal] = useState(false)
  const [ciclo, setCiclo] = useState<'microciclo'|'mesociclo'|'macrociclo'>('microciclo')
  const router = useRouter()

  // Auto-refresh server data when a wellness survey is submitted
  useEffect(() => {
    const handler = () => router.refresh()
    window.addEventListener('wellness-data-updated', handler)
    return () => window.removeEventListener('wellness-data-updated', handler)
  }, [])

  // Load club logo and team name from DB on mount
  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
        console.log('[Settings loaded]', { userId: d.debug_userId, has_foto: !!d.club_foto, club_nombre: d.club_nombre })
        if (d.club_foto) setClubLogo(d.club_foto)
        if (d.club_nombre && d.club_nombre !== 'Mi Club') {
          setTeamName(d.club_nombre)
          setTeamNameDraft(d.club_nombre)
        }
      })
      .catch((e) => console.error('[Settings load error]', e))
  }, [])

  async function saveTeamName() {
    setTeamName(teamNameDraft)
    setEditingTeamName(false)
    await fetch('/api/admin/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ club_nombre: teamNameDraft }) })
  }

  const CICLO_DAYS = { microciclo:7, mesociclo:28, macrociclo:365 }
  const CICLO_WELLNESS_DAYS = { microciclo:28, mesociclo:56, macrociclo:120 }

  async function openPlayer(p, c) {
    const cycle = c || ciclo
    setLoadingDetail(true); setSelected(p)
    const days = CICLO_DAYS[cycle]
    const wdays = CICLO_WELLNESS_DAYS[cycle]
    const [logs, well] = await Promise.all([
      fetch(`/api/logs?jugadorId=${p.jugador_id}&days=${days}`).then(r=>r.json()),
      fetch(`/api/wellness?jugadorId=${p.jugador_id}&days=${wdays}`).then(r=>r.json()),
    ])
    setPlayerLogs(logs); setPlayerWellness(well); setLoadingDetail(false)
  }

  const filteredTeamData = playerSearch.trim() ? teamData.filter((p: any) => p.nombre.toLowerCase().includes(playerSearch.toLowerCase())) : teamData
  const available = filteredTeamData.filter(p=>!p.lesion && p.entrena_grupo!==false)
  const unavailable = filteredTeamData.filter(p=>p.entrena_grupo===false && !p.lesion)
  const injured = filteredTeamData.filter(p=>p.lesion)
  const responded = filteredTeamData.filter(p=>p.respondedToday)
  const pending = filteredTeamData.filter(p=>!p.respondedToday)
  const atRisk = filteredTeamData.filter(p=>p.acwr?.status==='peligro').length
  const caution = filteredTeamData.filter(p=>p.acwr?.status==='precaucion').length
  const optimal = filteredTeamData.filter(p=>p.acwr?.status==='optimo').length

  const byPos = {}
  for (const p of available) {
    const k = p.posicion_orden??99
    if (!byPos[k]) byPos[k] = []
    byPos[k].push(p)
  }

  const secHead = (label, count, color='var(--silver)') => (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
      <span style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>
      <div style={{ flex:1, height:1, background:color==='var(--silver)'?'var(--mist)':`${color}33` }} />
      {count!==undefined && <span style={{ fontSize:10, color, fontFamily:'DM Mono,monospace' }}>{count}</span>}
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--ink)' }}>
      <Topbar nombre={session.nombre} rol={session.rol} clubNombre={session.clubNombre||null} onMenuClick={() => setSidebarOpen(true)} />
      <div style={{ display:'flex', minHeight:'calc(100vh - 52px)' }}>
        <div className={`mobile-sidebar-backdrop ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />
        {/* ── Sidebar ── */}
        <nav className={`no-print mobile-sidebar-overlay ${sidebarOpen ? 'open' : ''}`} style={{
          width: sidebarOpen ? 220 : 56, transition:'width .2s ease',
          background:'rgba(8,8,8,.95)', borderRight:'1px solid var(--mist)',
          position:'sticky', top:52, height:'calc(100vh - 52px)', overflowY:'auto', overflowX:'hidden',
          flexShrink:0, zIndex:40, display:'flex', flexDirection:'column',
        }}>
          {/* Toggle */}
          <button className="hover-scale" onClick={()=>setSidebarOpen(o=>!o)} style={{
            padding:'12px 16px', background:'transparent', border:'none', borderBottom:'1px solid var(--mist)',
            cursor:'pointer', display:'flex', alignItems:'center', gap:10, color:'var(--fog)', fontSize:14, width:'100%',
          }}>
            <span style={{ fontSize:16, transition:'transform .2s', transform:sidebarOpen?'rotate(0)':'rotate(180deg)' }}>◀</span>
            {sidebarOpen && <span style={{ fontSize:11, fontWeight:600, color:'var(--silver)', whiteSpace:'nowrap' }}>Menú</span>}
          </button>
          {/* Groups */}
          <div style={{ flex:1, padding:'8px 0' }}>
            {SIDEBAR_GROUPS.map(g => {
              const groupActive = g.items.some(i => i.id === tab)
              return (
                <div key={g.label} style={{ marginBottom:4 }}>
                  {sidebarOpen && (
                    <button className="hover-scale" 
                      onClick={() => setOpenGroups(prev => ({...prev, [g.label]: prev[g.label] === false ? true : false}))}
                      style={{ 
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                        color: groupActive ? 'var(--lime)' : 'var(--fog)', transition: 'color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = groupActive ? 'var(--lime)' : 'var(--silver)'}
                      onMouseLeave={e => e.currentTarget.style.color = groupActive ? 'var(--lime)' : 'var(--fog)'}
                    >
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {g.label}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                           style={{ transform: openGroups[g.label] !== false ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  )}
                  <div style={{ 
                    overflow: 'hidden', 
                    maxHeight: (!sidebarOpen || openGroups[g.label] !== false) ? 1000 : 0, 
                    transition: 'max-height 0.3s ease-in-out' 
                  }}>
                    {g.items.map(item => {
                      const active = tab === item.id
                      return (
                        <button className="hover-scale" key={item.id} onClick={()=>{
                          setTab(item.id)
                          setSelected(null)
                          if (window.innerWidth <= 768) setSidebarOpen(false)
                        }}
                          title={sidebarOpen ? undefined : item.label}
                          style={{
                            display:'flex', alignItems:'center', gap:10, width:'100%',
                            padding: sidebarOpen ? '8px 16px' : '10px 0',
                            justifyContent: sidebarOpen ? 'flex-start' : 'center',
                            background: active ? 'rgba(163,230,53,.1)' : 'transparent',
                            borderLeft: active ? '3px solid var(--lime)' : '3px solid transparent',
                            border:'none', borderRight:'none', borderTop:'none', borderBottom:'none',
                            borderLeftWidth:3, borderLeftStyle:'solid', borderLeftColor: active ? 'var(--lime)' : 'transparent',
                            cursor:'pointer', transition:'all .12s', fontSize:13,
                            color: active ? 'var(--lime)' : 'var(--silver)',
                          }}
                          onMouseEnter={e=>{if(!active)(e.currentTarget.style.background='rgba(255,255,255,.04)')}}
                          onMouseLeave={e=>{if(!active)(e.currentTarget.style.background='transparent')}}
                        >
                          <span style={{ fontSize:15, flexShrink:0 }}>{item.icon}</span>
                          {sidebarOpen && <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontWeight: active?600:400 }}>{item.label}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </nav>
        {/* ── Main content ── */}
        <main style={{ flex:1, maxWidth:1200, margin:'0 auto', padding:'24px 16px', minWidth:0 }}>
          <AnimateOnScroll key={tab} delay={100}>

        {tab==='inicio' && <InicioPanel teamData={teamData} session={session} today={today} />}
        
        {tab==='fuerza' && <FuerzaPanel teamData={teamData} session={session} />}

        {tab==='team' && !selected && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="anim-up" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, gridColumn:'span 2' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Plantel</p>
                <div className="display" style={{ fontSize:52, color:'var(--snow)', lineHeight:1 }}>{teamData.length}</div>
                <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                  <span style={{ fontSize:11, background:'rgba(34,197,94,.12)', color:'#4ade80', border:'1px solid rgba(34,197,94,.25)', borderRadius:6, padding:'3px 8px' }}>✓ {available.length} disponibles</span>
                  {unavailable.length>0 && <span style={{ fontSize:11, background:'rgba(245,158,11,.12)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.25)', borderRadius:6, padding:'3px 8px' }}>⚠ {unavailable.length} diferenciados</span>}
                  {injured.length>0 && <span style={{ fontSize:11, background:'rgba(239,68,68,.12)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, padding:'3px 8px' }}>🏥 {injured.length} lesionados</span>}
                </div>
                <p style={{ fontSize:11, color:'var(--silver)', marginTop:6 }}>{available.filter(p=>p.posicion_orden!==1).length} de campo + {available.filter(p=>p.posicion_orden===1).length} portero/s</p>
              </div>
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, gridColumn:'span 2' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Wellness Hoy</p>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span className="display" style={{ fontSize:52, color:'var(--lime)', lineHeight:1 }}>{responded.length}</span>
                  <span className="display" style={{ fontSize:28, color:'var(--fog)', lineHeight:1 }}>/ {teamData.length}</span>
                </div>
                <div style={{ marginTop:10, height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${teamData.length?(responded.length/teamData.length)*100:0}%`, background:'var(--lime)', borderRadius:3 }} />
                </div>
                {pending.length>0 && <p style={{ fontSize:11, color:'#f87171', marginTop:6 }}>⚠ Pendientes: {pending.map(p=>p.nombre.split(' ')[0]).join(', ')}</p>}
              </div>
              {[{label:'EN RIESGO',val:atRisk,col:'#ef4444',bg:'rgba(239,68,68,.06)',border:'rgba(239,68,68,.2)'},{label:'PRECAUCIÓN',val:caution,col:'#f59e0b',bg:'rgba(245,158,11,.06)',border:'rgba(245,158,11,.2)'},{label:'ÓPTIMOS',val:optimal,col:'#22c55e',bg:'rgba(34,197,94,.06)',border:'rgba(34,197,94,.2)'}].map(s=>(
                <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:14, padding:16, textAlign:'center' }}>
                  <div className="display" style={{ fontSize:48, color:s.col, lineHeight:1 }}>{s.val}</div>
                  <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:s.col, letterSpacing:'0.08em', marginTop:6 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <label style={{ cursor:'pointer', flexShrink:0 }}>
                  <div style={{ position:'relative' }}>
                    <div style={{ width:80, height:80, borderRadius:14, overflow:'hidden', background:'var(--ink3)', border:`2px solid ${logoSaving==='error'?'#ef4444':logoSaving==='ok'?'var(--lime)':clubLogo?'var(--lime)':'var(--fog)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'border-color .15s' }}>
                      {logoSaving==='saving' 
                        ? <span style={{ fontSize:18, animation:'spin 1s linear infinite' }}>⏳</span>
                        : clubLogo ? <img src={clubLogo} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} alt="escudo"/> : <span style={{ fontSize:32 }}>🛡️</span>}
                    </div>
                    {logoSaving==='ok' && <span style={{ position:'absolute', top:-4, right:-4, fontSize:12, background:'var(--lime)', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--ink)', fontWeight:700 }}>✓</span>}
                    {logoSaving==='error' && <span style={{ position:'absolute', top:-4, right:-4, fontSize:10, background:'#ef4444', borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700 }}>✕</span>}
                  </div>
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ 
                    const f=e.target.files?.[0]; if(!f) return
                    const r=new FileReader()
                    r.onload=async()=>{
                      setLogoSaving('saving')
                      try {
                        // Compress aggressively: max 150px, quality 0.65 → ~8-15KB base64
                        const compressed = await compressImage(r.result as string, 150, 0.65)
                        setClubLogo(compressed)
                        const res = await fetch('/api/admin/settings', {
                          method:'POST',
                          headers:{'Content-Type':'application/json'},
                          body:JSON.stringify({ club_foto: compressed })
                        })
                        const data = await res.json()
                        if (res.ok && data.ok) {
                          setLogoSaving('ok')
                        } else {
                          console.error('[Logo save error]', data)
                          setLogoSaving('error')
                        }
                        setTimeout(() => setLogoSaving('idle'), 3000)
                      } catch(err) {
                        console.error('[Logo save exception]', err)
                        setLogoSaving('error')
                        setTimeout(() => setLogoSaving('idle'), 3000)
                      }
                    }
                    r.readAsDataURL(f)
                  }} />
                </label>
                <div style={{ flex: 1 }}>
                  {editingTeamName ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input
                        value={teamNameDraft}
                        onChange={e=>setTeamNameDraft(e.target.value.toUpperCase())}
                        onKeyDown={e=>{ if(e.key==='Enter') saveTeamName(); if(e.key==='Escape') setEditingTeamName(false) }}
                        autoFocus
                        style={{ fontFamily:'var(--font-display,monospace)', fontSize:28, fontWeight:900, color:'var(--lime)', background:'transparent', border:'none', borderBottom:'2px solid var(--lime)', outline:'none', width:200, letterSpacing:'0.02em' }}
                      />
                      <button className="hover-scale" onClick={saveTeamName} style={{ fontSize:12, padding:'4px 10px', borderRadius:7, background:'var(--lime)', color:'var(--ink)', border:'none', cursor:'pointer', fontWeight:700 }}>✓</button>
                      <button className="hover-scale" onClick={()=>setEditingTeamName(false)} style={{ fontSize:12, padding:'4px 8px', borderRadius:7, background:'transparent', color:'var(--fog)', border:'1px solid var(--fog)', cursor:'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={()=>{ setTeamNameDraft(teamName); setEditingTeamName(true) }}>
                      <PanelHeader 
                        icon={clubLogo ? <img src={clubLogo} alt="Escudo" width={48} height={48} style={{objectFit:'contain', borderRadius:'50%'}} /> : Icons.equipo} 
                        title={teamName} 
                        subtitle="PLANTEL" 
                        color="#a855f7" 
                      />
                      <span style={{ fontSize:11, color:'var(--fog)', marginTop:4 }} title="Editar nombre del equipo">✏️</span>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: 24, marginTop: 10 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--silver)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Prom. Edad</span>
                      <span style={{ fontSize: 24, color: 'var(--lime)', fontWeight: 800 }}>
                        {teamData.length ? Math.round(teamData.reduce((acc: number, p: any) => acc + (Number(p.edad)||0), 0) / teamData.filter((p: any) => p.edad).length || 0) : 0}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--silver)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Prom. Estatura</span>
                      <span style={{ fontSize: 24, color: 'var(--lime)', fontWeight: 800 }}>
                        {teamData.length ? Math.round(teamData.reduce((acc: number, p: any) => acc + (Number(p.estatura_cm)||0), 0) / teamData.filter((p: any) => p.estatura_cm).length || 0) : 0} <span style={{fontSize: 14}}>cm</span>
                      </span>
                    </div>
                  </div>
                  
                  <p style={{ fontSize:11, color:'var(--silver)', marginTop:8 }}>Por posición · {today}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Proxy Mode Toggle */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: proxyMode ? 'rgba(200,241,53,0.1)' : 'var(--ink2)', border: proxyMode ? '1px solid rgba(200,241,53,0.3)' : '1px solid var(--mist)', padding: '6px 12px', borderRadius: 10, transition: 'all 0.2s' }}>
                  <input type="checkbox" checked={proxyMode} onChange={e => setProxyMode(e.target.checked)} style={{ cursor: 'pointer' }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: proxyMode ? 'var(--lime)' : 'var(--silver)' }}>Modo Carga Manual (Proxy)</span>
                </label>
                
                {/* Global Delete Button */}
                {proxyMode && (
                  <button onClick={() => setShowGlobalDeleteModal(true)} style={{ background: 'var(--ink2)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4 }}>
                    🗑️ Borrar Datos
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 10, padding: '6px 12px', width: 220 }}>
                  <span style={{ color: 'var(--fog)', marginRight: 8 }}>🔍</span>
                  <input type="text" placeholder="Buscar jugador..." value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--snow)', fontSize: 13, width: '100%' }} />
                </div>
              </div>
            </div>
            {Object.keys(byPos).sort((a,b)=>Number(a)-Number(b)).map(posKey=>(
              <div key={posKey} style={{ marginBottom:20 }}>
                {secHead(PG[Number(posKey)]||'SIN POSICIÓN', byPos[Number(posKey)].length)}
                <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden', marginBottom:4 }}>
                  {byPos[Number(posKey)].map((p,i,arr)=><PlayerRow key={p.id} player={p} last={i===arr.length-1} onOpen={()=>openPlayer(p)} isInjured={false} proxyMode={proxyMode} />)}
                </div>
              </div>
            ))}
            {injured.length>0 && (
              <div>
                {secHead('🏥 LESIONADOS', injured.length, '#ef4444')}
                <div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.2)', borderRadius:16, overflow:'hidden', opacity:.8 }}>
                  {injured.map((p,i)=><PlayerRow key={p.id} player={p} last={i===injured.length-1} onOpen={()=>openPlayer(p)} isInjured={true} proxyMode={proxyMode} />)}
                </div>
              </div>
            )}
            {unavailable.length>0 && (
              <div>
                {secHead('✗ DIFERENCIADOS', unavailable.length, '#f59e0b')}
                <div style={{ background:'var(--ink2)', border:'1px solid rgba(245,158,11,.2)', borderRadius:16, overflow:'hidden', opacity:.75 }}>
                  {unavailable.map((p,i)=><PlayerRow key={p.id} player={p} last={i===unavailable.length-1} onOpen={()=>openPlayer(p)} isInjured={false} proxyMode={proxyMode} />)}
                </div>
              </div>
            )}
            {pending.length>0 && (
              <div style={{ background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.15)', borderRadius:14, padding:'14px 18px' }}>
                <p style={{ fontSize:11, fontWeight:600, color:'#f87171', marginBottom:8 }}>⚠ Sin wellness hoy ({pending.length})</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {pending.map(p=><span key={p.id} onClick={()=>openPlayer(p)} style={{ fontSize:12, padding:'4px 10px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer' }}>{p.nombre}</span>)}
                </div>
              </div>
            )}
            {filteredTeamData.length===0 && <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--silver)', fontSize:14 }}>Sin jugadores.</div>}
          </div>
        )}

        {tab==='team' && selected && (
          <PlayerDetail player={selected} logs={playerLogs} wellness={playerWellness} loading={loadingDetail} ciclo={ciclo} onCicloChange={(c)=>{ setCiclo(c); openPlayer(selected, c) }} onRefreshData={() => { openPlayer(selected, ciclo); router.refresh(); }} onBack={()=>setSelected(null)} proxyMode={proxyMode} />
        )}

        {tab==='analytics' && <AnalyticsPanel />}
        {tab==='neuromuscular' && <PerfilNeuromuscularPanel />}
        {tab==='calendario' && <CalendarioPanel teamData={teamData} />}
        {tab==='minutos' && <MinutosPanel teamData={teamData} />}
        {tab==='carga-externa' && <CargaExternaPanel />}
        {tab==='control-carga-calc' && <ControlCargaCalcPanel teamData={teamData} />}
        {tab==='control-carga-gps' && <ControlCargaGpsPanel teamData={teamData} />}
        {tab==='acumulado' && <AcumPanel teamData={teamData} />}
        {tab==='expo-ai' && <ExpoAIPanel teamData={teamData} />}
        {tab==='evaluaciones' && <EvaluacionesPanel teamData={teamData} />}
        {tab==='biblioteca' && <BibliotecaPanel />}
        {tab==='cambio-carga' && <CambioCargaPanel />}
        {tab==='comparativa' && <ComparativaPanel teamData={teamData} />}
        {tab==='tactica' && <TacticaPanel teamData={teamData} session={session} today={todayLocal()} />}
        {tab==='lesiones' && <EnfermeriaPanel teamData={teamData} onRefresh={()=>router.refresh()} />}
        {tab==='gps' && <GpsPanel teamData={teamData} />}
        {tab==='vinculaciones' && <VinculacionesPanel teamData={teamData} />}
        {tab==='canchas' && <CanchasPanel />}

        {tab==='manual' && <ManualPanel />}

        {tab==='notificaciones' && <NotificacionesCoachPanel />}
          </AnimateOnScroll>

        {tab==='players' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <PanelHeader 
                icon={Icons.planificacion} 
                title="JUGADORES" 
                subtitle="ADMINISTRAR" 
                color="#a855f7" 
              />
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 10, padding: '6px 12px', width: 220 }}>
                <span style={{ color: 'var(--fog)', marginRight: 8 }}>🔍</span>
                <input type="text" placeholder="Buscar jugador..." value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--snow)', fontSize: 13, width: '100%' }} />
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <a href="/api/players/template" download="plantilla_jugadores.xlsx"
                  style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:13, padding:'10px 18px', borderRadius:10, background:'rgba(200,241,53,.08)', border:'1px solid rgba(200,241,53,.25)', color:'var(--lime)', textDecoration:'none', fontWeight:600, cursor:'pointer' }}>
                  📥 Bajar plantilla
                </a>
                <button className="btn-ghost" style={{ fontSize:13, padding:'10px 18px' }} onClick={()=>setShowImport(v=>!v)}>
                  📤 Importar plantel
                </button>
                <button className="btn-lime" onClick={()=>setShowNew(true)} style={{ fontSize:13, padding:'10px 20px' }}>+ Nuevo jugador</button>
              </div>
            </div>
            <CoachEmailSettings />
            {showImport && <BulkImportPanel onSuccess={()=>{ setShowImport(false); router.refresh() }} onCancel={()=>setShowImport(false)} />}
            {showNew && <NewPlayerForm onSuccess={()=>{ setShowNew(false); router.refresh() }} onCancel={()=>setShowNew(false)} />}
            <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
              {filteredTeamData.length===0
                ? <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--silver)', fontSize:14 }}>No hay jugadores.</div>
                : filteredTeamData.map((p: any, i: number) => <ManageRow key={p.id} player={p} last={i===filteredTeamData.length-1} onRefresh={()=>router.refresh()} />)
              }
            </div>
          </div>
        )}
      </main>
      </div>{/* flex wrapper */}
      <PushNotificationManager />
    </div>
  )
}

function PlayerRow({ player:p, last, onOpen, isInjured, proxyMode }: any) {
  const col = SC[p.acwr?.status]||'#555'
  return (
    <button className="hover-scale" onClick={onOpen} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', borderBottom:last?'none':'1px solid var(--mist)', transition:'background .12s' }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: 'var(--mist)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--silver)', border: '1px solid var(--fog)' }}>
          {p.foto_url
            ? <img src={p.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt=""/>
            : (p.nombre||'').split(' ').map((w: string)=>w[0]).slice(0,2).join('')
          }
        </div>
        {isInjured
          ? <span style={{ position: 'absolute', bottom: -4, right: -4, fontSize: 14 }}>🏥</span>
          : <div style={{ position: 'absolute', bottom: 0, right: -2, width: 10, height: 10, borderRadius: '50%', background: p.respondedToday ? '#22c55e' : '#ef4444', border: '2px solid var(--ink2)' }} />
        }
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:500, fontSize:14, color:isInjured?'#f87171':'var(--snow)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center', gap:6 }}>{p.nacionalidad && <FlagImg country={p.nacionalidad} size={16} />}{p.nombre}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--silver)', marginTop:1 }}>
          <span>{p.posicion||'—'}</span>
          <span>-</span>
          <span>{p.pie_habil || 'Diestro'}</span>
          <span>-</span>
          <span>{p.estatura_cm ? p.estatura_cm + 'cm' : '—'}</span>
          <span>-</span>
          <span>{p.peso_kg ? p.peso_kg + 'kg' : '—'}</span>
          {isInjured && p.lesion && <span style={{ marginLeft:8, color:LCOL[p.lesion.estado]||'#888' }}>· {p.lesion.tipo_lesion} ({p.lesion.estado})</span>}
          {p.alta_reciente && !isInjured && <span style={{ marginLeft:8, color:'#a3e635', fontWeight:700, padding:'2px 6px', background:'rgba(163,230,53,.15)', borderRadius:4 }}>🛡️ En Adaptación RTP</span>}
        </div>
      </div>
      
      {proxyMode && (
        <div style={{ display: 'flex', gap: 6, marginRight: 10 }}>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, border: p.respondedToday ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)', background: p.respondedToday ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: p.respondedToday ? '#4ade80' : '#f87171' }}>
            Wellness: {p.respondedToday ? '✅' : '❌'}
          </span>
          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, border: p.rpeToday ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)', background: p.rpeToday ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: p.rpeToday ? '#4ade80' : '#f87171' }}>
            RPE: {p.rpeToday ? '✅' : '❌'}
          </span>
        </div>
      )}

      {p.lastWellness?.fue_gimnasio && <span style={{ fontSize:10, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.2)', borderRadius:5, padding:'2px 6px' }}>GYM</span>}
      {p.lastWellness && !isInjured && (
        <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:20 }}>
          {['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo'].map(k=>{ const v=p.lastWellness[k]||0; return <div key={k} style={{ width:5, height:`${v*20}%`, background:wCol(v), borderRadius:2 }} /> })}
        </div>
      )}
      {p.last_session_fecha && !isInjured && (() => {
        const lastDate = new Date(p.last_session_fecha + 'T12:00:00')
        const now = new Date()
        const horasDesde = Math.round((now.getTime() - lastDate.getTime()) / 3600000)
        const recupCol = horasDesde < 24 ? '#ef4444' : horasDesde < 48 ? '#f59e0b' : 'var(--fog)'
        const recupLabel = horasDesde < 24 ? '⚠ <24h' : horasDesde < 48 ? '~48h' : null
        return recupLabel ? (
          <span style={{ fontSize:9, padding:'2px 5px', borderRadius:4, background:`${recupCol}15`, color:recupCol, border:`1px solid ${recupCol}33`, fontWeight:700, whiteSpace:'nowrap' }}>
            {recupLabel}
          </span>
        ) : null
      })()}
      {!isInjured
        ? <div style={{ textAlign:'right', minWidth:72 }}>
            <div className="mono" style={{ fontSize:16, fontWeight:600, color:col }}>{p.acwr?.ratio>0?p.acwr.ratio.toFixed(2):'—'}</div>
            <div style={{ fontSize:9, color:col, fontFamily:'DM Mono,monospace', letterSpacing:'0.05em' }}>{SL[p.acwr?.status]||'—'}</div>
          </div>
        : p.lesion?.eta_dias && <div style={{ textAlign:'right', minWidth:72 }}><div className="mono" style={{ fontSize:16, fontWeight:600, color:'#f87171' }}>{p.lesion.eta_dias}d</div><div style={{ fontSize:9, color:'#f87171', fontFamily:'DM Mono,monospace' }}>ETA</div></div>
      }
      <span style={{ color:'var(--fog)', fontSize:14 }}>›</span>
    </button>
  )
}

function PlayerDetail({ player:p, logs, wellness, loading, onBack, ciclo, onCicloChange, onRefreshData, proxyMode }: any) {
  const col = p.lesion?'#ef4444':(SC[p.acwr?.status]||'#555')
  const [showProxyWellness, setShowProxyWellness] = useState(false)
  const [showProxyRPE, setShowProxyRPE] = useState(false)
  const [showDeletePlayerModal, setShowDeletePlayerModal] = useState(false)
  const [acwrMetric, setAcwrMetric] = useState<'ua'|'uce'>('ua')
  
  // Optimistic wellness state
  const [localWellness, setLocalWellness] = useState(wellness)
  useEffect(() => { setLocalWellness(wellness) }, [wellness])
  
  const lastW = localWellness[0]

  // Prepare sleep data for SleepChart (last 28 days or from available wellness)
  const sleepData = localWellness.slice(0, 28).reverse().map((w: any) => ({
    fecha: String(w.fecha),
    label: String(w.fecha).slice(8, 10) + '/' + String(w.fecha).slice(5, 7),
    horas: Number(w.horas_sueno) || 0
  }))

  // ── Ausencias ──────────────────────────────────────────────────────────────
  const [ausencias, setAusencias] = useState<any[]>([])
  const [ausenciaFecha, setAusenciaFecha] = useState('')
  const [ausenciaMotivo, setAusenciaMotivo] = useState('Ausente')
  const [savingAus, setSavingAus] = useState(false)
  const [showAusForm, setShowAusForm] = useState(false)

  useEffect(() => {
    if (!p.jugador_id) return
    fetch(`/api/ausencias?jugadorId=${p.jugador_id}&days=28`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setAusencias(d) : setAusencias([]))
      .catch(() => setAusencias([]))
  }, [p.jugador_id])

  const ausenciaSet = new Set(ausencias.map((a:any) => String(a.fecha)))

  async function guardarAusencia() {
    if (!ausenciaFecha) return
    setSavingAus(true)
    const r = await fetch('/api/ausencias', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ jugador_id: p.jugador_id, fecha: ausenciaFecha, motivo: ausenciaMotivo })
    })
    const data = await r.json()
    if (data.id) {
      setAusencias(prev => {
        const filtered = prev.filter((a:any) => a.fecha !== data.fecha)
        return [data, ...filtered].sort((a,b) => b.fecha.localeCompare(a.fecha))
      })
      setShowAusForm(false)
      setAusenciaFecha('')
    }
    setSavingAus(false)
  }

  async function eliminarAusencia(id: number) {
    await fetch(`/api/ausencias?id=${id}`, { method:'DELETE' })
    setAusencias(prev => prev.filter((a:any) => a.id !== id))
  }

  const MOTIVO_COL: Record<string,string> = {
    'Ausente':'#ef4444','Personal':'#f97316','Enfermedad':'#f59e0b',
    'Lesión':'#ef4444','Suspensión':'#a855f7'
  }
  const CICLOS = [
    { id:'microciclo', label:'Microciclo', sub:'Semana' },
    { id:'mesociclo',  label:'Mesociclo',  sub:'Mes' },
    { id:'macrociclo', label:'Macrociclo', sub:'Temporada' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button className="btn-ghost" style={{ fontSize:12, padding:'7px 14px' }} onClick={onBack}>← Volver</button>
          
          {proxyMode && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowProxyWellness(true)} style={{ background: 'var(--ink2)', border: '1px solid rgba(200,241,53,0.3)', color: 'var(--lime)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                ✍️ Cargar Wellness
              </button>
              <button onClick={() => setShowProxyRPE(true)} style={{ background: 'var(--ink2)', border: '1px solid rgba(200,241,53,0.3)', color: 'var(--lime)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                ✍️ Cargar RPE
              </button>
              <button onClick={() => setShowDeletePlayerModal(true)} style={{ background: 'var(--ink2)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                🗑️ Borrar Datos
              </button>
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:4, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:3, flex:'none' }}>
          {CICLOS.map(c => (
            <button className="hover-scale" key={c.id} type="button" onClick={() => onCicloChange(c.id)} style={{
              padding:'6px 14px', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600,
              border:'none',
              background: ciclo===c.id ? 'var(--lime)' : 'transparent',
              color: ciclo===c.id ? 'var(--ink)' : 'var(--silver)',
              transition:'all .12s',
              lineHeight:1.2, textAlign:'center',
            }}>
              <div>{c.label}</div>
              <div style={{ fontSize:9, fontWeight:400, opacity:.7 }}>{c.sub}</div>
            </button>
          ))}
        </div>
      </div>
      <div className="anim-up" style={{ background:'var(--ink2)', border:`1px solid ${col}33`, borderRadius:20, padding:28, position:'relative', overflow:'hidden' }}>
        <div className="scanline" />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20 }}>
          <div>
            <h2 className="display" style={{ fontSize:48, color:'var(--snow)', marginBottom:8 }}>{p.nombre.toUpperCase()}</h2>
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, fontSize:12, color:'var(--silver)', alignItems: 'center' }}>
              {p.nacionalidad && <FlagImg country={p.nacionalidad} size={20} />}
              {p.posicion && <span>📍 {p.posicion}</span>}
              {p.edad && <span>🎂 {p.edad} años</span>}
              {p.peso_kg && <span>⚖️ {p.peso_kg} kg</span>}
              {p.estatura_cm && <span>📏 {p.estatura_cm} cm</span>}
            </div>
            {p.lesion && (
              <div style={{ marginTop:10, background:'rgba(239,68,68,.12)', border:'1px solid rgba(239,68,68,.3)', borderRadius:10, padding:'10px 14px' }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#f87171', marginBottom:4 }}>🏥 EN ENFERMERÍA</p>
                <p style={{ fontSize:12, color:'var(--silver)' }}>{p.lesion.tipo_lesion} · {p.lesion.zona}</p>
                <p style={{ fontSize:11, color:LCOL[p.lesion.estado]||'#888' }}>Estado: {p.lesion.estado}</p>
                {p.lesion.eta_dias && <p style={{ fontSize:11, color:'var(--silver)' }}>ETA: {p.lesion.eta_dias} días</p>}
              </div>
            )}
            {!p.lesion && (
              <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:6 }}>
                {p.alta_reciente && (
                  <span style={{ fontSize:12, background:'rgba(163,230,53,.1)', color:'#a3e635', border:'1px solid rgba(163,230,53,.3)', borderRadius:8, padding:'4px 10px', fontWeight:600 }}>
                    🛡️ Periodo de Adaptación RTP (Alta reciente: {p.alta_reciente.fecha_alta.split('-').slice(1).join('/')})
                  </span>
                )}
                {p.entrena_grupo===false
                  ? <span style={{ fontSize:12, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'4px 10px' }}>✗ No entrena con el grupo</span>
                  : p.respondedToday
                    ? <span style={{ fontSize:12, background:'rgba(34,197,94,.1)', color:'#4ade80', border:'1px solid rgba(34,197,94,.25)', borderRadius:8, padding:'4px 10px' }}>✓ Disponible para la sesión</span>
                    : <span style={{ fontSize:12, background:'rgba(245,158,11,.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.25)', borderRadius:8, padding:'4px 10px' }}>⚠ Sin wellness hoy</span>
                }
              </div>
            )}
          </div>
          {!p.lesion && (
            <div style={{ textAlign:'center', background:`${col}12`, border:`1px solid ${col}33`, borderRadius:16, padding:'16px 24px' }}>
              <div className="display" style={{ fontSize:64, color:col, lineHeight:1 }}>{p.acwr?.ratio>0?p.acwr.ratio.toFixed(2):'—'}</div>
              <div style={{ fontFamily:'DM Mono,monospace', fontSize:9, color:col, marginTop:6, letterSpacing:'0.06em' }}>ACWR</div>
            </div>
          )}
        </div>
        {!p.lesion && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:20 }}>
            {[['Carga aguda (suma 7d)',p.acwr?.acuteLoad],['Carga crónica (prom. 4 sem.)',p.acwr?.chronicLoad]].map(([l,v])=>(
              <div key={l} style={{ background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
                <div className="mono" style={{ fontSize:20, fontWeight:500, color:'var(--snow)' }}>{v}</div>
                <div style={{ fontSize:11, color:'var(--silver)', marginTop:2 }}>{l} UA</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!p.lesion && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Evolución ACWR — 28 días
            </p>
            <div style={{ display:'flex', gap:4 }}>
              {(['ua','uce'] as const).map(m => (
                <button className="hover-scale" key={m} onClick={()=>setAcwrMetric(m)}
                  style={{ fontSize:10, padding:'4px 10px', borderRadius:6, cursor:'pointer', border: acwrMetric===m?'2px solid var(--lime)':'1px solid var(--mist)', background: acwrMetric===m?'rgba(200,241,53,.1)':'var(--ink2)', color: acwrMetric===m?'var(--lime)':'var(--silver)', fontWeight:600 }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {loading
            ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--silver)' }}>Cargando...</div>
            : <ACWRChart data={buildACWRHistory(logs, 28, acwrMetric, ausenciaSet)} />}
        </div>
      )}

      {/* SLEEP CHART */}
      {!p.lesion && localWellness.length > 0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20, marginTop:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Horas de Sueño — 28 días
            </p>
          </div>
          {loading
            ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--silver)' }}>Cargando...</div>
            : <SleepChart data={sleepData} />}
        </div>
      )}

      {!p.lesion && !loading && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20, marginTop:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              ✗ Ausencias registradas
            </p>
            <button className="hover-scale"
              onClick={() => setShowAusForm(v => !v)}
              style={{ fontSize:11, padding:'5px 12px', borderRadius:8, cursor:'pointer', border:'1px solid var(--mist)', background:'var(--ink3)', color:'var(--lime)', fontWeight:600 }}>
              {showAusForm ? 'Cancelar' : '+ Registrar ausencia'}
            </button>
          </div>
          {showAusForm && (
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end', marginBottom:14, padding:14, background:'var(--ink3)', borderRadius:12, border:'1px solid var(--mist)' }}>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:10, color:'var(--silver)' }}>Fecha</label>
                <input type="date" value={ausenciaFecha} onChange={e=>setAusenciaFecha(e.target.value)}
                  style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, padding:'6px 10px', color:'var(--snow)', fontSize:12 }} />
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                <label style={{ fontSize:10, color:'var(--silver)' }}>Motivo</label>
                <select value={ausenciaMotivo} onChange={e=>setAusenciaMotivo(e.target.value)}
                  style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, padding:'6px 10px', color:'var(--snow)', fontSize:12 }}>
                  {['Ausente','Personal','Enfermedad','Lesión','Suspensión'].map(m=>(
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <button className="hover-scale" onClick={guardarAusencia} disabled={savingAus || !ausenciaFecha}
                style={{ padding:'7px 18px', borderRadius:8, cursor:'pointer', border:'none', background:'var(--lime)', color:'var(--ink)', fontWeight:700, fontSize:12, opacity: savingAus||!ausenciaFecha?0.5:1 }}>
                {savingAus ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
          {ausencias.length === 0
            ? <p style={{ fontSize:12, color:'var(--fog)', fontStyle:'italic' }}>Sin ausencias registradas en los últimos 28 días</p>
            : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {ausencias.map((a:any) => (
                  <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--fog)' }}>{String(a.fecha).slice(5)}</span>
                      <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${MOTIVO_COL[a.motivo]||'#ef4444'}20`, color:MOTIVO_COL[a.motivo]||'#ef4444', border:`1px solid ${MOTIVO_COL[a.motivo]||'#ef4444'}44`, fontWeight:600 }}>
                        {a.motivo}
                      </span>
                    </div>
                    <button className="hover-scale" onClick={() => eliminarAusencia(a.id)}
                      style={{ fontSize:11, padding:'3px 10px', borderRadius:6, cursor:'pointer', border:'1px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.08)', color:'#f87171' }}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {!p.lesion && !loading && logs.length > 0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Detalle últimos 7 días</p>
          <div style={{ overflowX:'auto' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,.03)' }}>
                  {['MD','Fecha',acwrMetric.toUpperCase(),'ACWR','Estado'].map(h=>(
                    <th key={h} style={{ padding:'7px 12px', color:'var(--silver)', fontWeight:600, textTransform:'uppercase', fontSize:9, letterSpacing:'0.06em', textAlign:'center', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildDailyDetail(logs.map(l=>({fecha:String(l.fecha),carga_ua:Number(l.carga_ua)||0,carga_uce:(l as any).carga_uce??null})), acwrMetric, ausenciaSet).map((row,i)=>{
                  const SC2={optimo:'#22c55e',precaucion:'#f59e0b',peligro:'#ef4444',peligro_bajo:'#3b82f6',sin_datos:'#444'}
                  const SL2={optimo:'Óptimo',precaucion:'Precaución',peligro:'Riesgo alto',peligro_bajo:'Carga baja',sin_datos:'—'}
                  const rowCol = row.ausente ? '#ef4444' : (SC2[row.status]||'#444')
                  const dayLog = logs.find((l:any) => String(l.fecha) === row.date)
                  const mdLabel = (dayLog as any)?.md_label || null
                  const cargaUce = (dayLog as any)?.carga_uce ?? null
                  const cargaShow = cargaUce !== null ? cargaUce : row.carga
                  return (
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background: row.ausente ? 'rgba(239,68,68,.06)' : row.hasSesion ? 'transparent' : 'rgba(0,0,0,.2)' }}>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontWeight:700, color: row.ausente ? '#f87171' : mdLabel?'var(--lime)':'var(--silver)', fontFamily:'DM Mono,monospace', fontSize:11 }}>
                        {row.ausente ? '✗ AUS' : (mdLabel || row.dia)}
                      </td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--fog)' }}>{row.date.slice(5)}</td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color: row.ausente ? '#f87171' : row.hasSesion?'var(--lime)':'var(--fog)' }}>
                        {row.ausente ? '0' : row.hasSesion ? cargaShow : '—'}
                      </td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color: rowCol }}>
                        {row.ratio > 0 ? row.ratio.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding:'8px 12px', textAlign:'center' }}>
                        {row.ausente
                          ? <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:'rgba(239,68,68,.15)', color:'#f87171', border:'1px solid rgba(239,68,68,.35)', fontWeight:600 }}>Ausente</span>
                          : <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:`${rowCol}20`, color:rowCol, border:`1px solid ${rowCol}44`, fontWeight:600 }}>{SL2[row.status]||'—'}</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:12, display:'flex', gap:12, flexWrap:'wrap' }}>
            {[['#3b82f6','< 0.8 Carga baja'],['#22c55e','0.8–1.3 Óptimo'],['#f59e0b','1.3–1.5 Precaución'],['#ef4444','> 1.5 Riesgo / Ausente']].map(([c,l])=>(
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--silver)' }}>
                <div style={{ width:8, height:8, borderRadius:2, background:c }} />{l}
              </div>
            ))}
          </div>
        </div>
      )}
      {lastW && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Último Wellness · <span style={{ color:'var(--fog)', fontWeight:400, fontFamily:'DM Mono,monospace' }}>{lastW.fecha}</span></p>
            <button className="hover-scale" onClick={async () => {
              if (confirm('¿Eliminar registro de wellness de esta fecha?')) {
                // Optimistic UI update
                setLocalWellness((prev: any) => prev.filter((w: any) => w.fecha !== lastW.fecha));
                
                await fetch(`/api/wellness?jugador_id=${p.jugador_id}&fecha=${lastW.fecha}`, { method: 'DELETE' });
                if (onRefreshData) onRefreshData();
              }
            }} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', fontSize:12, opacity:0.8, padding:'4px 8px' }} title="Eliminar registro">✕ Borrar</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
            {['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo'].map((k,i)=>{ const v=Number(lastW[k])||0; const c=wCol(v); return (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:12, color:'var(--silver)', minWidth:52 }}>{WL[i]}</span>
                <div style={{ flex:1, height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}><div style={{ width:`${v*20}%`, height:'100%', background:c, borderRadius:3 }} /></div>
                <span className="mono" style={{ fontSize:12, color:c, minWidth:14 }}>{v}</span>
              </div>
            )})}
          </div>
          {lastW.tqr>0 && (
            <div style={{ display:'flex', gap:10, marginBottom:12 }}>
              <div style={{ flex:1, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:10, textAlign:'center' }}>
                <div className="mono" style={{ fontSize:20, color:lastW.tqr>=8?'#c8f135':lastW.tqr>=6?'#22c55e':lastW.tqr>=4?'#f59e0b':'#ef4444' }}>{lastW.tqr}</div>
                <div style={{ fontSize:10, color:'var(--silver)' }}>TQR — Recuperación</div>
              </div>
            </div>
          )}
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {lastW.dolor_zona && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(245,158,11,.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.25)' }}>⚠ {lastW.dolor_zona}</span>}
            {lastW.dolor_descripcion && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.07)', color:'#fca5a5', border:'1px solid rgba(239,68,68,.2)', fontStyle:'italic' }}>💬 {lastW.dolor_descripcion}</span>}
            {lastW.entrena_grupo===false && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)' }}>✗ No entrena con grupo</span>}
            {lastW.fue_gimnasio && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(200,241,53,.08)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.2)' }}>🏋 Fue al gimnasio</span>}
            {lastW.grupos_musculares && <span style={{ fontSize:11, color:'var(--silver)' }}>💪 {lastW.grupos_musculares}</span>}
          </div>
        </div>
      )}
      {wellness.length>0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Tendencia Wellness</p>
          <WellnessTrend data={wellness} />
        </div>
      )}
      {logs.length>0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>RPE — Últimas sesiones</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:90 }}>
            {[...logs].slice(-12).map((log,i) => {
              const rpeVal = Number(log.rpe) || 0
              const uaVal = Number(log.carga_ua) || 0
              const pct = (rpeVal / 10) * 100
              const col = rpeVal <= 3 ? '#22c55e' : rpeVal <= 5 ? '#c8f135' : rpeVal <= 7 ? '#f59e0b' : rpeVal <= 9 ? '#f97316' : '#ef4444'
              return (
                <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }} title={`${String(log.fecha)} — RPE ${rpeVal}${uaVal ? ` — ${uaVal} UA` : ''}`}>
                  <div className="mono" style={{ fontSize:10, color:col, fontWeight:700, lineHeight:1 }}>{rpeVal}</div>
                  <div style={{ width:'100%', height:64, background:'var(--mist)', borderRadius:4, overflow:'hidden', display:'flex', alignItems:'flex-end' }}>
                    <div style={{ width:'100%', height:`${pct}%`, background:col, borderRadius:4, transition:'height .3s', minHeight: rpeVal>0?3:0 }} />
                  </div>
                  <div style={{ fontSize:8, color:'var(--fog)', textAlign:'center', lineHeight:1.2 }}>
                    {log.fecha ? String(log.fecha).slice(5) : ''}
                  </div>
                  {log.md_label && (
                    <div style={{ fontSize:7, color:'var(--lime)', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, lineHeight:1, marginTop:1 }}>
                      {log.md_label}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display:'flex', gap:14, marginTop:10, flexWrap:'wrap' }}>
            {[[3,'#22c55e','Fácil (≤3)'],[5,'#c8f135','Moderado (4-5)'],[7,'#f59e0b','Duro (6-7)'],[9,'#f97316','Muy duro (8-9)'],[10,'#ef4444','Máximo (10)']].map(([,c,l])=>(
              <div key={l as string} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--silver)' }}>
                <div style={{ width:8, height:8, borderRadius:2, background:c as string }} />{l as string}
              </div>
            ))}
          </div>
        </div>
      )}
      {logs.length>0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Últimas sesiones <span style={{ fontSize:10, color:'var(--fog)', fontWeight:400, textTransform:'none' }}>— click en ✏️ para editar minutos y recalcular UA</span></p>
          {[...logs].slice(-8).reverse().map((l,i)=>(<CoachSessionRow key={i} log={l} />))}
        </div>
      )}
      <HistorialLesivo jugadorId={p.jugador_id || p.id} />

      {/* PROXY MODALS */}
      {showProxyWellness && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--ink)', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, padding: 24, border: '1px solid var(--mist)', position: 'relative' }}>
            <button onClick={() => setShowProxyWellness(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--ink2)', border: 'none', width: 32, height: 32, borderRadius: 16, color: 'var(--silver)', cursor: 'pointer', zIndex: 10 }}>✕</button>
            <h3 style={{ fontSize: 18, color: 'var(--snow)', marginBottom: 16, textAlign: 'center' }}>Cargar Wellness ({p.nombre})</h3>
            <WellnessForm jugadorId={p.jugador_id} todayWellness={null} onSuccess={() => { setShowProxyWellness(false); onRefreshData?.() }} />
          </div>
        </div>
      )}

      {showProxyRPE && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--ink)', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', borderRadius: 24, padding: 24, border: '1px solid var(--mist)', position: 'relative' }}>
            <button onClick={() => setShowProxyRPE(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--ink2)', border: 'none', width: 32, height: 32, borderRadius: 16, color: 'var(--silver)', cursor: 'pointer', zIndex: 10 }}>✕</button>
            <h3 style={{ fontSize: 18, color: 'var(--snow)', marginBottom: 16, textAlign: 'center' }}>Cargar RPE ({p.nombre})</h3>
            <RPEForm jugadorId={p.jugador_id} onSuccess={() => { setShowProxyRPE(false); onRefreshData?.() }} />
          </div>
        </div>
      )}

      {showDeletePlayerModal && (
        <DeleteDataModal isGlobal={false} jugadorId={p.jugador_id} playerName={p.nombre} defaultFecha={String(new Date().toISOString().slice(0, 10))} onClose={() => setShowDeletePlayerModal(false)} onRefresh={onRefreshData} />
      )}
    </div>
  )
}

// ─── HISTORIAL LESIVO POR JUGADOR ─────────────────────────────────────────────
function HistorialLesivo({ jugadorId }: { jugadorId: number }) {
  const [lesiones, setLesiones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!jugadorId) return
    fetch(`/api/lesiones?jugador_id=${jugadorId}&activas=false`)
      .then(r => r.json())
      .then(d => { setLesiones(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [jugadorId])

  if (loading) return null
  if (lesiones.length === 0) return (
    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
      <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>🏥 Historial Lesivo</p>
      <p style={{ fontSize:12, color:'var(--fog)' }}>Sin lesiones registradas. ✓</p>
    </div>
  )

  // Calculate days for each injury
  const lesionesConDias = lesiones.map(l => {
    const inicio = new Date(l.fecha_inicio)
    const fin = l.fecha_alta ? new Date(l.fecha_alta) : new Date()
    const dias = Math.max(0, Math.floor((fin.getTime() - inicio.getTime()) / 86400000))
    return { ...l, dias_baja: dias }
  })

  const totalDias = lesionesConDias.reduce((acc, l) => acc + l.dias_baja, 0)
  const alerta = totalDias >= 45

  return (
    <div style={{ background:'var(--ink2)', border:`1px solid ${alerta ? 'rgba(239,68,68,.3)' : 'var(--mist)'}`, borderRadius:16, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:16 }}>
        <div>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>🏥 Historial Lesivo</p>
          <p style={{ fontSize:11, color:'var(--fog)', marginTop:2 }}>{lesionesConDias.length} lesión{lesionesConDias.length !== 1 ? 'es' : ''} registrada{lesionesConDias.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ textAlign:'center', background: alerta ? 'rgba(239,68,68,.08)' : 'rgba(255,255,255,.04)', border:`1px solid ${alerta ? 'rgba(239,68,68,.3)' : 'var(--mist)'}`, borderRadius:12, padding:'10px 20px' }}>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:'DM Mono,monospace', color: alerta ? '#f87171' : 'var(--snow)', lineHeight:1 }}>{totalDias}</div>
          <div style={{ fontSize:9, color: alerta ? '#f87171' : 'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>días de baja acumulados</div>
        </div>
      </div>

      {alerta && (
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:10, padding:'10px 14px', marginBottom:16, display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:16 }}>⚠️</span>
          <div>
            <p style={{ fontSize:12, fontWeight:600, color:'#f87171', marginBottom:2 }}>Atención: historial de carga lesiva elevado</p>
            <p style={{ fontSize:11, color:'var(--silver)' }}>{totalDias} días de baja acumulados. Manejá la progresión de carga con precaución y priorizá la recuperación preventiva.</p>
          </div>
        </div>
      )}

      <div style={{ overflowX:'auto' }}>
        <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--mist)' }}>
              {['Fecha inicio','Diagnóstico','Zona','Estado','Días de baja','Alta'].map(h => (
                <th key={h} style={{ padding:'7px 10px', textAlign:'left', fontSize:10, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lesionesConDias.map((l, i) => (
              <tr key={l.id} style={{ borderBottom:'1px solid rgba(255,255,255,.04)', background: i%2===0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                <td style={{ padding:'9px 10px', color:'var(--silver)', fontFamily:'DM Mono,monospace', fontSize:11 }}>{l.fecha_inicio}</td>
                <td style={{ padding:'9px 10px', color:'var(--snow)', fontWeight:500 }}>{l.tipo_lesion || '—'}</td>
                <td style={{ padding:'9px 10px', color:'var(--silver)' }}>{l.zona || '—'}</td>
                <td style={{ padding:'9px 10px' }}>
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:`${LCOL[l.estado]||'#888'}20`, color:LCOL[l.estado]||'#888', border:`1px solid ${LCOL[l.estado]||'#888'}44`, fontWeight:600 }}>
                    {l.estado}
                  </span>
                </td>
                <td style={{ padding:'9px 10px', textAlign:'center' }}>
                  <span style={{ fontSize:13, fontWeight:700, fontFamily:'DM Mono,monospace', color: l.dias_baja >= 21 ? '#f87171' : l.dias_baja >= 7 ? '#f59e0b' : 'var(--silver)' }}>
                    {l.dias_baja}d
                  </span>
                </td>
                <td style={{ padding:'9px 10px', fontFamily:'DM Mono,monospace', fontSize:11, color: l.fecha_alta ? '#4ade80' : '#f59e0b' }}>
                  {l.fecha_alta || (l.activa ? '⏳ activa' : '—')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid var(--mist)' }}>
              <td colSpan={4} style={{ padding:'10px 10px', fontSize:11, color:'var(--fog)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>Total acumulado</td>
              <td style={{ padding:'10px 10px', textAlign:'center' }}>
                <span style={{ fontSize:14, fontWeight:700, fontFamily:'DM Mono,monospace', color: alerta ? '#f87171' : 'var(--lime)' }}>{totalDias}d</span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function CambioCargaPanel() {
  const now = new Date()
  const defaultDesde = addDays(todayLocal(), -28)
  const [desde, setDesde] = useState(defaultDesde)
  const [hasta, setHasta] = useState(todayLocal())
  const [minEnt, setMinEnt] = useState(60)
  const [minPart, setMinPart] = useState(0)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'diario'|'semanal'>('diario')
  const [chartVar, setChartVar] = useState<string>('ua')
  const [gpsData, setGpsData] = useState<any>(null)

  const CHART_VARS_CALC = [
    { key:'ua',                label:'UA',            color:'#c8f135', src:'rpe' },
    { key:'uce',               label:'UCE',           color:'#f59e0b', src:'rpe' },
    { key:'rpe',               label:'RPE',           color:'#60a5fa', src:'rpe' },
    { key:'tiempo',            label:'Tiempo MIN',    color:'#34d399', src:'rpe' },
    { key:'calc_mMin',         label:'m/min (Int. Rel.)', color:'#84cc16', src:'calc' },
    { key:'calc_nSprints',     label:'N Sprint',      color:'#a78bfa', src:'calc' },
    { key:'calc_nAcel',        label:'ACE >2 m',      color:'#ec4899', src:'calc' },
    { key:'calc_nDecel',       label:'DEC >2 m',      color:'#14b8a6', src:'calc' },
    { key:'calc_nAcel3',       label:'ACE >3 n°',     color:'#f43f5e', src:'calc' },
    { key:'calc_nDecel3',      label:'DEC >3 n°',     color:'#0ea5e9', src:'calc' },
    { key:'calc_distMP',       label:'Alta Pot. m',   color:'#fb923c', src:'calc' },
    { key:'calc_distTotal',    label:'Dist. Total m', color:'#f59e0b', src:'calc' },
    { key:'calc_distSprint',   label:'Sprint (m)',    color:'#38bdf8', src:'calc' },
  ]
  const CHART_VARS_GPS = [
    { key:'rpe',         label:'RPE',           color:'#60a5fa', src:'gps' },
    { key:'distTotal',   label:'Dist. Total m',  color:'#fbbf24', src:'gps' },
    { key:'distPerMin',  label:'m/min',          color:'#84cc16', src:'gps' },
    { key:'distV4',      label:'Vel B4 m',       color:'#a78bfa', src:'gps' },
    { key:'distHir',     label:'HSR m',          color:'#f97316', src:'gps' },
    { key:'distV5',      label:'Vel B6 m',       color:'#e879f9', src:'gps' },
    { key:'maxVelocity', label:'Vel Max',        color:'#ef4444', src:'gps' },
    { key:'nSprintsGps', label:'N° Sprint',      color:'#22d3ee', src:'gps' },
    { key:'acc3',        label:'ACE >3 n',       color:'#ec4899', src:'gps' },
    { key:'dec3',        label:'DEC >3 n',       color:'#14b8a6', src:'gps' },
    { key:'playerLoad',  label:'Player Load',    color:'#fbbf24', src:'gps' },
  ]
  const CHART_VARS = [...CHART_VARS_CALC, ...CHART_VARS_GPS]

  async function load(d = desde, h = hasta, me = minEnt, mp = minPart) {
    setLoading(true)
    setData(null)
    setGpsData(null)
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/cambio-carga?desde=${d}&hasta=${h}&minEntrenamiento=${me}&minPartido=${mp}`),
        fetch(`/api/carga-gps?desde=${d}&hasta=${h}&ciclo=microciclo`),
      ])
      setData(await r1.json())
      setGpsData(await r2.json())
    } finally { setLoading(false) }
  }

  useEffect(() => { load(desde, hasta, minEnt, minPart) }, [desde, hasta, minEnt, minPart])

  const daily = data?.daily || []
  const weekly = data?.weekly || []
  const rows = view === 'diario' ? daily : weekly

  const pctColor = (pct: number | null) => {
    if (pct === null) return 'var(--silver)'
    if (pct > 15) return '#ef4444'          // rojo: >15%
    if (pct >= -5) return '#22c55e'         // verde: -5% a 15%
    return '#60a5fa'                        // azul: < -5%
  }

  const pctBg = (pct: number | null) => {
    if (pct === null) return 'transparent'
    if (pct > 15) return 'rgba(239,68,68,.1)'
    if (pct >= -5) return 'rgba(34,197,94,.1)'
    return 'rgba(96,165,250,.1)'
  }

  // Build GPS daily map from perSession (keyed by MD label) — we match by fecha
  const gpsDailyMap: Record<string,any> = {}
  const gpsPerSession = gpsData?.perSession || {}
  const gpsSesionesInfo = gpsData?.sesionesInfo || []
  gpsSesionesInfo.forEach((s:any) => {
    if (!s.fecha) return
    // Buscar por titulo primero, luego por fecha (cuando la sesión no tiene título asignado)
    const key = s.titulo || s.fecha
    const entry = gpsPerSession[key]
    if (!entry) return
    if (gpsDailyMap[s.fecha]) {
      // Acumular si hay 2+ sesiones el mismo día
      Object.keys(entry).forEach((k: string) => {
        if (typeof entry[k] === 'number') {
          gpsDailyMap[s.fecha][k] = (gpsDailyMap[s.fecha][k] || 0) + entry[k]
        }
      })
    } else {
      gpsDailyMap[s.fecha] = { ...entry }
    }
  })

  // Merge real GPS aggregates (dist_hir, dist_v4, dist_v5, max_velocity, dist_per_min, acc2, dec2)
  // from gpsPerMD into gpsDailyMap so GPS-source chart vars work correctly
  const gpsPerMDCC: Record<string,any[]> = gpsData?.gpsPerMD || {}
  const gpsSesInfoCC: any[] = gpsData?.sesionesInfo || []
  gpsSesInfoCC.forEach((s:any) => {
    if (!s.fecha || !s.titulo) return
    const mdPlayers: any[] = gpsPerMDCC[s.titulo] || []
    if (!mdPlayers.length) return
    const n = mdPlayers.length
    const avgField = (key: string) => {
      const vals = mdPlayers.map((p:any) => Number(p[key])||0).filter(x=>x>0)
      return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/n*10)/10 : 0
    }
    const realGps = {
      dist_total:   avgField('dist_total'),
      dist_hir:     avgField('dist_hir'),
      dist_v4:      avgField('dist_v4'),
      dist_v5:      avgField('dist_v5'),
      max_velocity: avgField('max_velocity'),
      dist_per_min: avgField('dist_per_min'),
      n_sprints:    avgField('n_sprints'),
      acc2_real:    avgField('acc2'),
      dec2_real:    avgField('dec2'),
      acc3_real:    avgField('acc3'),
      dec3_real:    avgField('dec3'),
      player_load:  avgField('player_load'),
    }
    if (gpsDailyMap[s.fecha]) {
      Object.assign(gpsDailyMap[s.fecha], realGps)
    } else {
      gpsDailyMap[s.fecha] = realGps
    }
  })

  // Also merge GPS data keyed by date (when GPS was imported without sesion_id link)
  // gpsPerMDCC may have keys like "2026-04-12" instead of "MD"
  Object.entries(gpsPerMDCC).forEach(([key, mdPlayers]: [string, any]) => {
    // Only process date-format keys (YYYY-MM-DD), not MD labels
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return
    const fecha = key
    const players = mdPlayers as any[]
    if (!players.length) return
    const n = players.length
    const avgField = (k: string) => {
      const vals = players.map((p:any) => Number(p[k])||0).filter(x=>x>0)
      return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/n*10)/10 : 0
    }
    const realGps = {
      dist_total:   avgField('dist_total'),
      dist_hir:     avgField('dist_hir'),
      dist_v4:      avgField('dist_v4'),
      dist_v5:      avgField('dist_v5'),
      max_velocity: avgField('max_velocity'),
      dist_per_min: avgField('dist_per_min'),
      n_sprints:    avgField('n_sprints'),
      acc2_real:    avgField('acc2'),
      dec2_real:    avgField('dec2'),
      acc3_real:    avgField('acc3'),
      dec3_real:    avgField('dec3'),
      player_load:  avgField('player_load'),
    }
    if (gpsDailyMap[fecha]) {
      Object.assign(gpsDailyMap[fecha], realGps)
    } else {
      gpsDailyMap[fecha] = realGps
    }
  })

  // Construir mapa semanal acumulando GPS por semana ISO (para vista semanal)
  const _fechaToWeekKey = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00Z')
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - day)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return `${d.getUTCFullYear()}-S${String(week).padStart(2, '0')}`
  }
  const gpsWeeklyMap: Record<string, any> = {}
  Object.entries(gpsDailyMap).forEach(([fecha, gps]) => {
    const wk = _fechaToWeekKey(fecha)
    if (!gpsWeeklyMap[wk]) {
      gpsWeeklyMap[wk] = { ...gps }
    } else {
      Object.keys(gps as any).forEach((k: string) => {
        if (typeof (gps as any)[k] === 'number') {
          gpsWeeklyMap[wk][k] = (gpsWeeklyMap[wk][k] || 0) + (gps as any)[k]
        }
      })
    }
  })

  const GPS_KEYS = ['distTotal','distHir','distV4','distV5','nSprintsGps','acc3','dec3','maxVelocity','distPerMin','playerLoad']
  // Keys as they appear in gpsDailyMap:
  // - camelCase calc keys: distTotal, distSprint, nSprints, nAcel, nDecel
  // - real GPS keys merged above: dist_hir, dist_v4, dist_v5, max_velocity, dist_per_min, acc2_real, dec2_real
  const GPS_FIELD_MAP: Record<string,string> = {
    distTotal:'dist_total',      distHir:'dist_hir',      distV4:'dist_v4',
    distV5:'dist_v5',            nSprintsGps:'n_sprints', acc3:'acc3_real',
    dec3:'dec3_real',            maxVelocity:'max_velocity',  distPerMin:'dist_per_min',
    playerLoad:'player_load',
  }
  const getRowVal = (row: any) => {
    if (chartVar === 'ua') return row.avg_ua||0
    if (chartVar === 'uce') return row.avg_uce||0
    if (chartVar === 'rpe') return row.avg_rpe||0
    if (chartVar === 'tiempo') {
      const rpe = row.avg_rpe || 0
      return rpe > 0 ? Math.round((row.avg_ua || 0) / rpe) : 0
    }
    if (chartVar.startsWith('calc_')) {
      const key = chartVar.replace('calc_','')
      // Mapeo directo desde gpsDailyMap (datos reales de sesión planificada)
      const SESSION_KEY_MAP: Record<string,string> = {
        distTotal: 'distTotal', distSprint: 'distSprint', nSprints: 'nSprints',
        nAcel: 'nAcel', nDecel: 'nDecel', distMP: 'distMP',
        nAcel3: 'nAcel3', nDecel3: 'nDecel3', mMin: 'mMin'
      }
      const sessionKey = SESSION_KEY_MAP[key]
      if (sessionKey) {
        if (view === 'diario') {
          const gps = gpsDailyMap[row.fecha]
          return gps ? Math.round(Number(gps[sessionKey]) || 0) : 0
        } else {
          const gps = gpsWeeklyMap[row.semana]
          return gps ? Math.round(Number(gps[sessionKey]) || 0) : 0
        }
      }
      return 0
    }
    if (GPS_KEYS.includes(chartVar)) {
      const field = GPS_FIELD_MAP[chartVar] || chartVar
      if (view === 'diario') {
        const gps = gpsDailyMap[row.fecha]
        return gps ? Math.round(Number(gps[field]) || 0) : 0
      } else {
        // Vista semanal: usar acumulado de los días de esa semana
        const gps = gpsWeeklyMap[row.semana]
        return gps ? Math.round(Number(gps[field]) || 0) : 0
      }
    }
    return 0
  }
  const maxUA = Math.max(...rows.map((r: any) => getRowVal(r)), 1)
  const chartColor = CHART_VARS.find(v=>v.key===chartVar)?.color || '#c8f135'

  // Recalculate pct_change based on the SELECTED variable (not always UA)
  // Compare each row to the last row that had a non-zero value
  const rowsWithPct = rows.map((row: any, i: number) => {
    const val = getRowVal(row)
    // Find the last PREVIOUS row that had training data (any non-zero value for this variable,
    // or fall back to any previous row if none has this variable data)
    let prevVal: number | null = null
    // First try: last row where this variable had data > 0
    for (let j = i - 1; j >= 0; j--) {
      const pv = getRowVal(rows[j])
      if (pv > 0) { prevVal = pv; break }
    }
    // If no previous row had this GPS variable > 0, but current > 0 → first occurrence
    // Check if there was ANY previous row at all (even with val=0)
    const hasPrevRow = i > 0
    let pct: number | null = null
    if (hasPrevRow) {
      if (prevVal === null && val > 0) {
        // Current is the first nonzero — compare to 0 = +100%
        pct = 100
      } else if (prevVal !== null) {
        if (prevVal > 0 && val === 0) pct = -100
        else if (prevVal > 0 && val > 0) pct = Math.round(((val - prevVal) / prevVal) * 100)
        // prevVal > 0 handled above; prevVal null already handled
      }
    }
    return { ...row, _pct: pct, _val: val }
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <PanelHeader 
          icon={Icons.velocimetro} 
          title="CAMBIO DE CARGA" 
          subtitle="CONTROL" 
          description={`Variación de UCE acumulada — jugadores con ≥${minEnt}min entrenamiento y ≥${minPart}min en partido`}
          color="#a855f7" 
        />
      </div>

      {/* Filters */}
      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[['desde','Desde',desde,setDesde,'date'],['hasta','Hasta',hasta,setHasta,'date']].map(([id,lbl,val,setter,type]: any)=>(
            <div key={id}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{lbl}</label>
              <input type={type} className="wp-input" style={{ width:160, padding:'8px 12px', fontSize:13 }} value={val} onChange={e=>setter(e.target.value)} />
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Min. Entrenamiento</label>
            <input type="number" min={0} max={180} className="wp-input" style={{ width:110, padding:'8px 12px', fontSize:13 }} value={minEnt} onChange={e=>setMinEnt(Number(e.target.value))} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>Min. Partido</label>
            <input type="number" min={0} max={120} className="wp-input" style={{ width:100, padding:'8px 12px', fontSize:13 }} value={minPart} onChange={e=>setMinPart(Number(e.target.value))} />
          </div>
          <button className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }} onClick={load}>Actualizar</button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display:'flex', gap:8 }}>
        {(['diario','semanal'] as const).map(v=>(
          <button className="hover-scale" key={v} onClick={()=>setView(v)} style={{ fontSize:12, padding:'7px 16px', borderRadius:10, cursor:'pointer', border: view===v?'2px solid var(--lime)':'1px solid var(--fog)', background: view===v?'rgba(200,241,53,.1)':'var(--ink2)', color: view===v?'var(--lime)':'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
            {v === 'diario' ? 'Por Día' : 'Por Semana'}
          </button>
        ))}
      </div>

      {/* Variable selector — dos grupos: Calculadora y GPS */}
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <div style={{ fontSize:10, color:'#c8f135', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:6 }}>🏋️ Calculadora</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CHART_VARS_CALC.map(v=>(
              <button className="hover-scale" key={v.key} onClick={()=>setChartVar(v.key as any)}
                style={{ fontSize:11, padding:'7px 16px', borderRadius:8, cursor:'pointer', textAlign:'center',
                  border:chartVar===v.key?`2px solid ${v.color}`:'1px solid var(--mist)',
                  background:chartVar===v.key?`${v.color}18`:'var(--ink2)',
                  color:chartVar===v.key?v.color:'var(--silver)',
                  fontWeight:chartVar===v.key?700:400 }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:10, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:6 }}>📡 GPS</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CHART_VARS_GPS.map(v=>(
              <button className="hover-scale" key={v.key} onClick={()=>setChartVar(v.key as any)}
                style={{ fontSize:11, padding:'7px 16px', borderRadius:8, cursor:'pointer', textAlign:'center',
                  border:chartVar===v.key?`2px solid ${v.color}`:'1px solid var(--mist)',
                  background:chartVar===v.key?`${v.color}18`:'var(--ink2)',
                  color:chartVar===v.key?v.color:'var(--silver)',
                  fontWeight:chartVar===v.key?700:400 }}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', paddingLeft:4 }}>
        {[['#22c55e','−5% a +15%: Normal'],['#ef4444','>+15%: Aumento alto'],['#60a5fa','<−5%: Reducción notable']].map(([c,l])=>(
          <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--silver)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:c }} />{l}
          </div>
        ))}
      </div>

      {loading
        ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
        : rows.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Sin datos para el período seleccionado.<br /><span style={{ fontSize:11 }}>Verificá que haya jugadores con ≥{minEnt}min entrenamiento y ≥{minPart}min en partido.</span></div>
          : <>
              {/* Summary cards */}
              {rowsWithPct.length >= 2 && (() => {
                const last = rowsWithPct[rowsWithPct.length - 1]
                const prev = rowsWithPct.slice(0, -1).reverse().find((r:any) => r._val > 0) || rowsWithPct[rowsWithPct.length - 2]
                const pct = last._pct
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
                    <div style={{ background:'var(--ink2)', border:`1px solid ${chartColor}33`, borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Último {CHART_VARS.find(v=>v.key===chartVar)?.label}</div>
                      <div className="display" style={{ fontSize:36, color:chartColor, lineHeight:1 }}>{getRowVal(last)}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>{view==='diario' ? last.fecha : last.label}</div>
                    </div>
                    <div style={{ background:pctBg(pct), border:`1px solid ${pctColor(pct)}44`, borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Cambio vs anterior</div>
                      <div className="display" style={{ fontSize:36, color:pctColor(pct), lineHeight:1 }}>{pct !== null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>{getRowVal(prev)} → {getRowVal(last)} {CHART_VARS.find(v=>v.key===chartVar)?.label}</div>
                    </div>
                    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Jugadores calificados</div>
                      <div className="display" style={{ fontSize:36, color:'var(--lime)', lineHeight:1 }}>{data?.qualifyingCount || 0}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>con ≥{minPart}min en partido</div>
                    </div>
                    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{view==='diario' ? 'Días' : 'Semanas'} con datos</div>
                      <div className="display" style={{ fontSize:36, color:'var(--snow)', lineHeight:1 }}>{rowsWithPct.length}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>{desde} – {hasta}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Bar chart */}
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:'16px 18px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
                  {CHART_VARS.find(v=>v.key===chartVar)?.label} — {view === 'diario' ? 'por día' : 'por semana'}
                </p>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:140, overflowX:'auto', paddingBottom:4 }}>
                  {rowsWithPct.map((row: any, i: number) => {
                    const h = Math.max(Math.round((row._val / maxUA) * 110), row._val > 0 ? 24 : 4)
                    const col = pctColor(row._pct)
                    const pctLabel = row._pct !== null ? `${row._pct > 0 ? '+' : ''}${row._pct}%` : ''
                    const label = view === 'diario'
                      ? row.fecha.slice(5) // MM-DD
                      : row.semana.replace(/\d{4}-/, '') // S01
                    return (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:view==='diario'?28:48, flex:'1 0 auto' }}>
                        <div title={`${row._val} ${CHART_VARS.find(v=>v.key===chartVar)?.label}${row._pct !== null ? ` (${pctLabel})` : ''}`}
                          style={{ position:'relative', width:'100%', height:h, background:chartColor, borderRadius:'4px 4px 0 0', opacity:.85, minHeight:4, transition:'height .2s', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {pctLabel && h >= 18 && (
                            <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:9, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap', textShadow:`0 1px 3px rgba(0,0,0,.8)` }}>
                              {pctLabel}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize:8, color:'var(--fog)', fontFamily:'DM Mono,monospace', whiteSpace:'nowrap', transform:'rotate(-35deg)', transformOrigin:'top center', marginTop:4 }}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Table */}
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns: view==='diario' ? '1fr 120px 120px 120px' : '1fr 1fr 120px 120px', gap:0, padding:'10px 18px', borderBottom:'1px solid var(--mist)' }}>
                  {(view==='diario'
                    ? ['Fecha','Jugadores', `Promedio ${CHART_VARS.find(v=>v.key===chartVar)?.label||'UCE'}`,'Cambio vs anterior']
                    : ['Semana','Etiqueta', `Promedio ${CHART_VARS.find(v=>v.key===chartVar)?.label||'UCE'}`,'Cambio vs anterior']
                  ).map(h=>(
                    <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
                  ))}
                </div>
                {rowsWithPct.map((row: any, i: number) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns: view==='diario' ? '1fr 120px 120px 120px' : '1fr 1fr 120px 120px', gap:0, padding:'11px 18px', borderBottom:i<rowsWithPct.length-1?'1px solid var(--mist)':'none', alignItems:'center' }}>
                    <span className="mono" style={{ fontSize:13, color:'var(--snow)' }}>
                      {view==='diario' ? row.fecha : row.semana}
                    </span>
                    {view === 'diario'
                      ? <span style={{ fontSize:11, color:'var(--silver)' }} title={row.players?.join(', ')}>
                          {row.count > 0 ? `${row.count} jugadores` : <span style={{ color:'var(--fog)', fontStyle:'italic' }}>Sin RPE</span>}
                        </span>
                      : <span style={{ fontSize:11, color:'var(--silver)' }}>{row.label}</span>
                    }
                    <span className="mono" style={{ fontSize:14, color: row.count > 0 ? chartColor : 'var(--fog)', fontWeight:600 }}>
                      {row.count > 0 ? <>{getRowVal(row)} <span style={{ fontSize:10, color:'var(--silver)', fontWeight:400 }}>{CHART_VARS.find(v=>v.key===chartVar)?.label}</span></> : '—'}
                    </span>
                    <span style={{ fontSize:13, fontWeight:700, color:pctColor(row._pct), background:pctBg(row._pct), padding:'3px 8px', borderRadius:6, display:'inline-block', fontFamily:'DM Mono,monospace' }}>
                      {row.count > 0 ? (row._pct !== null ? `${row._pct > 0 ? '+' : ''}${row._pct}%` : '—') : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Interpretation guide */}
              <div style={{ background:'rgba(200,241,53,.04)', border:'1px solid rgba(200,241,53,.12)', borderRadius:12, padding:'14px 18px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Guía de interpretación</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:6 }}>
                  {[
                    ['🔵','< −5%','Carga ha disminuido — posible descarga planificada'],
                    ['🟢','−5% a +15%','Carga normal — rango óptimo de progresión'],
                    ['🔴','> +15%','Aumento alto — riesgo de sobrecarga'],
                  ].map(([icon,pct,desc])=>(
                    <div key={pct} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                      <span style={{ fontSize:13 }}>{icon}</span>
                      <div>
                        <span className="mono" style={{ fontSize:11, color:'var(--snow)', fontWeight:600 }}>{pct}: </span>
                        <span style={{ fontSize:11, color:'var(--silver)' }}>{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
      }
    </div>
  )
}

// ── CALENDARIO PANEL ──────────────────────────────────────────────────────────

const OBJETIVOS_FISICOS = [
  'Introducción Aerobica',
  'Fuerza - Tensión',
  'Fuerza - Resistencia',
  'Resistencia - Duración',
  'Equilibrio - Regeneración',
  'Velocidad - Tappering',
  'Recuperación - Compensación',
  'Competición'
]
const OBJETIVOS_SECUNDARIOS = ['Táctico','Técnico','Técnico-Táctico']
const TITULOS_SESION = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']
const ENTRENAMIENTO_OPTIMIZADOR = {
  COMPETITIVO: ['PARTIDO COMPETICIÓN', 'PARTIDO AMISTOSO', 'PARTIDO ENTRENAMIENTO', 'PARTIDO SITUACIÓN 11c11-8c8', 'PARTIDO REDUCIDO 7c7-3c3'],
  ESPECIAL: ['JUEGO POSICIÓN GRANDE 8c8-11c11', 'JUEGO POSICIÓN REDUCIDO 7c7-3c3', 'EVOLUCIÓN CON OPOSICIÓN', 'ABP CON OPOSICIÓN', 'EVOLUCIÓN SIN OPOSICIÓN', 'ABP SIN OPOSICIÓN', 'RONDOS', 'TRANSICIONES']
}

const ENTRENAMIENTO_COADYUVANTE = {
  DIRIGIDO: ['CIRCUITO TÉCNICO CON FINALIZACIÓN', 'CIRCUITO DIRIGIDO CON FINALIZACIÓN', 'CIRCUITO TÉCNICO', 'CIRCUITO DIRIGIDO', 'JUEGO LÚDICO'],
  GENERAL: ['DOMINIO BALÓN', 'CIRCUITO PROPIOCEPCIÓN', 'CIRCUITO CONDICIONAL', 'ACTIVACIÓN NEUROMUSCULAR', 'CUALIDADES ESPECÍFICAS', 'PREVENTIVO', 'ESTRUCTURAL', 'RESTAURACIÓN']
}

const SUBTAREAS: Record<string, string[]> = {
  'PREVENTIVO': ['TRABAJO GRUPAL', 'TRABAJO INDIVIDUAL'],
  'ESTRUCTURAL': ['Adaptacion Anatómica', 'Hipertrofia Aplicada', 'Metabólico'],
  'CUALIDADES ESPECÍFICAS': ['Desplazamiento', 'Salto', 'Lucha', 'Acción de Juego']
}

const TODAS_LAS_NUEVAS = [...Object.values(ENTRENAMIENTO_OPTIMIZADOR).flat(), ...Object.values(ENTRENAMIENTO_COADYUVANTE).flat()]
const TAREAS_CON_ESPACIO = TODAS_LAS_NUEVAS
const TAREAS_CON_EQUIPO = TODAS_LAS_NUEVAS
const TAREAS_PARTIDO_SIMPLE = ['PARTIDO AMISTOSO','PARTIDO COMPETICIÓN','PARTIDO ENTRENAMIENTO']
const TAREAS_MOSTRAR_FORM = TODAS_LAS_NUEVAS

const NE_DEFAULT: Record<string, number> = {
  'PARTIDO COMPETICIÓN': 10, 'PARTIDO AMISTOSO': 9.5, 'PARTIDO ENTRENAMIENTO': 9, 'PARTIDO SITUACIÓN 11c11-8c8': 8.5, 'PARTIDO REDUCIDO 7c7-3c3': 8,
  'JUEGO POSICIÓN GRANDE 8c8-11c11': 7.5, 'JUEGO POSICIÓN REDUCIDO 7c7-3c3': 7, 'EVOLUCIÓN CON OPOSICIÓN': 6.5, 'ABP CON OPOSICIÓN': 6, 'EVOLUCIÓN SIN OPOSICIÓN': 5.5, 'ABP SIN OPOSICIÓN': 5, 'TRANSICIONES': 5, 'RONDOS': 4.5,
  'CIRCUITO TÉCNICO CON FINALIZACIÓN': 4, 'CIRCUITO DIRIGIDO CON FINALIZACIÓN': 3.5, 'CIRCUITO TÉCNICO': 3, 'CIRCUITO DIRIGIDO': 2.5, 'JUEGO LÚDICO': 2,
  'DOMINIO BALÓN': 1.5, 'CIRCUITO PROPIOCEPCIÓN': 1, 'CIRCUITO CONDICIONAL': 1, 'ACTIVACIÓN NEUROMUSCULAR': 1, 'CUALIDADES ESPECÍFICAS': 0.8, 'PREVENTIVO': 0.6, 'ESTRUCTURAL': 0.4, 'RESTAURACIÓN': 0.2
}
const TIPO_COLORES: Record<string, string> = { entrenamiento:'#c8f135', partido:'#3b82f6', recuperacion:'#f59e0b', descanso:'#555' }
const TIPO_ICONOS: Record<string, string> = { entrenamiento:'⚽', partido:'🏆', recuperacion:'🔄', descanso:'😴' }

// Map para formatear visualmente los MD.
const formatMD = (md: string, tipo?: string) => {
  if (tipo === 'descanso') {
    return `🔋 ${md && md.startsWith('MD') ? `${md} OFF` : md ? md : 'OFF'}`
  }
  return md
}

function getSesionStyle(s: any, withWidth = true) {
  const w = withWidth ? { width:'100%' } : {}
  if (s.tipo === 'descanso') {
    return {
      className: 'pulse-energy-lime',
      style: { display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, padding:'4px 10px', borderRadius:6, background:'rgba(200,241,53,.15)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.3)', fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer', ...w }
    }
  }
  if (s.tipo === 'partido' || s.titulo === 'MD') {
    return {
      className: 'pulse-energy-red',
      style: { display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, padding:'4px 10px', borderRadius:6, background:'rgba(239,68,68,.15)', color:'#f87171', border:'1px solid rgba(239,68,68,.3)', fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer', ...w }
    }
  }
  if ((s.titulo||'').startsWith('MD')) {
    return {
      className: 'pulse-energy-blue',
      style: { display:'flex', alignItems:'center', justifyContent:'center', gap:4, fontSize:11, padding:'4px 10px', borderRadius:6, background:'rgba(59,130,246,.15)', color:'#60a5fa', border:'1px solid rgba(59,130,246,.3)', fontWeight:800, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer', ...w }
    }
  }
  return {
    className: '',
    style: { display:'flex', alignItems:'center', justifyContent:'center', gap:3, fontSize:10, padding:'4px 10px', borderRadius:6, background:`${TIPO_COLORES[s.tipo]||'#888'}22`, color:TIPO_COLORES[s.tipo]||'#888', border:`1px solid ${TIPO_COLORES[s.tipo]||'#888'}44`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer', ...w }
  }
}

// Helper: normaliza subtareas (retrocompat string → array)
function getSubtareasArr(bl: any): string[] {
  if (Array.isArray(bl.subtareas) && bl.subtareas.length > 0) return bl.subtareas
  if (typeof bl.subtarea === 'string' && bl.subtarea) return [bl.subtarea]
  return []
}
function getSubtareasDisplay(bl: any): string {
  return getSubtareasArr(bl).join(', ')
}

// Helper: calcula tiempo agrupando tareas simultáneas (Math.max en vez de suma)
function calcTiempoConSimultaneas(bloques: any[]): { tiempoTrabajo: number; tiempoDescanso: number } {
  let tiempoTrabajo = 0, tiempoDescanso = 0
  let i = 0
  while (i < bloques.length) {
    const bl = bloques[i]
    const s = Number(bl.series) || 0, m = Number(bl.minutos) || 0, p = Number(bl.pausa) || 0
    let groupTrabajo = s * m
    let groupDescanso = Math.max(0, s - 1) * p
    // Agrupar tareas simultáneas consecutivas
    let j = i + 1
    while (j < bloques.length && bloques[j].simultanea) {
      const blj = bloques[j]
      const sj = Number(blj.series) || 0, mj = Number(blj.minutos) || 0, pj = Number(blj.pausa) || 0
      groupTrabajo = Math.max(groupTrabajo, sj * mj)
      groupDescanso = Math.max(groupDescanso, Math.max(0, sj - 1) * pj)
      j++
    }
    tiempoTrabajo += groupTrabajo
    tiempoDescanso += groupDescanso
    i = j
  }
  return { tiempoTrabajo, tiempoDescanso }
}

function horasEntre(fechaA: string, horaA: string|null, fechaB: string, horaB: string|null): number|null {
  if (!fechaA || !fechaB) return null
  const dtA = new Date(`${fechaA}T${horaA||'20:00'}:00`)
  const dtB = new Date(`${fechaB}T${horaB||'09:00'}:00`)
  return Math.round((dtB.getTime() - dtA.getTime()) / 3600000)
}

function RecuperacionBadge({ horas }: { horas: number|null }) {
  if (horas === null || horas <= 0) return null
  const col = horas < 24 ? '#ef4444' : horas < 48 ? '#f59e0b' : '#22c55e'
  const label = horas < 24 ? '⚠ RIESGO' : horas < 48 ? '⚡ AJUSTADO' : '✓ OK'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:col, background:`${col}18`, border:`1px solid ${col}44`, borderRadius:6, padding:'2px 7px', fontWeight:700, fontFamily:'DM Mono,monospace' }}>
      {label} · {horas}h recup.
    </div>
  )
}

function CalendarioPanel({ teamData }) {
  const now = new Date()
  const [viewMode, setViewMode] = useState<'mes'|'semana'>('mes')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d
  })
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string|null>(null)
  const [editSesion, setEditSesion] = useState<any|null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [canchas, setCanchas] = useState<any[]>([])
  const [fuerzaMandamientos, setFuerzaMandamientos] = useState<any[]>([])

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

  useEffect(() => { load() }, [year, month, weekStart, viewMode])

  async function load() {
    setLoading(true)
    let desde: string, hasta: string, fetchDesde: string
    if (viewMode === 'mes') {
      desde = `${year}-${String(month+1).padStart(2,'0')}-01`
      const lastDay = new Date(year, month+1, 0).getDate()
      hasta = `${year}-${String(month+1).padStart(2,'0')}-${lastDay}`
      
      const d = new Date(year, month, 1)
      d.setDate(d.getDate() - 7)
      fetchDesde = localDateStr(d)
    } else {
      const ws = new Date(weekStart)
      const we = new Date(weekStart); we.setDate(we.getDate() + 6)
      desde = localDateStr(ws)
      hasta = localDateStr(we)
      
      const d = new Date(ws)
      d.setDate(d.getDate() - 7)
      fetchDesde = localDateStr(d)
    }
    try {
      const [rc, rg, rMand] = await Promise.all([
        fetch(`/api/calendario?desde=${fetchDesde}&hasta=${hasta}`),
        fetch(`/api/carga-gps?desde=${fetchDesde}&hasta=${hasta}&ciclo=microciclo`),
        fetch(`/api/fuerza/mandamientos`)
      ])
      const calendData = await rc.json()
      const gpsData = await rg.json().catch(() => ({}))
      const mandData = await rMand.json().catch(() => ({}))
      
      setData({ ...calendData, perSession: gpsData?.perSession, perSessionTeamAvg: gpsData?.perSessionTeamAvg, gpsPerMD: gpsData?.gpsPerMD })
      if (mandData.mandamientos) setFuerzaMandamientos(mandData.mandamientos)
      
      const rcCanchas = await fetch('/api/canchas')
      const dc = await rcCanchas.json()
      setCanchas(Array.isArray(dc) ? dc : [])
    } catch {}
    setLoading(false)
  }

  function prevNav() {
    if (viewMode === 'mes') {
      if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1)
    } else {
      setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n })
    }
  }
  function nextNav() {
    if (viewMode === 'mes') {
      if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1)
    } else {
      setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n })
    }
  }

  const sesiones: any[] = data?.sesiones || []
  const logs: any[] = data?.logs || []

  // Deduplicate partidos (partido_logs) against sesiones_plan partido entries —
  // if a sesiones_plan entry already exists for the same date with tipo='partido',
  // don't show the partido_logs entry as a separate event (avoids double entry in calendar)
  const sesionPartidoFechas = new Set(
    sesiones.filter((s:any) => s.tipo === 'partido').map((s:any) => s.fecha)
  )
  const partidos: any[] = (data?.partidos || []).filter(
    (p:any) => !sesionPartidoFechas.has(p.fecha)
  )

  function eventosDelDia(fecha: string) {
    return {
      sesiones: sesiones.filter(s => s.fecha === fecha),
      partidos: partidos.filter(p => p.fecha === fecha),
      log: logs.find(l => l.fecha === fecha) || null,
    }
  }

  // Calcular recuperación entre días consecutivos con eventos
  function calcRecuperacion(fechaA: string, fechaB: string) {
    const sesA = sesiones.filter(s=>s.fecha===fechaA)
    const sesB = sesiones.filter(s=>s.fecha===fechaB)
    const partA = partidos.find(p=>p.fecha===fechaA)
    const partB = partidos.find(p=>p.fecha===fechaB)
    const lastA = partA ? { fecha:fechaA, hora: partA.hora_inicio || null } 
                       : sesA.length ? { fecha:fechaA, hora: sesA[sesA.length-1].hora_fin || null } : null
    const firstB = partB ? { fecha:fechaB, hora: partB.hora_inicio || null }
                        : sesB.length ? { fecha:fechaB, hora: sesB[0].hora_inicio || null } : null
    if (!lastA || !firstB) return null
    return horasEntre(lastA.fecha, lastA.hora, firstB.fecha, firstB.hora)
  }

  // Generate days for month view
  function getDiasMes() {
    const firstDay = new Date(year, month, 1).getDay() // 0=Sun
    const offset = firstDay === 0 ? 6 : firstDay - 1   // Mon-start offset
    const daysInMonth = new Date(year, month+1, 0).getDate()
    const days: (string|null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
    }
    while (days.length % 7 !== 0) days.push(null)
    return days
  }

  // Generate days for week view
  function getDiasSemana() {
    return Array.from({length:7}, (_,i) => {
      const d = new Date(weekStart); d.setDate(d.getDate()+i)
      return localDateStr(d)
    })
  }

  const today = todayLocal()
  const diasMes = viewMode === 'mes' ? getDiasMes() : []
  const diasSemana = viewMode === 'semana' ? getDiasSemana() : []

  // All event days sorted for recovery calculation
  const allEventDays = [...new Set([
    ...sesiones.filter(s => s.tipo !== 'descanso').map(s=>s.fecha),
    ...partidos.map(p=>p.fecha),
  ])].sort()

  // 1. Calcular volumen relativo de cada sesión (para semáforo)
  const sessionVolMap = new Map<number, number>()
  const orderedSesiones = [...sesiones].sort((a,b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha)
    return (a.hora_inicio || '').localeCompare(b.hora_inicio || '')
  })

  orderedSesiones.forEach(s => {
      let volRelativo = 0
      const mdLabel = (s.titulo || s.tipo).trim()
      
      const isEmpty = s.tipo !== 'partido' && (!s.ejercicios || s.ejercicios.length === 0)
      
      if (!isEmpty) {
        // Intentar calcular usando datos reales de GPS (gpsPerMD)
        const rows = data?.gpsPerMD?.[mdLabel] || []
        if (rows.length > 0) {
          const getAvg = (k) => {
            const vals = rows.map(p => Number(p[k])||0).filter(x => x > 0)
            return vals.length ? vals.reduce((sum, x) => sum + x, 0) / vals.length : 0
          }
          
          const dTotal = getAvg('dist_total')
          const dPerMin = getAvg('dist_per_min')
          const activeMin = (dTotal > 0 && dPerMin > 0) ? (dTotal / dPerMin) : (getAvg('duracion_min') || 1)
          
          const metMin = dPerMin > 0 ? dPerMin : (dTotal / activeMin)
          
          const dSprint = getAvg('dist_v5') || getAvg('dist_hir') || 0
          const sprintMin = dSprint / activeMin
          
          const nSprint = getAvg('n_sprints') || 0
          const nSprintMin = nSprint / activeMin
          
          const acc2 = getAvg('acc2'); const acc3 = getAvg('acc3')
          const dec2 = getAvg('dec2'); const dec3 = getAvg('dec3')
          const accTotal = getAvg('acc_total'); const decTotal = getAvg('dec_total')
          const accel = accTotal || acc2 || 0
          const decel = decTotal || dec2 || 0
          const acelDecelMin = (accel + decel) / activeMin
          
          volRelativo = metMin + sprintMin + nSprintMin + acelDecelMin
        }
        
        // Si no hay datos GPS reales, intentar con los datos planificados
        if (volRelativo === 0) {
          const m = data?.perSession?.[mdLabel] || {}
          const mt = data?.perSessionTeamAvg?.[mdLabel] || {}
          const dTotal = Number(m.distTotal)||Number(mt.distTotal)||0
          const dPerMin = Number(m.distPerMin)||Number(mt.distPerMin)||0
          const activeMin = (dTotal>0 && dPerMin>0) ? (dTotal/dPerMin) : (Number(m.minActivo)||Number(mt.minActivo)||1)
          
          const distTot = Number(m.distTotal)||Number(mt.distTotal)||0
          const v4 = Number(m.distV4)||Number(mt.distV4)||0
          const v5 = Number(m.distV5)||Number(mt.distV5)||0
          const nSprints = Number(m.nSprints)||Number(mt.nSprints)||0
          const accDec = (Number(m.nAcel)||Number(mt.nAcel)||0) + (Number(m.nDecel)||Number(mt.nDecel)||0) + (Number(m.nAcel3)||Number(mt.nAcel3)||0) + (Number(m.nDecel3)||Number(mt.nDecel3)||0)
      
          if (activeMin > 0) {
            volRelativo = (distTot + v4 + v5 + nSprints + accDec) / activeMin
          }
        }
      }
      
      sessionVolMap.set(s.id, volRelativo)
    })
  
    // Arrows logic
    const sessionArrowMap = new Map<number, 'UP'|'DOWN'|'EQUAL'>()
    const validSesiones = orderedSesiones.filter(s => s.tipo !== 'descanso' && (sessionVolMap.get(s.id) || 0) > 0)
    for (let i = 1; i < validSesiones.length; i++) {
    const prev = validSesiones[i-1]
    const curr = validSesiones[i]
    const prevVol = sessionVolMap.get(prev.id) || 0
    const currVol = sessionVolMap.get(curr.id) || 0
    
    // threshold: 5% difference is considered a change, else equal.
    if (currVol > prevVol * 1.05) sessionArrowMap.set(curr.id, 'UP')
    else if (currVol < prevVol * 0.95) sessionArrowMap.set(curr.id, 'DOWN')
    else sessionArrowMap.set(curr.id, 'EQUAL')
  }

  // 2. Calcular distribución de tareas (Optimizador vs Coadyuvante) para el período actual
  const visibleDays = viewMode === 'mes' ? diasMes.filter(Boolean) : diasSemana
  let totalOptimizadorMin = 0
  let totalCoadyuvanteMin = 0
  const optimizadorEspecial: Record<string, number> = {}
  const optimizadorCompetitivo: Record<string, number> = {}
  const coadyuvanteGeneral: Record<string, number> = {}
  const coadyuvanteDirigido: Record<string, number> = {}
  const ejesDetalle: Record<string, number> = {}

  sesiones.forEach(s => {
    if (!visibleDays.includes(s.fecha)) return
    if (!s.ejercicios) return
    s.ejercicios.forEach((bl:any) => {
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
          const m = fuerzaMandamientos.find(fm => fm.id === eId)
          if (m) {
            const mName = `M${m.numero}. ${m.nombre.split(' (')[0]}`
            ejesDetalle[mName] = (ejesDetalle[mName] || 0) + (mins / (ejes.length || 1))
          }
        })
      } else {
        // Fallback for old sessions that don't have tipo_entrenamiento.
        let fallbackName = tName
        const nameUpper = tName.toUpperCase()
        
        if (nameUpper.includes('ACTIVACIÓN EN CAMPO') || nameUpper.includes('ACTIVACION EN CAMPO') || nameUpper.includes('ACTIVACIÓN EN GIMNASIO') || nameUpper.includes('ACTIVACION EN GIMNASIO')) {
          fallbackName = 'ACTIVACIÓN NEUROMUSCULAR'
        } else if (nameUpper.includes('FUERZA ESTRUCTURAL')) {
          fallbackName = 'ESTRUCTURAL'
        } else if (nameUpper.includes('PARTIDO REDUCIDO')) {
          fallbackName = 'PARTIDO REDUCIDO 7c7-3c3'
        }
        
        const fbUpper = fallbackName.toUpperCase()
        
        if (ENTRENAMIENTO_OPTIMIZADOR.COMPETITIVO.includes(fbUpper) || fbUpper.includes('PARTIDO')) {
          totalOptimizadorMin += mins; optimizadorCompetitivo[fallbackName] = (optimizadorCompetitivo[fallbackName] || 0) + mins;
        } else if (ENTRENAMIENTO_OPTIMIZADOR.ESPECIAL.includes(fbUpper) || fbUpper.includes('POSESION') || fbUpper.includes('POSESIÓN') || fbUpper.includes('RUEDA') || fbUpper.includes('TRANSICION') || fbUpper.includes('TRANSICIÓN') || fbUpper.includes('ANALITICO') || fbUpper.includes('ANALÍTICO') || fbUpper.includes('RONDO') || fbUpper.includes('EVOLUCION') || fbUpper.includes('EVOLUCIÓN')) {
          totalOptimizadorMin += mins; optimizadorEspecial[fallbackName] = (optimizadorEspecial[fallbackName] || 0) + mins;
        } else if (ENTRENAMIENTO_COADYUVANTE.DIRIGIDO.includes(fbUpper) || fbUpper.includes('LUDICO') || fbUpper.includes('LÚDICO') || fbUpper.includes('BALON') || fbUpper.includes('BALÓN') || fbUpper.includes('DIRIGIDO')) {
          totalCoadyuvanteMin += mins; coadyuvanteDirigido[fallbackName] = (coadyuvanteDirigido[fallbackName] || 0) + mins;
        } else if (ENTRENAMIENTO_COADYUVANTE.GENERAL.includes(fbUpper) || fbUpper.includes('ACTIVACION') || fbUpper.includes('ACTIVACIÓN') || fbUpper.includes('FUERZA') || fbUpper.includes('PREVENTIVO') || fbUpper.includes('ESTRUCTURAL') || fbUpper.includes('GIMNASIO') || fbUpper.includes('PROPIOCEPCION')) {
          totalCoadyuvanteMin += mins; coadyuvanteGeneral[fallbackName] = (coadyuvanteGeneral[fallbackName] || 0) + mins;
          
          // Ejes for old gym tasks
          let subtareas = getSubtareasArr(bl)
          if (subtareas.length === 0) subtareas = [bl.ventana || 'Sin especificar']
          subtareas.forEach(st => {
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
          // If totally unknown, default to Especial
          totalOptimizadorMin += mins; optimizadorEspecial[fallbackName] = (optimizadorEspecial[fallbackName] || 0) + mins;
        }
      }
    })
  })
  
  const totalMin = totalOptimizadorMin + totalCoadyuvanteMin
  const pctOptimizador = totalMin > 0 ? Math.round((totalOptimizadorMin/totalMin)*100) : 0
  const pctCoadyuvante = totalMin > 0 ? Math.round((totalCoadyuvanteMin/totalMin)*100) : 0
  
  const optEspecialSorted = ENTRENAMIENTO_OPTIMIZADOR.ESPECIAL.map(k => [k, optimizadorEspecial[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
  const optCompSorted = ENTRENAMIENTO_OPTIMIZADOR.COMPETITIVO.map(k => [k, optimizadorCompetitivo[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
  const coadGenSorted = ENTRENAMIENTO_COADYUVANTE.GENERAL.map(k => [k, coadyuvanteGeneral[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
  const coadDirSorted = ENTRENAMIENTO_COADYUVANTE.DIRIGIDO.map(k => [k, coadyuvanteDirigido[k] || 0] as [string, number]).sort((a,b)=>b[1]-a[1])
  const ejesSorted = fuerzaMandamientos.map(m => {
    const mName = `M${m.numero}. ${m.nombre.split(' (')[0]}`
    return [mName, ejesDetalle[mName] || 0] as [string, number]
  }).sort((a,b)=>b[1]-a[1])

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      
        <style>{`
          @keyframes growUpAnim { from { transform: scaleY(0); } to { transform: scaleY(1); } }
          @keyframes fadeUpAnim { from { opacity: 0; transform: translateY(10px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
          @keyframes fadeInAnim { from { opacity: 0; } to { opacity: 1; } }
          .anim-grow-up { transform-origin: bottom; animation: growUpAnim 15s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform: scaleY(0); }
          .anim-fade-up { animation: fadeUpAnim 15s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
          .anim-fade-in { animation: fadeInAnim 15s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        
          .pause-animations .anim-grow-up,
          .pause-animations .anim-fade-up,
          .pause-animations .anim-fade-in,
          .pause-animations .anim-bar { animation: none !important; opacity: 0 !important; }
          .pause-animations .anim-grow-up { transform: scaleY(0) !important; }
          .pause-animations .anim-bar { transform: scaleX(0) !important; }
        `}</style>
        {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <PanelHeader 
            icon={Icons.planificacion} 
            title="PLANIFICACIÓN" 
            subtitle="MENSUAL" 
            description="Planificación de sesiones y recuperación"
            color="#a855f7" 
          />
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button className="hover-scale" onClick={async()=>{
            if (!confirm('⚠️ BORRAR TODO\n\nEsto eliminará TODAS las sesiones del calendario de este club.\n\nNo se puede deshacer. ¿Confirmar?')) return
            try {
              const r = await fetch('/api/calendario?all=true', { method: 'DELETE' })
              if (r.ok) { await load() }
              else { const b = await r.json().catch(()=>({})); alert('Error: ' + (b?.error||r.status)) }
            } catch { alert('Error de red.') }
          }} style={{ fontSize:12, padding:'10px 18px', borderRadius:8, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', cursor:'pointer' }}>🗑 Borrar todo</button>
          <button className="hover-scale" onClick={()=>{setEditSesion(null);setShowEditor(true)}} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nueva sesión</button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
        {Object.entries(TIPO_COLORES).map(([tipo,col])=>(
          <div key={tipo} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--silver)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:col }} />
            {TIPO_ICONOS[tipo]} {tipo.charAt(0).toUpperCase()+tipo.slice(1)}
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--silver)' }}>
          <div style={{ width:10, height:10, borderRadius:2, background:'#ef4444' }} />⚠ &lt;24h recuperación
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', gap:4, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:3 }}>
          {(['mes','semana'] as const).map(v=>(
            <button className="hover-scale" key={v} onClick={()=>setViewMode(v)} style={{ padding:'6px 18px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, border:'none', background:viewMode===v?'var(--lime)':'transparent', color:viewMode===v?'var(--ink)':'var(--silver)', transition:'all .12s', textTransform:'capitalize' }}>{v}</button>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={prevNav} className="btn-ghost" style={{ padding:'6px 12px', fontSize:16 }}>‹</button>
          <span style={{ fontSize:15, fontWeight:700, color:'var(--snow)', minWidth:180, textAlign:'center' }}>
            {viewMode==='mes' ? `${MESES[month]} ${year}` : (() => {
              const we = new Date(weekStart); we.setDate(we.getDate()+6)
              return `${weekStart.toLocaleDateString('es',{day:'2-digit',month:'short'})} – ${we.toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'})}`
            })()}
          </span>
          <button onClick={nextNav} className="btn-ghost" style={{ padding:'6px 12px', fontSize:16 }}>›</button>
        </div>
        <button className="hover-scale" onClick={()=>{ const d=new Date(); setYear(d.getFullYear()); setMonth(d.getMonth()); setWeekStart(()=>{ const w=new Date(); w.setDate(w.getDate()-w.getDay()+1); return w }); }} className="btn-ghost" style={{ fontSize:11, padding:'6px 12px' }}>Hoy</button>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
      ) : viewMode === 'mes' ? (
        <>
          {/* DISTRIBUCION DE CARGA MENSUAL */}
          {(() => {
             const monthStart = `${year}-${String(month+1).padStart(2,'0')}-01`
             const lastDay = new Date(year, month+1, 0).getDate()
             const monthEnd = `${year}-${String(month+1).padStart(2,'0')}-${lastDay}`

             const orientacionCounts: Record<string, number> = { 'A-R': 0, 'Fuerza': 0, 'Resistencia': 0, 'Velocidad': 0 }
             let totalBloquesOrientacion = 0
             
             sesiones.forEach((s: any) => {
                if (s.fecha >= monthStart && s.fecha <= monthEnd && Array.isArray(s.ejercicios)) {
                  s.ejercicios.forEach((ej: any) => {
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
                    if (ori !== 'S/D' && orientacionCounts[ori] !== undefined) {
                      orientacionCounts[ori]++
                      totalBloquesOrientacion++
                    }
                  })
                }
             })

             const orientacionMensualData = totalBloquesOrientacion > 0 ? Object.entries(orientacionCounts)
               .filter(([k, v]) => v > 0)
               .map(([k, v]) => ({ name: k, value: v, percent: Math.round((v / totalBloquesOrientacion) * 100) })) : []

             if (orientacionMensualData.length === 0) return null

             return (
               <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20, marginBottom:20 }}>
                 <CuadroHeader title="DISTRIBUCIÓN DE CARGA MENSUAL" subtitle="Orientación Física" icon={Icons.metricas || '📊'} description="Porcentaje de tareas asignadas a cada cualidad física en el mes seleccionado." />
                 <div style={{ width: '100%', height: 24, display:'flex', borderRadius:4, overflow:'hidden', gap:1 }}>
                    {orientacionMensualData.map(d => (
                      <div key={d.name} title={`${d.name}: ${d.value} tareas (${d.percent}%)`} style={{ width: `${d.percent}%`, background: d.name==='A-R'?'#10b981':d.name==='Fuerza'?'#a855f7':d.name==='Resistencia'?'#f59e0b':d.name==='Velocidad'?'#3b82f6':'var(--mist)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white', transition:'width 0.3s' }}>
                        {d.percent >= 3 ? `${d.percent}%` : ''}
                      </div>
                    ))}
                 </div>
                 <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap', justifyContent:'center' }}>
                    {orientacionMensualData.map(d => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--silver)', fontWeight:600 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background: d.name==='A-R'?'#10b981':d.name==='Fuerza'?'#a855f7':d.name==='Resistencia'?'#f59e0b':d.name==='Velocidad'?'#3b82f6':'var(--mist)' }} />
                        {d.name} ({d.value})
                      </div>
                    ))}
                 </div>
               </div>
             )
          })()}

        {/* ── VISTA MENSUAL ── */}
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16 }}>
          {/* Day headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:'1px solid var(--mist)' }}>
            {DIAS.map(d=>(
              <div key={d} style={{ padding:'8px 0', textAlign:'center', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{d}</div>
            ))}
          </div>
          {/* Days grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
            {diasMes.map((fecha, idx) => {
              if (!fecha) return <div key={idx} style={{ minHeight:100, borderRight:'1px solid var(--mist)', borderBottom:'1px solid var(--mist)', background:'var(--ink3)', opacity:.3 }} />
              const { sesiones:ses, partidos:parts, log } = eventosDelDia(fecha)
              const isToday = fecha === today
              const dayNum = parseInt(fecha.split('-')[2])
              const isWeekend = [5,6].includes(idx % 7) // Sáb, Dom

              // Recovery alert from previous event day
              const prevEventDay = allEventDays[allEventDays.indexOf(fecha)-1]
              const recup = prevEventDay ? calcRecuperacion(prevEventDay, fecha) : null
              const hasEvents = ses.filter((s:any) => s.tipo !== 'descanso').length > 0 || parts.length > 0
              const recupAlert = hasEvents && recup !== null && recup < 48

              // Find rival logo for partido display
              const rivalFoto = ses.find((s:any) => s.tipo === 'partido' && s.rival_foto)?.rival_foto
                || parts.find((p:any) => p.rival_foto)?.rival_foto || null
              const isPartidoDay = rivalFoto || ses.some((s:any) => s.tipo === 'partido') || parts.length > 0

              return (
                <div key={fecha}
                  onClick={() => { const next=selectedDay===fecha?null:fecha; setSelectedDay(next); setShowEditor(false); setEditSesion(null) }}
                  style={{
                    minHeight:100, borderRight:'1px solid var(--mist)', borderBottom:'1px solid var(--mist)',
                    padding:6, cursor:'pointer', transition:'background .12s',
                    background: selectedDay===fecha ? 'rgba(200,241,53,.06)' : isWeekend ? 'rgba(255,255,255,.01)' : 'transparent',
                    border: isToday ? '2px solid var(--lime)' : undefined,
                    position:'relative', overflow:'hidden',
                  }}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,.04)'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=selectedDay===fecha?'rgba(200,241,53,.06)':isWeekend?'rgba(255,255,255,.01)':'transparent'}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:isToday?700:500, color:isToday?'var(--lime)':'var(--snow)', fontFamily:'DM Mono,monospace' }}>{dayNum}</span>
                    {recupAlert && recup !== null && (
                      <span title={`${recup}h de recuperación`} style={{ fontSize:9, background: recup<24?'rgba(239,68,68,.15)':'rgba(245,158,11,.15)', color:recup<24?'#f87171':'#fbbf24', border:`1px solid ${recup<24?'rgba(239,68,68,.4)':'rgba(245,158,11,.4)'}`, borderRadius:4, padding:'1px 4px', fontWeight:700 }}>
                        ⚠{recup}h
                      </span>
                    )}
                  </div>

                  {/* Si hay partido con escudo: escudo arriba, texto abajo */}
                  {isPartidoDay && rivalFoto ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'flex-start' }}>
                      {/* Escudo rival centrado arriba */}
                      <div style={{ width:'100%', display:'flex', justifyContent:'center', marginBottom:2 }}>
                        <div style={{ width:58, height:58, display:'flex', alignItems:'center', justifyContent:'center',
                          background:'rgba(59,130,246,.08)', borderRadius:8, border:'1px solid rgba(59,130,246,.2)', padding:3 }}>
                          <img src={rivalFoto} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="" />
                        </div>
                      </div>
                      {/* Eventos debajo */}
                      {ses.map(s=>{
                        const sProps = getSesionStyle(s, true);
                        return (
                        <div key={s.id} onClick={e=>{e.stopPropagation();setEditSesion(s);setShowEditor(true)}} className={sProps.className} style={{...sProps.style, flexDirection:'column', gap:0, padding:(s.hora_inicio || s.objetivo) ? '4px 6px' : sProps.style.padding, alignItems:'stretch', whiteSpace:'normal'}}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                            {s.tipo==='partido' && s.rival_foto && <img src={s.rival_foto} style={{ width:14, height:14, objectFit:'contain', borderRadius:2, flexShrink:0 }} alt="" />}
                            {s.tipo==='partido'
                              ? <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{TIPO_ICONOS[s.tipo]} {s.rival ? `vs ${s.rival}` : formatMD(s.titulo||'Partido', s.tipo)}</span>
                              : <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.tipo !== 'descanso' && !((s.titulo||s.tipo).startsWith('MD')) ? TIPO_ICONOS[s.tipo] + ' ' : null}{formatMD(s.titulo||s.tipo, s.tipo)}</span>
                            }
                            {sessionArrowMap.get(s.id) === 'UP' && <span style={{color:'#ef4444', marginLeft:4}}>▲</span>}
                            {sessionArrowMap.get(s.id) === 'DOWN' && <span style={{color:'#10b981', marginLeft:4}}>▼</span>}
                            {sessionArrowMap.get(s.id) === 'EQUAL' && <span style={{color:'#fbbf24', marginLeft:4}}>▬</span>}
                            
                          </div>
                          {(s.hora_inicio || s.objetivo) && (
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:2, borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:2 }}>
                              {s.hora_inicio && <span style={{ fontSize:9, color:'rgba(255,255,255,0.7)', lineHeight:1, fontWeight:600 }}>{s.hora_inicio.slice(0,5)}</span>}
                              {s.objetivo && (
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                                  {getObjetivoIcon(s.objetivo)}
                                  <span style={{ fontSize:8, color:'rgba(255,255,255,0.95)', lineHeight:1.1, fontWeight:800, textAlign:'center', marginTop:1, textTransform:'uppercase' }}>{s.objetivo}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )})}
                      {parts.map((p,i)=>(
                        <div key={i} style={{ fontSize:10, padding:'2px 5px', borderRadius:4, width:'100%', background:'rgba(59,130,246,.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          🏆 {p.rival||'Partido'}
                        </div>
                      ))}
                      {log && (() => {
                        const rpe = Number(log.avg_rpe || log.max_rpe) || 0
                        const borgCol = rpe <= 2 ? '#22c55e' : rpe <= 4 ? '#a3e635' : rpe <= 6 ? '#eab308' : rpe <= 8 ? '#f97316' : '#ef4444'
                        return rpe > 0 ? (
                          <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, padding:'1px 5px', borderRadius:3, background:`${borgCol}20`, color:borgCol, border:`1px solid ${borgCol}44`, fontWeight:700 }}>
                            RPE <span style={{ fontSize:11 }}>{rpe % 1 === 0 ? rpe : rpe.toFixed(1)}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  ) : (
                    /* Layout normal sin partido */
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {ses.map(s=>{
                        const sProps = getSesionStyle(s, false);
                        return (
                        <div key={s.id} onClick={e=>{e.stopPropagation();setEditSesion(s);setShowEditor(true)}} className={sProps.className} style={{...sProps.style, flexDirection:'column', gap:0, padding:(s.hora_inicio || s.objetivo) ? '4px 6px' : sProps.style.padding, alignItems:'stretch', whiteSpace:'normal'}}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                            {s.tipo==='partido' && s.rival_foto && <img src={s.rival_foto} style={{ width:14, height:14, objectFit:'contain', borderRadius:2, flexShrink:0 }} alt="" />}
                            {s.tipo==='partido'
                              ? <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{TIPO_ICONOS[s.tipo]} {s.rival ? `vs ${s.rival}` : formatMD(s.titulo||'Partido', s.tipo)}</span>
                              : <span style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{s.tipo !== 'descanso' && !((s.titulo||s.tipo).startsWith('MD')) ? TIPO_ICONOS[s.tipo] + ' ' : null}{formatMD(s.titulo||s.tipo, s.tipo)}</span>
                            }
                            {sessionArrowMap.get(s.id) === 'UP' && <span style={{color:'#ef4444', marginLeft:4}}>▲</span>}
                            {sessionArrowMap.get(s.id) === 'DOWN' && <span style={{color:'#10b981', marginLeft:4}}>▼</span>}
                            {sessionArrowMap.get(s.id) === 'EQUAL' && <span style={{color:'#fbbf24', marginLeft:4}}>▬</span>}
                            
                          </div>
                          {(s.hora_inicio || s.objetivo) && (
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginTop:2, borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:2 }}>
                              {s.hora_inicio && <span style={{ fontSize:9, color:'rgba(255,255,255,0.7)', lineHeight:1, fontWeight:600 }}>{s.hora_inicio.slice(0,5)}</span>}
                              {s.objetivo && (
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                                  {getObjetivoIcon(s.objetivo)}
                                  <span style={{ fontSize:8, color:'rgba(255,255,255,0.95)', lineHeight:1.1, fontWeight:800, textAlign:'center', marginTop:1, textTransform:'uppercase' }}>{s.objetivo}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )})}
                      {parts.map((p,i)=>(
                        <div key={i} style={{ fontSize:10, padding:'2px 5px', borderRadius:4, background:'rgba(59,130,246,.2)', color:'#60a5fa', border:'1px solid rgba(59,130,246,.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          🏆 {p.rival||'Partido'}
                        </div>
                      ))}
                      {log && (() => {
                        const rpe = Number(log.avg_rpe || log.max_rpe) || 0
                        const borgCol = rpe <= 2 ? '#22c55e' : rpe <= 4 ? '#a3e635' : rpe <= 6 ? '#eab308' : rpe <= 8 ? '#f97316' : '#ef4444'
                        return rpe > 0 ? (
                          <div style={{ display:'flex', alignItems:'center', gap:3, fontSize:9, padding:'1px 5px', borderRadius:3, background:`${borgCol}20`, color:borgCol, border:`1px solid ${borgCol}44`, fontWeight:700 }}>
                            RPE <span style={{ fontSize:11 }}>{rpe % 1 === 0 ? rpe : rpe.toFixed(1)}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        </>
      ) : (
        /* ── VISTA SEMANAL ── */
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {diasSemana.map((fecha, idx) => {
            const { sesiones:ses, partidos:parts, log } = eventosDelDia(fecha)
            const isToday = fecha === today
            const prevFecha = idx > 0 ? diasSemana[idx-1] : null
            const hasEvents = ses.filter((s:any) => s.tipo !== 'descanso').length > 0 || parts.length > 0
            const recup = prevFecha && hasEvents ? calcRecuperacion(prevFecha, fecha) : null
            const dayName = DIAS[idx]
            const dayNum = parseInt(fecha.split('-')[2])
            return (
              <div key={fecha} style={{ background:'var(--ink2)', border:`1px solid ${isToday?'var(--lime)':'var(--mist)'}`, borderRadius:14, overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderBottom:(ses.length>0||parts.length>0)?'1px solid var(--mist)':'none' }}>
                  <div style={{ textAlign:'center', minWidth:44 }}>
                    <div style={{ fontSize:11, color:'var(--silver)', textTransform:'uppercase', fontWeight:600 }}>{dayName}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:isToday?'var(--lime)':'var(--snow)', fontFamily:'DM Mono,monospace' }}>{dayNum}</div>
                  </div>
                  <div style={{ flex:1, display:'flex', flexWrap:'wrap', gap:6 }}>
                    {ses.length===0 && parts.length===0 && (
                      <span style={{ fontSize:12, color:'var(--fog)' }}>Sin eventos</span>
                    )}
                    {ses.map(s=>{
                      const sProps = getSesionStyle(s, false)
                      return (
                      <button className="hover-scale" key={s.id} onClick={()=>{setEditSesion(s);setShowEditor(true)}} className={sProps.className} style={{...sProps.style, fontSize:12, padding:(s.hora_inicio || s.objetivo)?'4px 12px':'6px 12px', flexDirection:'column', alignItems:'center', gap:2}}>
                        <div style={{display:'flex', alignItems:'center', gap:4}}>
                          {s.tipo==='partido' && s.rival_foto ? <img src={s.rival_foto} style={{ width:14, height:14, objectFit:'contain', borderRadius:2, verticalAlign:'middle', marginRight:4 }} alt="" /> : null}
                          {s.tipo==='partido'
                            ? <span>{TIPO_ICONOS[s.tipo]} {s.rival ? `vs ${s.rival}` : formatMD(s.titulo||'Partido', s.tipo)}</span>
                            : <span>{s.tipo !== 'descanso' && !((s.titulo||s.tipo).startsWith('MD')) ? TIPO_ICONOS[s.tipo] + ' ' : null}{formatMD(s.titulo||s.tipo, s.tipo)}</span>
                          }
                          {sessionArrowMap.get(s.id) === 'UP' && <span style={{color:'#ef4444', marginLeft:4}}>▲</span>}
                          {sessionArrowMap.get(s.id) === 'DOWN' && <span style={{color:'#10b981', marginLeft:4}}>▼</span>}
                          {sessionArrowMap.get(s.id) === 'EQUAL' && <span style={{color:'#fbbf24', marginLeft:4}}>▬</span>}
                        </div>
                        {(s.hora_inicio || s.objetivo) && (
                          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2, borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:2, width:'100%', justifyContent:'center' }}>
                            {s.hora_inicio && <span style={{ fontSize:10, color:'rgba(255,255,255,0.7)', fontWeight:600 }}>{s.hora_inicio.slice(0,5)}</span>}
                            {s.hora_inicio && s.objetivo && <span style={{ color:'rgba(255,255,255,0.3)' }}>•</span>}
                            {s.objetivo && (
                              <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                                {getObjetivoIcon(s.objetivo)}
                                <span style={{ fontSize:9, color:'rgba(255,255,255,0.95)', fontWeight:800, textTransform:'uppercase' }}>{s.objetivo}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </button>
                    )})}
                    {parts.map((p,i)=>(
                      <span key={i} style={{ fontSize:12, padding:'4px 10px', borderRadius:8, background:'rgba(59,130,246,.15)', color:'#60a5fa', border:'1px solid rgba(59,130,246,.3)' }}>
                        🏆 {p.rival||'Partido'} · {p.tipo_partido}
                      </span>
                    ))}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    {recup !== null && <RecuperacionBadge horas={recup} />}
                    {log && (() => {
                      const rpe = Number(log.avg_rpe || log.max_rpe) || 0
                      const borgCol = rpe <= 2 ? '#22c55e' : rpe <= 4 ? '#a3e635' : rpe <= 6 ? '#eab308' : rpe <= 8 ? '#f97316' : '#ef4444'
                      return rpe > 0 ? (
                        <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, padding:'2px 8px', borderRadius:6, background:`${borgCol}20`, color:borgCol, border:`1px solid ${borgCol}44`, fontWeight:700 }}>
                          RPE <span style={{ fontSize:13 }}>{rpe % 1 === 0 ? rpe : rpe.toFixed(1)}</span>
                          <span style={{ fontSize:8, color:borgCol, opacity:.7 }}>media</span>
                        </div>
                      ) : null
                    })()}
                    <button className="hover-scale" onClick={()=>{setSelectedDay(fecha);setEditSesion(null);setShowEditor(true)}} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid var(--fog)', color:'var(--silver)', cursor:'pointer' }}>+ Sesión</button>
                  </div>
                </div>
                {ses.length>0 && (
                  <div style={{ padding:'10px 16px 12px', display:'flex', gap:12, flexWrap:'wrap' }}>
                    {ses.map(s=>(
                      <div key={s.id} style={{ flex:'1 1 260px', background:'var(--ink3)', borderRadius:10, padding:'10px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:TIPO_COLORES[s.tipo]||'#888' }}>{TIPO_ICONOS[s.tipo]} {formatMD(s.titulo||s.tipo)}</span>
                          {s.rpe_objetivo && <span style={{ fontSize:11, color:'var(--lime)', fontFamily:'DM Mono,monospace' }}>RPE obj. {s.rpe_objetivo}</span>}
                        </div>
                        {s.objetivo && <div style={{ fontSize:11, color:'var(--silver)', marginBottom:2 }}>🎯 {s.objetivo}{s.objetivo_secundario ? ` · ${s.objetivo_secundario}` : ''}</div>}
                        {s.hora_inicio && <div style={{ fontSize:11, color:'var(--fog)' }}>🕐 {s.hora_inicio.slice(0,5)}{s.hora_fin?` – ${s.hora_fin.slice(0,5)}`:''}</div>}
                        {s.ejercicios?.length>0 && (
                          <div style={{ marginTop:6 }}>
                            {s.ejercicios.map((bl:any,i:number)=>(
                              <div key={i} style={{ fontSize:10, color:'var(--silver)', padding:'2px 0', borderTop:'1px solid var(--mist)', display:'flex', gap:8 }}>
                                <span style={{ fontWeight:600, color:'var(--snow)' }}>{bl.ventana||`Tarea ${i+1}`}{getSubtareasDisplay(bl) ? ` · ${getSubtareasDisplay(bl)}` : ''}</span>
                                {bl.series && bl.minutos && <span>{bl.series}×{bl.minutos}min</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Day detail panel (month view click) */}
      {selectedDay && viewMode==='mes' && (() => {
        const { sesiones:ses, partidos:parts, log } = eventosDelDia(selectedDay)
        const prevDay = allEventDays[allEventDays.indexOf(selectedDay)-1]
        const hasEvents = ses.filter((s:any) => s.tipo !== 'descanso').length > 0 || parts.length > 0
        const recup = prevDay && hasEvents ? calcRecuperacion(prevDay, selectedDay) : null
        const rpeLog = log ? Number(log.avg_rpe || log.max_rpe) || 0 : 0
        const borgColLog = rpeLog <= 2 ? '#22c55e' : rpeLog <= 4 ? '#a3e635' : rpeLog <= 6 ? '#eab308' : rpeLog <= 8 ? '#f97316' : '#ef4444'
        return (
          <div className="anim-up" style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'var(--lime)' }}>{new Date(selectedDay+'T12:00:00').toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'})}</p>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4, flexWrap:'wrap' }}>
                  {recup !== null && (ses.length>0||parts.length>0) && <RecuperacionBadge horas={recup} />}
                  {rpeLog > 0 && (
                    <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, padding:'2px 10px', borderRadius:6, background:`${borgColLog}20`, color:borgColLog, border:`1px solid ${borgColLog}44`, fontWeight:700 }}>
                      RPE medio: <span style={{ fontSize:14 }}>{rpeLog % 1 === 0 ? rpeLog : rpeLog.toFixed(1)}</span>
                      <span style={{ fontSize:8, opacity:.7 }}>({log.n || ''} resp.)</span>
                      <button className="hover-scale" onClick={async () => {
                        if (confirm('¿Eliminar todos los RPE de este día?')) {
                          await fetch(`/api/logs?fecha=${selectedDay}`, { method: 'DELETE' });
                          await load();
                        }
                      }} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', padding:'0 0 0 6px', fontSize:12, opacity:0.8 }} title="Eliminar RPE del día">✕</button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="hover-scale" onClick={()=>{setEditSesion(null);setShowEditor(true)}} className="btn-lime" style={{ fontSize:11, padding:'6px 14px' }}>+ Sesión</button>
                <button className="hover-scale" onClick={()=>setSelectedDay(null)} className="btn-ghost" style={{ fontSize:11, padding:'6px 10px' }}>✕</button>
              </div>
            </div>
            {ses.length===0 && parts.length===0 && <p style={{ color:'var(--fog)', fontSize:13 }}>Sin eventos planificados. Creá una sesión.</p>}
            {ses.map(s=>(
              <div key={s.id} style={{ background:'var(--ink3)', borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:700, color:TIPO_COLORES[s.tipo]||'#888', fontSize:13 }}>{TIPO_ICONOS[s.tipo]} {formatMD(s.titulo||s.tipo)}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="hover-scale" onClick={()=>{setEditSesion(s);setShowEditor(true)}} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'var(--ink2)', border:'1px solid var(--fog)', color:'var(--silver)', cursor:'pointer' }}>✏️ Editar</button>
                    <button className="hover-scale" onClick={async()=>{ await fetch(`/api/calendario?id=${s.id}`,{method:'DELETE'}); load() }} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#f87171', cursor:'pointer' }}>🗑</button>
                  </div>
                </div>
                {(s.objetivo||s.objetivo_secundario) && <p style={{ fontSize:12, color:'var(--silver)', marginTop:4 }}>🎯 {[s.objetivo,s.objetivo_secundario].filter(Boolean).join(' · ')}</p>}
                {s.cancha_id && (() => {
                  const c = canchas.find(cc => cc.id === s.cancha_id || String(cc.id) === String(s.cancha_id))
                  return c ? <p style={{ fontSize:11, color:'var(--lime)', marginTop:2 }}>📍 {c.nombre} <span style={{ color:'var(--fog)', fontSize:9 }}>({c.largo_m}×{c.ancho_m}m)</span></p> : null
                })()}
                {s.rpe_objetivo && <p style={{ fontSize:12, color:'var(--lime)', fontFamily:'DM Mono,monospace', marginTop:2 }}>RPE objetivo: {s.rpe_objetivo}</p>}
                {s.hora_inicio && <p style={{ fontSize:12, color:'var(--fog)' }}>🕐 {s.hora_inicio.slice(0,5)}{s.hora_fin?` – ${s.hora_fin.slice(0,5)}`:''}</p>}
                
                {/* ── TIEMPOS DE SESION ── */}
                {(() => {
                  const { tiempoTrabajo: tTrabajo, tiempoDescanso: tDescanso } = calcTiempoConSimultaneas(s.ejercicios||[])
                  if (tTrabajo+tDescanso === 0) return null
                  return (
                    <div style={{ display:'flex', gap:16, marginTop:10, background:'var(--ink2)', padding:'10px 14px', borderRadius:10, border:'1px solid var(--mist)' }}>
                      <div><div style={{ fontSize:9, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Tiempo Total</div><div style={{ fontSize:16, fontWeight:700, color:'var(--lime)', fontFamily:'DM Mono,monospace' }}>{tTrabajo+tDescanso} min</div></div>
                      <div style={{ width:1, background:'var(--mist)' }}></div>
                      <div><div style={{ fontSize:9, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Trabajo</div><div style={{ fontSize:16, fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{tTrabajo} min</div></div>
                      <div style={{ width:1, background:'var(--mist)' }}></div>
                      <div><div style={{ fontSize:9, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Descanso</div><div style={{ fontSize:16, fontWeight:700, color:'#f59e0b', fontFamily:'DM Mono,monospace' }}>{tDescanso} min</div></div>
                    </div>
                  )
                })()}
                {s.ejercicios?.length>0 && (
                  <div style={{ marginTop:8 }}>
                    <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Tareas ({s.ejercicios.length})</p>
                    {s.ejercicios.map((bl:any,i:number)=>(
                      <div key={i} style={{ background:'var(--ink2)', borderRadius:8, padding:'8px 10px', marginBottom:6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:bl.descripcion||bl.imagen?4:0 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--lime)' }}>Tarea {i+1}{bl.ventana?` · ${bl.ventana}`:''}{getSubtareasDisplay(bl) ? ` › ${getSubtareasDisplay(bl)}` : ''}{bl.simultanea ? ' ⏱' : ''}</span>
                          <span style={{ fontSize:11, color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>
                            {[bl.series&&`${bl.series}×${bl.minutos}min`, bl.jugadores&&`${bl.jugadores}jug`, (bl.largo&&bl.ancho)&&`${bl.largo}×${bl.ancho}m`].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        {bl.rutinaGym && bl.rutinaGym.length > 0 && (
                          <div style={{ marginTop:6, marginBottom:bl.descripcion?6:0, padding:'6px 8px', background:'rgba(255,255,255,.03)', borderRadius:6, border:'1px solid rgba(255,255,255,.05)' }}>
                            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:4, borderBottom:'1px solid rgba(255,255,255,.1)', paddingBottom:4, marginBottom:4 }}>
                              <span style={{ fontSize:9, fontWeight:700, color:'var(--lime)', textTransform:'uppercase' }}>Ejercicio</span>
                              <span style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase' }}>Series</span>
                              <span style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase' }}>Reps</span>
                              <span style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase' }}>Carga</span>
                            </div>
                            {bl.rutinaGym.map((r:any,rIdx:number) => (
                              <div key={rIdx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:4, fontSize:11, color:'var(--snow)', marginBottom:2 }}>
                                <span>{r.ejercicio}</span>
                                <span style={{ color:'var(--fog)' }}>{r.series}</span>
                                <span style={{ color:'var(--fog)' }}>{r.repeticiones}</span>
                                <span style={{ color:'var(--fog)' }}>{r.peso}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {bl.descripcion && <p style={{ fontSize:11, color:'var(--silver)', lineHeight:1.5, margin:0 }}>{bl.descripcion}</p>}
                        {bl.imagen && <img src={bl.imagen} style={{ marginTop:6, maxWidth:'100%', maxHeight:120, borderRadius:6, objectFit:'contain' }} />}
                        {/* CE inline in card */}
                        {bl.ventana && (() => {
                          const ne = bl.ne ?? NE_DEFAULT[bl.ventana] ?? 5
                          const minTotal = (Number(bl.series)||1) * (Number(bl.minutos)||0)
                          if (!minTotal) return null
                          const ce = Math.round(minTotal * ne)
                          const rpeParaUCE = rpeLog > 0 ? rpeLog : (Number(s.rpe_objetivo) || 0)
                          const rpeEsReal = rpeLog > 0
                          return (
                            <div style={{ marginTop:4, fontSize:10, fontFamily:'DM Mono,monospace', color:'var(--silver)' }}>
                              <span style={{ color:'var(--fog)' }}>{minTotal}min × </span>
                              <span style={{ color:'var(--lime)' }}>NE{ne}</span>
                              <span style={{ color:'var(--fog)' }}> = </span>
                              <span style={{ color:'#c8f135', fontWeight:700 }}>CE {ce}</span>
                              {rpeParaUCE > 0 && <>
                                <span style={{ color:'var(--fog)' }}> × RPE{rpeParaUCE}{rpeEsReal ? '' : ' obj'} = </span>
                                <span style={{ color:'#f59e0b', fontWeight:700 }}>{Math.round(ce*rpeParaUCE)} UCE</span>
                              </>}
                            </div>
                          )
                        })()}
                      </div>
                    ))}
                    {/* CE/UCE session total in card */}
                    {(() => {
                      const rpeParaUCE = rpeLog > 0 ? rpeLog : (Number(s.rpe_objetivo) || 0)
                      const rpeEsReal = rpeLog > 0
                      let ceTotal = 0
                      s.ejercicios.forEach((bl:any) => {
                        if (!bl.ventana) return
                        const ne = bl.ne ?? NE_DEFAULT[bl.ventana] ?? 5
                        const minTotal = (Number(bl.series)||1) * (Number(bl.minutos)||0)
                        ceTotal += Math.round(minTotal * ne)
                      })
                      if (!ceTotal) return null
                      return (
                        <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.2)', borderRadius:8, fontFamily:'DM Mono,monospace', display:'flex', gap:16, alignItems:'center' }}>
                          <div><span style={{ fontSize:9, color:'var(--silver)', textTransform:'uppercase' }}>CE TOTAL </span><span style={{ fontSize:13, fontWeight:700, color:'#c8f135' }}>{ceTotal}</span></div>
                          {rpeParaUCE > 0 && <div><span style={{ fontSize:9, color:'var(--silver)', textTransform:'uppercase' }}>UCE TOTAL </span><span style={{ fontSize:13, fontWeight:700, color:'#f59e0b' }}>{Math.round(ceTotal*rpeParaUCE)}</span><span style={{ fontSize:8, color:'var(--fog)', marginLeft:3 }}>{rpeEsReal ? '(RPE real)' : '(RPE obj)'}</span></div>}
                        </div>
                      )
                    })()}
                    
                    {/* Carga Total Absoluta de la Sesión (GPS Calc) */}
                    {(() => {
                      const metricKeys = ['distTotal','distSprint','distMP','distAcel','distDecel','nSprints','nAcel','nDecel']
                      const metricLabels = ['Dist. total','Sprint >21km/h','Alta pot. >20W/kg','Acel. >2m/s²','Decel. >-2m/s²','Nº sprints','Nº acel. >3m/s²','Nº decel. >-3m/s²']
                      const metricUnits = ['m','m','m','m','m','','','']
                      const totals: Record<string,number> = {}
                      metricKeys.forEach(k => { totals[k] = 0 })
                      let hasCarga = false
                      s.ejercicios.forEach((bl:any) => {
                        if (!bl.ventana || !TAREAS_CON_ESPACIO.includes(bl.ventana)) return
                        const jugN = getJugadoresBloque(bl, TAREAS_CON_EQUIPO.includes(bl.ventana))
                        const calc = calcularDistancias(jugN, Number(bl.largo), Number(bl.ancho), Number(bl.series), Number(bl.minutos))
                        if (!calc) return
                        hasCarga = true
                        metricKeys.forEach(k => {
                          const manual = bl.manualMetrics?.[k]
                          totals[k] += manual !== undefined && manual !== '' ? parseFloat(manual) : calc[k]
                        })
                      })
                      if (!hasCarga) return null
                      return (
                        <div style={{ marginTop:12, background:'rgba(59,130,246,.06)', border:'1px solid rgba(59,130,246,.2)', borderRadius:10, padding:'12px 14px' }}>
                          <strong style={{ fontSize:10, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>📊 Carga absoluta simulada (GPS Calc)</strong>
                          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                            {metricKeys.map((k,i) => (
                              <div key={k} style={{ textAlign:'center', background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:6, padding:'6px' }}>
                                <div style={{ fontSize:8, color:'var(--silver)', marginBottom:2, lineHeight:1.2 }}>{metricLabels[i]}</div>
                                <div style={{ fontSize:13, fontWeight:700, color:'#60a5fa', fontFamily:'DM Mono,monospace' }}>{Math.round(totals[k])}<span style={{ fontSize:9, color:'var(--fog)' }}>{metricUnits[i]}</span></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
                {s.notas && <p style={{ fontSize:11, color:'var(--silver)', marginTop:4, fontStyle:'italic' }}>📝 {s.notas}</p>}
              </div>
            ))}
            {parts.map((p,i)=>(
              <div key={i} style={{ background:'rgba(59,130,246,.08)', border:'1px solid rgba(59,130,246,.25)', borderRadius:10, padding:'10px 14px' }}>
                <span style={{ fontWeight:700, color:'#60a5fa', fontSize:13 }}>🏆 {p.rival||'Partido'} · {p.tipo_partido}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Session Editor Modal */}
      {showEditor && (() => {
        const _editorLog = selectedDay ? logs.find(l => l.fecha === selectedDay) : null
        const _rpeReal = _editorLog ? Number(_editorLog.avg_rpe || _editorLog.max_rpe) || 0 : 0
        return (
        <SesionEditor
          key={editSesion?.id ?? 'new'}
          sesion={editSesion}
          rpeReal={_rpeReal}
          defaultFecha={selectedDay||today}
          onSave={async(data)=>{
            try {
              let res
              if (editSesion?.id) {
                res = await fetch('/api/calendario', {
                  method:'PATCH',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({id:editSesion.id,...data})
                })
              } else {
                res = await fetch('/api/calendario', {
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify(data)
                })
              }
              if (!res.ok) {
                const err = await res.json()
                alert('Error al guardar: ' + (err.error||res.status))
                return
              }
              setShowEditor(false)
              setEditSesion(null)
              await load()

              // Auto-save tasks to biblioteca in background (fire and forget)
              const bloques: any[] = data.ejercicios || []
              const tareasParaBiblioteca = await Promise.all(
                bloques
                  .filter(bl => bl.ventana)
                  .map(async bl => {
                    const jug = Number(bl.jugadores) || 0
                    const largo = Number(bl.largo) || 0
                    const ancho = Number(bl.ancho) || 0
                    let intensidad: number | null = null
                    let objetivo: string | null = null
                    if (jug > 0 && largo > 0 && ancho > 0) {
                      const densidad = (largo * ancho) / jug
                      const cuad = getCuadrante(densidad, jug)
                      intensidad = cuad.intensidad
                      objetivo = cuad.objetivo
                    }
                    // Compress imagen to ~300px for biblioteca storage
                    let imagenComprimida: string | null = null
                    if (bl.imagen) {
                      try { imagenComprimida = await compressImage(bl.imagen, 300, 0.7) } catch {}
                    }
                    return {
                      nombre: bl.ventana + (getSubtareasDisplay(bl) ? ` › ${getSubtareasDisplay(bl)}` : ''),
                      ventana: bl.ventana,
                      subtareas: getSubtareasArr(bl),
                      subtarea: getSubtareasDisplay(bl) || null,
                      jugadores: jug || null,
                      series: Number(bl.series) || null,
                      minutos: Number(bl.minutos) || null,
                      pausa: Number(bl.pausa) || null,
                      largo: largo || null,
                      ancho: ancho || null,
                      descripcion: bl.descripcion || null,
                      intensidad,
                      objetivo: objetivo || null,
                      imagen: imagenComprimida,
                    }
                  })
              )
              if (tareasParaBiblioteca.length > 0) {
                fetch('/api/biblioteca', {
                  method: 'POST',
                  headers: {'Content-Type':'application/json'},
                  body: JSON.stringify({ action: 'auto_guardar', tareas: tareasParaBiblioteca }),
                }).catch((err) => console.warn('[auto_guardar biblioteca]', err))
              }
            } catch(e) {
              alert('Error de conexión: ' + String(e))
            }
          }}
          onDelete={editSesion?.id ? async()=>{
            await fetch(`/api/calendario?id=${editSesion.id}`,{method:'DELETE'})
            setShowEditor(false); setEditSesion(null); await load()
          } : undefined}
          onCancel={()=>{ setShowEditor(false); setEditSesion(null) }}
          teamPlayers={teamData}
          canchas={canchas}
        />
        )
      })()}

      {/* ── DISTRIBUCIÓN DE TAREAS ── */}
      {totalMin > 0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:16 }}>Distribución de Tareas (Ales)</h2>
          <AnimateOnScroll minHeight={200}>
            <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start', justifyContent:'center' }}>
            {/* Gráfico de Torta: Optimizador vs Coadyuvante */}
            <div style={{ flex:1, minWidth:250, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <p style={{ fontSize:11, color:'var(--fog)', marginBottom:4, textAlign:'center' }}>TOTAL: <strong style={{color:'var(--snow)', fontSize:14}}>{totalMin}m</strong></p>
              <div style={{ position:'relative', width:180, height:180 }}>
                <AnimatedPieChart width={180} height={180}>
                  <Pie
                    isAnimationActive={true} data={[
                      { name: 'Optimizador', value: totalOptimizadorMin, color: '#c8f135' },
                      { name: 'Coadyuvante', value: totalCoadyuvanteMin, color: '#60a5fa' }
                    ].filter(d => d.value > 0)}
                    cx={90}
                    cy={90}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={true}
                    animationDuration={2500}
                  >
                    { [
                        { name: 'Optimizador', value: totalOptimizadorMin, color: '#c8f135' },
                        { name: 'Coadyuvante', value: totalCoadyuvanteMin, color: '#60a5fa' }
                      ].filter(d => d.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </AnimatedPieChart>
                <div style={{ position:'absolute', top:0, left:0, width:180, height:180, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
                  <span style={{ fontSize:11, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.05em' }}>TOTAL</span>
                  <span style={{ fontSize:20, fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{totalMin}m</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'center', gap:20, fontSize:12, marginTop:12 }}>
                <span style={{ color:'#c8f135', fontWeight:700 }}>Optimizador ({pctOptimizador}%)</span>
                <span style={{ color:'#60a5fa', fontWeight:700 }}>Coadyuvante ({pctCoadyuvante}%)</span>
              </div>
            </div>

            {/* Desglose Optimizador */}
            {(optEspecialSorted.length > 0 || optCompSorted.length > 0) && (
              <div style={{ flex:2, minWidth:300 }}>
                <p style={{ fontSize:11, color:'var(--lime)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Entrenamiento Optimizador</p>
                {optCompSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>Competición</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {optCompSorted.map(([nombre, mins]) => {
                        const p = totalOptimizadorMin > 0 ? Math.round((mins / totalOptimizadorMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(239,68,68,.05)', border:'1px solid rgba(239,68,68,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#ef4444', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div className="anim-bar" style={{ width:`${p}%`, height:'100%', background:'#ef4444' }}></div>
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{Number(Number(mins).toFixed(2))} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
                {optEspecialSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>Especial</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {optEspecialSorted.map(([nombre, mins]) => {
                        const p = totalOptimizadorMin > 0 ? Math.round((mins / totalOptimizadorMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(249,115,22,.05)', border:'1px solid rgba(249,115,22,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#f97316', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div className="anim-bar" style={{ width:`${p}%`, height:'100%', background:'#f97316' }}></div>
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{Number(Number(mins).toFixed(2))} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Desglose Coadyuvante */}
            {(coadDirSorted.length > 0 || coadGenSorted.length > 0 || ejesSorted.length > 0) && (
              <div style={{ flex:2, minWidth:300 }}>
                <p style={{ fontSize:11, color:'#60a5fa', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Entrenamiento Coadyuvante</p>
                
                {coadDirSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>Dirigido</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {coadDirSorted.map(([nombre, mins]) => {
                        const p = totalCoadyuvanteMin > 0 ? Math.round((mins / totalCoadyuvanteMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(234,179,8,.05)', border:'1px solid rgba(234,179,8,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#eab308', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div className="anim-bar" style={{ width:`${p}%`, height:'100%', background:'#eab308' }}></div>
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{Number(Number(mins).toFixed(2))} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {coadGenSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:8 }}>General</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {coadGenSorted.map(([nombre, mins]) => {
                        const p = totalCoadyuvanteMin > 0 ? Math.round((mins / totalCoadyuvanteMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(34,197,94,.05)', border:'1px solid rgba(34,197,94,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div className="anim-bar" style={{ width:`${p}%`, height:'100%', background:'#22c55e' }}></div>
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{Number(Number(mins).toFixed(2))} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}

                {ejesSorted.length > 0 && (
                  <>
                    <p style={{ fontSize:10, color:'var(--fog)', marginBottom:4, marginTop:12, borderTop:'1px dashed var(--mist)', paddingTop:12 }}>Ejes Estructurales</p>
                    <div style={{ columnCount: 2, columnGap: 16 }}>
                      {ejesSorted.map(([nombre, mins]) => {
                        const p = totalCoadyuvanteMin > 0 ? Math.round((mins / totalCoadyuvanteMin) * 100) : 0
                        return (
                          <div key={nombre} style={{ breakInside: 'avoid', marginBottom: 10, background:'rgba(168,85,247,.05)', border:'1px solid rgba(168,85,247,.15)', borderRadius:8, padding:'6px 10px' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                              <span style={{ fontSize:10, color:'var(--snow)', fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{nombre}</span>
                              <span style={{ fontSize:10, color:'#a855f7', fontWeight:700 }}>{p}%</span>
                            </div>
                            <div style={{ width:'100%', height:3, background:'var(--ink3)', borderRadius:2, overflow:'hidden' }}>
                              <div className="anim-bar" style={{ width:`${p}%`, height:'100%', background:'#a855f7' }}></div>
                            </div>
                            <div style={{ fontSize:9, color:'var(--fog)', marginTop:4, textAlign:'right' }}>{Number(Number(mins).toFixed(2))} min</div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          </AnimateOnScroll>
        </div>
      )}
    </div>
  )
}

export function getCuadrante(densidad: number, jugadores?: number) {
  // Sangnier et al (2018) — clasificación EXACTA del Excel
  // Eje Y (densidad m²/jug): <50 | 50-100 | 100-200 | >=200
  // Eje X (total jugadores): <=4 | <=8 | <=14 | <=20
  //
  // Tabla completa:
  // densidad\jug  | <=4           | <=8           | <=14          | <=20
  // <50           | Fuerza 1      | Fuerza 2      | Act./Rec. 2   | Act./Rec. 4
  // 50-100        | Fuerza 3      | Fuerza 4      | Act./Rec. 1   | Act./Rec. 3
  // 100-200       | Resistencia 2 | Resistencia 4 | Velocidad 4   | Velocidad 2
  // >=200         | Resistencia 1 | Resistencia 3 | Velocidad 3   | Velocidad 1

  const d = densidad
  const n = jugadores || 0

  // Tabla completa incluyendo número de intensidad (Sangnier et al 2018)
  // densidad\jug  | <=4              | <=8              | <=14             | <=20
  // <50           | Fuerza 1         | Fuerza 2         | Act./Rec. 2      | Act./Rec. 4
  // 50-100        | Fuerza 3         | Fuerza 4         | Act./Rec. 1      | Act./Rec. 3
  // 100-200       | Resistencia 2    | Resistencia 4    | Velocidad 4      | Velocidad 2
  // >=200         | Resistencia 1    | Resistencia 3    | Velocidad 3      | Velocidad 1
  // Número: 1 = más intenso, 4 = menos intenso (dentro de su categoría)

  let objetivo = 'Resistencia'
  let intensidad = 1

  if (d < 50) {
    if (n <= 4)       { objetivo = 'Fuerza';     intensidad = 1 }
    else if (n <= 8)  { objetivo = 'Fuerza';     intensidad = 2 }
    else if (n <= 14) { objetivo = 'Activación/Recuperación'; intensidad = 2 }
    else              { objetivo = 'Activación/Recuperación'; intensidad = 4 }
  } else if (d < 100) {
    if (n <= 4)       { objetivo = 'Fuerza';     intensidad = 3 }
    else if (n <= 8)  { objetivo = 'Fuerza';     intensidad = 4 }
    else if (n <= 14) { objetivo = 'Activación/Recuperación'; intensidad = 1 }
    else              { objetivo = 'Activación/Recuperación'; intensidad = 3 }
  } else if (d < 200) {
    if (n <= 4)       { objetivo = 'Resistencia'; intensidad = 2 }
    else if (n <= 8)  { objetivo = 'Resistencia'; intensidad = 4 }
    else if (n <= 14) { objetivo = 'Velocidad';   intensidad = 4 }
    else              { objetivo = 'Velocidad';   intensidad = 2 }
  } else {
    if (n <= 4)       { objetivo = 'Resistencia'; intensidad = 1 }
    else if (n <= 8)  { objetivo = 'Resistencia'; intensidad = 3 }
    else if (n <= 14) { objetivo = 'Velocidad';   intensidad = 3 }
    else              { objetivo = 'Velocidad';   intensidad = 1 }
  }

  const colorMap: Record<string,{color:string,bg:string,border:string}> = {
    'Fuerza':                  { color:'#a855f7', bg:'rgba(168,85,247,.1)',  border:'rgba(168,85,247,.3)' },
    'Activación':              { color:'#22c55e', bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.3)'  },
    'Activación/Recuperación': { color:'#22c55e', bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.3)'  },
    'Resistencia':             { color:'#f59e0b', bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.3)' },
    'Velocidad':               { color:'#3b82f6', bg:'rgba(59,130,246,.1)',  border:'rgba(59,130,246,.3)' },
  }
  const { color, bg, border } = colorMap[objetivo] ?? { color:'#888', bg:'rgba(128,128,128,.1)', border:'rgba(128,128,128,.3)' }

  // Etiqueta de espacio relativa a la densidad
  const espacioLabel = d < 100 ? 'Espacio Reducido' : d < 200 ? 'Espacio Medio' : 'Espacio Grande'

  const descs: Record<string,string> = {
    'Fuerza':                  'Acciones neuromusculares · Contactos frecuentes · Espacio limitado',
    'Resistencia':             'Alta demanda aeróbica (FC) · Balance técnico-táctico · Densidad moderada',
    'Activación':              'Activación y recuperación · Baja exigencia · SSG de alta densidad',
    'Activación/Recuperación': 'Activación y recuperación · Baja exigencia · SSG de alta densidad',
    'Velocidad':               'Demanda HSR y VHSR · Sprints frecuentes · Espacios amplios',
  }

  return { label: espacioLabel, objetivo, intensidad, color, bg, border, desc: descs[objetivo] }
}

function getJugadoresBloque(bl: any, esConEquipo: boolean): number {
  const atacantes = Number(bl.atacantes) || 0
  const defensores = Number(bl.defensores) || 0
  const comodines = Number(bl.comodines) || 0
  const autoTotal = atacantes + defensores + (bl.comodines_fuera ? 0 : comodines)
  if (autoTotal > 0) return autoTotal
  if (esConEquipo) return Object.values(bl.equipos||{}).flat().length || Number(bl.jugadores) || 0
  return Number(bl.jugadores) || 0
}

function calcularDistancias(jugadores: number, largo: number, ancho: number, series: number, minutos: number) {
  if (!jugadores || !largo || !ancho || !series || !minutos) return null
  const espacioM2 = largo * ancho
  const densidad = espacioM2 / jugadores
  const tiempoTotal = series * minutos
  const distTotal = Math.max(0, (19.243 * Math.log(densidad) - 5.029) * tiempoTotal)
  // distSprint y nSprints usan intercepto reducido para producir valores realistas
  // en tareas de alta densidad (partidos reducidos, rondos, etc.)
  const distSprint = Math.max(0, (0.018 * densidad - 0.1) * tiempoTotal)
  const distMP = Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoTotal)
  const distAcel = Math.max(0, (1.321 * Math.log(densidad) - 0.629) * tiempoTotal)
  const distDecel = Math.max(0, (1.157 * Math.log(densidad) - 0.418) * tiempoTotal)
  const rawNSprints = Math.max(0, (0.001 * densidad - 0.005) * tiempoTotal)
  const nSprints = rawNSprints > 0 ? Math.max(1, Math.round(rawNSprints)) : 0
  const nAcel = Math.max(0, (0.212 * Math.log(densidad) - 0.23) * tiempoTotal)
  const nDecel = Math.max(0, (0.1041 * Math.log(densidad) - 0.096) * tiempoTotal)
  // ACE>3 and DEC>3 (high intensity efforts): approx 22% of B2-3 based on Casamichana (2013)
  const nAcel3 = Math.max(0, Math.round(nAcel * 0.22))
  const nDecel3 = Math.max(0, Math.round(nDecel * 0.22))
  return { distTotal, distSprint, distMP, distAcel, distDecel, nSprints, nAcel, nDecel, nAcel3, nDecel3, densidad, tiempoTotal }
}

function BloqueMetodologia({ bloque, index, onChangeProp, onRemoveProp, onMoveUpProp, onMoveDownProp, teamPlayers = [], isFirst, isLast }) {
  const onChange = (k: string, v: any) => onChangeProp(index, k, v)
  const onRemove = () => onRemoveProp(index)
  const onMoveUp = () => onMoveUpProp(index)
  const onMoveDown = () => onMoveDownProp(index)
  const [imgPreview, setImgPreview] = useState<string|null>(bloque.imagen || null)
  const [equipos, setEquipos] = useState<Record<number, number[]>>(bloque.equipos || {})
  const [manualMetrics, setManualMetrics] = useState<Record<string,string>>(bloque.manualMetrics || {})
  const [editingMetrics, setEditingMetrics] = useState(false)
  const [fuerzaEjercicios, setFuerzaEjercicios] = useState<any[]>([])
  const [fuerzaMandamientos, setFuerzaMandamientos] = useState<any[]>([])

  useEffect(() => {
    if (bloque.tipo_entrenamiento === 'COADYUVANTE') {
      fetch('/api/fuerza/ejercicios').then(r=>r.json()).then(d=>{if(d.ejercicios) setFuerzaEjercicios(d.ejercicios)})
      fetch('/api/fuerza/mandamientos').then(r=>r.json()).then(d=>{if(d.mandamientos) setFuerzaMandamientos(d.mandamientos)})
    }
  }, [bloque.tipo_entrenamiento])

  const esConEspacio = TAREAS_CON_ESPACIO.includes(bloque.ventana)
  const esConEquipo = TAREAS_CON_EQUIPO.includes(bloque.ventana)
  const mostrarForm = bloque.ventana && (TAREAS_MOSTRAR_FORM.includes(bloque.ventana) || esConEspacio)

  const jugadoresEquipos = Object.values(equipos).flat() as number[]
  const totalJugadoresEquipos = jugadoresEquipos.length

  // Auto total from atacantes + defensores + comodines (ignoring comodines if they are "por fuera")
  const atacantes = Number(bloque.atacantes) || 0
  const defensores = Number(bloque.defensores) || 0
  const comodines = Number(bloque.comodines) || 0
  const comodinesFueraNum = Number(bloque.comodines_fuera_num) || 0
  const autoTotal = atacantes + defensores + comodines + comodinesFueraNum

  // For partido types: prefer auto-total > manual jugadores > team selector
  // Density should ONLY count players inside the area!
  const playersInside = autoTotal > 0 ? (atacantes + defensores + comodines) : (Number(bloque.jugadores) || (esConEquipo ? totalJugadoresEquipos : 0))
  const calc = esConEspacio ? calcularDistancias(playersInside, Number(bloque.largo), Number(bloque.ancho), Number(bloque.series), Number(bloque.minutos)) : null

  function handleImg(e: any) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const raw = ev.target?.result as string
      try {
        const compressed = await compressImage(raw, 300, 0.75)
        setImgPreview(compressed)
        onChange('imagen', compressed)
      } catch {
        setImgPreview(raw)
        onChange('imagen', raw)
      }
    }
    reader.readAsDataURL(file)
  }

  function toggleJugadorEquipo(equipoNum: number, jugadorId: number) {
    setEquipos(prev => {
      const eq = { ...prev }
      const cur = eq[equipoNum] || []
      if (cur.includes(jugadorId)) {
        eq[equipoNum] = cur.filter(id => id !== jugadorId)
      } else {
        Object.keys(eq).forEach(k => { eq[Number(k)] = (eq[Number(k)] || []).filter(id => id !== jugadorId) })
        eq[equipoNum] = [...(eq[equipoNum] || []), jugadorId]
      }
      onChange('equipos', eq)
      return eq
    })
  }

  function updateManualMetric(key: string, val: string) {
    const updated = { ...manualMetrics, [key]: val }
    setManualMetrics(updated)
    onChange('manualMetrics', updated)
  }

  const inp = (field, placeholder, type='text') => (
    <input className="wp-input" type={type} placeholder={placeholder} value={bloque[field]||''} onChange={e=>onChange(field,e.target.value)}
      style={{ padding:'5px 8px', fontSize:11, width:'100%' }} />
  )

  const EQUIPO_COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444']
  const EQUIPO_LABELS = ['Equipo 1','Equipo 2','Equipo 3','Equipo 4']

  return (
    <div style={{ background:'var(--ink3)', border:'1px solid rgba(200,241,53,.15)', borderRadius:12, padding:14, marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:11, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Tarea {index+1}</span>
        <div style={{ display:'flex', gap:6 }}>
          {!isFirst && <button className="hover-scale" onClick={onMoveUp} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:6, color:'var(--silver)', cursor:'pointer', padding:'2px 8px', fontSize:11 }}>▲ Subir</button>}
          {!isLast && <button className="hover-scale" onClick={onMoveDown} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:6, color:'var(--silver)', cursor:'pointer', padding:'2px 8px', fontSize:11 }}>▼ Bajar</button>}
          <button className="hover-bright" onClick={onRemove} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#f87171', cursor:'pointer', padding:'2px 8px', fontSize:11 }}>✕</button>
        </div>
      </div>

      {/* Checkbox simultánea (solo a partir de la 2da tarea) */}
      {index > 0 && (
        <label style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, cursor:'pointer', fontSize:10, color: bloque.simultanea ? 'var(--lime)' : 'var(--fog)' }}>
          <input type="checkbox" checked={!!bloque.simultanea} onChange={e => onChange('simultanea', e.target.checked)}
            style={{ accentColor:'var(--lime)', width:14, height:14 }} />
          <span style={{ fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>⏱ Simultánea con tarea anterior</span>
          {bloque.simultanea && <span style={{ fontSize:8, padding:'1px 6px', borderRadius:4, background:'rgba(200,241,53,.15)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.3)' }}>No suma tiempo extra</span>}
        </label>
      )}

      {/* Header SITUACIONES SIMULADORAS PREFERENCIALES */}
      <div style={{ textAlign:'center', marginBottom: 12, background:'var(--ink2)', padding:'8px', borderRadius:8, border:'1px solid var(--mist)' }}>
        <strong style={{ fontSize:11, color:'var(--snow)', textTransform:'uppercase', letterSpacing:'0.05em' }}>SITUACIONES SIMULADORAS PREFERENCIALES</strong>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        <button type="button" onClick={() => { onChange('tipo_entrenamiento', 'OPTIMIZADOR'); onChange('orientacion', ''); onChange('ventana', ''); onChange('subtareas', []) }}
          style={{ flex:1, padding:'8px', borderRadius:8, fontSize:10, fontWeight:700, border: bloque.tipo_entrenamiento === 'OPTIMIZADOR' ? '1px solid var(--lime)' : '1px solid var(--mist)', background: bloque.tipo_entrenamiento === 'OPTIMIZADOR' ? 'rgba(200,241,53,.15)' : 'var(--ink2)', color: bloque.tipo_entrenamiento === 'OPTIMIZADOR' ? 'var(--lime)' : 'var(--silver)', transition:'all .2s ease' }}>
          ENTRENAMIENTO OPTIMIZADOR
        </button>
        <button type="button" onClick={() => { onChange('tipo_entrenamiento', 'COADYUVANTE'); onChange('orientacion', ''); onChange('ventana', ''); onChange('subtareas', []) }}
          style={{ flex:1, padding:'8px', borderRadius:8, fontSize:10, fontWeight:700, border: bloque.tipo_entrenamiento === 'COADYUVANTE' ? '1px solid #60a5fa' : '1px solid var(--mist)', background: bloque.tipo_entrenamiento === 'COADYUVANTE' ? 'rgba(96,165,250,.15)' : 'var(--ink2)', color: bloque.tipo_entrenamiento === 'COADYUVANTE' ? '#60a5fa' : 'var(--silver)', transition:'all .2s ease' }}>
          ENTRENAMIENTO COADYUVANTE
        </button>
      </div>

      {bloque.tipo_entrenamiento && (
        <div style={{ marginBottom:12, padding:'10px', background:'var(--ink2)', borderRadius:8, border:'1px solid var(--mist)' }}>
          <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>Orientación de la Tarea</label>
          <div style={{ display:'flex', gap:6, marginBottom:12 }}>
            {(bloque.tipo_entrenamiento === 'OPTIMIZADOR' ? ['ESPECIAL', 'COMPETITIVO'] : ['GENERAL', 'DIRIGIDO']).map(ori => (
              <button key={ori} className="hover-scale" type="button" onClick={() => { onChange('orientacion', ori); onChange('ventana', ''); onChange('subtareas', []) }}
                style={{ padding:'6px 12px', borderRadius:20, fontSize:10, fontWeight:600, border: bloque.orientacion === ori ? '1px solid var(--silver)' : '1px solid rgba(255,255,255,.1)', background: bloque.orientacion === ori ? 'var(--ink)' : 'transparent', color: bloque.orientacion === ori ? 'var(--snow)' : 'var(--fog)', transition:'all .15s ease' }}>
                {ori}
              </button>
            ))}
          </div>
          
          {bloque.orientacion && (
            <>
              <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:3 }}>Tarea Específica</label>
              <select className="wp-input" value={bloque.ventana||''} onChange={e=>{ onChange('ventana',e.target.value); onChange('subtareas',[]); onChange('subtarea','') }} style={{ padding:'5px 8px', fontSize:12, appearance:'none', width:'100%' }}>
                <option value="">— Seleccionar —</option>
                {(bloque.tipo_entrenamiento === 'OPTIMIZADOR' ? ENTRENAMIENTO_OPTIMIZADOR[bloque.orientacion] : ENTRENAMIENTO_COADYUVANTE[bloque.orientacion]).map(t=><option key={t} value={t} style={{ background:'var(--ink)', color:'var(--snow)' }}>{t} (NE {NE_DEFAULT[t]})</option>)}
              </select>

              {bloque.ventana && (() => {
                const ne = bloque.ne ?? NE_DEFAULT[bloque.ventana] ?? 5
                const minTotal = (Number(bloque.series)||0) * (Number(bloque.minutos)||0)
                const ce = minTotal > 0 ? Math.round(minTotal * ne) : null
                return (
                  <div style={{ display:'flex', gap:8, marginTop:8, marginBottom:4, alignItems:'center', fontSize:10, fontFamily:'DM Mono,monospace' }}>
                    <span style={{ color:'var(--lime)', background:'rgba(200,241,53,.1)', border:'1px solid rgba(200,241,53,.25)', borderRadius:4, padding:'2px 6px' }}>NE {ne}</span>
                    <span style={{ color:'var(--fog)' }}>×{minTotal > 0 ? ` ${minTotal}min` : ' min'}</span>
                    {ce !== null
                      ? <span style={{ color:'#c8f135', fontWeight:700, background:'rgba(200,241,53,.08)', border:'1px solid rgba(200,241,53,.3)', borderRadius:4, padding:'2px 6px' }}>CE {ce}</span>
                      : <span style={{ color:'var(--fog)', fontStyle:'italic' }}>CE — (ingresá series y minutos)</span>
                    }
                  </div>
                )
              })()}
              
              {bloque.ventana && SUBTAREAS[bloque.ventana] && (
                <div style={{ marginTop:12, background:'var(--ink3)', padding:'10px', borderRadius:8, border:'1px solid rgba(255,255,255,.05)' }}>
                  <label style={{ fontSize:9, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:5 }}>↳ Opciones de Tarea <span style={{ fontWeight:400, color:'var(--fog)', textTransform:'none' }}>(podés elegir varias)</span></label>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {SUBTAREAS[bloque.ventana].map(s => {
                      const selected = getSubtareasArr(bloque).includes(s)
                      return (
                        <button className="hover-scale" key={s} type="button" onClick={() => {
                          const current = getSubtareasArr(bloque)
                          const updated = selected ? current.filter(x => x !== s) : [...current, s]
                          onChange('subtareas', updated)
                          onChange('subtarea', updated.join(', '))
                        }}
                        style={{
                          padding:'4px 10px', fontSize:11, borderRadius:20, cursor:'pointer',
                          fontWeight: selected ? 700 : 500, transition:'all .15s ease',
                          background: selected ? 'rgba(200,241,53,.2)' : 'rgba(255,255,255,.04)',
                          border: selected ? '1px solid rgba(200,241,53,.5)' : '1px solid rgba(255,255,255,.1)',
                          color: selected ? '#c8f135' : 'var(--silver)',
                        }}>{selected ? '✓ ' : ''}{s}</button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Orientación Física de la Tarea (Métricas/Dashboards) */}
      <div style={{ marginBottom:8, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, padding:'8px 10px' }}>
        <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>
          Orientación Física (Carga Táctica)
        </label>
        <select className="wp-input" value={bloque.orientacion_fisica||''} onChange={e=>onChange('orientacion_fisica',e.target.value)} style={{ padding:'5px 8px', fontSize:12, appearance:'none', width:'100%', background:'var(--ink)' }}>
          <option value="">— Autocalculado por Densidad —</option>
          <option value="Activación/Recuperación">A-R (Activación / Recuperación)</option>
          <option value="Fuerza">Fuerza</option>
          <option value="Resistencia">Resistencia</option>
          <option value="Velocidad">Velocidad</option>
        </select>
        <p style={{ fontSize:9, color:'var(--fog)', marginTop:6, marginBottom:0 }}>Si se deja vacío, se usará el objetivo estimado por la densidad GPS.</p>
      </div>

      {/* NE — Nivel de Especificidad */}
      {bloque.ventana && (
        <div style={{ marginBottom:8, background:'rgba(200,241,53,.04)', border:'1px solid rgba(200,241,53,.15)', borderRadius:8, padding:'8px 10px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <label style={{ fontSize:9, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              NE · Nivel de Especificidad
              <span style={{ fontWeight:400, color:'var(--silver)', marginLeft:6, textTransform:'none', letterSpacing:0 }}>
                (1 = Restauración → 10 = Partido oficial)
              </span>
            </label>
            <span style={{ fontSize:16, fontWeight:900, color:'var(--lime)', fontFamily:'DM Mono,monospace', minWidth:28, textAlign:'right' }}>{bloque.ne ?? NE_DEFAULT[bloque.ventana] ?? 5}</span>
          </div>
          <input type="range" min={1} max={10} step={0.5}
            value={bloque.ne ?? NE_DEFAULT[bloque.ventana] ?? 5}
            onChange={e => onChange('ne', parseFloat(e.target.value))}
            style={{ width:'100%', accentColor:'var(--lime)' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:8, color:'var(--fog)', marginTop:2 }}>
            <span>1 Restauración</span><span>5 Técnico-táctico</span><span>10 Partido oficial</span>
          </div>
        </div>
      )}

      {mostrarForm && (
        <div style={{ marginBottom:8 }}>
          {esConEspacio && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:6, marginBottom:6 }}>
              <div><label style={{ fontSize:9, fontWeight:700, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Atacantes</label>{inp('atacantes','Nº','number')}</div>
              <div><label style={{ fontSize:9, fontWeight:700, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Defensores</label>{inp('defensores','Nº','number')}</div>
              <div><label style={{ fontSize:9, fontWeight:700, color:'#a855f7', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Com. (Dentro)</label>{inp('comodines','Nº','number')}</div>
              <div><label style={{ fontSize:9, fontWeight:700, color:'#a855f7', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Com. (Fuera)</label>{inp('comodines_fuera_num','Nº','number')}</div>
            </div>
          )}
          <div style={{ display:'grid', gridTemplateColumns: esConEspacio ? '1fr 1fr' : '1fr 1fr 1fr', gap:6, marginBottom:6 }}>
            {esConEspacio && (
              <div><label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>
                  Total jugadores
                  {autoTotal > 0 && <span style={{ marginLeft:6, fontSize:8, padding:'1px 5px', borderRadius:3, background:'rgba(200,241,53,.15)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.3)' }}>Auto: {autoTotal}</span>}
                  {autoTotal === 0 && teamPlayers.length > 0 && !bloque.jugadores && (
                    <button className="hover-scale" type="button" onClick={()=>onChange('jugadores',String(teamPlayers.length))} style={{ marginLeft:6, fontSize:8, padding:'1px 5px', borderRadius:3, background:'rgba(200,241,53,.15)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.3)', cursor:'pointer' }}>
                      Auto ({teamPlayers.length})
                    </button>
                  )}
                </label>
                {autoTotal > 0
                  ? <div className="wp-input" style={{ padding:'5px 8px', fontSize:12, fontFamily:'DM Mono,monospace', color:'var(--lime)', background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.3)', borderRadius:6, display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{ fontWeight:700 }}>{autoTotal}</span>
                      <span style={{ fontSize:9, color:'var(--silver)' }}>({atacantes}A + {defensores}D + {comodines}C dentro + {comodinesFueraNum}C fuera)</span>
                    </div>
                  : inp('jugadores','Nº jugadores','number')
                }
              </div>
            )}
            <div><label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Bloques</label>{inp('series','Nº bloques','number')}</div>
            <div><label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Min / bloque</label>{inp('minutos','Min','number')}</div>
            <div><label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Pausa x bloque (min)</label>{inp('pausa','Min descanso','number')}</div>
          </div>
          {esConEspacio && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:4 }}>
              <div><label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Largo (m)</label>{inp('largo','m','number')}</div>
              <div><label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Ancho (m)</label>{inp('ancho','m','number')}</div>
            </div>
          )}
          {(bloque.series && bloque.minutos) && (
            <div style={{ fontSize:10, color:'var(--lime)', fontFamily:'DM Mono,monospace', marginTop:4 }}>
              ⏱ Tiempo activo: {(Number(bloque.series)*Number(bloque.minutos))} min
              {bloque.pausa ? ` + ${(Math.max(0, Number(bloque.series)-1)*Number(bloque.pausa))} min pausa = ${(Number(bloque.series)*Number(bloque.minutos) + Math.max(0, Number(bloque.series)-1)*Number(bloque.pausa))} min total` : ''}
            </div>
          )}
        </div>
      )}

      {esConEquipo && bloque.ventana && (
        <div style={{ marginBottom:8 }}>
          <label style={{ fontSize:9, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:6 }}>
            Equipos (opcional) — {totalJugadoresEquipos > 0 ? `${totalJugadoresEquipos} jugadores` : 'seleccioná jugadores por equipo'}
          </label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8 }}>
            {[1,2,3,4].map(eNum => {
              const eColor = EQUIPO_COLORS[eNum-1]
              const eJugs = equipos[eNum] || []
              return (
                <div key={eNum} style={{ background:'var(--ink2)', border:`1px solid ${eColor}33`, borderRadius:8, padding:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:eColor, marginBottom:6 }}>{EQUIPO_LABELS[eNum-1]} · {eJugs.length}</div>
                  {teamPlayers.length > 0 ? (
                    <div style={{ maxHeight:100, overflowY:'auto', display:'flex', flexWrap:'wrap', gap:4 }}>
                      {teamPlayers.map(p => {
                        const inThis = eJugs.includes(p.jugador_id)
                        const inOther = !inThis && jugadoresEquipos.includes(p.jugador_id)
                        return (
                          <button className="hover-scale" key={p.jugador_id} type="button" onClick={() => toggleJugadorEquipo(eNum, p.jugador_id)} disabled={inOther}
                            style={{ fontSize:9, padding:'2px 6px', borderRadius:4, cursor:inOther?'default':'pointer', border:`1px solid ${inThis?eColor:inOther?'var(--fog)':'var(--mist)'}`, background:inThis?`${eColor}25`:inOther?'rgba(0,0,0,.2)':'var(--ink3)', color:inThis?eColor:inOther?'var(--fog)':'var(--silver)', opacity:inOther?.5:1 }}>
                            {p.nombre.split(' ')[0]}
                          </button>
                        )
                      })}
                    </div>
                  ) : <div style={{ fontSize:9, color:'var(--fog)', fontStyle:'italic' }}>Sin jugadores</div>}
                </div>
              )
            })}
          </div>
          {totalJugadoresEquipos > 0 && <div style={{ marginTop:6, fontSize:10, color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>Total: {totalJugadoresEquipos} jugadores seleccionados</div>}
        </div>
      )}

      {bloque.tipo_entrenamiento === 'COADYUVANTE' && (
        <div style={{ marginBottom: 12, padding:'10px', background:'rgba(255,255,255,.02)', borderRadius:8, border:'1px dashed rgba(255,255,255,.1)' }}>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:8 }}>
            Ejes Estructurales
          </label>
          <div style={{ fontSize:9, color:'var(--fog)', marginBottom:8 }}>Selecciona los ejes estructurales a trabajar en esta tarea.</div>
          {fuerzaMandamientos.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
              {fuerzaMandamientos.map(m => {
                const isSelected = (bloque.ejes_estructurales || []).includes(m.id);
                return (
                  <button className="hover-scale" key={m.id} type="button" onClick={() => {
                    const current = bloque.ejes_estructurales || [];
                    const updated = isSelected ? current.filter(x => x !== m.id) : [...current, m.id];
                    onChange('ejes_estructurales', updated);
                  }}
                  style={{ fontSize:10, fontWeight:isSelected?700:500, padding:'4px 10px', borderRadius:6, cursor:'pointer', transition:'all .15s ease', background:isSelected?'rgba(200,241,53,.2)':'rgba(255,255,255,.05)', border:isSelected?'1px solid rgba(200,241,53,.5)':'1px solid rgba(255,255,255,.1)', color:isSelected?'#c8f135':'var(--silver)' }} title={m.nombre}>
                    {isSelected?'✓ ':''}{m.numero}. {m.nombre.split(' (')[0]}
                  </button>
                )
              })}
            </div>
          )}

          <div style={{ borderTop:'1px solid rgba(255,255,255,.05)', paddingTop:12, marginTop:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ background:'var(--ink)', width:36, height:36, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, border:'1px solid rgba(255,255,255,.05)' }}>💪</div>
                <div>
                  <div style={{ fontSize:16, fontWeight:900, color:'var(--snow)', fontStyle:'italic', textTransform:'uppercase', letterSpacing:'0.05em', lineHeight:1 }}>RUTINA DE FUERZA</div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#f472b6', fontStyle:'italic', textTransform:'uppercase', letterSpacing:'0.05em' }}>Los 10 Mandamientos</div>
                </div>
              </div>
              <button className="hover-scale" type="button" onClick={() => onChange('rutinaGym', [...(bloque.rutinaGym || []), { ejercicio: '', series: '', repeticiones: '', peso: '' }])} style={{ background:'rgba(200,241,53,.15)', border:'1px solid rgba(200,241,53,.3)', borderRadius:4, padding:'6px 12px', color:'var(--lime)', fontSize:10, cursor:'pointer', fontWeight:700 }}>+ Añadir Ejercicio</button>
            </div>
            {(bloque.rutinaGym || []).map((r: any, rIdx: number) => {
              const selectedEj = fuerzaEjercicios.find(e => e.nombre.toLowerCase() === r.ejercicio?.toLowerCase());
              const mand = selectedEj ? fuerzaMandamientos.find(m => m.id === selectedEj.mandamiento_id) : null;
              return (
                <div key={rIdx} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ display:'flex', flex:2, minWidth:200, gap:6, alignItems:'center' }}>
                    {selectedEj?.imagen_url && (
                      <div style={{ width:40, height:40, borderRadius:4, overflow:'hidden', flexShrink:0, border:'1px solid rgba(255,255,255,.1)', background:'var(--ink2)' }} title="Imagen del ejercicio">
                        <img src={selectedEj.imagen_url} alt="Ej" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      </div>
                    )}
                    <input list={`ejercicios-datalist-${index}`} type="text" placeholder="Ejercicio (ej. Sentadilla)" value={r.ejercicio} onChange={(e) => { const newR = [...(bloque.rutinaGym||[])]; newR[rIdx].ejercicio = e.target.value; onChange('rutinaGym', newR) }} style={{ padding:'4px 8px', fontSize:11, borderRadius:4, border:'1px solid rgba(255,255,255,.1)', background:'var(--ink3)', color:'var(--snow)', width:'100%' }} />
                    {mand && <span style={{ fontSize:9, color:'var(--lime)', padding:'2px 6px', background:'rgba(200,241,53,.1)', borderRadius:4, border:'1px solid rgba(200,241,53,.2)', flexShrink:0, whiteSpace:'nowrap' }} title={mand.nombre}>M{mand.numero}</span>}
                  </div>
                  <input type="text" placeholder="Series" value={r.series} onChange={(e) => { const newR = [...(bloque.rutinaGym||[])]; newR[rIdx].series = e.target.value; onChange('rutinaGym', newR) }} style={{ padding:'4px 8px', fontSize:11, borderRadius:4, border:'1px solid rgba(255,255,255,.1)', background:'var(--ink3)', color:'var(--snow)', flex:1, minWidth:50 }} />
                  <input type="text" placeholder="Reps" value={r.repeticiones} onChange={(e) => { const newR = [...(bloque.rutinaGym||[])]; newR[rIdx].repeticiones = e.target.value; onChange('rutinaGym', newR) }} style={{ padding:'4px 8px', fontSize:11, borderRadius:4, border:'1px solid rgba(255,255,255,.1)', background:'var(--ink3)', color:'var(--snow)', flex:1, minWidth:50 }} />
                  <input type="text" placeholder="Carga" value={r.peso} onChange={(e) => { const newR = [...(bloque.rutinaGym||[])]; newR[rIdx].peso = e.target.value; onChange('rutinaGym', newR) }} style={{ padding:'4px 8px', fontSize:11, borderRadius:4, border:'1px solid rgba(255,255,255,.1)', background:'var(--ink3)', color:'var(--snow)', flex:1, minWidth:50 }} />
                  <button className="hover-scale" type="button" onClick={() => { const newR = [...(bloque.rutinaGym||[])]; newR.splice(rIdx, 1); onChange('rutinaGym', newR) }} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', padding:4, fontSize:12, flexShrink:0 }}>✕</button>
                </div>
              )
            })}
            <datalist id={`ejercicios-datalist-${index}`}>
              {fuerzaEjercicios
                .filter(ej => {
                  const activeEjes = bloque.ejes_estructurales || [];
                  if (activeEjes.length === 0) return true; // Mostrar todo si no hay ejes seleccionados
                  return activeEjes.includes(ej.mandamiento_id);
                })
                .map(ej => (
                  <option key={ej.id} value={ej.nombre}>{ej.nombre}</option>
                ))}
            </datalist>
            {(!bloque.rutinaGym || bloque.rutinaGym.length === 0) && (
              <div style={{ fontSize:10, color:'var(--fog)', fontStyle:'italic', padding:'8px 0', textAlign:'center' }}>Sin ejercicios en la rutina. Añade uno para comenzar.</div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom:8 }}>
        <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Descripción / Notas adicionales</label>
        <textarea className="wp-input" value={bloque.descripcion||''} onChange={e=>onChange('descripcion',e.target.value)} rows={2} placeholder="Descripción de la tarea..." style={{ padding:'6px 8px', fontSize:12, resize:'vertical', fontFamily:'inherit', width:'100%' }} />
      </div>

      {esConEspacio && calc && (() => {
        const cuad = getCuadrante(calc.densidad, playersInside)
        const OBJCOLORS: Record<string,string> = { 'Fuerza':'#a855f7', 'Resistencia':'#f59e0b', 'Activación':'#22c55e', 'Activación/Recuperación':'#22c55e', 'Velocidad':'#3b82f6' }
        const objColor = OBJCOLORS[cuad.objetivo] || '#888'
        return (
          <div style={{ background:`${objColor}10`, border:`1px solid ${objColor}33`, borderRadius:8, padding:10 }}>
            <div style={{ background:`${objColor}20`, border:`1px solid ${objColor}44`, borderRadius:8, padding:'8px 12px', marginBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <span style={{ fontSize:12, fontWeight:800, color:objColor, textTransform:'uppercase', letterSpacing:'0.05em' }}>▣ {cuad.label}</span>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--snow)', fontFamily:'DM Mono,monospace' }}>{calc.densidad.toFixed(1)} m²/jug</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', background:`${objColor}25`, borderRadius:6, marginBottom:4 }}>
                <span style={{ fontSize:11, color:'var(--silver)' }}>Objetivo de la tarea:</span>
                <span style={{ fontSize:13, fontWeight:800, color:objColor, textTransform:'uppercase', letterSpacing:'0.05em' }}>{cuad.objetivo}</span>
                <span style={{ marginLeft:'auto', display:'flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:'50%', background:objColor, color:'#fff', fontSize:15, fontWeight:900, fontFamily:'DM Mono,monospace', flexShrink:0 }} title="Intensidad (1=más intenso, 4=menos intenso)">{cuad.intensidad}</span>
              </div>
              <p style={{ fontSize:10, color:objColor, opacity:.85, margin:0, fontStyle:'italic' }}>{cuad.desc}</p>
            </div>
            <div style={{ display:'flex', gap:2, marginBottom:8 }}>
              {[['Fuerza','#a855f7'],['Activación','#22c55e'],['Resistencia','#f59e0b'],['Velocidad','#3b82f6']].map(([lbl,col])=>(
                <div key={lbl} style={{ flex:1, textAlign:'center' }}>
                  <div style={{ height:5, background:col as string, borderRadius:3, opacity:cuad.objetivo===lbl?1:.25, marginBottom:2 }}/>
                  <span style={{ fontSize:7, color:col as string, opacity:cuad.objetivo===lbl?1:.5 }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <p style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>📐 Estimación de carga · {calc.tiempoTotal} min activos</p>
              <button className="hover-scale" type="button" onClick={()=>setEditingMetrics(e=>!e)} style={{ fontSize:9, padding:'2px 8px', borderRadius:4, background:'transparent', border:`1px solid ${editingMetrics?'var(--lime)':'var(--fog)'}`, color:editingMetrics?'var(--lime)':'var(--silver)', cursor:'pointer' }}>
                {editingMetrics ? '✓ Listo' : '✏️ Editar GPS'}
              </button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:5 }}>
              {[['Dist. total','distTotal','m'],['Sprint >21km/h','distSprint','m'],['Alta pot. >20W/kg','distMP','m'],['Acel. >2m/s²','distAcel','m'],['Decel. >-2m/s²','distDecel','m'],['Nº sprints','nSprints',''],['Nº acel. >3m/s²','nAcel',''],['Nº decel. >-3m/s²','nDecel','']].map(([label,key,unit])=>{
                const rawVal = Math.round(calc[key])
                return (
                  <div key={key} style={{ textAlign:'center', background:'var(--ink2)', borderRadius:6, padding:'5px 4px' }}>
                    <div style={{ fontSize:8, color:'var(--silver)', marginBottom:2, lineHeight:1.3 }}>{label}</div>
                    {editingMetrics ? (
                      <input type="number" value={manualMetrics[key]!==undefined?manualMetrics[key]:rawVal} onChange={e=>updateManualMetric(key,e.target.value)}
                        style={{ width:'100%', fontSize:11, fontWeight:700, color:'var(--lime)', fontFamily:'DM Mono,monospace', background:'var(--ink3)', border:'1px solid var(--lime)', borderRadius:4, padding:'2px 4px', textAlign:'center', outline:'none' }} />
                    ) : (
                      <div style={{ fontSize:13, fontWeight:700, color:manualMetrics[key]?'#60a5fa':'var(--snow)', fontFamily:'DM Mono,monospace' }}>
                        {manualMetrics[key]!==undefined?manualMetrics[key]:rawVal}<span style={{ fontSize:9, color:'var(--fog)' }}>{unit}</span>
                        {manualMetrics[key] && <span style={{ fontSize:7, color:'#60a5fa', display:'block' }}>GPS</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* CE / UCE inline calculation display */}
      {bloque.ventana && (() => {
        const ne = bloque.ne ?? NE_DEFAULT[bloque.ventana] ?? 5
        const minutos = Number(bloque.minutos) || 0
        const bloques = Number(bloque.series) || 1
        const minTotal = minutos * bloques
        const ce = Math.round(minTotal * ne)
        if (!minTotal) return null
        return (
          <div style={{ background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.2)', borderRadius:8, padding:'8px 12px', marginBottom:8, fontFamily:'DM Mono,monospace' }}>
            <span style={{ fontSize:10, color:'var(--silver)' }}>{minTotal}min</span>
            <span style={{ fontSize:10, color:'var(--fog)' }}> × </span>
            <span style={{ fontSize:10, color:'var(--lime)', fontWeight:700 }}>NE{ne}</span>
            <span style={{ fontSize:10, color:'var(--fog)' }}> = </span>
            <span style={{ fontSize:11, color:'#c8f135', fontWeight:700 }}>CE {ce}</span>
          </div>
        )
      })()}

      {bloque.ventana && (
        <div style={{ marginTop:10 }}>
          <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>Imagen de la tarea</label>
          <label style={{ cursor:'pointer', display:'block' }}>
            <div style={{ width:'100%', borderRadius:10, border:imgPreview?'none':'2px dashed rgba(200,241,53,.3)', background:'var(--ink2)', overflow:'hidden', minHeight:60, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {imgPreview ? <img src={imgPreview} style={{ width:'100%', maxHeight:200, objectFit:'contain', display:'block' }} /> : <span style={{ fontSize:22, color:'var(--fog)', padding:16 }}>📷 Cargar imagen</span>}
            </div>
            <input type="file" accept="image/*" onChange={handleImg} style={{ display:'none' }} />
          </label>
          {imgPreview && <button className="hover-scale" type="button" onClick={()=>{ setImgPreview(null); onChange('imagen','') }} style={{ fontSize:9, color:'#f87171', background:'none', border:'none', cursor:'pointer', marginTop:2 }}>Quitar imagen</button>}
        </div>
      )}
    </div>
  )
}

const BloqueMetodologiaMemo = React.memo(BloqueMetodologia, (prev: any, next: any) => {
  return prev.bloque === next.bloque &&
         prev.index === next.index &&
         prev.isFirst === next.isFirst &&
         prev.isLast === next.isLast &&
         prev.teamPlayers === next.teamPlayers
})
async function imprimirSesion(f: any, bloques: any[], teamPlayers: any[] = []) {
  const metricKeys = ['distTotal','distSprint','distMP','distAcel','distDecel','nSprints','nAcel','nDecel']
  const metricLabels = ['Dist. total','Sprint >21km/h','Alta pot. >20W/kg','Acel. >2m/s²','Decel. >-2m/s²','Nº sprints','Nº acel. >3m/s²','Nº decel. >-3m/s²']
  const metricUnits = ['m','m','m','m','m','','','']
  const totals: Record<string,number> = {}
  metricKeys.forEach(k => { totals[k] = 0 })
  
  let fuerzaEjercicios: any[] = []
  if (bloques.some(b => b.rutinaGym && b.rutinaGym.length > 0)) {
    try {
      const res = await fetch('/api/fuerza/ejercicios')
      const data = await res.json()
      if (data.ejercicios) fuerzaEjercicios = data.ejercicios
    } catch(e) {}
  }

  let hasCarga = false
  bloques.forEach(bl => {
    if (!TAREAS_CON_ESPACIO.includes(bl.ventana)) return
    const jugN = getJugadoresBloque(bl, TAREAS_CON_EQUIPO.includes(bl.ventana))
    const calc = calcularDistancias(jugN, Number(bl.largo), Number(bl.ancho), Number(bl.series), Number(bl.minutos))
    if (!calc) return
    hasCarga = true
    metricKeys.forEach(k => {
      const manual = bl.manualMetrics?.[k]
      totals[k] += manual !== undefined && manual !== '' ? parseFloat(manual) : calc[k]
    })
  })

  const { tiempoTrabajo, tiempoDescanso } = calcTiempoConSimultaneas(bloques)

  const OBJCOLORS: Record<string,string> = { 'Fuerza':'#7c3aed','Resistencia':'#d97706','Activación':'#16a34a','Activación/Recuperación':'#16a34a','Velocidad':'#2563eb' }

  const tareasHtml = bloques.map((bl, i) => {
    const jugN = getJugadoresBloque(bl, TAREAS_CON_EQUIPO.includes(bl.ventana))
    const calc = TAREAS_CON_ESPACIO.includes(bl.ventana) ? calcularDistancias(jugN, Number(bl.largo), Number(bl.ancho), Number(bl.series), Number(bl.minutos)) : null
    const cuad = calc ? getCuadrante(calc.densidad, jugN) : null
    const objColor = cuad ? (OBJCOLORS[cuad.objetivo] || '#555') : '#555'

    const equiposHtml = TAREAS_CON_EQUIPO.includes(bl.ventana) && bl.equipos
      ? `<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${[1,2,3,4].map(n => {
          const jugs: any[] = (bl.equipos[n]||[])
          if (!jugs.length) return ''
          const cols = ['#16a34a','#2563eb','#d97706','#dc2626']
          const names = jugs.map((id: any) => {
            const p = teamPlayers.find((tp: any) =>
              tp.jugador_id === id || String(tp.jugador_id) === String(id) ||
              tp.id === id || String(tp.id) === String(id)
            )
            return p ? (p.nombre || p.name || 'Jug.') : null
          }).filter(Boolean)
          const label = names.length > 0 ? names.join(', ') : `${jugs.length} jug.`
          return `<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${cols[n-1]}20;color:${cols[n-1]};border:1px solid ${cols[n-1]}44"><strong>Equipo ${n}:</strong> ${label}</span>`
        }).join('')}</div>` : ''

    const imgHtml = bl.imagen ? `<img src="${bl.imagen}" style="width:100%;max-height:180px;object-fit:contain;border-radius:6px;margin-top:8px;border:1px solid #ddd" />` : ''

    const calcHtml = calc ? `
      <div style="margin-top:8px;background:${objColor}15;border:1px solid ${objColor}33;border-radius:6px;padding:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <strong style="color:${objColor};font-size:11px;text-transform:uppercase">${cuad!.label} · ${calc.densidad.toFixed(1)} m²/jug</strong>
          <span style="font-size:12px;font-weight:800;color:${objColor};text-transform:uppercase">🎯 ${cuad!.objetivo} <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${objColor};color:#fff;font-size:12px;font-weight:900;vertical-align:middle;margin-left:4px">${cuad!.intensidad}</span></span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:6px">
          ${metricKeys.map((k,mi) => {
            const val = bl.manualMetrics?.[k] !== undefined ? bl.manualMetrics[k] : Math.round(calc[k])
            return `<div style="text-align:center;background:#f8f8f8;border-radius:4px;padding:4px 2px"><div style="font-size:8px;color:#666">${metricLabels[mi]}</div><div style="font-size:12px;font-weight:700">${val}${metricUnits[mi]}</div></div>`
          }).join('')}
        </div>
      </div>` : ''

    return `
    <div style="border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:10px;page-break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="font-size:13px;color:#111">Tarea ${i+1}${bl.ventana ? ` — ${bl.ventana}` : ''}${getSubtareasDisplay(bl) ? ` › ${getSubtareasDisplay(bl)}` : ''}${bl.simultanea ? ' <span style="font-size:10px;color:#16a34a;background:#f0fdf4;padding:1px 6px;border-radius:4px">⏱ Simultánea</span>' : ''}</strong>
        <span style="font-size:11px;color:#555">${[bl.series&&`${bl.series} bloques`,bl.minutos&&`${bl.minutos} min/bl`,bl.pausa&&`pausa ${bl.pausa} min`,bl.largo&&bl.ancho&&`${bl.largo}×${bl.ancho}m`,jugN&&`${jugN} jug.`].filter(Boolean).join(' · ')}</span>
      </div>
      ${equiposHtml}
      ${(bl.rutinaGym && bl.rutinaGym.length > 0) ? `
        <table className="wp-table" style="width:100%; border-collapse:collapse; margin-top:6px; margin-bottom:${bl.descripcion?6:0}px; font-size:10px;">
          <thead>
            <tr style="background:#f3f4f6; color:#374151; text-transform:uppercase; text-align:left;">
              <th style="padding:4px 6px; border:1px solid #e5e7eb;">Ejercicio</th>
              <th style="padding:4px 6px; border:1px solid #e5e7eb;">Series</th>
              <th style="padding:4px 6px; border:1px solid #e5e7eb;">Reps</th>
              <th style="padding:4px 6px; border:1px solid #e5e7eb;">Carga</th>
            </tr>
          </thead>
          <tbody>
            ${bl.rutinaGym.map((r:any) => {
              const selectedEj = fuerzaEjercicios.find(e => e.nombre.toLowerCase() === r.ejercicio?.toLowerCase());
              return `
              <tr style="border-bottom:1px solid #e5e7eb; color:#4b5563;">
                <td style="padding:4px 6px; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb; display:flex; align-items:center; gap:8px;">
                  ${selectedEj?.imagen_url ? `<img src="${selectedEj.imagen_url}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;" />` : ''}
                  <span>${r.ejercicio}</span>
                </td>
                <td style="padding:4px 6px; border-right:1px solid #e5e7eb;">${r.series}</td>
                <td style="padding:4px 6px; border-right:1px solid #e5e7eb;">${r.repeticiones}</td>
                <td style="padding:4px 6px; border-right:1px solid #e5e7eb;">${r.peso}</td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      ` : ''}
      ${bl.descripcion ? `<p style="font-size:11px;color:#333;margin:4px 0">${bl.descripcion}</p>` : ''}
      ${calcHtml}
      ${imgHtml}
    </div>`
  }).join('')

  const totalResumenHtml = hasCarga ? `
    <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px;margin-bottom:12px">
      <strong style="font-size:12px;color:#1d4ed8">📊 Carga total de la sesión</strong>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px">
        ${metricKeys.map((k,i) => `<div style="text-align:center;background:white;border-radius:4px;padding:6px"><div style="font-size:9px;color:#555">${metricLabels[i]}</div><div style="font-size:14px;font-weight:700;color:#1d4ed8">${Math.round(totals[k])}${metricUnits[i]}</div></div>`).join('')}
      </div>
    </div>` : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sesión ${f.fecha}</title>
  <style>
    :root{color-scheme:light}
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#111;background:#fff}
    h1{font-size:24px;margin-bottom:4px;color:#111}
    h3{color:#333}
    .meta{font-size:12px;color:#555;margin-bottom:16px}
    @media print{body{padding:10px;background:#fff;color:#111}.no-print{display:none}@page{margin:1.5cm}}
  </style></head><body style="background:#fff;color:#111">
  <div class="no-print" style="margin-bottom:16px">
    <button class="hover-scale btn-ghost" onclick="window.print()" style="padding: 8px 20px; cursor: pointer;">🖨️ Imprimir / Guardar PDF</button>
  </div>
  <h1>${f.titulo || 'Sesión de entrenamiento'}</h1>
  <div class="meta">
    📅 ${f.fecha}
    ${f.hora_inicio ? ` · 🕐 ${f.hora_inicio}${f.hora_fin?` – ${f.hora_fin}`:''}` : ''}
    ${f.objetivo ? ` · 🎯 ${f.objetivo}` : ''}
    ${f.objetivo_secundario ? ` / ${f.objetivo_secundario}` : ''}
    ${f.rpe_objetivo ? ` · RPE objetivo: ${f.rpe_objetivo}` : ''}
  </div>
  ${(tiempoTrabajo+tiempoDescanso)>0 ? `
  <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;margin-bottom:12px;display:flex;gap:24px">
    <div><strong style="font-size:18px;color:#16a34a">${tiempoTrabajo+tiempoDescanso} min</strong><br><small style="color:#555">Tiempo total</small></div>
    <div><strong style="font-size:18px;color:#16a34a">${tiempoTrabajo} min</strong><br><small style="color:#555">Trabajo</small></div>
    <div><strong style="font-size:18px;color:#d97706">${tiempoDescanso} min</strong><br><small style="color:#555">Descanso</small></div>
  </div>` : ''}
  ${totalResumenHtml}
  <h3 style="font-size:13px;text-transform:uppercase;color:#555;letter-spacing:.05em;margin-bottom:8px">Tareas (${bloques.length})</h3>
  ${tareasHtml}
  ${f.notas ? `<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:10px"><strong>Notas:</strong> ${f.notas}</div>` : ''}
  </body></html>`

  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

function SesionEditor({ sesion, defaultFecha, rpeReal = 0, onSave, onDelete, onCancel, teamPlayers = [], canchas = [] }) {
  const [f, setF] = useState({
    fecha: sesion?.fecha || defaultFecha,
    hora_inicio: sesion?.hora_inicio?.slice(0,5) || '',
    hora_fin: sesion?.hora_fin?.slice(0,5) || '',
    rival: sesion?.rival || '',
    rival_foto: sesion?.rival_foto || '',
    tipo: sesion?.tipo || 'entrenamiento',
    titulo: sesion?.titulo || '',
    objetivo: sesion?.objetivo || '',
    objetivo_secundario: sesion?.objetivo_secundario || '',
    descripcion: sesion?.descripcion || '',
    rpe_objetivo: sesion?.rpe_objetivo ? String(sesion.rpe_objetivo) : '',
    notas: sesion?.notas || '',
    cancha_id: sesion?.cancha_id || '',
  })
  const [bloques, setBloques] = useState<any[]>(() => {
    try { return sesion?.ejercicios?.length ? sesion.ejercicios : [] } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function addBloque() { setBloques(b=>[...b, { _tempId: Date.now()+Math.random(), tipo_entrenamiento:'', orientacion:'', orientacion_fisica:'', ejes_estructurales:[], ventana:'', subtareas:[], subtarea:'', jugadores:'', series:'', minutos:'', pausa:'', largo:'', ancho:'', descripcion:'Ejercicios:\nSeries:\nRep:\nDescanso:\n', imagen:'', atacantes:'', defensores:'', comodines:'', comodines_fuera_num:'', simultanea:false, rutinaGym:[] }]) }
  function addBloqueFromBiblioteca(t: any) {
    const newBloque = {
      _tempId: Date.now() + Math.random(),
      tipo_entrenamiento: t.tipo_entrenamiento || '',
      orientacion: t.orientacion || '',
      orientacion_fisica: t.orientacion_fisica || '',
      ejes_estructurales: t.ejes_estructurales || [],
      ventana: t.ventana || '',
      subtareas: Array.isArray(t.subtareas) ? t.subtareas : (t.subtarea ? [t.subtarea] : []),
      subtarea: Array.isArray(t.subtareas) ? t.subtareas.join(', ') : (t.subtarea || ''),
      jugadores: t.jugadores ? String(t.jugadores) : '',
      series: t.series ? String(t.series) : '',
      minutos: t.minutos ? String(t.minutos) : '',
      pausa: t.pausa ? String(t.pausa) : '',
      largo: t.largo ? String(t.largo) : '',
      ancho: t.ancho ? String(t.ancho) : '',
      descripcion: t.descripcion || t.nombre || '',
      imagen: t.diagram_preview || t.imagen || '',
      tactical_diagram: t.tactical_diagram || '',
      atacantes: '', defensores: '', comodines: '', comodines_fuera_num: '',
      rutinaGym: t.rutinaGym || [],
    }
    setBloques(prev => [...prev, newBloque])
    // Increment usage counter in background
    fetch('/api/biblioteca', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'usar', id: t.id }) }).catch(()=>{})
    setShowBiblioteca(false)
  }
  const updateBloque = useCallback((i,k,v) => { setBloques(b=>b.map((bl,idx)=>idx===i?{...bl,[k]:v}:bl)) }, [])
  const removeBloque = useCallback((i) => { setBloques(b=>b.filter((_,idx)=>idx!==i)) }, [])
  const moveBloqueUp = useCallback((i) => {
    if (i === 0) return
    setBloques(b => { const c=[...b]; const t=c[i]; c[i]=c[i-1]; c[i-1]=t; return c })
  }, [])
  const moveBloqueDown = useCallback((i) => {
    setBloques(b => {
      if (i === b.length - 1) return b
      const c=[...b]; const t=c[i]; c[i]=c[i+1]; c[i+1]=t; return c 
    })
  }, [])

  const [showBiblioteca, setShowBiblioteca] = useState(false)
  const [biblioTareas, setBiblioTareas] = useState<any[]>([])
  const [biblioLoading, setBiblioLoading] = useState(false)
  const [biblioSearch, setBiblioSearch] = useState('')

  async function abrirBiblioteca() {
    setShowBiblioteca(true)
    setBiblioLoading(true)
    try {
      const r = await fetch('/api/biblioteca')
      const d = await r.json()
      setBiblioTareas(d.tareas || [])
    } catch {}
    setBiblioLoading(false)
  }

  async function submit() {
    if (!f.fecha) return
    setLoading(true); setSaveError('')
    try {
      await onSave({ ...f, hora_inicio: f.hora_inicio||null, hora_fin: f.hora_fin||null, rpe_objetivo:f.rpe_objetivo?Number(f.rpe_objetivo):null, ejercicios: bloques })
    } catch(e) {
      setSaveError('Error al guardar. Intentá de nuevo.')
    }
    setLoading(false)
  }

  return (
    <div className="anim-up" style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:16, padding:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <p style={{ fontSize:14, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          {sesion ? '✏️ Editar sesión' : '+ Nueva sesión'}
        </p>
        <button className="hover-bright" type="button" onClick={onCancel} style={{ background:'transparent', border:'none', color:'var(--fog)', cursor:'pointer', fontSize:18 }}>✕</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
        {/* Fecha */}
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Fecha</label>
          <input type="date" className="wp-input" value={f.fecha} onChange={e=>set('fecha',e.target.value)} style={{ padding:'8px 12px', fontSize:13 }} />
        </div>
        {/* Tipo */}
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Tipo</label>
          <select className="wp-input" value={f.tipo} onChange={e=>set('tipo',e.target.value)} style={{ padding:'8px 12px', fontSize:13, appearance:'none' }}>
            {Object.keys(TIPO_COLORES).map(t=><option key={t} value={t} style={{ background:'var(--ink2)', textTransform:'capitalize' }}>{TIPO_ICONOS[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
        </div>
        {/* Hora inicio */}
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Hora inicio</label>
          <input type="time" className="wp-input" value={f.hora_inicio} onChange={e=>set('hora_inicio',e.target.value)} style={{ padding:'8px 12px', fontSize:13 }} />
        </div>
        {/* Hora fin */}
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Hora fin</label>
          <input type="time" className="wp-input" value={f.hora_fin} onChange={e=>set('hora_fin',e.target.value)} style={{ padding:'8px 12px', fontSize:13 }} />
        </div>
        {/* Título de la sesión - dropdown MD */}
        <div style={{ gridColumn:'span 2' }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Título de la sesión</label>
          <select className="wp-input" value={f.titulo} onChange={e=>set('titulo',e.target.value)} style={{ padding:'8px 12px', fontSize:13, appearance:'none' }}>
            <option value="">— Seleccionar —</option>
            {TITULOS_SESION.map(t=><option key={t} value={t} style={{ background:'var(--ink2)' }}>{t}</option>)}
          </select>
        </div>
        {/* Objetivo Físico Principal */}
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Objetivo Físico Principal</label>
          <select className="wp-input" value={f.objetivo} onChange={e=>set('objetivo',e.target.value)} style={{ padding:'8px 12px', fontSize:13, appearance:'none' }}>
            <option value="" style={{ background:'var(--ink2)' }}>— Seleccionar —</option>
            {OBJETIVOS_FISICOS.map(o=><option key={o} value={o} style={{ background:'var(--ink2)' }}>{o}</option>)}
          </select>
        </div>
        {/* Objetivo Secundario */}
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Objetivo Secundario</label>
          <select className="wp-input" value={f.objetivo_secundario} onChange={e=>set('objetivo_secundario',e.target.value)} style={{ padding:'8px 12px', fontSize:13, appearance:'none' }}>
            <option value="" style={{ background:'var(--ink2)' }}>— Seleccionar —</option>
            {OBJETIVOS_SECUNDARIOS.map(o=><option key={o} value={o} style={{ background:'var(--ink2)' }}>{o}</option>)}
          </select>
        </div>
        {/* RPE objetivo */}
        <div style={{ gridColumn:'span 2' }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>RPE objetivo (1–10)</label>
          <input type="number" min="1" max="10" step="0.1" className="wp-input" value={f.rpe_objetivo} onChange={e=>set('rpe_objetivo',e.target.value)} placeholder="ej: 7" style={{ padding:'8px 12px', fontSize:13 }} />
        </div>
        {/* Estadio / Cancha */}
        <div style={{ gridColumn:'span 2' }}>
          <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>📍 Estadio / Cancha</label>
          <select className="wp-input" value={f.cancha_id} onChange={e=>{const id=e.target.value;set('cancha_id',id);if(id){const c=canchas.find(cc=>String(cc.id)===String(id));if(c&&c.largo_m&&c.ancho_m){setBloques(prev=>prev.map(bl=>({...bl,largo:bl.largo||String(c.largo_m),ancho:bl.ancho||String(c.ancho_m)})))}}}} style={{ padding:'8px 12px', fontSize:13, appearance:'none' }}>
            <option value="">— Sin vincular —</option>
            {canchas.map(c=><option key={c.id} value={c.id} style={{ background:'var(--ink2)' }}>{c.nombre} ({c.largo_m}×{c.ancho_m}m)</option>)}
          </select>
        </div>
        {/* Rival + escudo — solo para tipo partido */}
        {f.tipo === 'partido' && (<>
          <div style={{ gridColumn:'span 2' }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>🏆 Rival</label>
            <input className="wp-input" value={f.rival||''} onChange={e=>set('rival',e.target.value)} placeholder="Nombre del equipo rival" style={{ padding:'8px 12px', fontSize:13 }} />
          </div>
          <div style={{ gridColumn:'span 2' }}>
            <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>🛡️ Escudo del rival (imagen)</label>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              {f.rival_foto && (
                <div style={{ width:48, height:48, borderRadius:10, overflow:'hidden', border:'1px solid var(--lime)', background:'var(--ink3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <img src={f.rival_foto} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} alt="escudo rival" />
                </div>
              )}
              <label style={{ flex:1, cursor:'pointer' }}>
                <div style={{ padding:'8px 14px', borderRadius:8, border:'1px dashed var(--fog)', color:'var(--silver)', fontSize:12, textAlign:'center', background:'var(--ink3)', cursor:'pointer' }}>
                  {f.rival_foto ? '✓ Escudo cargado · Click para cambiar' : '📁 Click para subir escudo (PNG/JPG)'}
                </div>
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{
                  const file = e.target.files?.[0]; if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const img = new Image()
                    img.onload = () => {
                      const canvas = document.createElement('canvas')
                      const MAX = 120
                      const scale = Math.min(MAX/img.width, MAX/img.height, 1)
                      canvas.width = img.width * scale
                      canvas.height = img.height * scale
                      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
                      set('rival_foto', canvas.toDataURL('image/png', 0.8))
                    }
                    img.src = reader.result as string
                  }
                  reader.readAsDataURL(file)
                }} />
              </label>
              {f.rival_foto && (
                <button className="hover-scale" type="button" onClick={()=>set('rival_foto','')} style={{ fontSize:10, padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer' }}>✕</button>
              )}
            </div>
          </div>
        </>)}
      </div>

      {/* Descripción / Metodología — Bloques de tareas */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em' }}>📋 Descripción / Metodología · Tareas ({bloques.length})</label>
          <div style={{ display:'flex', gap:8 }}>
            <button className="hover-scale" type="button" onClick={abrirBiblioteca} style={{ fontSize:11, padding:'4px 12px', borderRadius:8, background:'rgba(200,241,53,.06)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.2)', cursor:'pointer' }}>🎨 Mis Tareas</button>
            <button className="hover-scale" type="button" onClick={addBloque} style={{ fontSize:11, padding:'4px 12px', borderRadius:8, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.3)', cursor:'pointer' }}>+ Tarea</button>
          </div>
        </div>

        {/* Biblioteca selector modal */}
        {showBiblioteca && (
          <div style={{ background:'var(--ink3)', border:'1px solid rgba(200,241,53,.25)', borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>🎨 Elegir tarea guardada</span>
              <button className="hover-scale" type="button" onClick={()=>setShowBiblioteca(false)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--silver)', fontSize:16 }}>✕</button>
            </div>
            <input
              type="text" placeholder="🔍 Buscar tarea..."
              value={biblioSearch} onChange={e=>setBiblioSearch(e.target.value)}
              style={{ width:'100%', background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, padding:'7px 12px', fontSize:12, color:'var(--snow)', outline:'none', marginBottom:10 }}
            />
            {biblioLoading ? (
              <div style={{ padding:20, textAlign:'center', color:'var(--silver)', fontSize:12 }}>Cargando...</div>
            ) : (
              <div style={{ maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {biblioTareas
                  .filter(t => !biblioSearch || t.nombre.toLowerCase().includes(biblioSearch.toLowerCase()) || (t.ventana||'').toLowerCase().includes(biblioSearch.toLowerCase()))
                  .map((t: any) => (
                    <button className="hover-scale"
                      key={t.id} type="button"
                      onClick={() => addBloqueFromBiblioteca(t)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', borderRadius:8, background:'var(--ink2)', border:'1px solid var(--mist)', cursor:'pointer', textAlign:'left', transition:'border-color .12s' }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor='var(--lime)'}
                      onMouseLeave={e=>e.currentTarget.style.borderColor='var(--mist)'}
                    >
                      {(t.diagram_preview || t.imagen) && (
                        <img src={t.diagram_preview || t.imagen} alt="" style={{ width:44, height:44, objectFit:'contain', borderRadius:6, background:'var(--ink3)', flexShrink:0 }} />
                      )}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'var(--snow)' }}>{t.nombre}</span>
                          {t.ventana && <span style={{ fontSize:9, padding:'1px 6px', borderRadius:4, background:'rgba(200,241,53,.12)', color:'var(--lime)', fontWeight:600 }}>{t.ventana}</span>}
                          {t.intensidad != null && (
                            <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:'50%', background: t.intensidad<=1?'#ef4444':t.intensidad<=2?'#f97316':t.intensidad<=3?'#eab308':'#22c55e', color:'#fff', fontSize:9, fontWeight:900, fontFamily:'DM Mono,monospace' }}>
                              {t.intensidad}
                            </span>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:10, color:'var(--silver)', marginTop:2 }}>
                          {t.jugadores && <span>👥 {t.jugadores} jug.</span>}
                          {t.series && t.minutos && <span>🔄 {t.series}×{t.minutos}min</span>}
                          {t.largo && t.ancho && <span>📐 {t.largo}×{t.ancho}m</span>}
                        </div>
                      </div>
                    </button>
                  ))
                }
                {biblioTareas.filter(t => !biblioSearch || t.nombre.toLowerCase().includes(biblioSearch.toLowerCase()) || (t.ventana||'').toLowerCase().includes(biblioSearch.toLowerCase())).length === 0 && (
                  <div style={{ padding:20, textAlign:'center', color:'var(--silver)', fontSize:12 }}>
                    {biblioSearch ? 'Sin resultados.' : 'La biblioteca está vacía. Guardá sesiones para ver tareas acá.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {bloques.length === 0 && !showBiblioteca && <p style={{ fontSize:12, color:'var(--fog)', padding:'8px 0' }}>Sin tareas. Usá "+ Tarea" para crear desde cero o "🎨 Mis Tareas" para elegir una guardada.</p>}
        {bloques.map((bl,i)=>(
          <BloqueMetodologiaMemo 
            key={bl.id || bl._tempId || i} 
            bloque={bl} 
            index={i} 
            onChangeProp={updateBloque} 
            onRemoveProp={removeBloque} 
            onMoveUpProp={moveBloqueUp}
            onMoveDownProp={moveBloqueDown}
            isFirst={i === 0}
            isLast={i === bloques.length - 1}
            teamPlayers={teamPlayers} 
          />
        ))}
        {/* Botón + Tarea abajo — para no tener que scrollear al header */}
        {bloques.length > 0 && (
          <div style={{ display:'flex', gap:8, marginTop:8 }}>
            <button className="hover-scale" type="button" onClick={addBloque} style={{ flex:1, fontSize:12, padding:'8px', borderRadius:8, background:'rgba(200,241,53,.08)', color:'var(--lime)', border:'1px dashed rgba(200,241,53,.3)', cursor:'pointer', fontWeight:600 }}>+ Agregar tarea</button>
            <button className="hover-scale" type="button" onClick={abrirBiblioteca} style={{ fontSize:12, padding:'8px 14px', borderRadius:8, background:'transparent', color:'var(--silver)', border:'1px dashed var(--mist)', cursor:'pointer' }}>🎨 Mis Tareas</button>
          </div>
        )}
      </div>

      {/* ── CE / UCE TOTAL de la sesión ── */}
      {bloques.length > 0 && (() => {
        // rpeReal = RPE medio real reportado por jugadores (avg_rpe de wellness logs)
        // rpeObj  = RPE objetivo planificado por el coach
        // La UCE se calcula con el RPE real si está disponible, sino con el objetivo como fallback
        const rpeObj = Number(f.rpe_objetivo) || 0
        const rpeParaUCE = rpeReal > 0 ? rpeReal : rpeObj
        const rpeEsReal = rpeReal > 0
        let ceTotal = 0
        const lineas: any[] = []
        bloques.forEach(bl => {
          if (!bl.ventana) return
          const ne = bl.ne ?? NE_DEFAULT[bl.ventana] ?? 5
          const minTotal = (Number(bl.series)||1) * (Number(bl.minutos)||0)
          if (!minTotal) return
          const ce = Math.round(minTotal * ne)
          ceTotal += ce
          lineas.push({ label: bl.ventana, minTotal, ne, ce })
        })
        if (!ceTotal) return null
        const uceTotal = rpeParaUCE ? Math.round(ceTotal * rpeParaUCE) : null
        return (
          <div style={{ background:'rgba(200,241,53,.08)', border:'2px solid rgba(200,241,53,.35)', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
              🏋️ UCE · UNIDAD DE CARGA ESPECÍFICA
            </p>
            {rpeEsReal && (
              <div style={{ fontSize:10, color:'#f59e0b', marginBottom:8, fontFamily:'DM Mono,monospace' }}>
                ✓ Usando RPE medio real ({rpeReal}) reportado por jugadores
                {rpeObj > 0 && rpeObj !== rpeReal && <span style={{ color:'var(--fog)' }}> · RPE objetivo era {rpeObj}</span>}
              </div>
            )}
            <div style={{ fontFamily:'DM Mono,monospace', marginBottom:8 }}>
              {lineas.map((l, i) => (
                <div key={i} style={{ fontSize:11, color:'var(--silver)', marginBottom:3 }}>
                  <span style={{ color:'var(--fog)', fontSize:9 }}>{l.label.slice(0,20)}:</span>{' '}
                  <span style={{ color:'var(--snow)' }}>{l.minTotal}min</span>
                  <span style={{ color:'var(--fog)' }}> × </span>
                  <span style={{ color:'var(--lime)' }}>NE{l.ne}</span>
                  <span style={{ color:'var(--fog)' }}> = </span>
                  <span style={{ color:'#c8f135', fontWeight:700 }}>CE {l.ce}</span>
                  {rpeParaUCE > 0 && <>
                    <span style={{ color:'var(--fog)' }}> × RPE{rpeParaUCE}{rpeEsReal ? '' : ' obj'} = </span>
                    <span style={{ color:'#f59e0b', fontWeight:700 }}>{Math.round(l.ce * rpeParaUCE)} UCE</span>
                  </>}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:20, alignItems:'center', paddingTop:8, borderTop:'1px solid rgba(200,241,53,.2)' }}>
              <div>
                <div style={{ fontSize:10, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.05em' }}>CE TOTAL</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#c8f135', fontFamily:'DM Mono,monospace' }}>{ceTotal} <span style={{ fontSize:12, color:'var(--fog)' }}>UCE</span></div>
              </div>
              {uceTotal !== null && (
                <div>
                  <div style={{ fontSize:10, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.05em' }}>
                    UCE TOTAL (×RPE{rpeParaUCE}{rpeEsReal ? ' real' : ' obj'})
                  </div>
                  <div style={{ fontSize:22, fontWeight:900, color:'#f59e0b', fontFamily:'DM Mono,monospace' }}>{uceTotal} <span style={{ fontSize:12, color:'var(--fog)' }}>UCE</span></div>
                </div>
              )}
              {!rpeParaUCE && <div style={{ fontSize:10, color:'var(--fog)', fontStyle:'italic' }}>Cargá el RPE objetivo para ver UCE total (se actualizará con el RPE real al reportar)</div>}
            </div>
          </div>
        )
      })()}

      {/* Resumen de tiempo total de sesión */}
      {bloques.length > 0 && (() => {
        const { tiempoTrabajo, tiempoDescanso } = calcTiempoConSimultaneas(bloques)
        const tiempoTotal = tiempoTrabajo + tiempoDescanso
        return tiempoTotal > 0 ? (
          <div style={{ background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.2)', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>⏱ Duración estimada de la sesión</p>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:700, color:'var(--lime)', fontFamily:'DM Mono,monospace' }}>{tiempoTotal} min</div>
                <div style={{ fontSize:10, color:'var(--silver)' }}>Tiempo total</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:700, color:'#22c55e', fontFamily:'DM Mono,monospace' }}>{tiempoTrabajo} min</div>
                <div style={{ fontSize:10, color:'var(--silver)' }}>Tiempo de trabajo</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:24, fontWeight:700, color:'#f59e0b', fontFamily:'DM Mono,monospace' }}>{tiempoDescanso} min</div>
                <div style={{ fontSize:10, color:'var(--silver)' }}>Tiempo de descanso</div>
              </div>
            </div>
          </div>
        ) : null
      })()}

      {/* Resumen de carga total de la sesión */}
      {bloques.length > 0 && (() => {
        const metricKeys = ['distTotal','distSprint','distMP','distAcel','distDecel','nSprints','nAcel','nDecel']
        const metricLabels = ['Dist. total','Sprint >21','Alta pot.','Acel.','Decel.','Nº sprints','Nº acel.','Nº decel.']
        const metricUnits = ['m','m','m','m','m','','','']
        const totals: Record<string,number> = {}
        metricKeys.forEach(k => { totals[k] = 0 })
        let hasCarga = false
        bloques.forEach(bl => {
          if (!TAREAS_CON_ESPACIO.includes(bl.ventana)) return
          const jugN = getJugadoresBloque(bl, TAREAS_CON_EQUIPO.includes(bl.ventana))
          const calc = calcularDistancias(jugN, Number(bl.largo), Number(bl.ancho), Number(bl.series), Number(bl.minutos))
          if (!calc) return
          hasCarga = true
          metricKeys.forEach(k => {
            const manual = bl.manualMetrics?.[k]
            totals[k] += manual !== undefined && manual !== '' ? parseFloat(manual) : calc[k]
          })
        })
        if (!hasCarga) return null
        return (
          <div style={{ background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.2)', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>📊 Resumen de carga total (todas las tareas)</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {metricKeys.map((k,i) => (
                <div key={k} style={{ textAlign:'center', background:'var(--ink2)', borderRadius:8, padding:'8px 6px' }}>
                  <div style={{ fontSize:8, color:'var(--silver)', marginBottom:3, lineHeight:1.3 }}>{metricLabels[i]}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:'#60a5fa', fontFamily:'DM Mono,monospace' }}>
                    {Math.round(totals[k])}<span style={{ fontSize:9, color:'var(--fog)' }}>{metricUnits[i]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Notas */}
      <div style={{ marginBottom:20 }}>
        <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Notas adicionales</label>
        <input className="wp-input" value={f.notas} onChange={e=>set('notas',e.target.value)} placeholder="Observaciones, condiciones especiales..." style={{ padding:'8px 12px', fontSize:13 }} />
      </div>

      <div style={{ display:'flex', gap:10 }}>
        {onDelete && (
          <button type="button" onClick={onDelete} className="btn-ghost" style={{ fontSize:12, color:'#f87171', borderColor:'rgba(239,68,68,.3)', padding:'10px 16px' }}>🗑 Eliminar</button>
        )}
        <button type="button" onClick={onCancel} className="btn-ghost" style={{ flex:1, fontSize:13 }}>Cancelar</button>
        <button className="hover-scale btn-ghost" type="button" onClick={async () => await imprimirSesion(f, bloques, teamPlayers)} style={{ fontSize:12, padding:'10px 14px' }} title="Imprimir machete">🖨️ Imprimir</button>
        <button type="button" onClick={submit} disabled={loading||!f.fecha} className="btn-lime" style={{ flex:2, fontSize:13, padding:14 }}>
          {loading ? 'Guardando...' : sesion ? 'Guardar cambios →' : 'Crear sesión →'}
        </button>
      </div>
      {saveError && <p style={{ fontSize:12, color:'#f87171', marginTop:10, textAlign:'center' }}>{saveError}</p>}
    </div>
  )
}

function MinutosPanel({ teamData }) {
  const now = new Date()
  const primerDiaMes = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`
  const [desde, setDesde] = useState(primerDiaMes)
  const [hasta, setHasta] = useState(todayLocal())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [playerMatches, setPlayerMatches] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [assigningMatch, setAssigningMatch] = useState<any>(null) // partido pendiente en edición inline
  const [assignMin, setAssignMin] = useState('')
  const [assignTitular, setAssignTitular] = useState(true)
  const [savingAssign, setSavingAssign] = useState(false)

  useEffect(()=>{ load() }, [desde, hasta])

  async function load() {
    setLoading(true)
    try { const r = await fetch(`/api/minutos?desde=${desde}&hasta=${hasta}`); setData(await r.json()) }
    finally { setLoading(false) }
  }

  async function openPlayerMatches(p: any) {
    if (selectedPlayer?.jugador_id === p.jugador_id) { setSelectedPlayer(null); setPlayerMatches([]); setAssigningMatch(null); return }
    setSelectedPlayer(p); setLoadingMatches(true); setAssigningMatch(null)
    try {
      const r = await fetch(`/api/partidos?jugadorId=${p.jugador_id}&desde=${desde}&hasta=${hasta}`)
      setPlayerMatches(await r.json())
    } catch { setPlayerMatches([]) }
    finally { setLoadingMatches(false) }
  }

  async function saveAssign(match: any) {
    if (!assignMin || Number(assignMin) <= 0) return
    setSavingAssign(true)
    try {
      const res = await fetch('/api/partidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jugador_id: selectedPlayer.jugador_id,
          fecha: match.fecha,
          rival: match.rival || '',
          tipo_partido: match.tipo_partido || 'Partido',
          minutos: Number(assignMin),
          titular: assignTitular,
          rival_foto: match.rival_foto || null,
        })
      })
      if (res.ok) {
        setAssigningMatch(null); setAssignMin('')
        // Reload matches and totals
        const r = await fetch(`/api/partidos?jugadorId=${selectedPlayer.jugador_id}&desde=${desde}&hasta=${hasta}`)
        setPlayerMatches(await r.json())
        load()
      }
    } finally { setSavingAssign(false) }
  }

  const players = data?.players || []
  const maxMin = Math.max(...players.map(p=>p.min_total), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <PanelHeader 
            icon={Icons.reloj} 
            title="MINUTAJE" 
            subtitle="COMPETICIÓN" 
            description="Entrenamiento vs. competición"
            color="#a855f7" 
          />
        </div>
        <button className="btn-lime" onClick={()=>setShowAdd(true)} style={{ fontSize:12, padding:'10px 18px' }}>+ Registrar partido</button>
      </div>
      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
          {[['desde','Desde',desde,setDesde],['hasta','Hasta',hasta,setHasta]].map(([id,lbl,val,setter])=>(
            <div key={id}>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:5 }}>{lbl}</label>
              <input type="date" className="wp-input" style={{ width:160, padding:'8px 12px', fontSize:13 }} value={val} onChange={e=>setter(e.target.value)} />
            </div>
          ))}
          <button className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }} onClick={load}>Actualizar</button>
        </div>
      </div>
      {showAdd && <AddMatchForm teamData={teamData} onSuccess={()=>{ setShowAdd(false); load() }} onCancel={()=>setShowAdd(false)} />}
      {loading
        ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
        : players.length===0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Sin datos. Cargá partidos o datos demo.</div>
          : <>
              <div style={{ display:'flex', gap:16, paddingLeft:4 }}>
                {[['var(--lime)','Entrenamiento'],['#3b82f6','Competición']].map(([c,l])=>(
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--silver)' }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:c }} />{l}
                  </div>
                ))}
              </div>
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
                {players.map((p,i)=>{
                  const isSelected = selectedPlayer?.jugador_id === p.jugador_id
                  return (
                    <div key={p.jugador_id} style={{ borderBottom:i<players.length-1?'1px solid var(--mist)':'none' }}>
                      <button className="hover-scale" onClick={()=>openPlayerMatches(p)} style={{ width:'100%', padding:'10px 18px', background: isSelected?'rgba(200,241,53,.06)':'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background .12s' }}
                        onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background='var(--ink3)' }}
                        onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.background='transparent' }}
                      >
                        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:5 }}>
                          <span style={{ fontSize:13, fontWeight:500, color: isSelected?'var(--lime)':'var(--snow)', minWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</span>
                          <span style={{ fontSize:10, color:'var(--silver)', minWidth:80, flexShrink:0 }}>{p.posicion||'—'}</span>
                          <div style={{ flex:1 }}>
                            <div style={{ height:10, background:'var(--mist)', borderRadius:3, overflow:'hidden', marginBottom:3 }}>
                              <div style={{ height:'100%', width:`${(p.min_entreno/maxMin)*100}%`, background:'var(--lime)', borderRadius:3, opacity:.85 }} />
                            </div>
                            <div style={{ height:10, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${(p.min_partido/maxMin)*100}%`, background:'#3b82f6', borderRadius:3, opacity:.85 }} />
                            </div>
                          </div>
                          <div style={{ textAlign:'right', minWidth:110, flexShrink:0 }}>
                            <div className="mono" style={{ fontSize:13, color:'var(--snow)', fontWeight:600 }}>{p.min_total} min</div>
                            <div style={{ fontSize:10, color:'var(--silver)' }}><span style={{ color:'var(--lime)' }}>{p.min_entreno}</span> + <span style={{ color:'#60a5fa' }}>{p.min_partido}</span></div>
                          </div>
                          <span style={{ fontSize:11, color: isSelected?'var(--lime)':'var(--fog)', flexShrink:0 }}>{isSelected?'▲':'▼'}</span>
                        </div>
                      </button>
                      {isSelected && (
                        <div style={{ padding:'0 18px 14px', background:'rgba(200,241,53,.03)', borderTop:'1px solid rgba(200,241,53,.12)' }}>
                          <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, paddingTop:12 }}>
                            Partidos — {p.nombre.split(' ')[0]}
                          </p>
                          {loadingMatches
                            ? <p style={{ fontSize:12, color:'var(--silver)', padding:'10px 0' }}>Cargando...</p>
                            : playerMatches.length === 0
                              ? <p style={{ fontSize:12, color:'var(--fog)', padding:'10px 0' }}>Sin partidos en este período.</p>
                              : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                  {playerMatches.map((m:any, mi:number)=>{
                                    const isPending = m.sin_minutos
                                    const isEditing = assigningMatch?.fecha === m.fecha && assigningMatch?.rival === m.rival
                                    return (
                                      <div key={mi} style={{ borderRadius:10, border:`1px solid ${isPending ? 'rgba(245,158,11,.35)' : 'var(--mist)'}`, background: isPending ? 'rgba(245,158,11,.05)' : 'var(--ink2)', overflow:'hidden' }}>
                                        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px' }}>
                                          {/* Logo */}
                                          <div style={{ width:36, height:36, borderRadius:8, background:'rgba(96,165,250,.15)', border:'1px solid rgba(96,165,250,.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                            {m.rival_foto
                                              ? <img src={m.rival_foto} style={{ width:32, height:32, objectFit:'contain', borderRadius:6 }} alt={m.rival||'rival'} />
                                              : <span style={{ fontSize:14, fontWeight:700, color:'#60a5fa' }}>{(m.rival||'?').charAt(0).toUpperCase()}</span>
                                            }
                                          </div>
                                          <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontSize:13, fontWeight:600, color:'var(--snow)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                              vs. {m.rival||'Rival'}
                                            </div>
                                            <div style={{ fontSize:10, color:'var(--silver)', marginTop:1 }}>
                                              {m.fecha} · {m.tipo_partido}
                                            </div>
                                          </div>
                                          {isPending ? (
                                            <button className="hover-scale"
                                              onClick={()=>{ setAssigningMatch(isEditing ? null : m); setAssignMin(''); setAssignTitular(true) }}
                                              style={{ fontSize:11, padding:'5px 12px', borderRadius:7, background:'rgba(245,158,11,.15)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.4)', cursor:'pointer', flexShrink:0, fontWeight:600 }}
                                            >
                                              {isEditing ? '✕ Cancelar' : '⏱ Asignar minutos'}
                                            </button>
                                          ) : (
                                            <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                                              <div style={{ textAlign:'right' }}>
                                                <div className="mono" style={{ fontSize:15, fontWeight:700, color:'#60a5fa' }}>{m.minutos} min</div>
                                                {m.titular && <div style={{ fontSize:9, color:'#fbbf24', textTransform:'uppercase', letterSpacing:'0.06em' }}>Titular</div>}
                                              </div>
                                              {m.id && (
                                                <button className="hover-scale"
                                                  onClick={async()=>{ if(!confirm('¿Eliminar este registro de partido?')) return; await fetch(`/api/partidos?id=${m.id}`,{method:'DELETE'}); const r=await fetch(`/api/partidos?jugadorId=${selectedPlayer.jugador_id}&desde=${desde}&hasta=${hasta}`); setPlayerMatches(await r.json()); load() }}
                                                  style={{ fontSize:10, padding:'3px 7px', borderRadius:5, background:'rgba(239,68,68,.12)', color:'#ef4444', border:'1px solid rgba(239,68,68,.3)', cursor:'pointer', fontWeight:600 }}
                                                  title="Eliminar registro"
                                                >✕</button>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        {/* Inline assign form */}
                                        {isPending && isEditing && (
                                          <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(245,158,11,.2)', background:'rgba(245,158,11,.04)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                              <label style={{ fontSize:10, color:'var(--silver)', fontWeight:600, textTransform:'uppercase' }}>Minutos</label>
                                              <input
                                                type="number" min="1" max="200"
                                                className="wp-input"
                                                value={assignMin}
                                                onChange={e=>setAssignMin(e.target.value)}
                                                placeholder="90"
                                                style={{ width:70, padding:'5px 8px', fontSize:13, fontFamily:'DM Mono,monospace', textAlign:'center' }}
                                                autoFocus
                                              />
                                            </div>
                                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                              <label style={{ fontSize:10, color:'var(--silver)', fontWeight:600, textTransform:'uppercase' }}>Titular</label>
                                              <button className="hover-scale" type="button" onClick={()=>setAssignTitular(t=>!t)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'pointer', border:`1px solid ${assignTitular ? '#fbbf24' : 'var(--fog)'}`, background: assignTitular ? 'rgba(251,191,36,.12)' : 'transparent', color: assignTitular ? '#fbbf24' : 'var(--silver)', fontWeight:600 }}>
                                                {assignTitular ? '✓ Sí' : '✗ No'}
                                              </button>
                                            </div>
                                            <button className="hover-scale"
                                              onClick={()=>saveAssign(m)}
                                              disabled={savingAssign || !assignMin || Number(assignMin)<=0}
                                              style={{ fontSize:12, padding:'6px 16px', borderRadius:7, background:'var(--lime)', color:'#000', border:'none', cursor:'pointer', fontWeight:700, opacity: (!assignMin||Number(assignMin)<=0) ? 0.5 : 1 }}
                                            >
                                              {savingAssign ? 'Guardando...' : '✓ Guardar'}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {[
                  ['Media Entrenamiento',players.length?Math.round(players.reduce((s,p)=>s+p.min_entreno,0)/players.length):0,'var(--lime)'],
                  ['Media Competición',players.length?Math.round(players.reduce((s,p)=>s+p.min_partido,0)/players.length):0,'#60a5fa'],
                  ['Media Sesiones',players.length?Math.round(players.reduce((s,p)=>s+p.sesiones,0)/players.length):0,'var(--snow)']
                ].map(([l,v,c])=>(
                  <div key={l} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:12, padding:14, textAlign:'center' }}>
                    <div className="mono" style={{ fontSize:24, fontWeight:600, color:c as string }}>{v as number}</div>
                    <div style={{ fontSize:10, color:'var(--silver)', marginTop:3 }}>{l as string}</div>
                    <div style={{ fontSize:9, color:'var(--fog)', marginTop:2 }}>promedio por jugador</div>
                  </div>
                ))}
              </div>
            </>
      }
    </div>
  )
}

function AddMatchForm({ teamData, onSuccess, onCancel }) {
  const [calPartidos, setCalPartidos] = useState<any[]>([])
  const [loadingCal, setLoadingCal] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [bulkMins, setBulkMins] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(false)
  const [extraFoto, setExtraFoto] = useState<string|null>(null)

  useEffect(() => {
    // Buscar partidos pasados (6 meses) Y futuros (60 días)
    const hasta = addDays(todayLocal(), +60)
    const desde = addDays(todayLocal(), -180)
    setLoadingCal(true)
    fetch(`/api/calendario?desde=${desde}&hasta=${hasta}`)
      .then(r => r.json())
      .then(d => {
        const parts = (d.sesiones || [])
          .filter((s: any) => s.tipo === 'partido')
          .sort((a: any, b: any) => b.fecha.localeCompare(a.fecha))
        setCalPartidos(parts)
      })
      .catch(() => {})
      .finally(() => setLoadingCal(false))
  }, [])

  function setAllMins(mins: string) {
    const all: Record<string,string> = {}
    teamData.forEach((p:any) => { all[p.jugador_id] = mins === '0' ? '' : mins })
    setBulkMins(all)
  }

  function handleFotoUpload(e: any) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 120
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        setExtraFoto(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  }

  async function submit(e: any) {
    e.preventDefault()
    if (!selectedMatch) return
    setLoading(true)
    try {
      const fotoToUse = extraFoto || selectedMatch.rival_foto || null
      const entries = Object.entries(bulkMins)
        .filter(([,m]) => m && Number(m) > 0)
        .map(([jid, m]) => ({ jugador_id: Number(jid), minutos: Number(m) }))
      if (entries.length === 0) return

      // Single bulk request — avoids concurrent Neon connection failures
      const res = await fetch('/api/partidos/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries,
          fecha: selectedMatch.fecha,
          rival: selectedMatch.rival || '',
          tipo_partido: selectedMatch.titulo || 'Oficial',
          rival_foto: fotoToUse,
        })
      })
      if (!res.ok) { alert('Error al guardar los minutos'); return }

      // If a new foto was uploaded, also update the sesiones_plan entry
      if (extraFoto && selectedMatch.id) {
        await fetch('/api/calendario', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedMatch.id, rival_foto: extraFoto })
        })
      }
      onSuccess()
    } finally { setLoading(false) }
  }

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:20 }} className="anim-up">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Registrar Partido</p>
        <button className="hover-bright" type="button" onClick={onCancel} style={{ background:'transparent', border:'none', color:'var(--fog)', cursor:'pointer', fontSize:18 }}>✕</button>
      </div>

      {/* Step 1: Select a match from calendar */}
      <div style={{ marginBottom:16 }}>
        <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>
          Paso 1 — Seleccioná el partido del calendario
        </p>
        {loadingCal ? (
          <p style={{ fontSize:12, color:'var(--fog)' }}>Cargando partidos...</p>
        ) : calPartidos.length === 0 ? (
          <p style={{ fontSize:12, color:'var(--fog)', padding:'10px', background:'var(--ink3)', borderRadius:8 }}>
            ⚠️ No encontraste partidos en los últimos 6 meses. Para registrar minutos de competición, primero andá a <strong>Calendario</strong>, creá un evento con tipo <em>Partido</em> y completá el rival. Después volvé acá y aparecerá en esta lista.
          </p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {calPartidos.map((p: any) => {
              const isSelected = selectedMatch?.id === p.id
              return (
                <button className="hover-scale" key={p.id} type="button" onClick={() => { setSelectedMatch(isSelected ? null : p); setExtraFoto(null) }}
                  style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, cursor:'pointer', textAlign:'left', border:`2px solid ${isSelected ? 'var(--lime)' : 'var(--mist)'}`, background:isSelected ? 'rgba(200,241,53,.08)' : 'var(--ink3)', transition:'all .15s' }}>
                  <div style={{ width:40, height:40, borderRadius:8, background:'rgba(96,165,250,.15)', border:'1px solid rgba(96,165,250,.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    {p.rival_foto
                      ? <img src={p.rival_foto} style={{ width:34, height:34, objectFit:'contain', borderRadius:6, padding:2 }} alt="" />
                      : <span style={{ fontSize:18, fontWeight:700, color:'#60a5fa' }}>{(p.rival||'?').charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700, color: isSelected ? 'var(--lime)' : 'var(--snow)' }}>
                      vs. {p.rival || 'Sin rival'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--silver)', marginTop:2 }}>
                      {p.fecha} · {p.titulo || 'Partido'}
                    </div>
                  </div>
                  {isSelected && <span style={{ color:'var(--lime)', fontSize:18 }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Step 2: Enter minutes per player */}
      {selectedMatch && (
        <form onSubmit={submit}>
          <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
            Paso 2 — Minutos por jugador · vs. {selectedMatch.rival || 'Rival'}
          </p>

          {/* Escudo upload — show if no photo yet or to replace */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'8px 10px', background:'var(--ink3)', borderRadius:8, border:'1px solid var(--mist)' }}>
            <div style={{ width:36, height:36, borderRadius:6, background:'rgba(96,165,250,.15)', border:'1px solid rgba(96,165,250,.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
              {(extraFoto || selectedMatch.rival_foto)
                ? <img src={extraFoto || selectedMatch.rival_foto} style={{ width:32, height:32, objectFit:'contain' }} alt="" />
                : <span style={{ fontSize:16, fontWeight:700, color:'#60a5fa' }}>{(selectedMatch.rival||'?').charAt(0).toUpperCase()}</span>
              }
            </div>
            <label style={{ flex:1, cursor:'pointer' }}>
              <span style={{ fontSize:11, color: extraFoto ? 'var(--lime)' : (selectedMatch.rival_foto ? 'var(--silver)' : 'var(--fog)') }}>
                {extraFoto ? '✓ Escudo cargado' : (selectedMatch.rival_foto ? 'Escudo OK · Click para cambiar' : '📁 Subir escudo del rival (opcional)')}
              </span>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleFotoUpload} />
            </label>
            {extraFoto && <button className="hover-scale" type="button" onClick={()=>setExtraFoto(null)} style={{ fontSize:10, padding:'3px 8px', borderRadius:5, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer' }}>✕</button>}
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, color:'var(--fog)' }}>Carga rápida:</span>
            {['90','45','0'].map(m=>(
              <button className="hover-scale" key={m} type="button" onClick={()=>setAllMins(m)}
                style={{ fontSize:11, padding:'4px 10px', borderRadius:6, cursor:'pointer', background:'var(--ink3)', border:'1px solid var(--fog)', color:'var(--silver)' }}>
                {m==='0' ? 'Limpiar' : `Todos ${m} min`}
              </button>
            ))}
          </div>
          <div style={{ background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:10, padding:14, maxHeight:260, overflowY:'auto', marginBottom:12 }}>
            {teamData.map((p:any)=>(
              <div key={p.jugador_id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:13, color:'var(--silver)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</span>
                <input type="number" min="0" max="200" placeholder="min"
                  style={{ width:70, background:'var(--ink2)', border:'1px solid var(--fog)', borderRadius:6, padding:'5px 8px', fontSize:12, color:'var(--snow)', fontFamily:'DM Mono,monospace', outline:'none' }}
                  value={bulkMins[p.jugador_id]||''}
                  onChange={e=>setBulkMins(m=>({...m,[p.jugador_id]:e.target.value}))} />
              </div>
            ))}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading||!Object.values(bulkMins).some(m=>m&&Number(m)>0)}>
              {loading ? 'Guardando...' : 'Guardar minutos →'}
            </button>
          </div>
        </form>
      )}

      {!selectedMatch && (
        <button type="button" className="btn-ghost" style={{ width:'100%' }} onClick={onCancel}>Cancelar</button>
      )}
    </div>
  )
}

function CoachSessionRow({ log }) {
  const [editing, setEditing] = useState(false)
  const [mins, setMins] = useState(String(log.duracion_min || '90'))
  const [displayMins, setDisplayMins] = useState(Number(log.duracion_min) || 90)
  const [ua, setUa] = useState(Number(log.carga_ua) || 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function saveMinutes() {
    const m = Number(mins)
    if (!m || m <= 0) { setError('Ingresá minutos válidos'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/logs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: log.id, duracion_min: m })
      })
      if (!res.ok) { const d = await res.json(); setError(d.error||'Error'); return }
      const updated = await res.json()
      // La DB recalcula carga_ua = rpe * duracion_min automáticamente
      setUa(updated.carga_ua || 0)
      setDisplayMins(updated.duracion_min || m)
      setEditing(false)
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--mist)', fontSize:13, gap:8, flexWrap:'wrap' }}>
      <span className="mono" style={{ fontSize:11, color:'var(--silver)', minWidth:80 }}>
        {String(log.fecha)}
        {log.md_label && <span style={{ marginLeft:5, fontSize:10, color:'var(--lime)', fontWeight:700 }}>{log.md_label}</span>}
      </span>
      <span>RPE <strong style={{ color:'var(--snow)' }}>{log.rpe}</strong></span>
      {editing ? (
        <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
          <input
            type="number" min="1" max="300"
            value={mins}
            onChange={e=>{ setMins(e.target.value); setError('') }}
            onKeyDown={e=>{ if(e.key==='Enter') saveMinutes(); if(e.key==='Escape') setEditing(false) }}
            style={{ width:64, background:'var(--ink3)', border:'1px solid var(--lime)', borderRadius:6, padding:'4px 8px', fontSize:13, color:'var(--snow)', fontFamily:'DM Mono,monospace', outline:'none' }}
            placeholder="min"
            autoFocus
          />
          <span style={{ fontSize:11, color:'var(--silver)' }}>min</span>
          <button className="hover-scale" onClick={saveMinutes} disabled={saving} style={{ fontSize:12, padding:'4px 12px', borderRadius:6, background:'var(--lime)', color:'var(--ink)', border:'none', cursor:'pointer', fontWeight:700 }}>
            {saving ? '...' : '✓ Guardar'}
          </button>
          <button className="hover-scale" onClick={()=>{ setEditing(false); setError('') }} style={{ fontSize:12, padding:'4px 8px', borderRadius:6, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', cursor:'pointer' }}>✕</button>
          {error && <span style={{ fontSize:11, color:'#f87171' }}>{error}</span>}
        </div>
      ) : (
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ color: displayMins ? 'var(--silver)' : '#f59e0b', fontFamily:'DM Mono,monospace', fontSize:12 }}>
            {displayMins ? `${displayMins} min` : <span style={{ fontSize:11 }}>⚠ sin mins</span>}
          </span>
          <button className="hover-scale" onClick={()=>setEditing(true)} title="Editar minutos" style={{ fontSize:13, background:'transparent', border:'none', cursor:'pointer', color:'var(--fog)', padding:'0 2px', lineHeight:1 }}>✏️</button>
        </div>
      )}
      <span className="mono" style={{ color: ua > 0 ? 'var(--lime)' : 'var(--fog)', fontWeight:600 }}>
        {ua > 0 ? `${ua} UA` : '—'}
      </span>
    </div>
  )
}

function CargaExternaPanel() {
  const now = new Date()
  const [ciclo, setCiclo] = useState<'microciclo'|'mesociclo'|'macrociclo'>('microciclo')
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState('nombre')
  const [sortDir,   setSortDir]   = useState<'asc'|'desc'>('asc')
  const [vistaMode, setVistaMode] = useState<'ciclo'|'dia'>('ciclo')
  const [diaSelec,  setDiaSelec]  = useState(todayLocal())
  const [diaData,   setDiaData]   = useState<any>(null)
  const [diaLoading, setDiaLoading] = useState(false)
  const [gpsVisibleCols, setGpsVisibleCols] = useState<Set<string> | null>(null)
  const [showColPicker, setShowColPicker] = useState(false)

  const CICLO_DAYS = { microciclo:7, mesociclo:28, macrociclo:365 }

  useEffect(() => {
    if (vistaMode === 'ciclo') load()
    else loadDia()
  }, [ciclo, vistaMode, diaSelec])

  async function load() {
    setLoading(true)
    // Include future sessions: range goes from N days ago to N days ahead
    // So the microciclo shows the full training week (past + planned future)
    const dias = CICLO_DAYS[ciclo]
    const desde = addDays(todayLocal(), -dias)
    const hasta = addDays(todayLocal(), +dias)
    try {
      const r = await fetch(`/api/carga-gps?desde=${desde}&hasta=${hasta}&ciclo=${ciclo}`)
      if (r.ok) setData(await r.json())
    } catch {}
    finally { setLoading(false) }
  }

  async function loadDia() {
    setDiaLoading(true)
    try {
      const r = await fetch(`/api/carga-gps?desde=${diaSelec}&hasta=${diaSelec}&ciclo=dia`)
      if (r.ok) setDiaData(await r.json())
    } catch {}
    finally { setDiaLoading(false) }
  }

  const players: any[]  = data?.players   || []
  const teamAvg: any    = data?.teamAvg   || {}
  const hasGps: boolean = data?.hasGpsData || false
  const gpsReal: any[]  = data?.gpsReal   || []
  const teamAvgGps: any = data?.teamAvgGps || {}
  const hasRealGps: boolean = data?.hasRealGps || false
  const allMetricCols: string[] = data?.allMetricCols || []
  const sesionesInfo: any[] = data?.sesionesInfo || []
  // Only show MD columns that actually exist in sesionesInfo (no ghost columns)
  const MD_ORDER_LOCAL = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']
  // Filter sesionesInfo to only sessions the calendar actually shows.
  // calSesiones is built from /api/calendario (same source of truth as the UI).
  // This prevents "ghost" MD sessions that exist in sesiones_plan but are not
  // visible in the calendar from appearing in the UCE/GPS panels.
  // Always show all 8 MD slots (skeleton view) — existingMdLabels controls opacity/hasData
  // calSesiones is used only for display cues, not to filter slots out
  const existingMdLabels = new Set(sesionesInfo.map((s:any) => s.titulo))
  const mdCols = [
    ...MD_ORDER_LOCAL,
    ...sesionesInfo.map((s:any) => s.titulo).filter((t:string) => !MD_ORDER_LOCAL.includes(t))
  ]
  // All columns present in the data, sorted by canonical order (known first, then alphabetical)
  const availableCols: string[] = (() => {
    const raw = allMetricCols.length > 0 ? allMetricCols : (
      gpsReal.length > 0
        ? Object.keys(gpsReal[0]).filter(k => !['jugador_id','nombre','posicion','sesiones_gps'].includes(k))
        : []
    )
    return [
      ...GPS_METRIC_ORDER.filter(k => raw.includes(k)),
      ...raw.filter(k => !GPS_METRIC_ORDER.includes(k)).sort(),
    ]
  })()
  // Active columns: filtered by gpsVisibleCols selector (null = show all)
  const dynamicGpsCols: string[] = gpsVisibleCols === null
    ? availableCols
    : availableCols.filter(k => gpsVisibleCols.has(k))

  const borgColor = (rpe: number) =>
    rpe <= 2 ? '#22c55e' : rpe <= 4 ? '#a3e635' : rpe <= 6 ? '#eab308' : rpe <= 8 ? '#f97316' : '#ef4444'

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir(field === 'nombre' ? 'asc' : 'desc') }
  }

  const sorted = [...players].sort((a: any, b: any) => {
    const va = a[sortField] ?? (sortField === 'nombre' ? '' : -1)
    const vb = b[sortField] ?? (sortField === 'nombre' ? '' : -1)
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number)
  })

  const SortTh = ({ field, label, unit = '' }: { field: string; label: string; unit?: string }) => (
    <th
      onClick={() => toggleSort(field)}
      style={{
        padding: '8px 10px', cursor: 'pointer', userSelect: 'none' as any, whiteSpace: 'nowrap',
        color: sortField === field ? 'var(--lime)' : 'var(--silver)',
        fontWeight: 600, textTransform: 'uppercase' as any, fontSize: 9, letterSpacing: '0.06em', textAlign: 'center',
      }}
    >
      {label}
      {unit && <span style={{ fontSize: 8, color: 'var(--fog)', marginLeft: 2 }}>{unit}</span>}
      {sortField === field && <span style={{ marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )

  const GPS_COLS = [
    { field: 'distTotal',  label: 'Dist.',   unit: 'm'  },
    { field: 'distSprint', label: 'Sprint',  unit: 'm'  },
    { field: 'distMP',     label: 'Alta pot',unit: 'm'  },
    { field: 'distAcel',   label: 'Acel.',   unit: 'm'  },
    { field: 'distDecel',  label: 'Decel.',  unit: 'm'  },
    { field: 'nSprints',   label: 'Sprints', unit: 'nº' },
    { field: 'nAcel',      label: 'Acel.',   unit: 'nº' },
    { field: 'nDecel',     label: 'Decel.',  unit: 'nº' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className="display" style={{ fontSize: 48, color: 'var(--snow)' }}>MEDIA EQUIPO</h2>
          <p style={{ fontSize: 12, color: 'var(--silver)', marginTop: 2 }}>
            Carga individual por jugador · RPE, UA y datos GPS de las sesiones
          </p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
        </div>
      </div>

      {/* Mode + period selector */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {/* Vista mode toggle */}
        <div style={{ display:'flex', gap:2, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:3 }}>
          {([['ciclo','📅 Por ciclo'],['dia','📆 Por día']] as const).map(([m, lbl]) => (
            <button className="hover-scale" key={m} onClick={() => setVistaMode(m)} style={{
              padding:'7px 16px', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600,
              border:'none', background: vistaMode===m ? 'var(--lime)' : 'transparent',
              color: vistaMode===m ? 'var(--ink)' : 'var(--silver)', transition:'all .12s',
            }}>{lbl}</button>
          ))}
        </div>

        {/* Ciclo selector — only in ciclo mode */}
        {vistaMode === 'ciclo' && (
          <div style={{ display:'flex', gap:2, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:3 }}>
            {(['microciclo','mesociclo','macrociclo'] as const).map(c => (
              <button className="hover-scale" key={c} onClick={() => setCiclo(c)} style={{
                padding:'7px 16px', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600,
                border:'none', background: ciclo===c ? 'rgba(200,241,53,.2)' : 'transparent',
                color: ciclo===c ? 'var(--lime)' : 'var(--silver)', transition:'all .12s', textTransform:'capitalize',
              }}>{c}</button>
            ))}
          </div>
        )}

        {/* Day picker — only in dia mode */}
        {vistaMode === 'dia' && (
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <button className="hover-scale" onClick={() => setDiaSelec(addDays(diaSelec, -1))}
              style={{ padding:'6px 12px', borderRadius:8, background:'var(--ink2)', border:'1px solid var(--mist)', color:'var(--silver)', cursor:'pointer', fontSize:14 }}>‹</button>
            <input type="date" value={diaSelec} onChange={e=>setDiaSelec(e.target.value)}
              className="wp-input" style={{ padding:'6px 12px', fontSize:13, width:155 }} />
            <button className="hover-scale" onClick={() => setDiaSelec(addDays(diaSelec, +1))}
              style={{ padding:'6px 12px', borderRadius:8, background:'var(--ink2)', border:'1px solid var(--mist)', color:'var(--silver)', cursor:'pointer', fontSize:14 }}>›</button>
          </div>
        )}
      </div>

      {/* ====== DIA VIEW ====== */}
      {vistaMode === 'dia' && (() => {
        const dp: any[] = diaData?.players || []
        const da: any   = diaData?.teamAvg || {}
        const bc = (rpe: number) => rpe <= 2 ? '#22c55e' : rpe <= 4 ? '#a3e635' : rpe <= 6 ? '#eab308' : rpe <= 8 ? '#f97316' : '#ef4444'
        const GPS_COLS = [
          { field:'distTotal',  label:'Dist.',    unit:'m'  },
          { field:'distSprint', label:'Sprint',   unit:'m'  },
          { field:'distMP',     label:'Alta pot', unit:'m'  },
          { field:'distAcel',   label:'Acel.',    unit:'m'  },
          { field:'distDecel',  label:'Decel.',   unit:'m'  },
          { field:'nSprints',   label:'Sprints',  unit:'nº' },
          { field:'nAcel',      label:'Acel.',    unit:'nº' },
          { field:'nDecel',     label:'Decel.',   unit:'nº' },
        ]
        const sorted = [...dp].sort((a,b) => {
          const va = a[sortField] ?? (sortField==='nombre' ? '' : -1)
          const vb = b[sortField] ?? (sortField==='nombre' ? '' : -1)
          if (typeof va === 'string') return sortDir==='asc' ? va.localeCompare(vb) : vb.localeCompare(va)
          return sortDir==='asc' ? va - vb : vb - va
        })
        return (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {diaLoading ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
            ) : dp.length === 0 ? (
              <div style={{ padding:40, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:14 }}>
                Sin sesiones ni registros para este día.
              </div>
            ) : (
              <>
                {/* Day KPIs */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:8 }}>
                  {[
                    ['RPE Medio', da.rpe || '—', 'var(--lime)'],
                    ['Dist. media', da.distTotal ? da.distTotal+'m' : '—', '#60a5fa'],
                    ['Sprints',  da.nSprints || '—', '#f59e0b'],
                    ['Jugadores', dp.length, 'var(--snow)'],
                  ].map(([l,v,c])=>(
                    <div key={l as string} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:800, color:c as string, fontFamily:'DM Mono,monospace' }}>{v}</div>
                      <div style={{ fontSize:10, color:'var(--silver)', marginTop:2 }}>{l as string}</div>
                    </div>
                  ))}
                </div>

                {/* Day table */}
                <div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between' }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                      {new Date(diaSelec+'T12:00:00').toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'})}
                    </p>
                    <p style={{ fontSize:10, color:'var(--fog)' }}>Click en columna para ordenar</p>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ background:'rgba(255,255,255,.03)' }}>
                          <SortTh field="nombre"   label="Jugador" />
                          <SortTh field="rpe"      label="RPE" />
                          <SortTh field="ua"       label="UCE" unit="media" />
                          <SortTh field="sesiones" label="Ses." />
                          {GPS_COLS.map(c=><SortTh key={c.field} field={c.field} label={c.label} unit={c.unit} />)}
                        </tr>
                      </thead>
                      <tbody>
                        {sorted.map((p:any, i:number) => {
                          const rpe = Number(p.rpe)||0
                          const col = rpe > 0 ? bc(rpe) : 'var(--fog)'
                          return (
                            <tr key={i} style={{ borderTop:'1px solid var(--mist)', background: i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                              <td style={{ padding:'8px 14px', fontWeight:500, color:'var(--snow)', whiteSpace:'nowrap' }}>
                                {p.nombre}
                                {p.posicion && <span style={{ fontSize:10, color:'var(--fog)', marginLeft:6 }}>{p.posicion}</span>}
                              </td>
                              <td style={{ padding:'8px 10px', textAlign:'center' }}>
                                {rpe > 0
                                  ? <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, fontSize:13, color:col, background:`${col}18`, padding:'2px 8px', borderRadius:6, border:`1px solid ${col}33` }}>{rpe}</span>
                                  : <span style={{ color:'var(--fog)' }}>—</span>}
                              </td>
                              <td style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:p.ua?'#60a5fa':'var(--fog)' }}>{p.ua||'—'}</td>
                              <td style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'var(--silver)' }}>{p.sesiones||'—'}</td>
                              {GPS_COLS.map(c=>(
                                <td key={c.field} style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:p[c.field]>0?'var(--snow)':'var(--fog)' }}>
                                  {p[c.field]>0 ? p[c.field] : '—'}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                        {/* Promedio row */}
                        <tr style={{ borderTop:'2px solid rgba(200,241,53,.3)', background:'rgba(200,241,53,.06)' }}>
                          <td style={{ padding:'10px 14px', fontWeight:800, color:'var(--lime)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Promedio equipo</td>
                          <td style={{ padding:'10px 10px', textAlign:'center' }}>
                            {da.rpe > 0
                              ? <span style={{ fontFamily:'DM Mono,monospace', fontWeight:800, fontSize:13, color:bc(da.rpe), background:`${bc(da.rpe)}18`, padding:'2px 8px', borderRadius:6 }}>{da.rpe}</span>
                              : <span style={{ color:'var(--fog)' }}>—</span>}
                          </td>
                          <td style={{ padding:'10px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:da.ua?'#60a5fa':'var(--fog)' }}>{da.ua||'—'}</td>
                          <td style={{ padding:'10px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'var(--silver)' }}>{da.sesiones||'—'}</td>
                          {GPS_COLS.map(c=>(
                            <td key={c.field} style={{ padding:'10px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:da[c.field]>0?'var(--lime)':'var(--fog)' }}>
                              {da[c.field]>0 ? da[c.field] : '—'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* ====== CICLO VIEW ====== */}
      {vistaMode === 'ciclo' && (<>

      {/* KPIs del equipo */}
      {players.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
          {[
            ['RPE Medio',    teamAvg.rpe,        'var(--lime)', 'escala Borg'],
            ['UCE Media',     teamAvg.ua,          '#60a5fa',    'por sesión'],
            ['UCE Total',     teamAvg.ua_total,    '#a78bfa',    'acumulado'],
            ['Jugadores',    players.length,      'var(--snow)', 'con datos'],
          ].map(([l, v, c, sub]) => (
            <div key={l as string} style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: c as string }}>{v || '—'}</div>
              <div style={{ fontSize: 10, color: 'var(--silver)', marginTop: 3 }}>{l as string}</div>
              <div style={{ fontSize: 9, color: 'var(--fog)', marginTop: 1 }}>{sub as string}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--silver)' }}>Cargando...</div>
      ) : players.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--silver)' }}>
          Sin datos para este ciclo. Registrá sesiones de entrenamiento con RPE en el Calendario.
        </div>
      ) : (
        <>
          {/* Info GPS calculado */}
          {!hasGps && (
            <div style={{ background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.2)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#93c5fd' }}>
              📐 Los datos GPS de la tabla de sesiones se calculan a partir de las tareas planificadas en el Calendario con espacio y jugadores definidos.
            </div>
          )}

          {/* ── TABLA 1: SESIONES (calculada desde el Calendario) ── */}
          <div style={{ background: 'var(--ink2)', border: '1px solid rgba(200,241,53,.2)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--mist)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  📅 CARGA DE SESIONES · {ciclo.toUpperCase()}
                </p>
                <p style={{ fontSize: 10, color: 'var(--fog)', marginTop: 2 }}>RPE, UA y GPS estimado desde las tareas del Calendario</p>
              </div>
              <p style={{ fontSize: 10, color: 'var(--fog)' }}>Click en columna para ordenar</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="wp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,.03)' }}>
                    <SortTh field="nombre"   label="Jugador" />
                    <SortTh field="rpe"      label="RPE" />
                    <SortTh field="ua"       label="UCE" unit="media" />
                    <SortTh field="ua_total" label="UCE" unit="total" />
                    <SortTh field="sesiones" label="Ses." />
                    {GPS_COLS.map(c => <SortTh key={c.field} field={c.field} label={c.label} unit={c.unit} />)}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((p: any, i: number) => {
                    const rpe = Number(p.rpe) || 0
                    const bc  = rpe > 0 ? borgColor(rpe) : 'var(--fog)'
                    return (
                      <tr key={i} style={{ borderTop: '1px solid var(--mist)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                        <td style={{ padding: '9px 14px', fontWeight: 500, color: 'var(--snow)', whiteSpace: 'nowrap' }}>
                          {p.nombre}
                          {p.posicion && <span style={{ fontSize: 10, color: 'var(--fog)', marginLeft: 6 }}>{p.posicion}</span>}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                          {rpe > 0
                            ? <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 700, fontSize: 13, color: bc, background: `${bc}18`, padding: '2px 8px', borderRadius: 6, border: `1px solid ${bc}33` }}>{rpe}</span>
                            : <span style={{ color: 'var(--fog)' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 600, color: p.ua ? '#60a5fa' : 'var(--fog)' }}>{p.ua || '—'}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', color: p.ua_total ? 'var(--snow)' : 'var(--fog)' }}>{p.ua_total || '—'}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', color: 'var(--silver)' }}>{p.sesiones || '—'}</td>
                        {GPS_COLS.map(c => (
                          <td key={c.field} style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', color: p[c.field] > 0 ? 'var(--snow)' : 'var(--fog)' }}>
                            {p[c.field] > 0 ? p[c.field] : '—'}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  <tr style={{ borderTop: '2px solid rgba(200,241,53,.3)', background: 'rgba(200,241,53,.06)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--lime)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Promedio equipo</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                      {teamAvg.rpe > 0
                        ? <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 800, fontSize: 13, color: borgColor(teamAvg.rpe), background: `${borgColor(teamAvg.rpe)}18`, padding: '2px 8px', borderRadius: 6 }}>{teamAvg.rpe}</span>
                        : '—'}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 800, color: '#60a5fa' }}>{teamAvg.ua || '—'}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 800, color: 'var(--snow)' }}>{teamAvg.ua_total || '—'}</td>
                    <td style={{ padding: '10px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', color: 'var(--silver)' }}>{teamAvg.sesiones || '—'}</td>
                    {GPS_COLS.map(c => (
                      <td key={c.field} style={{ padding: '10px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 700, color: teamAvg[c.field] > 0 ? 'var(--lime)' : 'var(--fog)' }}>
                        {teamAvg[c.field] > 0 ? teamAvg[c.field] : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── TABLA 2: GPS REAL (datos importados desde Catapult) ── */}
          <div style={{ background: 'var(--ink2)', border: '1px solid rgba(96,165,250,.25)', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header con selector de columnas */}
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--mist)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  📡 GPS REAL · {ciclo.toUpperCase()}
                  {hasRealGps && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: 'var(--fog)', background: 'rgba(96,165,250,.1)', borderRadius: 4, padding: '1px 6px' }}>
                    {dynamicGpsCols.length}/{availableCols.length} columnas
                  </span>}
                </p>
                <p style={{ fontSize: 10, color: 'var(--fog)', marginTop: 2 }}>Datos importados desde Catapult para el período</p>
              </div>
              {hasRealGps && availableCols.length > 0 && (
                <div style={{ position: 'relative' }}>
                  <button className="hover-scale"
                    onClick={() => setShowColPicker(v => !v)}
                    style={{ fontSize: 11, padding: '6px 12px', background: showColPicker ? 'rgba(96,165,250,.2)' : 'rgba(96,165,250,.08)', border: '1px solid rgba(96,165,250,.3)', borderRadius: 8, color: '#93c5fd', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    ⚙️ Columnas {showColPicker ? '▲' : '▼'}
                  </button>
                  {showColPicker && (() => {
                    // Group columns by category
                    const groups: Record<string, string[]> = {}
                    for (const col of availableCols) {
                      const g = GPS_METRIC_META[col]?.group || 'Otros'
                      if (!groups[g]) groups[g] = []
                      groups[g].push(col)
                    }
                    const isVisible = (col: string) => gpsVisibleCols === null || gpsVisibleCols.has(col)
                    const toggleCol = (col: string) => {
                      setGpsVisibleCols(prev => {
                        const current = prev === null ? new Set(availableCols) : new Set(prev)
                        if (current.has(col)) { current.delete(col) } else { current.add(col) }
                        return current.size === availableCols.length ? null : current
                      })
                    }
                    return (
                      <div style={{ position: 'absolute', right: 0, top: '110%', zIndex: 100, background: 'var(--ink)', border: '1px solid rgba(96,165,250,.3)', borderRadius: 12, padding: 16, minWidth: 260, boxShadow: '0 8px 32px rgba(0,0,0,.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Columnas visibles</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="hover-scale" onClick={() => setGpsVisibleCols(null)} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.2)', borderRadius: 5, color: '#93c5fd', cursor: 'pointer' }}>Todas</button>
                            <button className="hover-scale" onClick={() => setGpsVisibleCols(new Set())} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 5, color: '#fca5a5', cursor: 'pointer' }}>Ninguna</button>
                          </div>
                        </div>
                        {Object.entries(groups).map(([grp, cols]) => (
                          <div key={grp} style={{ marginBottom: 12 }}>
                            <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{grp}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {cols.map(col => {
                                const on = isVisible(col)
                                const meta = GPS_METRIC_META[col]
                                return (
                                  <button className="hover-scale" key={col} onClick={() => toggleCol(col)} style={{ fontSize: 10, padding: '4px 9px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${on ? 'rgba(96,165,250,.4)' : 'var(--mist)'}`, background: on ? 'rgba(96,165,250,.15)' : 'transparent', color: on ? '#93c5fd' : 'var(--fog)', transition: 'all .12s' }}>
                                    {meta ? meta.label : col}
                                    {meta && <span style={{ opacity: 0.6, marginLeft: 3, fontSize: 9 }}>{meta.unit}</span>}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        <button className="hover-scale" onClick={() => setShowColPicker(false)} style={{ width: '100%', fontSize: 11, padding: '7px', background: 'rgba(96,165,250,.1)', border: '1px solid rgba(96,165,250,.2)', borderRadius: 7, color: '#93c5fd', cursor: 'pointer', marginTop: 4 }}>
                          ✓ Aplicar
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            {hasRealGps ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="wp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'rgba(96,165,250,.05)' }}>
                      <th style={{ padding: '8px 14px', fontWeight: 600, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em', color: '#93c5fd', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'var(--ink2)' }}>Jugador</th>
                      <th style={{ padding: '8px 10px', fontWeight: 600, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em', color: '#93c5fd', textAlign: 'center', whiteSpace: 'nowrap' }}>Ses.</th>
                      {dynamicGpsCols.map(col => {
                        const meta = GPS_METRIC_META[col]
                        return (
                          <th key={col} style={{ padding: '8px 10px', fontWeight: 600, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.06em', color: '#93c5fd', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {meta ? meta.label : col}
                            {meta && <span style={{ display: 'block', fontSize: 8, opacity: 0.55, fontWeight: 400, textTransform: 'none' }}>{meta.unit}</span>}
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {gpsReal.map((p: any, i: number) => (
                      <tr key={i} style={{ borderTop: '1px solid var(--mist)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                        <td style={{ padding: '9px 14px', fontWeight: 500, color: 'var(--snow)', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: i % 2 === 0 ? 'var(--ink2)' : 'rgba(20,20,30,1)' }}>
                          {p.nombre}
                          {p.posicion && <span style={{ fontSize: 10, color: 'var(--fog)', marginLeft: 6 }}>{p.posicion}</span>}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', color: 'var(--silver)' }}>{p.sesiones_gps || '—'}</td>
                        {dynamicGpsCols.map(col => {
                          const raw = p[col]
                          const formatted = fmtGps(col, raw)
                          return (
                            <td key={col} style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', color: formatted !== '—' ? 'var(--snow)' : 'var(--fog)' }}>
                              {formatted}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {/* Promedio equipo */}
                    {(() => {
                      const n = gpsReal.length || 1
                      const MAX_FIELDS = new Set(['max_velocity','hr_max'])
                      const teamAvgDyn: Record<string, number> = {}
                      for (const col of dynamicGpsCols) {
                        const vals = (gpsReal as any[]).map((p: any) => Number(p[col]) || 0)
                        teamAvgDyn[col] = MAX_FIELDS.has(col)
                          ? Math.max(...vals)
                          : Math.round(vals.reduce((a: number, b: number) => a + b, 0) / n * 10) / 10
                      }
                      return (
                        <tr style={{ borderTop: '2px solid rgba(96,165,250,.3)', background: 'rgba(96,165,250,.06)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 800, color: '#60a5fa', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', position: 'sticky', left: 0, background: 'rgba(96,165,250,.06)' }}>Promedio equipo</td>
                          <td style={{ padding: '10px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', color: 'var(--silver)' }}>
                            {Math.round((gpsReal as any[]).reduce((s: number, p: any) => s + (p.sesiones_gps || 0), 0) / n)}
                          </td>
                          {dynamicGpsCols.map(col => {
                            const v = teamAvgDyn[col]
                            const formatted = fmtGps(col, v)
                            return (
                              <td key={col} style={{ padding: '10px 10px', textAlign: 'center', fontFamily: 'DM Mono,monospace', fontWeight: 700, color: formatted !== '—' ? '#60a5fa' : 'var(--fog)' }}>
                                {formatted}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 12, color: 'var(--fog)' }}>
                Importá un Excel o PDF desde la pestaña <strong style={{ color: 'var(--silver)' }}>📡 GPS</strong> para ver los datos reales acá.
              </div>
            )}
          </div>

          {/* Nota mesociclo/macrociclo */}
          {ciclo !== 'microciclo' && (
            <div style={{ background: 'rgba(200,241,53,.05)', border: '1px solid rgba(200,241,53,.15)', borderRadius: 10, padding: '10px 16px', fontSize: 11, color: 'var(--silver)' }}>
              💡 <strong style={{ color: 'var(--lime)' }}>{ciclo === 'mesociclo' ? 'Mesociclo (28 días)' : 'Macrociclo (365 días)'}</strong>:
              Los valores muestran la media por sesión de cada jugador en el período.
              La distancia y sprints de la tabla de sesiones son la suma acumulada de todas las sesiones planificadas en el Calendario.
            </div>
          )}
        </>
      )}
      </>)}{/* end ciclo view */}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════
// COMPARATIVA POR POSICIÓN
// ═══════════════════════════════════════════════════════════════════
function ComparativaPanel({ teamData }: { teamData: any[] }) {
  const [desde, setDesde] = useState(() => { const d=new Date(); d.setDate(d.getDate()-28); return localDateStr(d) })
  const [hasta, setHasta] = useState(todayLocal())
  const [posMetric, setPosMetric] = useState('dist_total')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [posFilter, setPosFilter] = useState<string>('todas')
  const [sortKey, setSortKey] = useState('ua_total')
  const [sortDir, setSortDir] = useState<'desc'|'asc'>('desc')

  useEffect(() => { cargar() }, [desde, hasta])

  async function cargar() {
    setLoading(true)
    try {
      const r = await fetch(`/api/carga-gps?desde=${desde}&hasta=${hasta}&ciclo=microciclo`)
      setData(await r.json())
    } catch(e){} finally { setLoading(false) }
  }

  const players: any[] = data?.players || []
  const gpsReal: any[] = data?.gpsReal || []

  // Merge player data with GPS
  const merged = players.map(p => {
    const gps = gpsReal.find(g => g.jugador_id === p.jugador_id) || {}
    return { ...p, ...gps, posicion: p.posicion || '—' }
  })

  // Get unique positions
  const positions = ['todas', ...Array.from(new Set(merged.map(p => p.posicion).filter(Boolean).sort()))]

  // Position order for consistent grouping
  const POS_ORDER_MAP: Record<string,number> = {
    'Portero':1, 'Defensa Central':2, 'Lateral Derecho':3, 'Lateral Izquierdo':3,
    'Mediocentro Defensivo':4, 'Mediocentro':5, 'Mediocentro Ofensivo':6,
    'Volante Derecho':7, 'Volante Izquierdo':7, 'Volante':7,
    'Extremo Derecho':8, 'Extremo Izquierdo':8,
    'Centro Delantero':9, 'Delantero':9,
  }

  const filtered = merged
    .filter(p => posFilter === 'todas' || p.posicion === posFilter)
    .sort((a, b) => {
      // When showing all, group by position first
      if (posFilter === 'todas') {
        const pa = POS_ORDER_MAP[a.posicion] ?? 99
        const pb = POS_ORDER_MAP[b.posicion] ?? 99
        if (pa !== pb) return pa - pb
      }
      // Within same position (or single position filter), sort by metric
      const va = Number(a[sortKey]) || 0
      const vb = Number(b[sortKey]) || 0
      return sortDir === 'desc' ? vb - va : va - vb
    })

  const VARS = [
    { key:'rpe',         label:'RPE',         color:'#c8f135', unit:'',     src:'rpe' },
    { key:'ua_total',    label:'UCE Total',    color:'#60a5fa', unit:'',     src:'rpe' },
    { key:'sesiones',    label:'Sesiones',    color:'var(--silver)', unit:'', src:'rpe' },
    { key:'minActivo',   label:'Min Activos', color:'#34d399', unit:'min',  src:'rpe' },
    { key:'dist_total',  label:'Dist. Total', color:'#93c5fd', unit:'m',    src:'gps' },
    { key:'dist_per_min',label:'Mts/min',     color:'#84cc16', unit:'m/min',src:'gps' },
    { key:'dist_hir',    label:'High Speed',  color:'#f59e0b', unit:'m',    src:'gps' },
    { key:'dist_v4',     label:'Vel B4',      color:'#a78bfa', unit:'m',    src:'gps' },
    { key:'dist_v5',     label:'Vel B6',      color:'#f97316', unit:'m',    src:'gps' },
    { key:'n_sprints',   label:'Nº Sprints',  color:'#ec4899', unit:'nº',   src:'gps' },
    { key:'max_velocity',label:'Vel. Máx',    color:'#ef4444', unit:'km/h', src:'gps' },
    { key:'acc3',        label:'Acc B2-3',    color:'#8b5cf6', unit:'nº',   src:'gps' },
    { key:'dec3',        label:'Dec B2-3',    color:'#06b6d4', unit:'nº',   src:'gps' },
  ]

  const posColor = (pos: string) => {
    const p = pos?.toLowerCase()
    if (p?.includes('portero')||p?.includes('gk')) return '#22c55e'
    if (p?.includes('central')||p?.includes('defen')) return '#3b82f6'
    if (p?.includes('lateral')) return '#06b6d4'
    if (p?.includes('medio')||p?.includes('mc')||p?.includes('mco')) return '#f59e0b'
    if (p?.includes('extremo')||p?.includes('banda')) return '#f97316'
    if (p?.includes('delantero')||p?.includes('9')) return '#ef4444'
    return '#888'
  }

  // Bar chart by position for a variable
  const renderPosChart = (varKey: string, label: string, color: string) => {
    const byPos: Record<string, number[]> = {}
    merged.forEach(p => {
      const pos = p.posicion || 'Sin pos.'
      if (!byPos[pos]) byPos[pos] = []
      const v = Number(p[varKey]) || 0
      if (v > 0) byPos[pos].push(v)
    })
    const posAvgs = Object.entries(byPos)
      .map(([pos, vals]) => ({ pos, avg: Math.round(vals.reduce((s,v)=>s+v,0)/(vals.length||1)) }))
      .filter(x => x.avg > 0)
      .sort((a,b) => b.avg - a.avg)
    if (!posAvgs.length) return null
    const maxV = Math.max(...posAvgs.map(x=>x.avg), 1)
    return (
      <div key={varKey} style={{ background:'var(--ink2)', borderRadius:12, padding:14, border:'1px solid var(--mist)' }}>
        <div style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', marginBottom:10 }}>{label}</div>
        <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:64 }}>
          {posAvgs.map((x,i)=>(
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2, minWidth:0 }}>
              <div style={{ position:'relative', width:'100%', borderRadius:'3px 3px 0 0', height:`${Math.max((x.avg/maxV)*52,14)}px`,
                background:posColor(x.pos), opacity:0.8, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:8, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap', textShadow:'0 1px 2px rgba(0,0,0,.8)' }}>{x.avg}</span>
              </div>
              <div style={{ fontSize:7, color:'var(--fog)', whiteSpace:'nowrap', overflow:'hidden', maxWidth:36, textOverflow:'ellipsis', textAlign:'center' }}>{x.pos}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'24px 20px', maxWidth:1200, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:'var(--snow)', letterSpacing:'0.04em', marginBottom:4 }}>⚖️ COMPARATIVA POR POSICIÓN</h2>
          <p style={{ fontSize:12, color:'var(--silver)' }}>Comparación de carga entre jugadores de la misma posición</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div>
            <label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Desde</label>
            <input className="wp-input" type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Hasta</label>
            <input className="wp-input" type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
          </div>
          <button className="hover-scale" onClick={()=>{
            const win = window.open('', '_blank'); if (!win) return

            // SVG bar chart builder (portrait-friendly, pure HTML)
            const mkBars = (items: {name:string, val:number, sub?:string}[], bars: {key:string,label:string,color:string}[], lineKey?: string, lineColor?: string) => {
              if (!items.length) return '<p style="color:#aaa;font-size:10px;text-align:center;padding:8px">Sin datos</p>'
              const BAR_H = 200, TOP = 24, BOT = 48, COL_W = Math.max(Math.floor(800/items.length), 60)
              const W = items.length * COL_W
              const allVals = items.flatMap(it => bars.map(b => Number((it as any)[b.key])||0))
              const maxBar = Math.max(...allVals, 1)
              const lineVals = lineKey ? items.map(it => Number((it as any)[lineKey])||0) : []
              const maxLine = Math.max(...lineVals.filter(v=>v>0), 1)
              let svg = `<svg viewBox="0 0 ${W} ${TOP+BAR_H+BOT}" width="100%" style="overflow:visible;display:block;">`
              // grid lines
              ;[0,25,50,75,100].forEach(p => {
                const y = TOP + BAR_H - (p/100)*BAR_H
                svg += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>`
              })
              // bars
              items.forEach((it, pi) => {
                const x0 = pi * COL_W + 2
                const bw = Math.max((COL_W - 4) / bars.length - 1, 6)
                bars.forEach((b, bi) => {
                  const val = Number((it as any)[b.key])||0
                  const h = val > 0 ? Math.max((val/maxBar)*BAR_H, 4) : 0
                  const bx = x0 + bi*(bw+1)
                  const by = TOP + BAR_H - h
                  svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" fill="${b.color}" rx="2"/>`
                  if (val > 0) {
                    if (h > 16) svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by+h/2+3).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" transform="rotate(-90,${(bx+bw/2).toFixed(1)},${(by+h/2).toFixed(1)})">${val}</text>`
                    else svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by-2).toFixed(1)}" text-anchor="middle" fill="${b.color}" font-size="7" font-weight="700">${val}</text>`
                  }
                })
                // x label
                const cx = x0 + (COL_W-4)/2
                svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+12).toFixed(1)}" text-anchor="middle" fill="#333" font-size="8" font-weight="600">${it.name}</text>`
                if (it.sub) svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+22).toFixed(1)}" text-anchor="middle" fill="#888" font-size="7">${it.sub}</text>`
              })
              // line overlay
              if (lineKey && lineVals.some(v=>v>0)) {
                const pts = items.map((it,pi) => {
                  const val = Number((it as any)[lineKey])||0
                  const cx = pi*COL_W + 2 + (COL_W-4)/2
                  const cy = val > 0 ? TOP + BAR_H - (val/maxLine)*BAR_H*0.85 : null
                  return {cx, cy, val}
                }).filter(pt => pt.cy !== null)
                if (pts.length > 1) svg += `<polyline points="${pts.map(p=>`${p.cx.toFixed(1)},${p.cy!.toFixed(1)}`).join(' ')}" fill="none" stroke="${lineColor||'#34d399'}" stroke-width="1.5" stroke-dasharray="4,2"/>`
                pts.forEach(pt => {
                  svg += `<circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy!.toFixed(1)}" r="3" fill="${lineColor||'#34d399'}" stroke="#fff" stroke-width="1"/>`
                  svg += `<text x="${pt.cx.toFixed(1)}" y="${(pt.cy!-5).toFixed(1)}" text-anchor="middle" fill="${lineColor||'#34d399'}" font-size="7" font-weight="700">${pt.val}</text>`
                })
              }
              svg += '</svg>'
              return svg
            }
            const mkChartBlock = (title: string, color: string, svgHtml: string, legendItems: {label:string,color:string}[]) => `
              <div style="border:1px solid ${color}30;border-radius:8px;padding:10px;page-break-inside:avoid;">
                <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.06em;text-align:center;padding-bottom:5px;border-bottom:1px solid ${color}20;margin-bottom:6px;">${title}</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                  ${legendItems.map(l=>`<span style="display:flex;align-items:center;gap:3px;font-size:8px;color:#555;"><span style="width:8px;height:8px;border-radius:2px;background:${l.color};display:inline-block;"></span>${l.label}</span>`).join('')}
                </div>
                ${svgHtml}
              </div>`

            const thS = (c: string) => `padding:4px 8px;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};white-space:nowrap;background:#f8fafc;`
            const tdS = (c: string, b=false) => `padding:5px 8px;text-align:center;font-family:monospace;font-size:10px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;`
            const thL = (c: string) => `padding:4px 12px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};background:#f8fafc;`
            const tdL = (c: string, b=false) => `padding:5px 12px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;font-size:10px;`

            // Table
            const tableRows = filtered.map((p:any, i:number) => `<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
              <td style="${tdL('#111',true)} white-space:nowrap;">${p.nombre}</td>
              <td style="${tdL('#555')} font-size:9px;">${p.posicion||'—'}</td>
              ${VARS.map((v:any) => { const val=Number(p[v.key])||0; return `<td style="${tdS(val?v.color.replace('var(--silver)','#888'):'#ccc',!!val)}">${val||'—'}</td>` }).join('')}
            </tr>`).join('')
            const posGroups: Record<string,any[]> = {}
            filtered.forEach((p:any) => { const pos=p.posicion||'—'; if(!posGroups[pos]) posGroups[pos]=[]; posGroups[pos].push(p) })
            const posRows = Object.entries(posGroups).map(([pos, ps]) =>
              `<tr style="background:#f0fdf4;border-top:2px solid #bbf7d0;">
                <td style="${tdL('#15803d',true)}" colspan="2">Prom. ${pos}</td>
                ${VARS.map((v:any) => { const vs=ps.map((p:any)=>Number(p[v.key])||0).filter(x=>x>0); const avg=vs.length?(vs.reduce((s:number,x:number)=>s+x,0)/vs.length).toFixed(1):'—'; return `<td style="${tdS(vs.length?v.color.replace('var(--silver)','#888'):'#ccc',vs.length>0)}">${avg}</td>` }).join('')}
              </tr>`
            ).join('')

            // Charts: one per metric, bars = positions or players
            const chartVars = VARS.filter((v:any) => v.key !== 'sesiones')
            const chartsHtml = chartVars.map((v:any) => {
              const items = posFilter === 'todas'
                ? Object.entries(posGroups).map(([pos, ps]) => {
                    const vals = ps.map((p:any)=>Number(p[v.key])||0).filter(x=>x>0)
                    return { name: pos.split(' ').map((w:string)=>w[0]).join('').slice(0,4), sub: pos, [v.key]: vals.length?(vals.reduce((s:number,x:number)=>s+x,0)/vals.length).toFixed(1):'0' }
                  }).filter((it:any) => Number(it[v.key]) > 0)
                : filtered.map((p:any) => ({ name: p.nombre.split(' ')[0], [v.key]: Number(p[v.key])||0 })).filter((it:any) => it[v.key] > 0)
              if (!items.length) return ''
              return mkChartBlock(v.label, v.color.replace('var(--silver)','#888').replace('var(--lime)','#4a7c00'), mkBars(items as any, [{key:v.key,label:v.label,color:v.color.replace('var(--silver)','#888').replace('var(--lime)','#4a7c00')}]), [{label:v.label,color:v.color.replace('var(--silver)','#888').replace('var(--lime)','#4a7c00')}])
            }).join('')

            const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>W&P Comparativa ${desde} – ${hasta}</title>
              <style>body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:12px;font-size:10px;}
              h2{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;padding-bottom:5px;}
              .sec{margin-bottom:20px;}.pb{page-break-before:always;}
              .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
              .grid3{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
              @media print{@page{size:A4 landscape;margin:.8cm;}body{padding:0;}.np{display:none;}.pb{page-break-before:always;}.grid3{grid-template-columns:1fr 1fr;}}</style></head><body>
              <div class="np" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;">
                <button className="hover-scale" onClick={() => window.print()} className="btn-ghost-blue" style={{ padding: "8px 20px" }}>🖨️ Imprimir / Guardar PDF</button>
                <span style="font-size:11px;color:#666;">Orientación: Horizontal (Landscape)</span>
              </div>
              <div style="background:#0f172a;color:#c8f135;padding:8px 16px;border-radius:6px;margin-bottom:12px;display:flex;justify-content:space-between;">
                <b style="font-size:13px;">W&P — COMPARATIVA · ${posFilter==='todas'?'Todas las posiciones':posFilter}</b>
                <span style="font-size:10px;color:#94a3b8;">${desde} → ${hasta}</span>
              </div>
              <div class="sec">
                <h2 style="color:#4a7c00;border-bottom:2px solid #c8f135;">TABLA COMPARATIVA POR JUGADOR</h2>
                <table className="wp-table" style="width:100%;border-collapse:collapse;">
                  <thead><tr>
                    <th style="${thL('#555')}">Jugador</th><th style="${thL('#555')}">Pos.</th>
                    ${VARS.map((v:any)=>`<th style="${thS(v.color.replace('var(--silver)','#888').replace('var(--lime)','#4a7c00'))}">${v.label}${v.unit?' ('+v.unit+')':''}</th>`).join('')}
                  </tr></thead>
                  <tbody>${tableRows}${posRows}</tbody>
                </table>
              </div>
              <div class="sec pb">
                <h2 style="color:#4a7c00;border-bottom:2px solid #c8f135;">📊 GRÁFICOS POR MÉTRICA</h2>
                <div class="grid3">${chartsHtml}</div>
              </div>
            </body></html>`
            win.document.write(html); win.document.close()
          }} className="btn-ghost-lime">🖨️ PDF</button>
        </div>
      </div>

      {/* Position filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
        {positions.map(pos=>(
          <button className="hover-scale" key={pos} onClick={()=>setPosFilter(pos)} style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${posFilter===pos?posColor(pos):'var(--mist)'}`,
            background:posFilter===pos?`${posColor(pos)}22`:'transparent', color:posFilter===pos?posColor(pos):'var(--silver)' }}>
            {pos === 'todas' ? '👥 Todas' : pos}
            {pos !== 'todas' && <span style={{ marginLeft:5, fontSize:9, color:'var(--fog)' }}>({merged.filter(p=>p.posicion===pos).length})</span>}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--silver)' }}>Cargando...</div> :
      !filtered.length ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:16 }}>
          Sin datos para este período. Registrá sesiones con RPE en el Calendario.
        </div>
      ) : (<>

      {/* Main comparison table */}
      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            COMPARATIVA · {posFilter === 'todas' ? 'TODOS LOS JUGADORES' : posFilter.toUpperCase()}
          </p>
          <p style={{ fontSize:10, color:'var(--fog)' }}>Click en columna para ordenar</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'rgba(255,255,255,.02)' }}>
                <th style={{ padding:'8px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:600, textTransform:'uppercase' }}>Jugador</th>
                <th style={{ padding:'8px 8px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:600, textTransform:'uppercase' }}>Pos.</th>
                {VARS.map(v=>(
                  <th key={v.key} onClick={()=>{ if(sortKey===v.key) setSortDir(d=>d==='desc'?'asc':'desc'); else { setSortKey(v.key); setSortDir('desc') } }}
                    style={{ padding:'8px 8px', textAlign:'center', color:sortKey===v.key?v.color:'var(--silver)', fontSize:9, fontWeight:600, textTransform:'uppercase', whiteSpace:'nowrap', cursor:'pointer' }}>
                    {v.label}{sortKey===v.key?(sortDir==='desc'?' ↓':' ↑'):''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p:any,i:number)=>{
                // Show position group header when position changes (only in "todas" view)
                const samePos = merged.filter(x=>x.posicion===p.posicion)
                const showGroupHeader = posFilter === 'todas' && (i === 0 || filtered[i-1].posicion !== p.posicion)
                return (
                  <>
                    {showGroupHeader && (
                      <tr key={`header-${p.posicion}`}>
                        <td colSpan={VARS.length + 2} style={{ padding:'10px 14px 4px', background:'rgba(255,255,255,.02)', borderTop: i>0?'2px solid var(--mist)':'none' }}>
                          <span style={{ fontSize:9, fontWeight:800, color:posColor(p.posicion), textTransform:'uppercase', letterSpacing:'0.1em' }}>
                            {p.posicion || 'Sin posición'}
                            <span style={{ marginLeft:6, color:'var(--fog)', fontWeight:400 }}>({samePos.length} jugador{samePos.length!==1?'es':''})</span>
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'8px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                      <td style={{ padding:'8px 8px' }}>
                        <span style={{ fontSize:10, padding:'2px 6px', borderRadius:4, background:`${posColor(p.posicion)}18`, color:posColor(p.posicion), fontWeight:600 }}>{p.posicion||'—'}</span>
                      </td>
                      {VARS.map(v=>{
                        const val = Number(p[v.key]) || 0
                        return (
                          <td key={v.key} style={{ padding:'8px 8px', textAlign:'center' }}>
                            {val > 0
                              ? <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color:v.color }}>{val}</span>
                              : <span style={{ color:'var(--fog)' }}>—</span>}
                          </td>
                        )
                      })}
                    </tr>
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts by position — grouped with metric selector */}
      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20, marginBottom:8 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>📊 PROMEDIO POR POSICIÓN</p>
        {/* Metric selector */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:20 }}>
          {VARS.filter(v=>v.key!=='sesiones').map(v=>(
            <button className="hover-scale" key={v.key} onClick={()=>setPosMetric(v.key)}
              style={{ fontSize:11, padding:'8px 6px', borderRadius:8, cursor:'pointer', textAlign:'center',
                border: posMetric===v.key ? `2px solid ${v.color}` : '1px solid var(--mist)',
                background: posMetric===v.key ? `${v.color}18` : 'var(--ink3)',
                color: posMetric===v.key ? v.color : 'var(--silver)',
                fontWeight: posMetric===v.key ? 700 : 400 }}>
              {v.label}
            </button>
          ))}
        </div>
        {/* Single grouped bar chart: one bar per position (or per player if filtered) */}
        {(() => {
          const selVar = VARS.find(v=>v.key===posMetric) || VARS[0]

          // When a single position is selected, show individual player bars
          if (posFilter !== 'todas') {
            const playerBars = filtered
              .map(p => ({ nombre: p.nombre, val: Number(p[selVar.key]) || 0, pos: p.posicion }))
              .filter(x => x.val > 0)
            if (!playerBars.length) return <div style={{padding:24,textAlign:'center',color:'var(--fog)',fontSize:12}}>Sin datos para esta posición en este período</div>
            const maxV = Math.max(...playerBars.map(x=>x.val), 1)
            const minV = Math.min(...playerBars.map(x=>x.val))
            const baseV = playerBars.length > 1 ? Math.floor(minV * 0.80) : 0
            const suggestedMax = Math.ceil(maxV * 1.15)           // 15% headroom above data max
            const rangeV = Math.max(suggestedMax - baseV, 1)
            const BAR_H = 200
            const BOT_PAD = 52
            const yTicks = [1, 0.75, 0.5, 0.25, 0].map(f => Math.round(baseV + f * rangeV))
            const minBarWidth = 80
            const chartMinWidth = playerBars.length * (minBarWidth + 20)
            const col = posColor(posFilter)
            return (
              <div style={{ background:'var(--ink3)', borderRadius:12, padding:16, marginTop:16 }}>
                <div style={{ fontSize:10, fontWeight:700, color:selVar.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                  {selVar.label} — {posFilter}
                </div>
                <div style={{ display:'flex', gap:0 }}>
                  <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', height:`${BAR_H}px`, paddingRight:8, marginRight:0, flexShrink:0, width:44, marginTop:32 }}>
                    {yTicks.map((t,i)=>(
                      <span key={i} style={{ fontSize:8, color:'var(--fog)', fontFamily:'DM Mono,monospace', textAlign:'right', display:'block', lineHeight:1 }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ flex:1, overflowX:'auto' }}>
                    {/* Grid lines */}
                    {[0,0.25,0.5,0.75,1].map((f,i)=>(
                      <div key={i} style={{ position:'absolute', left:0, right:0, top:`${32 + (1-f)*BAR_H}px`, height:1, background:`rgba(255,255,255,${f===0||f===1?'.12':'.05'})`, pointerEvents:'none' }}/>
                    ))}
                    {/* Bar area */}
                    <div style={{ display:'flex', alignItems:'flex-end', gap:0, height:`${BAR_H + 32}px`, minWidth:chartMinWidth, paddingTop:32 }}>
                      {playerBars.map((x,i)=>{
                        const barH = Math.max(((x.val - baseV) / rangeV) * BAR_H, 6)
                        return (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%', minWidth:minBarWidth }}>
                            <span style={{ fontSize:11, color:col, fontFamily:'DM Mono,monospace', fontWeight:800, marginBottom:4, whiteSpace:'nowrap' }}>{x.val.toLocaleString()}</span>
                            <div className="anim-bar-v" style={{ position:'relative', width:'60%', borderRadius:'4px 4px 0 0', height:`${barH}px`,
                              background: `linear-gradient(180deg, ${col}dd, ${col}88)`,
                              flexShrink:0, boxShadow:`0 0 12px ${col}40` }}>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* X-axis labels */}
                    <div style={{ display:'flex', gap:0, minWidth:chartMinWidth, marginTop:6 }}>
                      {playerBars.map((x,i)=>(
                        <div key={i} style={{ flex:1, minWidth:minBarWidth, textAlign:'center' }}>
                          <div style={{ fontSize:11, color:'var(--snow)', fontWeight:600 }}>{x.nombre.split(' ')[0]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          // "Todas" — group by position, one bar per position
          const posGroups: Record<string, number[]> = {}
          filtered.forEach((p:any) => {
            const pos = p.posicion || 'Sin pos.'
            if (!posGroups[pos]) posGroups[pos] = []
            const v = Number(p[selVar.key]) || 0
            if (v > 0) posGroups[pos].push(v)
          })
          const posPlayerNames: Record<string, string[]> = {}
          filtered.forEach((p:any) => {
            const pos = p.posicion || 'Sin pos.'
            if (!posPlayerNames[pos]) posPlayerNames[pos] = []
            if (Number(p[selVar.key]) > 0) posPlayerNames[pos].push(p.nombre)
          })
          const posData = Object.entries(posGroups)
            .map(([pos, vals]) => ({ pos, avg: Math.round(vals.reduce((s,v)=>s+v,0)/vals.length), count: vals.length, names: posPlayerNames[pos]||[] }))
            .filter(x => x.avg > 0)
            .sort((a,b) => (POS_ORDER_MAP[a.pos] ?? 99) - (POS_ORDER_MAP[b.pos] ?? 99))
          if (!posData.length) return <div style={{padding:24,textAlign:'center',color:'var(--fog)',fontSize:12}}>Sin datos GPS para este período</div>
          const maxV = Math.max(...posData.map(x=>x.avg), 1)
          const minV = Math.min(...posData.map(x=>x.avg))
          // Base dinámica: empieza en 80% del mínimo para que las diferencias se vean dramáticas
          const baseV = posData.length > 1 ? Math.floor(minV * 0.80) : 0
          const rangeV = Math.max(maxV - baseV, 1)
          const BAR_H = 200
          const BOT_PAD = 56
          // Ticks del eje Y basados en el rango real
          const yTicks = [1, 0.75, 0.5, 0.25, 0].map(f => Math.round(baseV + f * rangeV))
          const minBarWidth = 80
          const chartMinWidth = posData.length * (minBarWidth + 20)
          return (
            <div style={{ background:'var(--ink3)', borderRadius:12, padding:16, marginTop:16 }}>
              <div style={{ fontSize:10, fontWeight:700, color:selVar.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>
                {selVar.label} — promedio por posición
              </div>
              <div style={{ display:'flex', gap:0 }}>
                {/* Y-axis */}
                <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between',
                  paddingRight:8, width:44, flexShrink:0,
                  height: BAR_H, marginTop: 32 }}>
                  {yTicks.map((t,i)=>(
                    <div key={i} style={{ fontSize:9, color:'var(--fog)', fontFamily:'DM Mono,monospace', textAlign:'right', lineHeight:1 }}>{t}</div>
                  ))}
                </div>
                {/* Chart area */}
                <div style={{ flex:1, overflowX:'auto' }}>
                  <div style={{ position:'relative', minWidth: chartMinWidth }}>
                    {/* Grid lines */}
                    {[0,0.25,0.5,0.75,1].map((f,i)=>(
                      <div key={i} style={{ position:'absolute', left:0, right:0,
                        top: 32 + (1-f)*BAR_H,
                        borderTop:`1px solid rgba(255,255,255,${f===0||f===1?'.12':'.05'})`, pointerEvents:'none' }}/>
                    ))}
                    {/* Bar area only */}
                    <div style={{ display:'flex', gap:12, alignItems:'flex-end',
                      height: BAR_H + 32, paddingTop: 32 }}>
                      {posData.map((x,i)=>{
                        const barH = Math.max(((x.avg - baseV) / rangeV) * BAR_H, 6)
                        return (
                          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', minWidth:minBarWidth, height:'100%', justifyContent:'flex-end' }}>
                            <span style={{ fontSize:11, color:posColor(x.pos), fontFamily:'DM Mono,monospace', fontWeight:800, marginBottom:4, whiteSpace:'nowrap' }}>{x.avg.toLocaleString()}</span>
                            <div className="anim-bar-v" style={{ position:'relative', width:'60%', minWidth:28, maxWidth:64, borderRadius:'6px 6px 0 0',
                              height:`${barH}px`,
                              background: `linear-gradient(180deg, ${posColor(x.pos)}dd, ${posColor(x.pos)}88)`,
                              flexShrink:0, boxShadow:`0 0 12px ${posColor(x.pos)}40` }}>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* X-axis labels below the axis */}
                    <div style={{ display:'flex', gap:12, marginTop:8 }}>
                      {posData.map((x,i)=>(
                        <div key={i} style={{ flex:1, minWidth:minBarWidth, textAlign:'center' }}>
                          <div style={{ fontSize:10, color:'var(--snow)', fontWeight:700, wordBreak:'break-word', lineHeight:1.3 }}>{x.pos}</div>
                          {x.names.length > 0 && (
                            <div style={{ fontSize:9, color:'var(--lime)', textAlign:'center', marginTop:2, lineHeight:1.3 }}>
                              {x.names.map(n=>n.split(' ')[0]).join(', ')}
                            </div>
                          )}
                          <div style={{ fontSize:9, color:'var(--silver)', textAlign:'center', marginTop:2 }}>{x.count} jugador{x.count!==1?'es':''}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
      </>)}
    </div>
  )
}

function LesionesPanel({ teamData, onRefresh }) {
  const [lesiones, setLesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [historial, setHistorial] = useState(false)
  const [vistaJugador, setVistaJugador] = useState<number|null>(null)

  useEffect(()=>{ if(vistaJugador===null) loadL() }, [historial, vistaJugador])

  async function loadL() {
    setLoading(true)
    try { const r=await fetch(`/api/lesiones?activas=${!historial}`); setLesiones(await r.json()) }
    finally { setLoading(false) }
  }

  async function updateL(id, patch) {
    await fetch('/api/lesiones',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...patch})})
    loadL(); onRefresh()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ marginBottom: 0 }}>
            <h2 style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: 'var(--snow)', textTransform: 'uppercase', margin: 0, lineHeight: 1.1 }}>ENFERMERÍA</h2>
            <h3 style={{ fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: '#a855f7', textTransform: 'uppercase', margin: 0, letterSpacing: '0.05em' }}>MÉDICO</h3>
          </div>
          <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Registro y historial de lesiones del plantel</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {vistaJugador !== null
            ? <button className="hover-scale" onClick={()=>setVistaJugador(null)} className="btn-ghost" style={{ fontSize:12, padding:'10px 14px' }}>← Volver</button>
            : <button className="hover-scale" onClick={()=>setHistorial(h=>!h)} className="btn-ghost" style={{ fontSize:12, padding:'10px 14px' }}>{historial?'Ver activas':'Ver historial'}</button>
          }
          <button className="hover-scale" onClick={()=>setShowNew(true)} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nueva lesión</button>
        </div>
      </div>

      {showNew && <NewLesionForm teamData={teamData} onSuccess={()=>{ setShowNew(false); loadL(); onRefresh() }} onCancel={()=>setShowNew(false)} />}

      {/* Historial acumulativo por jugador — solo en vista activas */}
      {vistaJugador === null && !historial && <HistorialResumen onSelectJugador={setVistaJugador} />}

      {/* Vista historial de un jugador específico */}
      {vistaJugador !== null && (
        <HistorialJugador
          jugadorId={vistaJugador}
          jugadorNombre={teamData?.find((p:any)=>p.jugador_id===vistaJugador)?.nombre || ''}
        />
      )}

      {/* Lista principal */}
      {vistaJugador === null && (
        loading
          ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
          : lesiones.length===0
            ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>{historial?'Sin historial de lesiones.':'✓ Sin jugadores en enfermería.'}</div>
            : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(lesiones as any[]).map(l=>(
                  <LesionCard key={l.id} lesion={l} onUpdate={p=>updateL(l.id,p)} onVerHistorial={()=>setVistaJugador(l.jugador_id)} />
                ))}
              </div>
      )}
    </div>
  )
}

function HistorialResumen({ onSelectJugador }: { onSelectJugador:(id:number)=>void }) {
  const [data, setData] = useState<any[]>([])

  useEffect(()=>{
    fetch('/api/lesiones?historial_resumen=true')
      .then(r=>r.json())
      .then(d=>setData(Array.isArray(d)?d:[]))
      .catch(()=>{})
  },[])

  if (!data.length) return null

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:18 }}>
      <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>
        📊 Historial lesivo del plantel
      </p>
      <div style={{ overflowX:'auto' }}>
        <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--mist)' }}>
              {['Jugador','Lesiones','Días totales','Última',''].map(h=>(
                <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:10, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row:any)=>{
              const alerta = row.dias_totales >= 30
              return (
                <tr key={row.jugador_id} style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                  <td style={{ padding:'9px 10px', color:'var(--snow)', fontWeight:500 }}>{row.nombre}</td>
                  <td style={{ padding:'9px 10px', color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>{row.total_lesiones}</td>
                  <td style={{ padding:'9px 10px' }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color: alerta ? '#ef4444' : row.dias_totales > 14 ? '#f59e0b' : 'var(--silver)' }}>
                      {row.dias_totales}d
                    </span>
                    {alerta && <span style={{ fontSize:10, color:'#ef4444', marginLeft:6 }}>⚠</span>}
                  </td>
                  <td style={{ padding:'9px 10px', color:'var(--fog)', fontSize:11, fontFamily:'DM Mono,monospace' }}>{row.ultima_lesion||'—'}</td>
                  <td style={{ padding:'9px 10px' }}>
                    <button className="hover-scale" onClick={()=>onSelectJugador(row.jugador_id)} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid var(--fog)', color:'var(--silver)', cursor:'pointer' }}>
                      Ver →
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HistorialJugador({ jugadorId, jugadorNombre }: { jugadorId:number, jugadorNombre:string }) {
  const [lesiones, setLesiones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    fetch(`/api/lesiones?jugador_id=${jugadorId}`)
      .then(r=>r.json())
      .then(d=>{ setLesiones(Array.isArray(d)?d:[]); setLoading(false) })
      .catch(()=>setLoading(false))
  },[jugadorId])

  const diasTotales = lesiones.reduce((acc:number, l:any)=>{
    if (!l.fecha_inicio) return acc
    const inicio = new Date(l.fecha_inicio)
    const fin = l.fecha_alta ? new Date(l.fecha_alta) : new Date()
    return acc + Math.max(0, Math.floor((fin.getTime()-inicio.getTime())/86400000))
  }, 0)

  const alerta = diasTotales >= 30

  if (loading) return <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:18 }}>
        <div>
          <p style={{ fontSize:15, fontWeight:700, color:'var(--snow)', marginBottom:4 }}>{jugadorNombre}</p>
          <p style={{ fontSize:12, color:'var(--silver)' }}>{lesiones.length} lesión{lesiones.length!==1?'es':''} registrada{lesiones.length!==1?'s':''}</p>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:28, fontWeight:700, fontFamily:'DM Mono,monospace', color: alerta ? '#ef4444' : diasTotales > 14 ? '#f59e0b' : 'var(--lime)' }}>{diasTotales}d</div>
          <div style={{ fontSize:10, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em' }}>días totales de baja</div>
        </div>
      </div>
      {alerta && (
        <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#fca5a5' }}>
          ⚠ {diasTotales} días de baja acumulados — manejar carga con precaución
        </div>
      )}
      {lesiones.length === 0
        ? <p style={{ fontSize:12, color:'var(--fog)', textAlign:'center', padding:'20px 0' }}>Sin lesiones registradas.</p>
        : (
          <div style={{ overflowX:'auto' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--mist)' }}>
                  {['Fecha','Diagnóstico','Zona','Días de baja','Estado','Alta'].map(h=>(
                    <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:10, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lesiones as any[]).map((l:any)=>{
                  const inicio = new Date(l.fecha_inicio)
                  const fin = l.fecha_alta ? new Date(l.fecha_alta) : new Date()
                  const dias = Math.max(0, Math.floor((fin.getTime()-inicio.getTime())/86400000))
                  const col = LCOL[l.estado]||'#888'
                  return (
                    <tr key={l.id} style={{ borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                      <td style={{ padding:'9px 10px', color:'var(--fog)', fontFamily:'DM Mono,monospace', fontSize:11 }}>{l.fecha_inicio}</td>
                      <td style={{ padding:'9px 10px', color:'var(--snow)' }}>{l.tipo_lesion||'—'}</td>
                      <td style={{ padding:'9px 10px', color:'var(--silver)' }}>{l.zona||'—'}</td>
                      <td style={{ padding:'9px 10px', fontFamily:'DM Mono,monospace', fontWeight:700, color: dias > 20 ? '#f59e0b' : 'var(--silver)' }}>
                        {dias}d {!l.fecha_alta && <span style={{ fontSize:10, color:'#ef4444' }}>en curso</span>}
                      </td>
                      <td style={{ padding:'9px 10px' }}>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, background:`${col}20`, color:col, border:`1px solid ${col}33` }}>{l.estado}</span>
                      </td>
                      <td style={{ padding:'9px 10px', color:'var(--fog)', fontFamily:'DM Mono,monospace', fontSize:11 }}>{l.fecha_alta||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:'2px solid var(--mist)' }}>
                  <td colSpan={3} style={{ padding:'10px 10px', fontSize:12, fontWeight:700, color:'var(--silver)' }}>TOTAL ACUMULADO</td>
                  <td style={{ padding:'10px 10px', fontFamily:'DM Mono,monospace', fontWeight:700, fontSize:14, color: alerta ? '#ef4444' : 'var(--lime)' }}>{diasTotales}d</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      }
    </div>
  )
}

function LesionCard({ lesion:l, onUpdate, onVerHistorial }: { lesion:any, onUpdate:(p:any)=>void, onVerHistorial:()=>void }) {
  const [open, setOpen] = useState(false)
  const [estado, setEstado] = useState(l.estado)
  const [activa, setActiva] = useState(l.activa)
  const [fechaAlta, setFechaAlta] = useState<string|null>(l.fecha_alta||null)
  const [eta, setEta] = useState(String(l.eta_dias||''))
  const col = LCOL[estado]||'#888'
  const inicio = new Date(l.fecha_inicio)
  const fin = fechaAlta ? new Date(fechaAlta) : new Date()
  const dias = Math.max(0, Math.floor((fin.getTime()-inicio.getTime())/86400000))

  function darAlta() {
    const hoy = todayLocal()
    setEstado('Alta')
    setActiva(false)
    setFechaAlta(hoy)
    onUpdate({ activa:false, fecha_alta:hoy, estado:'Alta' })
  }

  function reactivar() {
    setEstado('Tratamiento')
    setActiva(true)
    setFechaAlta(null)
    onUpdate({ activa:true, fecha_alta:null, estado:'Tratamiento' })
  }

  return (
    <div style={{ background:'var(--ink2)', border:`1px solid ${activa?'rgba(239,68,68,.25)':'var(--mist)'}`, borderRadius:14, overflow:'hidden' }}>
      <button className="hover-scale" onClick={()=>setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        <div style={{ width:10, height:10, borderRadius:'50%', background:col, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:500, fontSize:14, color:'var(--snow)' }}>{l.jugador_nombre}</div>
          <div style={{ fontSize:11, color:'var(--silver)', marginTop:1 }}>{l.posicion||'—'} · {l.tipo_lesion||'Sin tipo'} · {l.zona||'—'}</div>
        </div>
        <div style={{ textAlign:'center', minWidth:60 }}>
          <div className="mono" style={{ fontSize:16, fontWeight:600, color: activa ? '#ef4444' : '#4ade80' }}>{dias}d</div>
          <div style={{ fontSize:9, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>{activa ? 'EN LISTA' : 'BAJA TOTAL'}</div>
        </div>
        <span style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background:`${col}20`, color:col, border:`1px solid ${col}44`, fontWeight:600, flexShrink:0 }}>{estado}</span>
        {l.eta_dias && activa && <div style={{ textAlign:'right', minWidth:60 }}><div className="mono" style={{ fontSize:16, fontWeight:600, color:'#f87171' }}>{l.eta_dias}d</div><div style={{ fontSize:9, color:'#f87171', fontFamily:'DM Mono,monospace' }}>ETA</div></div>}
        <span style={{ color:'var(--fog)', fontSize:14, transition:'transform .2s', display:'inline-block', transform:open?'rotate(90deg)':'none' }}>›</span>
      </button>
      {open && (
        <div style={{ padding:'12px 18px 18px', borderTop:'1px solid var(--mist)', background:'var(--ink3)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Estado</label>
              <select className="wp-input" style={{ padding:'8px 12px', fontSize:13, appearance:'none' }} value={estado} onChange={e=>{ setEstado(e.target.value); onUpdate({estado:e.target.value}) }}>
                {LEST.map(s=><option key={s} value={s} style={{ background:'var(--ink2)' }}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>ETA (días)</label>
              <input type="number" className="wp-input" style={{ padding:'8px 12px', fontSize:13 }} value={eta} placeholder="ej: 21" onChange={e=>setEta(e.target.value)} onBlur={()=>eta&&onUpdate({eta_dias:Number(eta)})} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end', gap:6 }}>
              {activa
                ? <button className="btn-ghost" style={{ fontSize:12, padding:8, color:'#4ade80', borderColor:'rgba(34,197,94,.3)', width:'100%' }} onClick={darAlta}>✓ Dar de alta</button>
                : <button className="btn-ghost" style={{ fontSize:12, padding:8, color:'#f87171', borderColor:'rgba(239,68,68,.3)', width:'100%' }} onClick={reactivar}>↩ Reactivar</button>
              }
              <button className="btn-ghost" style={{ fontSize:11, padding:'6px 8px', width:'100%', color:'var(--fog)' }} onClick={e=>{ e.stopPropagation(); onVerHistorial() }}>
                📊 Historial completo
              </button>
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {l.fecha_inicio && <span style={{ fontSize:11, color:'var(--silver)', background:'var(--ink2)', borderRadius:6, padding:'3px 8px', border:'1px solid var(--mist)' }}>📅 Inicio: {l.fecha_inicio}</span>}
            {fechaAlta && <span style={{ fontSize:11, color:'#4ade80', background:'rgba(34,197,94,.08)', borderRadius:6, padding:'3px 8px', border:'1px solid rgba(34,197,94,.2)' }}>✓ Alta: {fechaAlta}</span>}
            {l.descripcion && <span style={{ fontSize:11, color:'var(--silver)' }}>📝 {l.descripcion}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function NewLesionForm({ teamData, onSuccess, onCancel }) {
  const [f, setF] = useState({ jugador_id:'', fecha_inicio:todayLocal(), tipo_lesion:'Muscular', zona:'', descripcion:'', eta_dias:'', estado:'Tratamiento' })
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await fetch('/api/lesiones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,jugador_id:Number(f.jugador_id),eta_dias:f.eta_dias?Number(f.eta_dias):null})}); onSuccess() }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'#f87171', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>🏥 Nueva Lesión</p>
        <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Jugador</label><select className="wp-input" style={{ padding:'8px 12px', fontSize:13, appearance:'none' }} value={f.jugador_id} onChange={e=>set('jugador_id',e.target.value)} required><option value="" style={{ background:'var(--ink2)' }}>— Seleccionar —</option>{teamData.map(p=><option key={p.jugador_id} value={p.jugador_id} style={{ background:'var(--ink2)' }}>{p.nombre}</option>)}</select></div>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Fecha inicio</label><input type="date" className="wp-input" style={{ padding:'8px 12px', fontSize:13 }} value={f.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} /></div>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Tipo</label><select className="wp-input" style={{ padding:'8px 12px', fontSize:13, appearance:'none' }} value={f.tipo_lesion} onChange={e=>set('tipo_lesion',e.target.value)}>{LTIPOS.map(t=><option key={t} value={t} style={{ background:'var(--ink2)' }}>{t}</option>)}</select></div>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Zona específica</label><input className="wp-input" style={{ padding:'8px 12px', fontSize:13 }} value={f.zona} onChange={e=>set('zona',e.target.value)} placeholder="ej: Isquiotibial derecho" /></div>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>ETA (días)</label><input type="number" className="wp-input" style={{ padding:'8px 12px', fontSize:13 }} value={f.eta_dias} onChange={e=>set('eta_dias',e.target.value)} placeholder="ej: 21" /></div>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Estado inicial</label><select className="wp-input" style={{ padding:'8px 12px', fontSize:13, appearance:'none' }} value={f.estado} onChange={e=>set('estado',e.target.value)}>{LEST.filter(s=>s!=='Alta').map(s=><option key={s} value={s} style={{ background:'var(--ink2)' }}>{s}</option>)}</select></div>
        </div>
        <div style={{ marginBottom:12 }}><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Descripción</label><input className="wp-input" value={f.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Mecanismo, observaciones..." /></div>
        <div style={{ display:'flex', gap:12, marginTop:24 }}>
          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Registrando...':'Registrar lesión →'}</button>
          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
      </div>
    </div>
  )
}

// ══ BULK IMPORT PANEL ════════════════════════════════════════════════════════
const IMPORT_COLS = [
  { key:'posicion',         label:'Posición' },
  { key:'edad',             label:'Edad' },
  { key:'peso_kg',          label:'Peso (kg)' },
  { key:'estatura_cm',      label:'Estatura (cm)' },
  { key:'pie_habil',        label:'Pie Hábil' },
  { key:'email',            label:'Email' },
  { key:'fecha_nacimiento', label:'Fecha Nacimiento' },
]

function BulkImportPanel({ onSuccess, onCancel }: { onSuccess: ()=>void; onCancel: ()=>void }) {
  const [step, setStep]           = useState<'config'|'preview'|'done'>('config')
  const [selectedCols, setSelectedCols] = useState<string[]>(IMPORT_COLS.map(c=>c.key))
  const [file, setFile]           = useState<File|null>(null)
  const [parsing, setParsing]     = useState(false)
  const [preview, setPreview]     = useState<any[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [saving, setSaving]       = useState(false)
  const [result, setResult]       = useState<any>(null)
  const [dragOver, setDragOver]   = useState(false)

  function toggleCol(key: string) {
    setSelectedCols(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key])
  }

  function buildTemplateUrl() {
    const cols = selectedCols.join(',')
    return `/api/players/template?cols=${cols}`
  }

  async function handleFile(f: File) {
    setFile(f); setParsing(true); setParseErrors([]); setPreview([])
    try {
      const XLSX = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type:'array', cellDates:false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true }) as any[][]

      const res = await fetch('/api/players/import', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ rows: raw, confirm: false }),
      })
      const d = await res.json()
      if (!res.ok) { setParseErrors([d.error||'Error al parsear', ...(d.parse_errors||[])]); setParsing(false); return }
      setPreview(d.players||[])
      setParseErrors(d.parse_errors||[])
      setStep('preview')
    } catch(e: any) {
      setParseErrors([String(e?.message||e)])
    }
    setParsing(false)
  }

  async function confirmar() {
    if (!file) return
    setSaving(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type:'array', cellDates:false })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header:1, defval:null, raw:true }) as any[][]

      const res = await fetch('/api/players/import', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ rows: raw, confirm: true }),
      })
      const d = await res.json()
      setResult(d)
      setStep('done')
    } catch(e: any) {
      setResult({ ok:false, error: String(e?.message||e) })
      setStep('done')
    }
    setSaving(false)
  }

  const inputStyle = { background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'7px 12px', fontSize:12, color:'var(--snow)', outline:'none', width:'100%' }
  const sectionTitle = (t: string) => <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{t}</p>

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          📤 Importación masiva de jugadores
        </p>
        <button className="hover-bright" onClick={onCancel} style={{ background:'transparent', border:'none', cursor:'pointer', color:'var(--silver)', fontSize:18, lineHeight:1 }}>✕</button>
      </div>

      {/* Step indicator */}
      <div style={{ display:'flex', gap:0, marginBottom:20 }}>
        {(['config','preview','done'] as const).map((s,i)=>(
          <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, flex:1 }}>
              <div style={{ width:22, height:22, borderRadius:'50%', background: step===s?'var(--lime)': (i<(['config','preview','done'] as const).indexOf(step)?'rgba(200,241,53,.3)':'var(--mist)'), color: step===s?'var(--ink)':'var(--silver)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>
                {i+1}
              </div>
              <span style={{ fontSize:10, fontWeight:600, color: step===s?'var(--lime)':'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {s==='config'?'Configurar':s==='preview'?'Preview':'Resultado'}
              </span>
              {i<2 && <div style={{ flex:1, height:1, background:'var(--mist)', margin:'0 8px' }}/>}
            </div>
          </div>
        ))}
      </div>

      {/* ── STEP 1: Config ── */}
      {step==='config' && (
        <div>
          {sectionTitle('1. Elegí las columnas que querés en la plantilla')}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
            {IMPORT_COLS.map(c=>(
              <button className="hover-scale" key={c.key} onClick={()=>toggleCol(c.key)}
                style={{ fontSize:11, padding:'5px 12px', borderRadius:20, cursor:'pointer', fontWeight:600, transition:'all .12s',
                  border:`1px solid ${selectedCols.includes(c.key)?'var(--lime)':'var(--fog)'}`,
                  background: selectedCols.includes(c.key)?'rgba(200,241,53,.12)':'transparent',
                  color: selectedCols.includes(c.key)?'var(--lime)':'var(--silver)' }}>
                {selectedCols.includes(c.key)?'✓ ':''}{c.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize:11, color:'var(--fog)', marginBottom:16 }}>
            Los campos <strong style={{ color:'var(--lime)' }}>Nombre, Usuario y Contraseña</strong> siempre se incluyen.
          </p>

          <a href={buildTemplateUrl()} download="plantilla_jugadores.xlsx"
            style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, padding:'10px 20px', borderRadius:10, background:'rgba(200,241,53,.12)', border:'1px solid rgba(200,241,53,.3)', color:'var(--lime)', textDecoration:'none', fontWeight:700, marginBottom:24 }}>
            📥 Descargar plantilla ({selectedCols.length + 3} columnas)
          </a>

          <div style={{ borderTop:'1px solid var(--mist)', paddingTop:20 }}>
            {sectionTitle('2. Completá la planilla y subila acá')}
            <label
              onDragOver={e=>{e.preventDefault();setDragOver(true)}}
              onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files?.[0];if(f)handleFile(f)}}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, cursor:'pointer',
                background: dragOver?'rgba(200,241,53,.06)':'var(--ink3)',
                border:`2px dashed ${dragOver?'var(--lime)':'var(--fog)'}`,
                borderRadius:12, padding:'32px 20px', transition:'all .15s', textAlign:'center' }}>
              {parsing
                ? <><span style={{ fontSize:24 }}>⏳</span><span style={{ fontSize:13, color:'var(--silver)' }}>Analizando archivo...</span></>
                : <><span style={{ fontSize:28 }}>📁</span>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--silver)' }}>Arrastrá el xlsx acá o hacé click para seleccionar</span>
                    <span style={{ fontSize:11, color:'var(--fog)' }}>{file?`📄 ${file.name}`:'Solo archivos .xlsx'}</span></>}
              <input type="file" accept=".xlsx" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f)}} />
            </label>
            {parseErrors.length>0 && (
              <div style={{ marginTop:12, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:10, padding:14 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#f87171', marginBottom:6 }}>⚠️ Problemas detectados:</p>
                {parseErrors.map((e,i)=><p key={i} style={{ fontSize:11, color:'#f87171', marginBottom:2 }}>• {e}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2: Preview ── */}
      {step==='preview' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ background:'rgba(200,241,53,.1)', border:'1px solid rgba(200,241,53,.25)', borderRadius:10, padding:'8px 16px', fontSize:13, color:'var(--lime)', fontWeight:700 }}>
              ✓ {preview.length} jugador{preview.length!==1?'es':''} listos para importar
            </div>
            {parseErrors.length>0 && (
              <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:'8px 14px', fontSize:12, color:'#f87171' }}>
                ⚠️ {parseErrors.length} advertencia{parseErrors.length!==1?'s':''}
              </div>
            )}
          </div>

          {parseErrors.length>0 && (
            <div style={{ background:'rgba(239,68,68,.06)', border:'1px solid rgba(239,68,68,.15)', borderRadius:10, padding:12, marginBottom:14 }}>
              {parseErrors.map((e,i)=><p key={i} style={{ fontSize:11, color:'#f87171', marginBottom:1 }}>• {e}</p>)}
            </div>
          )}

          <div style={{ overflowX:'auto', marginBottom:20, borderRadius:10, border:'1px solid var(--mist)' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--ink3)' }}>
                  {['Nombre','Usuario','Posición','Edad','Peso','Estatura','Pie','Email'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((p,i)=>(
                  <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'var(--ink3)' }}>
                    <td style={{ padding:'7px 12px', color:'var(--snow)', fontWeight:600 }}>{p.nombre}</td>
                    <td style={{ padding:'7px 12px', color:'var(--lime)', fontFamily:'DM Mono,monospace', fontSize:11 }}>@{p.usuario}</td>
                    <td style={{ padding:'7px 12px', color:'var(--silver)' }}>{p.posicion||'—'}</td>
                    <td style={{ padding:'7px 12px', color:'var(--silver)' }}>{p.edad||'—'}</td>
                    <td style={{ padding:'7px 12px', color:'var(--silver)' }}>{p.peso_kg?`${p.peso_kg}kg`:'—'}</td>
                    <td style={{ padding:'7px 12px', color:'var(--silver)' }}>{p.estatura_cm?`${p.estatura_cm}cm`:'—'}</td>
                    <td style={{ padding:'7px 12px', color:'var(--silver)' }}>{p.pie_habil||'—'}</td>
                    <td style={{ padding:'7px 12px', color:'var(--silver)', fontSize:11 }}>{p.email||'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button className="hover-scale" onClick={()=>setStep('config')} className="btn-ghost" style={{ flex:1, fontSize:13 }}>← Volver</button>
            <button onClick={confirmar} disabled={saving||preview.length===0} className="btn-lime" style={{ flex:2, fontSize:13 }}>
              {saving?'Importando...': `✓ Confirmar e importar ${preview.length} jugador${preview.length!==1?'es':''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step==='done' && result && (
        <div style={{ textAlign:'center' }}>
          {result.ok ? (
            <>
              <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
              <p style={{ fontSize:18, fontWeight:700, color:'var(--lime)', marginBottom:8 }}>
                {result.saved} jugador{result.saved!==1?'es':''} importado{result.saved!==1?'s':''}
              </p>
              {result.failed>0 && (
                <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.2)', borderRadius:10, padding:14, marginBottom:16, textAlign:'left' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#f87171', marginBottom:6 }}>⚠️ {result.failed} no se pudieron importar:</p>
                  {result.failed_details?.map((e: string,i: number)=>(
                    <p key={i} style={{ fontSize:11, color:'#f87171', marginBottom:2 }}>• {e}</p>
                  ))}
                </div>
              )}
              <button onClick={onSuccess} className="btn-lime" style={{ fontSize:13, padding:'12px 32px', marginTop:8 }}>
                Ver plantel actualizado →
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize:40, marginBottom:12 }}>❌</div>
              <p style={{ fontSize:14, color:'#f87171', marginBottom:16 }}>{result.error||'Error al importar'}</p>
              <button className="hover-scale" onClick={()=>setStep('config')} className="btn-ghost" style={{ fontSize:13 }}>← Volver a intentar</button>
            </>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

function NewPlayerForm({ onSuccess, onCancel }) {
  const [f, setF] = useState({ nombre:'', usuario:'', password:'', posicion:'', nacionalidad:'', edad:'', peso_kg:'', estatura_cm:'', pie_habil:'Derecho', foto_url:'', email:'', fecha_nacimiento:'', hora_recordatorio:'08:00', peso_ideal_min:'', peso_ideal_max:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  async function submit(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,edad:f.edad?parseInt(f.edad):null,peso_kg:f.peso_kg?parseFloat(f.peso_kg):null,estatura_cm:f.estatura_cm?parseInt(f.estatura_cm):null,foto_url:f.foto_url||null,email:f.email||null,fecha_nacimiento:f.fecha_nacimiento||null,hora_recordatorio:f.hora_recordatorio||'08:00',peso_ideal_min:f.peso_ideal_min?parseFloat(f.peso_ideal_min):null,peso_ideal_max:f.peso_ideal_max?parseFloat(f.peso_ideal_max):null})})
      const d = await res.json()
      if (!res.ok) { setError(d.error||'Error'); return }
      onSuccess()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }
  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nuevo Jugador</p>
        <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          {[['nombre','Nombre completo','Juan Pérez',false],['usuario','Usuario','juan.perez',false],['password','Contraseña','Mín. 6 caracteres',true],['edad','Edad','22',false],['peso_kg','Peso (kg)','75.5',false],['estatura_cm','Estatura (cm)','178',false]].map(([k,lbl,ph,pw])=>(
            <div key={k}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{lbl}</label>
              <input className="wp-input" type={pw?'password':'text'} value={f[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} required={['nombre','usuario','password'].includes(k)} />
            </div>
          ))}
          <div style={{ gridColumn:'span 2' }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>Foto de perfil</label>
            <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', background:'var(--ink3)', border:`1px solid ${f.foto_url?'var(--lime)':'var(--fog)'}`, borderRadius:10, padding:'10px 14px', transition:'border-color .15s' }}>
              <div style={{ width:44, height:44, borderRadius:'50%', overflow:'hidden', background:'var(--mist)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {f.foto_url
                  ? <img src={f.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                  : <span style={{ fontSize:18 }}>📷</span>
                }
              </div>
              <div>
                <p style={{ fontSize:13, color: f.foto_url?'var(--lime)':'var(--silver)', fontWeight:500 }}>{f.foto_url ? 'Foto cargada ✓' : 'Tocar para cargar foto'}</p>
                <p style={{ fontSize:11, color:'var(--silver)', marginTop:2 }}>JPG, PNG o WEBP — desde la compu o celular</p>
              </div>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{
                const file=e.target.files?.[0]; if(!file) return
                const reader=new FileReader()
                reader.onload=async()=>{ const c=await compressImage(reader.result as string,400,0.8); set('foto_url',c) }
                reader.readAsDataURL(file)
              }}/>
            </label>
          </div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Posición</label><select className="wp-input" value={f.posicion} onChange={e=>set('posicion',e.target.value)} style={{ appearance:'none' }}><option value="" style={{ background:'var(--ink2)' }}>— Seleccionar —</option>{POSICIONES.map(v=><option key={v} value={v} style={{ background:'var(--ink2)' }}>{v}</option>)}</select></div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Pie hábil</label><select className="wp-input" value={f.pie_habil} onChange={e=>set('pie_habil',e.target.value)} style={{ appearance:'none' }}>{['Derecho','Izquierdo','Ambidiestro'].map(v=><option key={v} value={v} style={{ background:'var(--ink2)' }}>{v}</option>)}</select></div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Nacionalidad</label><NacionalidadSelect value={f.nacionalidad} onChange={v=>set('nacionalidad',v)} /></div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>📧 Email (para recordatorios)</label><input className="wp-input" type="email" value={f.email} onChange={e=>set('email',e.target.value)} placeholder="jugador@email.com" /></div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>🎂 Fecha de nacimiento</label><input className="wp-input" type="date" value={f.fecha_nacimiento} onChange={e=>set('fecha_nacimiento',e.target.value)} /></div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>⏰ Horario de recordatorio</label><select className="wp-input" value={f.hora_recordatorio} onChange={e=>set('hora_recordatorio',e.target.value)} style={{ appearance:'none' }}>{['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00'].map(h=><option key={h} value={h} style={{ background:'var(--ink2)' }}>{h}</option>)}</select></div>
          <div style={{ gridColumn:'span 2' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ width:3, height:12, borderRadius:2, background:'#f59e0b', display:'inline-block' }}/>
              ⚖️ Rango de peso ideal — provisto por nutricionista
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ gridColumn:'span 2', marginBottom:4 }}>
                <p style={{ fontSize:11, color:'#fbbf24', margin:0 }}>🥗 Estos valores deben ser provistos por la <strong>nutricionista</strong> — no los modifiques sin su indicación.</p>
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Peso mínimo ideal (kg)</label>
                <input className="wp-input" type="number" step="0.1" min="40" max="150" value={f.peso_ideal_min} onChange={e=>set('peso_ideal_min',e.target.value)} placeholder="ej: 72.0" />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Peso máximo ideal (kg)</label>
                <input className="wp-input" type="number" step="0.1" min="40" max="150" value={f.peso_ideal_max} onChange={e=>set('peso_ideal_max',e.target.value)} placeholder="ej: 76.0" />
              </div>
            </div>
          </div>
        </div>
        {error && <p style={{ fontSize:12, color:'#f87171', marginBottom:12 }}>{error}</p>}
        <div style={{ display:'flex', gap:12, marginTop:24 }}>
          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Creando...':'Crear jugador →'}</button>
          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
      </div>
    </div>
  )
}

function ManageRow({ player, last, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(player.foto_url||null)
  const [photoSaving, setPhotoSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editOk, setEditOk] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [currentPass, setCurrentPass] = useState(player.password_plain || null)
  // Sync password when player data refreshes (e.g. after saving a new password)
  useEffect(() => { setCurrentPass(player.password_plain || null) }, [player.password_plain])
  const [ef, setEf] = useState({
    nombre: player.nombre||'',
    posicion: player.posicion||'',
    edad: String(player.edad||''),
    peso_kg: String(player.peso_kg||''),
    estatura_cm: String(player.estatura_cm||''),
    pie_habil: player.pie_habil||'Derecho',
    email: player.email||'',
    fecha_nacimiento: player.fecha_nacimiento||'',
    hora_recordatorio: player.hora_recordatorio||'08:00',
    nueva_password: '',
    peso_ideal_min: String(player.peso_ideal_min||''),
    peso_ideal_max: String(player.peso_ideal_max||''),
    nacionalidad: player.nacionalidad||'',
  })
  const setE = (k,v) => setEf(p=>({...p,[k]:v}))

  async function toggle() {
    setLoading(true)
    await fetch(`/api/players/${player.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({activo:!player.activo})})
    onRefresh(); setLoading(false)
  }

  async function saveEdit() {
    setEditSaving(true); setEditError(''); setEditOk(false)
    try {
      const body: any = {
        nombre: ef.nombre.trim(),
        posicion: ef.posicion||null,
        edad: ef.edad ? Number(ef.edad) : null,
        peso_kg: ef.peso_kg ? Number(ef.peso_kg) : null,
        estatura_cm: ef.estatura_cm ? Number(ef.estatura_cm) : null,
        pie_habil: ef.pie_habil||null,
        email: ef.email||null,
        fecha_nacimiento: ef.fecha_nacimiento||null,
        hora_recordatorio: ef.hora_recordatorio||null,
        peso_ideal_min: ef.peso_ideal_min ? Number(ef.peso_ideal_min) : null,
        peso_ideal_max: ef.peso_ideal_max ? Number(ef.peso_ideal_max) : null,
        nacionalidad: ef.nacionalidad||null,
      }
      const newPwd = ef.nueva_password.trim()
      if (newPwd) { body.password = newPwd }
      const r = await fetch(`/api/players/${player.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      const d = await r.json()
      if (!r.ok) { setEditError(d.error||'Error al guardar'); return }
      if (newPwd) setCurrentPass(newPwd)
      setEditOk(true); setEditing(false); onRefresh()
    } catch { setEditError('Error de conexión') }
    finally { setEditSaving(false) }
  }

  return (
    <div style={{ borderBottom:last?'none':'1px solid var(--mist)' }}>
      <button className="hover-scale" onClick={()=>setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 20px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background .12s' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        <div style={{ width:40, height:40, borderRadius:'50%', overflow:'hidden', background:'var(--mist)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--silver)', border:'1px solid var(--fog)' }}>
          {photoUrl
            ? <img src={photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
            : player.nombre.split(' ').map(w=>w[0]).slice(0,2).join('')
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:500, fontSize:14, color:'var(--snow)' }}>{player.nombre}</div>
          <div style={{ fontSize:11, color:'var(--silver)', marginTop:1, display:'flex', alignItems:'center', gap:4 }}>{player.nacionalidad&&<><FlagImg country={player.nacionalidad} size={14} /><span style={{marginRight:2}}/></>}@{player.usuario} · {player.posicion||'—'}{player.lesion&&<span style={{ marginLeft:8, color:'#f87171' }}>🏥 Lesionado</span>}</div>
        </div>
        <StatusBadge status={player.acwr?.status} ratio={player.acwr?.ratio} />
        <span style={{ color:'var(--fog)', transition:'transform .2s', display:'inline-block', transform:open?'rotate(90deg)':'none' }}>›</span>
      </button>
      {open && (
        <div style={{ padding:'14px 20px 18px', background:'var(--ink3)', borderTop:'1px solid var(--mist)' }}>
          {!editing ? (
            <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
              {/* Photo */}
              <label style={{ cursor:'pointer', flexShrink:0 }}>
                <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'var(--mist)', border:`2px solid ${photoUrl?'var(--lime)':'var(--fog)'}`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'border-color .15s' }}>
                  {photoUrl ? <img src={photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : <span style={{ fontSize:22 }}>📷</span>}
                  {photoSaving && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white' }}>...</div>}
                </div>
                <p style={{ fontSize:9, color:photoUrl?'var(--lime)':'var(--silver)', textAlign:'center', marginTop:4 }}>{photoUrl?'Cambiar':'Cargar foto'}</p>
                <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={async e=>{
                  const file=e.target.files?.[0]; if(!file) return
                  setPhotoSaving(true)
                  const reader=new FileReader()
                  reader.onload=async()=>{
                    const dataUrl=reader.result as string
                    await fetch('/api/players/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jugador_id:player.jugador_id,foto_url:dataUrl})})
                    setPhotoUrl(dataUrl); setPhotoSaving(false)
                  }
                  reader.readAsDataURL(file)
                }}/>
              </label>
              {/* Info + actions */}
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontSize:12, color:'var(--silver)', display:'flex', flexWrap:'wrap', gap:10, marginBottom:12 }}>
                  {player.nacionalidad&&<FlagImg country={player.nacionalidad} size={18} />}
                  {player.edad&&<span>🎂 {player.edad} años</span>}
                  {player.peso_kg&&<span>⚖️ {player.peso_kg} kg</span>}
                  {player.estatura_cm&&<span>📏 {player.estatura_cm} cm</span>}
                  {player.pie_habil&&<span>⚽ Pie {player.pie_habil}</span>}
                  {player.fecha_nacimiento&&<span>📅 Nac: {player.fecha_nacimiento}</span>}
                  {player.email&&<span>📧 {player.email}</span>}
                  {player.hora_recordatorio&&<span>⏰ {player.hora_recordatorio}</span>}
                </div>
                {/* Password reveal */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'7px 10px', background:'var(--ink2)', borderRadius:7, border:'1px solid var(--mist)', maxWidth:280 }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>🔑</span>
                  <span style={{ flex:1, fontSize:12, fontFamily:'DM Mono,monospace', color: currentPass ? 'var(--lime)' : 'var(--fog)', letterSpacing: showPass ? '0.05em' : '0.18em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {currentPass ? (showPass ? currentPass : '••••••••') : '— cambiala para registrarla —'}
                  </span>
                  {currentPass && (
                    <button className="hover-scale" type="button" onClick={()=>setShowPass(v=>!v)}
                      style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:14, padding:'2px 4px', color:'var(--silver)', flexShrink:0 }}>
                      {showPass ? '🙈' : '👁'}
                    </button>
                  )}
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button className="hover-scale" onClick={()=>{ setEditing(true); setEditOk(false); setEditError('') }} className="btn-ghost" style={{ fontSize:12, padding:'7px 14px' }}>
                    ✏️ Editar datos
                  </button>
                  <button onClick={toggle} disabled={loading} className="btn-ghost" style={{ fontSize:12, padding:'7px 14px', color:player.activo?'#f87171':'#4ade80', borderColor:player.activo?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)' }}>
                    {loading?'...':player.activo?'Desactivar acceso':'Activar acceso'}
                  </button>
                  <button className="hover-scale" onClick={async () => {
                    if (confirm('🚨 ATENCIÓN 🚨\n\n¿Estás seguro de que querés ELIMINAR COMPLETAMENTE a este jugador y TODO su historial (sesiones, wellness, lesiones, etc.)?\n\nEsta acción NO se puede deshacer.')) {
                      setLoading(true);
                      await fetch(`/api/players/${player.id}`, { method: 'DELETE' });
                      onRefresh();
                      setLoading(false);
                    }
                  }} disabled={loading} className="btn-ghost" style={{ fontSize:12, padding:'7px 14px', color:'#ef4444', borderColor:'rgba(239,68,68,.3)' }}>
                    🗑️ Eliminar
                  </button>
                </div>
                {editOk && <p style={{ fontSize:11, color:'#4ade80', marginTop:8 }}>✓ Datos actualizados</p>}
              </div>
            </div>
          ) : (
            /* ── EDIT FORM ── */
            <div>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Editar jugador</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12, marginBottom:14 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Nombre completo</label>
                  <input className="wp-input" value={ef.nombre} onChange={e=>setE('nombre',e.target.value)} placeholder="Nombre Apellido" style={{ fontSize:14, fontWeight:600 }} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Nacionalidad</label>
                  <NacionalidadSelect value={ef.nacionalidad || ''} onChange={v=>setE('nacionalidad',v)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Posición</label>
                  <select className="wp-input" value={ef.posicion} onChange={e=>setE('posicion',e.target.value)} style={{ appearance:'none' }}>
                    <option value="" style={{ background:'var(--ink2)' }}>— Seleccionar —</option>
                    {POSICIONES.map(v=><option key={v} value={v} style={{ background:'var(--ink2)' }}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Pie hábil</label>
                  <select className="wp-input" value={ef.pie_habil} onChange={e=>setE('pie_habil',e.target.value)} style={{ appearance:'none' }}>
                    {['Derecho','Izquierdo','Ambidiestro'].map(v=><option key={v} value={v} style={{ background:'var(--ink2)' }}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Edad</label>
                  <input className="wp-input" type="number" value={ef.edad} onChange={e=>setE('edad',e.target.value)} placeholder="ej: 22" />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Peso (kg)</label>
                  <input className="wp-input" type="number" value={ef.peso_kg} onChange={e=>setE('peso_kg',e.target.value)} placeholder="ej: 75" />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Estatura (cm)</label>
                  <input className="wp-input" type="number" value={ef.estatura_cm} onChange={e=>setE('estatura_cm',e.target.value)} placeholder="ej: 178" />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Fecha de nacimiento</label>
                  <input className="wp-input" type="date" value={ef.fecha_nacimiento} onChange={e=>setE('fecha_nacimiento',e.target.value)} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>📧 Email</label>
                  <input className="wp-input" type="email" value={ef.email} onChange={e=>setE('email',e.target.value)} placeholder="jugador@email.com" />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>⏰ Horario recordatorio</label>
                  <select className="wp-input" value={ef.hora_recordatorio} onChange={e=>setE('hora_recordatorio',e.target.value)} style={{ appearance:'none' }}>
                    {['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00'].map(h=><option key={h} value={h} style={{ background:'var(--ink2)' }}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display:'block', fontSize:10, fontWeight:600, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>🔑 Nueva contraseña (opcional)</label>
                  <input className="wp-input" type="text" value={ef.nueva_password} onChange={e=>setE('nueva_password',e.target.value)} placeholder="Dejar vacío para no cambiar" autoComplete="off" />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <p style={{ fontSize:10, fontWeight:700, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <span style={{ width:3, height:12, borderRadius:2, background:'#f59e0b', display:'inline-block' }}/>
                    ⚖️ Rango de peso ideal — provisto por nutricionista
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, background:'rgba(245,158,11,.06)', border:'1px solid rgba(245,158,11,.2)', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ gridColumn:'span 2', marginBottom:4 }}>
                      <p style={{ fontSize:11, color:'#fbbf24', margin:0 }}>🥗 Estos valores deben ser provistos por la <strong>nutricionista</strong> — no los modifiques sin su indicación.</p>
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:10, fontWeight:600, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Peso mínimo ideal (kg)</label>
                      <input className="wp-input" type="number" step="0.1" min="40" max="150" value={ef.peso_ideal_min} onChange={e=>setE('peso_ideal_min',e.target.value)} placeholder="ej: 72.0" />
                    </div>
                    <div>
                      <label style={{ display:'block', fontSize:10, fontWeight:600, color:'#f59e0b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Peso máximo ideal (kg)</label>
                      <input className="wp-input" type="number" step="0.1" min="40" max="150" value={ef.peso_ideal_max} onChange={e=>setE('peso_ideal_max',e.target.value)} placeholder="ej: 76.0" />
                    </div>
                  </div>
                </div>
              </div>
              {editError && <p style={{ fontSize:12, color:'#f87171', marginBottom:10 }}>{editError}</p>}
              <div style={{ display:'flex', gap:10 }}>
                <button className="hover-scale" onClick={()=>setEditing(false)} className="btn-ghost" style={{ flex:1, fontSize:12 }}>Cancelar</button>
                <button onClick={saveEdit} disabled={editSaving||!ef.nombre.trim()} className="btn-lime" style={{ flex:1, fontSize:12 }}>
                  {editSaving ? 'Guardando...' : '✓ Guardar cambios'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ══ READINESS PANEL ══════════════════════════════════════════════════════════
function ReadinessPanel({ teamData }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [chartMode, setChartMode] = useState('wellness')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try { const r = await fetch('/api/readiness?weeks=4'); setData(await r.json()) }
    finally { setLoading(false) }
  }

  // Build scatter data: latest week per player
  const scatterData = data ? (() => {
    const wMap = {}
    for (const r of (data.wRows||[])) {
      if (!wMap[r.jugador_id] || r.semana > wMap[r.jugador_id].semana) wMap[r.jugador_id] = r
    }
    const rpeMap = {}
    for (const r of (data.rpeRows||[])) {
      if (!rpeMap[r.jugador_id] || r.semana > rpeMap[r.jugador_id].semana) rpeMap[r.jugador_id] = r
    }
    return Object.values(wMap).map(w => ({
      jugador_id: w.jugador_id,
      nombre: w.nombre,
      posicion: w.posicion,
      foto: w.foto_url,
      wellness: w.total_wellness,
      rpe: rpeMap[w.jugador_id]?.avg_rpe || 0,
      dolor: w.avg_dolor,
    }))
  })() : []

  // Today readiness table
  const today = data?.todayRows || []

  const readColor = (t) => !t ? '#555' : t<=12 ? '#c8f135' : t<=18 ? '#f59e0b' : '#ef4444'
  const readLabel = (t) => !t ? '—' : t<=12 ? 'LISTO' : t<=18 ? 'ATENCIÓN' : 'BAJAR CARGA'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <PanelHeader 
          icon={Icons.bateria} 
          title="READINESS" 
          subtitle="WELLNESS" 
          description="Bienestar y estado de carga del plantel"
          color="#a855f7" 
        />
      </div>

      {/* Today readiness table */}
      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Estado Hoy — Total Wellness (5–25)</p>
          <div style={{ display:'flex', gap:10, fontSize:10, color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>
            {[['#c8f135','5–12 Listo'],['#f59e0b','13–18 Atención'],['#ef4444','19–25 Bajar carga']].map(([c,l])=>(
              <span key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>
                {l}
              </span>
            ))}
          </div>
        </div>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
          : today.map((p, i) => {
            const t = p.total_wellness ? Number(p.total_wellness) : null
            const col = readColor(t)
            const responded = t !== null
            const WK2 = ['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo']
            return (
              <div key={p.jugador_id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 18px', borderBottom:i<today.length-1?'1px solid var(--mist)':'none' }}>
                {/* Photo/avatar */}
                <div style={{ width:32, height:32, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:'var(--ink3)', border:'1px solid var(--fog)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {p.foto_url
                    ? <img src={p.foto_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                    : <span style={{ fontSize:11, fontWeight:700, color:'var(--silver)' }}>{(p.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2)}</span>
                  }
                </div>
                {/* Name */}
                <div style={{ minWidth:140, overflow:'hidden' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'var(--snow)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</div>
                  <div style={{ fontSize:10, color:'var(--silver)' }}>{p.posicion||'—'}</div>
                </div>
                {/* Individual scores */}
                {responded ? (
                  <div style={{ flex:1, display:'flex', gap:6 }}>
                    {WK2.map(k => {
                      const v = Number(p[k])||0
                      const wc = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444'][v-1]||'#555'
                      return (
                        <div key={k} style={{ flex:1, textAlign:'center', background:`${wc}15`, borderRadius:6, padding:'4px 2px', border:`1px solid ${wc}33` }}>
                          <div style={{ fontSize:14, fontFamily:'DM Mono,monospace', fontWeight:700, color:wc }}>{v}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ flex:1, textAlign:'center', color:'var(--fog)', fontSize:12 }}>— Sin wellness hoy —</div>
                )}
                {/* Total */}
                <div style={{ textAlign:'right', minWidth:80 }}>
                  {t!==null ? (
                    <>
                      <div className="mono" style={{ fontSize:18, fontWeight:700, color:col }}>{t}</div>
                      <div style={{ fontSize:9, color:col, fontFamily:'DM Mono,monospace', letterSpacing:'0.05em' }}>{readLabel(t)}</div>
                    </>
                  ) : (
                    <span style={{ fontSize:11, color:'#ef4444' }}>⚠ pendiente</span>
                  )}
                </div>
                {/* Injury / diff */}
                {p.dolor_zona && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }} title={`EVA: ${p.dolor_eva||'—'}${p.dolor_descripcion ? ' · ' + p.dolor_descripcion : ''}`}>📍 {p.dolor_zona}</span>}
              </div>
            )
          })
        }
      </div>

      {/* Scatter plots */}
      {scatterData.length>0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Adaptación Semanal — Scatter Plot</p>
            <div style={{ display:'flex', gap:6 }}>
              {[['wellness','RPE vs Wellness'],['dolor','RPE vs Dolor']].map(([m,l])=>(
                <button className="hover-scale" key={m} type="button" onClick={()=>setChartMode(m)} style={{ fontSize:11, padding:'5px 12px', borderRadius:8, cursor:'pointer', border:chartMode===m?'2px solid var(--lime)':'1px solid var(--fog)', background:chartMode===m?'rgba(200,241,53,.1)':'var(--ink3)', color:chartMode===m?'var(--lime)':'var(--silver)' }}>{l}</button>
              ))}
            </div>
          </div>
          <ReadinessChart data={scatterData} mode={chartMode} />
          <p style={{ fontSize:10, color:'var(--silver)', textAlign:'center', marginTop:8 }}>
            {chartMode==='wellness' ? 'Zona verde = RPE alto + Wellness bajo (riesgo de sobreentrenamiento)' : 'Zona roja = RPE alto + Dolor alto (riesgo de lesión)'}
          </p>
        </div>
      )}
    </div>
  )
}

// ══ ACUM M1 PANEL ════════════════════════════════════════════════════════════
// ── Gráfico de barras para Acumulativo Indiv ──────────────────────────────────
function AcumBarChart({ players, vars, accentColor = '#c8f135' }: { players: any[], vars: {key:string,label:string,color:string}[], accentColor?: string }) {
  const [selKey, setSelKey] = useState(vars[0]?.key || '')
  const selVar = vars.find(v => v.key === selKey) || vars[0]
  if (!selVar) return null

  const data = players
    .map((p: any) => ({ nombre: (p.nombre || '').split(' ')[0], val: Number(p[selVar.key]) || 0 }))
    .filter(d => d.val > 0)
    .sort((a, b) => b.val - a.val)

  const maxVal = Math.max(...data.map(d => d.val), 1)
  const BAR_H = 140
  const TOP_PAD = 24
  const BOT_PAD = 44

  return (
    <div style={{ padding:'14px 16px', borderTop:'1px solid var(--mist)' }}>
      {/* Selector de métrica */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
        {vars.map(v => (
          <button className="hover-scale" key={v.key} onClick={() => setSelKey(v.key)}
            style={{ fontSize:10, padding:'4px 10px', borderRadius:6, cursor:'pointer', border: selKey === v.key ? `2px solid ${v.color}` : '1px solid var(--mist)',
              background: selKey === v.key ? `${v.color}18` : 'var(--ink3)',
              color: selKey === v.key ? v.color : 'var(--fog)',
              fontWeight: selKey === v.key ? 700 : 400 }}>
            {v.label}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div style={{ padding:'12px 0', textAlign:'center', color:'var(--fog)', fontSize:11 }}>Sin datos para esta métrica</div>
      ) : (
        <div style={{ display:'flex', gap:0 }}>
          {/* Y-axis */}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between',
            paddingRight:8, width:38, flexShrink:0, height:BAR_H, marginTop:TOP_PAD, marginBottom:BOT_PAD }}>
            {[1,0.75,0.5,0.25,0].map((f,i) => (
              <div key={i} style={{ fontSize:8, color:'var(--fog)', fontFamily:'DM Mono,monospace', textAlign:'right', lineHeight:1 }}>
                {Math.round(maxVal * f)}
              </div>
            ))}
          </div>
          {/* Barras */}
          <div style={{ flex:1, overflowX:'auto', overflowY:'visible' }}>
            <div style={{ position:'relative', minWidth: data.length * 60 }}>
              {/* Grid lines */}
              {[0,25,50,75,100].map((p,i) => (
                <div key={i} style={{ position:'absolute', left:0, right:0, top: TOP_PAD + ((100-p)/100)*BAR_H, borderTop:'1px solid rgba(255,255,255,.05)', pointerEvents:'none' }}/>
              ))}
              {/* Bar area */}
              <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:TOP_PAD+BAR_H, paddingTop:TOP_PAD }}>
                {data.map((d, i) => {
                  const barH = Math.max((d.val/maxVal)*BAR_H, 4)
                  const showInside = barH > 28
                  return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', minWidth:52, justifyContent:'flex-end' }}>
                    {!showInside && <div style={{ fontSize:11, color:selVar.color, fontFamily:'DM Mono,monospace', fontWeight:800, marginBottom:3, whiteSpace:'nowrap' }}>{d.val}</div>}
                    <div className="anim-bar-v" style={{ width:'55%', minWidth:20, maxWidth:48, borderRadius:'5px 5px 0 0',
                      height:`${barH}px`, position:'relative',
                      background: selVar.color, flexShrink:0, opacity:1,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      {showInside && (
                        <span style={{ fontSize:10, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:800,
                          textShadow:'0 1px 3px rgba(0,0,0,.6)', whiteSpace:'nowrap', userSelect:'none' }}>
                          {d.val}
                        </span>
                      )}
                    </div>
                  </div>
                )})}
              </div>
              {/* X-axis labels — below the axis line */}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                {data.map((d, i) => (
                  <div key={i} style={{ flex:1, minWidth:52, fontSize:9, color:'var(--snow)', fontWeight:600, textAlign:'center', wordBreak:'break-word', lineHeight:1.2 }}>{d.nombre}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AcumPanel({ teamData }) {
  const [miciData, setMiciData] = useState<any>(null)
  const [miciLoading, setMiciLoading] = useState(false)
  const today = todayLocal()
  const [miciNum, setMiciNum] = useState(1)

  // miciNum 1 = this week (offset 0), 2 = last week (offset -1), etc.
  const getMiciOffset = (num: number) => -(num - 1)

  const mondayShiftMici = new Date().getDay() === 1 ? -7 : 0
  const getMiciStart = (num: number) => {
    const offset = getMiciOffset(num)
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + offset * 7 + mondayShiftMici)
    return localDateStr(d)
  }
  const getMiciEnd = (num: number) => {
    const offset = getMiciOffset(num)
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 7 + offset * 7 + mondayShiftMici)
    return localDateStr(d)
  }

  const [miciDesde, setMiciDesde] = useState(() => getMiciStart(1))
  const [miciHasta, setMiciHasta] = useState(today)

  useEffect(() => {
    setMiciDesde(getMiciStart(miciNum))
    setMiciHasta(miciNum === 1 ? today : getMiciEnd(miciNum))
  }, [miciNum])

  useEffect(() => { loadMici() }, [miciDesde, miciHasta])

  async function loadMici() {
    setMiciLoading(true)
    try { const r = await fetch(`/api/carga-gps?desde=${miciDesde}&hasta=${miciHasta}&ciclo=microciclo`); setMiciData(await r.json()) }
    catch(e){} finally { setMiciLoading(false) }
  }

  const MICI_VARS = [
    {key:'ua_total',   label:'UA',              color:'#60a5fa'},
    {key:'minActivo',  label:'Tiempo (min)',    color:'#34d399'},
    {key:'distTotal',  label:'DT (m)',          color:'#f59e0b'},
    {key:'distSprint', label:'Dist. Sprint (m)',color:'#f97316'},
    {key:'nSprints',   label:'Nº Sprints',      color:'#a78bfa'},
    {key:'nAcel',      label:'Ace >2 (m)',      color:'#ec4899'},
    {key:'nDecel',     label:'Dec >2 (m)',      color:'#14b8a6'},
    {key:'nAcel3',     label:'ACE >3 (n)',      color:'#f43f5e'},
    {key:'nDecel3',    label:'DEC >3 (n)',      color:'#0ea5e9'},
    {key:'distMP',     label:'Alta Pot.',       color:'#fbbf24'},
  ]

  const miciPlayers: any[] = miciData?.players || []
  const miciTeamAvg = miciData?.teamAvg || {}
  const miciPerSession: Record<string,any> = miciData?.perSession || {}
  const miciPerSessionPlayers: Record<string,any[]> = miciData?.perSessionPlayers || {}
  const miciSesionesInfo: any[] = miciData?.sesionesInfo || []
  const miciExistingMds = new Set(miciSesionesInfo.map((s:any) => s.titulo))
  // Training MDs only (exclude 'MD' = partido)
  const miciTrainingMds = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1'].filter(md => miciExistingMds.has(md))

  // Calc GPS vars: same for all players (from session plan), summed across training MDs only
  const getMiciSessionVal = (vk: string) =>
    miciTrainingMds.reduce((sum, md) => sum + (Number(miciPerSession[md]?.[vk]) || 0), 0)

  // RPE/UA/minActivo: real per-player log data
  const getMiciPlayerRpeVal = (jugador_id: number, vk: string) =>
    miciTrainingMds.reduce((sum, md) => {
      const pData = (miciPerSessionPlayers[md] || []).find((x:any) => x.jugador_id === jugador_id)
      return sum + (Number(pData?.[vk]) || 0)
    }, 0)

  // Team avg for RPE vars
  const getMiciTeamRpeVal = (vk: string) => {
    const vals = miciPlayers.map((p:any) => Number(p[vk])||0).filter(x=>x>0)
    return vals.length ? Math.round(vals.reduce((s,x)=>s+x,0)/vals.length*10)/10 : 0
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ══ ACUMULATIVO MICROCICLO ═══════════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.25)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'var(--snow)', letterSpacing:'0.04em' }}>
                ACUMULATIVO MICROCICLO {miciNum}
              </h2>
              <div style={{ display:'flex', gap:4 }}>
                <button className="hover-scale" onClick={()=>setMiciNum(n=>Math.max(1,n-1))} disabled={miciNum<=1}
                  style={{ width:28, height:28, borderRadius:6, background:'var(--ink3)', border:'1px solid var(--mist)', color: miciNum<=1?'var(--fog)':'var(--silver)', cursor:miciNum<=1?'default':'pointer', fontSize:14, fontWeight:700 }}>−</button>
                <button className="hover-scale" onClick={()=>setMiciNum(n=>n+1)}
                  style={{ width:28, height:28, borderRadius:6, background:'var(--ink3)', border:'1px solid var(--mist)', color:'var(--silver)', cursor:'pointer', fontSize:14, fontWeight:700 }}>+</button>
              </div>
            </div>
            <p style={{ fontSize:11, color:'var(--lime)', fontFamily:'DM Mono,monospace', marginTop:2 }}>
              {miciDesde} → {miciHasta}
            </p>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap' }}>
            <div>
              <label style={{ fontSize:9, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Desde</label>
              <input className="wp-input" type="date" value={miciDesde} onChange={e=>setMiciDesde(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize:9, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Hasta</label>
              <input className="wp-input" type="date" value={miciHasta} onChange={e=>setMiciHasta(e.target.value)} />
            </div>
            <button className="hover-scale" onClick={()=>{
              const win = window.open('', '_blank'); if (!win) return

            // SVG bar chart builder (portrait-friendly, pure HTML)
            const mkBars = (items: {name:string, val:number, sub?:string}[], bars: {key:string,label:string,color:string}[], lineKey?: string, lineColor?: string) => {
              if (!items.length) return '<p style="color:#aaa;font-size:10px;text-align:center;padding:8px">Sin datos</p>'
              const BAR_H = 200, TOP = 24, BOT = 48, COL_W = Math.max(Math.floor(800/items.length), 60)
              const W = items.length * COL_W
              const allVals = items.flatMap(it => bars.map(b => Number((it as any)[b.key])||0))
              const maxBar = Math.max(...allVals, 1)
              const lineVals = lineKey ? items.map(it => Number((it as any)[lineKey])||0) : []
              const maxLine = Math.max(...lineVals.filter(v=>v>0), 1)
              let svg = `<svg viewBox="0 0 ${W} ${TOP+BAR_H+BOT}" width="100%" style="overflow:visible;display:block;">`
              // grid lines
              ;[0,25,50,75,100].forEach(p => {
                const y = TOP + BAR_H - (p/100)*BAR_H
                svg += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>`
              })
              // bars
              items.forEach((it, pi) => {
                const x0 = pi * COL_W + 2
                const bw = Math.max((COL_W - 4) / bars.length - 1, 6)
                bars.forEach((b, bi) => {
                  const val = Number((it as any)[b.key])||0
                  const h = val > 0 ? Math.max((val/maxBar)*BAR_H, 4) : 0
                  const bx = x0 + bi*(bw+1)
                  const by = TOP + BAR_H - h
                  svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" fill="${b.color}" rx="2"/>`
                  if (val > 0) {
                    if (h > 16) svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by+h/2+3).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" transform="rotate(-90,${(bx+bw/2).toFixed(1)},${(by+h/2).toFixed(1)})">${val}</text>`
                    else svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by-2).toFixed(1)}" text-anchor="middle" fill="${b.color}" font-size="7" font-weight="700">${val}</text>`
                  }
                })
                // x label
                const cx = x0 + (COL_W-4)/2
                svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+12).toFixed(1)}" text-anchor="middle" fill="#333" font-size="8" font-weight="600">${it.name}</text>`
                if (it.sub) svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+22).toFixed(1)}" text-anchor="middle" fill="#888" font-size="7">${it.sub}</text>`
              })
              // line overlay
              if (lineKey && lineVals.some(v=>v>0)) {
                const pts = items.map((it,pi) => {
                  const val = Number((it as any)[lineKey])||0
                  const cx = pi*COL_W + 2 + (COL_W-4)/2
                  const cy = val > 0 ? TOP + BAR_H - (val/maxLine)*BAR_H*0.85 : null
                  return {cx, cy, val}
                }).filter(pt => pt.cy !== null)
                if (pts.length > 1) svg += `<polyline points="${pts.map(p=>`${p.cx.toFixed(1)},${p.cy!.toFixed(1)}`).join(' ')}" fill="none" stroke="${lineColor||'#34d399'}" stroke-width="1.5" stroke-dasharray="4,2"/>`
                pts.forEach(pt => {
                  svg += `<circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy!.toFixed(1)}" r="3" fill="${lineColor||'#34d399'}" stroke="#fff" stroke-width="1"/>`
                  svg += `<text x="${pt.cx.toFixed(1)}" y="${(pt.cy!-5).toFixed(1)}" text-anchor="middle" fill="${lineColor||'#34d399'}" font-size="7" font-weight="700">${pt.val}</text>`
                })
              }
              svg += '</svg>'
              return svg
            }
            const mkChartBlock = (title: string, color: string, svgHtml: string, legendItems: {label:string,color:string}[]) => `
              <div style="border:1px solid ${color}30;border-radius:8px;padding:10px;page-break-inside:avoid;">
                <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.06em;text-align:center;padding-bottom:5px;border-bottom:1px solid ${color}20;margin-bottom:6px;">${title}</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                  ${legendItems.map(l=>`<span style="display:flex;align-items:center;gap:3px;font-size:8px;color:#555;"><span style="width:8px;height:8px;border-radius:2px;background:${l.color};display:inline-block;"></span>${l.label}</span>`).join('')}
                </div>
                ${svgHtml}
              </div>`

              const thS = (c: string) => `padding:4px 8px;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};white-space:nowrap;background:#f8fafc;`
              const tdS = (c: string, b=false) => `padding:5px 8px;text-align:center;font-family:monospace;font-size:10px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;`
              const thL = (c: string) => `padding:4px 12px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};background:#f8fafc;`
              const tdL = (c: string, b=false) => `padding:5px 12px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;font-size:10px;`

              const allMDs = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1']
              const activeMDs = allMDs.filter(md => miciExistingMds.has(md))
              const RPE_VARS = [{key:'rpe',label:'RPE',color:'#c8f135'},{key:'ua_total',label:'UA',color:'#60a5fa'},{key:'minActivo',label:'Min',color:'#34d399'}]

              // Table RPE/UA/Min
              const t1 = `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <thead><tr>
                  <th style="${thL('#555')}">Jugador</th>
                  ${activeMDs.map(md=>`<th style="${thS('#c8f135')}" colspan="3">${md}</th>`).join('')}
                  <th style="${thS('#60a5fa')}" colspan="3">TOTAL</th>
                </tr><tr>
                  <th style="${thL('#555')}"></th>
                  ${activeMDs.map(()=>RPE_VARS.map(v=>`<th style="${thS(v.color)}">${v.label}</th>`).join('')).join('')}
                  ${RPE_VARS.map(v=>`<th style="${thS(v.color)}">${v.label}</th>`).join('')}
                </tr></thead><tbody>
                ${miciPlayers.map((p:any,i:number)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                  <td style="${tdL('#111',true)}">${p.nombre}</td>
                  ${activeMDs.map(md=>{const s=(miciPerSessionPlayers[md]||[]).find((x:any)=>x.jugador_id===p.jugador_id);return RPE_VARS.map(v=>{const val=Number(s?.[v.key])||0;return`<td style="${tdS(val?v.color:'#ccc',!!val)}">${val||'—'}</td>`}).join('')}).join('')}
                  ${RPE_VARS.map(v=>{const val=Number(p[v.key])||0;return`<td style="${tdS(val?v.color:'#ccc',!!val)}">${val||'—'}</td>`}).join('')}
                </tr>`).join('')}
                <tr style="background:#eff6ff;border-top:2px solid #93c5fd;">
                  <td style="${tdL('#1d4ed8',true)} font-size:9px;">PROM. EQUIPO</td>
                  ${activeMDs.map(md=>{const avg=miciPerSession[md]||{};return RPE_VARS.map(v=>{const val=Number(avg[v.key])||0;return`<td style="${tdS(val?v.color:'#ccc',!!val)}">${val||'—'}</td>`}).join('')}).join('')}
                  ${RPE_VARS.map(v=>{const val=getMiciTeamRpeVal(v.key);return`<td style="${tdS(val?v.color:'#ccc',!!val)}">${val||'—'}</td>`}).join('')}
                </tr></tbody>
              </table>`

              // Table GPS calculado
              const t2 = `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                <thead><tr>
                  <th style="${thL('#555')}">Métrica</th>
                  ${activeMDs.map(md=>`<th style="${thS('#f59e0b')}">${md}</th>`).join('')}
                  <th style="${thS('#059669')}">Total</th>
                </tr></thead><tbody>
                ${MICI_VARS.map((v:any,i:number)=>{
                  const vals=activeMDs.map(md=>Number(miciPerSession[md]?.[v.key])||0)
                  const tot=vals.reduce((s:number,x:number)=>s+x,0)
                  return`<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                    <td style="${tdL(v.color,true)}">${v.label}</td>
                    ${vals.map(val=>`<td style="${tdS(val?v.color:'#ccc',!!val)}">${val||'—'}</td>`).join('')}
                    <td style="${tdS('#059669',tot>0)}">${tot||'—'}</td>
                  </tr>`
                }).join('')}
                </tbody>
              </table>`

              // Charts: UA por jugador + GPS por MD
              const playerItems = miciPlayers.map((p:any) => ({ name: p.nombre.split(' ')[0], sub: p.posicion, ua_total: Number(p.ua_total)||0, rpe: Number(p.rpe)||0, minActivo: Number(p.minActivo)||0 }))
              const mdItems = activeMDs.map(md => { const s=miciPerSession[md]||{}; return { name: md, ...Object.fromEntries(MICI_VARS.map((v:any)=>[v.key,Number(s[v.key])||0])) } })

              const charts1 = [
                mkChartBlock('UA por Jugador','#60a5fa', mkBars(playerItems as any,[{key:'ua_total',label:'UA',color:'#60a5fa'}]),[{label:'UA',color:'#60a5fa'}]),
                mkChartBlock('RPE por Jugador','#c8f135', mkBars(playerItems as any,[{key:'rpe',label:'RPE',color:'#c8f135'}]),[{label:'RPE',color:'#c8f135'}]),
                mkChartBlock('Minutos por Jugador','#34d399', mkBars(playerItems as any,[{key:'minActivo',label:'Min',color:'#34d399'}]),[{label:'Minutos',color:'#34d399'}]),
              ].join('')

              const charts2 = MICI_VARS.map((v:any) => {
                const hasData = mdItems.some((it:any) => it[v.key] > 0)
                if (!hasData) return ''
                return mkChartBlock(v.label+' por MD', v.color, mkBars(mdItems as any,[{key:v.key,label:v.label,color:v.color}]),[{label:v.label,color:v.color}])
              }).join('')

              const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>W&P Acumulativo ${miciDesde} – ${miciHasta}</title>
                <style>body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:12px;font-size:10px;}
              h2{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;padding-bottom:5px;}
              .sec{margin-bottom:20px;}.pb{page-break-before:always;}
              .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
              .grid3{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
              @media print{@page{size:A4 landscape;margin:.8cm;}body{padding:0;}.np{display:none;}.pb{page-break-before:always;}.grid3{grid-template-columns:1fr 1fr;}}</style></head><body>
                <div class="np" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;">
                <button className="hover-scale" onClick={() => window.print()} className="btn-ghost-blue" style={{ padding: "8px 20px" }}>🖨️ Imprimir / Guardar PDF</button>
                <span style="font-size:11px;color:#666;">Orientación: Horizontal (Landscape)</span>
              </div>
                <div style="background:#0f172a;color:#c8f135;padding:8px 16px;border-radius:6px;margin-bottom:12px;display:flex;justify-content:space-between;">
                  <b style="font-size:13px;">W&P — ACUMULATIVO MICROCICLO ${miciNum}</b>
                  <span style="font-size:10px;color:#94a3b8;">${miciDesde} → ${miciHasta}</span>
                </div>
                <div class="sec">
                  <h2 style="color:#60a5fa;border-bottom:2px solid #93c5fd;">RPE · UA · MINUTOS POR JUGADOR Y MD</h2>
                  ${t1}
                </div>
                <div class="sec pb">
                  <h2 style="color:#f59e0b;border-bottom:2px solid #fde68a;">CARGA GPS CALCULADA POR SESIÓN</h2>
                  ${t2}
                </div>
                <div class="sec pb">
                  <h2 style="color:#60a5fa;border-bottom:2px solid #93c5fd;">📊 GRÁFICOS POR JUGADOR</h2>
                  <div class="grid3">${charts1}</div>
                </div>
                <div class="sec pb">
                  <h2 style="color:#f59e0b;border-bottom:2px solid #fde68a;">📊 GRÁFICOS CARGA GPS POR MD</h2>
                  <div class="grid3">${charts2}</div>
                </div>
              </body></html>`
              win.document.write(html); win.document.close()
            }} className="btn-ghost-lime">🖨️ PDF</button>
          </div>
        </div>
        {miciLoading ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
        ) : !miciPlayers.length ? (
          <div style={{ padding:32, textAlign:'center', color:'var(--silver)', fontSize:12 }}>Sin datos para este período. Registrá sesiones con RPE en el Calendario.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(200,241,53,.04)' }}>
                  <th style={{ padding:'8px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Jugador</th>
                  <th style={{ padding:'8px 8px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Pos.</th>
                  {MICI_VARS.map(v=>(
                    <th key={v.key} style={{ padding:'8px 8px', textAlign:'center', color:v.color, fontSize:9, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>{v.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {miciPlayers.map((p:any,i:number)=>{
                  const RPE_KEYS = new Set(['ua_total','minActivo'])
                  return (
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'8px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                      <td style={{ padding:'8px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                      {MICI_VARS.map(v=>{
                        // RPE/UA/tiempo: real per-player data. Calc GPS vars: same for everyone (session plan)
                        const val = RPE_KEYS.has(v.key)
                          ? getMiciPlayerRpeVal(p.jugador_id, v.key)
                          : getMiciSessionVal(v.key)
                        return (
                          <td key={v.key} style={{ padding:'8px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:val?v.color:'var(--fog)' }}>
                            {val||'—'}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                <tr style={{ borderTop:'2px solid rgba(200,241,53,.4)', background:'rgba(200,241,53,.04)' }}>
                  <td style={{ padding:'8px 14px', fontWeight:800, color:'var(--lime)', fontSize:10, textTransform:'uppercase' }}>PROM. EQUIPO</td>
                  <td/>
                  {MICI_VARS.map(v=>{
                    const RPE_KEYS = new Set(['ua_total','minActivo'])
                    const val = RPE_KEYS.has(v.key)
                      ? getMiciTeamRpeVal(v.key)
                      : getMiciSessionVal(v.key)
                    return (
                      <td key={v.key} style={{ padding:'8px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'var(--lime)' }}>
                        {Math.round(Number(val)*10)/10||'—'}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {/* ── Gráfico por métrica ── */}
        {!miciLoading && miciPlayers.length > 0 && <AcumBarChart players={miciPlayers} vars={MICI_VARS} />}
      </div>
      {(() => {
        const gpsReal: any[] = miciData?.gpsReal || []
        const GPS_ACC_VARS = [
          {key:'dist_total',   label:'Tot Dist (m)',   color:'#60a5fa'},
          {key:'dist_hir',     label:'High Speed (m)', color:'#f59e0b'},
          {key:'dist_v4',      label:'Vel B4 (m)',     color:'#a78bfa'},
          {key:'dist_v5',      label:'Vel B6 (m)',     color:'#f97316'},
          {key:'n_sprints',    label:'Nº Sprints',     color:'#ec4899'},
          {key:'max_velocity', label:'Vel Máx (km/h)', color:'#ef4444'},
          {key:'dist_per_min', label:'Mts/min',        color:'#34d399'},
          {key:'acc2',         label:'ACC B2-3',       color:'#8b5cf6'},
          {key:'dec2',         label:'DEC B2-3',       color:'#06b6d4'},
        ]
        const nGps = gpsReal.length || 1
        const teamAvgGps: Record<string,number> = {}
        GPS_ACC_VARS.forEach(v => {
          const vals = gpsReal.map((p:any)=>Number(p[v.key])||0).filter(x=>x>0)
          if (vals.length) teamAvgGps[v.key] = v.key === 'max_velocity' || v.key === 'dist_per_min'
            ? Math.round(vals.reduce((s,x)=>s+x,0)/vals.length*10)/10
            : Math.round(vals.reduce((s,x)=>s+x,0)/nGps)
        })
        return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(96,165,250,.25)', borderRadius:16, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <div>
                <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:28, color:'var(--snow)', letterSpacing:'0.04em' }}>
                  📡 ACUMULATIVO GPS
                </h2>
                <p style={{ fontSize:11, color:'#60a5fa', fontFamily:'DM Mono,monospace', marginTop:2 }}>
                  Datos reales importados desde Catapult · {miciDesde} → {miciHasta}
                </p>
              </div>
            </div>
            {miciLoading ? (
              <div style={{ padding:32, textAlign:'center', color:'var(--silver)' }}>Cargando GPS...</div>
            ) : !gpsReal.length ? (
              <div style={{ padding:32, textAlign:'center', color:'var(--silver)', fontSize:12 }}>
                Sin datos GPS importados para este período. Importá archivos desde la pestaña 📡 GPS.
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr style={{ background:'rgba(96,165,250,.04)' }}>
                      <th style={{ padding:'8px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Jugador</th>
                      <th style={{ padding:'8px 8px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Pos.</th>
                      <th style={{ padding:'8px 8px', textAlign:'center', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Ses.</th>
                      {GPS_ACC_VARS.map(v=>(
                        <th key={v.key} style={{ padding:'8px 8px', textAlign:'center', color:v.color, fontSize:9, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>{v.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gpsReal.map((p:any,i:number)=>(
                      <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                        <td style={{ padding:'8px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                        <td style={{ padding:'8px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                        <td style={{ padding:'8px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'var(--silver)' }}>{p.sesiones_gps||1}</td>
                        {GPS_ACC_VARS.map(v=>{
                          const val = p[v.key]
                          const hasVal = val !== null && val !== undefined && Number(val) !== 0
                          return (
                            <td key={v.key} style={{ padding:'8px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:hasVal?v.color:'var(--fog)', fontWeight:hasVal?600:400 }}>
                              {hasVal ? val : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    <tr style={{ borderTop:'2px solid rgba(96,165,250,.4)', background:'rgba(96,165,250,.04)' }}>
                      <td style={{ padding:'8px 14px', fontWeight:800, color:'#60a5fa', fontSize:10, textTransform:'uppercase' }}>PROM. EQUIPO</td>
                      <td/><td/>
                      {GPS_ACC_VARS.map(v=>(
                        <td key={v.key} style={{ padding:'8px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#60a5fa' }}>
                          {teamAvgGps[v.key]||'—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {/* ── Gráfico por métrica GPS ── */}
            {!miciLoading && gpsReal.length > 0 && <AcumBarChart players={gpsReal} vars={GPS_ACC_VARS} accentColor="#60a5fa" />}
          </div>
        )
      })()}

      {/* Photo upload section */}
      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Fotos de Perfil</p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
          {teamData.map(p => <PhotoUploader key={p.jugador_id} player={p} />)}
        </div>
      </div>
    </div>
  )
}

// ── Photo Uploader ─────────────────────────────────────────────────────────
function PhotoUploader({ player }) {
  const [foto, setFoto] = useState(player.foto_url||null)
  const [saving, setSaving] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result
      setSaving(true)
      await fetch('/api/players/photo', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ jugador_id:player.jugador_id, foto_url:dataUrl }) })
      setFoto(dataUrl as string)
      setSaving(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ textAlign:'center', width:72 }}>
      <label style={{ cursor:'pointer', display:'block' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', overflow:'hidden', background:'var(--ink3)', border:`1px solid ${foto?'var(--lime)':'var(--fog)'}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 6px', transition:'border-color .15s', position:'relative' }}>
          {foto ? <img src={foto} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/> : <span style={{ fontSize:14, fontWeight:700, color:'var(--silver)' }}>{player.nombre.split(' ').map(w=>w[0]).join('').slice(0,2)}</span>}
          {saving && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'white' }}>...</div>}
        </div>
        <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleFile}/>
      </label>
      <p style={{ fontSize:9, color:'var(--silver)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:72 }}>{player.nombre.split(' ')[0]}</p>
    </div>
  )
}

function CoachEmailSettings() {
  const [email, setEmail] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState<string|null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(()=>{
    fetch('/api/admin/settings').then(r=>r.json()).then(d=>{ setEmail(d.email||''); setLoaded(true) })
  },[])

  async function save() {
    setSaving(true)
    await fetch('/api/admin/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email }) })
    setSaved(true); setSaving(false); setTimeout(()=>setSaved(false), 2000)
  }

  async function testEmail(type: string) {
    setTesting(type); setTestResult(null)
    try {
      const r = await fetch(`/api/notifications/test?type=${type}`)
      const d = await r.json()
      setTestResult(d)
    } catch(e) { setTestResult({ error: String(e) }) }
    finally { setTesting(null) }
  }

  if (!loaded) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:18 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
          🎂 Tu email para alertas de cumpleaños
        </p>
        <div style={{ display:'flex', gap:10 }}>
          <input className="wp-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="coach@email.com" style={{ flex:1 }} />
          <button onClick={save} disabled={saving} className="btn-lime" style={{ padding:'10px 18px', fontSize:13, flexShrink:0 }}>
            {saved ? '✓' : saving ? '...' : 'Guardar'}
          </button>
        </div>
        <p style={{ fontSize:11, color:'var(--fog)', marginTop:8 }}>Te llegará un email cada vez que un jugador cumpla años.</p>
      </div>

      <div style={{ background:'rgba(96,165,250,.06)', border:'1px solid rgba(96,165,250,.2)', borderRadius:14, padding:18 }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          🧪 Probar envío de emails
        </p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="hover-scale" onClick={()=>testEmail('reminder')} disabled={!!testing} className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }}>
            {testing==='reminder' ? 'Enviando...' : '📋 Probar recordatorio'}
          </button>
          <button className="hover-scale" onClick={()=>testEmail('birthday')} disabled={!!testing} className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }}>
            {testing==='birthday' ? 'Enviando...' : '🎂 Probar cumpleaños'}
          </button>
        </div>
        {testResult && (
          <div style={{ marginTop:12, background:'var(--ink3)', borderRadius:8, padding:10, fontSize:11, fontFamily:'DM Mono,monospace' }}>
            <div style={{ marginBottom:6 }}>
              <span style={{ color:'var(--silver)' }}>GMAIL_USER: </span>
              <span style={{ color: testResult.env?.GMAIL_USER?.includes('✗') ? '#ef4444' : '#22c55e' }}>{testResult.env?.GMAIL_USER}</span>
            </div>
            <div style={{ marginBottom:6 }}>
              <span style={{ color:'var(--silver)' }}>GMAIL_PASS: </span>
              <span style={{ color: testResult.env?.GMAIL_PASS?.includes('✓') ? '#22c55e' : '#ef4444' }}>{testResult.env?.GMAIL_PASS}</span>
            </div>
            {testResult.results?.length === 0 && (
              <div style={{ color:'#f59e0b', marginTop:4 }}>⚠ Sin destinatarios — configurá emails en los perfiles de jugador</div>
            )}
            {testResult.results?.map((r: any, i: number) => (
              <div key={i} style={{ marginTop:4, color: r.ok ? '#22c55e' : '#ef4444' }}>
                {r.ok ? '✓' : '✗'} {r.nombre || r.to} → {r.ok ? `enviado (id: ${r.id})` : r.error}
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize:11, color:'var(--fog)', marginTop:8 }}>
          Si falla, revisá que GMAIL_USER y GMAIL_PASS estén configuradas en Vercel → Settings → Environment Variables.
        </p>
      </div>
    </div>
  )
}

// ─── GPS PANEL ────────────────────────────────────────────────────────────────
// GPS_METRIC_META, GPS_METRIC_ORDER, fmtGps defined at module level above

function GpsPanel({ teamData }: { teamData: any }) {
  const today = todayLocal()
  const [fecha, setFecha] = useState(today)
  const [tipoSesion, setTipoSesion] = useState<'entrenamiento' | 'partido'>('entrenamiento')
  const [sesionId, setSesionId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sesiones, setSesiones] = useState<any[]>([])
  const [partidos, setPartidos] = useState<any[]>([])
  const [existing, setExisting] = useState<any[]>([])
  const [preview, setPreview] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [error, setError] = useState('')
  const [historial, setHistorial] = useState<any[]>([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  function loadHistory() {
    setLoadingHistorial(true)
    fetch(`/api/gps/history?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    })
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        setHistorial(Array.isArray(d) ? d : [])
        setLoadingHistorial(false)
      })
      .catch(err => {
        console.error('[GPS historial]', err)
        setError('No se pudo cargar el historial GPS.')
        setLoadingHistorial(false)
      })
  }

  // Load sessions + history when date changes (or on mount)
  useEffect(() => {
    setPreview(null); setResult(null); setError('')
    fetch(`/api/gps/sesiones?fecha=${fecha}`)
      .then(r => r.json())
      .then(d => {
        setSesiones(d.sesiones || [])
        setPartidos(d.partidos || [])
        setExisting(d.existing || [])
        setSesionId(null)
      })
      .catch(() => {})
    loadHistory()
  }, [fecha])

  useEffect(() => {
    const handler = () => loadHistory()
    window.addEventListener('gps-data-updated', handler)
    return () => window.removeEventListener('gps-data-updated', handler)
  }, [])

  async function handleDelete(e: { fecha: string, tipo_sesion: string, sesion_id: any, ids?: number[] }) {
    if (!confirm(`¿Eliminar los datos GPS del ${e.fecha} (${e.tipo_sesion})?`)) return
    try {
      const params = new URLSearchParams({
        fecha: e.fecha,
        tipo_sesion: e.tipo_sesion,
        sesion_id: String(e.sesion_id ?? 'null'),
        ids: e.ids ? e.ids.join(',') : ''
      })
      const url = `/api/gps/import?${params.toString()}`
      const r = await fetch(url, { method: 'DELETE' })
      const d = await r.json().catch(() => ({ error: 'Error de respuesta del servidor' }))
      
      if (r.ok && d.ok) {
        fetch(`/api/gps/sesiones?fecha=${fecha}`)
          .then(r => r.json())
          .then(sd => setExisting(sd.existing || []))
          .catch(() => {})
        loadHistory()
      } else {
        alert('Error al borrar: ' + (d.error || 'Error desconocido'))
      }
    } catch (err) { 
      console.error(err)
      alert('Error de conexión al intentar borrar') 
    }
  }

  // For Excel: parse client-side, send only rows JSON (avoids Vercel 4.5MB body limit)
  // Extract PDF text client-side using pdf.js, ordered by Y-coordinate (row by row).
  // This correctly handles Catapult "DATA BASE RAPPORT OPENFIELD" PDFs where pdf-parse
  // (server-side) reads columns vertically instead of rows horizontally.
  async function extractPdfTextRowOrdered(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    // Load pdf.js from CDN if not already loaded
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = () => {
          ;(window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          resolve()
        }
        script.onerror = reject
        document.head.appendChild(script)
      })
    }
    const pdfjsLib = (window as any).pdfjsLib
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const allLines: string[] = []

    // Procesamos hasta 3 páginas: la tabla puede estar en pág. 1, 2 o 3 según el PDF.
    // Las páginas de gráficos que siguen se filtran por el parser de filas.
    const maxPages = Math.min(pdf.numPages, 3)
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const content = await page.getTextContent()
      // Group text items by their Y coordinate (rounded to nearest 3px to handle sub-pixel differences)
      const rows: Map<number, Array<{ x: number; text: string }>> = new Map()
      for (const item of content.items as any[]) {
        if (!item.str?.trim()) continue
        // Round to nearest 5px — tolerates sub-pixel Y variation between Catapult PDF versions
        const y = Math.round(item.transform[5] / 5) * 5
        if (!rows.has(y)) rows.set(y, [])
        rows.get(y)!.push({ x: item.transform[4], text: item.str })
      }
      // Sort rows top-to-bottom (higher Y = higher on page in PDF coords), then left-to-right within each row
      const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a)
      for (const y of sortedYs) {
        const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x)
        const line = rowItems.map(i => i.text.trim()).filter(Boolean).join(' ')
        if (line) allLines.push(line)
      }
    }
    return allLines.join('\n')
  }

  // For PDF: extract text client-side (row-ordered) and send as JSON.
  // This avoids the column-stacking issue of server-side pdf-parse for DATA BASE OPENFIELD format.
  async function buildImportBody(confirmFlag: boolean): Promise<{body: BodyInit, headers?: Record<string,string>}> {
    const isPdf = file!.name.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      const pdfText = await extractPdfTextRowOrdered(file!)
      return {
        body: JSON.stringify({
          pdfText,
          fecha,
          tipo_sesion: tipoSesion,
          sesion_id: sesionId || null,
          confirm: confirmFlag,
        }),
        headers: { 'Content-Type': 'application/json' },
      }
    }
    // Excel: parse in browser, send rows as JSON
    const arrayBuffer = await file!.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const wb = XLSX.read(data, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as any[][]
    return {
      body: JSON.stringify({ rows, fileName: file!.name, fecha, tipo_sesion: tipoSesion, sesion_id: sesionId || null, confirm: confirmFlag }),
      headers: { 'Content-Type': 'application/json' }
    }
  }

  async function handlePreview() {
    if (!file) { setError('Seleccioná un archivo Excel o PDF'); return }
    setLoading(true); setError(''); setPreview(null); setResult(null)
    try {
      const { body, headers } = await buildImportBody(false)
      const r = await fetch('/api/gps/import', { method: 'POST', body, headers })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Error al procesar el archivo'); return }
      setPreview(d)
    } catch (e) { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  async function handleConfirm() {
    if (!file || !preview) return
    setImporting(true); setError('')
    try {
      const { body, headers } = await buildImportBody(true)
      const r = await fetch('/api/gps/import', { method: 'POST', body, headers })
      const d = await r.json()
      if (r.ok && d.ok) {
        if ((d.saved || 0) === 0) {
          alert(`⚠️ Se procesó el archivo pero no se guardó ningún registro GPS.\n\nIntentados: ${d.attempted ?? 0}\nGuardados en DB: ${d.saved ?? 0}\n\nPosible causa: ningún jugador del archivo coincidió con el plantel, o las inserciones fallaron.${d.insertErrors?.length ? `\n\nErrores: ${d.insertErrors.slice(0,3).join(' | ')}` : ''}${d.unmatched?.length ? `\n\nSin match: ${d.unmatched.slice(0,5).join(', ')}` : ''}`)
        } else {
          alert(`✓ Éxito: Se guardaron ${d.saved}/${d.attempted ?? d.saved} registros GPS para la fecha ${fecha} (${tipoSesion}).${d.insertErrors?.length ? `\n\n⚠️ Errores: ${d.insertErrors.slice(0,3).join(' | ')}` : ''}`)
        }
        setResult(d)
        setPreview(null)
        setFile(null)
        // Refrescar banner "GPS ya cargado" para esta fecha
        fetch(`/api/gps/sesiones?fecha=${fecha}`)
          .then(r => r.json())
          .then(sd => setExisting(sd.existing || []))
          .catch(() => {})
        loadHistory()
      } else {
        setError(d.error || 'Error al importar')
        alert('Error al guardar: ' + (d.error || 'Respuesta no válida del servidor'))
      }
    } catch (e) { 
      setError('Error de conexión') 
      alert('Error de conexión: No se pudo contactar con el servidor')
    }
    finally { setImporting(false) }
  }

  const matchColor = (m: string) => m === 'nombre' ? '#22c55e' : m === 'primer_nombre' ? '#c8f135' : '#f59e0b'
  const matchLabel = (m: string) => m === 'nombre' ? 'nombre exacto' : m === 'primer_nombre' ? 'primer nombre' : 'parcial'

  return (
    <div style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: 'var(--snow)', letterSpacing: '0.04em', marginBottom: 6 }}>
          📡 DATOS GPS
        </h2>
        <p style={{ fontSize: 13, color: 'var(--silver)' }}>
          Importá el Excel o PDF de Catapult para cargar los datos GPS del equipo. Si tu club no usa GPS, podés ignorar esta sección — todo lo demás sigue funcionando igual.
        </p>

        {/* ── PLANTILLA EXCEL ── */}
        <div style={{ background:'rgba(200,241,53,.07)', border:'1.5px solid rgba(200,241,53,.25)', borderRadius:12, padding:'14px 18px', marginTop:14, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <div style={{ fontSize: 28 }}>📥</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--lime)', marginBottom: 3 }}>
              Descargá la Planilla de Ejemplo
            </div>
            <div style={{ fontSize: 11, color: 'var(--silver)', lineHeight: 1.6 }}>
              Completá con los datos de tu GPS, guardala como <strong style={{color:'var(--snow)'}}>Excel (.xlsx)</strong> y subila acá. Las columnas deben mantener el mismo nombre.
            </div>
          </div>
          <button className="hover-scale"
            onClick={() => {
              const headers = [
                'Nombre y Apellido','Tiempo (min)','Tot Dist (m)','Meterage Per Minute',
                'Vel B4 Tot Dist (m)','High Speed Dist (m)','Vel B6 Tot Dist (m)',
                'Número Sprint','Acc B2-3 Tot Effs','Decel B2-3 Tot Effs','Velocidad Máxima',
                'HSR (M/MIN)','DIST SPRINT/MIN','ACC INT/MIN','ACC/MIN','DEC/MIN','MAX ACC','MAX DEC'
              ]
              const rows = [
                headers,
                ['Juan Pérez',    90, 10500, 88, 2100, 520, 130, 12, 38, 32, 31, 5.8, 1.4, 0.4, 0.4, 0.3, 3, 3],
                ['Carlos López',  85,  9800, 82, 1950, 480, 115, 10, 34, 29, 29, 5.6, 1.3, 0.4, 0.4, 0.3, 3, 3],
                ['Miguel Torres', 90, 10200, 85, 2050, 495, 120, 11, 36, 31, 30, 5.5, 1.3, 0.4, 0.4, 0.3, 3, 3],
              ]
              const ws = XLSX.utils.aoa_to_sheet(rows)
              ws['!cols'] = [22,13,13,20,18,18,18,14,18,18,16,13,16,13,13,13,13,13].map(w => ({ wch: w }))
              const wb = XLSX.utils.book_new()
              XLSX.utils.book_append_sheet(wb, ws, 'GPS_DATOS')
              XLSX.writeFile(wb, 'GPS_PLANTILLA.xlsx')
            }}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'10px 20px', background:'var(--lime)', color:'#0a0a0f', borderRadius:8, fontWeight:700, fontSize:13, border:'none', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}
          >
            ⬇️ Descargar Planilla
          </button>
        </div>

        <div style={{ background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.15)', borderRadius:10, padding:'10px 14px', marginTop:10, fontSize:12, color:'var(--silver)', lineHeight:1.6 }}>
          <strong style={{ color:'var(--lime)' }}>ℹ️ ¿Dónde aparecen los datos?</strong><br/>
          Los datos que importás acá (distancia, player load, sprints) se guardan en la base de datos por jugador y fecha. Para verlos en <strong style={{ color:'var(--snow)' }}>Analytics → Carga Individual</strong>, los datos GPS se combinan con las sesiones planificadas en el <strong style={{ color:'var(--snow)' }}>Calendario</strong>. Si no ves datos en Analytics, asegurate de tener sesiones cargadas en el Calendario para las mismas fechas del Excel.
        </div>
      </div>

      {/* Existing imports for this date */}
      {existing.length > 0 && (
        <div style={{ background: 'rgba(200,241,53,.06)', border: '1px solid rgba(200,241,53,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--lime)', fontWeight: 700 }}>✓ GPS ya cargado para esta fecha:</span>
          {existing.map((e: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(200,241,53,.12)', borderRadius: 6, padding: '4px 8px 4px 10px' }}>
              <span style={{ fontSize: 11, color: 'var(--lime)', fontFamily: 'DM Mono, monospace' }}>
                {e.tipo_sesion} · {e.n_jugadores} j.
              </span>
              <button className="hover-scale" onClick={() => handleDelete(e)} style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,.6)', cursor: 'pointer', fontSize: 13, padding: '0 2px', display: 'flex', alignItems: 'center' }} title="Borrar carga">
                🗑️
              </button>
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--fog)', marginLeft: 'auto' }}>Podés sobreescribir subiendo uno nuevo o borrar manualmente.</span>
        </div>
      )}

      {/* Import form */}
      <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 18 }}>
          Nueva importación
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Date */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fog)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Fecha del GPS</label>
            <input className="wp-input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
          </div>

          {/* Tipo sesion */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fog)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipo</label>
            <select className="wp-input" value={tipoSesion} onChange={e => { setTipoSesion(e.target.value as any); setSesionId(null) }} style={{ width: '100%' }}>
              <option value="entrenamiento">⚽ Entrenamiento</option>
              <option value="partido">🏆 Partido</option>
            </select>
          </div>

          {/* Session selector */}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--fog)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Sesión {tipoSesion === 'entrenamiento' ? 'planificada' : 'jugada'} (opcional)
            </label>
            <select className="wp-input" value={sesionId ?? ''} onChange={e => setSesionId(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%' }}>
              <option value="">Sin vincular</option>
              {sesiones.length === 0 && (
                <option disabled value="">— No hay sesiones en ±14 días —</option>
              )}
              {sesiones.map((s: any) => {
                const icon = s.tipo === 'partido' ? '⚽' : '🏋️'
                const label = s.titulo || (s.rival ? `vs ${s.rival}` : s.tipo === 'partido' ? 'Partido' : 'Entrenamiento')
                return <option key={s.id} value={s.id}>{icon} {s.fecha} · {label}</option>
              })}
            </select>
          </div>
        </div>

        {/* File upload */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--fog)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Archivo Catapult (.xlsx / .csv / .pdf)
          </label>
          <label
            htmlFor="gps-file-input"
            style={{ border: '2px dashed var(--mist)', borderRadius: 12, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(200,241,53,.04)' : 'transparent', borderColor: file ? 'var(--lime)' : 'var(--mist)', transition: 'all .2s', display: 'block' }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setPreview(null); setResult(null) } }}
          >
            <input id="gps-file-input" type="file" accept=".xlsx,.csv,.xls,.pdf"
              style={{ position:'absolute', width:1, height:1, opacity:0, overflow:'hidden' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(null); setResult(null) } }}
              onClick={e => { (e.target as HTMLInputElement).value = '' }}
            />
            {file ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{file.name.toLowerCase().endsWith('.pdf') ? '📄' : '📊'}</div>
                <div style={{ fontSize: 13, color: 'var(--lime)', fontWeight: 600 }}>{file.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fog)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(1)} KB · {file.name.toLowerCase().endsWith('.pdf') ? 'PDF — nombres del reporte' : 'Excel'} · Click para cambiar
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                <div style={{ fontSize: 13, color: 'var(--silver)' }}>Arrastrá el archivo acá o hacé click para seleccionar</div>
                <div style={{ fontSize: 11, color: 'var(--fog)', marginTop: 4 }}>Excel (.xlsx / .csv) o PDF — ambos formatos de Catapult OpenField</div>
                <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, fontSize: 11, color: '#f59e0b', lineHeight: 1.6 }}>
                  📋 <strong>PDF:</strong> podés subir el reporte completo de Catapult — solo asegurate de que la <strong>tabla de datos quede en la página 1 o 2</strong> del PDF (que es donde está normalmente). Las páginas de gráficos se ignoran automáticamente.
                </div>
              </div>
            )}
          </label>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>{error}</div>
        )}

        <button
          onClick={handlePreview}
          disabled={!file || loading}
          className="btn-lime"
          style={{ padding: '12px 28px', fontSize: 14 }}
        >
          {loading ? 'Procesando...' : '🔍 Verificar y previsualizar'}
        </button>
      </div>

      {/* Preview */}
      {preview && (() => {
        // Build dynamic columns from what was actually detected in the file
        const detectedCols: string[] = preview.columnas_detectadas || []
        // Fallback: gather all keys from all metricas objects
        const allMetricKeys = detectedCols.length > 0 ? detectedCols : (() => {
          const keys = new Set<string>()
          preview.matched.forEach((m: any) => Object.keys(m.metricas || {}).forEach((k: string) => keys.add(k)))
          return Array.from(keys)
        })()
        const sortedCols = [
          ...GPS_METRIC_ORDER.filter(k => allMetricKeys.includes(k)),
          ...allMetricKeys.filter(k => !GPS_METRIC_ORDER.includes(k)).sort(),
        ]
        const validPlayers = preview.matched.filter((m: any) => !m.sin_datos)

        return (
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)', marginBottom: 4 }}>
                  Preview · {preview.fecha} · {preview.tipo_sesion}
                  <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--fog)', fontFamily: 'DM Mono, monospace', background: 'rgba(200,241,53,.08)', borderRadius: 4, padding: '2px 8px' }}>
                    {preview.fuente === 'pdf' ? '📄 PDF' : '📊 Excel'}
                  </span>
                </p>
                <p style={{ fontSize: 12, color: 'var(--silver)' }}>
                  {preview.matched.length} de {preview.total_filas} jugadores encontrados en el plantel
                  {preview.unmatched.length > 0 && ` · ${preview.unmatched.length} sin match`}
                  {' · '}<span style={{ color: 'var(--lime)' }}>{sortedCols.length} variables detectadas</span>
                </p>
              </div>

              {/* DUPLICATE WARNING */}
              {preview.alreadyExists && (
                <div style={{ width: '100%', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.35)', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', order: 3, marginTop: 4 }}>
                  <div style={{ fontSize: 24 }}>⚠️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 2 }}>
                      ¡Atención! Ya existen datos GPS cargados
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--silver)', lineHeight: 1.5 }}>
                      Ya hay registros para <strong style={{ color: 'var(--snow)' }}>{preview.fecha} ({preview.tipo_sesion})</strong>. Si confirmás, los datos anteriores serán <strong style={{ color: '#fca5a5' }}>borrados y reemplazados</strong> por estos nuevos. No se sumarán ni se promediarán.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="hover-scale" onClick={() => setPreview(null)} className="btn-ghost" style={{ fontSize: 12, padding: '8px 16px' }}>Cancelar</button>
                <button
                  onClick={handleConfirm}
                  disabled={importing || validPlayers.length === 0}
                  className="btn-lime"
                  style={{ fontSize: 13, padding: '10px 22px' }}
                >
                  {importing ? 'Importando...' : `✓ Confirmar (${validPlayers.length} jugadores)`}
                </button>
              </div>
            </div>

            {/* Detected columns chips */}
            {sortedCols.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, padding: '10px 14px', background: 'rgba(200,241,53,.04)', borderRadius: 10, border: '1px solid rgba(200,241,53,.1)' }}>
                <span style={{ fontSize: 10, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 4, alignSelf: 'center' }}>Variables:</span>
                {sortedCols.map(key => {
                  const meta = GPS_METRIC_META[key]
                  return (
                    <span key={key} style={{ fontSize: 10, background: 'rgba(200,241,53,.12)', color: 'var(--lime)', borderRadius: 4, padding: '2px 7px', fontFamily: 'DM Mono, monospace' }}>
                      {meta ? meta.label : key}
                      {meta && <span style={{ opacity: 0.6, marginLeft: 3 }}>{meta.unit}</span>}
                    </span>
                  )
                })}
              </div>
            )}

            {/* Dynamic table */}
            <div style={{ overflowX: 'auto', marginBottom: preview.unmatched.length > 0 ? 16 : 0 }}>
              <table className="wp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--mist)', background: 'rgba(255,255,255,.02)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap' }}>Catapult</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, whiteSpace: 'nowrap' }}>Jugador</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Match</th>
                    {sortedCols.map(key => {
                      const meta = GPS_METRIC_META[key]
                      return (
                        <th key={key} style={{ padding: '8px 10px', textAlign: 'center', fontSize: 9, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {meta ? meta.label : key}
                          {meta && <span style={{ display: 'block', fontSize: 8, opacity: 0.6, fontWeight: 400 }}>{meta.unit}</span>}
                        </th>
                      )
                    })}
                    <th style={{ padding: '8px 10px', textAlign: 'center', fontSize: 10, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.matched.map((m: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,.04)', opacity: m.sin_datos ? 0.35 : 1, background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.012)' }}>
                      <td style={{ padding: '9px 12px', color: 'var(--silver)', fontFamily: 'DM Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{m.nombre_catapult}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--snow)', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.jugador_nombre}</td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        <span style={{ fontSize: 9, background: `${matchColor(m.match_method)}22`, color: matchColor(m.match_method), borderRadius: 4, padding: '2px 6px', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>
                          {matchLabel(m.match_method)}
                        </span>
                      </td>
                      {sortedCols.map(key => {
                        const val = m.metricas?.[key]
                        const formatted = val !== undefined && val !== null && val !== 0
                          ? fmtGps(key, val)
                          : '—'
                        const hasData = val !== undefined && val !== null && val !== 0
                        return (
                          <td key={key} style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11, color: hasData ? 'var(--snow)' : 'var(--fog)', whiteSpace: 'nowrap' }}>
                            {formatted}
                          </td>
                        )
                      })}
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        {m.sin_datos
                          ? <span style={{ fontSize: 10, color: '#f59e0b', fontFamily: 'DM Mono, monospace' }}>⚠ sin vest</span>
                          : <span style={{ fontSize: 10, color: '#22c55e' }}>✓ ok</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Unmatched */}
            {preview.unmatched.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 10, padding: '12px 16px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>
                  ⚠ {preview.unmatched.length} jugador{preview.unmatched.length > 1 ? 'es' : ''} del GPS no encontrado{preview.unmatched.length > 1 ? 's' : ''} en el plantel:
                </p>
                <p style={{ fontSize: 12, color: 'var(--silver)', fontFamily: 'DM Mono, monospace' }}>
                  {preview.unmatched.join(' · ')}
                </p>
                <p style={{ fontSize: 11, color: 'var(--fog)', marginTop: 6 }}>
                  Verificá que el nombre en Catapult coincida con el nombre del jugador en W&amp;P.
                </p>
              </div>
            )}
          </div>
        )
      })()}

      {/* Success result */}
      {result && (
        <div style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>✓ Importación completada</p>
          <p style={{ fontSize: 13, color: 'var(--silver)' }}>{result.message}</p>
          {result.unmatched?.length > 0 && (
            <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 8 }}>⚠ Sin match: {result.unmatched.join(', ')}</p>
          )}
          {result.errors?.length > 0 && (
            <p style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>Errores: {result.errors.join(' · ')}</p>
          )}
        </div>
      )}

      {/* Info box */}
      <div style={{ background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.15)', borderRadius: 12, padding: '16px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa', marginBottom: 8 }}>ℹ Cómo funciona</p>
        <ul style={{ fontSize: 12, color: 'var(--fog)', lineHeight: 1.8, paddingLeft: 16, margin: 0 }}>
          <li>Exportá el resumen de sesión desde <strong style={{ color: 'var(--silver)' }}>Catapult OpenField → Reports → Session Summary</strong></li>
          <li>El sistema intenta enlazar cada jugador por nombre, usando fallback automático</li>
          <li>Los jugadores marcados como "sin vest" (distancia = 0) se omiten automáticamente</li>
          <li>Si ya hay GPS cargado para esa fecha y tipo, se sobreescribe al confirmar</li>
          <li><strong style={{ color: 'var(--silver)' }}>No usás GPS?</strong> No pasa nada — las otras secciones funcionan igual sin estos datos</li>
        </ul>
      </div>

    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// CONTROL DE CARGA PANEL
// ═══════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// CONTROL DE CARGA — CALC (datos RPE + calculadora desde Calendario)
// ═══════════════════════════════════════════════════════════════════
const MD_ORDER = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']

function ControlCargaCalcPanel({ teamData }: { teamData: any[] }) {
  const today = todayLocal()
  // If today is Monday (getDay()===1), shift back 7 days so offset=0 shows the
  // microciclo that just ended (Mon–Sun), not the brand-new week with no data yet.
  const mondayShift = new Date().getDay() === 1 ? -7 : 0
  const getWeekStart = (offsetWeeks = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + offsetWeeks * 7 + mondayShift)
    return localDateStr(d)
  }
  const getWeekEnd = (offsetWeeks = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 7 + offsetWeeks * 7 + mondayShift)
    return localDateStr(d)
  }
  const [microcicloOffset, setMicrocicloOffset] = useState(0)
  const [dateRange, setDateRange] = useState({ desde: getWeekStart(0), hasta: today })
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [calSesiones, setCalSesiones] = useState<Set<string>>(new Set()) // fechas+titulos visible in calendar
  const [partidoRefs, setPartidoRefs] = useState<any[]>(() => {
    try { const s = localStorage.getItem('wp_calc_partidoRefs'); return s ? JSON.parse(s) : [{},{},{},{},{}] } catch { return [{},{},{},{},{}] }
  })
  const [showRefInput, setShowRefInput] = useState(false)
  const [partidos, setPartidos] = useState<any[]>([])
  const [selectedPartidos, setSelectedPartidos] = useState<(any|null)[]>(() => {
    try { const s = localStorage.getItem('wp_calc_selectedPartidos'); return s ? JSON.parse(s) : [null,null,null] } catch { return [null,null,null] }
  })

  useEffect(() => {
    try { localStorage.setItem('wp_calc_partidoRefs', JSON.stringify(partidoRefs)) } catch {}
  }, [partidoRefs])

  useEffect(() => {
    try { localStorage.setItem('wp_calc_selectedPartidos', JSON.stringify(selectedPartidos)) } catch {}
  }, [selectedPartidos])

  useEffect(() => {
    // Recalculate date range when microciclo offset changes
    const newDesde = getWeekStart(microcicloOffset)
    const newHasta = microcicloOffset === 0 ? today : getWeekEnd(microcicloOffset)
    setDateRange({ desde: newDesde, hasta: newHasta })
  }, [microcicloOffset])

  useEffect(() => { cargar() }, [dateRange])

  // Reload when GPS import completes in another panel
  useEffect(() => {
    const handler = () => cargar(false)
    window.addEventListener('gps-data-updated', handler)
    return () => window.removeEventListener('gps-data-updated', handler)
  }, [dateRange])

  // Auto-refresh every 60s without showing loading indicator (prevents scroll reset)
  useEffect(() => {
    const id = setInterval(() => cargar(false), 60000)
    return () => clearInterval(id)
  }, [dateRange])

  useEffect(() => {
    // Load partido sessions from the calendar (sesiones_plan con tipo='partido')
    // These come from /api/calendario GET response
    const hace1año = new Date(); hace1año.setFullYear(hace1año.getFullYear()-1)
    const desdeStr = localDateStr(hace1año)
    fetch(`/api/calendario?desde=${desdeStr}&hasta=${today}`)
      .then(r=>r.json())
      .then(d => {
        // sesiones with tipo='partido' from calendar
        const sesPartido = (d.sesiones||[]).filter((s:any) => s.tipo === 'partido')
        // Also include partido_logs as fallback
        const partidosLog = (d.partidos||[])
        // Merge, prefer calendar sesiones
        const all = [...sesPartido.map((s:any) => ({
          id: s.id,
          fecha: s.fecha,
          rival: s.rival || s.titulo || 'Partido',
          rival_foto: s.rival_foto,
          tipo_partido: s.titulo || 'Oficial',
          _src: 'calendar',
          _sesion: s, // keep full sesion for auto-loading metrics
        })), ...partidosLog.map((p:any) => ({
          fecha: p.fecha,
          rival: p.rival,
          rival_foto: p.rival_foto,
          tipo_partido: p.tipo_partido,
          _src: 'log',
        }))]
        // Deduplicate by fecha+rival
        const seen = new Set()
        const unique = all.filter((p:any) => {
          const key = `${p.fecha}_${p.rival}`
          if (seen.has(key)) return false
          seen.add(key); return true
        })
        setPartidos(unique.sort((a:any,b:any) => b.fecha.localeCompare(a.fecha)))
      }).catch(()=>{})
  }, [])

  async function cargar(showLoading = true) {
    if (showLoading) setLoading(true)
    try {
      const [gpsRes, calRes] = await Promise.all([
        fetch(`/api/carga-gps?desde=${dateRange.desde}&hasta=${dateRange.hasta}&ciclo=microciclo`),
        fetch(`/api/calendario?desde=${dateRange.desde}&hasta=${dateRange.hasta}`),
      ])
      const [gpsData, calData] = await Promise.all([gpsRes.json(), calRes.json()])
      setData(gpsData)
      // Build a set of "titulo" values that are actually in the calendar
      // so we can filter ghost MD sessions from carga-gps
      const calSet = new Set<string>(
        ((calData?.sesiones || []) as any[])
          .filter((s: any) => s.titulo)
          .map((s: any) => String(s.titulo))
      )
      setCalSesiones(calSet)
    }
    catch(e){} finally { if (showLoading) setLoading(false) }
  }

  // When a match is selected, load its metrics automatically
  async function selectPartido(slotIdx: number, partido: any) {
    const updated = [...selectedPartidos]
    if (!partido) { updated[slotIdx] = null; setSelectedPartidos(updated); const nr=[...partidoRefs]; nr[slotIdx]={}; setPartidoRefs(nr); return }
    updated[slotIdx] = partido
    setSelectedPartidos(updated)
    try {
      // Bug fix: fetch GPS and minutos in parallel — partidos have no sesiones_plan blocks
      // so minActivo from carga-gps is always 0. Use /api/minutos as fallback.
      const [gpsRes, minRes] = await Promise.all([
        fetch(`/api/carga-gps?desde=${partido.fecha}&hasta=${partido.fecha}&ciclo=microciclo`),
        fetch(`/api/minutos?desde=${partido.fecha}&hasta=${partido.fecha}`)
      ])
      const [d, minData] = await Promise.all([gpsRes.json(), minRes.json()])
      const avg = d?.teamAvg || {}
      // Compute avg min_partido from players who have > 0 minutes that day
      const activePlayers = (minData?.players || []).filter((p: any) => (p.min_partido || 0) > 0)
      const minPartidoPromedio = activePlayers.length
        ? Math.round(activePlayers.reduce((s: number, p: any) => s + (p.min_partido || 0), 0) / activePlayers.length)
        : 0
      const nr = [...partidoRefs]
      nr[slotIdx] = {
        ua_total:   avg.ua_total   || 0,
        minActivo:  avg.minActivo  || minPartidoPromedio || 0,
        distTotal:  avg.distTotal  || 0,
        distSprint: avg.distSprint || 0,
        nSprints:   avg.nSprints   || 0,
        nAcel:      avg.nAcel      || 0,
        nDecel:     avg.nDecel     || 0,
        nAcel3:     avg.nAcel3     || 0,
        nDecel3:    avg.nDecel3    || 0,
        distMP:     avg.distMP     || 0,
      }
      setPartidoRefs(nr)
    } catch(e) {}
  }

  const VARS = [
    {key:'ua_total',   label:'UA',             color:'#60a5fa', unit:''},
    {key:'minActivo',  label:'Tiempo (min)',   color:'#34d399', unit:'min'},
    {key:'distTotal',  label:'DT (m)',         color:'#f59e0b', unit:'m'},
    {key:'distSprint', label:'Dist. Sprint (m)',color:'#f97316', unit:'m'},
    {key:'nSprints',   label:'Nº Sprints',     color:'#a78bfa', unit:'nº'},
    {key:'nAcel',      label:'Ace >2 (m)',     color:'#ec4899', unit:'m'},
    {key:'nDecel',     label:'Dec >2 (m)',     color:'#14b8a6', unit:'m'},
    {key:'nAcel3',     label:'ACE >3 (n)',     color:'#f43f5e', unit:'nº'},
    {key:'nDecel3',    label:'DEC >3 (n)',     color:'#0ea5e9', unit:'nº'},
    {key:'distMP',     label:'Alta Pot.',      color:'#fbbf24', unit:'m'},
  ]

  const GRUPOS = [
    { label:'DT (m) / Minutos',         vars: ['distTotal'],   colors:['#f59e0b'], lineVar:'minActivo', lineColor:'#34d399', lineLabel:'Tiempo (min)' },
    { label:'Dist. Sprint + Nº Sprint', vars: ['distSprint'],   colors:['#f97316'], lineVar:'nSprints', lineColor:'#a78bfa', lineLabel:'Nº Sprints' },
    { label:'Acc >2 + Dec >2',          vars: ['nAcel','nDecel'],          colors:['#ec4899','#14b8a6'], lineVar:null },
    { label:'Acc >3 + Dec >3',          vars: ['nAcel3','nDecel3'],        colors:['#f43f5e','#0ea5e9'], lineVar:null },
    { label:'Alta Potencia',            vars: ['distMP'],                  colors:['#fbbf24'], lineVar:null },
  ]

  const players: any[] = data?.players || []
  const teamAvg = data?.teamAvg || {}
  const perSession: Record<string,any> = data?.perSession || {}
  const perSessionPlayers: Record<string,any[]> = data?.perSessionPlayers || {}
  const perSessionTeamAvg: Record<string,any> = data?.perSessionTeamAvg || {}
  const sesionesInfo: any[] = data?.sesionesInfo || []
  const cePerSession: Record<string,any> = data?.cePerSession || {}
  const gpsPerMD: Record<string,any[]> = data?.gpsPerMD || {}
  // Mapping from camelCase calc keys → snake_case real GPS keys
  const GPS_REAL_KEY: Record<string,string> = {
    distTotal:'dist_total', distSprint:'dist_hir', nSprints:'n_sprints',
    nAcel:'acc3', nDecel:'dec3', distMP:'dist_v4', nAcel3:'acc3', nDecel3:'dec3',
  }
  // Always show all 8 MD slots (skeleton view) — existingMdLabels controls opacity/hasData
  const MD_ORDER_LOCAL = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']
  const existingMdLabels = new Set(sesionesInfo.map((s:any) => s.titulo))
  const mdCols = [
    ...MD_ORDER_LOCAL,
    ...sesionesInfo.map((s:any) => s.titulo).filter((t:string) => !MD_ORDER_LOCAL.includes(t))
  ]

  const refMedia: Record<string,number> = {}
  VARS.forEach(v => {
    const vals = partidoRefs.map(r => Number(r[v.key])||0).filter(x=>x>0)
    if (vals.length) refMedia[v.key] = Math.round(vals.reduce((s,x)=>s+x,0)/vals.length)
  })
  const pct = (val:number, key:string) => { const ref = refMedia[key]; if(!ref||ref===0) return null; return Math.round((val/ref)*100) }
  const pctColor = (p:number|null) => p===null?'var(--fog)':p>=85?'#22c55e':p>=65?'#f59e0b':'#ef4444'

  const renderGrupoBar = (grupo: {label:string,vars:string[],colors:string[],lineVar?:string|null,lineColor?:string,lineLabel?:string}, dataSource: 'jugador'|'md', mode: 'totales'|'promedio' = 'promedio') => {
    // nP = plantilla completa (todos los jugadores activos del club)
    // El valor de sesión ya es por-jugador (de la calculadora), × nP = total equipo
    const nP = players.length || 1
    const getMdVal = (md: string, vk: string) => {
      const sessVal = Math.round(Number(perSession[md]?.[vk])||0)
      return mode === 'totales' ? Math.round(sessVal * nP) : sessVal
    }
    const series = grupo.vars.map((vk, ci) => {
      const varDef = VARS.find(v=>v.key===vk)!
      return {
        label: varDef?.label || vk,
        color: grupo.colors[ci] || '#888',
        vals: dataSource === 'jugador'
          ? players.map((p:any)=>({ name: p.nombre.split(' ')[0], val: Number(p[vk])||0 }))
          : mdCols.map(md=>({ name: md, val: getMdVal(md, vk) }))
      }
    })
    const allVals = series.flatMap(s=>s.vals.map((v:any)=>v.val))
    const maxVal = Math.max(...allVals, 1)
    const names = series[0]?.vals.map((v:any)=>v.name) || []
    const BAR_H = 130
    const yTicks = [1, 0.75, 0.5, 0.25, 0].map(f => Math.round(maxVal * f))

    // Line series (e.g. tiempo/min)
    const lineVals: number[] = grupo.lineVar
      ? (dataSource === 'jugador'
          ? players.map((p:any) => Number(p[grupo.lineVar!])||0)
          : mdCols.map(md => mode === 'totales' ? Math.round(Math.round(Number(perSession[md]?.[grupo.lineVar!])||0) * nP) : Math.round(Number(perSession[md]?.[grupo.lineVar!])||0)))
      : []
    const maxLineVal = Math.max(...lineVals, 1)

    return (
      <div key={grupo.label} style={{ background:'var(--ink3)', borderRadius:12, padding:14, border:'1px solid var(--mist)' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>{grupo.label}</div>
        <div style={{ display:'flex', gap:6, fontSize:10, color:'var(--fog)', marginBottom:10, flexWrap:'wrap' }}>
          {series.map((s,i)=>(
            <span key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:10, height:10, borderRadius:2, background:s.color, display:'inline-block', flexShrink:0 }}/>
              {s.label}
            </span>
          ))}
          {grupo.lineVar && grupo.lineColor && (
            <span style={{ display:'flex', alignItems:'center', gap:4 }}>
              <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={grupo.lineColor} strokeWidth="2" strokeDasharray="4,2"/><circle cx="8" cy="4" r="2.5" fill={grupo.lineColor}/></svg>
              {grupo.lineLabel || grupo.lineVar}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:0 }}>
          {/* Y-axis labels */}
          <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', paddingRight:6, height:BAR_H }}>
            {yTicks.map((t,i)=>(
              <div key={i} style={{ fontSize:8, color:'var(--fog)', fontFamily:'DM Mono,monospace', textAlign:'right', lineHeight:1 }}>{t}</div>
            ))}
          </div>
          {/* Bars + grid + line overlay */}
          <div style={{ flex:1 }}>
            <div style={{ position:'relative', height:BAR_H }}>
              {[100,75,50,25,0].map((p,i)=>(
                <div key={i} style={{ position:'absolute', left:0, right:0, top:`${(i/4)*BAR_H}px`, borderTop:'1px solid rgba(255,255,255,.05)' }}/>
              ))}
              <div style={{ display:'flex', height:BAR_H }}>
                {names.map((name:string,ni:number)=>{
                  const lineV = lineVals[ni] || 0
                  const dotBottom = lineV > 0 ? (lineV/maxLineVal)*BAR_H*0.85 + BAR_H*0.05 : -999
                  return (
                    <div key={ni} style={{ flex:1, position:'relative', display:'flex', gap:2, alignItems:'flex-end', justifyContent:'center', height:BAR_H }}>
                      {series.map((s,si)=>{
                        const val = (s.vals[ni] as any)?.val || 0
                        const h = Math.max((val/maxVal)*BAR_H, val>0?3:0)
                        return (
                          <div key={si} title={`${name} - ${s.label}: ${val}`}
                            className="anim-grow-up"
                              style={{ position:'relative', width:'100%', maxWidth:18, minWidth:7, height:`${h}px`,
                              background: val>0 ? s.color : `${s.color}18`,
                              borderRadius:'3px 3px 0 0', overflow:'visible', animationDelay: `${ni * 0.05 + si * 0.02}s` }}>
                            {val>0 && h>=18 && (
                              <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-90deg)', fontSize:8, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap', textShadow:'0 1px 2px rgba(0,0,0,.9)', pointerEvents:'none' }}>{val}</span>
                            )}
                          </div>
                        )
                      })}
                      {/* Inline dot + value label */}
                      {grupo.lineVar && lineV > 0 && (
                        <div className="anim-fade-up" style={{ position:'absolute', left:'50%', bottom:dotBottom - 5, zIndex:10, pointerEvents:'none', display:'flex', flexDirection:'column', alignItems:'center', animationDelay:`${0.5 + ni*0.05}s` }}>
                          <span style={{ fontSize:BAR_H*0.09, fontFamily:'DM Mono,monospace', fontWeight:700, color:grupo.lineColor, whiteSpace:'nowrap', marginBottom:4, textShadow:'0 1px 3px rgba(0,0,0,.8)' }}>{lineV}</span>
                          <div style={{ width:10, height:10, borderRadius:'50%', background:grupo.lineColor, border:'1.5px solid #000', boxSizing:'border-box', flexShrink:0 }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* SVG: ONLY dashed connecting lines */}
              {grupo.lineVar && lineVals.length >= 2 && (() => {
                const n = names.length
                const pts = lineVals.map((v: number, i: number) => {
                  const dotBottom = v > 0 ? (v/maxLineVal)*BAR_H*0.85 + BAR_H*0.05 : -1
                  return { x: ((i + 0.5) / n) * 100, y: v > 0 ? BAR_H - dotBottom : null }
                })
                const valid = pts.filter(p => p.y !== null) as {x:number,y:number}[]
                if (valid.length < 2) return null
                return (
                  <svg style={{ position:'absolute', bottom:0, left:0, right:0, width:'100%', height:BAR_H, overflow:'visible', pointerEvents:'none' }}>
                    {valid.map((pt, i) => i > 0 ? (
                      <line key={i} x1={`${valid[i-1].x}%`} y1={valid[i-1].y} x2={`${pt.x}%`} y2={pt.y}
                        stroke={grupo.lineColor} strokeWidth="2.5" strokeDasharray="10,6" className="anim-fade-in" style={{ animationDelay:`${0.5 + i*0.05}s` }} />
                    ) : null)}
                  </svg>
                )
              })()}
            </div>
            {/* X-axis labels */}
            <div style={{ display:'flex', marginTop:4 }}>
              {names.map((name:string,ni:number)=>(
                <div key={ni} style={{ flex:1, fontSize:9, color:existingMdLabels.has(name)?'var(--lime)':'var(--fog)', whiteSpace:'nowrap', overflow:'hidden', maxWidth:38, textOverflow:'ellipsis', textAlign:'center', fontWeight:existingMdLabels.has(name)?700:400 }}>{name}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding:'24px 20px', maxWidth:1400, margin:'0 auto' }}>
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width: 44, height: 44, flexShrink: 0, color: 'var(--snow)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.05)', padding: 8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: '100%', height: '100%' }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </div>
          <div>
            <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:'var(--snow)', letterSpacing:'0.04em', marginBottom:4 }}>RESUMEN DE CARGA ESPECÍFICA SEMANAL</h2>
            <p style={{ fontSize:12, color:'var(--silver)' }}>Microciclo · RPE, UA y carga calculada desde sesiones planificadas</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          {/* Bug fix: manual refresh button */}
          <button onClick={cargar} disabled={loading} title="Actualizar datos" className="btn-ghost-lime">
            <span style={{ fontSize:14, display:'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>🔄</span> Actualizar
          </button>
          {/* Microciclo navigator */}
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:10, padding:'6px 10px' }}>
            <button className="hover-scale" onClick={()=>setMicrocicloOffset(o=>o-1)} style={{ width:28, height:28, borderRadius:6, background:'rgba(255,255,255,.07)', border:'1px solid var(--fog)', color:'var(--snow)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
            <div style={{ textAlign:'center', minWidth:90 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                {microcicloOffset === 0 ? 'Semana actual' : microcicloOffset > 0 ? `+${microcicloOffset} sem.` : `${microcicloOffset} sem.`}
              </div>
              <div style={{ fontSize:9, color:'var(--fog)', fontFamily:'DM Mono,monospace', marginTop:1 }}>{dateRange.desde} → {dateRange.hasta}</div>
            </div>
            <button className="hover-scale" onClick={()=>setMicrocicloOffset(o=>o+1)} style={{ width:28, height:28, borderRadius:6, background:'rgba(255,255,255,.07)', border:'1px solid var(--fog)', color:'var(--snow)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
            {microcicloOffset !== 0 && <button className="hover-scale" onClick={()=>setMicrocicloOffset(0)} style={{ fontSize:9, padding:'2px 7px', borderRadius:5, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.3)', cursor:'pointer' }}>Hoy</button>}
          </div>
          <div><label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Desde</label><input className="wp-input" type="date" value={dateRange.desde} onChange={e=>setDateRange(r=>({ ...r, desde: e.target.value }))} /></div>
          <div><label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Hasta</label><input className="wp-input" type="date" value={dateRange.hasta} onChange={e=>setDateRange(r=>({ ...r, hasta: e.target.value }))} /></div>
          <button className="hover-scale" onClick={()=>{
            const win = window.open('', '_blank'); if (!win) return

            // SVG bar chart builder (portrait-friendly, pure HTML)
            const mkBars = (items: {name:string, val:number, sub?:string}[], bars: {key:string,label:string,color:string}[], lineKey?: string, lineColor?: string) => {
              if (!items.length) return '<p style="color:#aaa;font-size:10px;text-align:center;padding:8px">Sin datos</p>'
              const BAR_H = 200, TOP = 24, BOT = 48, COL_W = Math.max(Math.floor(800/items.length), 60)
              const W = items.length * COL_W
              const allVals = items.flatMap(it => bars.map(b => Number((it as any)[b.key])||0))
              const maxBar = Math.max(...allVals, 1)
              const lineVals = lineKey ? items.map(it => Number((it as any)[lineKey])||0) : []
              const maxLine = Math.max(...lineVals.filter(v=>v>0), 1)
              let svg = `<svg viewBox="0 0 ${W} ${TOP+BAR_H+BOT}" width="100%" style="overflow:visible;display:block;">`
              // grid lines
              ;[0,25,50,75,100].forEach(p => {
                const y = TOP + BAR_H - (p/100)*BAR_H
                svg += `<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="#e5e7eb" stroke-width="0.5"/>`
              })
              // bars
              items.forEach((it, pi) => {
                const x0 = pi * COL_W + 2
                const bw = Math.max((COL_W - 4) / bars.length - 1, 6)
                bars.forEach((b, bi) => {
                  const val = Number((it as any)[b.key])||0
                  const h = val > 0 ? Math.max((val/maxBar)*BAR_H, 4) : 0
                  const bx = x0 + bi*(bw+1)
                  const by = TOP + BAR_H - h
                  svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" fill="${b.color}" rx="2"/>`
                  if (val > 0) {
                    if (h > 16) svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by+h/2+3).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="7" font-weight="700" transform="rotate(-90,${(bx+bw/2).toFixed(1)},${(by+h/2).toFixed(1)})">${val}</text>`
                    else svg += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by-2).toFixed(1)}" text-anchor="middle" fill="${b.color}" font-size="7" font-weight="700">${val}</text>`
                  }
                })
                // x label
                const cx = x0 + (COL_W-4)/2
                svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+12).toFixed(1)}" text-anchor="middle" fill="#333" font-size="8" font-weight="600">${it.name}</text>`
                if (it.sub) svg += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+22).toFixed(1)}" text-anchor="middle" fill="#888" font-size="7">${it.sub}</text>`
              })
              // line overlay
              if (lineKey && lineVals.some(v=>v>0)) {
                const pts = items.map((it,pi) => {
                  const val = Number((it as any)[lineKey])||0
                  const cx = pi*COL_W + 2 + (COL_W-4)/2
                  const cy = val > 0 ? TOP + BAR_H - (val/maxLine)*BAR_H*0.85 : null
                  return {cx, cy, val}
                }).filter(pt => pt.cy !== null)
                if (pts.length > 1) svg += `<polyline points="${pts.map(p=>`${p.cx.toFixed(1)},${p.cy!.toFixed(1)}`).join(' ')}" fill="none" stroke="${lineColor||'#34d399'}" stroke-width="1.5" stroke-dasharray="4,2"/>`
                pts.forEach(pt => {
                  svg += `<circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy!.toFixed(1)}" r="3" fill="${lineColor||'#34d399'}" stroke="#fff" stroke-width="1"/>`
                  svg += `<text x="${pt.cx.toFixed(1)}" y="${(pt.cy!-5).toFixed(1)}" text-anchor="middle" fill="${lineColor||'#34d399'}" font-size="7" font-weight="700">${pt.val}</text>`
                })
              }
              svg += '</svg>'
              return svg
            }
            const mkChartBlock = (title: string, color: string, svgHtml: string, legendItems: {label:string,color:string}[]) => `
              <div style="border:1px solid ${color}30;border-radius:8px;padding:10px;page-break-inside:avoid;">
                <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.06em;text-align:center;padding-bottom:5px;border-bottom:1px solid ${color}20;margin-bottom:6px;">${title}</div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                  ${legendItems.map(l=>`<span style="display:flex;align-items:center;gap:3px;font-size:8px;color:#555;"><span style="width:8px;height:8px;border-radius:2px;background:${l.color};display:inline-block;"></span>${l.label}</span>`).join('')}
                </div>
                ${svgHtml}
              </div>`

            const thS = (c: string) => `padding:4px 8px;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};white-space:nowrap;background:#f8fafc;`
            const tdS = (c: string, b=false) => `padding:5px 8px;text-align:center;font-family:monospace;font-size:10px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;`
            const thL = (c: string) => `padding:4px 12px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};background:#f8fafc;`
            const tdL = (c: string, b=false) => `padding:5px 12px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;font-size:10px;`
            const pctColor = (p: number|null) => p===null?'#aaa':p>=80?'#15803d':p>=50?'#b45309':'#dc2626'

            const activeMDs = MD_ORDER_LOCAL.filter(md => existingMdLabels.has(md) && calSesiones.has(md))
            const trainingMDs = activeMDs.filter(md => md !== 'MD')

            // Cuadro 1: RPE por jugador x MD
            const c1 = `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
              <thead><tr>
                <th style="${thL('#555')}">Jugador</th>
                ${activeMDs.map(md=>`<th style="${thS('#c8f135')}">${md}</th>`).join('')}
                <th style="${thS('#60a5fa')}">Total UA</th>
              </tr></thead><tbody>
              ${players.map((p:any,i:number)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                <td style="${tdL('#111',true)}">${p.nombre}</td>
                ${activeMDs.map(md=>{const s=(perSessionPlayers[md]||[]).find((x:any)=>x.jugador_id===p.jugador_id);const val=Number(s?.rpe)||0;return`<td style="${tdS(val?'#c8f135':'#ccc',!!val)}">${val||'—'}</td>`}).join('')}
                <td style="${tdS('#60a5fa',!!Number(p.ua_total))}">${Number(p.ua_total)||'—'}</td>
              </tr>`).join('')}
              <tr style="background:#eff6ff;border-top:2px solid #93c5fd;">
                <td style="${tdL('#1d4ed8',true)} font-size:9px;">PROM. EQUIPO</td>
                ${activeMDs.map(md=>{const val=Number(perSessionTeamAvg[md]?.rpe)||0;return`<td style="${tdS(val?'#c8f135':'#ccc',!!val)}">${val||'—'}</td>`}).join('')}
                <td style="${tdS('#60a5fa',true)}">${(()=>{const vs=players.map((p:any)=>Number(p.ua_total)||0).filter(x=>x>0);return vs.length?(vs.reduce((s:number,x:number)=>s+x,0)/vs.length).toFixed(0):'—'})()}</td>
              </tr></tbody>
            </table>`

            // Cuadro 2: UA por jugador x MD
            const c2 = `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
              <thead><tr>
                <th style="${thL('#555')}">Jugador</th>
                ${activeMDs.map(md=>`<th style="${thS('#60a5fa')}">${md}</th>`).join('')}
                <th style="${thS('#34d399')}">Total</th>
              </tr></thead><tbody>
              ${players.map((p:any,i:number)=>`<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                <td style="${tdL('#111',true)}">${p.nombre}</td>
                ${activeMDs.map(md=>{const s=(perSessionPlayers[md]||[]).find((x:any)=>x.jugador_id===p.jugador_id);const val=Number(s?.ua_total)||0;return`<td style="${tdS(val?'#60a5fa':'#ccc',!!val)}">${val||'—'}</td>`}).join('')}
                <td style="${tdS('#34d399',!!Number(p.ua_total))}">${Number(p.ua_total)||'—'}</td>
              </tr>`).join('')}
              <tr style="background:#eff6ff;border-top:2px solid #93c5fd;">
                <td style="${tdL('#1d4ed8',true)} font-size:9px;">PROM. EQUIPO</td>
                ${activeMDs.map(md=>{const val=Number(perSessionTeamAvg[md]?.ua_total)||0;return`<td style="${tdS(val?'#60a5fa':'#ccc',!!val)}">${val||'—'}</td>`}).join('')}
                <td style="${tdS('#34d399',true)}">${(()=>{const vs=players.map((p:any)=>Number(p.ua_total)||0).filter(x=>x>0);return vs.length?(vs.reduce((s:number,x:number)=>s+x,0)/vs.length).toFixed(0):'—'})()}</td>
              </tr></tbody>
            </table>`

            // Cuadro 3: GPS calculado por MD
            const c3 = `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
              <thead><tr>
                <th style="${thL('#555')}">Métrica</th>
                ${activeMDs.map(md=>`<th style="${thS('#f59e0b')}">${md}</th>`).join('')}
                <th style="${thS('#059669')}">Total</th>
              </tr></thead><tbody>
              ${VARS.map((v:any,i:number)=>{
                const vals=activeMDs.map(md=>Number(perSession[md]?.[v.key])||0)
                const tot=vals.reduce((s:number,x:number)=>s+x,0)
                const vc=v.color.replace('var(--lime)','#4a7c00').replace('var(--silver)','#888')
                return`<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                  <td style="${tdL(vc,true)}">${v.label}</td>
                  ${vals.map(val=>`<td style="${tdS(val?vc:'#ccc',!!val)}">${val||'—'}</td>`).join('')}
                  <td style="${tdS('#059669',tot>0)}">${tot||'—'}</td>
                </tr>`
              }).join('')}
              </tbody>
            </table>`

            // ══ CUADRO 6: CONTROL DE INTENSIDAD RELATIVA (CALC PDF) ══
            const c6_trainingMds = mdCols.filter(md => existingMdLabels.has(md) && (Number(perSession[md]?.minActivo) > 0 || Number(perSessionTeamAvg[md]?.minActivo) > 0))
            let c6 = ''
            let charts3 = ''
            if (c6_trainingMds.length > 0) {
              const rows = c6_trainingMds.map(md => {
                const m = perSession[md] || {}
                const mt = perSessionTeamAvg[md] || {}
                const dTotal = Number(m.distTotal)||Number(mt.distTotal)||0
                const dPerMin = Number(m.distPerMin)||Number(mt.distPerMin)||0
                const activeMin = (dTotal>0 && dPerMin>0) ? (dTotal/dPerMin) : (Number(m.minActivo)||Number(mt.minActivo)||1)
                
                const metMin = dPerMin > 0 ? dPerMin : (dTotal/activeMin)
                const sprintMin = (Number(m.distSprint)||Number(mt.distSprint)||0)/activeMin
                const nSprintMin = (Number(m.nSprints)||Number(mt.nSprints)||0)/activeMin
                const acelDecelMin = ((Number(m.nAcel)||Number(mt.nAcel)||0) + (Number(m.nDecel)||Number(mt.nDecel)||0))/activeMin
                
                return { name: md, md, activeMin, metMin, sprintMin, nSprintMin, acelDecelMin }
              })
              
              c6 = `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                <thead><tr>
                  <th style="${thL('#555')}">MD</th>
                  <th style="${thS('#84cc16')}">Tiempo (min)</th>
                  <th style="${thS('#60a5fa')}">Met/min</th>
                  <th style="${thS('#f59e0b')}">D.Spr/min</th>
                  <th style="${thS('#ec4899')}">Spr/min</th>
                  <th style="${thS('#34d399')}">Acel+Dec/min</th>
                </tr></thead>
                <tbody>
                  ${rows.map((r,i)=>`<tr style="background:${i%2===0?'#fff':'#fafafa'};">
                    <td style="${tdL('#111',true)}">${r.md}</td>
                    <td style="${tdS('#84cc16',true)}">${r.activeMin>0?r.activeMin.toFixed(1):'-'}</td>
                    <td style="${tdS('#60a5fa',r.metMin>0)}">${r.metMin>0?r.metMin.toFixed(1):'-'}</td>
                    <td style="${tdS('#f59e0b',r.sprintMin>0)}">${r.sprintMin>0?r.sprintMin.toFixed(2):'-'}</td>
                    <td style="${tdS('#ec4899',r.nSprintMin>0)}">${r.nSprintMin>0?r.nSprintMin.toFixed(3):'-'}</td>
                    <td style="${tdS('#34d399',r.acelDecelMin>0)}">${r.acelDecelMin>0?r.acelDecelMin.toFixed(2):'-'}</td>
                  </tr>`).join('')}
                </tbody>
              </table>`
              
              charts3 = [
                mkChartBlock('Metros / min','#60a5fa',mkBars(rows as any,[{key:'metMin',label:'Met/min',color:'#60a5fa'}]),[{label:'Met/min',color:'#60a5fa'}]),
                mkChartBlock('Dist. Sprint / min','#f59e0b',mkBars(rows as any,[{key:'sprintMin',label:'D.Spr/min',color:'#f59e0b'}]),[{label:'D.Spr/min',color:'#f59e0b'}]),
                mkChartBlock('Sprints / min','#ec4899',mkBars(rows as any,[{key:'nSprintMin',label:'Spr/min',color:'#ec4899'}]),[{label:'Spr/min',color:'#ec4899'}]),
                mkChartBlock('Acel+Decel / min','#34d399',mkBars(rows as any,[{key:'acelDecelMin',label:'A+D/min',color:'#34d399'}]),[{label:'A+D/min',color:'#34d399'}]),
              ].join('')
            }

            // Cuadro 4: % sobre partido
            const hasRef = Object.keys(refMedia).length > 0
            const pct = (val:number, key:string) => { const r=refMedia[key]; if(!r) return null; return Math.round((val/r)*100) }
            const c4 = hasRef ? `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:8px;">
              <thead><tr>
                <th style="${thL('#555')}">Jugador / MD</th>
                ${VARS.map((v:any)=>`<th style="${thS(v.color.replace('var(--lime)','#4a7c00').replace('var(--silver)','#888'))}">${v.label}</th>`).join('')}
              </tr></thead><tbody>
              ${players.map((p:any,i:number)=>{
                const getV=(key:string)=>{const vs=trainingMDs.map(md=>(perSessionPlayers[md]||[]).find((x:any)=>x.jugador_id===p.jugador_id)?.[key]||0).filter((x:number)=>x>0);return vs.length?vs.reduce((s:number,x:number)=>s+x,0)/vs.length:0}
                return`<tr style="background:${i%2===0?'#fff':'#fafafa'};">
                  <td style="${tdL('#111',true)}">${p.nombre}</td>
                  ${VARS.map((v:any)=>{const pv=pct(getV(v.key),v.key);return`<td style="${tdS(pctColor(pv),pv!==null)}">${pv!==null?pv+'%':'—'}</td>`}).join('')}
                </tr>`
              }).join('')}
              ${trainingMDs.map(md=>`<tr style="background:#fff5f5;">
                <td style="${tdL('#dc2626',true)} font-size:9px;">${md}</td>
                ${VARS.map((v:any)=>{const pv=pct(Number(perSessionTeamAvg[md]?.[v.key])||0,v.key);return`<td style="${tdS(pctColor(pv),pv!==null)}">${pv!==null?pv+'%':'—'}</td>`}).join('')}
              </tr>`).join('')}
              <tr style="background:#fff5f5;border-top:2px solid #fca5a5;">
                <td style="${tdL('#dc2626',true)} font-size:9px;">MD = 100%</td>
                ${VARS.map(()=>`<td style="${tdS('#15803d',true)}">100%</td>`).join('')}
              </tr>
              </tbody></table>` : ''

            // Charts: jugadores (UA, RPE) + por MD (GRUPOS)
            const playerItems = players.map((p:any) => ({ name: p.nombre.split(' ')[0], sub: p.posicion, ua_total:Number(p.ua_total)||0, rpe:Number(p.rpe)||0, minActivo:Number(p.minActivo)||0 }))
            const mdItems = activeMDs.map(md => { const s=perSession[md]||{}; return { name: md, ...Object.fromEntries(VARS.map((v:any)=>[v.key,Number(s[v.key])||0])) } })

            const charts1 = [
              mkChartBlock('UA por Jugador','#60a5fa',mkBars(playerItems as any,[{key:'ua_total',label:'UA',color:'#60a5fa'}]),[{label:'UA',color:'#60a5fa'}]),
              mkChartBlock('RPE por Jugador','#c8f135',mkBars(playerItems as any,[{key:'rpe',label:'RPE',color:'#c8f135'}]),[{label:'RPE',color:'#c8f135'}]),
              mkChartBlock('Minutos por Jugador','#34d399',mkBars(playerItems as any,[{key:'minActivo',label:'Min',color:'#34d399'}]),[{label:'Min',color:'#34d399'}]),
            ].join('')

            const GRUPOS_PDF = [
              {label:'DT + Tiempo', bars:[{key:'distTotal',label:'DT (m)',color:'#f59e0b'}], lineKey:'minActivo', lineColor:'#34d399'},
              {label:'Sprint + Nº Sprint', bars:[{key:'distSprint',label:'Dist. Sprint',color:'#f97316'},{key:'nSprints',label:'Nº Sprints',color:'#a78bfa'}], lineKey:null},
              {label:'Acc + Dec >2', bars:[{key:'nAcel',label:'Ace >2',color:'#ec4899'},{key:'nDecel',label:'Dec >2',color:'#14b8a6'}], lineKey:null},
              {label:'Acc + Dec >3', bars:[{key:'nAcel3',label:'Ace >3',color:'#f43f5e'},{key:'nDecel3',label:'Dec >3',color:'#0ea5e9'}], lineKey:null},
              {label:'Alta Potencia', bars:[{key:'distMP',label:'Alta Pot.',color:'#fbbf24'}], lineKey:null},
            ]
            const charts2 = GRUPOS_PDF.map(g => {
              const hasData = mdItems.some((it:any)=>g.bars.some(b=>it[b.key]>0))
              if (!hasData) return ''
              return mkChartBlock(g.label, g.bars[0].color, mkBars(mdItems as any, g.bars as any, g.lineKey||undefined, '#34d399'), g.bars as any)
            }).join('')

            const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>W&P Ctrl. Carga Calc ${dateRange.desde} – ${dateRange.hasta}</title>
              <style>body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:12px;font-size:10px;}
              h2{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;padding-bottom:5px;}
              .sec{margin-bottom:20px;}.pb{page-break-before:always;}
              .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
              .grid3{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
              @media print{@page{size:A4 landscape;margin:.8cm;}body{padding:0;}.np{display:none;}.pb{page-break-before:always;}.grid3{grid-template-columns:1fr 1fr;}}</style></head><body>
              <div class="np" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;">
                <button className="hover-scale" onClick={() => window.print()} className="btn-ghost-blue" style={{ padding: "8px 20px" }}>🖨️ Imprimir / Guardar PDF</button>
                <span style="font-size:11px;color:#666;">Orientación: Horizontal (Landscape)</span>
              </div>
              <div style="background:#0f172a;color:#c8f135;padding:8px 16px;border-radius:6px;margin-bottom:12px;display:flex;justify-content:space-between;">
                <b style="font-size:13px;">W&P — CONTROL DE CARGA · CALCULADO</b>
                <span style="font-size:10px;color:#94a3b8;">${dateRange.desde} → ${dateRange.hasta}</span>
              </div>
              <div class="sec">
                <h2 style="color:#c8f135;border-bottom:2px solid #c8f135;">CUADRO 1 · RPE POR JUGADOR Y MD</h2>${c1}
              </div>
              <div class="sec pb">
                <h2 style="color:#60a5fa;border-bottom:2px solid #93c5fd;">CUADRO 2 · UA (RPE × MIN) POR JUGADOR Y MD</h2>${c2}
              </div>
              <div class="sec pb">
                <h2 style="color:#f59e0b;border-bottom:2px solid #fde68a;">CUADRO 3 · CARGA GPS CALCULADA POR SESIÓN</h2>${c3}
              </div>
              ${hasRef ? `<div class="sec pb"><h2 style="color:#dc2626;border-bottom:2px solid #fca5a5;">CUADRO 4 · VOLUMEN RELATIVO</h2>${c4}</div>` : ''}
              <div class="sec pb">
                <h2 style="color:#60a5fa;border-bottom:2px solid #93c5fd;">📊 GRÁFICOS POR JUGADOR</h2>
                <div class="grid3">${charts1}</div>
              </div>
              <div class="sec pb">
                <h2 style="color:#f59e0b;border-bottom:2px solid #fde68a;">📊 GRÁFICOS CARGA CALCULADA POR MD</h2>
                <div class="grid3">${charts2}</div>
              </div>
              ${c6 ? `<div class="sec pb">
                <h2 style="color:#a855f7;border-bottom:2px solid #c084fc;">CUADRO 6 — CONTROL DE INTENSIDAD RELATIVA (/ MINUTO)</h2>
                ${c6}
                <div class="grid3" style="margin-top:16px;">${charts3}</div>
              </div>` : ''}
            </body></html>`
            win.document.write(html); win.document.close()
          }} className="btn-ghost-lime">🖨️ PDF</button>
          <button className="hover-scale" onClick={()=>cargar()} disabled={loading} title="Actualizar datos" className="btn-ghost-blue">🔄 {loading?'Cargando…':'Actualizar'}</button>
        </div>
      </div>

      {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--silver)' }}>Cargando...</div> :
      !players.length ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:16 }}>Sin datos para este período. Registrá sesiones con RPE en el Calendario.</div>
      ) : (<>

      {/* ══ UCE SIN GPS — TABLA PRINCIPAL ══════════════════════════════ */}
      {(() => {
        const REF_UCE_SEMANA = 9500
        // Compute semana totals
        let ceTotalSemana = 0, uceTotalSemana = 0
        const rows = mdCols.map(md => {
          const ce = cePerSession[md]
          if (!ce || !ce.ce_total) return { md, ce_total: 0, uce_total: 0, rpe: 0, bloques: [] }
          const uce = ce.rpe_objetivo ? Math.round(ce.ce_total * ce.rpe_objetivo) : 0
          ceTotalSemana += ce.ce_total
          uceTotalSemana += uce
          return { md, ce_total: ce.ce_total, uce_total: uce, rpe: ce.rpe_objetivo, bloques: ce.bloques || [] }
        }).filter(r => r.ce_total > 0)

        const pctSemana = REF_UCE_SEMANA > 0 ? Math.round((uceTotalSemana / REF_UCE_SEMANA) * 100) : 0
        const statusColor = pctSemana < 35 ? '#22c55e' : pctSemana < 60 ? '#f59e0b' : '#ef4444'
        const statusLabel = pctSemana < 35 ? 'RECUPERACIÓN' : pctSemana < 60 ? 'MANTENIMIENTO' : 'CARGA ALTA'

        return (
          <div style={{ marginBottom:28, background:'var(--ink2)', border:'1px solid rgba(200,241,53,.25)', borderRadius:16, overflow:'hidden' }}>
            {/* Header */}
            <div style={{ background:'rgba(200,241,53,.06)', borderBottom:'1px solid rgba(200,241,53,.15)', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <p style={{ fontSize:13, fontWeight:800, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>
                  🏋️ UCE · UNIDAD DE CARGA ESPECÍFICA · SIN GPS
                </p>
                <p style={{ fontSize:10, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>
                  CE = Min × NE (Nivel Especificidad) · UCE = CE × RPE · Referencia: ~{REF_UCE_SEMANA.toLocaleString()} UCE/semana
                </p>
              </div>
              <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:9, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>SEMANA TOTAL</p>
                <p style={{ fontSize:32, fontWeight:900, color: uceTotalSemana > 0 ? statusColor : 'var(--fog)', fontFamily:'Bebas Neue,sans-serif', lineHeight:1 }}>
                  {uceTotalSemana > 0 ? `${uceTotalSemana.toLocaleString()} UCE` : '— UCE'}
                </p>
                {uceTotalSemana > 0 && (
                  <p style={{ fontSize:10, fontWeight:700, color: statusColor }}>● {statusLabel}</p>
                )}
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX:'auto' }}>
              <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--mist)' }}>
                    {['SESIÓN','RPE obj.','BLOQUES (TAREA · MIN · NE · CE)','CE TOTAL','UCE TOTAL','% REF'].map((h,i) => (
                      <th key={h} style={{ padding:'8px 12px', textAlign: i<=2?'left':'center', fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={6} style={{ padding:'24px', textAlign:'center', color:'var(--fog)', fontSize:12, fontStyle:'italic' }}>
                      Sin datos CE. Agregá tareas con Minutos y NE en las sesiones del Calendario.
                    </td></tr>
                  )}
                  {rows.map((row, ri) => {
                    const pctRow = row.uce_total && REF_UCE_SEMANA ? Math.round((row.uce_total/REF_UCE_SEMANA)*100) : null
                    const rowColor = !pctRow ? 'var(--fog)' : pctRow < 35 ? '#22c55e' : pctRow < 60 ? '#f59e0b' : '#ef4444'
                    const rowStatus = !pctRow ? '' : pctRow < 35 ? 'RECUPERACIÓN' : pctRow < 60 ? 'MANTENIMIENTO' : 'CARGA ALTA'
                    return (
                      <tr key={ri} style={{ borderBottom:'1px solid rgba(255,255,255,.04)', background: ri%2===0?'transparent':'rgba(255,255,255,.02)' }}>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:16, color:'var(--lime)', letterSpacing:'0.06em' }}>{row.md}</span>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          {row.rpe ? <span style={{ fontSize:13, fontWeight:700, color:'#f97316', fontFamily:'DM Mono,monospace' }}>{row.rpe}</span> : <span style={{ color:'var(--fog)' }}>—</span>}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {row.bloques.map((bl:any, bi:number) => (
                              <span key={bi} style={{ background:'rgba(200,241,53,.08)', border:'1px solid rgba(200,241,53,.2)', borderRadius:6, padding:'3px 8px', fontSize:11, fontFamily:'DM Mono,monospace', whiteSpace:'nowrap' }}>
                                <span style={{ color:'var(--snow)' }}>{bl.ventana?.slice(0,18)}</span>
                                <span style={{ color:'var(--fog)' }}> · {bl.minTotal}min · </span>
                                <span style={{ color:'var(--lime)' }}>NE{bl.ne}</span>
                                <span style={{ color:'var(--fog)' }}> · </span>
                                <span style={{ color:'#c8f135', fontWeight:700 }}>CE{bl.ce}</span>
                                {row.rpe > 0 && <>
                                  <span style={{ color:'var(--fog)' }}> → </span>
                                  <span style={{ color:'#f59e0b', fontWeight:700 }}>{Math.round(bl.ce*row.rpe)} UCE</span>
                                </>}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:'#c8f135' }}>{row.ce_total}</span>
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          {row.uce_total > 0 ? (
                            <div>
                              <div style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:rowColor, fontSize:15 }}>{row.uce_total.toLocaleString()}</div>
                              {rowStatus && <div style={{ fontSize:8, color:rowColor, fontWeight:700 }}>● {rowStatus}</div>}
                            </div>
                          ) : <span style={{ color:'var(--fog)' }}>—</span>}
                        </td>
                        <td style={{ padding:'10px 12px', textAlign:'center' }}>
                          {pctRow !== null ? <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:rowColor }}>{pctRow}%</span> : <span style={{ color:'var(--fog)' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {/* Semana total row */}
                {rows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop:'2px solid rgba(200,241,53,.3)', background:'rgba(200,241,53,.04)' }}>
                      <td colSpan={3} style={{ padding:'10px 12px', fontWeight:800, color:'var(--lime)', fontSize:12, textTransform:'uppercase', letterSpacing:'0.06em' }}>SEMANA</td>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#c8f135', fontSize:14 }}>{ceTotalSemana}</td>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:statusColor, fontSize:18 }}>{uceTotalSemana > 0 ? uceTotalSemana.toLocaleString() : '—'}</td>
                      <td style={{ padding:'10px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:statusColor }}>{pctSemana > 0 ? `${pctSemana}%` : '—'}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Reference legend */}
            <div style={{ padding:'10px 20px', borderTop:'1px solid var(--mist)', display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:9, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em' }}>REFERENCIA ({REF_UCE_SEMANA.toLocaleString()} UCE/semana):</span>
              <span style={{ fontSize:11, color:'#22c55e' }}>● &lt;35% (&lt;{Math.round(REF_UCE_SEMANA*.35).toLocaleString()}) Recuperación</span>
              <span style={{ fontSize:11, color:'#f59e0b' }}>● 35-60% ({Math.round(REF_UCE_SEMANA*.35).toLocaleString()}–{Math.round(REF_UCE_SEMANA*.6).toLocaleString()}) Mantenimiento</span>
              <span style={{ fontSize:11, color:'#ef4444' }}>● &gt;60% (&gt;{Math.round(REF_UCE_SEMANA*.6).toLocaleString()}) Carga alta</span>
            </div>
          </div>
        )
      })()}

      {/* ══ CUADRO 1: MICROCICLO — INDIVIDUAL + SESIÓN (CALCULADA) ══════ */}
      <div style={{ marginBottom:20 }}>
        <div style={{ padding:'10px 0 12px' }}>
          <CuadroHeader icon={Icons.equipo} cuadroNum="1" title="MICROCICLO – DATOS POR SESIÓN – MD+1 ➔ MD" description="Izquierda: datos individuales por jugador · Derecha: datos de sesión calculada (iguales para todos)" color="var(--lime)" />

        </div>
        {mdCols.map((md:string) => {
          const ses = sesionesInfo.find((s:any) => s.titulo === md)
          const sesData = perSession[md] || {}
          const hasData = existingMdLabels.has(md)
          // Per-session player data: exact RPE/time for this session date (not aggregated)
          // Never fall back to week-aggregate `players` — that replicates one day's RPE
          // (e.g. Sunday's log) across every session column (Friday, Saturday…).
          const mdPlayers: any[] = perSessionPlayers[md] || []
          const mdTeamAvg: any = perSessionTeamAvg[md] || {}
          const SESSION_VARS = [
            {key:'distTotal',  label:'DT (m)',          color:'#f59e0b'},
            {key:'distSprint', label:'Dist. Sprint (m)',color:'#f97316'},
            {key:'nSprints',   label:'Nº Sprint',       color:'#a78bfa'},
            {key:'nAcel',      label:'ACE >2',          color:'#ec4899'},
            {key:'nDecel',     label:'DEC >2',          color:'#14b8a6'},
            {key:'nAcel3',     label:'ACE >3 (n)',      color:'#f43f5e'},
            {key:'nDecel3',    label:'DEC >3 (n)',      color:'#0ea5e9'},
            {key:'distMP',     label:'Alta Pot.',       color:'#fbbf24'},
          ]
          return (
            <div key={md} style={{ background:'var(--ink2)', border:`1px solid ${hasData?'rgba(200,241,53,.2)':'var(--mist)'}`, borderRadius:14, overflow:'hidden', marginBottom:12, opacity:hasData?1:0.5 }}>
              {/* MD Header */}
              <div style={{ padding:'8px 16px', background:hasData?'rgba(200,241,53,.06)':'rgba(255,255,255,.02)', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:800, color:hasData?'var(--lime)':'var(--fog)', fontFamily:'Bebas Neue,sans-serif', letterSpacing:'0.1em' }}>{md}</span>
                {ses ? (
                  <span style={{ fontSize:10, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>{ses.fecha}</span>
                ) : (
                  <span style={{ fontSize:10, color:'var(--fog)', fontStyle:'italic' }}>Sin sesión asignada</span>
                )}
              </div>
              {hasData ? (
                <>
                <div style={{ overflowX:'auto' }}>
                  <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr>
                        {/* Individual cols */}
                        <th colSpan={5} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(96,165,250,.06)', color:'#60a5fa', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--mist)', borderRight:'2px solid rgba(200,241,53,.3)' }}>
                          DATOS INDIVIDUALES
                        </th>
                        {/* Session cols */}
                        <th colSpan={SESSION_VARS.length} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(200,241,53,.06)', color:'var(--lime)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--mist)' }}>
                          DATOS SESIÓN (calculadora) — iguales para todos
                        </th>
                      </tr>
                      <tr style={{ background:'rgba(255,255,255,.02)' }}>
                        <th style={{ padding:'5px 14px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:'1px solid var(--mist)' }}>Jugador</th>
                        <th style={{ padding:'5px 8px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>Pos.</th>
                        <th style={{ padding:'5px 8px', textAlign:'center', color:'#c8f135', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>RPE</th>
                        <th style={{ padding:'5px 8px', textAlign:'center', color:'#34d399', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>Tiempo</th>
                        <th style={{ padding:'5px 8px', textAlign:'center', color:'#60a5fa', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)', borderRight:'2px solid rgba(200,241,53,.3)' }}>UA</th>
                        {SESSION_VARS.map(sv => (
                          <th key={sv.key} style={{ padding:'5px 8px', textAlign:'center', color:sv.color, fontSize:8, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:'1px solid var(--mist)', background:'rgba(200,241,53,.03)' }}>{sv.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mdPlayers.map((p:any, i:number) => (
                        <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                          <td style={{ padding:'6px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                          <td style={{ padding:'6px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:p.rpe?'#c8f135':'var(--fog)' }}>{p.rpe??'—'}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:p.minActivo?'#34d399':'var(--fog)' }}>{p.minActivo??'—'}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:p.ua_total?'#60a5fa':'var(--fog)', borderRight:'2px solid rgba(200,241,53,.3)' }}>{p.rpe && p.minActivo ? Math.round(p.rpe * p.minActivo) : (p.ua_total??'—')}</td>
                          {SESSION_VARS.map((sv, si) => {
                            // Session data is the same for all players — highlight in lime
                            const val = Math.round(Number(sesData[sv.key])||0)
                            return (
                              <td key={sv.key} style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace',
                                color: val > 0 ? sv.color : 'var(--fog)',
                                background:'rgba(200,241,53,.04)',
                                fontWeight: val > 0 ? 700 : 400 }}>
                                {val > 0 ? val : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {/* PROM row */}
                      <tr style={{ borderTop:'2px solid rgba(200,241,53,.3)', background:'rgba(200,241,53,.04)' }}>
                        <td style={{ padding:'6px 14px', fontWeight:800, color:'var(--lime)', fontSize:10, textTransform:'uppercase' }}>PROM.</td>
                        <td/>
                        <td style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:mdTeamAvg.rpe?'#c8f135':'var(--fog)' }}>{mdTeamAvg.rpe??'—'}</td>
                        <td style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:mdTeamAvg.minActivo?'#34d399':'var(--fog)' }}>{mdTeamAvg.minActivo??'—'}</td>
                        <td style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:mdTeamAvg.ua_total?'#60a5fa':'var(--fog)', borderRight:'2px solid rgba(200,241,53,.3)' }}>{mdTeamAvg.rpe && mdTeamAvg.minActivo ? Math.round(mdTeamAvg.rpe * mdTeamAvg.minActivo) : (mdTeamAvg.ua_total??'—')}</td>
                        {SESSION_VARS.map(sv => {
                          const val = Math.round(Number(sesData[sv.key])||0)
                          return (
                            <td key={sv.key} style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:val>0?sv.color:'var(--fog)', background:'rgba(200,241,53,.06)' }}>
                              {val > 0 ? val : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* ── Gráficos comparativos estilo Catapult ── */}
                {(() => {
                  // Data per player per bar metric
                  const GROUPS = [
                    {
                      title: 'UA + RPE', color: '#c8f135',
                      bars: [
                        { key:'ua_total', label:'UA', color:'#60a5fa' },
                      ],
                      line: { key:'rpe', label:'RPE', color:'#c8f135' },
                    },
                    {
                      title: 'RESISTENCIA', color: '#3b82f6',
                      bars: [
                        { key:'distTotal', label:'DT (m)', color:'#3b82f6' },
                      ],
                      line: { key:'minActivo', label:'Min Entrenamiento', color:'#f59e0b' },
                    },
                    {
                      title: 'VELOCIDAD', color: '#a78bfa',
                      bars: [
                        { key:'distSprint', label:'Sprint (m)', color:'#ec4899' },
                        { key:'nSprints',   label:'Nº Sprint',  color:'#a78bfa' },
                      ],
                      line: null,
                    },
                    {
                      title: 'FUERZA', color: '#ef4444',
                      bars: [
                        { key:'nDecel', label:'DEC >2 (m)', color:'#ef4444' },
                        { key:'nAcel',  label:'ACE >2 (m)', color:'#3b82f6' },
                      ],
                      line: null,
                    },
                    {
                      title: 'ACC/DEC >3', color: '#f43f5e',
                      bars: [
                        { key:'nDecel3', label:'DEC >3 (n)', color:'#f43f5e' },
                        { key:'nAcel3',  label:'ACE >3 (n)', color:'#0ea5e9' },
                      ],
                      line: null,
                    },
                    {
                      title: 'ALTA POT.', color: '#fbbf24',
                      bars: [
                        { key:'distMP', label:'Alta Pot. (m)', color:'#fbbf24' },
                      ],
                      line: null,
                    },
                  ]
                  const BAR_H = 180

                  // Position colors
                  const POS_COLS: Record<string,string> = {}
                  const POS_LIST = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#a78bfa','#ec4899','#06b6d4','#fbbf24']
                  mdPlayers.forEach((p:any, i:number) => { POS_COLS[p.nombre] = POS_LIST[i % POS_LIST.length] })

                  return (
                    <div style={{ padding:'16px', borderTop:'2px solid rgba(200,241,53,.15)', background:'rgba(0,0,0,.25)' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>
                        📊 COMPARATIVA ENTRE JUGADORES · {md}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }}>
                        {GROUPS.map(grp => {
                          // CALC panel: usa SIEMPRE datos de la calculadora (sesión planificada)
                          // Los datos GPS reales se muestran en Ctrl. Carga GPS, no acá
                          const GPS_BAR_KEYS = new Set(['distTotal','distSprint','nSprints','nAcel','nDecel','distMP','nAcel3','nDecel3'])
                          const getBarVal = (p: any, key: string) => {
                            // Métricas GPS → valor calculado de la sesión (igual para todos los jugadores)
                            if (GPS_BAR_KEYS.has(key)) return Math.round(Number(sesData[key])||0)
                            // Métricas individuales (RPE, UA, tiempo) → dato real del jugador
                            return Number(p[key])||0
                          }

                          const isIndividual = grp.title === 'UA + RPE'
                          
                          if (!isIndividual) {
                            const avgVals = grp.bars.map(b => {
                              const sum = mdPlayers.reduce((acc: number, p: any) => acc + getBarVal(p, b.key), 0)
                              return { ...b, val: mdPlayers.length ? Math.round(sum / mdPlayers.length) : 0 }
                            })
                            let lineAvg = 0
                            if (grp.line) {
                              const sumLine = mdPlayers.reduce((acc: number, p: any) => acc + (Number(p[grp.line!.key])||0), 0)
                              lineAvg = mdPlayers.length ? Math.round(sumLine / mdPlayers.length) : 0
                            }
                            
                            const maxVal = Math.max(...avgVals.map(b => b.val), 1)

                            return (
                              <div key={grp.title} style={{ background:'var(--ink2)', borderRadius:12, padding:'16px', border:`1px solid ${grp.color}30` }}>
                                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                                  <div style={{ fontSize:13, fontWeight:800, color:grp.color, textTransform:'uppercase', letterSpacing:'0.08em' }}>
                                    {grp.title}
                                  </div>
                                  <div style={{ fontSize:10, color:'var(--silver)', background:'rgba(255,255,255,.05)', padding:'2px 6px', borderRadius:4 }}>
                                    PROMEDIO EQUIPO
                                  </div>
                                </div>
                                
                                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                                  {avgVals.map((b, i) => {
                                    const pct = b.val > 0 ? Math.min(100, (b.val / maxVal) * 100) : 0
                                    return (
                                      <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                                        <div style={{ width: 80, fontSize:11, color:'var(--silver)', textAlign:'right' }}>{b.label}</div>
                                        <div style={{ flex:1, height:12, background:`${b.color}18`, borderRadius:6, position:'relative' }}>
                                          <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${pct}%`, background:b.color, borderRadius:6, transition:'width 0.3s' }} />
                                        </div>
                                        <div style={{ width: 50, fontSize:13, fontWeight:700, color:b.color, fontFamily:'DM Mono,monospace' }}>{b.val}</div>
                                      </div>
                                    )
                                  })}
                                  {grp.line && (
                                    <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:4, paddingTop:12, borderTop:'1px dashed rgba(255,255,255,.05)' }}>
                                      <div style={{ width: 80, fontSize:11, color:'var(--silver)', textAlign:'right' }}>{grp.line.label}</div>
                                      <div style={{ flex:1, display:'flex', alignItems:'center', gap:8 }}>
                                        <div style={{ width:10, height:10, borderRadius:'50%', background:grp.line.color, border:'2px solid #000' }} />
                                        <div style={{ height:2, background:grp.line.color, flex:1, opacity:0.3, borderStyle:'dashed' }} />
                                      </div>
                                      <div style={{ width: 50, fontSize:13, fontWeight:700, color:grp.line.color, fontFamily:'DM Mono,monospace' }}>{lineAvg}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          }

                          const allBarVals = mdPlayers.flatMap((p:any) => grp.bars.map(b => getBarVal(p, b.key)))
                          const maxBar = Math.max(...allBarVals, 1)
                          // Show a note when all GPS bar values are 0 (no session blocks defined)
                          const allGpsZero = grp.bars.every(b => GPS_BAR_KEYS.has(b.key)) && allBarVals.every(v => v === 0)
                          const lineVals = grp.line ? mdPlayers.map((p:any) => Number(p[grp.line!.key])||0) : []
                          const maxLine = Math.max(...lineVals, 1)

                          return (
                            <div key={grp.title} style={{ background:'var(--ink2)', borderRadius:12, padding:14, border:`1px solid ${grp.color}30` }}>
                              {/* Chart title */}
                              <div style={{ fontSize:13, fontWeight:800, color:grp.color, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', marginBottom:4, borderBottom:`1px solid ${grp.color}30`, paddingBottom:6 }}>
                                {grp.title}
                              </div>
                              {/* Legend */}
                              <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:10 }}>
                                {grp.bars.map(b => (
                                  <span key={b.key} style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--silver)' }}>
                                    <span style={{ width:10, height:10, borderRadius:2, background:b.color, display:'inline-block', flexShrink:0 }}/>
                                    {b.label}
                                  </span>
                                ))}
                                {grp.line && (
                                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--silver)' }}>
                                    <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={grp.line.color} strokeWidth="2" strokeDasharray="4,2"/><circle cx="8" cy="4" r="2.5" fill={grp.line.color}/></svg>
                                    {grp.line.label}
                                  </span>
                                )}
                              </div>

                              {/* Note when GPS data is unavailable from calculator */}
                              {allGpsZero && (
                                <div style={{ padding:'8px 10px', marginBottom:8, background:'rgba(255,255,255,.04)', borderRadius:8, fontSize:10, color:'var(--fog)', textAlign:'center', fontStyle:'italic' }}>
                                  Sin datos GPS calculados — definí bloques con dimensiones en esta sesión
                                </div>
                              )}

                              {/* Chart area */}
                              <div style={{ position:'relative', height:`${BAR_H + 36}px` }}>
                                {/* Y-axis grid lines */}
                                {[0,25,50,75,100].map(pct => (
                                  <div key={pct} style={{ position:'absolute', left:0, right:0, bottom:`${(pct/100)*BAR_H + 28}px`,
                                    borderTop:'1px solid rgba(255,255,255,.04)', pointerEvents:'none' }} />
                                ))}

                                {/* Bars + inline dots per player */}
                                <div style={{ position:'absolute', bottom:28, left:0, right:0, height:BAR_H, display:'flex' }}>
                                  {mdPlayers.map((p:any, pi:number) => {
                                    const lineVal = grp.line ? Number(p[grp.line.key])||0 : 0
                                    const dotBottom = lineVal > 0 ? (lineVal/maxLine)*BAR_H*0.85 + BAR_H*0.05 : -999
                                    return (
                                      <div key={pi} style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center', minWidth:0 }}>
                                        {/* Grouped bars with values inside */}
                                        <div style={{ display:'flex', gap:2, alignItems:'flex-end', width:'100%', justifyContent:'center' }}>
                                          {grp.bars.map((b, bi) => {
                                            const val = getBarVal(p, b.key)
                                            const h = Math.max((val/maxBar)*BAR_H, val>0?4:2)
                                            return (
                                              <div key={bi} title={`${p.nombre}: ${val} ${b.label}`}
                                                style={{ position:'relative', width:'100%', maxWidth:20, height:`${h}px`,
                                                  background: val > 0 ? b.color : `${b.color}18`,
                                                  borderRadius:'3px 3px 0 0', minWidth:6,
                                                  transition:'height .3s', overflow:'visible' }}>
                                                {val>0 && h>=16 && <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-90deg)', fontSize:8, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap', textShadow:'0 1px 2px rgba(0,0,0,.9)', pointerEvents:'none' }}>{val}</span>}
                                              </div>
                                            )
                                          })}
                                        </div>
                                        {/* Inline dot + value label */}
                                        {grp.line && lineVal > 0 && (
                                          <div className="anim-fade-up" style={{ position:'absolute', left:'50%', bottom:dotBottom - 5, zIndex:10, pointerEvents:'none', display:'flex', flexDirection:'column', alignItems:'center', animationDelay:`${0.5 + pi*0.05}s` }}>
                                            <span style={{ fontSize:BAR_H*0.08, fontFamily:'DM Mono,monospace', fontWeight:700, color:grp.line.color, whiteSpace:'nowrap', marginBottom:4, textShadow:'0 1px 3px rgba(0,0,0,.8)' }}>{lineVal}</span>
                                            <div style={{ width:10, height:10, borderRadius:'50%', background:grp.line.color, border:'1.5px solid #000', boxSizing:'border-box', flexShrink:0 }} />
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* SVG: ONLY dashed connecting lines */}
                                {grp.line && mdPlayers.length >= 2 && (() => {
                                  const nP = mdPlayers.length
                                  const pts = mdPlayers.map((p:any, i:number) => {
                                    const v = Number(p[grp.line!.key])||0
                                    const dotBottom = v > 0 ? (v/maxLine)*BAR_H*0.85 + BAR_H*0.05 : -1
                                    return { x: ((i + 0.5) / nP) * 100, y: v > 0 ? BAR_H - dotBottom : null }
                                  })
                                  const valid = pts.filter(p => p.y !== null) as {x:number,y:number}[]
                                  if (valid.length < 2) return null
                                  return (
                                    <svg style={{ position:'absolute', bottom:28, left:0, right:0, width:'100%', height:BAR_H, overflow:'visible', pointerEvents:'none' }}>
                                      {valid.map((pt, i) => i > 0 ? (
                                        <line key={i} x1={`${valid[i-1].x}%`} y1={valid[i-1].y} x2={`${pt.x}%`} y2={pt.y}
                                          stroke={grp.line!.color} strokeWidth="2.5" strokeDasharray="12,7" />
                                      ) : null)}
                                    </svg>
                                  )
                                })()}

                                {/* Player names on X axis */}
                                <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex' }}>
                                  {mdPlayers.map((p:any, pi:number) => (
                                    <div key={pi} style={{ flex:1, textAlign:'center', minWidth:0 }}>
                                      <div style={{ fontSize:11, color: POS_COLS[p.nombre] || '#888', fontWeight:700,
                                        whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                        {p.nombre.split(' ')[0]}
                                      </div>
                                      <div style={{ fontSize:10, color:'var(--fog)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                        {p.posicion ? p.posicion.split(' ')[0] : ''}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      <p style={{ fontSize:8, color:'var(--fog)', marginTop:10, fontStyle:'italic' }}>
                        * Datos de la calculadora (sesión planificada). En Ctrl. Carga GPS verás datos reales individuales por jugador.
                      </p>
                    </div>
                  )
                })()}
                </>
              ) : (
                <div style={{ padding:'10px 16px', color:'var(--fog)', fontSize:11, fontStyle:'italic' }}>Sin sesión registrada para {md}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* ══ CUADRO 2: TOTALES POR MD (filas=métricas, cols=MD) ════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(96,165,250,.2)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
          <CuadroHeader icon={Icons.bateria} cuadroNum="2" title="TOTALES POR MD – MD+1 ➔ MD" description="Sumatoria total del equipo (dato sesión × nº jugadores) en cada día del microciclo" color="#60a5fa" />

        </div>
        {existingMdLabels.size === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--fog)', fontSize:12 }}>Sin sesiones con MD asignado. Asigná MD en el Calendario.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(96,165,250,.05)' }}>
                  <th style={{ padding:'8px 16px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>MÉTRICA</th>
                  {mdCols.map(md=>(
                    <th key={md} style={{ padding:'8px 10px', textAlign:'center', color:existingMdLabels.has(md)?'#60a5fa':'var(--fog)', fontSize:10, fontWeight:700, whiteSpace:'nowrap', opacity:existingMdLabels.has(md)?1:0.5 }}>{md}</th>
                  ))}
                  <th style={{ padding:'8px 10px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {VARS.map((v,i)=>{
                  const vals = mdCols.map(md => {
                    // Cuadro 2 = SUMATORIO total del equipo
                    // Multiply by players who actually trained (have sessions > 0)
                    const sessVal = perSession[md]?.[v.key]
                    const nP = players.length || 1
                    return Math.round((Number(sessVal)||0) * nP)
                  })
                  const total = vals.reduce((s,x)=>s+x,0)
                  return (
                    <tr key={v.key} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'8px 16px', color:v.color, fontWeight:600, fontSize:11 }}>{v.label}</td>
                      {vals.map((val,j)=>(
                        <td key={j} style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:val>0?v.color:'var(--fog)', fontWeight:val>0?600:400 }}>
                          {val>0?val:'—'}
                        </td>
                      ))}
                      <td style={{ padding:'8px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:800, color:'#34d399' }}>
                        {total>0?total:'—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:16, borderTop:'1px solid var(--mist)' }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 GRÁFICO AGRUPADO · TOTALES POR DÍA DE ENTRENAMIENTO</p>
          <AnimateOnScroll minHeight={200}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
              {GRUPOS.map(g=>renderGrupoBar(g,'md','totales'))}
            </div>
          </AnimateOnScroll>
        </div>
      </div>

      {/* ══ CUADRO 3: PROMEDIO POR MD + gráficos agrupados ══════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(168,85,247,.2)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
          <CuadroHeader 
            icon={Icons.calculadora} 
            cuadroNum="3" 
            title="PROMEDIO POR MD – MD+1 ➔ MD" 
            description="Promedio del equipo en cada sesión del microciclo · con gráfico agrupado" 
            color="#a78bfa" 
          />
        </div>
        {existingMdLabels.size === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--fog)', fontSize:12 }}>Sin sesiones con MD asignado en este período. Asigná MD en el Calendario.</div>
        ) : (<>
          <div style={{ overflowX:'auto' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(168,85,247,.04)' }}>
                  <th style={{ padding:'7px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Métrica</th>
                  {mdCols.map(md=><th key={md} style={{ padding:'7px 10px', textAlign:'center', color:existingMdLabels.has(md)?'#a78bfa':'var(--fog)', fontSize:10, fontWeight:700, whiteSpace:'nowrap', opacity:existingMdLabels.has(md)?1:0.5 }}>{md}</th>)}
                  <th style={{ padding:'7px 10px', textAlign:'center', color:'#60a5fa', fontSize:9, fontWeight:700 }}>PROM. TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {VARS.map((v,i)=>{
                  const vals = mdCols.map(md=>Math.round(Number(perSession[md]?.[v.key])||0))
                  const actives = vals.filter(x=>x>0)
                  const promTotal = actives.length ? Math.round(actives.reduce((s,x)=>s+x,0)/actives.length) : 0
                  return (
                    <tr key={v.key} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'7px 14px', color:v.color, fontWeight:600, fontSize:10 }}>{v.label}</td>
                      {vals.map((val,j)=><td key={j} style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:val>0?v.color:'var(--fog)' }}>{val||'—'}</td>)}
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#60a5fa' }}>{promTotal||'—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding:16, borderTop:'1px solid var(--mist)' }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 GRÁFICO AGRUPADO · PROMEDIO POR MD</p>
            <AnimateOnScroll minHeight={200}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
                {GRUPOS.map(g=>renderGrupoBar(g,'md','promedio'))}
              </div>
            </AnimateOnScroll>
          </div>
        </>)}
      </div>

      {/* ══ CUADRO 4: % vs MEDIA 3 PARTIDOS ═════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.2)', borderRadius:16, overflow:'hidden', marginBottom:8 }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <CuadroHeader 
            icon={Icons.porcentaje} 
            cuadroNum="4" 
            title="VOLUMEN RELATIVO" 
            description="Media de 5 partidos de referencia → objetivo: 100% en cada variable por sesión" 
            color="#f87171" 
          />
          <button className="hover-scale" onClick={()=>setShowRefInput(!showRefInput)} style={{ fontSize:11, padding:'6px 14px', borderRadius:8, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.3)', cursor:'pointer' }}>
            {showRefInput?'▲ Ocultar':'▼ Ingresar partidos'}
          </button>
        </div>
        {showRefInput && (
          <div style={{ padding:16, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.03)' }}>
            <p style={{ fontSize:10, color:'var(--fog)', marginBottom:14 }}>
              Seleccioná hasta 3 partidos del Calendario — los datos se cargan automáticamente. También podés editar los valores manualmente.
            </p>
            {[0,1,2,3,4].map(ri=>(
              <div key={ri} style={{ marginBottom:16, background:'var(--ink3)', borderRadius:10, padding:12, border:'1px solid rgba(239,68,68,.15)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#f87171' }}>🏆 Partido {ri+1}</span>
                  <select
                    className="wp-input"
                    style={{ flex:1, minWidth:200, appearance:'none', fontSize:11, padding:'5px 10px' }}
                    value={selectedPartidos[ri]?.fecha+'_'+selectedPartidos[ri]?.rival || ''}
                    onChange={e=>{
                      const val = e.target.value
                      if (!val) { selectPartido(ri, null); return }
                      const p = partidos.find((x:any)=>`${x.fecha}_${x.rival}`===val)
                      if (p) selectPartido(ri, p)
                    }}
                  >
                    <option value="">— Seleccionar partido del calendario —</option>
                    {partidos.map((p:any)=>(
                      <option key={`${p.fecha}_${p.rival}`} value={`${p.fecha}_${p.rival}`} style={{ background:'var(--ink2)' }}>
                        {p.fecha} · vs {p.rival||'Partido'} {p._src==='calendar'?'📅':'📋'}
                      </option>
                    ))}
                  </select>
                  {selectedPartidos[ri] && (
                    <button className="hover-scale" onClick={()=>selectPartido(ri,null)} style={{ fontSize:10, padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer' }}>✕</button>
                  )}
                </div>
                {/* Show loaded values or manual entry */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:6 }}>
                  {VARS.map(v=>(
                    <div key={v.key}>
                      <label style={{ fontSize:8, color:v.color, display:'block', marginBottom:2, textTransform:'uppercase', fontWeight:600 }}>{v.label}</label>
                      <input className="wp-input" type="number" placeholder="—"
                        style={{ padding:'4px 7px', fontSize:11, width:'100%', background: partidoRefs[ri]?.[v.key] ? 'rgba(239,68,68,.08)' : 'transparent' }}
                        value={partidoRefs[ri]?.[v.key]||''}
                        onChange={e=>{ const nr=[...partidoRefs]; nr[ri]={...nr[ri],[v.key]:Number(e.target.value)||''}; setPartidoRefs(nr) }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {Object.keys(refMedia).length>0 && (
              <div style={{ padding:'8px 12px', background:'rgba(239,68,68,.08)', borderRadius:8, display:'flex', flexWrap:'wrap', gap:10, marginTop:4 }}>
                <span style={{ fontSize:10, color:'#f87171', fontWeight:700 }}>📊 Media referencia:</span>
                {VARS.filter(v=>refMedia[v.key]).map(v=>(
                  <span key={v.key} style={{ fontSize:11, color:v.color, fontFamily:'DM Mono,monospace' }}>{v.label}: <strong>{refMedia[v.key]}</strong></span>
                ))}
              </div>
            )}
          </div>
        )}
        {Object.keys(refMedia).length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--fog)', fontSize:12 }}>
            Ingresá los valores de 3 partidos de referencia para ver los porcentajes de carga.
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(239,68,68,.04)' }}>
                  <th style={{ padding:'7px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Jugador / MD</th>
                  {VARS.filter(v=>refMedia[v.key]).map(v=>(
                    <th key={v.key} style={{ padding:'7px 8px', textAlign:'center', color:v.color, fontSize:9, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>
                      {v.label}<div style={{ fontSize:8, color:'var(--fog)', fontWeight:400 }}>ref:{refMedia[v.key]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p:any,i:number)=>{
                  // CALC panel: GPS vars are team-level (from calculator), not per-player.
                  // Sum training sessions only (exclude 'MD') from perSession (team avg = same for all players)
                  const trainingMds = mdCols.filter(md => md !== 'MD' && existingMdLabels.has(md))
                  const getTrainingVal = (vk: string) =>
                    trainingMds.length > 0
                      ? trainingMds.reduce((s, md) => s + (Number(perSession[md]?.[vk])||0), 0)
                      : 0
                  return (
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'7px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                      {VARS.filter(v=>refMedia[v.key]).map(v=>{ const pv=pct(getTrainingVal(v.key),v.key); return <td key={v.key} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:pv?600:400, color:pctColor(pv) }}>{pv!==null?`${pv}%`:'—'}</td> })}
                    </tr>
                  )
                })}
                {mdCols.map(md=>(
                  <tr key={md} style={{ borderTop:'1px solid rgba(239,68,68,.15)', background:'rgba(239,68,68,.03)' }}>
                    <td style={{ padding:'7px 14px', color:'#f87171', fontWeight:700, fontSize:10 }}>{md} (prom)</td>
                    {VARS.filter(v=>refMedia[v.key]).map(v=>{ const val=Math.round(Number(perSession[md]?.[v.key])||0); const pv=pct(val,v.key); return <td key={v.key} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:pv?600:400, color:pctColor(pv) }}>{pv!==null?`${pv}%`:'—'}</td> })}
                  </tr>
                ))}
                <tr style={{ borderTop:'2px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)' }}>
                  <td style={{ padding:'8px 14px', fontWeight:800, color:'#f87171', fontSize:10, textTransform:'uppercase' }}>Prom. Equipo</td>
                  {VARS.filter(v=>refMedia[v.key]).map(v=>{
                    const trainingMds = mdCols.filter(md => md !== 'MD' && existingMdLabels.has(md))
                    const trainingVal = trainingMds.length > 0
                      ? Math.round(trainingMds.reduce((s, md) => s + (Number(perSession[md]?.[v.key])||0), 0) / trainingMds.length)
                      : 0
                    const pv=pct(trainingVal,v.key); return <td key={v.key} style={{ padding:'8px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:pctColor(pv) }}>{pv!==null?`${pv}%`:'—'}</td>
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ══ CUADRO 5: ÍNDICE DE CARGA (CIV) ════════════════════════════ */}
      {Object.keys(refMedia).length > 0 && (() => {
        // SUMA = suma de los promedios de sesiones de entrenamiento (excluye MD)
        // MD = dato del partido (refMedia)
        // CIV = SUMA / MD → 1=igual al partido, 2=doble, etc.
        const trainingMdsCalc = mdCols.filter(md => md !== 'MD' && existingMdLabels.has(md))
        const totalTrainingTime = trainingMdsCalc.reduce((acc, md) => acc + (Number(perSession[md]?.tiempo || perSession[md]?.minActivo) || 0), 0) || 1
        const matchTime = refMedia['tiempo'] || refMedia['minActivo'] || 90

        const civData = VARS.map(v => {
          const sumaAbsRaw = trainingMdsCalc.reduce((acc, md) => acc + (Number(perSession[md]?.[v.key]) || 0), 0)
          const mdAbsRaw = refMedia[v.key] || 0
          
          let sumaAbs = Math.round(sumaAbsRaw)
          let mdAbs = Math.round(mdAbsRaw)
          let sumaRel = null
          let mdRel = null
          let civ = null
          
          const isRelative = !['tiempo', 'minactivo', 'ua', 'rpe'].includes(v.key.toLowerCase())
          
          if (isRelative) {
             const sRel = sumaAbsRaw / totalTrainingTime
             const mRel = mdAbsRaw / matchTime
             
             sumaRel = Math.round(sRel * 10) / 10
             mdRel = Math.round(mRel * 10) / 10
             
             if (mRel > 0) civ = Math.round((sRel / mRel) * 100) / 100
          } else {
             if (mdAbsRaw > 0) civ = Math.round((sumaAbsRaw / mdAbsRaw) * 100) / 100
          }
          
          return { ...v, sumaAbs, mdAbs, sumaRel, mdRel, civ }
        }).filter(v => v.mdAbs > 0 || v.sumaAbs > 0)

        if (!civData.length) return null

        return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(96,165,250,.25)', borderRadius:16, overflow:'hidden', marginBottom:8 }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
              <CuadroHeader icon={Icons.metricas} cuadroNum="5" title="ÍNDICE DE CARGA (CIV) — MICROCICLO vs PARTIDO" description="CIV = Suma Microciclo ÷ Partido · Azul <1.0 · Verde 1.0–1.5 · Rojo >1.5 · 1.0 = igual al partido · 2.0 = doble carga" color="#60a5fa" />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'rgba(96,165,250,.05)' }}>
                    <th rowSpan={2} style={{ padding:'9px 16px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', borderRight:'1px solid var(--mist)' }}>MÉTRICA</th>
                    <th colSpan={2} style={{ padding:'9px 12px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--mist)', borderRight:'1px solid var(--mist)' }}>SUMA MICROCICLO</th>
                    <th colSpan={2} style={{ padding:'9px 12px', textAlign:'center', color:'#f87171', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--mist)', borderRight:'1px solid var(--mist)' }}>PARTIDO</th>
                    <th rowSpan={2} style={{ padding:'9px 16px', textAlign:'center', color:'#60a5fa', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>CIV</th>
                  </tr>
                  <tr style={{ background:'rgba(96,165,250,.02)' }}>
                    <th style={{ padding:'4px 12px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700, opacity:0.8, borderRight:'1px dashed var(--mist)' }}>ABS</th>
                    <th style={{ padding:'4px 12px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700, opacity:0.8, borderRight:'1px solid var(--mist)' }}>REL/MIN</th>
                    <th style={{ padding:'4px 12px', textAlign:'center', color:'#f87171', fontSize:9, fontWeight:700, opacity:0.8, borderRight:'1px dashed var(--mist)' }}>ABS</th>
                    <th style={{ padding:'4px 12px', textAlign:'center', color:'#f87171', fontSize:9, fontWeight:700, opacity:0.8, borderRight:'1px solid var(--mist)' }}>REL/MIN</th>
                  </tr>
                </thead>
                <tbody>
                  {civData.map((v, i) => {
                    const civColor = v.civ === null ? 'var(--fog)' : v.civ > 1.5 ? '#ef4444' : v.civ >= 1.0 ? '#22c55e' : '#60a5fa'
                    const civBg = v.civ === null ? 'transparent' : v.civ > 1.5 ? 'rgba(239,68,68,.08)' : v.civ >= 1.0 ? 'rgba(34,197,94,.08)' : 'rgba(96,165,250,.08)'
                    const civBorder = v.civ === null ? 'transparent' : v.civ > 1.5 ? 'rgba(239,68,68,.25)' : v.civ >= 1.0 ? 'rgba(34,197,94,.25)' : 'rgba(96,165,250,.25)'
                    return (
                      <tr key={v.key} style={{ borderTop:'1px solid var(--mist)', background: i%2===0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                        <td style={{ padding:'9px 16px', color: v.color, fontWeight:600, borderRight:'1px solid var(--mist)' }}>{v.label}</td>
                        <td style={{ padding:'9px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#34d399', fontWeight:600, borderRight:'1px dashed var(--mist)' }}>
                          {v.sumaAbs > 0 ? v.sumaAbs : '—'}
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#34d399', fontWeight:600, opacity:0.8, borderRight:'1px solid var(--mist)' }}>
                          {v.sumaRel !== null ? v.sumaRel : '—'}
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#f87171', fontWeight:600, borderRight:'1px dashed var(--mist)' }}>
                          {v.mdAbs > 0 ? v.mdAbs : '—'}
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#f87171', fontWeight:600, opacity:0.8, borderRight:'1px solid var(--mist)' }}>
                          {v.mdRel !== null ? v.mdRel : '—'}
                        </td>
                        <td style={{ padding:'9px 16px', textAlign:'center' }}>
                          {v.civ !== null ? (
                            <span style={{
                              fontFamily:'DM Mono,monospace', fontWeight:800, fontSize:14,
                              color: civColor,
                              background: civBg,
                              border: `1px solid ${civBorder}`,
                              borderRadius: 8,
                              padding: '3px 14px',
                              display: 'inline-block',
                              minWidth: 60,
                            }}>
                              {v.civ.toFixed(2)}
                            </span>
                          ) : <span style={{ color:'var(--fog)' }}>N/D</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ padding:'8px 16px', borderTop:'1px solid var(--mist)', display:'flex', gap:20, fontSize:10, color:'var(--fog)', flexWrap:'wrap' }}>
              <span>📘 CIV = Carga microciclo ÷ Carga partido</span>
              <span style={{ color:'#60a5fa' }}>🔵 &lt;1.0 — carga por debajo del partido</span>
              <span style={{ color:'#22c55e' }}>🟢 1.0–1.5 — carga controlada</span>
              <span style={{ color:'#ef4444' }}>🔴 &gt;1.5 — carga elevada vs partido</span>
              <span>1.0 = igual al partido · 0.5 = mitad · 2.0 = doble</span>
            </div>
          </div>
        )
      })()}

      {/* ══ CUADRO 6: CONTROL DE INTENSIDAD RELATIVA (CALC) ══════════════════════════════════ */}
      {(() => {
        const trainingMds = mdCols.filter(md => existingMdLabels.has(md) && (Number(perSession[md]?.minActivo) > 0 || Number(perSessionTeamAvg[md]?.minActivo) > 0))
        if (!trainingMds.length) return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(168,85,247,.2)', borderRadius:16, padding:'20px', textAlign:'center', marginBottom:8 }}>
            <CuadroHeader icon={Icons.velocimetro} cuadroNum="6" title="CONTROL DE INTENSIDAD RELATIVA (/ MINUTO)" description="No hay minutos activos planificados en el calendario para esta semana." color="#a855f7" />

          </div>
        )

        const rows = trainingMds.map((md:string) => {
          const avg = perSession[md] || {}
          const activeMin = Number(avg.minActivo) || Number(perSessionTeamAvg[md]?.minActivo) || 1
          const dTotal = Number(avg.distTotal) || 0
          const dSprint = Number(avg.distSprint) || 0
          const nSprint = Number(avg.nSprints) || 0
          const accel = (Number(avg.nAcel)||0) + (Number(avg.nAcel3)||0)
          const decel = (Number(avg.nDecel)||0) + (Number(avg.nDecel3)||0)

          return {
            md,
            activeMin,
            metMin: dTotal / activeMin,
            sprintMin: dSprint / activeMin,
            nSprintMin: nSprint / activeMin,
            acelDecelMin: (accel + decel) / activeMin
          }
        })

        const maxMet = Math.max(...rows.map(r=>r.metMin), 1)
        const maxSpr = Math.max(...rows.map(r=>r.sprintMin), 1)
        const maxNSpr = Math.max(...rows.map(r=>r.nSprintMin), 1)
        const maxAD = Math.max(...rows.map(r=>r.acelDecelMin), 1)
        const BAR_H = 120

        return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(168,85,247,.2)', borderRadius:16, overflow:'hidden', marginBottom:8, pageBreakBefore:'always', breakBefore:'page' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
              <CuadroHeader 
                icon={Icons.velocimetro} 
                cuadroNum="6" 
                title="CONTROL DE INTENSIDAD RELATIVA (/ MINUTO)" 
                description="Métricas divididas por el tiempo activo de la sesión estimado en el diseño de tareas" 
                color="#a855f7" 
              />
            </div>
            
            <div style={{ overflowX:'auto' }}>
              <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'rgba(168,85,247,.05)' }}>
                    <th style={{ padding:'8px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>MD</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#84cc16', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Tiempo (min)</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#60a5fa', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Metros / min</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#f59e0b', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Dist. Sprint / min</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#ec4899', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Sprints / min</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Acel+Decel / min</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.md} style={{ borderTop:'1px solid var(--mist)', background: i%2===0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'7px 14px', color:'#a855f7', fontWeight:700, textAlign:'center' }}>{r.md}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#84cc16', fontWeight:700 }}>{Math.round(r.activeMin)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#60a5fa' }}>{r.metMin.toFixed(1)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#f59e0b' }}>{r.sprintMin.toFixed(2)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#ec4899' }}>{r.nSprintMin.toFixed(3)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#34d399' }}>{r.acelDecelMin.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gráficos */}
            <div style={{ padding:16, borderTop:'1px solid var(--mist)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
                {[
                  { title:'Metros / min', color:'#60a5fa', max:maxMet, val: (r:any)=>r.metMin, dec:1 },
                  { title:'Dist. Sprint / min', color:'#f59e0b', max:maxSpr, val: (r:any)=>r.sprintMin, dec:2 },
                  { title:'Sprints / min', color:'#ec4899', max:maxNSpr, val: (r:any)=>r.nSprintMin, dec:3 },
                  { title:'Acel+Decel / min', color:'#34d399', max:maxAD, val: (r:any)=>r.acelDecelMin, dec:2 }
                ].map(grp => (
                  <div key={grp.title} style={{ background:'var(--ink3)', borderRadius:12, padding:14, border:`1px solid ${grp.color}30` }}>
                    <div style={{ fontSize:11, fontWeight:800, color:grp.color, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', marginBottom:12, borderBottom:`1px solid ${grp.color}30`, paddingBottom:6 }}>{grp.title}</div>
                    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', height:BAR_H, gap:4, position:'relative' }}>
                      {rows.map((r,i) => {
                        const v = grp.val(r)
                        const h = Math.max((v/grp.max)*(BAR_H - 24), v>0?4:0)
                        return (
                          <div key={r.md} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end' }}>
                            {v>0 && <span style={{ fontSize:8, fontFamily:'DM Mono,monospace', color:grp.color, marginBottom:2 }}>{v.toFixed(grp.dec)}</span>}
                            <div className="anim-bar-v" style={{ width:'100%', maxWidth:24, height:`${h}px`, background:grp.color, borderRadius:'3px 3px 0 0', opacity: v>0?1:0.1 }} />
                            <div style={{ fontSize:8, color:'var(--silver)', marginTop:4, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>{r.md}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
      </>)}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════
// CONTROL DE CARGA — GPS (datos reales Catapult)
// ═══════════════════════════════════════════════════════════════════
function ControlCargaGpsPanel({ teamData }: { teamData: any[] }) {
  const today = todayLocal()
  const [microcicloOffset, setMicrocicloOffset] = useState(0)
  const mondayShift = new Date().getDay() === 1 ? -7 : 0

  const getWeekStart = (offsetWeeks = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1 + offsetWeeks * 7 + mondayShift)
    return localDateStr(d)
  }
  const getWeekEnd = (offsetWeeks = 0) => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 7 + offsetWeeks * 7 + mondayShift)
    return localDateStr(d)
  }

  const [dateRange, setDateRange] = useState({ desde: getWeekStart(0), hasta: today })
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [partidoRefs, setPartidoRefs] = useState<any[]>(() => {
    try { const s = localStorage.getItem('wp_gps_partidoRefs'); return s ? JSON.parse(s) : [{},{},{},{},{}] } catch { return [{},{},{},{},{}] }
  })
  const [showRefInput, setShowRefInput] = useState(false)
  const [partidos, setPartidos] = useState<any[]>([])
  const [selectedPartidos, setSelectedPartidos] = useState<(any|null)[]>(() => {
    try { const s = localStorage.getItem('wp_gps_selectedPartidos'); return s ? JSON.parse(s) : [null,null,null] } catch { return [null,null,null] }
  })

  useEffect(() => {
    try { localStorage.setItem('wp_gps_partidoRefs', JSON.stringify(partidoRefs)) } catch {}
  }, [partidoRefs])

  useEffect(() => {
    try { localStorage.setItem('wp_gps_selectedPartidos', JSON.stringify(selectedPartidos)) } catch {}
  }, [selectedPartidos])

  useEffect(() => {
    const newDesde = getWeekStart(microcicloOffset)
    const newHasta = microcicloOffset === 0 ? today : getWeekEnd(microcicloOffset)
    setDateRange({ desde: newDesde, hasta: newHasta })
  }, [microcicloOffset])

  useEffect(() => { cargar() }, [dateRange])

  // Reload when GPS import completes in another panel
  useEffect(() => {
    const handler = () => cargar()
    window.addEventListener('gps-data-updated', handler)
    return () => window.removeEventListener('gps-data-updated', handler)
  }, [dateRange])

  useEffect(() => {
    const hace1año = new Date(); hace1año.setFullYear(hace1año.getFullYear()-1)
    fetch(`/api/calendario?desde=${localDateStr(hace1año)}&hasta=${today}`)
      .then(r=>r.json())
      .then(d => {
        const sesPartido = (d.sesiones||[]).filter((s:any) => s.tipo === 'partido')
        const partidosLog = (d.partidos||[])
        const all = [
          ...sesPartido.map((s:any)=>({ fecha:s.fecha, rival:s.rival||'Partido', tipo_partido:s.titulo||'Oficial', _src:'calendar' })),
          ...partidosLog.map((p:any)=>({ fecha:p.fecha, rival:p.rival, tipo_partido:p.tipo_partido, _src:'log' }))
        ]
        const seen = new Set()
        setPartidos(all.filter((p:any)=>{ const k=`${p.fecha}_${p.rival}`; if(seen.has(k)) return false; seen.add(k); return true }).sort((a:any,b:any)=>b.fecha.localeCompare(a.fecha)))
      }).catch(()=>{})
  }, [])

  async function cargar() {
    setLoading(true)
    try { const r = await fetch(`/api/carga-gps?desde=${dateRange.desde}&hasta=${dateRange.hasta}&ciclo=microciclo`); setData(await r.json()) }
    catch(e){} finally { setLoading(false) }
  }

  async function selectPartido(slotIdx: number, partido: any) {
    const updated = [...selectedPartidos]
    if (!partido) { updated[slotIdx]=null; setSelectedPartidos(updated); const nr=[...partidoRefs]; nr[slotIdx]={}; setPartidoRefs(nr); return }
    updated[slotIdx] = partido; setSelectedPartidos(updated)
    try {
      const r = await fetch(`/api/carga-gps?desde=${partido.fecha}&hasta=${partido.fecha}&ciclo=microciclo`)
      const d = await r.json()
      const avg = d?.teamAvgGps || {}
      const nr = [...partidoRefs]
      nr[slotIdx] = { ...avg }
      setPartidoRefs(nr)
    } catch(e){}
  }

  const gpsReal: any[] = data?.gpsReal || []
  const gpsPerMD: Record<string,any[]> = data?.gpsPerMD || {}
  const sesionesInfo: any[] = data?.sesionesInfo || []
  const allMetricColsGps: string[] = data?.allMetricCols || []

  // GPS_METRIC_COLOR: default color per key (fallback for unknown keys)
  const GPS_KEY_COLORS: Record<string,string> = {
    dist_total:'#60a5fa', dist_per_min:'#34d399', dist_hir:'#f59e0b',
    dist_v4:'#a78bfa', dist_v5:'#f97316', dist_v1:'#94a3b8', dist_v2:'#64748b', dist_v3:'#7dd3fc',
    n_sprints:'#ec4899', max_velocity:'#ef4444',
    acc2:'#8b5cf6', dec2:'#06b6d4', acc3:'#f43f5e', dec3:'#0ea5e9',
    acc1:'#c084fc', dec1:'#22d3ee', acc4:'#fb7185', dec4:'#38bdf8',
    acc_total:'#d946ef', dec_total:'#0284c7',
    player_load:'#fbbf24', metabolic_power:'#fb923c', avg_metabolic_power:'#fdba74',
    hr_avg:'#f87171', hr_max:'#dc2626', duracion_min:'#a3e635',
    hr_z1:'#bbf7d0', hr_z2:'#86efac', hr_z3:'#4ade80', hr_z4:'#fbbf24', hr_z5:'#f87171',
    equiv_distance:'#67e8f9',
  }

  // Build GPS_VARS from ALL columns present across gpsReal + every gpsPerMD group
  const GPS_VARS = (() => {
    const SKIP = new Set(['jugador_id','nombre','posicion','sesiones_gps','sesiones','_sums','_counts','_maxes'])
    const colSet = new Set<string>()
    allMetricColsGps.forEach((k: string) => colSet.add(k))
    gpsReal.forEach((p: any) => Object.keys(p).forEach(k => { if (!SKIP.has(k)) colSet.add(k) }))
    Object.values(gpsPerMD).forEach((players: any) =>
      (players as any[]).forEach((p: any) => Object.keys(p).forEach(k => { if (!SKIP.has(k)) colSet.add(k) }))
    )
    // Also include any keys present in partido refs (e.g. player_load from match import)
    // so they show up in Cuadros 4 & 5 even if the current microcycle lacks that column
    partidoRefs.forEach((ref: any) => Object.keys(ref).forEach(k => { if (k in GPS_METRIC_META) colSet.add(k) }))
    const rawCols = Array.from(colSet)
    const ordered = [
      ...GPS_METRIC_ORDER.filter(k => rawCols.includes(k)),
      ...rawCols.filter(k => !GPS_METRIC_ORDER.includes(k)).sort(),
    ]
    return ordered.map((key: string) => {
      const meta = GPS_METRIC_META[key]
      return {
        key,
        label: meta ? `${meta.label}${meta.unit ? ' ('+meta.unit+')' : ''}` : key,
        color: GPS_KEY_COLORS[key] || '#94a3b8',
      }
    })
  })()
  const MD_ORDER_LOCAL = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']
  const existingMdLabels = new Set(sesionesInfo.map((s:any) => s.titulo))
  const mdCols = MD_ORDER_LOCAL

  // Ref media (avg of 3 matches) — computed over ALL GPS_METRIC_META keys,
  // independent of GPS_VARS so player_load and others always show even if
  // the current microcycle doesn't have that column imported
  const refMedia: Record<string,number> = {}
  Object.keys(GPS_METRIC_META).forEach(key => {
    const vals = partidoRefs.map((r:any) => Number(r[key])||0).filter(x=>x>0)
    if (vals.length) refMedia[key] = Math.round(vals.reduce((s:number,x:number)=>s+x,0)/vals.length*10)/10
  })
  const pct = (val:number, key:string) => { const ref=refMedia[key]; if(!ref||ref===0) return null; return Math.round((val/ref)*100) }
  const pctColor = (p:number|null) => p===null?'var(--fog)':p>=85?'#22c55e':p>=65?'#f59e0b':'#ef4444'
  // refMediaVars: ordered list of vars shown in Cuadro 4 & 5 tables
  // Includes keys that have a ref value OR that are present in GPS_VARS (microcycle data),
  // so player_load and others always appear even when partido ref has no data for them
  const gpsVarKeys = new Set(GPS_VARS.map((v:any) => v.key))
  const refMediaVars = GPS_METRIC_ORDER
    .filter((key:string) => refMedia[key] > 0 || gpsVarKeys.has(key))
    .map((key:string) => {
      const meta = GPS_METRIC_META[key]
      return {
        key,
        label: meta ? `${meta.label}${meta.unit ? ' ('+meta.unit+')' : ''}` : key,
        color: GPS_KEY_COLORS[key] || '#94a3b8',
      }
    })

  // Team avg GPS for a given MD — works across all dynamic GPS_VARS
  const MAX_FIELDS_GPS = new Set(['hr_max'])
  const AVG_FIELDS_GPS = new Set(['max_velocity','hr_max','dist_per_min','duracion_min'])
  const mdTeamAvg = (md: string) => {
    const rows = gpsPerMD[md] || []
    if (!rows.length) return {}
    const avg: Record<string,number> = {}
    GPS_VARS.forEach(v => {
      const vals = rows.map((p:any)=>Number(p[v.key])||0).filter(x=>x>0)
      if (!vals.length) return
      avg[v.key] = MAX_FIELDS_GPS.has(v.key)
        ? Math.round(Math.max(...vals)*100)/100
        : AVG_FIELDS_GPS.has(v.key)
        ? Math.round(vals.reduce((s,x)=>s+x,0)/vals.length*10)/10
        : Math.round(vals.reduce((s,x)=>s+x,0)/vals.length*10)/10
    })
    return avg
  }

  // Chart groups for GPS comparison — only show groups for columns actually present
  const availGpsKeys = new Set(GPS_VARS.map(v => v.key))
  const GPS_CHART_GROUPS = [
    ...(availGpsKeys.has('dist_total') || availGpsKeys.has('dist_v4') ? [{
      title:'DISTANCIA', color:'#3b82f6',
      bars:[
        ...(availGpsKeys.has('dist_total') ? [{key:'dist_total',label:'Tot Dist',color:'#3b82f6'}] : []),
        ...(availGpsKeys.has('dist_v4') ? [{key:'dist_v4',label:'Vel B4 (m)',color:'#a78bfa'}] : []),
      ],
      line: availGpsKeys.has('dist_per_min') ? {key:'dist_per_min',label:'Mts/min',color:'#34d399'} : null,
    }] : []),
    ...(availGpsKeys.has('dist_hir') || availGpsKeys.has('dist_v5') || availGpsKeys.has('max_velocity') ? [{
      title:'VELOCIDAD', color:'#ef4444',
      bars:[
        ...(availGpsKeys.has('dist_hir') ? [{key:'dist_hir',label:'HSR (m)',color:'#f59e0b'}] : []),
        ...(availGpsKeys.has('dist_v5') ? [{key:'dist_v5',label:'Vel B6 (m)',color:'#f97316'}] : []),
      ],
      line: availGpsKeys.has('max_velocity') ? {key:'max_velocity',label:'Vel Máx',color:'#ef4444'} : null,
    }] : []),
    ...(availGpsKeys.has('acc2') || availGpsKeys.has('dec2') ? [{
      title:'ACC / DEC B2-3', color:'#ec4899',
      bars:[
        ...(availGpsKeys.has('acc2') ? [{key:'acc2',label:'ACC B2-3',color:'#ec4899'}] : []),
        ...(availGpsKeys.has('dec2') ? [{key:'dec2',label:'DEC B2-3',color:'#14b8a6'}] : []),
      ],
      line: null,
    }] : []),
    ...(availGpsKeys.has('acc3') || availGpsKeys.has('dec3') ? [{
      title:'ACC / DEC >3', color:'#f43f5e',
      bars:[
        ...(availGpsKeys.has('acc3') ? [{key:'acc3',label:'ACC >3',color:'#f43f5e'}] : []),
        ...(availGpsKeys.has('dec3') ? [{key:'dec3',label:'DEC >3',color:'#0ea5e9'}] : []),
      ],
      line: null,
    }] : []),
    ...(availGpsKeys.has('player_load') ? [{
      title:'PLAYER LOAD', color:'#fbbf24',
      bars:[{key:'player_load',label:'Player Load',color:'#fbbf24'}],
      line: null,
    }] : []),
    ...(availGpsKeys.has('n_sprints') ? [{
      title:'SPRINTS', color:'#ec4899',
      bars:[{key:'n_sprints',label:'Nº Sprints',color:'#ec4899'}],
      line: null,
    }] : []),
    ...(availGpsKeys.has('hsr_per_min') || availGpsKeys.has('sprint_dist_per_min') ? [{
      title:'INTENSIDAD / MIN', color:'#8b5cf6',
      bars:[
        ...(availGpsKeys.has('hsr_per_min') ? [{key:'hsr_per_min',label:'HSR/min',color:'#8b5cf6'}] : []),
        ...(availGpsKeys.has('sprint_dist_per_min') ? [{key:'sprint_dist_per_min',label:'Sprint/min',color:'#c084fc'}] : []),
      ],
      line: null,
    }] : []),
    ...(availGpsKeys.has('acc_int_per_min') || availGpsKeys.has('acc_per_min') || availGpsKeys.has('dec_per_min') ? [{
      title:'ACC/DEC POR MIN', color:'#0ea5e9',
      bars:[
        ...(availGpsKeys.has('acc_int_per_min') ? [{key:'acc_int_per_min',label:'Acc Int/min',color:'#0ea5e9'}] : []),
        ...(availGpsKeys.has('acc_per_min') ? [{key:'acc_per_min',label:'Acc/min',color:'#38bdf8'}] : []),
        ...(availGpsKeys.has('dec_per_min') ? [{key:'dec_per_min',label:'Dec/min',color:'#7dd3fc'}] : []),
      ],
      line: null,
    }] : []),
    ...(availGpsKeys.has('max_acc') || availGpsKeys.has('max_dec') ? [{
      title:'MÁXIMOS ACC/DEC', color:'#f43f5e',
      bars:[
        ...(availGpsKeys.has('max_acc') ? [{key:'max_acc',label:'Máx. Acc',color:'#f43f5e'}] : []),
        ...(availGpsKeys.has('max_dec') ? [{key:'max_dec',label:'Máx. Dec',color:'#fb7185'}] : []),
      ],
      line: null,
    }] : []),
    ...(availGpsKeys.has('duracion_min') ? [{
      title:'TIEMPO', color:'#84cc16',
      bars:[{key:'duracion_min',label:'Duración (min)',color:'#84cc16'}],
      line: null,
    }] : []),
  ]

  const POS_LIST = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#a78bfa','#ec4899','#06b6d4','#fbbf24']

  return (
    <div style={{ padding:'24px 20px', maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:'var(--snow)', letterSpacing:'0.04em', marginBottom:4 }}>📡 CONTROL DE CARGA · GPS</h2>
          <p style={{ fontSize:12, color:'var(--silver)' }}>Microciclo · Datos reales importados desde Catapult · individuales por jugador</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'flex-end' }}>
          {/* Microciclo navigation */}
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, padding:'4px 8px' }}>
            <button className="hover-scale" onClick={()=>setMicrocicloOffset(o=>o-1)} style={{ background:'none', border:'none', color:'var(--silver)', cursor:'pointer', fontSize:16, padding:'0 4px', lineHeight:1 }}>‹</button>
            <span style={{ fontSize:11, color:'var(--snow)', fontFamily:'DM Mono,monospace', minWidth:80, textAlign:'center' }}>
              {microcicloOffset === 0 ? 'Esta semana' : microcicloOffset === -1 ? 'Sem. pasada' : `Sem. ${microcicloOffset < 0 ? microcicloOffset : '+'+microcicloOffset}`}
            </span>
            <button className="hover-scale" onClick={()=>setMicrocicloOffset(o=>Math.min(0, o+1))} style={{ background:'none', border:'none', color: microcicloOffset >= 0 ? 'var(--fog)' : 'var(--silver)', cursor: microcicloOffset >= 0 ? 'default' : 'pointer', fontSize:16, padding:'0 4px', lineHeight:1 }}>›</button>
          </div>
          <div><label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Desde</label><input className="wp-input" type="date" value={dateRange.desde} onChange={e=>setDateRange(r=>({ ...r, desde: e.target.value }))} /></div>
          <div><label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Hasta</label><input className="wp-input" type="date" value={dateRange.hasta} onChange={e=>setDateRange(r=>({ ...r, hasta: e.target.value }))} /></div>
          <button className="hover-scale" onClick={()=>{
            const win = window.open('', '_blank')
            if (!win) return

            const CM: Record<string,string> = {
              dist_total:'#1d4ed8', dist_per_min:'#059669', dist_hir:'#b45309',
              dist_v4:'#6d28d9', dist_v5:'#c2410c', n_sprints:'#be185d',
              max_velocity:'#dc2626', acc2:'#5b21b6', dec2:'#0e7490',
              acc3:'#be123c', dec3:'#0369a1', player_load:'#92400e',
              hr_avg:'#b91c1c', hr_max:'#991b1b', dist_v1:'#475569',
              dist_v2:'#334155', dist_v3:'#0284c7', acc1:'#7e22ce', dec1:'#0891b2',
              acc4:'#e11d48', dec4:'#0284c7', metabolic_power:'#c2410c',
            }
            const fc = (k: string) => CM[k] || '#374151'
            const thS = (c: string) => `padding:4px 7px;text-align:center;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};white-space:nowrap;background:#f8fafc;`
            const tdS = (c: string, b=false) => `padding:5px 7px;text-align:center;font-family:monospace;font-size:10px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;`
            const thL = (c: string) => `padding:4px 12px;text-align:left;font-size:8px;font-weight:700;text-transform:uppercase;border-bottom:2px solid #e5e7eb;color:${c};background:#f8fafc;`
            const tdL = (c: string, b=false) => `padding:5px 12px;color:${c};font-weight:${b?700:400};border-bottom:1px solid #f0f0f0;font-size:10px;`

            const allMDs = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']
            const dateDates = Object.keys(gpsPerMD).filter(k => !allMDs.includes(k)).sort()
            const allSecs = [
              ...dateDates.map(d => ({key:d, label:`📅 ${d}`, isDate:true})),
              ...allMDs.map(m => ({key:m, label:m, isDate:false}))
            ]
            const mdWithData = allMDs.filter(md => (gpsPerMD[md]||[]).length > 0)
            const trainingMds = mdWithData.filter(md => md !== 'MD')

            // ── Helpers ──────────────────────────────────────────────────────
            const buildBarSVG = (players: any[], varList: {key:string,label:string,color:string}[], lineKey?: string, lineColor?: string) => {
              const BAR_H = players.length <= 2 ? 140 : players.length <= 5 ? 160 : 200, TOP = 24, BOT = 44, W_COL = players.length <= 2 ? 120 : players.length <= 5 ? 90 : 70
              const totalW = Math.max(players.length * W_COL, 200)
              if (!players.length) return '<p style="color:#aaa;font-size:10px;text-align:center;">Sin datos</p>'
              const allVals = players.flatMap(p => varList.map(v => Number(p[v.key])||0))
              const maxBar = Math.max(...allVals, 1)
              const lineVals = lineKey ? players.map(p => Number(p[lineKey])||0) : []
              const maxLine = Math.max(...lineVals, 1)
              const n = players.length
              let bars = ''
              let labels = ''
              players.forEach((p, pi) => {
                const x0 = pi * W_COL + 4
                const bw = Math.max((W_COL - 8) / varList.length - 1, 6)
                varList.forEach((v, vi) => {
                  const val = Number(p[v.key])||0
                  const h = val > 0 ? Math.max((val/maxBar)*BAR_H, 4) : 0
                  const bx = x0 + vi*(bw+1)
                  const by = TOP + BAR_H - h
                  bars += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" fill="${v.color}" rx="2" opacity="0.9"/>`
                  if (val > 0 && h > 14) bars += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by+h/2+3).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="9" font-weight="700" transform="rotate(-90,${(bx+bw/2).toFixed(1)},${(by+h/2).toFixed(1)})">${val}</text>`
                  else if (val > 0) bars += `<text x="${(bx+bw/2).toFixed(1)}" y="${(by-3).toFixed(1)}" text-anchor="middle" fill="${v.color}" font-size="9" font-weight="700">${val}</text>`
                })
                const cx = x0 + (W_COL-8)/2
                labels += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+16).toFixed(1)}" text-anchor="middle" fill="#333" font-size="10" font-weight="600">${(p.nombre||'').split(' ')[0]}</text>`
                labels += `<text x="${cx.toFixed(1)}" y="${(TOP+BAR_H+28).toFixed(1)}" text-anchor="middle" fill="#888" font-size="9">${p.posicion||''}</text>`
              })
              let linePath = ''
              if (lineKey && lineVals.some(v=>v>0)) {
                const pts = players.map((p, pi) => {
                  const val = Number(p[lineKey])||0
                  const cx = pi*W_COL + 4 + (W_COL-8)/2
                  const cy = val > 0 ? TOP + BAR_H - (val/maxLine)*BAR_H*0.85 : null
                  return {cx, cy, val}
                }).filter(pt => pt.cy !== null)
                if (pts.length > 1) {
                  linePath = `<polyline points="${pts.map(pt=>`${pt.cx.toFixed(1)},${pt.cy!.toFixed(1)}`).join(' ')}" fill="none" stroke="${lineColor||'#34d399'}" stroke-width="1.5" stroke-dasharray="4,2"/>`
                  pts.forEach(pt => {
                    linePath += `<circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy!.toFixed(1)}" r="3" fill="${lineColor||'#34d399'}" stroke="#fff" stroke-width="1"/>`
                    linePath += `<text x="${pt.cx.toFixed(1)}" y="${(pt.cy!-5).toFixed(1)}" text-anchor="middle" fill="${lineColor||'#34d399'}" font-size="7" font-weight="700">${pt.val}</text>`
                  })
                }
              }
              return `<svg viewBox="0 0 ${totalW} ${TOP+BAR_H+BOT}" width="100%" style="overflow:visible;display:block;">${bars}${linePath}${labels}</svg>`
            }

            const buildTableForSection = (players: any[], isDate: boolean, label: string, fecha: string) => {
              const avg: Record<string,number> = {}
              GPS_VARS.forEach((v:any) => {
                const vals = players.map((p:any) => Number(p[v.key])||0).filter(x=>x>0)
                if (vals.length) avg[v.key] = AVG_FIELDS_GPS.has(v.key)
                  ? Math.round(vals.reduce((s:number,x:number)=>s+x,0)/vals.length*10)/10
                  : Math.round(vals.reduce((s:number,x:number)=>s+x,0)/vals.length*10)/10
              })
              return `
              <div style="margin-bottom:20px;page-break-inside:avoid;">
                <div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:5px 12px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
                  <b style="color:#1d4ed8;font-size:12px;">${label}</b>
                  <span style="color:#555;font-size:10px;">${fecha}</span>
                </div>
                <div style="overflow:visible;">
                  <table className="wp-table" style="width:100%;border-collapse:collapse;table-layout:auto;">
                    <thead><tr>
                      <th style="${thL('#555')}">Jugador</th>
                      <th style="${thL('#555')}">Pos.</th>
                      ${!isDate ? `<th style="${thS('#555')}">Ses.</th>` : ''}
                      ${GPS_VARS.map((v:any) => `<th style="${thS(fc(v.key))}">${v.label.replace(/ \(.*\)/,'')}</th>`).join('')}
                    </tr></thead>
                    <tbody>
                      ${players.map((p:any,i:number) => `<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                        <td style="${tdL('#111',true)} white-space:nowrap;">${p.nombre}</td>
                        <td style="${tdL('#555')} font-size:9px;">${p.posicion||'—'}</td>
                        ${!isDate ? `<td style="${tdS('#555')}">${p.sesiones||1}</td>` : ''}
                        ${GPS_VARS.map((v:any) => { const val=p[v.key]; const has=val!=null&&Number(val)!==0; return `<td style="${tdS(has?fc(v.key):'#ccc',has)}">${has?val:'—'}</td>` }).join('')}
                      </tr>`).join('')}
                      <tr style="background:#eff6ff;border-top:2px solid #93c5fd;">
                        <td style="${tdL('#1d4ed8',true)} font-size:9px;text-transform:uppercase;" colspan="2">PROM. EQUIPO</td>
                        ${!isDate ? '<td></td>' : ''}
                        ${GPS_VARS.map((v:any) => { const val=avg[v.key]; return `<td style="${tdS(val?fc(v.key):'#ccc',!!val)}">${val||'—'}</td>` }).join('')}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>`
            }

            // ── CUADRO 1 ─────────────────────────────────────────────────────
            let c1 = ''
            allSecs.forEach(({key, label, isDate}) => {
              const players: any[] = gpsPerMD[key] || []
              if (!players.length) return
              const ses = sesionesInfo?.find((s:any) => s.titulo === key)
              c1 += buildTableForSection(players, isDate, label, ses?.fecha || '')
            })

            // ── Gráficos Cuadro 1 (comparativa por jugador, para el MD con datos) ──
            let c1charts = ''
            const mainMd = mdWithData.find(md => md === 'MD') || mdWithData[0]
            if (mainMd) {
              const players: any[] = gpsPerMD[mainMd] || []
              GPS_CHART_GROUPS.forEach(grp => {
                const hasData = players.some(p => grp.bars.some(b => Number(p[b.key])>0))
                if (!hasData) return
                c1charts += `<div style="margin-bottom:16px;page-break-inside:avoid;">
                  <div style="font-size:10px;font-weight:800;color:${grp.color};text-transform:uppercase;letter-spacing:.06em;text-align:center;padding:4px 0;border-bottom:1px solid ${grp.color}30;margin-bottom:8px;">${grp.title}</div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                    ${grp.bars.map(b=>`<span style="display:flex;align-items:center;gap:4px;font-size:9px;color:#555;"><span style="width:8px;height:8px;border-radius:2px;background:${b.color};display:inline-block;"></span>${b.label}</span>`).join('')}
                    ${grp.line ? `<span style="display:flex;align-items:center;gap:4px;font-size:9px;color:#555;">─── ${grp.line.label}</span>` : ''}
                  </div>
                  ${buildBarSVG(players, grp.bars, grp.line?.key, grp.line?.color)}
                </div>`
              })
            }

            // ── CUADRO 2: promedio por MD ─────────────────────────────────────
            let c2 = `<table className="wp-table" style="width:100%;border-collapse:collapse;">
              <thead><tr>
                <th style="${thL('#555')}">Métrica</th>
                ${mdWithData.map(md=>`<th style="${thS('#1d4ed8')}">${md}</th>`).join('')}
                <th style="${thS('#059669')}">Total</th>
              </tr></thead>
              <tbody>
                ${GPS_VARS.map((v:any,vi:number) => {
                  const vals = mdWithData.map(md=>mdTeamAvg(md)[v.key]||0)
                  const nz = vals.filter(x=>x>0)
                  const tot = nz.length ? (AVG_FIELDS_GPS.has(v.key) ? (nz.reduce((s:number,x:number)=>s+x,0)/nz.length) : nz.reduce((s:number,x:number)=>s+x,0)).toFixed(1) : '—'
                  return `<tr style="background:${vi%2===0?'#fff':'#f9fafb'};">
                    <td style="${tdL(fc(v.key),true)}">${v.label}</td>
                    ${mdWithData.map(md=>{const val=mdTeamAvg(md)[v.key];return`<td style="${tdS(val?fc(v.key):'#ccc',!!val)}">${val||'—'}</td>`}).join('')}
                    <td style="${tdS('#059669',true)}">${tot}</td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>`

            // Gráficos Cuadro 2 (barras por MD)
            let c2charts = ''
            GPS_CHART_GROUPS.forEach(grp => {
              const mdsOk = mdWithData.filter(md => grp.bars.some(b => (mdTeamAvg(md)[b.key]||0) > 0))
              if (!mdsOk.length) return
              const pseudoPlayers = mdsOk.map(md => {
                const avg = mdTeamAvg(md)
                return { nombre: md, posicion: '', ...Object.fromEntries(GPS_VARS.map((v:any) => [v.key, avg[v.key]||0])) }
              })
              c2charts += `<div style="margin-bottom:16px;page-break-inside:avoid;">
                <div style="font-size:10px;font-weight:800;color:${grp.color};text-transform:uppercase;text-align:center;padding:4px 0;border-bottom:1px solid ${grp.color}30;margin-bottom:8px;">${grp.title}</div>
                ${buildBarSVG(pseudoPlayers, grp.bars, grp.line?.key, grp.line?.color)}
              </div>`
            })

            // ── CUADRO 3: totales por MD ──────────────────────────────────────
            let c3 = `<table className="wp-table" style="width:100%;border-collapse:collapse;">
              <thead><tr>
                <th style="${thL('#555')}">Métrica</th>
                ${mdWithData.map(md=>`<th style="${thS('#6d28d9')}">${md}</th>`).join('')}
                <th style="${thS('#059669')}">Total</th>
              </tr></thead>
              <tbody>
                ${GPS_VARS.map((v:any,vi:number) => {
                  const vals = mdWithData.map(md => {
                    const players = gpsPerMD[md] || []
                    if (!players.length) return 0
                    if (AVG_FIELDS_GPS.has(v.key)) return mdTeamAvg(md)[v.key]||0
                    return Math.round(players.reduce((s:number,p:any)=>s+(Number(p[v.key])||0),0)*10)/10
                  })
                  const nz = vals.filter(x=>x>0)
                  const tot = nz.length ? (AVG_FIELDS_GPS.has(v.key) ? (nz.reduce((s:number,x:number)=>s+x,0)/nz.length) : vals.reduce((s:number,x:number)=>s+x,0)).toFixed(1) : '—'
                  return `<tr style="background:${vi%2===0?'#fff':'#f9fafb'};">
                    <td style="${tdL(fc(v.key),true)}">${v.label}</td>
                    ${vals.map(val=>`<td style="${tdS(val>0?fc(v.key):'#ccc',val>0)}">${val>0?val:'—'}</td>`).join('')}
                    <td style="${tdS('#059669',true)}">${tot}</td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>`

            // ── CUADRO 4: % sobre partido ─────────────────────────────────────
            const hasRef = Object.keys(refMedia).length > 0
            let c4 = ''
            if (hasRef) {
              c4 = `<table className="wp-table" style="width:100%;border-collapse:collapse;">
                <thead><tr>
                  <th style="${thL('#555')}">Jugador</th>
                  ${refMediaVars.map((v:any)=>`<th style="${thS(fc(v.key))}">${v.label.replace(/ \(.*\)/,'')}</th>`).join('')}
                </tr></thead>
                <tbody>
                  ${gpsReal.map((p:any,i:number) => {
                    const getV = (key:string) => {
                      const vs=trainingMds.map(md=>(gpsPerMD[md]||[]).find((x:any)=>x.nombre===p.nombre)?.[key]||0).filter((x:number)=>x>0)
                      return vs.length?(AVG_FIELDS_GPS.has(key)?vs.reduce((s:number,x:number)=>s+x,0)/vs.length:vs.reduce((s:number,x:number)=>s+x,0)/vs.length):0
                    }
                    return `<tr style="background:${i%2===0?'#fff':'#fafafa'};">
                      <td style="${tdL('#111',true)} white-space:nowrap;">${p.nombre}</td>
                      ${refMediaVars.map((v:any)=>{const pv=pct(getV(v.key),v.key);const col=pv===null?'#ccc':pv>=85?'#15803d':pv>=65?'#b45309':'#dc2626';return`<td style="${tdS(col,pv!==null)}">${pv!==null?pv+'%':'—'}</td>`}).join('')}
                    </tr>`
                  }).join('')}
                  ${mdWithData.filter(md=>md!=='MD').map(md=>`<tr style="background:#fff5f5;">
                    <td style="${tdL('#dc2626',true)} font-size:9px;">${md} (prom)</td>
                    ${refMediaVars.map((v:any)=>{const pv=pct(mdTeamAvg(md)[v.key]||0,v.key);const col=pv===null?'#ccc':pv>=85?'#15803d':pv>=65?'#b45309':'#dc2626';return`<td style="${tdS(col,pv!==null)}">${pv!==null?pv+'%':'—'}</td>`}).join('')}
                  </tr>`).join('')}
                  <tr style="background:#fff5f5;border-top:2px solid #fca5a5;">
                    <td style="${tdL('#dc2626',true)} text-transform:uppercase;font-size:9px;">MD (ref = 100%)</td>
                    ${refMediaVars.map(()=>`<td style="${tdS('#15803d',true)}">100%</td>`).join('')}
                  </tr>
                </tbody>
              </table>`
            }

            // ── CUADRO 5: CIV ────────────────────────────────────────────────
            let c5 = ''
            if (hasRef) {
              const civAllKeys = GPS_METRIC_ORDER.filter((k:string) => refMedia[k] > 0 || gpsVarKeys.has(k))
              const civRows = civAllKeys.map((key:string) => {
                const meta = GPS_METRIC_META[key]
                const label = meta ? `${meta.label}${meta.unit?' ('+meta.unit+')':''}` : key
                const mdVals = trainingMds.map((md:string) => mdTeamAvg(md)[key]||0).filter((x:number)=>x>0)
                const suma = !mdVals.length ? 0 : AVG_FIELDS_GPS.has(key)
                  ? Math.round(mdVals.reduce((s:number,x:number)=>s+x,0)/mdVals.length*10)/10
                  : Math.round(mdVals.reduce((s:number,x:number)=>s+x,0)*10)/10
                const ref = refMedia[key]||0
                const civ = ref > 0 ? Math.round((suma/ref)*100)/100 : null
                return {key, label, suma, ref, civ}
              }).filter((v:any) => v.ref > 0 || v.suma > 0)

              if (civRows.length) {
                c5 = `<table className="wp-table" style="width:100%;border-collapse:collapse;">
                  <thead><tr>
                    <th style="${thL('#555')}">Métrica</th>
                    <th style="${thS('#059669')}">Suma Microciclo</th>
                    <th style="${thS('#dc2626')}">Partido Ref.</th>
                    <th style="${thS('#1d4ed8')}">CIV</th>
                  </tr></thead>
                  <tbody>
                    ${civRows.map((v:any,i:number) => {
                      const civColor = v.civ===null?'#999':v.civ>1.5?'#dc2626':v.civ>=1.0?'#15803d':'#1d4ed8'
                      return `<tr style="background:${i%2===0?'#fff':'#f9fafb'};">
                        <td style="${tdL(fc(v.key),true)}">${v.label}</td>
                        <td style="${tdS('#059669',v.suma>0)}">${v.suma>0?v.suma:'—'}</td>
                        <td style="${tdS('#dc2626',v.ref>0)}">${v.ref>0?v.ref:'—'}</td>
                        <td style="padding:5px 12px;text-align:center;border-bottom:1px solid #f0f0f0;">${v.civ!==null?`<b style="color:${civColor};font-size:12px;">${v.civ.toFixed(2)}</b>`:'—'}</td>
                      </tr>`
                    }).join('')}
                  </tbody>
                </table>`
              }
            }

            // ── RANKING DE LOGROS ─────────────────────────────────────────────
            const RANKINGS = [
              {key:'max_velocity', label:'⚡ Velocidad Máxima', unit:'km/h', color:'#dc2626', dec:1},
              {key:'dist_hir',     label:'🏃 High Speed Running', unit:'m', color:'#b45309', dec:0},
            ]
            const medals = ['🥇','🥈','🥉']
            let ranking = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">'
            RANKINGS.forEach(rank => {
              const sorted = [...gpsReal]
                .filter((p:any) => Number(p[rank.key]) > 0)
                .sort((a:any,b:any) => Number(b[rank.key]) - Number(a[rank.key]))
                .slice(0, 3)
              ranking += `<div>
                <div style="font-size:12px;font-weight:800;color:${rank.color};margin-bottom:10px;">${rank.label}</div>
                ${sorted.length === 0 ? '<p style="color:#aaa;font-size:10px;">Sin datos</p>' :
                  sorted.map((p:any,i:number) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:${i===0?'#fffbeb':'#fafafa'};border:1px solid ${i===0?'#fde68a':'#e5e7eb'};margin-bottom:6px;">
                    <span style="font-size:18px;">${medals[i]}</span>
                    <div style="flex:1;">
                      <div style="font-size:11px;font-weight:600;color:#111;">${p.nombre}</div>
                      <div style="font-size:9px;color:#888;">${p.posicion||''}</div>
                    </div>
                    <div style="font-family:monospace;font-weight:800;font-size:14px;color:${rank.color};">${Number(p[rank.key]).toFixed(rank.dec)} <span style="font-size:9px;font-weight:400;color:#888;">${rank.unit}</span></div>
                  </div>`).join('')
                }
              </div>`
            })
            ranking += '</div>'

            // ══ CUADRO 6: CONTROL DE INTENSIDAD RELATIVA (GPS PDF) ══
            const c6_trainingMds = mdCols.filter(md => existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0)
            let c6 = ''
            let charts3 = ''
            if (c6_trainingMds.length > 0) {
              const rows = c6_trainingMds.map((md:string) => {
                const avg = mdTeamAvg(md)
                const dTotal = avg.dist_total || avg.distTotal || 0
                const dPerMin = avg.dist_per_min || avg.distPerMin || 0
                const activeMin = (dTotal > 0 && dPerMin > 0) ? (dTotal / dPerMin) : (avg.duracion_min || avg.minActivo || 1)
                
                const dSprint = avg.dist_v5 || avg.dist_hir || avg.distSprint || 0
                const nSprint = avg.n_sprints || avg.nSprintsGps || avg.nSprints || 0
                const accel = avg.acc_total || avg.acc2 || avg.nAcel || 0
                const decel = avg.dec_total || avg.dec2 || avg.nDecel || 0

                return {
                  name: md,
                  md,
                  activeMin,
                  metMin: dPerMin > 0 ? dPerMin : (dTotal / activeMin),
                  sprintMin: dSprint / activeMin,
                  nSprintMin: nSprint / activeMin,
                  acelDecelMin: (accel + decel) / activeMin
                }
              }).filter(r => r.activeMin > 0)
              
              if (rows.length > 0) {
                c6 = `<table className="wp-table" style="width:100%;border-collapse:collapse;margin-bottom:12px;">
                  <thead><tr>
                    <th style="${thL('#555')}">MD</th>
                    <th style="${thS('#84cc16')}">Tiempo (min)</th>
                    <th style="${thS('#60a5fa')}">Met/min</th>
                    <th style="${thS('#f59e0b')}">D.Spr/min</th>
                    <th style="${thS('#ec4899')}">Spr/min</th>
                    <th style="${thS('#34d399')}">Acel+Dec/min</th>
                  </tr></thead>
                  <tbody>
                    ${rows.map((r,i)=>`<tr style="background:${i%2===0?'#fff':'#fafafa'};">
                      <td style="${tdL('#111',true)}">${r.md}</td>
                      <td style="${tdS('#84cc16',true)}">${r.activeMin>0?r.activeMin.toFixed(1):'-'}</td>
                      <td style="${tdS('#60a5fa',r.metMin>0)}">${r.metMin>0?r.metMin.toFixed(1):'-'}</td>
                      <td style="${tdS('#f59e0b',r.sprintMin>0)}">${r.sprintMin>0?r.sprintMin.toFixed(2):'-'}</td>
                      <td style="${tdS('#ec4899',r.nSprintMin>0)}">${r.nSprintMin>0?r.nSprintMin.toFixed(3):'-'}</td>
                      <td style="${tdS('#34d399',r.acelDecelMin>0)}">${r.acelDecelMin>0?r.acelDecelMin.toFixed(2):'-'}</td>
                    </tr>`).join('')}
                  </tbody>
                </table>`
                
                const mkChartBlock = (title: string, color: string, svgHtml: string, legendItems: {label:string,color:string}[]) => `
                  <div style="border:1px solid ${color}30;border-radius:8px;padding:10px;page-break-inside:avoid;">
                    <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:.06em;text-align:center;padding-bottom:5px;border-bottom:1px solid ${color}20;margin-bottom:6px;">${title}</div>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
                      ${legendItems.map(l=>`<span style="display:flex;align-items:center;gap:3px;font-size:8px;color:#555;"><span style="width:8px;height:8px;border-radius:2px;background:${l.color};display:inline-block;"></span>${l.label}</span>`).join('')}
                    </div>
                    ${svgHtml}
                  </div>`

                charts3 = [
                  mkChartBlock('Metros / min','#60a5fa',mkBars(rows as any,[{key:'metMin',label:'Met/min',color:'#60a5fa'}]),[{label:'Met/min',color:'#60a5fa'}]),
                  mkChartBlock('Dist. Sprint / min','#f59e0b',mkBars(rows as any,[{key:'sprintMin',label:'D.Spr/min',color:'#f59e0b'}]),[{label:'D.Spr/min',color:'#f59e0b'}]),
                  mkChartBlock('Sprints / min','#ec4899',mkBars(rows as any,[{key:'nSprintMin',label:'Spr/min',color:'#ec4899'}]),[{label:'Spr/min',color:'#ec4899'}]),
                  mkChartBlock('Acel+Decel / min','#34d399',mkBars(rows as any,[{key:'acelDecelMin',label:'A+D/min',color:'#34d399'}]),[{label:'A+D/min',color:'#34d399'}]),
                ].join('')
              }
            }

            // ── ESTILOS Y HTML FINAL ──────────────────────────────────────────
            const css = `
              body{font-family:Arial,sans-serif;color:#111;background:#fff;margin:0;padding:12px;font-size:10px;}
              h2{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;margin:0 0 10px;padding-bottom:5px;}
              .sec{margin-bottom:24px;}
              .charts{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:12px;}
              @media print{
                @page{size:A4 landscape;margin:.8cm;}
                body{padding:0;}
                .np{display:none;}
                .sec{page-break-before:always;margin-bottom:0;}
                .sec.first{page-break-before:auto;}
                .charts{grid-template-columns:repeat(2,1fr);}
              }
            `

            const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
              <title>W&P GPS ${dateRange.desde} – ${dateRange.hasta}</title>
              <style>${css}</style>
            </head><body>
              <div class="np" style="margin-bottom:14px;display:flex;gap:10px;align-items:center;">
                <button className="hover-scale" onClick={() => window.print()} className="btn-ghost-blue" style={{ padding: "8px 20px" }}>🖨️ Imprimir / Guardar PDF</button>
                <span style="font-size:11px;color:#666;">Orientación: Horizontal (Landscape)</span>
              </div>
              <div style="background:#0f172a;color:#c8f135;padding:8px 16px;border-radius:6px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;">
                <b style="font-size:13px;letter-spacing:.05em;">W&P — CONTROL DE CARGA · GPS</b>
                <span style="font-size:10px;color:#94a3b8;">${dateRange.desde} → ${dateRange.hasta}</span>
              </div>

              <div class="sec first">
                <h2 style="color:#1d4ed8;border-bottom:2px solid #93c5fd;">CUADRO 1 · GPS REAL POR SESIÓN · MD+1 → MD</h2>
                ${c1 || '<p style="color:#888;">Sin datos GPS para este período.</p>'}
                ${c1charts ? `<div style="margin-top:16px;"><h3 style="font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">📊 COMPARATIVA GPS · ${mainMd||''}</h3><div class="charts">${c1charts}</div></div>` : ''}
              </div>

              <div class="sec">
                <h2 style="color:#1d4ed8;border-bottom:2px solid #bfdbfe;">CUADRO 2 · PROMEDIO EQUIPO POR MD (GPS REAL)</h2>
                ${c2}
                ${c2charts ? `<div style="margin-top:16px;"><h3 style="font-size:10px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">📊 GRÁFICO AGRUPADO · PROMEDIO EQUIPO</h3><div class="charts">${c2charts}</div></div>` : ''}
              </div>

              <div class="sec">
                <h2 style="color:#6d28d9;border-bottom:2px solid #ddd8fe;">CUADRO 3 · TOTALES EQUIPO POR MD (GPS REAL)</h2>
                ${c3}
              </div>

              ${hasRef ? `
              <div class="sec">
                <h2 style="color:#dc2626;border-bottom:2px solid #fca5a5;">CUADRO 4 · VOLUMEN RELATIVO</h2>
                ${c4}
              </div>
              <div class="sec">
                <h2 style="color:#1d4ed8;border-bottom:2px solid #bfdbfe;">CUADRO 5 · ÍNDICE DE CARGA GPS (CIV)</h2>
                ${c5 || '<p style="color:#888;">Sin datos suficientes.</p>'}
              </div>` : ''}

              <div class="sec">
                <h2 style="color:#b45309;border-bottom:2px solid #fde68a;">🏆 RANKING DE LOGROS — MICROCICLO</h2>
                ${ranking}
              </div>
              
              ${c6 ? `
              <div class="sec pb">
                <h2 style="color:#a855f7;border-bottom:2px solid #c084fc;">CUADRO 6 — CONTROL DE INTENSIDAD RELATIVA (/ MINUTO)</h2>
                ${c6}
                <div class="charts">${charts3}</div>
              </div>` : ''}
              
            </body></html>`

            win.document.write(html)
            win.document.close()
          }} className="btn-ghost-blue">🖨️ PDF</button>
        </div>
      </div>

      {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--silver)' }}>Cargando GPS...</div> :
      !gpsReal.length ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:16 }}>
          Sin datos GPS importados para este período. Importá archivos desde la pestaña 📡 GPS.
        </div>
      ) : (<>

      {/* ══ CUADRO 1: Por MD — datos REALES por jugador ════════════════════ */}
      <div style={{ marginBottom:20, pageBreakBefore:'auto', breakBefore:'auto' }}>
        <div style={{ padding:'10px 0 12px' }}>
          <CuadroHeader 
            icon={Icons.equipo} 
            cuadroNum="1" 
            title="GPS REAL POR SESIÓN – MD+1 ➔ MD" 
            description="Datos reales individuales por jugador en cada sesión del microciclo" 
            color="#60a5fa" 
          />
        </div>
        {/* GPS por fecha (sin sesion_id asignado) — GPS data not linked to a planned session */}
        {(() => {
          const mdLabels = new Set(MD_ORDER_LOCAL)
          const dateKeys = Object.keys(gpsPerMD).filter(k => !mdLabels.has(k)).sort()
          if (!dateKeys.length) return null
          return (
            <div style={{ marginBottom:12 }}>
              <p style={{ fontSize:10, color:'#f59e0b', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>
                ⚠️ GPS importado sin sesión planificada asignada — mostrando por fecha
              </p>
              {dateKeys.map(dateKey => {
                const datePlayers: any[] = gpsPerMD[dateKey] || []
                return (
                  <div key={dateKey} style={{ background:'var(--ink2)', border:'1px solid rgba(245,158,11,.25)', borderRadius:14, overflow:'hidden', marginBottom:10 }}>
                    <div style={{ padding:'8px 16px', background:'rgba(245,158,11,.06)', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:13, fontWeight:800, color:'#f59e0b', fontFamily:'Bebas Neue,sans-serif', letterSpacing:'0.1em' }}>📅 {dateKey}</span>
                      <span style={{ fontSize:10, color:'var(--fog)' }}>{datePlayers.length} jugadores</span>
                    </div>
                    <div style={{ overflowX:'auto' }}>
                      <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                        <thead>
                          <tr style={{ background:'rgba(255,255,255,.02)' }}>
                            <th style={{ padding:'5px 14px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>Jugador</th>
                            <th style={{ padding:'5px 8px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>Pos.</th>
                            {GPS_VARS.map(v=>(
                              <th key={v.key} style={{ padding:'5px 8px', textAlign:'center', color:v.color, fontSize:8, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:'1px solid var(--mist)' }}>{v.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {datePlayers.map((p:any, i:number)=>(
                            <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                              <td style={{ padding:'6px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                              <td style={{ padding:'6px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                              {GPS_VARS.map(v=>{
                                const val = p[v.key]
                                const hasVal = val !== null && val !== undefined && Number(val) !== 0
                                return (
                                  <td key={v.key} style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:hasVal?v.color:'var(--fog)', fontWeight:hasVal?600:400 }}>
                                    {hasVal ? val : '—'}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
        {mdCols.map((md:string) => {
          const hasData = existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0
          const mdPlayers: any[] = gpsPerMD[md] || []
          const ses = sesionesInfo.find((s:any) => s.titulo === md)
          const teamAvgMD = mdTeamAvg(md)
          const POS_COLS: Record<string,string> = {}
          mdPlayers.forEach((p:any,i:number) => { POS_COLS[p.nombre] = POS_LIST[i%POS_LIST.length] })

          return (
            <div key={md} style={{ background:'var(--ink2)', border:`1px solid ${hasData?'rgba(96,165,250,.25)':'var(--mist)'}`, borderRadius:14, overflow:'hidden', marginBottom:12, opacity:hasData?1:0.45 }}>
              {/* MD Header */}
              <div style={{ padding:'8px 16px', background:hasData?'rgba(96,165,250,.06)':'rgba(255,255,255,.02)', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:13, fontWeight:800, color:hasData?'#60a5fa':'var(--fog)', fontFamily:'Bebas Neue,sans-serif', letterSpacing:'0.1em' }}>{md}</span>
                {ses ? <span style={{ fontSize:10, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>{ses.fecha}</span>
                     : <span style={{ fontSize:10, color:'var(--fog)', fontStyle:'italic' }}>Sin sesión asignada</span>}
              </div>
              {hasData ? (
                <>
                <div style={{ overflowX:'auto' }}>
                  <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                    <thead>
                      <tr>
                        <th colSpan={3} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(96,165,250,.06)', color:'#60a5fa', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--mist)' }}>
                          DATOS REALES GPS — individuales por jugador
                        </th>
                        <th colSpan={GPS_VARS.length} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(96,165,250,.04)', color:'#93c5fd', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', borderBottom:'1px solid var(--mist)' }}>
                          MÉTRICAS GPS
                        </th>
                      </tr>
                      <tr style={{ background:'rgba(255,255,255,.02)' }}>
                        <th style={{ padding:'5px 14px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>Jugador</th>
                        <th style={{ padding:'5px 8px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>Pos.</th>
                        <th style={{ padding:'5px 8px', textAlign:'center', color:'var(--silver)', fontSize:8, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>Ses.</th>
                        {GPS_VARS.map(v=>(
                          <th key={v.key} style={{ padding:'5px 8px', textAlign:'center', color:v.color, fontSize:8, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap', borderBottom:'1px solid var(--mist)', background:'rgba(96,165,250,.03)' }}>{v.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mdPlayers.map((p:any, i:number)=>(
                        <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.01)' }}>
                          <td style={{ padding:'6px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                          <td style={{ padding:'6px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                          <td style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'var(--silver)' }}>{p.sesiones||1}</td>
                          {GPS_VARS.map(v=>{
                            const val = p[v.key]
                            const hasVal = val !== null && val !== undefined && Number(val) !== 0
                            return (
                              <td key={v.key} style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:hasVal?v.color:'var(--fog)', fontWeight:hasVal?600:400, background:'rgba(96,165,250,.02)' }}>
                                {hasVal ? val : '—'}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {/* Team avg row */}
                      <tr style={{ borderTop:'2px solid rgba(96,165,250,.35)', background:'rgba(96,165,250,.05)' }}>
                        <td style={{ padding:'6px 14px', fontWeight:800, color:'#60a5fa', fontSize:10, textTransform:'uppercase' }}>PROM. EQUIPO</td>
                        <td/><td/>
                        {GPS_VARS.map(v=>{
                          const val = teamAvgMD[v.key]
                          return (
                            <td key={v.key} style={{ padding:'6px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:val?v.color:'var(--fog)', background:'rgba(96,165,250,.04)' }}>
                              {val||'—'}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Charts: real GPS per player */}
                {(() => {
                  const BAR_H = 180
                  return (
                    <div style={{ padding:'16px', borderTop:'2px solid rgba(96,165,250,.15)', background:'rgba(0,0,0,.2)' }}>
                      <div style={{ fontSize:13, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>
                        📊 COMPARATIVA GPS · {md}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }}>
                        {GPS_CHART_GROUPS.map(grp => {
                          // Sort players ONCE — use this sorted list for bars, line, AND labels
                          const sorted = [...mdPlayers].sort((a:any,b:any)=>(Number(b[grp.bars[0].key])||0)-(Number(a[grp.bars[0].key])||0))
                          const allVals = sorted.flatMap((p:any)=>grp.bars.map(b=>Number(p[b.key])||0))
                          const maxBar = Math.max(...allVals, 1)
                          const lineVals = grp.line ? sorted.map((p:any)=>Number(p[grp.line!.key])||0) : []
                          const maxLine = Math.max(...lineVals, 1)
                          const n = sorted.length

                          return (
                            <div key={grp.title} style={{ background:'var(--ink2)', borderRadius:12, padding:14, border:`1px solid ${grp.color}30` }}>
                              <div style={{ fontSize:13, fontWeight:800, color:grp.color, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', marginBottom:4, borderBottom:`1px solid ${grp.color}30`, paddingBottom:6 }}>{grp.title}</div>
                              <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:10 }}>
                                {grp.bars.map(b=>(
                                  <span key={b.key} style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--silver)' }}>
                                    <span style={{ width:10, height:10, borderRadius:2, background:b.color, display:'inline-block' }}/>{b.label}
                                  </span>
                                ))}
                                {grp.line && (
                                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'var(--silver)' }}>
                                    <svg width="16" height="8"><line x1="0" y1="4" x2="16" y2="4" stroke={grp.line.color} strokeWidth="2" strokeDasharray="4,2"/><circle cx="8" cy="4" r="2.5" fill={grp.line.color}/></svg>
                                    {grp.line.label}
                                  </span>
                                )}
                              </div>
                              <div style={{ position:'relative', height:`${BAR_H+36}px` }}>
                                {[0,25,50,75,100].map(p=>(
                                  <div key={p} style={{ position:'absolute', left:0, right:0, bottom:`${(p/100)*BAR_H+28}px`, borderTop:'1px solid rgba(255,255,255,.04)' }}/>
                                ))}
                                {/* Bars + inline dots per player */}
                                <div style={{ position:'absolute', bottom:28, left:0, right:0, height:BAR_H, display:'flex' }}>
                                  {sorted.map((p:any, pi:number)=>{
                                    const lineVal = grp.line ? Number(p[grp.line.key])||0 : 0
                                    // bottom offset in px (from bottom of this container = bottom of bars area)
                                    const dotBottom = lineVal > 0 ? (lineVal/maxLine)*BAR_H*0.85 + BAR_H*0.05 : -999
                                    return (
                                      <div key={pi} style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', justifyContent:'flex-end', alignItems:'center', minWidth:0 }}>
                                        {/* Bar group */}
                                        <div style={{ display:'flex', gap:2, alignItems:'flex-end', width:'100%', justifyContent:'center' }}>
                                          {grp.bars.map((b,bi)=>{
                                            const val = Number(p[b.key])||0
                                            const h = Math.max((val/maxBar)*BAR_H, val>0?4:2)
                                            return (
                                              <div key={bi} title={`${p.nombre}: ${val} ${b.label}`}
                                                style={{ position:'relative', width:'100%', maxWidth:20, height:`${h}px`, background:val>0?b.color:`${b.color}18`, borderRadius:'3px 3px 0 0', minWidth:6, overflow:'visible' }}>
                                                {val>0 && h>=16 && <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-90deg)', fontSize:8, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap', textShadow:'0 1px 2px rgba(0,0,0,.9)', pointerEvents:'none' }}>{val}</span>}
                                              </div>
                                            )
                                          })}
                                        </div>
                                        {/* Inline dot + value label — rendered INSIDE the column for guaranteed horizontal alignment */}
                                        {grp.line && lineVal > 0 && (
                                          <div className="anim-fade-up" style={{ position:'absolute', left:'50%', bottom:dotBottom - 5, zIndex:10, pointerEvents:'none', display:'flex', flexDirection:'column', alignItems:'center', animationDelay:`${0.5 + pi*0.05}s` }}>
                                            <span style={{ fontSize:BAR_H*0.08, fontFamily:'DM Mono,monospace', fontWeight:700, color:grp.line.color, whiteSpace:'nowrap', marginBottom:4, textShadow:'0 1px 3px rgba(0,0,0,.8)' }}>{lineVal}</span>
                                            <div style={{ width:10, height:10, borderRadius:'50%', background:grp.line.color, border:'1.5px solid #000', boxSizing:'border-box', flexShrink:0 }} />
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                                {/* SVG: ONLY dashed connecting lines between dots (no dots/text — those are DOM elements above) */}
                                {grp.line && n >= 2 && (() => {
                                  const pts = sorted.map((p:any, i:number) => {
                                    const v = Number(p[grp.line!.key])||0
                                    // y from TOP of SVG = BAR_H - dotBottom
                                    const dotBottom = v > 0 ? (v/maxLine)*BAR_H*0.85 + BAR_H*0.05 : -1
                                    return { x: ((i + 0.5) / n) * 100, y: v > 0 ? BAR_H - dotBottom : null }
                                  })
                                  const valid = pts.filter(p => p.y !== null) as {x:number,y:number}[]
                                  if (valid.length < 2) return null
                                  return (
                                    <svg style={{ position:'absolute', bottom:28, left:0, right:0, width:'100%', height:BAR_H, overflow:'visible', pointerEvents:'none' }}>
                                      {valid.map((pt, i) => i > 0 ? (
                                        <line key={i} x1={`${valid[i-1].x}%`} y1={valid[i-1].y} x2={`${pt.x}%`} y2={pt.y}
                                          stroke={grp.line!.color} strokeWidth="2.5" strokeDasharray="12,7" />
                                      ) : null)}
                                    </svg>
                                  )
                                })()}
                                {/* X-axis labels */}
                                <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex' }}>
                                  {sorted.map((p:any,pi:number)=>(
                                    <div key={pi} style={{ flex:1, textAlign:'center', minWidth:0 }}>
                                      <div style={{ fontSize:11, color:POS_COLS[p.nombre]||'#888', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nombre.split(' ')[0]}</div>
                                      <div style={{ fontSize:10, color:'var(--fog)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{(p.posicion||'').split(' ')[0]}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
                </>
              ) : (
                <div style={{ padding:'10px 16px', color:'var(--fog)', fontSize:11, fontStyle:'italic' }}>Sin datos GPS importados para {md}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* ══ CUADRO 2: Totales por MD (GPS) ══════════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(96,165,250,.2)', borderRadius:16, overflow:'hidden', marginBottom:20, pageBreakBefore:'always', breakBefore:'page' }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
          <CuadroHeader 
            icon={Icons.bateria} 
            cuadroNum="2" 
            title="PROMEDIO EQUIPO POR MD (GPS REAL)" 
            description="Promedio del equipo en cada sesión · MD+1 ➔ MD" 
            color="#60a5fa" 
          />
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'rgba(96,165,250,.05)' }}>
                <th style={{ padding:'8px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Métrica</th>
                {mdCols.map(md=>(
                  <th key={md} style={{ padding:'8px 10px', textAlign:'center', color:existingMdLabels.has(md)&&(gpsPerMD[md]||[]).length>0?'#60a5fa':'var(--fog)', fontSize:10, fontWeight:700, whiteSpace:'nowrap', opacity:existingMdLabels.has(md)&&(gpsPerMD[md]||[]).length>0?1:0.5 }}>{md}</th>
                ))}
                <th style={{ padding:'8px 10px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {GPS_VARS.map((v,i)=>{
                const vals = mdCols.map(md => mdTeamAvg(md)[v.key] || 0)
                // For avg fields (max_velocity, dist_per_min): show avg of MDs, not sum
                const hasData = vals.some(x=>x>0)
                const total = AVG_FIELDS_GPS.has(v.key)
                  ? (() => { const nonZero = vals.filter(x=>x>0); return nonZero.length ? Math.round(nonZero.reduce((s,x)=>s+x,0)/nonZero.length*10)/10 : 0 })()
                  : Math.round(vals.reduce((s,x)=>s+x,0)*10)/10
                return (
                  <tr key={v.key} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                    <td style={{ padding:'7px 14px', color:v.color, fontWeight:600, fontSize:11 }}>{v.label}</td>
                    {vals.map((val,j)=>(
                      <td key={j} style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:val>0?v.color:'var(--fog)', fontWeight:val>0?600:400 }}>{val>0?val:'—'}</td>
                    ))}
                    <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#34d399' }}>{total>0?total:'—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* ── Gráficos Cuadro 2: promedio equipo por MD ── */}
        {GPS_CHART_GROUPS.length > 0 && (() => {
          const BAR_H = 160
          const activeMds = mdCols.filter(md => existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0)
          if (!activeMds.length) return null
          return (
            <div style={{ padding:16, borderTop:'1px solid var(--mist)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 GRÁFICO AGRUPADO · PROMEDIO EQUIPO POR MD</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
                {GPS_CHART_GROUPS.map(grp => {
                  const vals = activeMds.map(md => grp.bars.map(b => mdTeamAvg(md)[b.key]||0))
                  const allVals = vals.flat()
                  const maxBar = Math.max(...allVals, 1)
                  const lineVals = grp.line ? activeMds.map(md => mdTeamAvg(md)[grp.line!.key]||0) : []
                  const maxLine = Math.max(...lineVals, 1)
                  const n = activeMds.length
                  return (
                    <div key={grp.title} style={{ background:'var(--ink3)', borderRadius:12, padding:14, border:`1px solid ${grp.color}30` }}>
                      <div style={{ fontSize:11, fontWeight:800, color:grp.color, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', marginBottom:4, borderBottom:`1px solid ${grp.color}30`, paddingBottom:6 }}>{grp.title}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:8 }}>
                        {grp.bars.map(b=>(
                          <span key={b.key} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:'var(--silver)' }}>
                            <span style={{ width:8, height:8, borderRadius:2, background:b.color, display:'inline-block' }}/>{b.label}
                          </span>
                        ))}
                        {grp.line && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:'var(--silver)' }}>
                          <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke={grp.line.color} strokeWidth="2" strokeDasharray="4,2"/><circle cx="7" cy="3" r="2" fill={grp.line.color}/></svg>
                          {grp.line.label}
                        </span>}
                      </div>
                      <div style={{ position:'relative', height:`${BAR_H+28}px` }}>
                        {[0,25,50,75,100].map(p=>(
                          <div key={p} style={{ position:'absolute', left:0, right:0, bottom:`${(p/100)*BAR_H+20}px`, borderTop:'1px solid rgba(255,255,255,.04)' }}/>
                        ))}
                        <div style={{ position:'absolute', bottom:20, left:0, right:0, display:'flex', alignItems:'flex-end' }}>
                          {activeMds.map((md, mi) => (
                            <div key={md} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', minWidth:0 }}>
                              <div style={{ display:'flex', gap:2, alignItems:'flex-end', width:'100%', justifyContent:'center' }}>
                                {grp.bars.map((b,bi) => {
                                  const val = mdTeamAvg(md)[b.key]||0
                                  const h = Math.max((val/maxBar)*BAR_H, val>0?4:2)
                                  return (
                                    <div key={bi} title={`${md}: ${val}`}
                                      className="anim-bar-v" style={{ position:'relative', width:'100%', maxWidth:24, height:`${h}px`, background:val>0?b.color:`${b.color}18`, borderRadius:'3px 3px 0 0', minWidth:6 }}>
                                      {val>0 && h>=16 && <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-90deg)', fontSize:7, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap', textShadow:'0 1px 2px rgba(0,0,0,.9)' }}>{val}</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        {grp.line && lineVals.length >= 1 && (() => {
                          const allPts = lineVals.map((v,i)=>({ x: ((i + 0.5) / n) * 100, y: v>0?(1-(v/maxLine))*BAR_H*0.85+BAR_H*0.05:null, v }))
                          const validPts = allPts.filter(pt=>pt.y!==null) as {x:number,y:number,v:number}[]
                          return (
                            <svg style={{ position:'absolute', bottom:20, left:0, right:0, width:'100%', height:`${BAR_H}px`, overflow:'visible', pointerEvents:'none' }}>
                              {validPts.length>1 && validPts.map((pt, i) => i > 0 ? (
                                <line key={`l-${i}`} x1={`${validPts[i-1].x}%`} y1={validPts[i-1].y!} x2={`${pt.x}%`} y2={pt.y!} stroke={grp.line.color} strokeWidth="2.5" strokeDasharray="12,7" />
                              ) : null)}
                              {allPts.map((pt,i)=>pt.y===null?null:(
                                <g key={`p-${i}`}>
                                  <circle cx={`${pt.x}%`} cy={pt.y} r="4.5" fill={grp.line!.color} stroke="#000" strokeWidth="1.5" />
                                  {pt.v>0 && <text x={`${pt.x}%`} y={pt.y} dy="-14" textAnchor="middle" fill={grp.line!.color} fontFamily="DM Mono,monospace" fontWeight="bold" style={{ fontSize:`${BAR_H*0.08}px` }}>{pt.v}</text>}
                                </g>
                              ))}
                            </svg>
                          )
                        })()}
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex' }}>
                          {activeMds.map(md=>(
                            <div key={md} style={{ flex:1, textAlign:'center', minWidth:0 }}>
                              <div style={{ fontSize:9, color:'#60a5fa', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{md}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ══ CUADRO 3: TOTALES POR MD (GPS REAL) ═══════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(168,85,247,.2)', borderRadius:16, overflow:'hidden', marginBottom:20, pageBreakBefore:'always', breakBefore:'page' }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
          <CuadroHeader 
            icon={Icons.calculadora} 
            cuadroNum="3" 
            title="TOTALES EQUIPO POR MD (GPS REAL)" 
            description="Suma total del equipo (promedio × nº jugadores con datos) en cada sesión" 
            color="#a78bfa" 
          />
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr style={{ background:'rgba(168,85,247,.05)' }}>
                <th style={{ padding:'8px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Métrica</th>
                {mdCols.map(md=>(
                  <th key={md} style={{ padding:'8px 10px', textAlign:'center', color:existingMdLabels.has(md)&&(gpsPerMD[md]||[]).length>0?'#a78bfa':'var(--fog)', fontSize:10, fontWeight:700, whiteSpace:'nowrap', opacity:existingMdLabels.has(md)&&(gpsPerMD[md]||[]).length>0?1:0.5 }}>{md}</th>
                ))}
                <th style={{ padding:'8px 10px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700 }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {GPS_VARS.map((v,i)=>{
                const vals = mdCols.map(md => {
                  const players = gpsPerMD[md] || []
                  if (!players.length) return 0
                  // For avg fields: team avg (already correct); for cumulative: sum all players
                  if (AVG_FIELDS_GPS.has(v.key)) return mdTeamAvg(md)[v.key] || 0
                  return Math.round(players.reduce((s:number,p:any)=>s+(Number(p[v.key])||0),0)*10)/10
                })
                const total = AVG_FIELDS_GPS.has(v.key)
                  ? (() => { const nz=vals.filter(x=>x>0); return nz.length?Math.round(nz.reduce((s,x)=>s+x,0)/nz.length*10)/10:0 })()
                  : Math.round(vals.reduce((s,x)=>s+x,0)*10)/10
                return (
                  <tr key={v.key} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                    <td style={{ padding:'7px 14px', color:v.color, fontWeight:600, fontSize:11 }}>{v.label}</td>
                    {vals.map((val,j)=>(
                      <td key={j} style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:val>0?v.color:'var(--fog)', fontWeight:val>0?600:400 }}>{val>0?val:'—'}</td>
                    ))}
                    <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#34d399' }}>{total>0?total:'—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Gráficos Cuadro 3: totales por MD */}
        {GPS_CHART_GROUPS.length > 0 && (() => {
          const BAR_H = 160
          const activeMds = mdCols.filter(md => existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0)
          if (!activeMds.length) return null
          return (
            <div style={{ padding:16, borderTop:'1px solid var(--mist)' }}>
              <p style={{ fontSize:10, fontWeight:700, color:'#a78bfa', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📊 GRÁFICO AGRUPADO · TOTALES EQUIPO POR MD</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:16 }}>
                {GPS_CHART_GROUPS.map(grp => {
                  const getTotal = (md:string, key:string) => {
                    const players = gpsPerMD[md] || []
                    if (!players.length) return 0
                    if (AVG_FIELDS_GPS.has(key)) return mdTeamAvg(md)[key]||0
                    return Math.round(players.reduce((s:number,p:any)=>s+(Number(p[key])||0),0)*10)/10
                  }
                  const allVals = activeMds.flatMap(md => grp.bars.map(b => getTotal(md, b.key)))
                  const maxBar = Math.max(...allVals, 1)
                  const lineVals = grp.line ? activeMds.map(md => getTotal(md, grp.line!.key)) : []
                  const maxLine = Math.max(...lineVals, 1)
                  const n = activeMds.length
                  return (
                    <div key={grp.title} style={{ background:'var(--ink3)', borderRadius:12, padding:14, border:`1px solid ${grp.color}30` }}>
                      <div style={{ fontSize:11, fontWeight:800, color:grp.color, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', marginBottom:4, borderBottom:`1px solid ${grp.color}30`, paddingBottom:6 }}>{grp.title}</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', marginBottom:8 }}>
                        {grp.bars.map(b=>(
                          <span key={b.key} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:'var(--silver)' }}>
                            <span style={{ width:8, height:8, borderRadius:2, background:b.color, display:'inline-block' }}/>{b.label}
                          </span>
                        ))}
                        {grp.line && <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, color:'var(--silver)' }}>
                          <svg width="14" height="6"><line x1="0" y1="3" x2="14" y2="3" stroke={grp.line.color} strokeWidth="2" strokeDasharray="4,2"/><circle cx="7" cy="3" r="2" fill={grp.line.color}/></svg>
                          {grp.line.label}
                        </span>}
                      </div>
                      <div style={{ position:'relative', height:`${BAR_H+28}px` }}>
                        {[0,25,50,75,100].map(p=>(
                          <div key={p} style={{ position:'absolute', left:0, right:0, bottom:`${(p/100)*BAR_H+20}px`, borderTop:'1px solid rgba(255,255,255,.04)' }}/>
                        ))}
                        <div style={{ position:'absolute', bottom:20, left:0, right:0, display:'flex', alignItems:'flex-end' }}>
                          {activeMds.map((md, mi) => (
                            <div key={md} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', minWidth:0 }}>
                              <div style={{ display:'flex', gap:2, alignItems:'flex-end', width:'100%', justifyContent:'center' }}>
                                {grp.bars.map((b,bi) => {
                                  const val = getTotal(md, b.key)
                                  const h = Math.max((val/maxBar)*BAR_H, val>0?4:2)
                                  return (
                                    <div key={bi} title={`${md}: ${val}`}
                                      className="anim-bar-v" style={{ position:'relative', width:'100%', maxWidth:24, height:`${h}px`, background:val>0?b.color:`${b.color}18`, borderRadius:'3px 3px 0 0', minWidth:6 }}>
                                      {val>0 && h>=16 && <span style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-90deg)', fontSize:7, color:'#fff', fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap', textShadow:'0 1px 2px rgba(0,0,0,.9)' }}>{val}</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        {grp.line && lineVals.length >= 1 && (() => {
                          const allPts = lineVals.map((v,i)=>({ x: ((i + 0.5) / n) * 100, y: v>0?(1-(v/maxLine))*BAR_H*0.85+BAR_H*0.05:null, v }))
                          const validPts = allPts.filter(pt=>pt.y!==null) as {x:number,y:number,v:number}[]
                          return (
                            <svg style={{ position:'absolute', bottom:20, left:0, right:0, width:'100%', height:`${BAR_H}px`, overflow:'visible', pointerEvents:'none' }}>
                              {validPts.length>1 && validPts.map((pt, i) => i > 0 ? (
                                <line key={`l-${i}`} x1={`${validPts[i-1].x}%`} y1={validPts[i-1].y!} x2={`${pt.x}%`} y2={pt.y!} stroke={grp.line.color} strokeWidth="2.5" strokeDasharray="12,7" />
                              ) : null)}
                              {allPts.map((pt,i)=>pt.y===null?null:(
                                <g key={`p-${i}`}>
                                  <circle cx={`${pt.x}%`} cy={pt.y} r="4.5" fill={grp.line!.color} stroke="#000" strokeWidth="1.5" />
                                  {pt.v>0 && <text x={`${pt.x}%`} y={pt.y} dy="-14" textAnchor="middle" fill={grp.line!.color} fontFamily="DM Mono,monospace" fontWeight="bold" style={{ fontSize:`${BAR_H*0.08}px` }}>{pt.v}</text>}
                                </g>
                              ))}
                            </svg>
                          )
                        })()}
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex' }}>
                          {activeMds.map(md=>(
                            <div key={md} style={{ flex:1, textAlign:'center', minWidth:0 }}>
                              <div style={{ fontSize:9, color:'#a78bfa', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{md}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* ══ CUADRO 4: Volumen Relativo (GPS) ═════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.2)', borderRadius:16, overflow:'hidden', marginBottom:8, pageBreakBefore:'always', breakBefore:'page' }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div>
            <CuadroHeader 
              icon={Icons.porcentaje} 
              cuadroNum="4" 
              title="VOLUMEN RELATIVO" 
              description="Media de 3 partidos de referencia · objetivo 100% por variable" 
              color="#f87171" 
            />
          </div>
          <button className="hover-scale" onClick={()=>setShowRefInput(!showRefInput)} style={{ fontSize:11, padding:'6px 14px', borderRadius:8, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.3)', cursor:'pointer' }}>
            {showRefInput?'▲ Ocultar':'▼ Ingresar partidos'}
          </button>
        </div>
        {showRefInput && (
          <div style={{ padding:16, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.03)' }}>
            <p style={{ fontSize:10, color:'var(--fog)', marginBottom:14 }}>Seleccioná hasta 3 partidos del Calendario — los datos GPS se cargan automáticamente:</p>
            {[0,1,2,3,4].map(ri=>(
              <div key={ri} style={{ marginBottom:16, background:'var(--ink3)', borderRadius:10, padding:12, border:'1px solid rgba(239,68,68,.15)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, flexWrap:'wrap' }}>
                  <span style={{ fontSize:10, fontWeight:700, color:'#f87171' }}>🏆 Partido {ri+1}</span>
                  <select className="wp-input" style={{ flex:1, minWidth:200, appearance:'none', fontSize:11, padding:'5px 10px' }}
                    value={selectedPartidos[ri]?.fecha+'_'+selectedPartidos[ri]?.rival||''}
                    onChange={e=>{ const val=e.target.value; if(!val){selectPartido(ri,null);return}; const p=partidos.find((x:any)=>`${x.fecha}_${x.rival}`===val); if(p) selectPartido(ri,p) }}>
                    <option value="">— Seleccionar partido —</option>
                    {partidos.map((p:any)=>(
                      <option key={`${p.fecha}_${p.rival}`} value={`${p.fecha}_${p.rival}`} style={{ background:'var(--ink2)' }}>
                        {p.fecha} · vs {p.rival||'Partido'} {p._src==='calendar'?'📅':'📋'}
                      </option>
                    ))}
                  </select>
                  {selectedPartidos[ri] && <button className="hover-scale" onClick={()=>selectPartido(ri,null)} style={{ fontSize:10, padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer' }}>✕</button>}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:6 }}>
                  {GPS_METRIC_ORDER.map(key=>{
                    const meta = GPS_METRIC_META[key]
                    if (!meta) return null
                    const label = `${meta.label}${meta.unit ? ' ('+meta.unit+')' : ''}`
                    const color = GPS_KEY_COLORS[key] || '#94a3b8'
                    // Show if: present in GPS_VARS (current microcycle data),
                    // OR has a value in any ref slot (manually entered or loaded),
                    // OR is a key metric that should always be editable
                    const ALWAYS_SHOW = new Set(['dist_total','dist_hir','dist_v4','dist_v5','dist_per_min','max_velocity','n_sprints','acc2','dec2','player_load'])
                    const hasValue = partidoRefs.some((r:any) => Number(r[key]) > 0)
                    const inData = GPS_VARS.some((v:any) => v.key === key)
                    if (!ALWAYS_SHOW.has(key) && !inData && !hasValue) return null
                    return (
                      <div key={key}>
                        <label style={{ fontSize:9, color, display:'block', marginBottom:2, textTransform:'uppercase', fontWeight:600 }}>{label}</label>
                        <input className="wp-input" type="number" placeholder="—" style={{ padding:'4px 7px', fontSize:11, width:'100%', background:partidoRefs[ri]?.[key]?'rgba(239,68,68,.08)':'transparent' }}
                          value={partidoRefs[ri]?.[key]||''}
                          onChange={e=>{ const nr=[...partidoRefs]; nr[ri]={...nr[ri],[key]:Number(e.target.value)||''}; setPartidoRefs(nr) }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {Object.keys(refMedia).length>0 && (
              <div style={{ padding:'8px 12px', background:'rgba(239,68,68,.08)', borderRadius:8, display:'flex', flexWrap:'wrap', gap:10 }}>
                <span style={{ fontSize:10, color:'#f87171', fontWeight:700 }}>📊 Media referencia:</span>
                {refMediaVars.map(v=>(
                  <span key={v.key} style={{ fontSize:11, color:v.color, fontFamily:'DM Mono,monospace' }}>{v.label}: <strong>{refMedia[v.key]}</strong></span>
                ))}
              </div>
            )}
          </div>
        )}
        {Object.keys(refMedia).length===0 ? (
          <div style={{ padding:24, textAlign:'center', color:'var(--fog)', fontSize:12 }}>Ingresá los valores de 3 partidos de referencia para ver los porcentajes.</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ background:'rgba(239,68,68,.04)' }}>
                  <th style={{ padding:'7px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Jugador / MD</th>
                  {refMediaVars.map(v=>(
                    <th key={v.key} style={{ padding:'7px 8px', textAlign:'center', color:v.color, fontSize:9, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>
                      {v.label}<div style={{ fontSize:8, color:'var(--fog)', fontWeight:400 }}>ref:{refMedia[v.key]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gpsReal.map((p:any,i:number)=>{
                  // Sum only training sessions (exclude 'MD') for each player using real GPS data
                  const trainingMds = mdCols.filter(md => md !== 'MD' && existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0)
                  const getPlayerTrainingVal = (vk: string) => {
                    if (trainingMds.length === 0) return 0
                    return trainingMds.reduce((sum, md) => {
                      const playerRow = (gpsPerMD[md]||[]).find((x:any) => x.jugador_id === p.jugador_id)
                      if (!playerRow) return sum
                      // For avg fields (max_velocity, dist_per_min) — average across sessions; for cumulative — sum
                      if (AVG_FIELDS_GPS.has(vk)) {
                        // handled separately below
                        return sum
                      }
                      return sum + (Number(playerRow[vk])||0)
                    }, 0)
                  }
                  const getPlayerTrainingAvg = (vk: string) => {
                    const mdsWithData = trainingMds.filter(md => {
                      const r = (gpsPerMD[md]||[]).find((x:any) => x.jugador_id === p.jugador_id)
                      return r && Number(r[vk]) > 0
                    })
                    if (!mdsWithData.length) return 0
                    return mdsWithData.reduce((sum, md) => {
                      const r = (gpsPerMD[md]||[]).find((x:any) => x.jugador_id === p.jugador_id)
                      return sum + (Number(r?.[vk])||0)
                    }, 0) / mdsWithData.length
                  }
                  const getVal = (vk: string) => AVG_FIELDS_GPS.has(vk) ? getPlayerTrainingAvg(vk) : getPlayerTrainingVal(vk)
                  return (
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'7px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                      {refMediaVars.map(v=>{ const pv=pct(getVal(v.key),v.key); return <td key={v.key} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:pv?600:400, color:pctColor(pv) }}>{pv!==null?`${pv}%`:'—'}</td> })}
                    </tr>
                  )
                })}
                {mdCols.filter(md=>existingMdLabels.has(md)&&(gpsPerMD[md]||[]).length>0).map(md=>(
                  <tr key={md} style={{ borderTop:'1px solid rgba(239,68,68,.15)', background:'rgba(239,68,68,.03)' }}>
                    <td style={{ padding:'7px 14px', color:'#f87171', fontWeight:700, fontSize:10 }}>{md} (prom)</td>
                    {refMediaVars.map(v=>{ const val=mdTeamAvg(md)[v.key]||0; const pv=pct(val,v.key); return <td key={v.key} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:pv?600:400, color:pctColor(pv) }}>{pv!==null?`${pv}%`:'—'}</td> })}
                  </tr>
                ))}
                <tr style={{ borderTop:'2px solid rgba(239,68,68,.3)', background:'rgba(239,68,68,.05)' }}>
                  <td style={{ padding:'8px 14px', fontWeight:800, color:'#f87171', fontSize:10, textTransform:'uppercase' }}>Prom. Equipo</td>
                  {refMediaVars.map(v=>{
                    const trainingMds = mdCols.filter(md => md !== 'MD' && existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0)
                    const vals = trainingMds.map(md => mdTeamAvg(md)[v.key]||0).filter(x=>x>0)
                    const teamVal = vals.length
                      ? AVG_FIELDS_GPS.has(v.key)
                        ? Math.round(vals.reduce((s,x)=>s+x,0)/vals.length*10)/10
                        : Math.round(vals.reduce((s,x)=>s+x,0)*10)/10
                      : 0
                    const pv=pct(teamVal,v.key); return <td key={v.key} style={{ padding:'8px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:pctColor(pv) }}>{pv!==null?`${pv}%`:'—'}</td>
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ CUADRO 5: ÍNDICE DE CARGA GPS (CIV) ══════════════════════════ */}
      {Object.keys(refMedia).length > 0 && (() => {
        const trainingMds = mdCols.filter(md => md !== 'MD' && existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0)

        // CIV iterates refMedia keys + GPS_VARS keys so player_load and other
        // metrics always appear even if microcycle or partido lacks that column
        const civAllKeys = GPS_METRIC_ORDER.filter((k:string) => refMedia[k] > 0 || gpsVarKeys.has(k))
        const civData = civAllKeys.map((key:string) => {
          const meta = GPS_METRIC_META[key]
          const label = meta ? `${meta.label}${meta.unit ? ' ('+meta.unit+')' : ''}` : key
          const color = GPS_KEY_COLORS[key] || '#94a3b8'
          const mdVals = trainingMds.map((md:string) => mdTeamAvg(md)[key]||0).filter((x:number)=>x>0)
          const suma = !mdVals.length ? 0
            : AVG_FIELDS_GPS.has(key)
            ? Math.round(mdVals.reduce((s:number,x:number)=>s+x,0)/mdVals.length*10)/10
            : Math.round(mdVals.reduce((s:number,x:number)=>s+x,0)*10)/10
          const ref = refMedia[key] || 0
          const civ = ref > 0 ? Math.round((suma / ref) * 100) / 100 : null
          return { key, label, color, suma, ref, civ }
        }).filter((v:any) => v.ref > 0 || v.suma > 0 || gpsVarKeys.has(v.key))

        if (!civData.length) return null

        return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(96,165,250,.25)', borderRadius:16, overflow:'hidden', marginBottom:8, pageBreakBefore:'always', breakBefore:'page' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
              <CuadroHeader 
                icon={Icons.metricas} 
                cuadroNum="5" 
                title="ÍNDICE DE CARGA GPS (CIV) — MICROCICLO vs PARTIDO" 
                description="CIV = Suma Microciclo ÷ Partido (GPS real) · Azul <1.0 · Verde 1.0–1.5 · Rojo >1.5 · 1.0 = igual al partido" 
                color="#60a5fa" 
              />
            </div>
            <div style={{ overflowX:'auto' }}>
              <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'rgba(96,165,250,.05)' }}>
                    <th style={{ padding:'9px 16px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>MÉTRICA</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>SUMA MICROCICLO</th>
                    <th style={{ padding:'9px 12px', textAlign:'center', color:'#f87171', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>PARTIDO REF.</th>
                    <th style={{ padding:'9px 16px', textAlign:'center', color:'#60a5fa', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>CIV</th>
                  </tr>
                </thead>
                <tbody>
                  {civData.map((v, i) => {
                    const civColor = v.civ === null ? 'var(--fog)'
                      : v.civ > 1.5 ? '#ef4444'
                      : v.civ >= 1.0 ? '#22c55e'
                      : '#60a5fa'
                    const civBg = v.civ === null ? 'transparent'
                      : v.civ > 1.5 ? 'rgba(239,68,68,.08)'
                      : v.civ >= 1.0 ? 'rgba(34,197,94,.08)'
                      : 'rgba(96,165,250,.08)'
                    const civBorder = v.civ === null ? 'transparent'
                      : v.civ > 1.5 ? 'rgba(239,68,68,.3)'
                      : v.civ >= 1.0 ? 'rgba(34,197,94,.3)'
                      : 'rgba(96,165,250,.3)'
                    return (
                      <tr key={v.key} style={{ borderTop:'1px solid var(--mist)', background: i%2===0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                        <td style={{ padding:'9px 16px', color: v.color, fontWeight:600 }}>{v.label}</td>
                        <td style={{ padding:'9px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#34d399', fontWeight:600 }}>
                          {v.suma > 0 ? v.suma : '—'}
                        </td>
                        <td style={{ padding:'9px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#f87171', fontWeight:600 }}>
                          {v.ref > 0 ? v.ref : '—'}
                        </td>
                        <td style={{ padding:'9px 16px', textAlign:'center' }}>
                          {v.civ !== null ? (
                            <span style={{ fontFamily:'DM Mono,monospace', fontWeight:800, fontSize:15, color:civColor, background:civBg, border:`1px solid ${civBorder}`, borderRadius:8, padding:'3px 10px', display:'inline-block' }}>
                              {v.civ.toFixed(2)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* ══ CUADRO 6: CONTROL DE INTENSIDAD RELATIVA ══════════════════════════════════ */}
      {gpsReal.length > 0 && (() => {
        const trainingMds = mdCols.filter(md => existingMdLabels.has(md) && (gpsPerMD[md]||[]).length > 0)
        const activeMds = trainingMds.filter((md:string) => {
          const avg = mdTeamAvg(md)
          const dTotal = avg.dist_total || avg.distTotal || 0
          const dPerMin = avg.dist_per_min || avg.distPerMin || 0
          const activeMin = (dTotal > 0 && dPerMin > 0) ? (dTotal / dPerMin) : (avg.duracion_min || avg.minActivo || 0)
          return activeMin > 0
        })
        if (!activeMds.length) return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(168,85,247,.2)', borderRadius:16, padding:'20px', textAlign:'center', marginBottom:8 }}>
            <CuadroHeader 
              icon={Icons.velocimetro} 
              cuadroNum="6" 
              title="CONTROL DE INTENSIDAD RELATIVA (/ MINUTO)" 
              description="Faltan datos de GPS para calcular los minutos activos (se requiere Distancia Total y m/min)." 
              color="#a855f7" 
            />
          </div>
        )

        const rows = activeMds.map((md:string) => {
          const avg = mdTeamAvg(md)
          const dTotal = avg.dist_total || avg.distTotal || 0
          const dPerMin = avg.dist_per_min || avg.distPerMin || 0
          const activeMin = (dTotal > 0 && dPerMin > 0) ? (dTotal / dPerMin) : (avg.duracion_min || avg.minActivo || 1)
          
          const dSprint = avg.dist_v5 || avg.dist_hir || avg.distSprint || 0 // Velocidad B5/B6 o HSR
          const nSprint = avg.n_sprints || avg.nSprintsGps || avg.nSprints || 0
          const accel = avg.acc_total || avg.acc2 || avg.nAcel || 0
          const decel = avg.dec_total || avg.dec2 || avg.nDecel || 0

          return {
            md,
            activeMin,
            metMin: dPerMin > 0 ? dPerMin : (dTotal / activeMin),
            sprintMin: dSprint / activeMin,
            nSprintMin: nSprint / activeMin,
            acelDecelMin: (accel + decel) / activeMin
          }
        })

        const maxMet = Math.max(...rows.map(r=>r.metMin), 1)
        const maxSpr = Math.max(...rows.map(r=>r.sprintMin), 1)
        const maxNSpr = Math.max(...rows.map(r=>r.nSprintMin), 1)
        const maxAD = Math.max(...rows.map(r=>r.acelDecelMin), 1)
        const BAR_H = 120

        return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(168,85,247,.2)', borderRadius:16, overflow:'hidden', marginBottom:8, pageBreakBefore:'always', breakBefore:'page' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
              <CuadroHeader 
                icon={Icons.velocimetro} 
                cuadroNum="6" 
                title="CONTROL DE INTENSIDAD RELATIVA (/ MINUTO)" 
                description="Métricas divididas por el tiempo total (o activo) de la sesión en cada MD" 
                color="#a855f7" 
              />
            </div>
            
            <div style={{ overflowX:'auto' }}>
              <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'rgba(168,85,247,.05)' }}>
                    <th style={{ padding:'8px 14px', textAlign:'left', color:'var(--silver)', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>MD</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#84cc16', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Tiempo (min)</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#60a5fa', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Metros / min</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#f59e0b', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Dist. Sprint / min</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#ec4899', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Sprints / min</th>
                    <th style={{ padding:'8px 10px', textAlign:'center', color:'#34d399', fontSize:9, fontWeight:700, textTransform:'uppercase' }}>Acel+Decel / min</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.md} style={{ borderTop:'1px solid var(--mist)', background: i%2===0 ? 'transparent' : 'rgba(255,255,255,.015)' }}>
                      <td style={{ padding:'7px 14px', color:'#a855f7', fontWeight:700, textAlign:'center' }}>{r.md}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#84cc16', fontWeight:700 }}>{Math.round(r.activeMin)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#60a5fa' }}>{r.metMin.toFixed(1)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#f59e0b' }}>{r.sprintMin.toFixed(2)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#ec4899' }}>{r.nSprintMin.toFixed(3)}</td>
                      <td style={{ padding:'7px 10px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'#34d399' }}>{r.acelDecelMin.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Gráficos */}
            <div style={{ padding:16, borderTop:'1px solid var(--mist)' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
                {[
                  { title:'Metros / min', color:'#60a5fa', max:maxMet, val: (r:any)=>r.metMin, dec:1 },
                  { title:'Dist. Sprint / min', color:'#f59e0b', max:maxSpr, val: (r:any)=>r.sprintMin, dec:2 },
                  { title:'Sprints / min', color:'#ec4899', max:maxNSpr, val: (r:any)=>r.nSprintMin, dec:3 },
                  { title:'Acel+Decel / min', color:'#34d399', max:maxAD, val: (r:any)=>r.acelDecelMin, dec:2 }
                ].map(grp => (
                  <div key={grp.title} style={{ background:'var(--ink3)', borderRadius:12, padding:14, border:`1px solid ${grp.color}30` }}>
                    <div style={{ fontSize:11, fontWeight:800, color:grp.color, textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', marginBottom:12, borderBottom:`1px solid ${grp.color}30`, paddingBottom:6 }}>{grp.title}</div>
                    <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', height:BAR_H, gap:4, position:'relative' }}>
                      {rows.map((r,i) => {
                        const v = grp.val(r)
                        const h = Math.max((v/grp.max)*(BAR_H - 24), v>0?4:0)
                        return (
                          <div key={r.md} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end' }}>
                            {v>0 && <span style={{ fontSize:8, fontFamily:'DM Mono,monospace', color:grp.color, marginBottom:2 }}>{v.toFixed(grp.dec)}</span>}
                            <div className="anim-bar-v" style={{ width:'100%', maxWidth:24, height:`${h}px`, background:grp.color, borderRadius:'3px 3px 0 0', opacity: v>0?1:0.1 }} />
                            <div style={{ fontSize:8, color:'var(--silver)', marginTop:4, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'100%' }}>{r.md}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )
      })()}

      {/* ══ RANKING DE LOGROS ════════════════════════════════════════════ */}
      {gpsReal.length > 0 && (() => {
        const RANKINGS = [
          { key:'max_velocity', label:'Velocidad Máxima', unit:'km/h', icon:'⚡', color:'#ef4444', isMax:true },
          { key:'dist_hir',     label:'High Speed Running', unit:'m', icon:'🏃', color:'#f59e0b', isMax:false },
        ]
        return (
          <div style={{ background:'var(--ink2)', border:'1px solid rgba(251,191,36,.2)', borderRadius:16, overflow:'hidden', marginBottom:8, pageBreakBefore:'always', breakBefore:'page' }}>
            <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--mist)' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#fbbf24', textTransform:'uppercase', letterSpacing:'0.08em' }}>🏆 RANKING DE LOGROS — MICROCICLO</p>
              <p style={{ fontSize:10, color:'var(--fog)', marginTop:2 }}>Top 3 jugadores por velocidad máxima y HSR en el período seleccionado</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:'var(--mist)' }}>
              {RANKINGS.map(rank => {
                const sorted = [...gpsReal]
                  .filter((p:any) => Number(p[rank.key]) > 0)
                  .sort((a:any,b:any) => Number(b[rank.key]) - Number(a[rank.key]))
                  .slice(0, 3)
                const medals = ['🥇','🥈','🥉']
                const medalColors = ['#fbbf24','#94a3b8','#b87333']
                return (
                  <div key={rank.key} style={{ background:'var(--ink2)', padding:'16px' }}>
                    <div style={{ fontSize:12, fontWeight:700, color:rank.color, marginBottom:12 }}>{rank.icon} {rank.label}</div>
                    {sorted.length === 0 ? (
                      <p style={{ fontSize:11, color:'var(--fog)' }}>Sin datos</p>
                    ) : sorted.map((p:any, i:number) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:i<2?10:0, padding:'8px 10px', borderRadius:10,
                        background: i===0 ? 'rgba(251,191,36,.08)' : 'rgba(255,255,255,.02)',
                        border: i===0 ? '1px solid rgba(251,191,36,.2)' : '1px solid transparent' }}>
                        <span style={{ fontSize:20, lineHeight:1 }}>{medals[i]}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:'var(--snow)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.nombre}</div>
                          <div style={{ fontSize:10, color:'var(--fog)' }}>{p.posicion||'—'}</div>
                        </div>
                        <div style={{ fontFamily:'DM Mono,monospace', fontWeight:800, fontSize:16, color:medalColors[i] }}>
                          {Number(p[rank.key]).toFixed(rank.key==='max_velocity'?1:0)} <span style={{ fontSize:10, fontWeight:400, color:'var(--fog)' }}>{rank.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      </>)}
    </div>
  )
}




// ═══════════════════════════════════════════════════════════════════
// EXPO AI PANEL — Exposiciones a Alta Intensidad
// ═══════════════════════════════════════════════════════════════════
function ExpoAIPanel({ teamData }: { teamData: any[] }) {
  const [desde, setDesde] = useState(() => { const d=new Date(); d.setDate(d.getDate()-28); return localDateStr(d) })
  const [hasta, setHasta] = useState(todayLocal())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [partidos, setPartidos] = useState<any[]>([])
  const [selectedPartidos, setSelectedPartidos] = useState<(any|null)[]>([null,null,null])
  const [refData, setRefData] = useState<any[]>([{},{},{}])  // GPS team avg per match
  const [refPlayers, setRefPlayers] = useState<any[][]>([[],[],[]])  // GPS per-player per match
  const [showRefInput, setShowRefInput] = useState(false)

  useEffect(() => { cargar() }, [desde, hasta])
  useEffect(() => {
    const hace1año = new Date(); hace1año.setFullYear(hace1año.getFullYear()-1)
    fetch(`/api/calendario?desde=${localDateStr(hace1año)}&hasta=${hasta}`)
      .then(r=>r.json()).then(d => {
        const all = [
          ...((d.sesiones||[]).filter((s:any)=>s.tipo==='partido').map((s:any)=>({ fecha:s.fecha, rival:s.rival||'Partido', _src:'calendar' }))),
          ...((d.partidos||[]).map((p:any)=>({ fecha:p.fecha, rival:p.rival, _src:'log' })))
        ]
        const seen = new Set()
        setPartidos(all.filter((p:any)=>{ const k=`${p.fecha}_${p.rival}`; if(seen.has(k)) return false; seen.add(k); return true }).sort((a:any,b:any)=>b.fecha.localeCompare(a.fecha)))
      }).catch(()=>{})
  }, [])

  async function cargar() {
    setLoading(true)
    try { const r = await fetch(`/api/carga-gps?desde=${desde}&hasta=${hasta}&ciclo=microciclo`); setData(await r.json()) }
    catch(e){} finally { setLoading(false) }
  }

  async function selectPartido(slotIdx: number, partido: any) {
    const updated = [...selectedPartidos]; updated[slotIdx] = partido || null; setSelectedPartidos(updated)
    if (!partido) {
      const nr=[...refData]; nr[slotIdx]={}; setRefData(nr)
      const np=[...refPlayers]; np[slotIdx]=[]; setRefPlayers(np)
      return
    }
    try {
      const r = await fetch(`/api/carga-gps?desde=${partido.fecha}&hasta=${partido.fecha}&ciclo=microciclo`)
      const d = await r.json()
      const avg = d?.teamAvgGps || {}
      const nr = [...refData]
      nr[slotIdx] = { max_velocity: avg.max_velocity||0, dist_hir: avg.dist_hir||0, acc3: avg.acc3||0, dec3: avg.dec3||0,
        acc2: avg.acc2||0, dec2: avg.dec2||0, dist_per_min: avg.dist_per_min||0, dist_total: avg.dist_total||0 }
      setRefData(nr)
      const np = [...refPlayers]; np[slotIdx] = d?.gpsReal || []; setRefPlayers(np)
    } catch(e){}
  }

  const gpsReal: any[] = data?.gpsReal || []
  const gpsPerMD: Record<string,any[]> = data?.gpsPerMD || {}
  const sesionesInfo: any[] = data?.sesionesInfo || []
  const MD_ORDER_LOCAL = ['MD+1','MD+2','MD-4','MD-3','MD-2','MD-1']
  const existingMd = new Set(sesionesInfo.map((s:any)=>s.titulo))

  // Ref media (avg of selected matches)
  const refMedia: Record<string,number> = {}
  const refSlots = refData.filter(r=>Object.keys(r).length>0)
  if (refSlots.length > 0) {
    ['max_velocity','dist_hir','acc3','dec3','acc2','dec2'].forEach(k => {
      const vals = refSlots.map(r=>Number(r[k])||0).filter(x=>x>0)
      if (vals.length) refMedia[k] = Math.round(vals.reduce((s,x)=>s+x,0)/vals.length*10)/10
    })
  }

  // Get individual player value from a reference match slot
  const getRefPlayerVal = (playerName: string, slotIdx: number, key: string): number | null => {
    const players: any[] = refPlayers[slotIdx] || []
    const p = players.find((x:any) => x.nombre === playerName)
    if (!p) return null
    const v = Number(p[key])
    return isNaN(v) || v === 0 ? null : v
  }

  // Avg of a key across all selected match slots for a specific player
  const getRefPlayerAvg = (playerName: string, key: string): number | null => {
    const vals = refPlayers
      .map((players: any[]) => {
        const p = players.find((x:any) => x.nombre === playerName)
        return p ? Number(p[key]) || 0 : 0
      })
      .filter(v => v > 0)
    return vals.length ? Math.round(vals.reduce((s,x)=>s+x,0)/vals.length*10)/10 : null
  }

  // Get per-player per-MD value.
  // If no GPS rows found by MD label (e.g., GPS imported without sesion_id), fall back
  // to looking up by the session's fecha (gpsPerMD may be keyed by date string).
  const getMdVal = (playerName: string, md: string, key: string): number | null => {
    let rows = gpsPerMD[md] || []
    if (!rows.length) {
      const ses = sesionesInfo.find((s:any) => s.titulo === md)
      if (ses?.fecha) rows = gpsPerMD[ses.fecha] || []
    }
    const player = rows.find((p:any) => p.nombre === playerName)
    if (!player) return null
    const v = Number(player[key])
    return isNaN(v) ? null : v
  }

  // Pct color: blue < -5%, green -5% to 15%, red > 15%
  const pctColorExpo = (pct: number|null) => pct===null?'var(--fog)':pct>15?'#ef4444':pct>=-5?'#22c55e':'#60a5fa'

  const MD_TRAIN = MD_ORDER_LOCAL // only training MDs (no MD/partido)
  const REF_COLS = ['1','2','3']

  return (
    <div style={{ padding:'24px 20px', maxWidth:1300, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:'var(--snow)', letterSpacing:'0.04em', marginBottom:4 }}>⚡ EXPOSICIONES A ALTA INTENSIDAD</h2>
          <p style={{ fontSize:12, color:'var(--silver)' }}>Análisis de exposición por jugador · Velocidad máxima, HSR y ACE/DEC</p>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div><label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Desde</label><input className="wp-input" type="date" value={desde} onChange={e=>setDesde(e.target.value)} /></div>
          <div><label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:3, textTransform:'uppercase' }}>Hasta</label><input className="wp-input" type="date" value={hasta} onChange={e=>setHasta(e.target.value)} /></div>
          <button className="hover-scale" onClick={()=>setShowRefInput(!showRefInput)} style={{ fontSize:11, padding:'8px 14px', borderRadius:8, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.3)', cursor:'pointer' }}>
            {showRefInput?'▲ Ocultar':'🏆 Partidos referencia'}
          </button>
        </div>
      </div>

      {/* Partido reference selector */}
      {showRefInput && (
        <div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.2)', borderRadius:14, padding:16, marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', marginBottom:12 }}>Partidos de referencia (= 100%)</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {[0,1,2,3,4].map(ri=>(
              <div key={ri} style={{ background:'var(--ink3)', borderRadius:10, padding:10, border:'1px solid rgba(239,68,68,.15)' }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#f87171', marginBottom:6 }}>Partido {ri+1}</div>
                <select className="wp-input" style={{ fontSize:11, padding:'5px 8px', appearance:'none', marginBottom:6 }}
                  value={selectedPartidos[ri]?`${selectedPartidos[ri].fecha}_${selectedPartidos[ri].rival}`:''}
                  onChange={e=>{ const v=e.target.value; if(!v){selectPartido(ri,null);return}; const p=partidos.find((x:any)=>`${x.fecha}_${x.rival}`===v); if(p)selectPartido(ri,p) }}>
                  <option value="">— Seleccionar —</option>
                  {partidos.map((p:any)=><option key={`${p.fecha}_${p.rival}`} value={`${p.fecha}_${p.rival}`} style={{background:'var(--ink2)'}}>{p.fecha} · vs {p.rival||'Partido'}</option>)}
                </select>
                {Object.keys(refData[ri]).length>0 && (
                  <div style={{ fontSize:10, color:'var(--fog)', display:'flex', flexWrap:'wrap', gap:'4px 8px' }}>
                    <span>VM: <span style={{color:'#f87171',fontFamily:'DM Mono,monospace'}}>{refData[ri].max_velocity||'—'}</span></span>
                    <span>HSR: <span style={{color:'#fbbf24',fontFamily:'DM Mono,monospace'}}>{refData[ri].dist_hir||'—'}</span></span>
                    <span>A{'>'}{3}: <span style={{color:'#f43f5e',fontFamily:'DM Mono,monospace'}}>{refData[ri].acc3||'—'}</span></span>
                    <span>D{'>'}{3}: <span style={{color:'#0ea5e9',fontFamily:'DM Mono,monospace'}}>{refData[ri].dec3||'—'}</span></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--silver)' }}>Cargando...</div> :
      !gpsReal.length ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:16 }}>Sin datos GPS importados. Importá archivos desde la pestaña 📡 GPS.</div>
      ) : (<>

      {/* ══ TABLA 1: MÁXIMA VELOCIDAD ══════════════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.2)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--mist)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.08em' }}>🏃 MÁXIMA VELOCIDAD (km/h)</p>
          <p style={{ fontSize:10, color:'var(--fog)', marginTop:2 }}>VM alcanzada en cada sesión · Verde = superó el 80% VM promedio de referencia · Objetivo: ≥3 veces en la semana</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(239,68,68,.05)', color:'#f87171', fontSize:9, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>JUGADOR</th>
                {MD_TRAIN.map(md=><th key={md} style={{ padding:'6px 8px', textAlign:'center', background:existingMd.has(md)?'rgba(239,68,68,.05)':'transparent', color:existingMd.has(md)?'#f87171':'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', opacity:existingMd.has(md)?1:0.4 }}>{md}</th>)}
                <th colSpan={3} style={{ padding:'6px 8px', textAlign:'center', background:'rgba(239,68,68,.08)', color:'#ef4444', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)' }}>MD (PARTIDO)</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>PROM.</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#f59e0b', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(245,158,11,.05)' }}>EXP. 80% VM</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#22c55e', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(34,197,94,.04)' }}>OBJ. SEMANAL</th>
              </tr>
              <tr style={{ background:'rgba(255,255,255,.02)' }}>
                <th style={{ padding:'5px 14px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:600, borderBottom:'1px solid var(--mist)' }}>Nombre</th>
                <th style={{ padding:'5px 8px', textAlign:'left', color:'var(--silver)', fontSize:8, fontWeight:600, borderBottom:'1px solid var(--mist)' }}>Pos.</th>
                {MD_TRAIN.map(md=><th key={md} style={{ padding:'5px 8px', textAlign:'center', color:'var(--fog)', fontSize:8, borderBottom:'1px solid var(--mist)' }}>km/h</th>)}
                {REF_COLS.map(c=><th key={c} style={{ padding:'5px 8px', textAlign:'center', color:'#ef4444', fontSize:8, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>{c}</th>)}
                <th style={{ padding:'5px 8px', textAlign:'center', color:'var(--fog)', fontSize:8, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>km/h</th>
                <th style={{ padding:'5px 8px', textAlign:'center', color:'#f59e0b', fontSize:8, borderBottom:'1px solid var(--mist)', background:'rgba(245,158,11,.04)' }}>km/h (80%)</th>
                <th style={{ padding:'5px 8px', textAlign:'center', borderBottom:'1px solid var(--mist)', background:'rgba(34,197,94,.04)' }}></th>
              </tr>
            </thead>
            <tbody>
              {gpsReal.map((p:any,i:number) => {
                const vm = Number(p.max_velocity)||0
                const vmProm = getRefPlayerAvg(p.nombre, 'max_velocity')
                const v80 = vmProm ? Math.round(vmProm*0.8*10)/10 : null
                // Count MD sessions where player exceeded 80% VM ref
                let exposiciones = 0
                const mdVals = MD_TRAIN.map(md => {
                  const val = getMdVal(p.nombre, md, 'max_velocity')
                  const exceeded = v80 && val && val >= v80
                  if (exceeded) exposiciones++
                  return { val, exceeded }
                })
                const objOk = v80 ? exposiciones >= 3 : null
                return (
                  <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                    <td style={{ padding:'7px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                    <td style={{ padding:'7px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                    {mdVals.map((mv,mi) => (
                      <td key={mi} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:mv.exceeded?700:400,
                        color: mv.val===null ? 'var(--fog)' : mv.exceeded ? '#22c55e' : '#f87171',
                        background: mv.exceeded ? 'rgba(34,197,94,.08)' : 'transparent' }}>
                        {mv.val!==null ? mv.val : '—'}
                      </td>
                    ))}
                    {refData.map((r,ri) => {
                      const pv = getRefPlayerVal(p.nombre, ri, 'max_velocity')
                      return <td key={ri} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:pv?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{pv||'—'}</td>
                    })}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:vmProm?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{vmProm||'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#f59e0b', background:'rgba(245,158,11,.04)' }}>{v80||'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', background:'rgba(34,197,94,.04)' }}>
                      {objOk===null ? <span style={{color:'var(--fog)',fontSize:10}}>Sin ref.</span>
                        : objOk ? <span style={{fontSize:16}}>✅</span> : <span style={{fontSize:16}}>❌</span>}
                      {v80 && <div style={{fontSize:9,color:'var(--fog)',fontFamily:'DM Mono,monospace'}}>{exposiciones}/3</div>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ TABLA 2: HSR ══════════════════════════════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(251,191,36,.2)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--mist)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#fbbf24', textTransform:'uppercase', letterSpacing:'0.08em' }}>⚡ HIGH SPEED RUNNING (m)</p>
          <p style={{ fontSize:10, color:'var(--fog)', marginTop:2 }}>Sumatoria semanal HSR vs promedio de 3 partidos · &lt;1 bajo | 1–1.5 normal | &gt;1.5 alto</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(251,191,36,.05)', color:'#fbbf24', fontSize:9, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>JUGADOR</th>
                {MD_TRAIN.map(md=><th key={md} style={{ padding:'6px 8px', textAlign:'center', background:existingMd.has(md)?'rgba(251,191,36,.05)':'transparent', color:existingMd.has(md)?'#fbbf24':'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', opacity:existingMd.has(md)?1:0.4 }}>{md}</th>)}
                <th style={{ padding:'6px 8px', textAlign:'center', background:'rgba(251,191,36,.08)', color:'#f59e0b', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)' }}>SUMA</th>
                {REF_COLS.map(c=><th key={c} style={{ padding:'6px 8px', textAlign:'center', color:'#ef4444', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>MD {c}</th>)}
                <th style={{ padding:'6px 8px', textAlign:'center', color:'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>PROM.</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#ef4444', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(245,158,11,.05)' }}>PORCE. %</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#22c55e', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(34,197,94,.04)' }}>OBJ.</th>
              </tr>
            </thead>
            <tbody>
              {gpsReal.map((p:any,i:number) => {
                const mdVals = MD_TRAIN.map(md => getMdVal(p.nombre, md, 'dist_hir'))
                const suma = mdVals.reduce((s,v)=>s+(v||0),0)
                const promRef = getRefPlayerAvg(p.nombre, 'dist_hir')
                const porce = promRef && suma ? Math.round((suma/promRef)*100)/100 : null
                const objOk = porce!==null ? (porce>=1 && porce<=1.5 ? true : (porce>1.5 ? false : null)) : null
                const porceColor = porce===null?'var(--fog)':porce>1.5?'#ef4444':porce>=1?'#22c55e':'#60a5fa'
                return (
                  <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                    <td style={{ padding:'7px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                    <td style={{ padding:'7px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                    {mdVals.map((v,mi) => <td key={mi} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:v!==null?'#fbbf24':'var(--fog)' }}>{v!==null?v:'—'}</td>)}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#fbbf24', background:'rgba(251,191,36,.08)' }}>{suma||'—'}</td>
                    {refData.map((r,ri) => { const pv=getRefPlayerVal(p.nombre,ri,'dist_hir'); return <td key={ri} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:pv?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{pv||'—'}</td> })}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:promRef?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{promRef||'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:porceColor }}>{porce!==null?porce:'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center' }}>
                      {porce===null ? <span style={{color:'var(--fog)',fontSize:10}}>Sin ref.</span>
                        : porce>=1&&porce<=1.5 ? <span style={{fontSize:16}}>✅</span>
                        : porce>1.5 ? <span style={{fontSize:14,color:'#ef4444',fontWeight:700}}>⚠️</span>
                        : <span style={{fontSize:16}}>❌</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'8px 18px', borderTop:'1px solid var(--mist)', display:'flex', gap:16, fontSize:10, color:'var(--fog)' }}>
          <span style={{color:'#60a5fa'}}>● &lt;1 Bajo</span>
          <span style={{color:'#22c55e'}}>● 1–1.5 Normal</span>
          <span style={{color:'#ef4444'}}>● &gt;1.5 Alto (posible sobrecarga)</span>
        </div>
      </div>

      {/* ══ TABLA 3: ACE >3 ═══════════════════════════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(244,63,94,.2)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--mist)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#f43f5e', textTransform:'uppercase', letterSpacing:'0.08em' }}>💥 ACELERACIONES &gt;3 m/s² (n)</p>
          <p style={{ fontSize:10, color:'var(--fog)', marginTop:2 }}>Nº ACC &gt;3 por sesión · Sumatoria semanal vs promedio de 3 partidos</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(244,63,94,.05)', color:'#f43f5e', fontSize:9, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>JUGADOR</th>
                {MD_TRAIN.map(md=><th key={md} style={{ padding:'6px 8px', textAlign:'center', background:existingMd.has(md)?'rgba(244,63,94,.05)':'transparent', color:existingMd.has(md)?'#f43f5e':'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', opacity:existingMd.has(md)?1:0.4 }}>{md}</th>)}
                <th style={{ padding:'6px 8px', textAlign:'center', background:'rgba(244,63,94,.08)', color:'#f43f5e', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)' }}>SUMA</th>
                {REF_COLS.map(c=><th key={c} style={{ padding:'6px 8px', textAlign:'center', color:'#ef4444', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>MD {c}</th>)}
                <th style={{ padding:'6px 8px', textAlign:'center', color:'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>PROM.</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#ef4444', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(245,158,11,.05)' }}>PORCE. %</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#22c55e', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(34,197,94,.04)' }}>OBJ.</th>
              </tr>
            </thead>
            <tbody>
              {gpsReal.map((p:any,i:number) => {
                // Sum acc3+dec3 per MD for this player
                const mdVals = MD_TRAIN.map(md => getMdVal(p.nombre, md, 'acc3'))
                const suma = mdVals.reduce((s,v)=>s+(v||0),0)
                const promRef = (() => { const v = getRefPlayerAvg(p.nombre, 'acc3'); return v ? Math.round(v) : null })()
                const porce = promRef && suma ? Math.round((suma/promRef)*100)/100 : null
                const porceColor = porce===null?'var(--fog)':porce>1.5?'#ef4444':porce>=1?'#22c55e':'#60a5fa'
                return (
                  <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                    <td style={{ padding:'7px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                    <td style={{ padding:'7px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                    {mdVals.map((v,mi) => <td key={mi} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:v!==null?'#f43f5e':'var(--fog)' }}>{v!==null?v:'—'}</td>)}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#f43f5e', background:'rgba(244,63,94,.08)' }}>{suma||'—'}</td>
                    {refData.map((r,ri) => {
                      const pv = getRefPlayerVal(p.nombre, ri, 'acc3')
                      return <td key={ri} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:pv?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{pv||'—'}</td>
                    })}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:promRef?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{promRef||'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:porceColor }}>{porce!==null?porce:'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center' }}>
                      {porce===null ? <span style={{color:'var(--fog)',fontSize:10}}>Sin ref.</span>
                        : porce>=1&&porce<=1.5 ? <span style={{fontSize:16}}>✅</span>
                        : porce>1.5 ? <span style={{fontSize:14,color:'#ef4444',fontWeight:700}}>⚠️</span>
                        : <span style={{fontSize:16}}>❌</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ TABLA 4: DEC >3 ═══════════════════════════════════════════════════ */}
      <div style={{ background:'var(--ink2)', border:'1px solid rgba(14,165,233,.2)', borderRadius:16, overflow:'hidden', marginBottom:20 }}>
        <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--mist)' }}>
          <p style={{ fontSize:12, fontWeight:700, color:'#0ea5e9', textTransform:'uppercase', letterSpacing:'0.08em' }}>🛑 DESACELERACIONES &gt;3 m/s² (n)</p>
          <p style={{ fontSize:10, color:'var(--fog)', marginTop:2 }}>Nº DEC &gt;3 por sesión · Sumatoria semanal vs promedio de 3 partidos</p>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="wp-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ padding:'6px 14px', textAlign:'left', background:'rgba(14,165,233,.05)', color:'#0ea5e9', fontSize:9, fontWeight:700, textTransform:'uppercase', borderBottom:'1px solid var(--mist)' }}>JUGADOR</th>
                {MD_TRAIN.map(md=><th key={md} style={{ padding:'6px 8px', textAlign:'center', background:existingMd.has(md)?'rgba(14,165,233,.05)':'transparent', color:existingMd.has(md)?'#0ea5e9':'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', opacity:existingMd.has(md)?1:0.4 }}>{md}</th>)}
                <th style={{ padding:'6px 8px', textAlign:'center', background:'rgba(14,165,233,.08)', color:'#0ea5e9', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)' }}>SUMA</th>
                {REF_COLS.map(c=><th key={c} style={{ padding:'6px 8px', textAlign:'center', color:'#ef4444', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>MD {c}</th>)}
                <th style={{ padding:'6px 8px', textAlign:'center', color:'var(--fog)', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(239,68,68,.04)' }}>PROM.</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#ef4444', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(245,158,11,.05)' }}>PORCE. %</th>
                <th style={{ padding:'6px 8px', textAlign:'center', color:'#22c55e', fontSize:9, fontWeight:700, borderBottom:'1px solid var(--mist)', background:'rgba(34,197,94,.04)' }}>OBJ.</th>
              </tr>
            </thead>
            <tbody>
              {gpsReal.map((p:any,i:number) => {
                const mdVals = MD_TRAIN.map(md => getMdVal(p.nombre, md, 'dec3'))
                const suma = mdVals.reduce((s,v)=>s+(v||0),0)
                const promRef = (() => { const v = getRefPlayerAvg(p.nombre, 'dec3'); return v ? Math.round(v) : null })()
                const porce = promRef && suma ? Math.round((suma/promRef)*100)/100 : null
                const porceColor = porce===null?'var(--fog)':porce>1.5?'#ef4444':porce>=1?'#22c55e':'#60a5fa'
                return (
                  <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:i%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                    <td style={{ padding:'7px 14px', color:'var(--snow)', fontWeight:500, whiteSpace:'nowrap' }}>{p.nombre}</td>
                    <td style={{ padding:'7px 8px', color:'var(--fog)', fontSize:10 }}>{p.posicion||'—'}</td>
                    {mdVals.map((v,mi) => <td key={mi} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:v!==null?'#0ea5e9':'var(--fog)' }}>{v!==null?v:'—'}</td>)}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:'#0ea5e9', background:'rgba(14,165,233,.08)' }}>{suma||'—'}</td>
                    {refData.map((r,ri) => {
                      const pv = getRefPlayerVal(p.nombre, ri, 'dec3')
                      return <td key={ri} style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', color:pv?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{pv||'—'}</td>
                    })}
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:promRef?'#ef4444':'var(--fog)', background:'rgba(239,68,68,.04)' }}>{promRef||'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:porceColor }}>{porce!==null?porce:'—'}</td>
                    <td style={{ padding:'7px 8px', textAlign:'center' }}>
                      {porce===null ? <span style={{color:'var(--fog)',fontSize:10}}>Sin ref.</span>
                        : porce>=1&&porce<=1.5 ? <span style={{fontSize:16}}>✅</span>
                        : porce>1.5 ? <span style={{fontSize:14,color:'#ef4444',fontWeight:700}}>⚠️</span>
                        : <span style={{fontSize:16}}>❌</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'8px 18px', borderTop:'1px solid var(--mist)', display:'flex', gap:16, fontSize:10, color:'var(--fog)' }}>
          <span style={{color:'#60a5fa'}}>● &lt;1 Bajo</span>
          <span style={{color:'#22c55e'}}>● 1–1.5 Normal</span>
          <span style={{color:'#ef4444'}}>● &gt;1.5 Alto (posible sobrecarga)</span>
        </div>
      </div>
      </>)}
    </div>
  )
}



// EvaluacionesPanel — implementado en ./EvaluacionesPanel.tsx
// El componente completo (Variables, Pesajes, CMJ, Isométrico) vive en ese archivo.
// CoachClient simplemente lo re-exporta aquí para no duplicar código.
function EvaluacionesPanel({ teamData }: { teamData: any[] }) {
  return <EvaluacionesPanelFull teamData={teamData} />
}

// ═══════════════════════════════════════════════════════════════════
// MANUAL DE USUARIO
// ═══════════════════════════════════════════════════════════════════
function ManualPanel() {
  const [seccion, setSeccion] = useState<string>('inicio')

  const SECCIONES = [
    { id:'inicio',         label:'Inicio',               icon:'🏠' },
    { id:'equipo',         label:'Equipo',               icon:'👥' },
    { id:'calendario',     label:'Calendario',           icon:'📅' },
    { id:'analytics',      label:'Analytics',            icon:'📊' },
    { id:'minutaje',       label:'Minutaje',             icon:'⏱' },
    { id:'ctrl-calc',      label:'Ctrl. Carga Calc',     icon:'🏋️' },
    { id:'ctrl-gps',       label:'Ctrl. Carga GPS',      icon:'📡' },
    { id:'acumulado',      label:'Acumulado Individual', icon:'📈' },
    { id:'cambio-carga',   label:'Cambio de Carga',      icon:'🔄' },
    { id:'expo-ai',        label:'Expo. Alta Intensidad',icon:'⚡' },
    { id:'evaluaciones',   label:'Evaluaciones',         icon:'📋' },
    { id:'comparativa',    label:'Comparativa GPS',      icon:'⚖️' },
    { id:'lesiones',       label:'Lesiones',             icon:'🏥' },
    { id:'gps',            label:'Importar GPS',         icon:'🛰️' },
    { id:'jugadores',      label:'Jugadores',            icon:'🗂️' },
    { id:'biblioteca',     label:'Diseñador de Tareas', icon:'🎨' },
    { id:'canchas',        label:'Canchas',             icon:'🏟️' },
    { id:'vinculaciones',  label:'Vinculaciones',       icon:'🔗' },
  ]

  function generarPDF() {
    const win = window.open('', '_blank')
    if (!win) return
    const estilos = `
      body { font-family: Arial, sans-serif; color: #111; background: #fff; margin: 0; padding: 0; }
      h1 { font-size: 28px; color: #1a1a1a; margin-bottom: 4px; }
      h2 { font-size: 20px; color: #1a1a1a; margin: 28px 0 6px; border-bottom: 2px solid #c8f135; padding-bottom: 6px; }
      h3 { font-size: 13px; color: #4a7c00; text-transform: uppercase; letter-spacing: 0.06em; margin: 18px 0 8px; }
      p { font-size: 12px; color: #444; line-height: 1.7; margin: 6px 0; }
      .row { display: flex; gap: 12px; padding: 7px 0; border-bottom: 1px solid #eee; }
      .row-label { font-size: 12px; font-weight: 700; color: #111; min-width: 160px; flex-shrink: 0; }
      .row-desc { font-size: 12px; color: #444; line-height: 1.6; }
      .tip { background: #f9ffe0; border-left: 3px solid #c8f135; padding: 10px 14px; margin: 12px 0; border-radius: 4px; font-size: 12px; }
      .cover { background: #0a0a0a; color: #fff; padding: 60px 48px; margin-bottom: 32px; }
      .cover h1 { color: #c8f135; font-size: 42px; margin-bottom: 8px; }
      .cover p { color: #aaa; font-size: 14px; }
      .section { padding: 0 48px 32px; page-break-inside: avoid; }
      .toc { padding: 24px 48px; background: #f8f8f8; margin-bottom: 8px; }
      .toc h3 { color: #111; margin-bottom: 12px; }
      .toc ul { columns: 2; column-gap: 32px; list-style: none; padding: 0; margin: 0; }
      .toc li { font-size: 12px; color: #333; padding: 3px 0; }
      @media print { body { font-size: 11px; } .cover { padding: 40px 32px; } .section { padding: 0 32px 24px; } }
    `
    const secciones_data = [
      { titulo: 'Equipo', icono: '👥', intro: 'Es la pantalla principal. Al entrar, ves el resumen del plantel y el estado del día.', rows: [
        ['Plantel', 'Número total de jugadores registrados, con desglose de disponibles, diferenciados y lesionados.'],
        ['Wellness Hoy', 'Cuántos jugadores completaron el formulario de bienestar hoy. La barra de progreso se actualiza en tiempo real.'],
        ['EN RIESGO / PRECAUCIÓN / ÓPTIMOS', 'Categorías de ACWR. Verde = óptimo (0.8–1.3), amarillo = precaución (1.3–1.5), rojo = riesgo (>1.5 o <0.8).'],
        ['Punto de color por jugador', 'Verde si completó el wellness hoy, rojo si no lo hizo todavía.'],
        ['Barras de wellness', 'Las 5 barras representan: Fatiga, Sueño, Dolor, Estrés y Ánimo del último registro.'],
        ['ACWR', 'Número a la derecha de cada jugador: ratio carga aguda/crónica. Verde = óptimo, amarillo = precaución, rojo = riesgo.'],
        ['Detalle individual', 'Hacé clic en un jugador para ver su gráfico ACWR, historial de carga, último wellness y RPE de las últimas sesiones.'],
        ['Cumpleaños próximos', 'Muestra automáticamente qué jugadores cumplen años en los próximos 7 días.'],
        ['En readaptación (Fase 1 a 4)', 'Jugadores lesionados que ya están en proceso de readaptación funcional (F1 a F4). Aparecen como alerta rápida en el panel de inicio.'],
        ['Escudo y nombre del club', 'Hacé clic en el escudo para subir imagen. Hacé clic en el nombre (ícono ✏️) para editarlo.'],
      ]},
      { titulo: 'Calendario', icono: '📅', intro: 'Permite planificar y visualizar todas las sesiones y partidos. Alimenta los paneles de Ctrl. Carga Calc y Comparativa GPS.', rows: [
        ['Vista Mes / Vista Semana', 'Mes: grilla completa del mes. Semana: distribución detallada de los 7 días con más info por sesión.'],
        ['⚽ Verde — Entrenamiento', 'Sesión de entrenamiento normal.'],
        ['🏆 Azul — Partido', 'Partido amistoso u oficial.'],
        ['🔄 Amarillo — Recuperación', 'Sesión regenerativa o de recuperación activa.'],
        ['😴 Gris — Descanso', 'Día libre sin actividad programada.'],
        ['⚠ Rojo — <24h', 'Alerta automática cuando hay menos de 24 horas entre el final de un evento y el inicio del siguiente.'],
        ['Crear sesión', 'Usá el botón + Nueva sesión o hacé clic en cualquier día. Campos: fecha/hora, tipo, etiqueta MD (MD+1 a MD), objetivos, estadio vinculado y bloques de tareas.'],
        ['Calculadora de carga', 'Cuando una tarea tiene espacio definido (Rondo, Partido reducido, etc.), calcula automáticamente carga GPS estimada según densidad (m²/jug) y tiempo activo. Basado en Sangnier et al. (2018).'],
        ['Objetivo de la tarea', 'Categoría: Fuerza, Activación, Resistencia o Velocidad. El número (1–4) indica intensidad dentro de esa categoría (1 = más intenso).'],
        ['✏️ Editar GPS', 'Podés sobrescribir cualquier métrica calculada con el dato real de GPS. Los valores editados se muestran en azul.'],
        ['Imagen de tarea', 'Opción para subir foto o diagrama. Se guarda con la sesión y aparece al imprimir.'],
      ]},
      { titulo: 'Analytics', icono: '📊', intro: 'Panel de análisis de carga colectiva. Muestra evolución de la carga para detectar tendencias, picos y períodos de descarga.', rows: [
        ['Período', 'Elegí el rango de fechas con los filtros Desde / Hasta.'],
        ['Variable', 'Seleccioná qué métrica visualizar: UA, RPE, Distancia total, Sprints, Aceleraciones, etc.'],
        ['Vista diaria / semanal', 'Diaria: cada sesión. Semanal: agrupa por semana para ver tendencia macro.'],
        ['Gráficos A y B', 'A: RPE vs. Total Wellness — zona verde = carga alta con buen bienestar (ideal). B: RPE vs. Dolor Muscular — detecta sesiones de alta carga con dolor muscular elevado.'],
        ['Perfil Neuromuscular', 'Analiza el equilibrio entre Carga Metabólica vs. Neuromuscular según las dimensiones del estadio vinculado en el Calendario.'],
        ['% de cambio', 'Variación respecto al período anterior. Verde = normal (−5% a +15%), rojo = aumento alto (>+15%), azul = reducción notable (<−5%).'],
      ]},
      { titulo: 'Minutaje', icono: '⏱', intro: 'Registro acumulado de minutos jugados y entrenados. Controla la exposición por tiempo.', rows: [
        ['Minutos de entrenamiento', 'Suma de minutos participados en entrenamientos dentro del período seleccionado.'],
        ['Minutos de partido', 'Suma de minutos disputados en partidos.'],
        ['Total', 'Suma de ambas categorías. Se muestra en rojo si supera un umbral de alerta.'],
        ['Cómo se registran', 'Los de entrenamiento vienen del Calendario (series × minutos por bloque). Los de partido se registran por separado desde la vista de partidos.'],
      ]},
      { titulo: 'Ctrl. Carga Calc', icono: '🏋️', intro: 'Carga interna calculada desde el RPE que reporta cada jugador y la calculadora del Calendario. No requiere GPS.', rows: [
        ['Navegación por semana', 'Usá las flechas ‹ › para moverte entre semanas.'],
        ['Cuadro 1 — RPE individual', 'RPE declarado por cada jugador en cada día del microciclo (MD+1 a MD). Celdas verdes = registrado, gris = sin dato.'],
        ['Cuadro 2 — UA (Unidades de Carga)', 'Carga interna: RPE × minutos de sesión. Indicador estándar de carga interna (Foster, 1998).'],
        ['Cuadro 3 — Calculadora GPS', 'Estimación de carga externa calculada desde los bloques de tareas: distancia total, sprints, aceleraciones/deceleraciones.'],
        ['Cuadro 4 — % sobre partido', 'Compara cada sesión contra el promedio de hasta 3 partidos de referencia (= 100%). Requiere seleccionar partidos en "Ingresar partidos".'],
        ['Interpretación %', 'Verde (>80%): alta exigencia. Amarillo (50–80%): moderada. Rojo (<50%): baja exigencia relativa (normal en recuperación o MD-1).'],
      ]},
      { titulo: 'Ctrl. Carga GPS', icono: '📡', intro: 'Datos GPS reales por jugador organizados por MD. Requiere haber importado datos desde la pestaña GPS.', rows: [
        ['Columnas MD', 'Cada columna = un día del microciclo etiquetado (MD+1, MD-4, MD-3, etc.). Solo aparecen columnas con datos importados.'],
        ['Métricas disponibles', 'Distancia total, Dist/min, High Speed Running, Vel. máxima, Nº sprints, ACC/DEC por banda, FC media/máxima, Zonas de FC, Player Load, Potencia Metabólica.'],
        ['Cuadro 4 — % sobre partido', 'Igual que Ctrl. Carga Calc: seleccioná partidos de referencia para ver cada MD como porcentaje del partido.'],
        ['Gráficos expandibles', 'Al expandir un MD, aparecen gráficos de barras por jugador con las métricas más relevantes.'],
      ]},
      { titulo: 'Acumulado Individual', icono: '📈', intro: 'Carga acumulada de un jugador en el tiempo. Útil para detectar subcarga crónica o sobreexposición.', rows: [
        ['Selección de jugador', 'Elegí el jugador desde el selector. Los datos se cargan automáticamente.'],
        ['Período', 'Ajustá el rango de fechas.'],
        ['Gráfico de carga acumulada', 'Línea que muestra la suma de UA a lo largo del período seleccionado.'],
        ['ACWR individual', 'Curva del ratio agudo:crónico, con zona óptima sombreada en verde (0.8–1.3).'],
      ]},
      { titulo: 'Cambio de Carga', icono: '🔄', intro: 'Variación porcentual de cualquier variable de carga de una sesión a la siguiente. Detecta saltos de carga peligrosos.', rows: [
        ['Filtros', 'Desde / Hasta, mínimo de minutos de entrenamiento y partido para incluir al jugador.'],
        ['Variable', 'UA, RPE, Distancia total, Sprints, Aceleraciones, Deceleraciones, Alta Potencia, Vel. máxima, Dist/min.'],
        ['🟢 −5% a +15%', 'Variación normal. Rango de progresión sostenible.'],
        ['🔴 > +15%', 'Aumento alto. Riesgo si se mantiene. Revisá acumulación de sesiones exigentes.'],
        ['🔵 < −5%', 'Reducción notable. Normal en semanas post-partido o pre-competición importante.'],
      ]},
      { titulo: 'Exposiciones a Alta Intensidad', icono: '⚡', intro: 'Analiza cuántas veces por semana cada jugador alcanzó umbrales de alta intensidad. Basado en evidencia: se recomienda al menos 3 exposiciones semanales para prepararse para el partido.', rows: [
        ['Velocidad Máxima', 'VM alcanzada en cada MD. Umbral = 80% de la VM promedio de partido. Celda verde = superó el umbral en ese MD. Objetivo: ≥3 de los 5 MD de entrenamiento.'],
        ['High Speed Running (HSR)', 'Metros a alta velocidad acumulados en la semana vs promedio de partido. <1 = bajo, 1–1.5 = normal, >1.5 = alto.'],
        ['Aceleraciones y Deceleraciones', 'Suma semanal de ACC/DEC de alta intensidad (>3 m/s²) vs promedio de partido.'],
        ['Partidos de referencia', 'Hacé clic en 🏆 Partidos referencia y seleccioná hasta 3 partidos del Calendario. El promedio de esos partidos = 100%. Sin partidos de referencia, las columnas de porcentaje no están disponibles.'],
      ]},
      { titulo: 'Evaluaciones', icono: '📋', intro: 'Registro de tests físicos individuales. Historial de evaluaciones por jugador a lo largo de la temporada.', rows: [
        ['PFV', 'Pico de Fuerza Vertical (N o kg). Test de salto con plataforma de fuerza.'],
        ['DSI', 'Dynamic Strength Index. Ratio entre fuerza dinámica e isométrica máxima.'],
        ['CMJ', 'Countermovement Jump (cm). Altura de salto con contramovimiento.'],
        ['RSI', 'Reactive Strength Index. Índice de fuerza reactiva en saltos continuos.'],
        ['I/Q', 'Ratio isquiotibiales/cuádriceps. Evaluación de equilibrio muscular.'],
        ['Aduc. ISO', 'Fuerza isométrica de aductores (kg). Prevención de lesión inguinal.'],
        ['FMS', 'Functional Movement Screen. Puntuación de calidad de movimiento (máx. 21).'],
        ['Vel. Lineal / Vel. Fuerza / YO-YO', 'Sprint, velocidad-fuerza y resistencia intermitente respectivamente.'],
        ['Cómo registrar', 'Clic en + Nueva Evaluación, seleccioná jugador y fecha, completá los tests que correspondan (no es necesario completar todos) y guardá.'],
      ]},
      { titulo: 'Comparativa GPS', icono: '⚖️', intro: 'Compara los datos GPS de todos los jugadores para detectar diferencias individuales y de posición en el mismo período.', rows: [
        ['Tabla de jugadores', 'Cada fila es un jugador con todas sus métricas GPS del período seleccionado (Desde / Hasta). Hacé clic en una columna para ordenar.'],
        ['Filtro de posición', 'Filtrá por posición para comparar solo jugadores del mismo rol.'],
        ['Gráfico de barras', 'Promedio de la métrica seleccionada por posición (o por jugador si filtrás una posición). El eje Y parte del 80% del valor mínimo para que las diferencias sean visibles.'],
        ['Para qué sirve', 'Identificar jugadores con carga significativamente diferente al grupo en el mismo período. Útil para ajustar cargas individuales.'],
      ]},
      { titulo: 'Lesiones', icono: '🏥', intro: 'Registro y seguimiento de lesiones del plantel. Jugadores lesionados aparecen diferenciados en la vista Equipo.', rows: [
        ['Tipo de lesión', 'Muscular, Articular, Ósea, Ligamentosa, Tendinosa, Contusión, Sobrecarga u Otra.'],
        ['Estado', 'Seis etapas detalladas: F1 (Rec. Funcional) → F2 (Pre-optimización) → F3 (Campo) → F4 (Readaptación Deportiva) → F5 (Reintegración) → F6 (Alta / Return to Play).'],
        ['ETA (días estimados)', 'Estimación de días hasta el alta. Aparece en la tarjeta del jugador en la vista Equipo.'],
        ['Flujo', 'Al registrar una lesión, el jugador pasa a "Lesionados". Actualizá la fase a medida que avanza. Al marcarlo como F6 (Alta), vuelve a estar disponible.'],
      ]},
      { titulo: 'Importar GPS', icono: '🛰️', intro: 'Importa datos GPS desde Catapult OpenField en formato Excel (.xlsx) o PDF. Los datos quedan disponibles en Ctrl. Carga GPS, Expo. AI y Comparativa.', rows: [
        ['Exportar desde Catapult', 'En Catapult OpenField: Reports → Session Summary → Export. Exportá como Excel o PDF.'],
        ['1. Subir archivo', 'Arrastrá o seleccioná el archivo exportado.'],
        ['2. Vista previa', 'El sistema detecta jugadores y variables disponibles antes de confirmar.'],
        ['3. Matching de jugadores', 'W&P asocia automáticamente cada nombre del GPS con el plantel. Si aparece en amarillo como sin match, verificá que el nombre en Catapult coincida con el cargado en W&P.'],
        ['4. Confirmar', 'Los datos se guardan asociados a la fecha y tipo de sesión. Si ya había GPS para esa fecha, se sobreescribe.'],
        ['Variables importadas', 'Dist. total, dist. por banda de velocidad (B1–B6), Dist/min, HSR, Vel. máxima, sprints, ACC/DEC por banda, Player Load, Potencia Metabólica, FC media/máxima, Zonas de FC.'],
      ]},
      { titulo: 'Jugadores', icono: '🗂️', intro: 'Gestión del plantel: altas, bajas y edición. Es la primera sección que debés completar antes de usar el resto de la plataforma.', rows: [
        ['Nombre completo', 'Nombre con el que aparecerá en todos los paneles.'],
        ['Correo electrónico', 'Imprescindible. Es la identificación del jugador para el wellness diario y el RPE post-sesión.'],
        ['Posición', 'Define el grupo en la vista Equipo y la Comparativa GPS.'],
        ['Foto', 'Opcional. Se muestra en la tarjeta del jugador.'],
        ['Configuración de email del coach', 'Desde esta sección configurás el correo para notificaciones y recordatorios a los jugadores.'],
        ['Editar / dar de baja', 'Al eliminar un jugador, sus datos históricos se conservan pero ya no aparece activo.'],
      ]},
      { titulo: 'Diseñador de Tareas', icono: '🎨', intro: 'Pizarra táctica para diseñar ejercicios con diagrama de campo, jugadores, conos, flechas y calculadora de densidad.', rows: [
        ['Guardar tarea', 'Clic en 🎨 Diseñar Tarea: elegí cancha, colocá jugadores, conos, flechas, zonas con dimensiones reales. La calculadora de densidad aparece automáticamente al poner jugadores y zona.'],
        ['Buscar y filtrar', 'Por texto, por tipo de tarea, o por más usadas / más recientes.'],
        ['Usar en sesión', 'Desde el Calendario, al crear o editar una sesión, hacé clic en 🎨 Mis Tareas para elegir una tarea diseñada con todos sus datos pre-completados.'],
      ]},
    ]

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>W&P — Manual de Usuario</title>
<style>${estilos}</style></head>
<body>
<div class="cover">
  <h1>W&P — Manual de Usuario</h1>
  <p>Wellness &amp; Performance · Plataforma de Monitoreo Deportivo</p>
  <p style="margin-top:16px; font-size:12px; color:#666;">Versión Abril 2026 · wellnessv1.vercel.app</p>
</div>

<div class="toc">
  <h3>📋 Contenido</h3>
  <ul>
    <li>🏠 Inicio — Flujo de uso</li>
    ${secciones_data.map(s => `<li>${s.icono} ${s.titulo}</li>`).join('\n    ')}
  </ul>
</div>

<div class="section">
  <h2>🏠 Primeros pasos</h2>
  <div class="tip">W&P integra el control del bienestar del jugador, la planificación de sesiones, el análisis de carga interna y externa, y el seguimiento de lesiones en un solo lugar.</div>
  ${[
    ['👥 Paso 1 — Cargá tu plantel', 'Andá a "Jugadores" y creá cada jugador con su nombre, posición y correo. El correo es clave: es la identificación del jugador para el wellness y el RPE.'],
    ['📅 Paso 2 — Planificá tu semana', 'Usá "Calendario" para crear sesiones y partidos. Dentro de cada sesión podés armar bloques de tareas y ver la estimación de carga automática.'],
    ['💊 Paso 3 — Monitoreá el wellness', 'Cada jugador completa su formulario diario. En "Equipo" ves en tiempo real quién respondió y el ACWR de cada uno.'],
    ['📡 Paso 4 — Importá GPS (opcional)', 'Si usás Catapult, exportá el Session Summary y subilo desde "GPS". El sistema detecta automáticamente jugadores y variables.'],
  ].map(([t, d]) => `<div class="row"><span class="row-label">${t}</span><span class="row-desc">${d}</span></div>`).join('')}
</div>

${secciones_data.map(sec => `
<div class="section">
  <h2>${sec.icono} ${sec.titulo}</h2>
  <p>${sec.intro}</p>
  ${sec.rows.map(([l, d]) => `<div class="row"><span class="row-label">${l}</span><span class="row-desc">${d}</span></div>`).join('')}
</div>
`).join('')}

<div class="section" style="border-top:2px solid #eee; margin-top:32px; padding-top:24px;">
  <p style="color:#888; font-size:11px; text-align:center;">
    W&amp;P — Wellness &amp; Performance · Desarrollado por Juan Quiroga y Franco Tosoni · Mendoza, Argentina · 2026<br>
    Contacto: wellnesstraining95@gmail.com · +34 672 00 73 90
  </p>
</div>
</body></html>`

    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  const s: Record<string, React.ReactNode> = {

    inicio: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:38, color:'var(--lime)', marginBottom:6, letterSpacing:'0.04em' }}>Bienvenido a W&P</h2>
        <p style={{ fontSize:13, color:'var(--silver)', lineHeight:1.7, marginBottom:20, maxWidth:680 }}>
          W&P es una plataforma de monitoreo y planificación de carga para fútbol y deportes de equipo. Integra el control del bienestar del jugador (wellness), la planificación de sesiones, el análisis de carga interna y externa, y el seguimiento de lesiones en un solo lugar.
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { icon:'👥', title:'Paso 1 — Cargá tu plantel', desc:'Andá a la pestaña "Jugadores" y creá cada jugador con su nombre, posición y correo. El correo es clave: es lo que usan para identificarse y completar el wellness diario.' },
            { icon:'📅', title:'Paso 2 — Planificá tu semana', desc:'Usá "Calendario" para crear sesiones y partidos. Dentro de cada sesión podés armar bloques de tareas y ver la estimación de carga para cada una.' },
            { icon:'💊', title:'Paso 3 — Monitoreá el wellness', desc:'Cada jugador completa su formulario diario desde la vista de jugador. En la pestaña "Equipo" ves en tiempo real quién respondió y el ACWR de cada uno.' },
            { icon:'📡', title:'Paso 4 — Importá GPS (opcional)', desc:'Si usás Catapult, exportá el Session Summary y subilo desde "GPS". El sistema detecta automáticamente a los jugadores y las variables disponibles.' },
          ].map(item => (
            <div key={item.title} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:18 }}>
              <div style={{ fontSize:24, marginBottom:8 }}>{item.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--snow)', marginBottom:6 }}>{item.title}</div>
              <div style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'rgba(200,241,53,.05)', border:'1px solid rgba(200,241,53,.15)', borderRadius:12, padding:16 }}>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--lime)', marginBottom:6 }}>💡 Tip de navegación</p>
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Usá las pestañas de arriba para moverte entre secciones. Este manual está siempre disponible en la última pestaña <strong style={{ color:'var(--snow)' }}>📖 Manual</strong>. Hacé clic en cualquier sección del índice de la izquierda para ir directo al tema que necesitás.</p>
        </div>
      </div>
    ),

    equipo: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>👥 Equipo</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Es la pantalla principal. Al entrar, ves el resumen del plantel y el estado del día. Es la primera vista que aparece al iniciar sesión.</p>
        <ManualSection title="Panel de resumen superior">
          <ManualRow label="Plantel" desc="Número total de jugadores registrados, con desglose de disponibles, diferenciados y lesionados." />
          <ManualRow label="Wellness Hoy" desc="Cuántos jugadores completaron el formulario de bienestar hoy. La barra de progreso se actualiza en tiempo real. Los jugadores pendientes se muestran en rojo." />
          <ManualRow label="EN RIESGO / PRECAUCIÓN / ÓPTIMOS" desc="Cantidad de jugadores en cada categoría de ACWR. Verde = óptimo (0.8–1.3), amarillo = precaución (1.3–1.5), rojo = riesgo (>1.5 o <0.8)." />
        </ManualSection>
        <ManualSection title="Lista de jugadores">
          <ManualRow label="Punto de color" desc="Verde si el jugador completó el wellness hoy, rojo si no lo hizo todavía." />
          <ManualRow label="Barras de wellness" desc="Las 5 barras pequeñas representan (de izquierda a derecha): Fatiga, Sueño, Dolor, Estrés y Ánimo del último registro." />
          <ManualRow label="ACWR" desc="Número en grande a la derecha: ratio carga aguda/crónica. Verde (óptimo), amarillo (precaución), rojo (riesgo)." />
          <ManualRow label="GYM" desc="Badge verde si el jugador marcó que fue al gimnasio en su último wellness." />
          <ManualRow label="Indicador de recuperación" desc="Si la última sesión fue hace menos de 48h, aparece una etiqueta de advertencia (<24h en rojo, ~48h en amarillo)." />
        </ManualSection>
        <ManualSection title="Detalle individual">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:10 }}>Hacé clic en un jugador para ver su vista detallada. Podés cambiar el ciclo entre Microciclo (7 días), Mesociclo (28 días) y Macrociclo (temporada).</p>
          <ManualRow label="Gráfico ACWR" desc="Evolución del ratio a lo largo del ciclo. La banda verde sombreada = zona óptima (0.8–1.3)." />
          <ManualRow label="Tabla de carga" desc="Historial día a día con la UA de cada sesión, el ACWR calculado y el estado resultante." />
          <ManualRow label="Último Wellness" desc="Detalle del último registro: barras de cada parámetro, TQR, zona de dolor y si fue al gimnasio." />
          <ManualRow label="RPE — Últimas sesiones" desc="Barras con el RPE de las últimas 12 sesiones. El color indica la intensidad percibida." />
        </ManualSection>
        <ManualSection title="Escudo y nombre del equipo">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Hacé clic en el escudo para subir la imagen de tu club. Hacé clic en el nombre (ícono ✏️) para editarlo. Ambos se guardan automáticamente.</p>
        </ManualSection>
      </div>
    ),

    calendario: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>📅 Calendario</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Permite planificar y visualizar todas las sesiones y partidos. Es el punto de partida para el control de carga: lo que planeás aquí alimenta los paneles de Ctrl. Carga Calc y Comparativa GPS.</p>
        <ManualSection title="Vistas disponibles">
          <ManualRow label="Vista Mes" desc="Muestra el mes completo en formato grilla. Cada día con eventos muestra una pastilla de color según el tipo de sesión." />
          <ManualRow label="Vista Semana" desc="Muestra los 7 días con más detalle por día. Ideal para revisar la distribución de cargas en el microciclo." />
        </ManualSection>
        <ManualSection title="Tipos de evento y colores">
          <ManualRow label="⚽ Verde — Entrenamiento" desc="Sesión de entrenamiento normal." />
          <ManualRow label="🏆 Azul — Partido" desc="Partido amistoso u oficial." />
          <ManualRow label="🔄 Amarillo — Recuperación" desc="Sesión de recuperación activa o regenerativa." />
          <ManualRow label="😴 Gris — Descanso" desc="Día libre sin actividad programada." />
          <ManualRow label="⚠ Rojo — <24h" desc="Alerta automática cuando hay menos de 24 horas entre eventos consecutivos." />
        </ManualSection>
        <ManualSection title="Crear o editar una sesión">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:10 }}>Usá el botón <strong style={{ color:'var(--lime)' }}>+ Nueva sesión</strong> o hacé clic en cualquier día. Campos principales:</p>
          <ManualRow label="Fecha / Hora" desc="Fecha de la sesión y hora de inicio/fin para calcular recuperación entre sesiones." />
          <ManualRow label="Tipo" desc="Entrenamiento, Partido, Recuperación o Descanso." />
          <ManualRow label="Título (MD)" desc="Etiqueta del microciclo: MD+1, MD+2, MD-4, MD-3, MD-2, MD-1, MD. Fundamental para el análisis de carga por MD." />
          <ManualRow label="Objetivos" desc="Objetivo físico principal (Fuerza, Resistencia, Velocidad, etc.) y objetivo secundario." />
          <ManualRow label="Estadio / Cancha" desc="📍 Seleccioná el lugar del entrenamiento. Esto es clave para el análisis posterior de densidad y perfil neuromuscular según las dimensiones del campo." />
          <ManualRow label="Bloques de tareas" desc="Podés agregar múltiples tareas dentro de una sesión. Cada bloque tiene su propio tipo, series, minutos, espacio y jugadores." />
        </ManualSection>
        <ManualSection title="Calculadora de carga en bloques de tarea">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:10 }}>Cuando una tarea tiene dimensiones de espacio (Rondo, Partido reducido, Juego de posición, etc.), la calculadora se activa automáticamente y muestra:</p>
          <ManualRow label="Objetivo de la tarea + Número" desc="Categoría según Sangnier et al. (2018): Fuerza, Activación, Resistencia o Velocidad. El número (1–4) indica intensidad dentro de esa categoría: 1 es la más intensa, 4 la menos intensa." />
          <ManualRow label="Estimación de carga GPS" desc="Distancia total, sprint (>21 km/h), alta potencia (>20 W/kg), aceleraciones, deceleraciones y número de sprints, calculados según densidad (m²/jugador) y tiempo activo total." />
          <ManualRow label="✏️ Editar GPS" desc="Podés sobrescribir manualmente cualquier métrica calculada con el dato real de GPS. Los valores editados se muestran en azul." />
          <ManualRow label="Imagen de la tarea" desc="Subí una foto o diagrama. Se guarda junto a la sesión y aparece en la vista de impresión." />
        </ManualSection>
      </div>
    ),

    analytics: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>📊 Analytics</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Panel de análisis de carga colectiva. Muestra la evolución de la carga para detectar tendencias, picos y períodos de descarga.</p>
        <ManualSection title="Cómo usarlo">
          <ManualRow label="Período" desc="Elegí el rango de fechas a analizar con los filtros Desde / Hasta." />
          <ManualRow label="Variable" desc="Seleccioná qué métrica visualizar: UA (carga interna por RPE), RPE, o métricas GPS como distancia total, sprints, aceleraciones, etc." />
          <ManualRow label="Vista diaria / semanal" desc="Diaria: cada sesión. Semanal: agrupa por semana para ver la tendencia macro." />
          <ManualRow label="Gráfico A — RPE vs. Wellness" desc="Zona verde = carga alta con buen bienestar (ideal). Zona roja = carga alta con mal bienestar (riesgo)." />
          <ManualRow label="Gráfico B — RPE vs. Dolor" desc="Detecta sesiones de alta carga con dolor muscular elevado." />
          <ManualRow label="Perfil Neuromuscular" desc="📊 Nueva vista que cruza datos GPS con dimensiones del estadio. Compara el equilibrio entre Carga Metabólica (Distancia/HSR) y Carga Neuromuscular (Aceleraciones/Desaceleraciones). Detecta automáticamente picos de densidad en canchas reducidas." />
          <ManualRow label="% de cambio" desc="Variación respecto al período anterior. Verde = normal (−5% a +15%), rojo = aumento alto (>+15%), azul = reducción notable (<−5%)." />
        </ManualSection>
      </div>
    ),

    minutaje: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>⏱ Minutaje</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Registro acumulado de minutos jugados y entrenados. Permite controlar la carga por tiempo de exposición.</p>
        <ManualSection title="Qué muestra">
          <ManualRow label="Minutos de entrenamiento" desc="Suma de minutos en sesiones de entrenamiento dentro del período seleccionado." />
          <ManualRow label="Minutos de partido" desc="Suma de minutos disputados en partidos dentro del período." />
          <ManualRow label="Total" desc="Suma de ambas categorías. El color cambia a rojo si el total supera un umbral de alerta." />
        </ManualSection>
        <ManualSection title="Cómo se registran los minutos">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Los minutos de entrenamiento se extraen del Calendario (series × minutos por bloque). Los de partido se registran por separado desde la vista de partidos. Para que los datos sean precisos, las sesiones deben tener los tiempos correctamente cargados.</p>
        </ManualSection>
      </div>
    ),

    'ctrl-calc': (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>🏋️ Control de Carga Calc</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Carga interna calculada a partir del RPE que reporta cada jugador y de la calculadora de tareas del Calendario. No requiere GPS.</p>
        <ManualSection title="Navegación por microciclo">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Usá las flechas ‹ › para moverte entre semanas. La semana actual aparece por defecto.</p>
        </ManualSection>
        <ManualSection title="Cuadros que muestra">
          <ManualRow label="Cuadro 1 — RPE individual" desc="RPE declarado por cada jugador en cada día del microciclo. Celdas verdes = registrado, gris = sin dato." />
          <ManualRow label="Cuadro 2 — UA (Unidades de Carga)" desc="Carga interna: RPE × minutos de sesión. Indicador estándar de carga interna (Foster, 1998)." />
          <ManualRow label="Cuadro 3 — Calculadora GPS" desc="Estimación de carga externa desde los bloques de tareas: distancia total, sprints, aceleraciones/deceleraciones. Son los mismos valores que calcula la Calculadora de Diseño de Tareas." />
          <ManualRow label="Cuadro 4 — % sobre partido" desc="Compara cada sesión contra el promedio de hasta 3 partidos de referencia (= 100%). Hacé clic en 'Ingresar partidos' para seleccionarlos." />
        </ManualSection>
        <ManualSection title="Interpretación del % sobre partido">
          <ManualRow label="Verde (>80%)" desc="Alta exigencia. El entrenamiento replicó demanda cercana o superior al partido." />
          <ManualRow label="Amarillo (50–80%)" desc="Demanda moderada respecto al partido." />
          <ManualRow label="Rojo (<50%)" desc="Baja exigencia relativa. Normal en días de recuperación o MD-1." />
        </ManualSection>
      </div>
    ),

    'ctrl-gps': (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>📡 Control de Carga GPS</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Datos GPS reales por jugador organizados por MD. Requiere haber importado datos desde la pestaña GPS. Complementa el Ctrl. Carga Calc con datos reales de dispositivo.</p>
        <ManualSection title="Estructura de la vista">
          <ManualRow label="Columnas MD" desc="Cada columna = un día del microciclo etiquetado (MD+1, MD-4, etc.). Solo aparecen los MDs con datos importados." />
          <ManualRow label="Filas de jugadores" desc="Cada fila es un jugador. Si no tiene GPS para ese MD, la celda aparece con —." />
          <ManualRow label="Métricas disponibles" desc="Distancia total, Dist/min, High Speed Running, Vel. máxima, Nº sprints, ACC/DEC por banda, FC media/máxima, Zonas de FC, Player Load, Potencia Metabólica." />
        </ManualSection>
        <ManualSection title="Cuadro 4 — % sobre partido">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:8 }}>Seleccioná hasta 3 partidos de referencia para ver cada MD como porcentaje de esa demanda (= 100%). El partido sirve como referencia base para saber si los entrenamientos replican su exigencia.</p>
          <ManualRow label="Verde" desc="El entrenamiento superó o igualó la demanda del partido en esa variable." />
          <ManualRow label="Rojo" desc="El entrenamiento estuvo por debajo de la demanda del partido." />
        </ManualSection>
        <ManualSection title="Gráficos expandibles">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Al expandir un MD, aparecen gráficos de barras por jugador con las métricas más relevantes: distancias por banda de velocidad, ACC/DEC, y velocidad máxima como línea punteada superpuesta.</p>
        </ManualSection>
      </div>
    ),

    acumulado: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>📈 Acumulado Individual</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Carga acumulada de un jugador en el tiempo. Útil para detectar subcarga crónica o sobreexposición.</p>
        <ManualSection title="Cómo usarlo">
          <ManualRow label="Selección de jugador" desc="Elegí el jugador desde el selector superior. Los datos se cargan automáticamente." />
          <ManualRow label="Período" desc="Ajustá el rango de fechas para ver la evolución en distintos marcos de tiempo." />
          <ManualRow label="Gráfico de carga acumulada" desc="Línea con la suma de UA a lo largo de las sesiones del período." />
          <ManualRow label="ACWR individual" desc="Curva del ratio agudo:crónico con la zona óptima sombreada en verde (0.8–1.3)." />
        </ManualSection>
      </div>
    ),

    'cambio-carga': (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>🔄 Cambio de Carga</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Variación porcentual de cualquier variable de carga de una sesión a la siguiente. Detecta saltos de carga peligrosos.</p>
        <ManualSection title="Filtros">
          <ManualRow label="Desde / Hasta" desc="Rango de fechas a analizar." />
          <ManualRow label="Min. Entrenamiento / Partido" desc="Mínimo de minutos para incluir al jugador en el análisis." />
          <ManualRow label="Variable" desc="UA, RPE, Distancia Total, Sprints, Aceleraciones, Deceleraciones, Alta Potencia, Vel. máxima, Dist/min." />
        </ManualSection>
        <ManualSection title="Interpretación del % de cambio">
          <ManualRow label="🟢 −5% a +15%" desc="Variación normal. Rango de progresión sostenible." />
          <ManualRow label="🔴 > +15%" desc="Aumento alto. Riesgo si se mantiene. Revisá acumulación de sesiones exigentes." />
          <ManualRow label="🔵 < −5%" desc="Reducción notable. Normal en semanas post-partido o antes de competición importante." />
        </ManualSection>
      </div>
    ),

    'expo-ai': (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>⚡ Exposiciones a Alta Intensidad</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Analiza cuántas veces por semana cada jugador alcanzó umbrales de alta intensidad: velocidad máxima (≥80% de la VM en partido), High Speed Running y ACC/DEC de alta intensidad. Basado en evidencia: los jugadores deben exponerse al menos 3 veces por semana a estas demandas para estar preparados para el partido.</p>
        <ManualSection title="Tablas disponibles">
          <ManualRow label="Velocidad Máxima" desc="VM alcanzada en cada MD. Umbral = 80% de la VM promedio de partido. Celda verde = superó el umbral. Objetivo: ≥3 de los 5 MD de entrenamiento." />
          <ManualRow label="High Speed Running (HSR)" desc="Metros a alta velocidad en la semana vs promedio de partido. <1 = bajo, 1–1.5 = normal, >1.5 = alto." />
          <ManualRow label="Aceleraciones y Deceleraciones" desc="Suma semanal de ACC/DEC de alta intensidad (>3 m/s²) vs promedio de partido." />
        </ManualSection>
        <ManualSection title="Partidos de referencia">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Hacé clic en <strong style={{ color:'var(--snow)' }}>🏆 Partidos referencia</strong> y seleccioná hasta 3 partidos del Calendario. El promedio de esos partidos = 100%. Sin partidos de referencia, las columnas de porcentaje no están disponibles.</p>
        </ManualSection>
      </div>
    ),

    evaluaciones: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>📋 Evaluaciones</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Registro de tests físicos individuales. Historial de evaluaciones de cada jugador a lo largo de la temporada.</p>
        <ManualSection title="Tests disponibles">
          {[['PFV','Pico de Fuerza Vertical (N o kg). Test de salto con plataforma de fuerza.'],['DSI','Dynamic Strength Index. Ratio entre fuerza dinámica e isométrica máxima.'],['CMJ','Countermovement Jump (cm). Altura de salto con contramovimiento.'],['RSI','Reactive Strength Index. Índice de fuerza reactiva en saltos continuos.'],['I/Q','Ratio isquiotibiales/cuádriceps. Evaluación de equilibrio muscular.'],['Aduc. ISO','Fuerza isométrica de aductores (kg). Prevención de lesión inguinal.'],['FMS','Functional Movement Screen. Puntuación de calidad de movimiento (máx. 21).'],['Vel. Lineal','Velocidad lineal en sprint (segundos en distancia fija).'],['Vel. Fuerza','Test de velocidad-fuerza.'],['YO-YO','Test YO-YO de resistencia intermitente. Nivel y metros alcanzados.']].map(([t,d])=><ManualRow key={t} label={t} desc={d} />)}
        </ManualSection>
        <ManualSection title="Cómo registrar">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Hacé clic en <strong style={{ color:'var(--lime)' }}>+ Nueva Evaluación</strong>, seleccioná el jugador y la fecha, completá los tests que correspondan (no es necesario completar todos) y guardá.</p>
        </ManualSection>
      </div>
    ),

    comparativa: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>⚖️ Comparativa GPS</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Compara los datos GPS de todos los jugadores en un período. Ideal para detectar diferencias individuales y entre posiciones.</p>
        <ManualSection title="Cómo usarlo">
          <ManualRow label="Tabla de jugadores" desc="Cada fila es un jugador con todas sus métricas GPS del período seleccionado. Hacé clic en cualquier columna para ordenar." />
          <ManualRow label="Filtro de posición" desc="Filtrá para comparar solo jugadores del mismo rol táctico." />
          <ManualRow label="Gráfico de barras" desc="Promedio de la métrica seleccionada por posición (o por jugador si filtrás una posición específica). El eje Y parte del 80% del valor mínimo para que las diferencias sean claramente visibles." />
        </ManualSection>
        <ManualSection title="Para qué sirve">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Identificar jugadores con carga significativamente diferente al grupo en el mismo período. Útil para ajustar cargas individuales en la planificación siguiente.</p>
        </ManualSection>
      </div>
    ),

    lesiones: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>🏥 Lesiones</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Registro y seguimiento de lesiones. Los jugadores lesionados aparecen diferenciados en la vista Equipo con el ícono 🏥.</p>
        <ManualSection title="Campos de una lesión">
          <ManualRow label="Tipo de lesión" desc="Muscular, Articular, Ósea, Ligamentosa, Tendinosa, Contusión, Sobrecarga u Otra." />
          <ManualRow label="Zona / Músculo" desc="Descripción de la zona anatómica afectada." />
          <ManualRow label="Estado" desc="Cuatro etapas: Tratamiento → Readaptación → Campo → Alta. El color cambia según el estado (rojo, amarillo, verde, gris)." />
          <ManualRow label="ETA (días estimados)" desc="Estimación de días hasta el alta. Aparece en la tarjeta del jugador en la vista Equipo." />
          <ManualRow label="Notas" desc="Campo libre para observaciones del médico o kinesiólogo." />
        </ManualSection>
        <ManualSection title="Flujo de trabajo">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Al registrar una lesión, el jugador pasa a "Lesionados". Actualizá el estado a medida que avanza la recuperación. Al marcarlo como "Alta", vuelve a la lista de jugadores disponibles.</p>
        </ManualSection>
      </div>
    ),

    gps: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>🛰️ Importar GPS</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Importa datos GPS desde Catapult OpenField en formato Excel (.xlsx) o PDF. Una vez importados, están disponibles en Ctrl. Carga GPS, Expo. AI y Comparativa.</p>
        <ManualSection title="Cómo exportar desde Catapult">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:8 }}>En Catapult OpenField: <strong style={{ color:'var(--snow)' }}>Reports → Session Summary → Export</strong>. Podés exportar como Excel o PDF. W&P acepta ambos formatos.</p>
        </ManualSection>
        <ManualSection title="Proceso de importación">
          <ManualRow label="1. Subir archivo" desc="Arrastrá o seleccioná el archivo exportado desde Catapult." />
          <ManualRow label="2. Vista previa" desc="El sistema detecta automáticamente jugadores y variables disponibles antes de confirmar." />
          <ManualRow label="3. Matching de jugadores" desc="W&P asocia cada nombre del GPS con el plantel. Los no encontrados aparecen en amarillo como 'sin match'. Verificá que el nombre en Catapult coincida con el cargado en W&P." />
          <ManualRow label="4. Confirmar" desc="Los datos se guardan asociados a la fecha y tipo de sesión. Si ya había GPS para esa fecha, se sobreescribe." />
          <ManualRow label="Sin vest / sin datos" desc="Los jugadores con distancia = 0 se marcan como 'sin vest' y se omiten de la importación." />
        </ManualSection>
        <ManualSection title="Variables que se importan">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Distancia total, dist. por banda de velocidad (B1–B6), Dist/min, High Speed Running, Vel. máxima, Nº sprints, ACC/DEC por banda (B1–B4 y totales), Player Load, Potencia Metabólica media, Dist. equivalente, FC media/máxima y Zonas de FC.</p>
        </ManualSection>
        <ManualSection title="¿No usás Catapult? Importá desde cualquier GPS">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:8 }}>
            W&P no es exclusivo de Catapult. Podés importar datos desde <strong style={{ color:'var(--snow)' }}>cualquier sistema GPS</strong> (Statsports, GPSports, Polar Team Pro, Wimu, etc.) siempre que exportes un <strong style={{ color:'var(--snow)' }}>Excel (.xlsx) con una columna de nombre de jugador y columnas de métricas</strong>.
          </p>
          <ManualRow label="Formato mínimo requerido" desc="Una columna con el nombre del jugador (puede llamarse 'Name', 'Player', 'Jugador' o similar) y al menos una columna numérica con datos GPS. El sistema detecta automáticamente las columnas disponibles." />
          <ManualRow label="Columnas recomendadas" desc="Distancia total, distancia en alta velocidad, velocidad máxima, aceleraciones y desaceleraciones. Podés tener cualquier nombre de columna — el sistema las importa todas." />
          <ManualRow label="Sin GPS del todo" desc="Si no usás ningún sistema GPS, podés ignorar completamente esta sección. Los paneles de Ctrl. Carga CALC, Acumulado Individual y Cambio de Carga funcionan 100% solo con RPE y datos del Calendario." />
        </ManualSection>
      </div>
    ),

    jugadores: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>🗂️ Jugadores</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Gestión del plantel: altas, bajas y edición. Es la primera sección que debés completar antes de usar el resto de la plataforma.</p>
        <ManualSection title="Crear un jugador">
          <ManualRow label="Nombre completo" desc="Nombre con el que aparecerá en todos los paneles." />
          <ManualRow label="Correo electrónico" desc="Imprescindible. Es la identificación del jugador para el wellness diario y el RPE post-sesión." />
          <ManualRow label="Posición" desc="Portero, Defensa Central, Lateral, Mediocentro, Volante, Extremo o Delantero. Define el grupo en la vista Equipo y la Comparativa." />
          <ManualRow label="Foto" desc="Opcional. Se muestra en la tarjeta del jugador." />
        </ManualSection>
        <ManualSection title="Configuración de email del coach">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>En Jugadores podés configurar el correo desde el que se envían notificaciones y recordatorios a los jugadores. Es necesario para que funcione el sistema de alertas.</p>
        </ManualSection>
        <ManualSection title="Editar o dar de baja">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Cada jugador tiene opciones para editar sus datos o eliminarlo. Al eliminar, sus datos históricos se conservan pero ya no aparece activo.</p>
        </ManualSection>
      </div>
    ),

    biblioteca: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>📚 Biblioteca de Tareas</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Pizarra táctica para diseñar ejercicios con diagrama de campo, jugadores, conos, flechas y calculadora de densidad.</p>
        <ManualSection title="Guardar una tarea">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:8 }}>Hacé clic en <strong style={{ color:'var(--lime)' }}>+ Guardar Tarea</strong> y completá el nombre, tipo, jugadores, series, minutos/serie, pausa, dimensiones del espacio y descripción. Solo el nombre es obligatorio.</p>
        </ManualSection>
        <ManualSection title="Buscar y filtrar">
          <ManualRow label="Búsqueda por texto" desc="Filtra por nombre de tarea o tipo." />
          <ManualRow label="Filtro por tipo" desc="Filtra por tipo de tarea (Rondo, Juego de posesión, Partido reducido, etc.)." />
          <ManualRow label="Ordenar" desc="Por más usadas o por más recientes." />
        </ManualSection>
        <ManualSection title="Usar una tarea en sesión">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Desde el Calendario, al crear o editar una sesión, hacé clic en <strong style={{ color:'var(--lime)' }}>🎨 Mis Tareas</strong> para elegir una tarea diseñada con el diagrama y datos pre-completados. El contador de "veces usada" se incrementa automáticamente.</p>
        </ManualSection>
      </div>
    ),

    canchas: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>🏟️ Canchas</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Buscador de canchas geolocalizadas con mapa interactivo. Permite buscar, medir y guardar canchas de fútbol directamente desde OpenStreetMap.</p>
        <ManualSection title="Buscar canchas en el mapa">
          <ManualRow label="Barra de búsqueda" desc="Escribí una dirección, ciudad o barrio y presioná Buscar. El mapa se mueve a esa zona automáticamente." />
          <ManualRow label="📍 Mi ubicación" desc="Centra el mapa en tu posición actual usando el GPS del dispositivo." />
          <ManualRow label="⚽ Buscar canchas aquí" desc="Consulta OpenStreetMap en el área visible del mapa y muestra todas las canchas de Fútbol 11 (≥90m × ≥45m) con sus dimensiones." />
          <ManualRow label="Marcadores en el mapa" desc="Cada cancha encontrada aparece con un marcador. Hacé clic para ver sus dimensiones y guardarla." />
        </ManualSection>
        <ManualSection title="Detalle de una cancha">
          <ManualRow label="Largo / Ancho" desc="Dimensiones calculadas automáticamente desde el polígono de OpenStreetMap usando la fórmula de Haversine." />
          <ManualRow label="Área (m²)" desc="Superficie total de la cancha en metros cuadrados." />
          <ManualRow label="Tipo" desc="Clasificación automática: F11 (≥90×45m), F9 (≥65×40m), F7 (≥45×25m) o F5." />
        </ManualSection>
        <ManualSection title="Herramienta de medición manual (📏 Medir)">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:8 }}>Si una cancha no tiene polígono en OpenStreetMap, podés medirla vos mismo haciendo clic en las 4 esquinas sobre el mapa.</p>
          <ManualRow label="¿Cómo usarla?" desc="Presioná 📏 Medir, luego hacé clic en los 4 vértices de la cancha en el orden que quieras. El sistema calcula automáticamente largo, ancho y área." />
          <ManualRow label="Resultado" desc="Aparece debajo del mapa con las dimensiones y la clasificación. Podés guardar esa medición junto con los datos de la cancha." />
        </ManualSection>
        <ManualSection title="Guardar canchas">
          <ManualRow label="Nombre" desc="Nombre para identificar la cancha (por defecto usa el nombre de OpenStreetMap)." />
          <ManualRow label="Superficie" desc="Tipo de superficie: Césped natural, Sintético, Tierra, Cemento u Otro." />
          <ManualRow label="Notas" desc="Campo libre para anotaciones (iluminación, vestuarios, costo, etc.)." />
          <ManualRow label="⭐ Guardar" desc="La cancha queda asociada al club y visible en la pestaña Guardadas. Una vez guardada, podrás seleccionarla en el Calendario para vincularla a tus entrenamientos." />
        </ManualSection>
        <ManualSection title="Impacto en el rendimiento">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Vincular una cancha a una sesión permite al sistema calcular el <strong>Perfil Neuromuscular</strong> en Analytics, ayudándote a entender cómo las dimensiones del campo afectan la densidad de aceleraciones y frenos de tus jugadores.</p>
        </ManualSection>
        <ManualSection title="Pestaña Guardadas">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>Muestra todas las canchas registradas para tu club. Desde aquí podés hacer clic en 🗺️ Ver para ir a esa cancha en el mapa, o 🗑 para eliminarla.</p>
        </ManualSection>
      </div>
    ),

    vinculaciones: (
      <div>
        <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:34, color:'var(--snow)', marginBottom:4, letterSpacing:'0.04em' }}>🔗 Vinculaciones</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginBottom:20, lineHeight:1.65 }}>Panel de análisis causal que cruza el historial de carga de entrenamiento (ACWR) con los episodios de lesión, para determinar si un pico de carga precedió a cada lesión.</p>
        <ManualSection title="Tab: Timeline (análisis individual)">
          <ManualRow label="Selector de jugador" desc="Elegí un jugador del plantel para ver su análisis personal." />
          <ManualRow label="Período" desc="Seleccioná 30, 60, 90 o 180 días de historial." />
          <ManualRow label="Gráfico Timeline" desc="Muestra la carga aguda (barras azules), el ACWR (línea naranja) y las lesiones (líneas rojas verticales) superpuestos en el tiempo. Las zonas de fondo indican el nivel de riesgo del ACWR." />
          <ManualRow label="Marcador de lesión" desc="Hacé clic en cualquier línea roja del gráfico para ver el análisis causal de esa lesión." />
          <ManualRow label="Punto naranja" desc="Indica que se detectó un pico de ACWR en los días previos a esa lesión." />
        </ManualSection>
        <ManualSection title="KPIs individuales">
          <ManualRow label="ACWR Actual" desc="Ratio carga aguda/crónica del jugador a hoy. Verde (óptimo 0.8–1.3), amarillo (precaución 1.3–1.5), rojo (riesgo >1.5)." />
          <ManualRow label="Días en Riesgo" desc="Días consecutivos que el jugador lleva en zona de precaución o peligro." />
          <ManualRow label="Con Pico Previo" desc="Porcentaje de lesiones en el período que tuvieron un pico de carga detectado en los 14 días previos." />
          <ManualRow label="Carga Aguda / Crónica" desc="UA de la semana actual vs. promedio de las últimas 4 semanas." />
        </ManualSection>
        <ManualSection title="Análisis causal de una lesión">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:8 }}>Al hacer clic en una lesión del gráfico o de la lista, aparece el detalle causal:</p>
          <ManualRow label="ACWR día lesión / -7d / -14d" desc="Valor del ACWR en tres puntos clave antes de la lesión." />
          <ManualRow label="Variación Semanal" desc="% de cambio de carga entre la semana previa y la anterior a esa. Rojo si supera el 10%." />
          <ManualRow label="Días sin carga previos" desc="Días de descanso previos al evento de lesión." />
          <ManualRow label="Veredicto" desc="Si el ACWR superó 1.3 en los 14 días previos → ⚠️ PICO DETECTADO (sobrecarga probable). Si no → ✅ Sin pico (posiblemente lesión por contacto u otro factor)." />
        </ManualSection>
        <ManualSection title="Tab: Equipo (estado del plantel)">
          <p style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65, marginBottom:8 }}>Vista colectiva con el estado ACWR actual de todos los jugadores:</p>
          <ManualRow label="Lista ordenada por ACWR" desc="Jugadores ordenados de mayor a menor riesgo. El color del punto indica el estado: rojo (peligro), amarillo (precaución), verde (óptimo), azul (carga baja)." />
          <ManualRow label="Contadores por zona" desc="Cuántos jugadores están en cada zona de riesgo en este momento." />
        </ManualSection>
      </div>
    ),
  }

  return (
    <div style={{ padding:'0 0 24px' }}>
      {/* Header con botón PDF */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:32, color:'var(--snow)', letterSpacing:'0.04em', marginBottom:2 }}>📖 Manual de Usuario</h2>
          <p style={{ fontSize:11, color:'var(--silver)' }}>W&P — Wellness & Performance · Versión Abril 2026</p>
        </div>
        <button className="hover-scale" onClick={generarPDF}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13,
            background:'rgba(200,241,53,.12)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.35)' }}>
          📄 Descargar PDF
        </button>
      </div>

      <div style={{ display:'flex', gap:0, minHeight:600 }}>
        {/* Sidebar */}
        <div style={{ width:220, flexShrink:0, background:'var(--ink2)', borderRadius:16, padding:12, marginRight:20, alignSelf:'flex-start', position:'sticky', top:20 }}>
          <p style={{ fontSize:9, fontWeight:700, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10, paddingLeft:6 }}>Índice</p>
          {SECCIONES.map(sec => (
            <button className="hover-scale" key={sec.id} onClick={() => setSeccion(sec.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'none', cursor:'pointer', textAlign:'left',
                background: seccion === sec.id ? 'rgba(200,241,53,.12)' : 'transparent',
                color: seccion === sec.id ? 'var(--lime)' : 'var(--silver)',
                fontSize: 12, fontWeight: seccion === sec.id ? 700 : 400,
                borderLeft: seccion === sec.id ? '2px solid var(--lime)' : '2px solid transparent',
                transition: 'all .1s',
              }}
              onMouseEnter={e => { if (seccion !== sec.id) e.currentTarget.style.background = 'rgba(255,255,255,.04)' }}
              onMouseLeave={e => { if (seccion !== sec.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize:14, flexShrink:0 }}>{sec.icon}</span>
              <span style={{ lineHeight:1.3 }}>{sec.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex:1, minWidth:0, background:'var(--ink2)', borderRadius:16, padding:28 }}>
          {s[seccion] || (
            <div style={{ color:'var(--fog)', fontSize:14, padding:40, textAlign:'center' }}>Seleccioná una sección del índice.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ManualSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, paddingBottom:6, borderBottom:'1px solid rgba(200,241,53,.15)' }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:0 }}>{children}</div>
    </div>
  )
}

function ManualRow({ label, desc }: { label: string; desc: string }) {
  return (
    <div style={{ display:'flex', gap:12, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.04)', alignItems:'flex-start' }}>
      <span style={{ fontSize:12, fontWeight:700, color:'var(--snow)', minWidth:140, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:12, color:'var(--silver)', lineHeight:1.65 }}>{desc}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// NOTIFICACIONES PANEL (Coach Preferences)
// ═══════════════════════════════════════════════════════════════════

const NOTIF_TIMEZONES = [
  { flag: '🇦🇷', tz: 'America/Argentina/Buenos_Aires', label: 'Argentina (Buenos Aires)' },
  { flag: '🇺🇾', tz: 'America/Montevideo', label: 'Uruguay (Montevideo)' },
  { flag: '🇧🇷', tz: 'America/Sao_Paulo', label: 'Brasil (São Paulo)' },
  { flag: '🇨🇱', tz: 'America/Santiago', label: 'Chile (Santiago)' },
  { flag: '🇵🇾', tz: 'America/Asuncion', label: 'Paraguay (Asunción)' },
  { flag: '🇧🇴', tz: 'America/La_Paz', label: 'Bolivia (La Paz)' },
  { flag: '🇵🇪', tz: 'America/Lima', label: 'Perú (Lima)' },
  { flag: '🇨🇴', tz: 'America/Bogota', label: 'Colombia (Bogotá)' },
  { flag: '🇪🇨', tz: 'America/Guayaquil', label: 'Ecuador (Quito)' },
  { flag: '🇻🇪', tz: 'America/Caracas', label: 'Venezuela (Caracas)' },
  { flag: '🇲🇽', tz: 'America/Mexico_City', label: 'México (CDMX)' },
  { flag: '🇨🇷', tz: 'America/Costa_Rica', label: 'Costa Rica' },
  { flag: '🇵🇦', tz: 'America/Panama', label: 'Panamá' },
  { flag: '🇩🇴', tz: 'America/Santo_Domingo', label: 'Rep. Dominicana' },
  { flag: '🇺🇸', tz: 'America/New_York', label: 'EEUU (Este)' },
  { flag: '🇺🇸', tz: 'America/Chicago', label: 'EEUU (Centro)' },
  { flag: '🇺🇸', tz: 'America/Los_Angeles', label: 'EEUU (Pacífico)' },
  { flag: '🇪🇸', tz: 'Europe/Madrid', label: 'España (Madrid)' },
  { flag: '🇮🇹', tz: 'Europe/Rome', label: 'Italia (Roma)' },
  { flag: '🇫🇷', tz: 'Europe/Paris', label: 'Francia (París)' },
  { flag: '🇩🇪', tz: 'Europe/Berlin', label: 'Alemania (Berlín)' },
  { flag: '🇵🇹', tz: 'Europe/Lisbon', label: 'Portugal (Lisboa)' },
  { flag: '🇬🇧', tz: 'Europe/London', label: 'Reino Unido (Londres)' },
  { flag: '🇯🇵', tz: 'Asia/Tokyo', label: 'Japón (Tokio)' },
  { flag: '🇦🇺', tz: 'Australia/Sydney', label: 'Australia (Sídney)' },
  { flag: '🇸🇦', tz: 'Asia/Riyadh', label: 'Arabia Saudita (Riad)' },
  { flag: '🇦🇪', tz: 'Asia/Dubai', label: 'Emiratos Árabes (Dubái)' },
]

const NOTIF_HOURS: string[] = []
for (let h = 0; h < 24; h++) {
  NOTIF_HOURS.push(`${String(h).padStart(2, '0')}:00`)
  NOTIF_HOURS.push(`${String(h).padStart(2, '0')}:30`)
}

function NotificacionesCoachPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle')
  const [prefs, setPrefs] = useState({
    push_enabled: true,
    timezone: 'America/Argentina/Buenos_Aires',
    hora_manana: '08:00',
    hora_tarde: '20:00',
    alerta_cumpleanos: true,
    alerta_acwr: true,
    alerta_dia_partido: true,
    alerta_sesion_dia: true,
    alerta_wellness_pendientes: true,
    alerta_alta_lesion: true,
  })
  const [hasSubscription, setHasSubscription] = useState(false)

  useEffect(() => {
    fetch('/api/push/preferences')
      .then(r => r.json())
      .then(d => {
        if (d.preferences) {
          setPrefs(p => ({ ...p, ...d.preferences }))
        }
        setHasSubscription(!!d.hasSubscription)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const save = useCallback(async () => {
    setSaving('saving')
    try {
      const res = await fetch('/api/push/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      setSaving(res.ok ? 'ok' : 'error')
      setTimeout(() => setSaving('idle'), 2500)
    } catch {
      setSaving('error')
      setTimeout(() => setSaving('idle'), 2500)
    }
  }, [prefs])

  const togglePref = (key: string) => {
    setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }))
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--silver)' }}>Cargando preferencias...</div>

  const ALERT_OPTIONS = [
    { key: 'alerta_cumpleanos', icon: '🎂', label: 'Cumpleaños de jugadores', desc: 'Cuando un jugador cumple años' },
    { key: 'alerta_acwr', icon: '⚠️', label: 'Alertas de carga (ACWR)', desc: 'Jugadores en zona de riesgo' },
    { key: 'alerta_dia_partido', icon: '⚽', label: 'Día de partido', desc: 'Cuando hay partido planificado' },
    { key: 'alerta_sesion_dia', icon: '🏋️', label: 'Sesión de entrenamiento', desc: 'Sesiones planificadas del día' },
    { key: 'alerta_wellness_pendientes', icon: '📋', label: 'Wellness pendientes', desc: 'Jugadores sin completar al final del día' },
    { key: 'alerta_alta_lesion', icon: '🏥', label: 'Altas de lesiones', desc: 'Cuando un jugador es dado de alta' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="anim-up">
        <h2 className="display" style={{ fontSize: 32, color: 'var(--snow)', marginBottom: 4 }}>🔔 Notificaciones</h2>
        <p style={{ fontSize: 13, color: 'var(--silver)' }}>Configurá qué alertas querés recibir y en qué horario.</p>
      </div>

      {/* Push Toggle */}
      <div className="card anim-up delay-1" style={{ padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          Notificaciones Push
        </p>
        <PushToggle onSubscriptionChange={(sub) => setHasSubscription(sub)} />
        {!hasSubscription && (
          <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 10, padding: '8px 12px', background: 'rgba(245,158,11,.08)', borderRadius: 8, border: '1px solid rgba(245,158,11,.2)' }}>
            ⚠ No tenés notificaciones push activadas. Activá el toggle de arriba para recibir alertas en tu dispositivo.
          </p>
        )}
      </div>

      {/* Timezone + Hours */}
      <div className="card anim-up delay-2" style={{ padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          🌍 Zona Horaria y Horarios
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Timezone */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--silver)', fontWeight: 600, marginBottom: 6, display: 'block' }}>País / Zona horaria</label>
            <select
              className="wp-input"
              value={prefs.timezone}
              onChange={(e) => setPrefs(p => ({ ...p, timezone: e.target.value }))}
              style={{ cursor: 'pointer' }}
            >
              {NOTIF_TIMEZONES.map(tz => (
                <option key={tz.tz} value={tz.tz}>{tz.flag} {tz.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Morning hour */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--silver)', fontWeight: 600, marginBottom: 6, display: 'block' }}>🌅 Alertas de mañana</label>
              <select
                className="wp-input"
                value={prefs.hora_manana}
                onChange={(e) => setPrefs(p => ({ ...p, hora_manana: e.target.value }))}
                style={{ cursor: 'pointer' }}
              >
                {NOTIF_HOURS.map(h => (
                  <option key={`m-${h}`} value={h}>{h} hs</option>
                ))}
              </select>
              <p style={{ fontSize: 10, color: 'var(--fog)', marginTop: 4 }}>Cumpleaños, partidos, ACWR, sesiones</p>
            </div>

            {/* Evening hour */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--silver)', fontWeight: 600, marginBottom: 6, display: 'block' }}>🌙 Alertas de tarde</label>
              <select
                className="wp-input"
                value={prefs.hora_tarde}
                onChange={(e) => setPrefs(p => ({ ...p, hora_tarde: e.target.value }))}
                style={{ cursor: 'pointer' }}
              >
                {NOTIF_HOURS.map(h => (
                  <option key={`t-${h}`} value={h}>{h} hs</option>
                ))}
              </select>
              <p style={{ fontSize: 10, color: 'var(--fog)', marginTop: 4 }}>Wellness pendientes, sesiones de mañana</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Types */}
      <div className="card anim-up delay-3" style={{ padding: 24 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
          📬 ¿Qué alertas querés recibir?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ALERT_OPTIONS.map(opt => {
            const checked = !!prefs[opt.key as keyof typeof prefs]
            return (
              <button className="hover-scale"
                key={opt.key}
                onClick={() => togglePref(opt.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  background: checked ? 'rgba(200,241,53,.04)' : 'transparent',
                  border: 'none', borderRadius: 10, cursor: 'pointer', width: '100%',
                  textAlign: 'left', transition: 'background .15s',
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: checked ? '2px solid var(--lime)' : '2px solid var(--fog)',
                  background: checked ? 'var(--lime)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}>
                  {checked && <span style={{ fontSize: 12, color: '#000', fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{opt.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: checked ? 'var(--snow)' : 'var(--silver)' }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--fog)', marginTop: 1 }}>{opt.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="anim-up" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        {saving === 'ok' && (
          <span style={{ fontSize: 13, color: '#22c55e', alignSelf: 'center', fontWeight: 600 }}>✓ Guardado</span>
        )}
        {saving === 'error' && (
          <span style={{ fontSize: 13, color: '#ef4444', alignSelf: 'center', fontWeight: 600 }}>✗ Error al guardar</span>
        )}
        <button
          className="btn-lime"
          onClick={save}
          disabled={saving === 'saving'}
          style={{ fontSize: 14, padding: '12px 28px' }}
        >
          {saving === 'saving' ? 'Guardando...' : '💾 Guardar preferencias'}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// BIBLIOTECA DE TAREAS PANEL
// ═══════════════════════════════════════════════════════════════════
function BibliotecaPanel() {
  const [tareas, setTareas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre:'', ventana:'', subtarea:'', jugadores:'', series:'', minutos:'', pausa:'', largo:'', ancho:'', descripcion:'' })
  const [saving, setSaving] = useState(false)
  const [ventanaFilter, setVentanaFilter] = useState('')
  const [sortBy, setSortBy] = useState<'uso'|'reciente'|'tipo'>('tipo')
  const [showBoard, setShowBoard] = useState(false)
  const [editBoardId, setEditBoardId] = useState<number|null>(null)
  const [editBoardData, setEditBoardData] = useState<any>(null)
  const [boardName, setBoardName] = useState('')
  const [boardVentana, setBoardVentana] = useState('')
  const [boardSubtarea, setBoardSubtarea] = useState('')
  const [boardJugadores, setBoardJugadores] = useState('')
  const [zoneInfo, setZoneInfo] = useState<{rw:number;rh:number;area:number}[]>([])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    try {
      const r = await fetch('/api/biblioteca')
      const d = await r.json()
      setTareas(d.tareas||[])
    } catch(e){} finally { setLoading(false) }
  }

  async function guardar() {
    if (!form.nombre) return
    setSaving(true)
    try {
      await fetch('/api/biblioteca', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) })
      setShowForm(false)
      setForm({ nombre:'', ventana:'', subtarea:'', jugadores:'', series:'', minutos:'', pausa:'', largo:'', ancho:'', descripcion:'' })
      await cargar()
    } catch(e){} finally { setSaving(false) }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar tarea de la biblioteca?')) return
    await fetch(`/api/biblioteca?id=${id}`, { method:'DELETE' })
    await cargar()
  }

  const ventanas = Array.from(new Set(tareas.map(t=>t.ventana).filter(Boolean))).sort()
  const filtradas = tareas
    .filter(t => {
      const matchBuscar = !buscar || t.nombre.toLowerCase().includes(buscar.toLowerCase()) || (t.ventana||'').toLowerCase().includes(buscar.toLowerCase())
      const matchVentana = !ventanaFilter || t.ventana === ventanaFilter
      return matchBuscar && matchVentana
    })
    .sort((a,b) => {
      if (sortBy === 'uso') return (b.veces_usada||0) - (a.veces_usada||0)
      if (sortBy === 'reciente') return new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime()
      // 'tipo': sort by ventana then intensidad
      const vA = (a.ventana||'zzz').localeCompare(b.ventana||'zzz')
      if (vA !== 0) return vA
      return (a.intensidad ?? 99) - (b.intensidad ?? 99)
    })

  // Objectives that come from the GPS calculator (Sangnier table)
  const OBJETIVOS_CALC = ['Fuerza', 'Activación', 'Resistencia', 'Velocidad']
  const OBJETIVO_ORDER = { 'Fuerza': 0, 'Activación/Recuperación': 1, 'Resistencia': 2, 'Velocidad': 3 }

  // Split: tareas with objetivo (from calculator) vs without
  const tareasConCalc = filtradas.filter(t => t.objetivo != null)
  const tareasSinCalc = filtradas.filter(t => t.objetivo == null)

  // Group calculator tareas by objetivo
  const byObjetivo: Record<string, any[]> = {}
  for (const t of tareasConCalc) {
    const obj = t.objetivo as string
    if (!byObjetivo[obj]) byObjetivo[obj] = []
    byObjetivo[obj].push(t)
  }
  Object.values(byObjetivo).forEach(g => g.sort((a,b) => (a.intensidad??99)-(b.intensidad??99)))

  // Group non-calculator tareas by ventana
  const byVentana: Record<string, any[]> = {}
  for (const t of tareasSinCalc) {
    const v = t.ventana || 'Sin tipo'
    if (!byVentana[v]) byVentana[v] = []
    byVentana[v].push(t)
  }

  const objetivosSorted = Object.keys(byObjetivo).sort((a,b) => {
    const oa = OBJETIVO_ORDER[a as keyof typeof OBJETIVO_ORDER] ?? 99
    const ob = OBJETIVO_ORDER[b as keyof typeof OBJETIVO_ORDER] ?? 99
    return oa - ob
  })
  const ventanasSorted = Object.keys(byVentana).sort()

  function TareaCard({ t }: { t: any }) {
    return (
      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom: (t.descripcion || t.imagen) ? 8 : 0 }}>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
              <span style={{ fontWeight:700, color:'var(--snow)', fontSize:14 }}>{t.nombre}</span>
              {t.ventana && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(200,241,53,.12)', color:'var(--lime)', fontWeight:600 }}>{t.ventana}</span>}
              {getSubtareasDisplay(t) && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:6, background:'rgba(200,241,53,.06)', color:'var(--silver)' }}>↳ {getSubtareasDisplay(t)}</span>}
              {t.intensidad != null && (
                <span title={`Intensidad ${t.intensidad} (1=más intensa, 4=menos intensa)`} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:20, height:20, borderRadius:'50%', background: t.intensidad<=1?'#ef4444':t.intensidad<=2?'#f97316':t.intensidad<=3?'#eab308':'#22c55e', color:'#fff', fontSize:10, fontWeight:900, fontFamily:'DM Mono,monospace', flexShrink:0 }}>
                  {t.intensidad}
                </span>
              )}
              <span style={{ fontSize:9, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>usada {t.veces_usada}×</span>
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:11, color:'var(--silver)' }}>
              {t.jugadores && <span>👥 <strong>{t.jugadores}</strong> jug.</span>}
              {t.series && <span>🔄 <strong>{t.series}</strong> series</span>}
              {t.minutos && <span>⏱ <strong>{t.minutos}</strong> min/serie</span>}
              {t.pausa && <span>⏸ <strong>{t.pausa}</strong> min pausa</span>}
              {t.largo && t.ancho && <span>📐 <strong>{t.largo}×{t.ancho}</strong>m</span>}
              {t.series && t.minutos && <span style={{ color:'var(--lime)', fontFamily:'DM Mono,monospace', fontSize:10 }}>→ {t.series*t.minutos} min activo</span>}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0, alignItems:'center' }}>
            <button className="hover-scale" onClick={()=>eliminar(t.id)} style={{ fontSize:10, padding:'7px 10px', borderRadius:8, background:'rgba(239,68,68,.06)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)', cursor:'pointer' }} title="Eliminar">✕</button>
          </div>
        </div>
        {/* Tactical diagram preview */}
        {t.diagram_preview && (
          <div style={{ marginTop:8 }}>
            <img src={t.diagram_preview} alt="Diagrama" style={{ width:'100%', maxWidth:360, borderRadius:8, border:'1px solid var(--mist)' }} />
            <button className="hover-scale" onClick={(e) => { e.stopPropagation(); setEditBoardId(t.id); setEditBoardData(t.tactical_diagram ? JSON.parse(t.tactical_diagram) : null); setBoardName(t.nombre); setShowBoard(true) }}
              style={{ marginTop:6, fontSize:10, padding:'4px 12px', borderRadius:6, border:'1px solid rgba(163,230,53,.3)', background:'rgba(163,230,53,.06)', color:'var(--lime)', cursor:'pointer', fontWeight:600 }}>
              ✏️ Editar diagrama
            </button>
          </div>
        )}
        {/* Imagen, descripción y rutina en la parte inferior */}
        {(t.imagen || t.descripcion || (t.rutinaGym && t.rutinaGym.length > 0)) && (
          <div style={{ display:'flex', gap:12, alignItems:'flex-start', marginTop:8 }}>
            {t.imagen && (
              <img
                src={t.imagen}
                alt={t.nombre}
                style={{ width:240, height:160, objectFit:'contain', borderRadius:8, background:'var(--ink3)', border:'1px solid var(--mist)', flexShrink:0 }}
              />
            )}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
              {t.rutinaGym && t.rutinaGym.length > 0 && (
                <div style={{ background:'var(--ink3)', borderRadius:8, padding:'8px 12px', border:'1px solid rgba(255,255,255,.05)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:4, borderBottom:'1px solid rgba(255,255,255,.1)', paddingBottom:4, marginBottom:4 }}>
                    <span style={{ fontSize:9, fontWeight:700, color:'var(--lime)', textTransform:'uppercase' }}>Ejercicio</span>
                    <span style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase' }}>Series</span>
                    <span style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase' }}>Reps</span>
                    <span style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase' }}>Carga</span>
                  </div>
                  {t.rutinaGym.map((r:any,rIdx:number) => (
                    <div key={rIdx} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:4, fontSize:11, color:'var(--snow)', marginBottom:2 }}>
                      <span>{r.ejercicio}</span>
                      <span style={{ color:'var(--fog)' }}>{r.series}</span>
                      <span style={{ color:'var(--fog)' }}>{r.repeticiones}</span>
                      <span style={{ color:'var(--fog)' }}>{r.peso}</span>
                    </div>
                  ))}
                </div>
              )}
              {t.descripcion && (
                <div style={{ fontSize:11, color:'var(--fog)', background:'var(--ink3)', borderRadius:8, padding:'6px 10px', borderLeft:'2px solid rgba(200,241,53,.2)' }}>
                  {t.descripcion}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  function GroupHeader({ label, color = 'var(--lime)' }: { label: string; color?: string }) {
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:20, marginBottom:8 }}>
        <span style={{ width:3, height:16, borderRadius:2, background:color, display:'inline-block', flexShrink:0 }} />
        <span style={{ fontSize:10, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.1em' }}>{label}</span>
        <div style={{ flex:1, height:1, background:'var(--mist)' }} />
      </div>
    )
  }

  return (
    <div style={{ padding:'24px 20px', maxWidth:1100, margin:'0 auto' }}>
      {/* Tactical Board */}
      {showBoard && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', gap:10, alignItems:'end', marginBottom:12, flexWrap:'wrap' }}>
            <div style={{ flex:1, minWidth:200 }}>
              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Nombre</label>
              <input className="wp-input" value={boardName} onChange={e=>setBoardName(e.target.value)} placeholder="Ej: Rondo 4v2 + comodín" style={{ fontSize:13, padding:'6px 12px', width:'100%' }} />
            </div>
            <div style={{ minWidth:160 }}>
              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Tipo de tarea</label>
              <select className="wp-input" style={{ padding:'6px 12px', fontSize:12 }} value={boardVentana} onChange={e=>{setBoardVentana(e.target.value);setBoardSubtarea('')}}>
                <option value="">— Seleccionar —</option>
                {TODAS_LAS_NUEVAS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {boardVentana && SUBTAREAS[boardVentana] && (
              <div style={{ minWidth:140 }}>
                <label style={{ display:'block', fontSize:9, fontWeight:700, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Subtarea</label>
                <select className="wp-input" style={{ padding:'6px 12px', fontSize:12 }} value={boardSubtarea} onChange={e=>setBoardSubtarea(e.target.value)}>
                  <option value="">—</option>
                  {SUBTAREAS[boardVentana].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div style={{ minWidth:80 }}>
              <label style={{ display:'block', fontSize:9, fontWeight:700, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:4 }}>Jugadores</label>
              <input type="number" className="wp-input" value={boardJugadores} onChange={e=>setBoardJugadores(e.target.value)} placeholder="0" style={{ fontSize:13, padding:'6px 12px', width:70 }} min="0" max="30" />
            </div>
          </div>

          {zoneInfo.length > 0 && Number(boardJugadores) > 0 && (() => {
            const totalArea = zoneInfo.reduce((s,z) => s + z.area, 0)
            const jug = Number(boardJugadores)
            const densidad = totalArea / jug
            const cuad = getCuadrante(densidad, jug)
            return (
              <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
                {zoneInfo.map((z,i) => (
                  <div key={i} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:'8px 14px', fontSize:11 }}>
                    <div style={{ color:'var(--fog)', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Zona {i+1}</div>
                    <div style={{ color:'var(--snow)', fontWeight:700 }}>{z.rw}m x {z.rh}m = {z.area}m2</div>
                  </div>
                ))}
                <div style={{ background:cuad.bg, border:`1px solid ${cuad.border}`, borderRadius:10, padding:'8px 14px', fontSize:11 }}>
                  <div style={{ color:'var(--fog)', fontSize:9, fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Densidad</div>
                  <div style={{ color:cuad.color, fontWeight:800, fontSize:16 }}>{densidad.toFixed(0)} m2/jug</div>
                  <div style={{ color:cuad.color, fontWeight:700, fontSize:12, marginTop:2 }}>{cuad.objetivo} - Int. {cuad.intensidad}</div>
                </div>
              </div>
            )
          })()}

          <TacticalBoard
            initialData={editBoardData}
            onZoneInfo={setZoneInfo}
            onSave={async (data) => {
              if (!boardName.trim()) { alert('Ponele un nombre a la tarea'); return }
              setSaving(true)
              try {
                const payload = {
                  nombre: boardName + (boardSubtarea ? ' > ' + boardSubtarea : ''),
                  ventana: boardVentana || null,
                  subtarea: boardSubtarea || null,
                  jugadores: Number(boardJugadores) || null,
                  tactical_diagram: JSON.stringify(data),
                  diagram_preview: data.preview,
                  largo: zoneInfo.length > 0 ? zoneInfo[0].rw : null,
                  ancho: zoneInfo.length > 0 ? zoneInfo[0].rh : null,
                }
                if (editBoardId) {
                  await fetch('/api/biblioteca', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: editBoardId, ...payload }) })
                } else {
                  await fetch('/api/biblioteca', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
                }
                setShowBoard(false); setEditBoardId(null); setEditBoardData(null); setBoardName(''); setBoardVentana(''); setBoardSubtarea(''); setBoardJugadores(''); setZoneInfo([]); await cargar()
              } finally { setSaving(false) }
            }}
            onClose={() => { setShowBoard(false); setEditBoardId(null); setEditBoardData(null); setBoardName(''); setBoardVentana(''); setBoardSubtarea(''); setBoardJugadores(''); setZoneInfo([]) }}
          />
        </div>
      )}

      {!showBoard && (<>
      <div style={{ marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:'Bebas Neue,sans-serif', fontSize:36, color:'var(--snow)', letterSpacing:'0.04em', marginBottom:4 }}>🎨 DISEÑADOR DE TAREAS</h2>
          <p style={{ fontSize:12, color:'var(--silver)' }}>Pizarra táctica + biblioteca · Se guarda automáticamente al crear sesiones</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="hover-scale" onClick={()=>{ setShowBoard(true); setEditBoardId(null); setEditBoardData(null); setBoardName(''); setBoardVentana(''); setBoardSubtarea(''); setBoardJugadores(''); setZoneInfo([]) }} className="btn-lime" style={{ padding:'10px 20px', fontSize:13 }}>
            🎨 Diseñar Tarea
          </button>
        </div>
      </div>

      {showForm && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:24, marginBottom:20 }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', marginBottom:16 }}>Nueva tarea en biblioteca</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:10, color:'var(--lime)', display:'block', marginBottom:4, textTransform:'uppercase' }}>Nombre de la tarea *</label>
              <input className="wp-input" type="text" placeholder="Ej: Rondo 4v4+2 en espacio reducido..." value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} style={{ width:'100%' }} />
            </div>
            {[
              {key:'ventana',label:'Tipo de tarea',placeholder:'Ej: Rondo'},
              {key:'jugadores',label:'Jugadores',placeholder:'Nº',type:'number'},
              {key:'series',label:'Series',placeholder:'Nº',type:'number'},
              {key:'minutos',label:'Min/serie',placeholder:'min',type:'number'},
              {key:'pausa',label:'Pausa (min)',placeholder:'min',type:'number'},
              {key:'largo',label:'Largo (m)',placeholder:'m',type:'number'},
              {key:'ancho',label:'Ancho (m)',placeholder:'m',type:'number'},
            ].map(f=>(
              <div key={f.key}>
                <label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:4, textTransform:'uppercase' }}>{f.label}</label>
                <input className="wp-input" type={f.type||'text'} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e=>setForm({...form,[f.key]:e.target.value})} style={{ width:'100%' }} />
              </div>
            ))}
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ fontSize:10, color:'var(--fog)', display:'block', marginBottom:4, textTransform:'uppercase' }}>Descripción / Notas</label>
              <input className="wp-input" type="text" placeholder="Descripción de la tarea, objetivos, consignas..." value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} style={{ width:'100%' }} />
            </div>
          </div>
          <button onClick={guardar} disabled={saving||!form.nombre} className="btn-lime" style={{ padding:'10px 24px', fontSize:13 }}>
            {saving ? 'Guardando...' : '✓ Guardar en Biblioteca'}
          </button>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        <input className="wp-input" type="text" placeholder="🔍 Buscar..." value={buscar} onChange={e=>setBuscar(e.target.value)} style={{ flex:1, minWidth:180 }} />
        <select className="wp-input" value={ventanaFilter} onChange={e=>setVentanaFilter(e.target.value)} style={{ appearance:'none', minWidth:140 }}>
          <option value="">Todas las tareas</option>
          {ventanas.map(v=><option key={v} value={v} style={{ background:'var(--ink2)' }}>{v}</option>)}
        </select>
        <div style={{ display:'flex', gap:4, background:'var(--ink2)', borderRadius:8, padding:3, border:'1px solid var(--mist)' }}>
          {([['tipo','↓ Por tipo'],['uso','↓ Más usadas'],['reciente','↓ Recientes']] as const).map(([k,l])=>(
            <button className="hover-scale" key={k} onClick={()=>setSortBy(k)} style={{ padding:'4px 10px', borderRadius:6, fontSize:10, fontWeight:600, cursor:'pointer', border:'none', background:sortBy===k?'var(--lime)':'transparent', color:sortBy===k?'var(--ink)':'var(--silver)' }}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
      ) : filtradas.length === 0 ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--silver)', background:'var(--ink2)', borderRadius:16 }}>
          {buscar ? 'Sin resultados para esa búsqueda.' : 'La biblioteca está vacía. Las tareas se guardan automáticamente al crear sesiones en el Calendario.'}
        </div>
      ) : sortBy !== 'tipo' ? (
        // Flat view for uso/reciente
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtradas.map((t:any) => <TareaCard key={t.id} t={t} />)}
        </div>
      ) : (
        // Grouped view: calculadora objectives first, then by ventana
        <div>
          {/* Calculator-based tasks grouped by objective */}
          {objetivosSorted.length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:800, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
                🧮 Tareas con calculadora
              </div>
              {objetivosSorted.map(obj => {
                const colores: Record<string,string> = { 'Fuerza':'#ef4444', 'Activación/Recuperación':'#f97316', 'Resistencia':'#3b82f6', 'Velocidad':'#a855f7' }
                return (
                  <div key={obj}>
                    <GroupHeader label={obj} color={colores[obj] ?? 'var(--lime)'} />
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {byObjetivo[obj].map((t:any) => <TareaCard key={t.id} t={t} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Non-calculator tasks grouped by ventana */}
          {ventanasSorted.length > 0 && (
            <div style={{ marginTop: objetivosSorted.length > 0 ? 24 : 0 }}>
              {objetivosSorted.length > 0 && (
                <div style={{ fontSize:10, fontWeight:800, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
                  📋 Otras tareas
                </div>
              )}
              {ventanasSorted.map(v => (
                <div key={v}>
                  <GroupHeader label={v} color="var(--lime)" />
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {byVentana[v].map((t:any) => <TareaCard key={t.id} t={t} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </>)}
    </div>
  )
}

function DeleteDataModal({ isGlobal, jugadorId, playerName, defaultFecha, onClose, onRefresh }: any) {
  const [fecha, setFecha] = useState(defaultFecha)
  const [tipo, setTipo] = useState<'wellness'|'rpe'|'ambos'>('ambos')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!fecha) return alert('Selecciona una fecha')
    if (!confirm(`¿Estás seguro de borrar ${tipo === 'ambos' ? 'Wellness y RPE' : tipo} del ${fecha}${isGlobal ? ' para todo el equipo' : ''}?`)) return
    
    setLoading(true)
    try {
      if (tipo === 'wellness' || tipo === 'ambos') {
        const url = `/api/wellness?fecha=${fecha}${!isGlobal && jugadorId ? `&jugador_id=${jugadorId}` : ''}`
        await fetch(url, { method: 'DELETE' })
      }
      if (tipo === 'rpe' || tipo === 'ambos') {
        const url = `/api/logs?fecha=${fecha}${!isGlobal && jugadorId ? `&jugador_id=${jugadorId}` : ''}`
        await fetch(url, { method: 'DELETE' })
      }
      onRefresh?.()
      onClose()
    } catch (e) {
      alert('Error borrando datos')
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'var(--ink)', width: '100%', maxWidth: 400, borderRadius: 24, padding: 24, border: '1px solid var(--mist)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'var(--ink2)', border: 'none', width: 32, height: 32, borderRadius: 16, color: 'var(--silver)', cursor: 'pointer', zIndex: 10 }}>✕</button>
        <h3 style={{ fontSize: 18, color: 'var(--snow)', marginBottom: 6, textAlign: 'center' }}>
          🗑️ Borrar Datos {isGlobal ? '(Equipo)' : `(${playerName})`}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--silver)', textAlign: 'center', marginBottom: 20 }}>
          Elimina registros cargados por error.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', marginBottom: 6 }}>Fecha</label>
          <input type="date" className="wp-input" style={{ width: '100%', padding: '10px 14px' }} value={fecha} onChange={e => setFecha(e.target.value)} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--silver)', textTransform: 'uppercase', marginBottom: 6 }}>¿Qué borrar?</label>
          <select className="wp-input" style={{ width: '100%', padding: '10px 14px' }} value={tipo} onChange={e => setTipo(e.target.value as any)}>
            <option value="ambos">Ambos (Wellness y RPE)</option>
            <option value="wellness">Solo Wellness</option>
            <option value="rpe">Solo RPE</option>
          </select>
        </div>

        <button onClick={handleDelete} disabled={loading} style={{ width: '100%', background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Borrando...' : 'Confirmar Borrado'}
        </button>
      </div>
    </div>
  )
}
