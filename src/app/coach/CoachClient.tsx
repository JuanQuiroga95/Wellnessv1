'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Topbar from '@/components/ui/Topbar'
import StatusBadge from '@/components/ui/StatusBadge'
import ACWRChart from '@/components/charts/ACWRChart'
import WellnessTrend from '@/components/charts/WellnessTrend'
import { buildACWRHistory, buildDailyDetail } from '@/lib/acwr'
import AnalyticsPanel from './AnalyticsPanel'

const TABS = [{id:'team',label:'Equipo'},{id:'analytics',label:'Analytics'},{id:'minutos',label:'Minutaje'},{id:'media-equipo',label:'Media Equipo'},{id:'cambio-carga',label:'Cambio de Carga'},{id:'lesiones',label:'Lesiones'},{id:'players',label:'Jugadores'}]
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
  const router = useRouter()

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
      <Topbar nombre={session.nombre} rol="admin" tabs={TABS} activeTab={tab} onTabChange={t=>{ setTab(t); setSelected(null) }} clubNombre={session.clubNombre||null} />
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
                  <div style={{ width:52, height:52, borderRadius:10, overflow:'hidden', background:'var(--ink3)', border:`2px solid ${clubLogo?'var(--lime)':'var(--fog)'}`, display:'flex', alignItems:'center', justifyContent:'center', transition:'border-color .15s' }}>
                    {clubLogo ? <img src={clubLogo} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} alt="escudo"/> : <span style={{ fontSize:22 }}>🛡️</span>}
                  </div>
                  <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setClubLogo(r.result as string); r.readAsDataURL(f) }} />
                </label>
                <div><h2 className="display" style={{ fontSize:32, color:'var(--snow)' }}>PLANTEL</h2><p style={{ fontSize:11, color:'var(--silver)', marginTop:2 }}>Por posición · {today}</p></div>
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
          fetch('/api/partidos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jugador_id:Number(jid),fecha:form.fecha,rival:form.rival,tipo_partido:form.tipo_partido,minutos:Number(m)})})
        ))
      } else {
        await fetch('/api/partidos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,jugador_id:Number(form.jugador_id),minutos:Number(form.minutos)})})
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
                <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>setRivalLogo(r.result as string); r.readAsDataURL(f) }} />
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
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const CICLO_DAYS = { microciclo:7, mesociclo:28, macrociclo:365 }
  const CICLO_LABEL = { microciclo:'Microciclo — 7 días', mesociclo:'Mesociclo — 28 días', macrociclo:'Macrociclo — Temporada' }

  useEffect(() => { load() }, [ciclo])

  async function load() {
    setLoading(true)
    const hasta = now.toISOString().split('T')[0]
    const desde = new Date(Date.now() - CICLO_DAYS[ciclo] * 86400000).toISOString().split('T')[0]
    try {
      const r = await fetch(`/api/cambio-carga?desde=${desde}&hasta=${hasta}&minEntrenamiento=0&minPartido=0`)
      setData(await r.json())
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const daily = data?.daily || []
  const maxUA = Math.max(...daily.map((d:any) => d.avg_ua || 0), 1)

  const avgRpe = daily.length ? (daily.reduce((s:number,d:any)=>s+(d.avg_rpe||0),0)/daily.length).toFixed(1) : '—'
  const avgUa  = daily.length ? Math.round(daily.reduce((s:number,d:any)=>s+(d.avg_ua||0),0)/daily.length) : '—'

  const pctColor = (pct:number|null) => {
    if (pct === null) return 'var(--silver)'
    if (pct > 15) return '#ef4444'
    if (pct > 0) return '#f59e0b'
    if (pct < -15) return '#60a5fa'
    return '#22c55e'
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h2 className="display" style={{ fontSize:48, color:'var(--snow)' }}>MEDIA EQUIPO</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Promedios grupales de RPE y UA por ciclo</p>
      </div>

      {/* Ciclo selector */}
      <div style={{ display:'flex', gap:4, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:3, alignSelf:'flex-start' }}>
        {(['microciclo','mesociclo','macrociclo'] as const).map(c=>(
          <button key={c} onClick={()=>setCiclo(c)} style={{ padding:'7px 16px', borderRadius:7, cursor:'pointer', fontSize:11, fontWeight:600, border:'none', background:ciclo===c?'var(--lime)':'transparent', color:ciclo===c?'var(--ink)':'var(--silver)', transition:'all .12s', textTransform:'capitalize' }}>
            {c}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
        {[
          ['RPE Medio',avgRpe,'var(--lime)','promedio del período'],
          ['UA Media',avgUa,'#60a5fa','promedio diario'],
          ['Días con datos',daily.filter((d:any)=>d.n>0).length,'var(--snow)',`de ${daily.length} días`],
        ].map(([l,v,c,sub])=>(
          <div key={l as string} style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, textAlign:'center' }}>
            <div className="mono" style={{ fontSize:28, fontWeight:600, color:c as string }}>{v}</div>
            <div style={{ fontSize:10, color:'var(--silver)', marginTop:4 }}>{l as string}</div>
            <div style={{ fontSize:9, color:'var(--fog)', marginTop:2 }}>{sub as string}</div>
          </div>
        ))}
      </div>

      {loading
        ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Cargando...</div>
        : daily.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Sin datos para este ciclo.</div>
          : <>
              {/* Bar chart UA media diaria */}
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:16 }}>UA Media Diaria del Equipo</p>
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100, overflowX:'auto' }}>
                  {daily.map((d:any,i:number)=>{
                    const pct = (d.avg_ua/maxUA)*100
                    const pctChange = d.pct_change
                    const col = pctColor(pctChange)
                    return (
                      <div key={i} style={{ flex:'0 0 auto', minWidth:40, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                        <div className="mono" style={{ fontSize:9, color:col, fontWeight:700, whiteSpace:'nowrap', lineHeight:1.2, textAlign:'center' }}>
                          {d.avg_ua > 0 ? `${d.avg_ua}` : ''}
                        </div>
                        <div className="mono" style={{ fontSize:8, color: pctChange!==null ? col : 'transparent', fontWeight:600, whiteSpace:'nowrap', lineHeight:1, textAlign:'center' }}>
                          {pctChange!==null ? `${pctChange>0?'+':''}${pctChange}%` : '·'}
                        </div>
                        <div title={`${d.label}: ${d.avg_ua} UA`} style={{ width:28, height:70, background:'var(--mist)', borderRadius:4, overflow:'hidden', display:'flex', alignItems:'flex-end', cursor:'default' }}>
                          <div style={{ width:'100%', height:`${pct}%`, background:col, borderRadius:4, transition:'height .3s', minHeight: d.avg_ua>0?4:0 }} />
                        </div>
                        <div style={{ fontSize:8, color:'var(--fog)', textAlign:'center', lineHeight:1.2, maxWidth:40, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {d.label?.slice(5)||d.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ marginTop:12, display:'flex', gap:12, flexWrap:'wrap' }}>
                  {[['#22c55e','Carga estable/baja'],['#f59e0b','Aumento moderado'],['#ef4444','Aumento alto (>15%)'],['#60a5fa','Reducción notable (>15%)']].map(([c,l])=>(
                    <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'var(--silver)' }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:c }} />{l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                    <thead>
                      <tr style={{ background:'rgba(255,255,255,.03)' }}>
                        {['Fecha','Jugadores','RPE Medio','UA Media','% vs día anterior'].map(h=>(
                          <th key={h} style={{ padding:'8px 14px', color:'var(--silver)', fontWeight:600, textTransform:'uppercase', fontSize:9, letterSpacing:'0.06em', textAlign:'center', whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map((d:any,i:number)=>{
                        const col = pctColor(d.pct_change)
                        return (
                          <tr key={i} style={{ borderTop:'1px solid var(--mist)', background:d.n>0?'transparent':'rgba(0,0,0,.2)' }}>
                            <td style={{ padding:'8px 14px', textAlign:'center', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--fog)' }}>{d.label}</td>
                            <td style={{ padding:'8px 14px', textAlign:'center', fontFamily:'DM Mono,monospace', color:'var(--silver)' }}>{d.n||'—'}</td>
                            <td style={{ padding:'8px 14px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:d.avg_rpe?'var(--lime)':'var(--fog)' }}>{d.avg_rpe?.toFixed(1)||'—'}</td>
                            <td style={{ padding:'8px 14px', textAlign:'center', fontFamily:'DM Mono,monospace', fontWeight:700, color:d.avg_ua?'#60a5fa':'var(--fog)' }}>{d.avg_ua||'—'}</td>
                            <td style={{ padding:'8px 14px', textAlign:'center' }}>
                              {d.pct_change !== null
                                ? <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:`${col}20`, color:col, border:`1px solid ${col}44`, fontWeight:600 }}>
                                    {d.pct_change > 0 ? '+' : ''}{d.pct_change}%
                                  </span>
                                : <span style={{ color:'var(--fog)' }}>—</span>
                              }
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
      }
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
                reader.onload=()=>set('foto_url', reader.result as string)
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
