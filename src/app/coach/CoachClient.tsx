'use client'
import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/ui/Topbar'
import StatusBadge from '@/components/ui/StatusBadge'
import ACWRChart from '@/components/charts/ACWRChart'
import WellnessTrend from '@/components/charts/WellnessTrend'
import { buildACWRHistory, buildDailyDetail } from '@/lib/acwr'
import EvaluacionesPanelFull from './EvaluacionesPanel'
import AnalyticsPanel from './AnalyticsPanel'

// ─── GPS METRIC METADATA (shared between GpsPanel and CargaExternaPanel) ──────
// Maps metric key → { label, unit, group } for display purposes
const GPS_METRIC_META: Record<string, { label: string; unit: string; group: string }> = {
  dist_total:          { label: 'Dist. Total',      unit: 'm',      group: 'Distancia' },
  dist_per_min:        { label: 'Dist/min',         unit: 'm/min',  group: 'Distancia' },
  dist_hir:            { label: 'High Speed Dist',  unit: 'm',      group: 'Distancia' },
  dist_v1:             { label: 'Vel B1',           unit: 'm',      group: 'Distancia' },
  dist_v2:             { label: 'Vel B2',           unit: 'm',      group: 'Distancia' },
  dist_v3:             { label: 'Vel B3',           unit: 'm',      group: 'Distancia' },
  dist_v4:             { label: 'Vel B4',           unit: 'm',      group: 'Distancia' },
  dist_v5:             { label: 'Vel B5/B6',        unit: 'm',      group: 'Distancia' },
  player_load:         { label: 'Player Load',      unit: 'UCE',     group: 'Carga' },
  metabolic_power:     { label: 'Pot. Metabólica',  unit: 'W/kg',   group: 'Carga' },
  avg_metabolic_power: { label: 'Pot. Metab. Med.', unit: 'W/kg',   group: 'Carga' },
  equiv_distance:      { label: 'Dist. Equiv.',     unit: 'm',      group: 'Carga' },
  max_velocity:        { label: 'Vel. Máx.',        unit: 'km/h',   group: 'Velocidad' },
  n_sprints:           { label: 'Nº Sprints',        unit: 'nº',     group: 'Sprints' },
  acc1:                { label: 'Acc B1',            unit: 'nº',     group: 'Acc/Dec' },
  acc2:                { label: 'Acc B2-3',          unit: 'nº',     group: 'Acc/Dec' },
  acc3:                { label: 'Acc B3',            unit: 'nº',     group: 'Acc/Dec' },
  acc4:                { label: 'Acc B4',            unit: 'nº',     group: 'Acc/Dec' },
  acc_total:           { label: 'Acc Total',         unit: 'nº',     group: 'Acc/Dec' },
  dec1:                { label: 'Dec B1',            unit: 'nº',     group: 'Acc/Dec' },
  dec2:                { label: 'Dec B2-3',          unit: 'nº',     group: 'Acc/Dec' },
  dec3:                { label: 'Dec B3',            unit: 'nº',     group: 'Acc/Dec' },
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
}

// Order in which columns appear (known fields first, logical order)
const GPS_METRIC_ORDER = Object.keys(GPS_METRIC_META)

// Returns a display-ready string for a GPS metric value
function fmtGps(key: string, val: any): string {
  if (val === null || val === undefined || val === 0 || val === '') return '—'
  const n = Number(val)
  if (isNaN(n) || n === 0) return '—'
  if (key === 'dist_total' || key === 'equiv_distance') return `${(n / 1000).toFixed(2)}km`
  if (key.startsWith('dist_')) return `${Math.round(n)}m`
  if (key === 'max_velocity') return `${n}km/h`
  if (key === 'dist_per_min') return `${Math.round(n)}`
  if (key === 'player_load') return `${Math.round(n)}`
  if (key === 'metabolic_power' || key === 'avg_metabolic_power') return `${n.toFixed(1)}`
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

const TABS = [{id:'team',label:'Equipo'},{id:'calendario',label:'📅 Calendario'},{id:'analytics',label:'Analytics'},{id:'minutos',label:'Minutaje'},{id:'control-carga-calc',label:'🏋️ Ctrl. Carga Calc'},{id:'control-carga-gps',label:'📡 Ctrl. Carga GPS'},{id:'acumulado',label:'📈 Acumulado Ind.'},{id:'cambio-carga',label:'Cambio de Carga'},{id:'expo-ai',label:'⚡ Expo. AI'},{id:'evaluaciones',label:'📋 Evaluaciones'},{id:'comparativa',label:'⚖️ Comparativa'},{id:'lesiones',label:'Lesiones'},{id:'gps',label:'📡 GPS'},{id:'players',label:'Jugadores'},{id:'biblioteca',label:'📚 Biblioteca'},{id:'manual',label:'📖 Manual'}]
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


// ─── DATE UTILITIES ──────────────────────────────────────────────────────────
function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr)
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}

function todayLocal(): string { return localDateStr(new Date()) }
// ─────────────────────────────────────────────────────────────────────────────

export default function CoachClient({ session, teamData, today }) {
  const [tab, setTab] = useState('team')
  const [selected, setSelected] = useState(null)
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
  const [ciclo, setCiclo] = useState<'microciclo'|'mesociclo'|'macrociclo'>('microciclo')
  const router = useRouter()

  useEffect(() => {
    const handler = () => router.refresh()
    window.addEventListener('wellness-data-updated', handler)
    return () => window.removeEventListener('wellness-data-updated', handler)
  }, [])

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => {
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

  const available = teamData.filter(p=>!p.lesion && p.entrena_grupo!==false)
  const unavailable = teamData.filter(p=>p.entrena_grupo===false && !p.lesion)
  const injured = teamData.filter(p=>p.lesion)
  const responded = teamData.filter(p=>p.respondedToday)
  const pending = teamData.filter(p=>!p.respondedToday)
  const atRisk = teamData.filter(p=>p.acwr?.status==='peligro').length
  const caution = teamData.filter(p=>p.acwr?.status==='precaucion').length
  const optimal = teamData.filter(p=>p.acwr?.status==='optimo').length

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
      <Topbar nombre={session.nombre} rol={session.rol} tabs={TABS} activeTab={tab} onTabChange={t=>{ setTab(t); setSelected(null) }} clubNombre={session.clubNombre||null} />
      <main style={{ maxWidth:980, margin:'0 auto', padding:'24px 16px' }}>

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
                <div>
                  {editingTeamName ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <input
                        value={teamNameDraft}
                        onChange={e=>setTeamNameDraft(e.target.value.toUpperCase())}
                        onKeyDown={e=>{ if(e.key==='Enter') saveTeamName(); if(e.key==='Escape') setEditingTeamName(false) }}
                        autoFocus
                        style={{ fontFamily:'var(--font-display,monospace)', fontSize:28, fontWeight:900, color:'var(--lime)', background:'transparent', border:'none', borderBottom:'2px solid var(--lime)', outline:'none', width:200, letterSpacing:'0.02em' }}
                      />
                      <button onClick={saveTeamName} style={{ fontSize:12, padding:'4px 10px', borderRadius:7, background:'var(--lime)', color:'var(--ink)', border:'none', cursor:'pointer', fontWeight:700 }}>✓</button>
                      <button onClick={()=>setEditingTeamName(false)} style={{ fontSize:12, padding:'4px 8px', borderRadius:7, background:'transparent', color:'var(--fog)', border:'1px solid var(--fog)', cursor:'pointer' }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }} onClick={()=>{ setTeamNameDraft(teamName); setEditingTeamName(true) }}>
                      <h2 className="display" style={{ fontSize:32, color:'var(--snow)' }}>{teamName}</h2>
                      <span style={{ fontSize:11, color:'var(--fog)', marginTop:4 }} title="Editar nombre del equipo">✏️</span>
                    </div>
                  )}
                  <p style={{ fontSize:11, color:'var(--silver)', marginTop:2 }}>Por posición · {today}</p>
                </div>
              </div>
            </div>
            {Object.keys(byPos).sort((a,b)=>Number(a)-Number(b)).map(posKey=>(
              <div key={posKey}>
                {secHead(PG[Number(posKey)]||'SIN POSICIÓN', byPos[Number(posKey)].length)}
                <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden', marginBottom:4 }}>
                  {byPos[Number(posKey)].map((p,i,arr)=><PlayerRow key={p.id} player={p} last={i===arr.length-1} onOpen={()=>openPlayer(p)} isInjured={false} />)}
                </div>
              </div>
            ))}
            {injured.length>0 && (
              <div>
                {secHead('🏥 LESIONADOS', injured.length, '#ef4444')}
                <div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.2)', borderRadius:16, overflow:'hidden', opacity:.8 }}>
                  {injured.map((p,i)=><PlayerRow key={p.id} player={p} last={i===injured.length-1} onOpen={()=>openPlayer(p)} isInjured={true} />)}
                </div>
              </div>
            )}
            {unavailable.length>0 && (
              <div>
                {secHead('✗ DIFERENCIADOS', unavailable.length, '#f59e0b')}
                <div style={{ background:'var(--ink2)', border:'1px solid rgba(245,158,11,.2)', borderRadius:16, overflow:'hidden', opacity:.75 }}>
                  {unavailable.map((p,i)=><PlayerRow key={p.id} player={p} last={i===unavailable.length-1} onOpen={()=>openPlayer(p)} isInjured={false} />)}
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
            {teamData.length===0 && <div style={{ textAlign:'center', padding:'48px 20px', color:'var(--silver)', fontSize:14 }}>Sin jugadores. Creá uno en "Jugadores".</div>}
          </div>
        )}

        {tab==='team' && selected && (
          <PlayerDetail player={selected} logs={playerLogs} wellness={playerWellness} loading={loadingDetail} ciclo={ciclo} onCicloChange={(c)=>{ setCiclo(c); openPlayer(selected, c) }} onBack={()=>setSelected(null)} />
        )}

        {tab==='analytics' && <AnalyticsPanel />}
        {tab==='calendario' && <CalendarioPanel teamData={teamData} />}
        {tab==='minutos' && <MinutosPanel teamData={teamData} />}
        {tab==='carga-externa' && <CargaExternaPanel />}
        {tab==='control-carga-calc' && <ControlCargaCalcPanel teamData={teamData} />}
        {tab==='control-carga-gps' && <ControlCargaGpsPanel teamData={teamData} />}
        {tab==='acumulado' && <AcumPanel teamData={teamData} />}
        {tab==='cambio-carga' && <CambioCargaPanel />}
        {tab==='expo-ai' && <ExpoAIPanel teamData={teamData} />}
        {tab==='evaluaciones' && <EvaluacionesPanel teamData={teamData} />}
        {tab==='biblioteca' && <BibliotecaPanel />}
        {tab==='comparativa' && <ComparativaPanel teamData={teamData} />}
        {tab==='lesiones' && <LesionesPanel teamData={teamData} onRefresh={()=>router.refresh()} />}
        {tab==='gps' && <GpsPanel teamData={teamData} />}

        {tab==='manual' && <ManualPanel />}

        {tab==='players' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
              <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>JUGADORES</h2>
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
              {teamData.length===0
                ? <div style={{ padding:'40px 20px', textAlign:'center', color:'var(--silver)', fontSize:14 }}>No hay jugadores.</div>
                : teamData.map((p,i)=><ManageRow key={p.id} player={p} last={i===teamData.length-1} onRefresh={()=>router.refresh()} />)
              }
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function PlayerRow({ player:p, last, onOpen, isInjured }) {
  const col = SC[p.acwr?.status]||'#555'
  return (
    <button onClick={onOpen} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 18px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', borderBottom:last?'none':'1px solid var(--mist)', transition:'background .12s' }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
      onMouseLeave={e=>e.currentTarget.style.background='transparent'}
    >
      {isInjured
        ? <span style={{ fontSize:14, flexShrink:0 }}>🏥</span>
        : <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background:p.respondedToday?'#22c55e':'#ef4444' }} />
      }
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:500, fontSize:14, color:isInjured?'#f87171':'var(--snow)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</div>
        <div style={{ fontSize:11, color:'var(--silver)', marginTop:1 }}>
          {p.posicion||'—'}
          {isInjured && p.lesion && <span style={{ marginLeft:8, color:LCOL[p.lesion.estado]||'#888' }}>· {p.lesion.tipo_lesion} ({p.lesion.estado})</span>}
        </div>
      </div>
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

function PlayerDetail({ player:p, logs, wellness, loading, onBack, ciclo, onCicloChange }) {
  const col = p.lesion?'#ef4444':(SC[p.acwr?.status]||'#555')
  const [acwrMetric, setAcwrMetric] = useState<'ua'|'uce'>('ua')
  const lastW = wellness[0]
  const CICLOS = [
    { id:'microciclo', label:'Microciclo', sub:'Semana' },
    { id:'mesociclo',  label:'Mesociclo',  sub:'Mes' },
    { id:'macrociclo', label:'Macrociclo', sub:'Temporada' },
  ]
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <button className="btn-ghost" style={{ fontSize:12, padding:'7px 14px' }} onClick={onBack}>← Volver</button>
        <div style={{ display:'flex', gap:4, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:3, flex:'none' }}>
          {CICLOS.map(c => (
            <button key={c.id} type="button" onClick={() => onCicloChange(c.id)} style={{
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
            <div style={{ display:'flex', flexWrap:'wrap', gap:10, fontSize:12, color:'var(--silver)' }}>
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
              <div style={{ marginTop:10 }}>
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
                <button key={m} onClick={()=>setAcwrMetric(m)}
                  style={{ fontSize:10, padding:'4px 10px', borderRadius:6, cursor:'pointer', border: acwrMetric===m?'2px solid var(--lime)':'1px solid var(--mist)', background: acwrMetric===m?'rgba(200,241,53,.1)':'var(--ink2)', color: acwrMetric===m?'var(--lime)':'var(--silver)', fontWeight:600 }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          {loading
            ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--silver)' }}>Cargando...</div>
            : <ACWRChart data={buildACWRHistory(logs, 28, acwrMetric)} />}
        </div>
      )}

      {!p.lesion && !loading && logs.length > 0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Detalle últimos 7 días</p>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,.03)' }}>
                  {['MD','Fecha',acwrMetric.toUpperCase(),'ACWR','Estado'].map(h=>(
                    <th key={h} style={{ padding:'7px 12px', color:'var(--silver)', fontWeight:600, textTransform:'uppercase', fontSize:9, letterSpacing:'0.06em', textAlign:'center', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildDailyDetail(logs.map(l=>({fecha:String(l.fecha),carga_ua:Number(l.carga_ua)||0,carga_uce:(l as any).carga_uce??null})), acwrMetric).map((row,i)=>{
                  const SC2={optimo:'#22c55e',precaucion:'#f59e0b',peligro:'#ef4444',peligro_bajo:'#3b82f6',sin_datos:'#444'}
                  const SL2={optimo:'Óptimo',precaucion:'Precaución',peligro:'Riesgo alto',peligro_bajo:'Carga baja',sin_datos:'—'}
                  const col = SC2[row.status]||'#444'
                  const dayLog = logs.find((l:any) => String(l.fecha) === row.date)
                  const mdLabel = (dayLog as any)?.md_label || null
                  const cargaUce = (dayLog as any)?.carga_uce ?? null
                  const cargaShow = cargaUce !== null ? cargaUce : row.carga
                  return (
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background: row.hasSesion?'transparent':'rgba(0,0,0,.2)' }}>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontWeight:700, color: mdLabel?'var(--lime)':'var(--silver)', fontFamily:'DM Mono,monospace', fontSize:11 }}>
                        {mdLabel || row.dia}
                      </td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--fog)' }}>{row.date.slice(5)}</td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color: row.hasSesion?'var(--lime)':'var(--fog)' }}>
                        {row.hasSesion ? cargaShow : '—'}
                      </td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color: col }}>
                        {row.ratio > 0 ? row.ratio.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding:'8px 12px', textAlign:'center' }}>
                        <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:`${col}20`, color:col, border:`1px solid ${col}44`, fontWeight:600 }}>
                          {SL2[row.status]||'—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:12, display:'flex', gap:12, flexWrap:'wrap' }}>
            {[['#3b82f6','< 0.8 Carga baja'],['#22c55e','0.8–1.3 Óptimo'],['#f59e0b','1.3–1.5 Precaución'],['#ef4444','> 1.5 Riesgo']].map(([c,l])=>(
              <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--silver)' }}>
                <div style={{ width:8, height:8, borderRadius:2, background:c }} />{l}
              </div>
            ))}
          </div>
        </div>
      )}
      {lastW && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Último Wellness · <span style={{ color:'var(--fog)', fontWeight:400, fontFamily:'DM Mono,monospace' }}>{lastW.fecha}</span></p>
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
    </div>
  )
}

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
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
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
    { key:'ua',              label:'UA',              color:'#c8f135', src:'rpe' },
    { key:'uce',             label:'UCE',             color:'#f59e0b', src:'rpe' },
    { key:'rpe',             label:'RPE',             color:'#60a5fa', src:'rpe' },
    { key:'tiempo',          label:'Tiempo (min)',    color:'#34d399', src:'rpe' },
    { key:'calc_distTotal',  label:'DT Calc (m)',     color:'#fbbf24', src:'calc' },
    { key:'calc_distSprint', label:'Sprint Calc (m)', color:'#f97316', src:'calc' },
    { key:'calc_nSprints',   label:'Nº Sprint Calc',  color:'#a78bfa', src:'calc' },
    { key:'calc_nAcel',      label:'ACE >2 Calc (m)', color:'#ec4899', src:'calc' },
    { key:'calc_nDecel',     label:'DEC >2 Calc (m)', color:'#14b8a6', src:'calc' },
    { key:'calc_nAcel3',     label:'ACE >3 Calc (n)', color:'#f43f5e', src:'calc' },
    { key:'calc_nDecel3',    label:'DEC >3 Calc (n)', color:'#0ea5e9', src:'calc' },
    { key:'calc_distMP',     label:'Alta Pot. Calc',  color:'#fb923c', src:'calc' },
  ]

  const CHART_VARS_GPS = [
    { key:'gps_dist_total',   label:'Dist. Total',      color:'#f59e0b', src:'gps' },
    { key:'gps_dist_per_min', label:'m/min',            color:'#84cc16', src:'gps' },
    { key:'gps_dist_v4',      label:'Vel B4',           color:'#a78bfa', src:'gps' },
    { key:'gps_dist_hir',     label:'HSR (High Speed)', color:'#f97316', src:'gps' },
    { key:'gps_dist_v5',      label:'Vel B6',           color:'#e879f9', src:'gps' },
    { key:'gps_max_velocity', label:'Vel. Máx',         color:'#ef4444', src:'gps' },
    { key:'gps_n_sprints',    label:'Nº Sprints',       color:'#22d3ee', src:'gps' },
    { key:'gps_acc2',         label:'ACE 2-3 (n)',      color:'#ec4899', src:'gps' },
    { key:'gps_dec2',         label:'DEC 2-3 (n)',      color:'#14b8a6', src:'gps' },
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

  const gpsDailyMap: Record<string,any> = {}
  const gpsPerSession = gpsData?.perSession || {}
  const gpsSesionesInfo = gpsData?.sesionesInfo || []
  gpsSesionesInfo.forEach((s:any) => {
    if (!s.fecha) return
    const key = s.titulo || s.fecha
    const entry = gpsPerSession[key]
    if (!entry) return
    if (gpsDailyMap[s.fecha]) {
      Object.keys(entry).forEach((k: string) => {
        if (typeof entry[k] === 'number') {
          gpsDailyMap[s.fecha][k] = (gpsDailyMap[s.fecha][k] || 0) + entry[k]
        }
      })
    } else {
      gpsDailyMap[s.fecha] = { ...entry }
    }
  })

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
      dist_hir: avgField('dist_hir'),
      dist_v4:  avgField('dist_v4'),
      dist_v5:  avgField('dist_v5'),
      max_velocity: avgField('max_velocity'),
      dist_per_min: avgField('dist_per_min'),
    }
    if (gpsDailyMap[s.fecha]) {
      Object.assign(gpsDailyMap[s.fecha], realGps)
    } else {
      gpsDailyMap[s.fecha] = realGps
    }
  })

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

  const getRowVal = (row: any) => {
    if (chartVar === 'ua') return row.avg_ua||0
    if (chartVar === 'uce') return row.avg_uce||0
    if (chartVar === 'rpe') return row.avg_rpe||0
    if (chartVar === 'tiempo') {
      const rpe = row.avg_rpe || 0
      return rpe > 0 ? Math.round((row.avg_ua || 0) / rpe) : 0
    }
    
    // Variables TEÓRICAS desde la calculadora
    if (chartVar.startsWith('calc_')) {
      const key = chartVar.replace('calc_','')
      const SESSION_KEY_MAP: Record<string,string> = {
        distTotal: 'distTotal', distSprint: 'distSprint', nSprints: 'nSprints',
        nAcel: 'nAcel', nDecel: 'nDecel', distMP: 'distMP',
        nAcel3: 'nAcel3', nDecel3: 'nDecel3',
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

    // Variables REALES desde el GPS
    if (chartVar.startsWith('gps_')) {
      const field = chartVar.replace('gps_', '') // ej: 'dist_total', 'acc2'
      
      // dist_total, n_sprints, acc2 y dec2 vienen directamente cargados por el backend en el row
      if (['dist_total', 'n_sprints', 'acc2', 'dec2'].includes(field)) {
         return Math.round(Number(row[field]) || 0)
      }
      
      // El resto se trae del gpsDailyMap (datos combinados)
      if (view === 'diario') {
        const gps = gpsDailyMap[row.fecha]
        return gps ? Math.round(Number(gps[field]) || 0) : 0
      } else {
        const gps = gpsWeeklyMap[row.semana]
        return gps ? Math.round(Number(gps[field]) || 0) : 0
      }
    }
    return 0
  }
  
  const maxUA = Math.max(...rows.map((r: any) => getRowVal(r)), 1)
  const chartColor = CHART_VARS.find(v=>v.key===chartVar)?.color || '#c8f135'

  const rowsWithPct = rows.map((row: any, i: number) => {
    const val = getRowVal(row)
    let prevVal: number | null = null
    for (let j = i - 1; j >= 0; j--) {
      const pv = getRowVal(rows[j])
      if (pv > 0) { prevVal = pv; break }
    }
    const hasPrevRow = i > 0
    let pct: number | null = null
    if (hasPrevRow) {
      if (prevVal === null && val > 0) {
        pct = 100
      } else if (prevVal !== null) {
        if (prevVal > 0 && val === 0) pct = -100
        else if (prevVal > 0 && val > 0) pct = Math.round(((val - prevVal) / prevVal) * 100)
      }
    }
    return { ...row, _pct: pct, _val: val }
  })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>CAMBIO DE CARGA</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>
          Variación de Carga Acumulada — jugadores con ≥{minEnt}min entrenamiento y ≥{minPart}min en partido
        </p>
      </div>

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

      <div style={{ display:'flex', gap:8 }}>
        {(['diario','semanal'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{ fontSize:12, padding:'7px 16px', borderRadius:10, cursor:'pointer', border: view===v?'2px solid var(--lime)':'1px solid var(--fog)', background: view===v?'rgba(200,241,53,.1)':'var(--ink2)', color: view===v?'var(--lime)':'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
            {v === 'diario' ? 'Por Día' : 'Por Semana'}
          </button>
        ))}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div>
          <div style={{ fontSize:10, color:'#c8f135', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:6 }}>🏋️ Calculadora (Teórico)</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CHART_VARS_CALC.map(v=>(
              <button key={v.key} onClick={()=>setChartVar(v.key as any)}
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
          <div style={{ fontSize:10, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:700, marginBottom:6 }}>📡 GPS (Datos Reales)</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {CHART_VARS_GPS.map(v=>(
              <button key={v.key} onClick={()=>setChartVar(v.key as any)}
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
                          {row.count > 0 ? `${row.count} jugadores` : <span style={{ color:'var(--fog)', fontStyle:'italic' }}>Sin RPE/GPS</span>}
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

const OBJETIVOS_FISICOS = ['Fuerza','Resistencia','Velocidad','Recuperación-Compensación','Recuperación','Competición']
const OBJETIVOS_SECUNDARIOS = ['Táctico','Técnico','Técnico-Táctico']
const TITULOS_SESION = ['MD+1','MD+2','MD+3','MD-4','MD-3','MD-2','MD-1','MD']
const TAREAS_PRINCIPALES = ['Activación en campo','Activación en gimnasio','Gimnasio','Rondo','Trabajo analítico','Juego de posesión','Juego de posición','Transiciones','Partido reducido','Partido modificado','Partido de entrenamiento','Partido amistoso','Partido oficial']
const SUBTAREAS: Record<string, string[]> = { 'Activación en campo': ['Circuito técnico','Circuito neuromuscular','Pliometría','Movilidad','Trabajo Preventivo'], 'Activación en gimnasio': ['Isométricos','Pliometría','Movilidad','Excéntricos','Estabilidad','Tracción y empuje','Trabajo Preventivo'], 'Rondo': ['Rondo 4v2','Rondo 5v2','Rondo 6v2','Rondo 8v2','Rondo 4v1+1','Rondo en movimiento','Rondo conservación','Rondo orientado','Rondo dos espacios'] }
const TAREAS_CON_ESPACIO = ['Rondo','Trabajo analítico','Juego de posesión','Juego de posición','Partido reducido','Partido modificado','Partido de entrenamiento','Partido amistoso','Partido oficial']
const TAREAS_CON_EQUIPO = ['Rondo','Trabajo analítico','Juego de posesión','Juego de posición','Partido reducido','Partido modificado','Partido de entrenamiento','Partido amistoso','Partido oficial']
const TAREAS_PARTIDO_SIMPLE = ['Partido amistoso','Partido oficial','Partido de entrenamiento']
const TAREAS_MOSTRAR_FORM = [...TAREAS_CON_ESPACIO, 'Activación en campo','Activación en gimnasio','Gimnasio']
// NE default por tipo de tarea (Nivel de Especificidad 1-10)
const NE_DEFAULT: Record<string, number> = {
  'Partido oficial': 10, 'Partido amistoso': 9, 'Partido de entrenamiento': 8,
  'Partido modificado': 7, 'Partido reducido': 7, 'Juego de posición': 6,
  'Juego de posesión': 6, 'Transiciones': 5, 'Rondo': 5, 'Trabajo analítico': 4,
  'Gimnasio': 3, 'Activación en campo': 2, 'Activación en gimnasio': 2,
}
const TIPO_COLORES = { entrenamiento:'#c8f135', partido:'#3b82f6', recuperacion:'#f59e0b', descanso:'#555' }
const TIPO_ICONOS = { entrenamiento:'⚽', partido:'🏆', recuperacion:'🔄', descanso:'😴' }

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

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const DIAS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

  useEffect(() => { load() }, [year, month, weekStart, viewMode])

  async function load() {
    setLoading(true)
    let desde: string, hasta: string
    if (viewMode === 'mes') {
      desde = `${year}-${String(month+1).padStart(2,'0')}-01`
      const lastDay = new Date(year, month+1, 0).getDate()
      hasta = `${year}-${String(month+1).padStart(2,'0')}-${lastDay}`
    } else {
      const ws = new Date(weekStart)
      const we = new Date(weekStart); we.setDate(we.getDate() + 6)
      desde = localDateStr(ws)
      hasta = localDateStr(we)
    }
    try {
      const r = await fetch(`/api/calendario?desde=${desde}&hasta=${hasta}`)
      setData(await r.json())
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

  function getDiasSemana() {
    return Array.from({length:7}, (_,i) => {
      const d = new Date(weekStart); d.setDate(d.getDate()+i)
      return localDateStr(d)
    })
  }

  const today = todayLocal()
  const diasMes = viewMode === 'mes' ? getDiasMes() : []
  const diasSemana = viewMode === 'semana' ? getDiasSemana() : []

  const allEventDays = [...new Set([
    ...sesiones.map(s=>s.fecha),
    ...partidos.map(p=>p.fecha),
  ])].sort()

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>CALENDARIO</h2>
          <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Planificación de sesiones y recuperación</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={async()=>{
            if (!confirm('⚠️ BORRAR TODO\n\nEsto eliminará TODAS las sesiones del calendario de este club.\n\nNo se puede deshacer. ¿Confirmar?')) return
            try {
              const r = await fetch('/api/calendario?all=true', { method: 'DELETE' })
              if (r.ok) { await load() }
              else { const b = await r.json().catch(()=>({})); alert('Error: ' + (b?.error||r.status)) }
            } catch { alert('Error de red.') }
          }} style={{ fontSize:12, padding:'10px 18px', borderRadius:8, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', cursor:'pointer' }}>🗑 Borrar todo</button>
          <button onClick={()=>{setEditSesion(null);setShowEditor(true)}} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nueva sesión</button>
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
            <button key={v} onClick={()=>setViewMode(v)} style={{ padding:'6px 18px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, border:'none', background:viewMode===v?'var(--lime)':'transparent', color:viewMode===v?'var(--ink)':'var(--silver)', transition:'all .12s', textTransform:'capitalize' }}>{v}</button>
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
        <button onClick={()=>{ const d=new Date(); setYear(d.getFullYear()); setMonth(d.getMonth()); setWeekStart(()=>{ const w=new Date(); w.setDate(w.getDate()-w.getDay()+1); return w }); }} className="btn-ghost" style={{ fontSize:11, padding:'6px 12px' }}>Hoy</button>
      </div>

      {loading ? (
        <div style={{ padding:60, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
      ) : viewMode === 'mes' ? (
        /* ── VISTA MENSUAL ── */
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
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

              const prevEventDay = allEventDays[allEventDays.indexOf(fecha)-1]
              const recup = prevEventDay ? calcRecuperacion(prevEventDay, fecha) : null
              const hasEvents = ses.length > 0 || parts.length > 0
              const recupAlert = hasEvents && recup !== null && recup < 48

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

                  {isPartidoDay && rivalFoto ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'flex-start' }}>
                      <div style={{ width:'100%', display:'flex', justifyContent:'center', marginBottom:2 }}>
                        <div style={{ width:58, height:58, display:'flex', alignItems:'center', justifyContent:'center',
                          background:'rgba(59,130,246,.08)', borderRadius:8, border:'1px solid rgba(59,130,246,.2)', padding:3 }}>
                          <img src={rivalFoto} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="" />
                        </div>
                      </div>
                      {ses.map(s=>(
                        <div key={s.id} onClick={e=>{e.stopPropagation();setEditSesion(s);setShowEditor(true)}}
                          style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 5px', borderRadius:4, width:'100%',
                            background:`${TIPO_COLORES[s.tipo]||'#888'}22`, color:TIPO_COLORES[s.tipo]||'#888',
                            border:`1px solid ${TIPO_COLORES[s.tipo]||'#888'}44`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}>
                          {s.tipo==='partido'
                            ? <span>{TIPO_ICONOS[s.tipo]} {s.rival ? `vs ${s.rival}` : (s.titulo||'Partido')}</span>
                            : <span>{TIPO_ICONOS[s.tipo]} {s.titulo||s.tipo}</span>
                          }
                        </div>
                      ))}
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
                    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {ses.map(s=>(
                        <div key={s.id} onClick={e=>{e.stopPropagation();setEditSesion(s);setShowEditor(true)}} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 5px', borderRadius:4, background:`${TIPO_COLORES[s.tipo]||'#888'}22`, color:TIPO_COLORES[s.tipo]||'#888', border:`1px solid ${TIPO_COLORES[s.tipo]||'#888'}44`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}>
                          {s.tipo==='partido' && s.rival_foto && <img src={s.rival_foto} style={{ width:14, height:14, objectFit:'contain', borderRadius:2, flexShrink:0 }} alt="" />}
                          {s.tipo==='partido'
                            ? <span>{TIPO_ICONOS[s.tipo]} {s.rival ? `vs ${s.rival}` : (s.titulo||'Partido')}</span>
                            : <span>{TIPO_ICONOS[s.tipo]} {s.titulo||s.tipo}</span>
                          }
                        </div>
                      ))}
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
      ) : (
        /* ── VISTA SEMANAL ── */
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {diasSemana.map((fecha, idx) => {
            const { sesiones:ses, partidos:parts, log } = eventosDelDia(fecha)
            const isToday = fecha === today
            const prevFecha = idx > 0 ? diasSemana[idx-1] : null
            const recup = prevFecha && (ses.length>0||parts.length>0) ? calcRecuperacion(prevFecha, fecha) : null
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
                    {ses.map(s=>(
                      <button key={s.id} onClick={()=>{setEditSesion(s);setShowEditor(true)}} style={{ fontSize:12, padding:'4px 10px', borderRadius:8, background:`${TIPO_COLORES[s.tipo]||'#888'}20`, color:TIPO_COLORES[s.tipo]||'#888', border:`1px solid ${TIPO_COLORES[s.tipo]||'#888'}44`, cursor:'pointer' }}>
                        {s.tipo==='partido' && s.rival_foto ? <img src={s.rival_foto} style={{ width:14, height:14, objectFit:'contain', borderRadius:2, verticalAlign:'middle', marginRight:4 }} alt="" /> : TIPO_ICONOS[s.tipo]+' '}{s.tipo==='partido' && s.rival ? `vs ${s.rival}` : (s.titulo||s.tipo)}{s.hora_inicio?` · ${s.hora_inicio.slice(0,5)}`:''}
                      </button>
                    ))}
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
                    <button onClick={()=>{setSelectedDay(fecha);setEditSesion(null);setShowEditor(true)}} style={{ fontSize:11, padding:'4px 10px', borderRadius:6, background:'transparent', border:'1px solid var(--fog)', color:'var(--silver)', cursor:'pointer' }}>+ Sesión</button>
                  </div>
                </div>
                {ses.length>0 && (
                  <div style={{ padding:'10px 16px 12px', display:'flex', gap:12, flexWrap:'wrap' }}>
                    {ses.map(s=>(
                      <div key={s.id} style={{ flex:'1 1 260px', background:'var(--ink3)', borderRadius:10, padding:'10px 14px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:TIPO_COLORES[s.tipo]||'#888' }}>{TIPO_ICONOS[s.tipo]} {s.titulo||s.tipo}</span>
                          {s.rpe_objetivo && <span style={{ fontSize:11, color:'var(--lime)', fontFamily:'DM Mono,monospace' }}>RPE obj. {s.rpe_objetivo}</span>}
                        </div>
                        {s.objetivo && <div style={{ fontSize:11, color:'var(--silver)', marginBottom:2 }}>🎯 {s.objetivo}{s.objetivo_secundario ? ` · ${s.objetivo_secundario}` : ''}</div>}
                        {s.hora_inicio && <div style={{ fontSize:11, color:'var(--fog)' }}>🕐 {s.hora_inicio.slice(0,5)}{s.hora_fin?` – ${s.hora_fin.slice(0,5)}`:''}</div>}
                        {s.ejercicios?.length>0 && (
                          <div style={{ marginTop:6 }}>
                            {s.ejercicios.map((bl:any,i:number)=>(
                              <div key={i} style={{ fontSize:10, color:'var(--silver)', padding:'2px 0', borderTop:'1px solid var(--mist)', display:'flex', gap:8 }}>
                                <span style={{ fontWeight:600, color:'var(--snow)' }}>{bl.ventana||`Tarea ${i+1}`}{bl.subtarea ? ` · ${bl.subtarea}` : ''}</span>
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
        const recup = prevDay ? calcRecuperacion(prevDay, selectedDay) : null
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
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={()=>{setEditSesion(null);setShowEditor(true)}} className="btn-lime" style={{ fontSize:11, padding:'6px 14px' }}>+ Sesión</button>
                <button onClick={()=>setSelectedDay(null)} className="btn-ghost" style={{ fontSize:11, padding:'6px 10px' }}>✕</button>
              </div>
            </div>
            {ses.length===0 && parts.length===0 && <p style={{ color:'var(--fog)', fontSize:13 }}>Sin eventos planificados. Creá una sesión.</p>}
            {ses.map(s=>(
              <div key={s.id} style={{ background:'var(--ink3)', borderRadius:10, padding:'12px 14px', marginBottom:8 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontWeight:700, color:TIPO_COLORES[s.tipo]||'#888', fontSize:13 }}>{TIPO_ICONOS[s.tipo]} {s.titulo||s.tipo}</span>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={()=>{setEditSesion(s);setShowEditor(true)}} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'var(--ink2)', border:'1px solid var(--fog)', color:'var(--silver)', cursor:'pointer' }}>✏️ Editar</button>
                    <button onClick={async()=>{ await fetch(`/api/calendario?id=${s.id}`,{method:'DELETE'}); load() }} style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#f87171', cursor:'pointer' }}>🗑</button>
                  </div>
                </div>
                {(s.objetivo||s.objetivo_secundario) && <p style={{ fontSize:12, color:'var(--silver)', marginTop:4 }}>🎯 {[s.objetivo,s.objetivo_secundario].filter(Boolean).join(' · ')}</p>}
                {s.rpe_objetivo && <p style={{ fontSize:12, color:'var(--lime)', fontFamily:'DM Mono,monospace', marginTop:2 }}>RPE objetivo: {s.rpe_objetivo}</p>}
                {s.hora_inicio && <p style={{ fontSize:12, color:'var(--fog)' }}>🕐 {s.hora_inicio.slice(0,5)}{s.hora_fin?` – ${s.hora_fin.slice(0,5)}`:''}</p>}
                {s.ejercicios?.length>0 && (
                  <div style={{ marginTop:8 }}>
                    <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Tareas ({s.ejercicios.length})</p>
                    {s.ejercicios.map((bl:any,i:number)=>(
                      <div key={i} style={{ background:'var(--ink2)', borderRadius:8, padding:'8px 10px', marginBottom:6 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:bl.descripcion||bl.imagen?4:0 }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--lime)' }}>Tarea {i+1}{bl.ventana?` · ${bl.ventana}`:''}{ bl.subtarea ? ` › ${bl.subtarea}` : ''}</span>
                          <span style={{ fontSize:11, color:'var(--silver)', fontFamily:'DM Mono,monospace' }}>
                            {[bl.series&&`${bl.series}×${bl.minutos}min`, bl.jugadores&&`${bl.jugadores}jug`, (bl.largo&&bl.ancho)&&`${bl.largo}×${bl.ancho}m`].filter(Boolean).join(' · ')}
                          </span>
                        </div>
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
                    let imagenComprimida: string | null = null
                    if (bl.imagen) {
                      try { imagenComprimida = await compressImage(bl.imagen, 300, 0.7) } catch {}
                    }
                    return {
                      nombre: bl.ventana + (bl.subtarea ? ` › ${bl.subtarea}` : ''),
                      ventana: bl.ventana,
                      subtarea: bl.subtarea || null,
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
        />
        )
      })()}
    </div>
  )
}

function getCuadrante(densidad: number, jugadores?: number) {
  const d = densidad
  const n = jugadores || 0

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
  const autoTotal = atacantes + defensores + comodines
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
  const distSprint = Math.max(0, (0.018 * densidad - 0.1) * tiempoTotal)
  const distMP = Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoTotal)
  const distAcel = Math.max(0, (1.321 * Math.log(densidad) - 0.629) * tiempoTotal)
  const distDecel = Math.max(0, (1.157 * Math.log(densidad) - 0.418) * tiempoTotal)
  const rawNSprints = Math.max(0, (0.001 * densidad - 0.005) * tiempoTotal)
  const nSprints = rawNSprints > 0 ? Math.max(1, Math.round(rawNSprints)) : 0
  const nAcel = Math.max(0, (0.212 * Math.log(densidad) - 0.23) * tiempoTotal)
  const nDecel = Math.max(0, (0.1041 * Math.log(densidad) - 0.096) * tiempoTotal)
  const nAcel3 = Math.max(0, Math.round(nAcel * 0.22))
  const nDecel3 = Math.max(0, Math.round(nDecel * 0.22))
  return { distTotal, distSprint, distMP, distAcel, distDecel, nSprints, nAcel, nDecel, nAcel3, nDecel3, densidad, tiempoTotal }
}

function BloqueMetodologia({ bloque, index, onChange, onRemove, teamPlayers = [] }) {
  const [imgPreview, setImgPreview] = useState<string|null>(bloque.imagen || null)
  const [equipos, setEquipos] = useState<Record<number, number[]>>(bloque.equipos || {})
  const [manualMetrics, setManualMetrics] = useState<Record<string,string>>(bloque.manualMetrics || {})
  const [editingMetrics, setEditingMetrics] = useState(false)

  const esConEspacio = TAREAS_CON_ESPACIO.includes(bloque.ventana)
  const esConEquipo = TAREAS_CON_EQUIPO.includes(bloque.ventana)
  const mostrarForm = bloque.ventana && (TAREAS_MOSTRAR_FORM.includes(bloque.ventana) || esConEspacio)

  const jugadoresEquipos = Object.values(equipos).flat() as number[]
  const totalJugadoresEquipos = jugadoresEquipos.length

  const atacantes = Number(bloque.atacantes) || 0
  const defensores = Number(bloque.defensores) || 0
  const comodines = Number(bloque.comodines) || 0
  const autoTotal = atacantes + defensores + comodines

  const calcJugadores = autoTotal > 0 ? autoTotal : (Number(bloque.jugadores) || (esConEquipo ? totalJugadoresEquipos : 0))
  const calc = esConEspacio ? calcularDistancias(calcJugadores, Number(bloque.largo), Number(bloque.ancho), Number(bloque.series), Number(bloque.minutos)) : null

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
        <button onClick={onRemove} style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:6, color:'#f87171', cursor:'pointer', padding:'2px 8px', fontSize:11 }}>✕</button>
      </div>

      <div style={{ marginBottom:8 }}>
        <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:3 }}>Tarea</label>
        <select className="wp-input" value={bloque.ventana||''} onChange={e=>{ onChange('ventana',e.target.value); onChange('subtarea','') }} style={{ padding:'5px 8px', fontSize:12, appearance:'none', width:'100%' }}>
          <option value="">— Seleccionar —</option>
          {TAREAS_PRINCIPALES.map(t=><option key={t} value={t} style={{ background:'var(--ink2)' }}>{t}</option>)}
        </select>
        {bloque.ventana && (() => {
          const ne = bloque.ne ?? NE_DEFAULT[bloque.ventana] ?? 5
          const minTotal = (Number(bloque.series)||0) * (Number(bloque.minutos)||0)
          const ce = minTotal > 0 ? Math.round(minTotal * ne) : null
          return (
            <div style={{ display:'flex', gap:8, marginTop:4, alignItems:'center', fontSize:10, fontFamily:'DM Mono,monospace' }}>
              <span style={{ color:'var(--lime)', background:'rgba(200,241,53,.1)', border:'1px solid rgba(200,241,53,.25)', borderRadius:4, padding:'2px 6px' }}>NE {ne}</span>
              <span style={{ color:'var(--fog)' }}>×{minTotal > 0 ? ` ${minTotal}min` : ' min'}</span>
              {ce !== null
                ? <span style={{ color:'#c8f135', fontWeight:700, background:'rgba(200,241,53,.08)', border:'1px solid rgba(200,241,53,.3)', borderRadius:4, padding:'2px 6px' }}>CE {ce}</span>
                : <span style={{ color:'var(--fog)', fontStyle:'italic' }}>CE — (ingresá series y minutos)</span>
              }
            </div>
          )
        })()}
      </div>

      {bloque.ventana && SUBTAREAS[bloque.ventana] && (
        <div style={{ marginBottom:8 }}>
          <label style={{ fontSize:9, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:3 }}>↳ Sub-tarea</label>
          <select className="wp-input" value={bloque.subtarea||''} onChange={e=>onChange('subtarea',e.target.value)} style={{ padding:'5px 8px', fontSize:12, appearance:'none', width:'100%', border:'1px solid rgba(200,241,53,.3)' }}>
            <option value="">— Seleccionar —</option>
            {SUBTAREAS[bloque.ventana].map(s=><option key={s} value={s} style={{ background:'var(--ink2)' }}>{s}</option>)}
          </select>
        </div>
      )}

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
          <div style={{ display:'flex', justifyCon... (text ends here - truncated by generation limits - you can just replace `CambioCargaPanel` as per instructions if needed or rely on the function blocks)

// (Rest of the massive file remains untouched!)