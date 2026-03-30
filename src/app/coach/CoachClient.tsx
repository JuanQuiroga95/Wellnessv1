'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/ui/Topbar'
import StatusBadge from '@/components/ui/StatusBadge'
import ACWRChart from '@/components/charts/ACWRChart'
import WellnessTrend from '@/components/charts/WellnessTrend'
import { buildACWRHistory, buildDailyDetail } from '@/lib/acwr'
import AnalyticsPanel from './AnalyticsPanel'


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

const TABS = [{id:'team',label:'Equipo'},{id:'calendario',label:'📅 Calendario'},{id:'analytics',label:'Analytics'},{id:'minutos',label:'Minutaje'},{id:'media-equipo',label:'Media Equipo'},{id:'cambio-carga',label:'Cambio de Carga'},{id:'lesiones',label:'Lesiones'},{id:'players',label:'Jugadores'}]
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

export default function CoachClient({ session, teamData, today }) {
  const [tab, setTab] = useState('team')
  const [selected, setSelected] = useState(null)
  const [playerLogs, setPlayerLogs] = useState([])
  const [playerWellness, setPlayerWellness] = useState([])
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [ciclo, setCiclo] = useState('microciclo')
  const [clubLogo, setClubLogo] = useState<string|null>(null)
  const [logoSaving, setLogoSaving] = useState<'idle'|'saving'|'ok'|'error'>('idle')
  const [teamName, setTeamName] = useState<string>('PLANTEL')
  const [editingTeamName, setEditingTeamName] = useState(false)
  const [teamNameDraft, setTeamNameDraft] = useState<string>('PLANTEL')
  const router = useRouter()

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
  const CICLO_WELLNESS_DAYS = { microciclo:7, mesociclo:28, macrociclo:90 }

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
                    <div style={{ width:52, height:52, borderRadius:10, overflow:'hidden', background:'var(--ink3)', border:`2px solid ${logoSaving==='error'?'#ef4444':logoSaving==='ok'?'var(--lime)':clubLogo?'var(--lime)':'var(--fog)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'border-color .15s' }}>
                      {logoSaving==='saving' 
                        ? <span style={{ fontSize:14, animation:'spin 1s linear infinite' }}>⏳</span>
                        : clubLogo ? <img src={clubLogo} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} alt="escudo"/> : <span style={{ fontSize:22 }}>🛡️</span>}
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
              <button className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }} onClick={async()=>{ await fetch('/api/seed/demo',{method:'POST'}); router.refresh() }}>+ Datos demo</button>
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
        {tab==='media-equipo' && <MediaEquipoPanel />}
        {tab==='cambio-carga' && <CambioCargaPanel />}
        {tab==='lesiones' && <LesionesPanel teamData={teamData} onRefresh={()=>router.refresh()} />}

        {tab==='players' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>JUGADORES</h2>
              <button className="btn-lime" onClick={()=>setShowNew(true)} style={{ fontSize:13, padding:'10px 20px' }}>+ Nuevo jugador</button>
            </div>
            <CoachEmailSettings />
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
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Evolución ACWR — 28 días</p>
          {loading
            ? <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--silver)' }}>Cargando...</div>
            : <ACWRChart data={buildACWRHistory(logs)} />}
        </div>
      )}

      {!p.lesion && !loading && logs.length > 0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Detalle últimos 7 días</p>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'rgba(255,255,255,.03)' }}>
                  {['Día','Fecha','Carga UA','ACWR','Estado'].map(h=>(
                    <th key={h} style={{ padding:'7px 12px', color:'var(--silver)', fontWeight:600, textTransform:'uppercase', fontSize:9, letterSpacing:'0.06em', textAlign:'center', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildDailyDetail(logs.map(l=>({fecha:String(l.fecha),carga_ua:Number(l.carga_ua)||0}))).map((row,i)=>{
                  const SC2={optimo:'#22c55e',precaucion:'#f59e0b',peligro:'#ef4444',peligro_bajo:'#3b82f6',sin_datos:'#444'}
                  const SL2={optimo:'Óptimo',precaucion:'Precaución',peligro:'Riesgo alto',peligro_bajo:'Carga baja',sin_datos:'—'}
                  const col = SC2[row.status]||'#444'
                  return (
                    <tr key={i} style={{ borderTop:'1px solid var(--mist)', background: row.hasSesion?'transparent':'rgba(0,0,0,.2)' }}>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontWeight:600, color:'var(--silver)' }}>{row.dia}</td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--fog)' }}>{row.date.slice(5)}</td>
                      <td style={{ padding:'8px 12px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color: row.hasSesion?'var(--lime)':'var(--fog)' }}>
                        {row.hasSesion ? row.carga : '—'}
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
            {lastW.entrena_grupo===false && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.2)' }}>✗ No entrena con grupo</span>}
            {lastW.fue_gimnasio && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(200,241,53,.08)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.2)' }}>🏋 Fue al gimnasio</span>}
            {lastW.grupos_musculares && <span style={{ fontSize:11, color:'var(--silver)' }}>💪 {lastW.grupos_musculares}</span>}
          </div>
        </div>
      )}
      {wellness.length>1 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Tendencia Wellness</p>
          <WellnessTrend data={wellness} />
        </div>
      )}
      {logs.length>0 && (
        <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>RPE — Últimas sesiones</p>
          <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:90 }}>
            {[...logs].reverse().slice(0,12).map((log,i) => {
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
          {[...logs].reverse().slice(0,8).map((l,i)=>(<CoachSessionRow key={i} log={l} />))}
        </div>
      )}
    </div>
  )
}

function CambioCargaPanel() {
  const now = new Date()
  const defaultDesde = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0]
  const [desde, setDesde] = useState(defaultDesde)
  const [hasta, setHasta] = useState(now.toISOString().split('T')[0])
  const [minEnt, setMinEnt] = useState(60)
  const [minPart, setMinPart] = useState(0)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'diario'|'semanal'>('diario')

  useEffect(() => { load() }, [desde, hasta, minEnt, minPart])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`/api/cambio-carga?desde=${desde}&hasta=${hasta}&minEntrenamiento=${minEnt}&minPartido=${minPart}`)
      setData(await r.json())
    } finally { setLoading(false) }
  }

  const daily = data?.daily || []
  const weekly = data?.weekly || []
  const rows = view === 'diario' ? daily : weekly

  const pctColor = (pct: number | null) => {
    if (pct === null) return 'var(--silver)'
    if (pct > 10) return '#ef4444'
    if (pct > 0) return '#f59e0b'
    if (pct < -10) return '#60a5fa'
    return '#22c55e'
  }

  const pctBg = (pct: number | null) => {
    if (pct === null) return 'transparent'
    if (pct > 10) return 'rgba(239,68,68,.1)'
    if (pct > 0) return 'rgba(245,158,11,.1)'
    if (pct < -10) return 'rgba(96,165,250,.1)'
    return 'rgba(34,197,94,.1)'
  }

  const maxUA = Math.max(...rows.map((r: any) => r.avg_ua), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>CAMBIO DE CARGA</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>
          Variación de UA acumulada — jugadores con ≥{minEnt}min entrenamiento y ≥{minPart}min en partido
        </p>
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
          <button key={v} onClick={()=>setView(v)} style={{ fontSize:12, padding:'7px 16px', borderRadius:10, cursor:'pointer', border: view===v?'2px solid var(--lime)':'1px solid var(--fog)', background: view===v?'rgba(200,241,53,.1)':'var(--ink2)', color: view===v?'var(--lime)':'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
            {v === 'diario' ? 'Por Día' : 'Por Semana'}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', paddingLeft:4 }}>
        {[['#22c55e','Carga baja o estable (≤0%)'],['#f59e0b','Aumento moderado (1–10%)'],['#ef4444','Aumento alto (>10%)'],['#60a5fa','Reducción notable (<-10%)']].map(([c,l])=>(
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
              {rows.length >= 2 && (() => {
                const last = rows[rows.length - 1]
                const prev = rows[rows.length - 2]
                const pct = prev.avg_ua > 0 ? Math.round(((last.avg_ua - prev.avg_ua) / prev.avg_ua) * 100) : null
                return (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:10 }}>
                    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Último promedio UA</div>
                      <div className="display" style={{ fontSize:36, color:'var(--snow)', lineHeight:1 }}>{last.avg_ua}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>{view==='diario' ? last.fecha : last.label}</div>
                    </div>
                    <div style={{ background:pctBg(pct), border:`1px solid ${pctColor(pct)}44`, borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Cambio vs anterior</div>
                      <div className="display" style={{ fontSize:36, color:pctColor(pct), lineHeight:1 }}>{pct !== null ? `${pct > 0 ? '+' : ''}${pct}%` : '—'}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>{prev.avg_ua} → {last.avg_ua} UA</div>
                    </div>
                    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Jugadores calificados</div>
                      <div className="display" style={{ fontSize:36, color:'var(--lime)', lineHeight:1 }}>{data?.qualifyingCount || 0}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>con ≥{minPart}min en partido</div>
                    </div>
                    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, textAlign:'center' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{view==='diario' ? 'Días' : 'Semanas'} con datos</div>
                      <div className="display" style={{ fontSize:36, color:'var(--snow)', lineHeight:1 }}>{rows.length}</div>
                      <div style={{ fontSize:11, color:'var(--silver)', marginTop:4 }}>{desde} – {hasta}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Bar chart */}
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:'16px 18px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:14 }}>Promedio UA — {view === 'diario' ? 'por día' : 'por semana'}</p>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:140, overflowX:'auto', paddingBottom:4 }}>
                  {rows.map((row: any, i: number) => {
                    const h = Math.round((row.avg_ua / maxUA) * 110)
                    const col = pctColor(row.pct_change)
                    const label = view === 'diario'
                      ? row.fecha.slice(5) // MM-DD
                      : row.semana.replace(/\d{4}-/, '') // S01
                    return (
                      <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, minWidth:view==='diario'?28:48, flex:'1 0 auto' }}>
                        <span style={{ fontSize:9, color:col, fontFamily:'DM Mono,monospace', fontWeight:700, whiteSpace:'nowrap' }}>
                          {row.pct_change !== null ? `${row.pct_change > 0 ? '+' : ''}${row.pct_change}%` : ''}
                        </span>
                        <div title={`${row.avg_ua} UA${row.pct_change !== null ? ` (${row.pct_change > 0 ? '+' : ''}${row.pct_change}%)` : ''}`}
                          style={{ width:'100%', height:h, background:col, borderRadius:'4px 4px 0 0', opacity:.85, minHeight:4, transition:'height .2s' }} />
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
                    ? ['Fecha','Jugadores','Promedio UA','Cambio vs anterior']
                    : ['Semana','Etiqueta','Promedio UA','Cambio vs anterior']
                  ).map(h=>(
                    <span key={h} style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</span>
                  ))}
                </div>
                {rows.map((row: any, i: number) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns: view==='diario' ? '1fr 120px 120px 120px' : '1fr 1fr 120px 120px', gap:0, padding:'11px 18px', borderBottom:i<rows.length-1?'1px solid var(--mist)':'none', alignItems:'center' }}>
                    <span className="mono" style={{ fontSize:13, color:'var(--snow)' }}>
                      {view==='diario' ? row.fecha : row.semana}
                    </span>
                    {view === 'diario'
                      ? <span style={{ fontSize:11, color:'var(--silver)' }} title={row.players?.join(', ')}>{row.count} jugadores</span>
                      : <span style={{ fontSize:11, color:'var(--silver)' }}>{row.label}</span>
                    }
                    <span className="mono" style={{ fontSize:14, color:'var(--snow)', fontWeight:600 }}>{row.avg_ua} <span style={{ fontSize:10, color:'var(--silver)', fontWeight:400 }}>UA</span></span>
                    <span style={{ fontSize:13, fontWeight:700, color:pctColor(row.pct_change), background:pctBg(row.pct_change), padding:'3px 8px', borderRadius:6, display:'inline-block', fontFamily:'DM Mono,monospace' }}>
                      {row.pct_change !== null ? `${row.pct_change > 0 ? '+' : ''}${row.pct_change}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Interpretation guide */}
              <div style={{ background:'rgba(200,241,53,.04)', border:'1px solid rgba(200,241,53,.12)', borderRadius:12, padding:'14px 18px' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Guía de interpretación</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:6 }}>
                  {[
                    ['🟢','≤0%','Carga igual o menor — recuperación adecuada'],
                    ['🟡','1–10%','Aumento moderado — monitorear progresión'],
                    ['🔴','>10%','Aumento alto — riesgo de sobrecarga'],
                    ['🔵','<−10%','Reducción notable — posible descarga planificada'],
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
const TAREAS_PRINCIPALES = ['Activación en campo','Activación en gimnasio','Gimnasio + Tarea analítica','Juego de posesión','Juego de posición','Partido reducido','Partido modificado','Partido de entrenamiento','Partido amistoso','Partido oficial']
const SUBTAREAS: Record<string, string[]> = { 'Activación en campo': ['Circuito técnico','Circuito neuromuscular','Pliometría','Movilidad'], 'Activación en gimnasio': ['Isométricos','Pliometría','Movilidad','Excéntricos','Estabilidad','Tracción y empuje'] }
const TAREAS_CON_ESPACIO = ['Juego de posesión','Juego de posición','Partido reducido','Partido modificado','Partido de entrenamiento','Partido amistoso','Partido oficial']
const TAREAS_CON_EQUIPO = ['Juego de posesión','Juego de posición','Partido reducido','Partido modificado','Partido de entrenamiento','Partido amistoso','Partido oficial']
const TAREAS_MOSTRAR_FORM = [...TAREAS_CON_ESPACIO, 'Activación en campo','Activación en gimnasio','Gimnasio + Tarea analítica']
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
      desde = ws.toISOString().split('T')[0]
      hasta = we.toISOString().split('T')[0]
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
  const partidos: any[] = data?.partidos || []
  const logs: any[] = data?.logs || []

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
      return d.toISOString().split('T')[0]
    })
  }

  const today = now.toISOString().split('T')[0]
  const diasMes = viewMode === 'mes' ? getDiasMes() : []
  const diasSemana = viewMode === 'semana' ? getDiasSemana() : []

  // All event days sorted for recovery calculation
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
          <button onClick={()=>setShowEditor(true)} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nueva sesión</button>
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

              // Recovery alert from previous event day
              const prevEventDay = allEventDays[allEventDays.indexOf(fecha)-1]
              const recup = prevEventDay ? calcRecuperacion(prevEventDay, fecha) : null
              const hasEvents = ses.length > 0 || parts.length > 0
              const recupAlert = hasEvents && recup !== null && recup < 48

              return (
                <div key={fecha}
                  onClick={() => { setSelectedDay(selectedDay===fecha?null:fecha) }}
                  style={{
                    minHeight:100, borderRight:'1px solid var(--mist)', borderBottom:'1px solid var(--mist)',
                    padding:6, cursor:'pointer', transition:'background .12s',
                    background: selectedDay===fecha ? 'rgba(200,241,53,.06)' : isWeekend ? 'rgba(255,255,255,.01)' : 'transparent',
                    border: isToday ? '2px solid var(--lime)' : undefined,
                    position:'relative',
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
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    {ses.map(s=>(
                      <div key={s.id} onClick={e=>{e.stopPropagation();setEditSesion(s);setShowEditor(true)}} style={{ fontSize:10, padding:'2px 5px', borderRadius:4, background:`${TIPO_COLORES[s.tipo]||'#888'}22`, color:TIPO_COLORES[s.tipo]||'#888', border:`1px solid ${TIPO_COLORES[s.tipo]||'#888'}44`, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'pointer' }}>
                        {TIPO_ICONOS[s.tipo]} {s.titulo||s.tipo}
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
                        {TIPO_ICONOS[s.tipo]} {s.titulo||s.tipo} {s.hora_inicio?`· ${s.hora_inicio.slice(0,5)}`:''}
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
                      </div>
                    ))}
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
      {showEditor && (
        <SesionEditor
          sesion={editSesion}
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
      )}
    </div>
  )
}

function getCuadrante(densidad: number, jugadores?: number) {
  // Castellano y Casamichana (2016) — objetivos según m²/jugador y nº jugadores
  // Tabla: filas = m²/jug (<50, 50-100, 100-200, >200) × cols = jugadores (1<2, 3<4, 5<7, 8<10)
  // Objetivo dominante según zona:
  // Fuerza: <100 m²/jug + pocos jug (1-4)
  // Resistencia: 50-200 m²/jug + muchos jug (5+)
  // Activación: <100 m²/jug + muchos jug (5+)
  // Velocidad: >100 m²/jug + muchos jug (5+)
  const jug = jugadores || 0
  let objetivo = 'Resistencia'
  let color = '#f59e0b'  // naranja
  let bg = 'rgba(245,158,11,.1)'
  let border = 'rgba(245,158,11,.3)'

  if (densidad < 50) {
    if (jug >= 5) {
      objetivo = 'Activación'; color = '#22c55e'; bg = 'rgba(34,197,94,.1)'; border = 'rgba(34,197,94,.3)'
    } else {
      objetivo = 'Fuerza'; color = '#a855f7'; bg = 'rgba(168,85,247,.1)'; border = 'rgba(168,85,247,.3)'
    }
  } else if (densidad < 100) {
    if (jug >= 5) {
      objetivo = 'Activación'; color = '#22c55e'; bg = 'rgba(34,197,94,.1)'; border = 'rgba(34,197,94,.3)'
    } else {
      objetivo = 'Fuerza'; color = '#a855f7'; bg = 'rgba(168,85,247,.1)'; border = 'rgba(168,85,247,.3)'
    }
  } else if (densidad < 200) {
    if (jug >= 5) {
      objetivo = 'Resistencia'; color = '#f59e0b'; bg = 'rgba(245,158,11,.1)'; border = 'rgba(245,158,11,.3)'
    } else {
      objetivo = 'Fuerza'; color = '#a855f7'; bg = 'rgba(168,85,247,.1)'; border = 'rgba(168,85,247,.3)'
    }
  } else {
    if (jug >= 5) {
      objetivo = 'Velocidad'; color = '#3b82f6'; bg = 'rgba(59,130,246,.1)'; border = 'rgba(59,130,246,.3)'
    } else {
      objetivo = 'Resistencia'; color = '#f59e0b'; bg = 'rgba(245,158,11,.1)'; border = 'rgba(245,158,11,.3)'
    }
  }

  // Espacio label
  let espacioLabel = ''
  if (densidad < 50) espacioLabel = 'Espacio Reducido'
  else if (densidad < 100) espacioLabel = 'Espacio Reducido'
  else if (densidad < 200) espacioLabel = 'Espacio Medio'
  else espacioLabel = 'Espacio Grande'

  // Description by objetivo
  const descs: Record<string,string> = {
    'Fuerza': 'Alta intensidad neuromuscular · Contactos frecuentes · Espacio muy limitado',
    'Resistencia': 'Alta demanda aeróbica · Balance técnico-táctico · Densidad moderada',
    'Activación': 'Activación neuromuscular · Reacciones rápidas · SSG de alta densidad',
    'Velocidad': 'Sprints frecuentes · Distancias largas · Demanda aeróbica alta',
  }

  return { label: espacioLabel, objetivo, color, bg, border, desc: descs[objetivo] }
}

function calcularDistancias(jugadores: number, largo: number, ancho: number, series: number, minutos: number) {
  if (!jugadores || !largo || !ancho || !series || !minutos) return null
  const espacioM2 = largo * ancho
  const densidad = espacioM2 / jugadores
  const tiempoTotal = series * minutos
  const distTotal = Math.max(0, (19.243 * Math.log(densidad) - 5.029) * tiempoTotal)
  const distSprint = Math.max(0, (0.018 * densidad - 0.844) * tiempoTotal)
  const distMP = Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoTotal)
  const distAcel = Math.max(0, (1.321 * Math.log(densidad) - 0.629) * tiempoTotal)
  const distDecel = Math.max(0, (1.157 * Math.log(densidad) - 0.418) * tiempoTotal)
  const nSprints = Math.max(0, (0.001 * densidad - 0.046) * tiempoTotal)
  const nAcel = Math.max(0, (0.212 * Math.log(densidad) - 0.23) * tiempoTotal)
  const nDecel = Math.max(0, (0.1041 * Math.log(densidad) - 0.096) * tiempoTotal)
  return { distTotal, distSprint, distMP, distAcel, distDecel, nSprints, nAcel, nDecel, densidad, tiempoTotal }
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

  const calcJugadores = esConEquipo ? (totalJugadoresEquipos || Number(bloque.jugadores) || 0) : Number(bloque.jugadores)
  const calc = esConEspacio ? calcularDistancias(calcJugadores, Number(bloque.largo), Number(bloque.ancho), Number(bloque.series), Number(bloque.minutos)) : null

  function handleImg(e: any) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { const url = ev.target?.result as string; setImgPreview(url); onChange('imagen', url) }
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

      {mostrarForm && (
        <div style={{ marginBottom:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
            {!esConEquipo && <div><label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Jugadores</label>{inp('jugadores','Nº jugadores','number')}</div>}
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
              {bloque.pausa ? ` + ${(Number(bloque.series)*Number(bloque.pausa))} min pausa = ${(Number(bloque.series)*(Number(bloque.minutos)+Number(bloque.pausa)))} min total` : ''}
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
                          <button key={p.jugador_id} type="button" onClick={() => toggleJugadorEquipo(eNum, p.jugador_id)} disabled={inOther}
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

      <div style={{ marginBottom:8 }}>
        <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:2 }}>Descripción</label>
        <textarea className="wp-input" value={bloque.descripcion||''} onChange={e=>onChange('descripcion',e.target.value)} rows={2} placeholder="Descripción de la tarea..." style={{ padding:'6px 8px', fontSize:12, resize:'vertical', fontFamily:'inherit', width:'100%' }} />
      </div>

      {esConEspacio && calc && (() => {
        const cuad = getCuadrante(calc.densidad, calcJugadores)
        const OBJCOLORS: Record<string,string> = { 'Fuerza':'#a855f7', 'Resistencia':'#f59e0b', 'Activación':'#22c55e', 'Velocidad':'#3b82f6' }
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
              <button type="button" onClick={()=>setEditingMetrics(e=>!e)} style={{ fontSize:9, padding:'2px 8px', borderRadius:4, background:'transparent', border:`1px solid ${editingMetrics?'var(--lime)':'var(--fog)'}`, color:editingMetrics?'var(--lime)':'var(--silver)', cursor:'pointer' }}>
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

      {bloque.ventana && (
        <div style={{ marginTop:10 }}>
          <label style={{ fontSize:9, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>Imagen de la tarea</label>
          <label style={{ cursor:'pointer', display:'block' }}>
            <div style={{ width:'100%', borderRadius:10, border:imgPreview?'none':'2px dashed rgba(200,241,53,.3)', background:'var(--ink2)', overflow:'hidden', minHeight:60, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {imgPreview ? <img src={imgPreview} style={{ width:'100%', maxHeight:200, objectFit:'contain', display:'block' }} /> : <span style={{ fontSize:22, color:'var(--fog)', padding:16 }}>📷 Cargar imagen</span>}
            </div>
            <input type="file" accept="image/*" onChange={handleImg} style={{ display:'none' }} />
          </label>
          {imgPreview && <button type="button" onClick={()=>{ setImgPreview(null); onChange('imagen','') }} style={{ fontSize:9, color:'#f87171', background:'none', border:'none', cursor:'pointer', marginTop:2 }}>Quitar imagen</button>}
        </div>
      )}
    </div>
  )
}
function imprimirSesion(f: any, bloques: any[]) {
  const metricKeys = ['distTotal','distSprint','distMP','distAcel','distDecel','nSprints','nAcel','nDecel']
  const metricLabels = ['Dist. total','Sprint >21km/h','Alta pot. >20W/kg','Acel. >2m/s²','Decel. >-2m/s²','Nº sprints','Nº acel. >3m/s²','Nº decel. >-3m/s²']
  const metricUnits = ['m','m','m','m','m','','','']
  const totals: Record<string,number> = {}
  metricKeys.forEach(k => { totals[k] = 0 })
  let hasCarga = false
  bloques.forEach(bl => {
    if (!TAREAS_CON_ESPACIO.includes(bl.ventana)) return
    const jugN = TAREAS_CON_EQUIPO.includes(bl.ventana)
      ? (Object.values(bl.equipos||{}).flat().length || Number(bl.jugadores) || 0)
      : Number(bl.jugadores)
    const calc = calcularDistancias(jugN, Number(bl.largo), Number(bl.ancho), Number(bl.series), Number(bl.minutos))
    if (!calc) return
    hasCarga = true
    metricKeys.forEach(k => {
      const manual = bl.manualMetrics?.[k]
      totals[k] += manual !== undefined && manual !== '' ? parseFloat(manual) : calc[k]
    })
  })

  let tiempoTrabajo = 0, tiempoDescanso = 0
  bloques.forEach(bl => {
    tiempoTrabajo += (Number(bl.series)||0) * (Number(bl.minutos)||0)
    tiempoDescanso += (Number(bl.series)||0) * (Number(bl.pausa)||0)
  })

  const OBJCOLORS: Record<string,string> = { 'Fuerza':'#7c3aed','Resistencia':'#d97706','Activación':'#16a34a','Velocidad':'#2563eb' }

  const tareasHtml = bloques.map((bl, i) => {
    const jugN = TAREAS_CON_EQUIPO.includes(bl.ventana)
      ? (Object.values(bl.equipos||{}).flat().length || Number(bl.jugadores) || 0)
      : Number(bl.jugadores)
    const calc = TAREAS_CON_ESPACIO.includes(bl.ventana) ? calcularDistancias(jugN, Number(bl.largo), Number(bl.ancho), Number(bl.series), Number(bl.minutos)) : null
    const cuad = calc ? getCuadrante(calc.densidad, jugN) : null
    const objColor = cuad ? (OBJCOLORS[cuad.objetivo] || '#555') : '#555'

    const equiposHtml = TAREAS_CON_EQUIPO.includes(bl.ventana) && bl.equipos
      ? `<div style="margin-top:6px;display:flex;gap:8px;flex-wrap:wrap">${[1,2,3,4].map(n => {
          const jugs = (bl.equipos[n]||[])
          if (!jugs.length) return ''
          const cols = ['#16a34a','#2563eb','#d97706','#dc2626']
          return `<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${cols[n-1]}20;color:${cols[n-1]};border:1px solid ${cols[n-1]}44">Equipo ${n}: ${jugs.length} jug.</span>`
        }).join('')}</div>` : ''

    const imgHtml = bl.imagen ? `<img src="${bl.imagen}" style="width:100%;max-height:180px;object-fit:contain;border-radius:6px;margin-top:8px;border:1px solid #ddd" />` : ''

    const calcHtml = calc ? `
      <div style="margin-top:8px;background:${objColor}15;border:1px solid ${objColor}33;border-radius:6px;padding:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <strong style="color:${objColor};font-size:11px;text-transform:uppercase">${cuad!.label} · ${calc.densidad.toFixed(1)} m²/jug</strong>
          <span style="font-size:12px;font-weight:800;color:${objColor};text-transform:uppercase">🎯 ${cuad!.objetivo}</span>
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
        <strong style="font-size:13px;color:#111">Tarea ${i+1}${bl.ventana ? ` — ${bl.ventana}` : ''}${bl.subtarea ? ` › ${bl.subtarea}` : ''}</strong>
        <span style="font-size:11px;color:#555">${[bl.series&&`${bl.series} bloques`,bl.minutos&&`${bl.minutos} min/bl`,bl.pausa&&`pausa ${bl.pausa} min`,bl.largo&&bl.ancho&&`${bl.largo}×${bl.ancho}m`,jugN&&`${jugN} jug.`].filter(Boolean).join(' · ')}</span>
      </div>
      ${equiposHtml}
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
    body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#111}
    h1{font-size:24px;margin-bottom:4px}
    .meta{font-size:12px;color:#666;margin-bottom:16px}
    @media print{body{padding:10px}.no-print{display:none}}
  </style></head><body>
  <div class="no-print" style="margin-bottom:16px">
    <button onclick="window.print()" style="padding:8px 20px;background:#1a1a1a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ Imprimir / Guardar PDF</button>
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

function SesionEditor({ sesion, defaultFecha, onSave, onDelete, onCancel, teamPlayers = [] }) {
  const [f, setF] = useState({
    fecha: sesion?.fecha || defaultFecha,
    hora_inicio: sesion?.hora_inicio?.slice(0,5) || '',
    hora_fin: sesion?.hora_fin?.slice(0,5) || '',
    tipo: sesion?.tipo || 'entrenamiento',
    titulo: sesion?.titulo || '',
    objetivo: sesion?.objetivo || '',
    objetivo_secundario: sesion?.objetivo_secundario || '',
    descripcion: sesion?.descripcion || '',
    rpe_objetivo: sesion?.rpe_objetivo ? String(sesion.rpe_objetivo) : '',
    notas: sesion?.notas || '',
  })
  const [bloques, setBloques] = useState<any[]>(() => {
    try { return sesion?.ejercicios?.length ? sesion.ejercicios : [] } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  function addBloque() { setBloques(b=>[...b, { ventana:'', subtarea:'', jugadores:'', series:'', minutos:'', pausa:'', largo:'', ancho:'', descripcion:'', imagen:'' }]) }
  function updateBloque(i,k,v) { setBloques(b=>b.map((bl,idx)=>idx===i?{...bl,[k]:v}:bl)) }
  function removeBloque(i) { setBloques(b=>b.filter((_,idx)=>idx!==i)) }

  async function submit() {
    if (!f.fecha) return
    setLoading(true); setSaveError('')
    try {
      await onSave({ ...f, rpe_objetivo:f.rpe_objetivo?Number(f.rpe_objetivo):null, ejercicios: bloques })
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
        <button type="button" onClick={onCancel} style={{ background:'transparent', border:'none', color:'var(--fog)', cursor:'pointer', fontSize:18 }}>✕</button>
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
          <input type="number" min="1" max="10" className="wp-input" value={f.rpe_objetivo} onChange={e=>set('rpe_objetivo',e.target.value)} placeholder="ej: 7" style={{ padding:'8px 12px', fontSize:13 }} />
        </div>
      </div>

      {/* Descripción / Metodología — Bloques de tareas */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
          <label style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em' }}>📋 Descripción / Metodología · Tareas ({bloques.length})</label>
          <button type="button" onClick={addBloque} style={{ fontSize:11, padding:'4px 12px', borderRadius:8, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.3)', cursor:'pointer' }}>+ Tarea</button>
        </div>
        {bloques.length === 0 && <p style={{ fontSize:12, color:'var(--fog)', padding:'8px 0' }}>Sin tareas. Clickeá "+ Tarea" para construir la sesión.</p>}
        {bloques.map((bl,i)=>(
          <BloqueMetodologia key={i} bloque={bl} index={i} onChange={(k,v)=>updateBloque(i,k,v)} onRemove={()=>removeBloque(i)} teamPlayers={teamPlayers} />
        ))}
      </div>

      {/* Resumen de tiempo total de sesión */}
      {bloques.length > 0 && (() => {
        let tiempoTrabajo = 0, tiempoDescanso = 0
        bloques.forEach(bl => {
          const s = Number(bl.series)||0, m = Number(bl.minutos)||0, p = Number(bl.pausa)||0
          tiempoTrabajo += s * m
          tiempoDescanso += s * p
        })
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
          const jugN = TAREAS_CON_EQUIPO.includes(bl.ventana)
            ? (Object.values(bl.equipos||{}).flat().length || Number(bl.jugadores) || 0)
            : Number(bl.jugadores)
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
        <button type="button" onClick={() => imprimirSesion(f, bloques)} className="btn-ghost" style={{ fontSize:12, padding:'10px 14px' }} title="Imprimir machete">🖨️ Imprimir</button>
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
  const [desde, setDesde] = useState(`${now.getFullYear()}-01-01`)
  const [hasta, setHasta] = useState(now.toISOString().split('T')[0])
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null)
  const [playerMatches, setPlayerMatches] = useState<any[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  useEffect(()=>{ load() }, [desde, hasta])

  async function load() {
    setLoading(true)
    try { const r = await fetch(`/api/minutos?desde=${desde}&hasta=${hasta}`); setData(await r.json()) }
    finally { setLoading(false) }
  }

  async function openPlayerMatches(p: any) {
    if (selectedPlayer?.jugador_id === p.jugador_id) { setSelectedPlayer(null); setPlayerMatches([]); return }
    setSelectedPlayer(p); setLoadingMatches(true)
    try {
      const r = await fetch(`/api/partidos?jugadorId=${p.jugador_id}&desde=${desde}&hasta=${hasta}`)
      setPlayerMatches(await r.json())
    } catch { setPlayerMatches([]) }
    finally { setLoadingMatches(false) }
  }

  const players = data?.players || []
  const maxMin = Math.max(...players.map(p=>p.min_total), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div><h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>MINUTAJE</h2><p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Entrenamiento vs. competición</p></div>
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
                      <button onClick={()=>openPlayerMatches(p)} style={{ width:'100%', padding:'10px 18px', background: isSelected?'rgba(200,241,53,.06)':'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background .12s' }}
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
                            Partidos jugados — {p.nombre.split(' ')[0]}
                          </p>
                          {loadingMatches
                            ? <p style={{ fontSize:12, color:'var(--silver)', padding:'10px 0' }}>Cargando...</p>
                            : playerMatches.length === 0
                              ? <p style={{ fontSize:12, color:'var(--fog)', padding:'10px 0' }}>Sin partidos registrados en este período.</p>
                              : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                                  {playerMatches.map((m:any)=>(
                                    <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 12px', background:'var(--ink2)', borderRadius:10, border:'1px solid var(--mist)' }}>
                                      {/* Rival logo placeholder or initial */}
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
                                      <div style={{ textAlign:'right', flexShrink:0 }}>
                                        <div className="mono" style={{ fontSize:15, fontWeight:700, color:'#60a5fa' }}>{m.minutos} min</div>
                                        {m.titular && <div style={{ fontSize:9, color:'#fbbf24', textTransform:'uppercase', letterSpacing:'0.06em' }}>Titular</div>}
                                      </div>
                                    </div>
                                  ))}
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
  const [form, setForm] = useState({ fecha:new Date().toISOString().split('T')[0], rival:'', tipo_partido:'Oficial', jugador_id:'', minutos:'' })
  const [bulk, setBulk] = useState(false)
  const [bulkMins, setBulkMins] = useState({})
  const [rivalLogo, setRivalLogo] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try {
      if (bulk) {
        await Promise.all(Object.entries(bulkMins).filter(([,m])=>m&&Number(m)>0).map(([jid,m])=>
          fetch('/api/partidos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jugador_id:Number(jid),fecha:form.fecha,rival:form.rival,tipo_partido:form.tipo_partido,minutos:Number(m),rival_foto:rivalLogo||null})})
        ))
      } else {
        await fetch('/api/partidos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,jugador_id:Number(form.jugador_id),minutos:Number(form.minutos),rival_foto:rivalLogo||null})})
      }
      onSuccess()
    } finally { setLoading(false) }
  }

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:20 }} className="anim-up">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <p style={{ fontSize:13, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Registrar Partido</p>
        <div style={{ display:'flex', gap:8 }}>
          {['Individual','Equipo completo'].map((lbl,i)=>(
            <button key={lbl} type="button" onClick={()=>setBulk(i===1)} style={{ fontSize:11, padding:'5px 10px', borderRadius:8, cursor:'pointer', border: bulk===(i===1)?'2px solid var(--lime)':'1px solid var(--fog)', background: bulk===(i===1)?'rgba(200,241,53,.1)':'var(--ink3)', color: bulk===(i===1)?'var(--lime)':'var(--silver)' }}>{lbl}</button>
          ))}
        </div>
      </div>
      <form onSubmit={submit}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Fecha</label><input type="date" className="wp-input" style={{ padding:'8px 12px', fontSize:13 }} value={form.fecha} onChange={e=>set('fecha',e.target.value)} /></div>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Rival</label>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input className="wp-input" style={{ padding:'8px 12px', fontSize:13, flex:1 }} value={form.rival} onChange={e=>set('rival',e.target.value)} placeholder="vs. Club X" />
              <label style={{ cursor:'pointer', flexShrink:0 }}>
                <div style={{ width:36, height:36, borderRadius:8, overflow:'hidden', background:'var(--ink3)', border:`1px solid ${rivalLogo?'var(--lime)':'var(--fog)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {rivalLogo ? <img src={rivalLogo} style={{ width:'100%', height:'100%', objectFit:'contain', padding:2 }} alt="rival"/> : <span style={{ fontSize:16 }}>🛡️</span>}
                </div>
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=async()=>{ const c=await compressImage(r.result as string,150,0.65); setRivalLogo(c) }; r.readAsDataURL(f) }} />
              </label>
            </div>
          </div>
          <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Tipo</label><select className="wp-input" style={{ padding:'8px 12px', fontSize:13, appearance:'none' }} value={form.tipo_partido} onChange={e=>set('tipo_partido',e.target.value)}>{['Oficial','Amistoso','Copa'].map(v=><option key={v} value={v} style={{ background:'var(--ink2)' }}>{v}</option>)}</select></div>
        </div>
        {!bulk ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Jugador</label><select className="wp-input" style={{ padding:'8px 12px', fontSize:13, appearance:'none' }} value={form.jugador_id} onChange={e=>set('jugador_id',e.target.value)} required><option value="" style={{ background:'var(--ink2)' }}>— Seleccionar —</option>{teamData.map(p=><option key={p.jugador_id} value={p.jugador_id} style={{ background:'var(--ink2)' }}>{p.nombre}</option>)}</select></div>
            <div><label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Minutos</label><input type="number" min="0" max="120" className="wp-input" style={{ padding:'8px 12px', fontSize:13 }} value={form.minutos} onChange={e=>set('minutos',e.target.value)} placeholder="ej: 90" required /></div>
          </div>
        ) : (
          <div style={{ background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:10, padding:14, marginBottom:12, maxHeight:280, overflowY:'auto' }}>
            <p style={{ fontSize:10, color:'var(--silver)', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Minutos por jugador (vacío = no jugó)</p>
            {teamData.map(p=>(
              <div key={p.jugador_id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                <span style={{ fontSize:13, color:'var(--silver)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</span>
                <input type="number" min="0" max="120" placeholder="min" style={{ width:70, background:'var(--ink2)', border:'1px solid var(--fog)', borderRadius:6, padding:'5px 8px', fontSize:12, color:'var(--snow)', fontFamily:'DM Mono,monospace', outline:'none' }} value={bulkMins[p.jugador_id]||''} onChange={e=>setBulkMins(m=>({...m,[p.jugador_id]:e.target.value}))} />
              </div>
            ))}
          </div>
        )}
        <div style={{ display:'flex', gap:10 }}>
          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Guardando...':'Guardar →'}</button>
        </div>
      </form>
    </div>
  )
}

function CoachSessionRow({ log }) {
  const [editing, setEditing] = useState(false)
  const [mins, setMins] = useState(String(log.duracion_min || ''))
  const [displayMins, setDisplayMins] = useState(Number(log.duracion_min) || 0)
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
      <span className="mono" style={{ fontSize:11, color:'var(--silver)', minWidth:80 }}>{String(log.fecha)}</span>
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
          <button onClick={saveMinutes} disabled={saving} style={{ fontSize:12, padding:'4px 12px', borderRadius:6, background:'var(--lime)', color:'var(--ink)', border:'none', cursor:'pointer', fontWeight:700 }}>
            {saving ? '...' : '✓ Guardar'}
          </button>
          <button onClick={()=>{ setEditing(false); setError('') }} style={{ fontSize:12, padding:'4px 8px', borderRadius:6, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', cursor:'pointer' }}>✕</button>
          {error && <span style={{ fontSize:11, color:'#f87171' }}>{error}</span>}
        </div>
      ) : (
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <span style={{ color: displayMins ? 'var(--silver)' : '#f59e0b', fontFamily:'DM Mono,monospace', fontSize:12 }}>
            {displayMins ? `${displayMins} min` : <span style={{ fontSize:11 }}>⚠ sin mins</span>}
          </span>
          <button onClick={()=>setEditing(true)} title="Editar minutos" style={{ fontSize:13, background:'transparent', border:'none', cursor:'pointer', color:'var(--fog)', padding:'0 2px', lineHeight:1 }}>✏️</button>
        </div>
      )}
      <span className="mono" style={{ color: ua > 0 ? 'var(--lime)' : 'var(--fog)', fontWeight:600 }}>
        {ua > 0 ? `${ua} UA` : '—'}
      </span>
    </div>
  )
}

function MediaEquipoPanel() {
  const now = new Date()
  const [ciclo, setCiclo] = useState<'microciclo'|'mesociclo'|'macrociclo'>('microciclo')
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [sortField, setSortField] = useState('nombre')
  const [sortDir,   setSortDir]   = useState<'asc'|'desc'>('asc')

  const CICLO_DAYS = { microciclo:7, mesociclo:28, macrociclo:365 }

  useEffect(() => { load() }, [ciclo])

  async function load() {
    setLoading(true)
    const hasta = now.toISOString().split('T')[0]
    const desde = new Date(Date.now() - CICLO_DAYS[ciclo] * 86400000).toISOString().split('T')[0]
    try {
      const r = await fetch(`/api/carga-gps?desde=${desde}&hasta=${hasta}&ciclo=${ciclo}`)
      if (r.ok) setData(await r.json())
    } catch {}
    finally { setLoading(false) }
  }

  const players: any[]  = data?.players   || []
  const teamAvg: any    = data?.teamAvg   || {}
  const hasGps: boolean = data?.hasGpsData || false

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
      <div>
        <h2 className="display" style={{ fontSize: 48, color: 'var(--snow)' }}>MEDIA EQUIPO</h2>
        <p style={{ fontSize: 12, color: 'var(--silver)', marginTop: 2 }}>
          Carga individual por jugador · RPE, UA y datos GPS de las sesiones
        </p>
      </div>

      {/* Ciclo selector */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 10, padding: 3, alignSelf: 'flex-start' }}>
        {(['microciclo', 'mesociclo', 'macrociclo'] as const).map(c => (
          <button key={c} onClick={() => setCiclo(c)} style={{
            padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600,
            border: 'none', background: ciclo === c ? 'var(--lime)' : 'transparent',
            color: ciclo === c ? 'var(--ink)' : 'var(--silver)', transition: 'all .12s', textTransform: 'capitalize',
          }}>
            {c}
          </button>
        ))}
      </div>

      {/* KPIs del equipo */}
      {players.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
          {[
            ['RPE Medio',    teamAvg.rpe,        'var(--lime)', 'escala Borg'],
            ['UA Media',     teamAvg.ua,          '#60a5fa',    'por sesión'],
            ['UA Total',     teamAvg.ua_total,    '#a78bfa',    'acumulado'],
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
          {/* Info GPS */}
          {!hasGps && (
            <div style={{ background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.2)', borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#93c5fd' }}>
              📐 Los datos GPS (distancia, sprints, etc.) se calculan a partir de las sesiones planificadas en el Calendario.
              Cuando agregás tareas con espacio y jugadores, los datos aparecen automáticamente aquí.
              También podés editarlos manualmente con el botón "Editar GPS" en cada tarea.
            </div>
          )}

          {/* TABLA INDIVIDUAL POR JUGADOR */}
          <div style={{ background: 'var(--ink2)', border: '1px solid rgba(200,241,53,.2)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--mist)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                CARGA INDIVIDUAL POR JUGADOR · {ciclo.toUpperCase()}
              </p>
              <p style={{ fontSize: 10, color: 'var(--fog)' }}>Click en columna para ordenar</p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,.03)' }}>
                    <SortTh field="nombre"   label="Jugador" />
                    <SortTh field="rpe"      label="RPE" />
                    <SortTh field="ua"       label="UA" unit="media" />
                    <SortTh field="ua_total" label="UA" unit="total" />
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

                  {/* Fila promedio equipo */}
                  <tr style={{ borderTop: '2px solid rgba(200,241,53,.3)', background: 'rgba(200,241,53,.06)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: 'var(--lime)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Promedio equipo
                    </td>
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

          {/* Nota mesociclo/macrociclo */}
          {ciclo !== 'microciclo' && (
            <div style={{ background: 'rgba(200,241,53,.05)', border: '1px solid rgba(200,241,53,.15)', borderRadius: 10, padding: '10px 16px', fontSize: 11, color: 'var(--silver)' }}>
              💡 <strong style={{ color: 'var(--lime)' }}>{ciclo === 'mesociclo' ? 'Mesociclo (28 días)' : 'Macrociclo (365 días)'}</strong>:
              Los valores muestran la media por sesión de cada jugador en el período.
              La distancia y sprints son la suma acumulada de todas las sesiones planificadas en el Calendario.
            </div>
          )}
        </>
      )}
    </div>
  )
}







function LesionesPanel({ teamData, onRefresh }) {
  const [lesiones, setLesiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [historial, setHistorial] = useState(false)

  useEffect(()=>{ loadL() }, [historial])

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
        <div><h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>ENFERMERÍA</h2><p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Registro de lesiones del plantel</p></div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={()=>setHistorial(h=>!h)} className="btn-ghost" style={{ fontSize:12, padding:'10px 14px' }}>{historial?'Ver activas':'Ver historial'}</button>
          <button onClick={()=>setShowNew(true)} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nueva lesión</button>
        </div>
      </div>
      {showNew && <NewLesionForm teamData={teamData} onSuccess={()=>{ setShowNew(false); loadL(); onRefresh() }} onCancel={()=>setShowNew(false)} />}
      {loading
        ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
        : lesiones.length===0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>{historial?'Sin historial de lesiones.':'✓ Sin jugadores en enfermería.'}</div>
          : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{lesiones.map(l=><LesionCard key={l.id} lesion={l} onUpdate={p=>updateL(l.id,p)} />)}</div>
      }
    </div>
  )
}

function LesionCard({ lesion:l, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [estado, setEstado] = useState(l.estado)
  const [eta, setEta] = useState(String(l.eta_dias||''))
  const col = LCOL[estado]||'#888'
  const dias = Math.floor((Date.now()-new Date(l.fecha_inicio).getTime())/86400000)
  return (
    <div style={{ background:'var(--ink2)', border:`1px solid ${l.activa?'rgba(239,68,68,.25)':'var(--mist)'}`, borderRadius:14, overflow:'hidden' }}>
      <button onClick={()=>setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 18px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        <div style={{ width:10, height:10, borderRadius:'50%', background:col, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:500, fontSize:14, color:'var(--snow)' }}>{l.jugador_nombre}</div>
          <div style={{ fontSize:11, color:'var(--silver)', marginTop:1 }}>{l.posicion||'—'} · {l.tipo_lesion||'Sin tipo'} · {l.zona||'—'}</div>
        </div>
        <div style={{ textAlign:'center', minWidth:60 }}><div className="mono" style={{ fontSize:16, fontWeight:600, color:'var(--silver)' }}>{dias}d</div><div style={{ fontSize:9, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>EN LISTA</div></div>
        <span style={{ fontSize:12, padding:'4px 10px', borderRadius:20, background:`${col}20`, color:col, border:`1px solid ${col}44`, fontWeight:600, flexShrink:0 }}>{estado}</span>
        {l.eta_dias && <div style={{ textAlign:'right', minWidth:60 }}><div className="mono" style={{ fontSize:16, fontWeight:600, color:'#f87171' }}>{l.eta_dias}d</div><div style={{ fontSize:9, color:'#f87171', fontFamily:'DM Mono,monospace' }}>ETA</div></div>}
        <span style={{ color:'var(--fog)', fontSize:14, transition:'transform .2s', display:'inline-block', transform:open?'rotate(90deg)':'none' }}>›</span>
      </button>
      {open && (
        <div style={{ padding:'12px 18px 18px', borderTop:'1px solid var(--mist)', background:'var(--ink3)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Estado</label>
              <select className="wp-input" style={{ padding:'8px 12px', fontSize:13, appearance:'none' }} value={estado} onChange={e=>{ setEstado(e.target.value); onUpdate({estado:e.target.value}) }}>{LEST.map(s=><option key={s} value={s} style={{ background:'var(--ink2)' }}>{s}</option>)}</select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>ETA (días)</label>
              <input type="number" className="wp-input" style={{ padding:'8px 12px', fontSize:13 }} value={eta} placeholder="ej: 21" onChange={e=>setEta(e.target.value)} onBlur={()=>eta&&onUpdate({eta_dias:Number(eta)})} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', justifyContent:'flex-end' }}>
              {l.activa
                ? <button className="btn-ghost" style={{ fontSize:12, padding:8, color:'#4ade80', borderColor:'rgba(34,197,94,.3)', width:'100%' }} onClick={()=>onUpdate({activa:false,fecha_alta:new Date().toISOString().split('T')[0],estado:'Alta'})}>✓ Dar de alta</button>
                : <button className="btn-ghost" style={{ fontSize:12, padding:8, color:'#f87171', borderColor:'rgba(239,68,68,.3)', width:'100%' }} onClick={()=>onUpdate({activa:true,fecha_alta:null})}>↩ Reactivar</button>
              }
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {l.fecha_inicio && <span style={{ fontSize:11, color:'var(--silver)', background:'var(--ink2)', borderRadius:6, padding:'3px 8px', border:'1px solid var(--mist)' }}>📅 Inicio: {l.fecha_inicio}</span>}
            {l.fecha_alta && <span style={{ fontSize:11, color:'#4ade80', background:'rgba(34,197,94,.08)', borderRadius:6, padding:'3px 8px', border:'1px solid rgba(34,197,94,.2)' }}>✓ Alta: {l.fecha_alta}</span>}
            {l.descripcion && <span style={{ fontSize:11, color:'var(--silver)' }}>📝 {l.descripcion}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function NewLesionForm({ teamData, onSuccess, onCancel }) {
  const [f, setF] = useState({ jugador_id:'', fecha_inicio:new Date().toISOString().split('T')[0], tipo_lesion:'Muscular', zona:'', descripcion:'', eta_dias:'', estado:'Tratamiento' })
  const [loading, setLoading] = useState(false)
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  async function submit(e) {
    e.preventDefault(); setLoading(true)
    try { await fetch('/api/lesiones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,jugador_id:Number(f.jugador_id),eta_dias:f.eta_dias?Number(f.eta_dias):null})}); onSuccess() }
    finally { setLoading(false) }
  }
  return (
    <div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.25)', borderRadius:14, padding:20 }} className="anim-up">
      <p style={{ fontSize:13, fontWeight:600, color:'#f87171', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.06em' }}>🏥 Nueva Lesión</p>
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
        <div style={{ display:'flex', gap:10 }}>
          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Registrando...':'Registrar lesión →'}</button>
        </div>
      </form>
    </div>
  )
}

function NewPlayerForm({ onSuccess, onCancel }) {
  const [f, setF] = useState({ nombre:'', usuario:'', password:'', posicion:'', edad:'', peso_kg:'', estatura_cm:'', pie_habil:'Derecho', foto_url:'', email:'', fecha_nacimiento:'', hora_recordatorio:'08:00' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  async function submit(e) {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const res = await fetch('/api/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,edad:f.edad?parseInt(f.edad):null,peso_kg:f.peso_kg?parseFloat(f.peso_kg):null,estatura_cm:f.estatura_cm?parseInt(f.estatura_cm):null,foto_url:f.foto_url||null,email:f.email||null,fecha_nacimiento:f.fecha_nacimiento||null,hora_recordatorio:f.hora_recordatorio||'08:00'})})
      const d = await res.json()
      if (!res.ok) { setError(d.error||'Error'); return }
      onSuccess()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }
  return (
    <div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:24 }} className="anim-up">
      <p style={{ fontSize:13, fontWeight:600, color:'var(--lime)', marginBottom:18, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nuevo Jugador</p>
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
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>📧 Email (para recordatorios)</label><input className="wp-input" type="email" value={f.email} onChange={e=>set('email',e.target.value)} placeholder="jugador@email.com" /></div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>🎂 Fecha de nacimiento</label><input className="wp-input" type="date" value={f.fecha_nacimiento} onChange={e=>set('fecha_nacimiento',e.target.value)} /></div>
          <div><label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>⏰ Horario de recordatorio</label><select className="wp-input" value={f.hora_recordatorio} onChange={e=>set('hora_recordatorio',e.target.value)} style={{ appearance:'none' }}>{['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00'].map(h=><option key={h} value={h} style={{ background:'var(--ink2)' }}>{h}</option>)}</select></div>
        </div>
        {error && <p style={{ fontSize:12, color:'#f87171', marginBottom:12 }}>{error}</p>}
        <div style={{ display:'flex', gap:10 }}>
          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Creando...':'Crear jugador →'}</button>
        </div>
      </form>
    </div>
  )
}

function ManageRow({ player, last, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(player.foto_url||null)
  const [photoSaving, setPhotoSaving] = useState(false)
  async function toggle() {
    setLoading(true)
    await fetch(`/api/players/${player.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({activo:!player.activo})})
    onRefresh(); setLoading(false)
  }
  return (
    <div style={{ borderBottom:last?'none':'1px solid var(--mist)' }}>
      <button onClick={()=>setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 20px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', transition:'background .12s' }}
        onMouseEnter={e=>e.currentTarget.style.background='var(--ink3)'}
        onMouseLeave={e=>e.currentTarget.style.background='transparent'}
      >
        {/* Avatar */}
        <div style={{ width:40, height:40, borderRadius:'50%', overflow:'hidden', background:'var(--mist)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--silver)', border:'1px solid var(--fog)' }}>
          {photoUrl
            ? <img src={photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
            : player.nombre.split(' ').map(w=>w[0]).slice(0,2).join('')
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:500, fontSize:14, color:'var(--snow)' }}>{player.nombre}</div>
          <div style={{ fontSize:11, color:'var(--silver)', marginTop:1 }}>@{player.usuario} · {player.posicion||'—'}{player.lesion&&<span style={{ marginLeft:8, color:'#f87171' }}>🏥 Lesionado</span>}</div>
        </div>
        <StatusBadge status={player.acwr?.status} ratio={player.acwr?.ratio} />
        <span style={{ color:'var(--fog)', transition:'transform .2s', display:'inline-block', transform:open?'rotate(90deg)':'none' }}>›</span>
      </button>
      {open && (
        <div style={{ padding:'14px 20px 18px', background:'var(--ink3)', borderTop:'1px solid var(--mist)' }}>
          <div style={{ display:'flex', gap:16, alignItems:'flex-start', flexWrap:'wrap' }}>
            {/* Photo upload inline */}
            <label style={{ cursor:'pointer', flexShrink:0 }}>
              <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', background:'var(--mist)', border:`2px solid ${photoUrl?'var(--lime)':'var(--fog)'}`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', transition:'border-color .15s' }}>
                {photoUrl
                  ? <img src={photoUrl} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                  : <span style={{ fontSize:22 }}>📷</span>
                }
                {photoSaving && <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'white' }}>...</div>}
              </div>
              <p style={{ fontSize:9, color:photoUrl?'var(--lime)':'var(--silver)', textAlign:'center', marginTop:4 }}>{photoUrl?'Cambiar foto':'Cargar foto'}</p>
              <input type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={async e=>{
                const file=e.target.files?.[0]; if(!file) return
                setPhotoSaving(true)
                const reader=new FileReader()
                reader.onload=async()=>{
                  const dataUrl=reader.result as string
                  await fetch('/api/players/photo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jugador_id:player.jugador_id,foto_url:dataUrl})})
                  setPhotoUrl(dataUrl)
                  setPhotoSaving(false)
                }
                reader.readAsDataURL(file)
              }}/>
            </label>
            {/* Info + actions */}
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ fontSize:12, color:'var(--silver)', display:'flex', flexWrap:'wrap', gap:10, marginBottom:12 }}>
                {player.edad&&<span>🎂 {player.edad} años</span>}
                {player.peso_kg&&<span>⚖️ {player.peso_kg} kg</span>}
                {player.estatura_cm&&<span>📏 {player.estatura_cm} cm</span>}
                {player.pie_habil&&<span>⚽ Pie {player.pie_habil}</span>}
                {player.fecha_nacimiento&&<span>📅 Nac: {player.fecha_nacimiento}</span>}
                {player.email&&<span>📧 {player.email}</span>}
                {player.hora_recordatorio&&<span>⏰ Recordatorio: {player.hora_recordatorio}</span>}
              </div>
              <button onClick={toggle} disabled={loading} className="btn-ghost" style={{ fontSize:12, padding:'7px 14px', color:player.activo?'#f87171':'#4ade80', borderColor:player.activo?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)' }}>
                {loading?'...':player.activo?'Desactivar acceso':'Activar acceso'}
              </button>
            </div>
          </div>
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
        <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>READINESS</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Bienestar y estado de carga del plantel</p>
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
                {p.dolor_zona && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }} title={`EVA: ${p.dolor_eva||'—'}`}>📍</span>}
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
                <button key={m} type="button" onClick={()=>setChartMode(m)} style={{ fontSize:11, padding:'5px 12px', borderRadius:8, cursor:'pointer', border:chartMode===m?'2px solid var(--lime)':'1px solid var(--fog)', background:chartMode===m?'rgba(200,241,53,.1)':'var(--ink3)', color:chartMode===m?'var(--lime)':'var(--silver)' }}>{l}</button>
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
function AcumPanel({ teamData }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [weeks, setWeeks] = useState(4)

  useEffect(() => { loadData() }, [weeks])

  async function loadData() {
    setLoading(true)
    try { const r = await fetch(`/api/readiness?weeks=${weeks}`); setData(await r.json()) }
    finally { setLoading(false) }
  }

  const WK2 = ['avg_fatiga','avg_sueno','avg_dolor','avg_estres','avg_animo']
  const WL2 = ['Fatiga','Sueño','Dolor','Estrés','Ánimo']
  const WC2 = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']
  const readColor = (t) => !t ? '#555' : t<=12 ? '#c8f135' : t<=18 ? '#f59e0b' : '#ef4444'

  // Group by player, get last N weeks
  const byPlayer = {}
  for (const r of (data?.wRows||[])) {
    if (!byPlayer[r.jugador_id]) byPlayer[r.jugador_id] = { nombre:r.nombre, posicion:r.posicion, foto:r.foto_url, weeks:[] }
    byPlayer[r.jugador_id].weeks.push(r)
  }
  // Sort weeks desc
  Object.values(byPlayer).forEach(p => p.weeks.sort((a,b)=>b.semana.localeCompare(a.semana)))

  const allWeeks = [...new Set((data?.wRows||[]).map(r=>r.semana))].sort().reverse().slice(0,weeks)

  const rpeMap = {}
  for (const r of (data?.rpeRows||[])) {
    const key = `${r.jugador_id}_${r.semana}`
    rpeMap[key] = r
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>ACUM. M1</h2>
          <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Promedios semanales por jugador — detección de fatiga acumulada</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[2,4,8].map(w => (
            <button key={w} type="button" onClick={()=>setWeeks(w)} style={{ fontSize:12, padding:'7px 14px', borderRadius:8, cursor:'pointer', border:weeks===w?'2px solid var(--lime)':'1px solid var(--fog)', background:weeks===w?'rgba(200,241,53,.1)':'var(--ink3)', color:weeks===w?'var(--lime)':'var(--silver)' }}>{w} semanas</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
        : Object.keys(byPlayer).length===0 ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Sin datos de wellness registrados.</div>
        : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'var(--ink3)' }}>
                  <th style={{ textAlign:'left', padding:'10px 14px', color:'var(--silver)', fontWeight:600, fontSize:10, textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>Jugador</th>
                  {allWeeks.map(w => (
                    <th key={w} style={{ textAlign:'center', padding:'10px 8px', color:'var(--silver)', fontWeight:600, fontSize:10, textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }} colSpan={2}>
                      {w.slice(5,10)}
                    </th>
                  ))}
                </tr>
                <tr style={{ background:'var(--ink3)', borderBottom:'1px solid var(--mist)' }}>
                  <th style={{ padding:'4px 14px' }}></th>
                  {allWeeks.map(w => (
                    <>
                      <th key={`${w}w`} style={{ textAlign:'center', padding:'4px 6px', color:'var(--silver)', fontSize:9, fontWeight:500 }}>TW</th>
                      <th key={`${w}r`} style={{ textAlign:'center', padding:'4px 6px', color:'#60a5fa', fontSize:9, fontWeight:500 }}>RPE</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.values(byPlayer).sort((a,b)=>a.nombre.localeCompare(b.nombre)).map((p, pi) => (
                  <tr key={p.nombre} style={{ borderBottom:'1px solid var(--mist)', background: pi%2===0?'transparent':'rgba(255,255,255,.015)' }}>
                    <td style={{ padding:'10px 14px', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', overflow:'hidden', background:'var(--ink3)', border:'1px solid var(--fog)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {p.foto
                            ? <img src={p.foto} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt=""/>
                            : <span style={{ fontSize:10, fontWeight:700, color:'var(--silver)' }}>{p.nombre.split(' ').map(w=>w[0]).join('').slice(0,2)}</span>
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight:500, color:'var(--snow)', fontSize:13 }}>{p.nombre}</div>
                          <div style={{ fontSize:10, color:'var(--silver)' }}>{p.posicion||'—'}</div>
                        </div>
                      </div>
                    </td>
                    {allWeeks.map(w => {
                      const wd = p.weeks.find(x=>x.semana===w)
                      const rd = rpeMap[`${Object.keys(byPlayer).find(k=>byPlayer[k]===p)}_${w}`]
                      const t = wd?.total_wellness
                      const col = readColor(t)
                      return (
                        <>
                          <td key={`${w}tw`} style={{ textAlign:'center', padding:'8px 6px' }}>
                            {t ? <span style={{ fontFamily:'DM Mono,monospace', fontWeight:700, color:col, fontSize:13 }}>{Number(t).toFixed(0)}</span>
                              : <span style={{ color:'var(--fog)', fontSize:11 }}>—</span>}
                          </td>
                          <td key={`${w}rpe`} style={{ textAlign:'center', padding:'8px 6px' }}>
                            {rd?.avg_rpe ? <span style={{ fontFamily:'DM Mono,monospace', color:'#60a5fa', fontSize:13 }}>{Number(rd.avg_rpe).toFixed(1)}</span>
                              : <span style={{ color:'var(--fog)', fontSize:11 }}>—</span>}
                          </td>
                        </>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      {/* Legend */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        <span style={{ fontSize:11, color:'var(--silver)' }}>TW = Total Wellness (suma 5 indicadores)</span>
        {[['#c8f135','5–12 Listo'],['#f59e0b','13–18 Atención'],['#ef4444','19–25 Bajar carga']].map(([c,l])=>(
          <span key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--silver)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>{l}
          </span>
        ))}
      </div>

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
          <button onClick={()=>testEmail('reminder')} disabled={!!testing} className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }}>
            {testing==='reminder' ? 'Enviando...' : '📋 Probar recordatorio'}
          </button>
          <button onClick={()=>testEmail('birthday')} disabled={!!testing} className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }}>
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
