'use client'
import { useState } from 'react'
import ScaleInput from '@/components/ui/ScaleInput'

// ── Wellness: 1=BUENO(positivo), 5=MALO(negativo) en TODOS los indicadores
// Para Dolor: 1=sin dolor(bueno/verde), 5=mucho dolor(malo/rojo)
// Para Fatiga: 1=muy fresco(bueno), 5=muy cansado(malo)
const FIELDS = [
  { key:'fatiga',         label:'Fatiga',           low:'Muy fresco',    high:'Muy fatigado'  },
  { key:'calidad_sueno',  label:'Calidad de Sueño', low:'Muy buena',     high:'Muy mala'      },
  { key:'dolor_muscular', label:'Dolor Muscular',   low:'Sin dolor',     high:'Mucho dolor'   },
  { key:'nivel_estres',   label:'Nivel de Estrés',  low:'Muy relajado',  high:'Muy estresado' },
  { key:'estado_animo',   label:'Estado de Ánimo',  low:'Muy alto',      high:'Muy bajo'      },
]

// TQR: 1=muy mal(rojo) → 10=completamente recuperado(verde) — invertido
const TQR_LABELS = {
  1:'Muy mal', 2:'Mal', 3:'Bastante mal', 4:'Algo mal', 5:'Moderado',
  6:'Bastante bien', 7:'Bien', 8:'Muy bien', 9:'Excelente', 10:'Completamente recuperado'
}
const TQR_COLORS = ['','#ef4444','#ef4444','#f97316','#f97316','#eab308','#eab308','#22c55e','#22c55e','#c8f135','#c8f135']

// EVA pain scale — 6 niveles
const EVA_LEVELS = [
  { val:0, emoji:'😊', label:'Sin Dolor',           color:'#c8f135' },
  { val:2, emoji:'🙂', label:'Muy Leve',            color:'#22c55e' },
  { val:4, emoji:'😐', label:'Moderado',            color:'#eab308' },
  { val:6, emoji:'😟', label:'Intenso',             color:'#f97316' },
  { val:8, emoji:'😣', label:'Muy Intenso',         color:'#ef4444' },
  { val:10,emoji:'😭', label:'Dolor Insoportable',  color:'#b91c1c' },
]

const WK = ['fatiga','calidad_sueno','dolor_muscular','nivel_estres','estado_animo']
const WL = ['Fatiga','Sueño','Dolor','Estrés','Ánimo']
const WC = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']

// ── EVA Scale ─────────────────────────────────────────────────────────────────
function EVAScale({ value, onChange }) {
  return (
    <div style={{ background:'var(--ink3)', border:'1px solid rgba(239,68,68,.25)', borderRadius:12, padding:16 }} className="anim-up">
      <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
        📊 Escala Visual Analógica (EVA)
      </p>
      <p style={{ fontSize:12, color:'var(--silver)', marginBottom:14 }}>¿Qué nivel de dolor sentís?</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {EVA_LEVELS.map(l => {
          const active = value === l.val
          return (
            <button key={l.val} type="button" onClick={()=>onChange(l.val)} style={{
              flex:1, minWidth:80, padding:'12px 6px', borderRadius:10, cursor:'pointer', textAlign:'center',
              border: active ? `2px solid ${l.color}` : '1px solid var(--fog)',
              background: active ? `${l.color}25` : 'var(--ink2)',
              transition:'all .12s',
            }}>
              <div style={{ fontSize:24, marginBottom:4 }}>{l.emoji}</div>
              <div style={{ fontSize:11, fontWeight:active?700:500, color:active?l.color:'var(--silver)', lineHeight:1.2 }}>{l.label}</div>
              <div className="mono" style={{ fontSize:10, color:active?l.color:'var(--fog)', marginTop:3 }}>{l.val}/10</div>
            </button>
          )
        })}
      </div>
      {value !== null && value !== undefined && (
        <div style={{ marginTop:10, textAlign:'center', fontSize:12, color:EVA_LEVELS.find(l=>l.val===value)?.color||'var(--silver)' }}>
          Dolor seleccionado: <strong>{value}/10</strong> — {EVA_LEVELS.find(l=>l.val===value)?.label}
        </div>
      )}
    </div>
  )
}

// ── Body Map SVG ──────────────────────────────────────────────────────────────

// Zonas como paths/shapes para la vista frontal
const FRONT_ZONES = [
  { id:'cabeza_f',      label:'Cabeza',             cx:100, cy:26,  r:20 },
  { id:'cuello_f',      label:'Cuello',             cx:100, cy:54,  r:11 },
  { id:'hombro_d',      label:'Hombro Der.',        cx:65,  cy:73,  r:13 },
  { id:'hombro_i',      label:'Hombro Izq.',        cx:135, cy:73,  r:13 },
  { id:'pecho',         label:'Pecho',              cx:100, cy:97,  r:18 },
  { id:'bicep_d',       label:'Bícep Der.',         cx:53,  cy:110, r:12 },
  { id:'bicep_i',       label:'Bícep Izq.',         cx:147, cy:110, r:12 },
  { id:'abdomen',       label:'Abdomen',            cx:100, cy:140, r:16 },
  { id:'antebrazo_d',   label:'Antebrazo Der.',     cx:42,  cy:148, r:11 },
  { id:'antebrazo_i',   label:'Antebrazo Izq.',     cx:158, cy:148, r:11 },
  { id:'ingle_d',       label:'Ingle/Cadera Der.',  cx:83,  cy:178, r:13 },
  { id:'ingle_i',       label:'Ingle/Cadera Izq.',  cx:117, cy:178, r:13 },
  { id:'cuad_d',        label:'Cuádricep Der.',     cx:80,  cy:218, r:15 },
  { id:'cuad_i',        label:'Cuádricep Izq.',     cx:120, cy:218, r:15 },
  { id:'rodilla_d',     label:'Rodilla Der.',       cx:80,  cy:262, r:12 },
  { id:'rodilla_i',     label:'Rodilla Izq.',       cx:120, cy:262, r:12 },
  { id:'tibia_d',       label:'Tibia Der.',         cx:78,  cy:302, r:11 },
  { id:'tibia_i',       label:'Tibia Izq.',         cx:122, cy:302, r:11 },
  { id:'tobillo_d',     label:'Tobillo Der.',       cx:78,  cy:342, r:10 },
  { id:'tobillo_i',     label:'Tobillo Izq.',       cx:122, cy:342, r:10 },
  { id:'pie_d',         label:'Pie Der.',           cx:76,  cy:370, r:10 },
  { id:'pie_i',         label:'Pie Izq.',           cx:124, cy:370, r:10 },
]
const BACK_ZONES = [
  { id:'nuca',          label:'Nuca/Cabeza',        cx:100, cy:26,  r:20 },
  { id:'cervical',      label:'Cervical',           cx:100, cy:54,  r:11 },
  { id:'trap_d',        label:'Trapecio Der.',      cx:68,  cy:70,  r:13 },
  { id:'trap_i',        label:'Trapecio Izq.',      cx:132, cy:70,  r:13 },
  { id:'espalda_alta',  label:'Espalda Alta',       cx:100, cy:95,  r:16 },
  { id:'tricep_d',      label:'Trícep Der.',        cx:53,  cy:110, r:12 },
  { id:'tricep_i',      label:'Trícep Izq.',        cx:147, cy:110, r:12 },
  { id:'lumbar',        label:'Lumbar',             cx:100, cy:148, r:16 },
  { id:'gluteo_d',      label:'Glúteo Der.',        cx:82,  cy:182, r:14 },
  { id:'gluteo_i',      label:'Glúteo Izq.',        cx:118, cy:182, r:14 },
  { id:'isquio_d',      label:'Isquiotibial Der.',  cx:80,  cy:228, r:15 },
  { id:'isquio_i',      label:'Isquiotibial Izq.',  cx:120, cy:228, r:15 },
  { id:'corva_d',       label:'Corva Der.',         cx:80,  cy:262, r:12 },
  { id:'corva_i',       label:'Corva Izq.',         cx:120, cy:262, r:12 },
  { id:'gemelo_d',      label:'Gemelo Der.',        cx:78,  cy:305, r:13 },
  { id:'gemelo_i',      label:'Gemelo Izq.',        cx:122, cy:305, r:13 },
  { id:'talon_d',       label:'Talón Der.',         cx:78,  cy:345, r:10 },
  { id:'talon_i',       label:'Talón Izq.',         cx:122, cy:345, r:10 },
  { id:'planta_d',      label:'Planta Pie Der.',    cx:76,  cy:370, r:10 },
  { id:'planta_i',      label:'Planta Pie Izq.',    cx:124, cy:370, r:10 },
]

function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front')
  const zones = side === 'front' ? FRONT_ZONES : BACK_ZONES

  // Image coords: the xray image fills the SVG (viewBox 0 0 200 400)
  // Front image is the provided xray photo; back we flip it horizontally
  const XRAY_FRONT_B64 = "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"

  function handleSVGClick(e) {
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const scaleX = 200 / rect.width
    const scaleY = 400 / rect.height
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY
    let nearest = null, minDist = 99999
    for (const z of zones) {
      const d = Math.sqrt((x - z.cx) ** 2 + (y - z.cy) ** 2)
      if (d < z.r + 12 && d < minDist) { minDist = d; nearest = z }
    }
    if (nearest) onSelect(nearest.label)
  }

  return (
    <div>
      {/* Toggle frontal/trasero */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['front','FRONTAL'],['back','TRASERO']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s)} style={{
            flex:1, padding:'7px 0', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700,
            letterSpacing:'0.08em',
            border: side===s ? '1.5px solid rgba(56,189,248,.7)' : '1px solid rgba(56,189,248,.2)',
            background: side===s ? 'rgba(56,189,248,.12)' : 'transparent',
            color: side===s ? '#7dd3fc' : 'rgba(125,211,252,.4)',
            transition:'all .15s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
        {/* ── SVG con imagen de rayos X real ── */}
        <div style={{ flexShrink:0, position:'relative' }}>
          <svg
            viewBox="0 0 200 400"
            width="160"
            style={{ cursor:'crosshair', display:'block', filter:'drop-shadow(0 0 18px rgba(56,189,248,.35))' }}
            onClick={handleSVGClick}
          >
            <defs>
              <filter id="xglow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="xglowStrong" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              {/* Tinte azul sobre imagen */}
              <filter id="xrayTint">
                <feColorMatrix type="matrix"
                  values="0.1 0 0.3 0 0.05
                          0.1 0.3 0.5 0 0.05
                          0.2 0.4 1   0 0.1
                          0   0   0   1 0"/>
              </filter>
            </defs>

            {/* Fondo negro */}
            <rect width="200" height="400" fill="#000"/>

            {/* ── Imagen rayos X ── */}
            {/* Usamos la misma imagen para ambas vistas; back se espeja */}
            <image
              href={`data:image/jpeg;base64,${XRAY_FRONT_B64}`}
              x="10" y="10" width="180" height="380"
              preserveAspectRatio="xMidYMid meet"
              filter="url(#xrayTint)"
              style={{ transform: side === 'back' ? 'scaleX(-1) translateX(-200px)' : 'none' }}
            />

            {/* ── ZONAS CLICKEABLES ── */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle
                  key={z.id}
                  cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.5)' : 'rgba(56,189,248,.06)'}
                  stroke={isSel ? '#ef4444' : 'rgba(56,189,248,.22)'}
                  strokeWidth={isSel ? 2.5 : 1.2}
                  style={{ cursor:'pointer', transition:'all .15s' }}
                />
              )
            })}

            {/* ── PIN de zona seleccionada ── */}
            {selected && (() => {
              const z = zones.find(zz => zz.label === selected)
              return z ? (
                <g filter="url(#xglowStrong)">
                  <circle cx={z.cx} cy={z.cy} r={z.r + 5} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.4}/>
                  <circle cx={z.cx} cy={z.cy} r={z.r + 9} fill="none" stroke="#ef4444" strokeWidth="0.8" opacity={0.2}/>
                  <circle cx={z.cx} cy={z.cy} r={9} fill="#ef4444" opacity={0.95}/>
                  <circle cx={z.cx} cy={z.cy} r={3.5} fill="white" opacity={0.95}/>
                </g>
              ) : null
            })()}
          </svg>
          <p style={{ fontSize:9, color:'rgba(125,211,252,.5)', textAlign:'center', marginTop:4, letterSpacing:'0.05em' }}>TOCÁ LA ZONA</p>
        </div>

        {/* ── Lista de zonas ── */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, color:'rgba(125,211,252,.5)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>O elegí:</p>
          <div style={{ maxHeight:220, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
            <button type="button" onClick={() => onSelect('Ningún dolor')} style={{
              padding:'6px 10px', borderRadius:7, fontSize:11, cursor:'pointer', textAlign:'left',
              border: selected==='Ningún dolor' ? '1px solid #4ade80' : '1px solid rgba(74,222,128,.18)',
              background: selected==='Ningún dolor' ? 'rgba(74,222,128,.12)' : 'transparent',
              color: selected==='Ningún dolor' ? '#4ade80' : 'rgba(125,211,252,.5)',
              fontWeight: selected==='Ningún dolor' ? 700 : 400,
              transition:'all .1s',
            }}>✓ Ningún dolor</button>
            {zones.map(z => (
              <button key={z.id} type="button" onClick={() => onSelect(z.label)} style={{
                padding:'5px 10px', borderRadius:7, fontSize:11, cursor:'pointer', textAlign:'left',
                border: selected===z.label ? '1px solid #ef4444' : '1px solid rgba(56,189,248,.12)',
                background: selected===z.label ? 'rgba(239,68,68,.12)' : 'transparent',
                color: selected===z.label ? '#f87171' : 'rgba(125,211,252,.6)',
                fontWeight: selected===z.label ? 600 : 400,
                transition:'all .1s',
              }}>{z.label}</button>
            ))}
          </div>
          {selected && (
            <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8 }}>
              <p style={{ fontSize:12, color:'#f87171', fontWeight:600, marginBottom:3 }}>📍 {selected}</p>
              <button type="button" onClick={() => onSelect(null)} style={{ fontSize:10, color:'rgba(125,211,252,.5)', background:'none', border:'none', cursor:'pointer' }}>× Limpiar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Already completed today ───────────────────────────────────────────────────
function AlreadyCompleted({ data, onBack }) {
  const total = WK.reduce((s,k) => s + (Number(data[k])||0), 0)
  const rd = !total ? null : total <= 12 ? {label:'Listo para entrenar',color:'#c8f135'} : total <= 18 ? {label:'Atención Wellness',color:'#f59e0b'} : {label:'Bajar Carga',color:'#ef4444'}

  return (
    <div className="anim-up" style={{ textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(200,241,53,.1)', border:'2px solid var(--lime)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>✓</div>
      <h3 className="display" style={{ fontSize:32, color:'var(--lime)', marginBottom:6 }}>YA COMPLETASTE HOY</h3>
      <p style={{ fontSize:13, color:'var(--silver)', marginBottom:20 }}>Solo podés completar el wellness una vez por día.</p>

      {rd && (
        <div style={{ marginBottom:16, padding:'10px 20px', borderRadius:12, background:`${rd.color}15`, border:`1px solid ${rd.color}44`, display:'inline-block' }}>
          <span style={{ fontSize:13, fontWeight:700, color:rd.color }}>Readiness: {rd.label} ({total}/25)</span>
        </div>
      )}

      <div style={{ background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:14, padding:20, textAlign:'left', marginBottom:20 }}>
        <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>Tu registro · {data.fecha}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
          {WK.map((k,i) => {
            const v = Number(data[k])||0
            const col = WC[v-1]||'#888'
            return (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:12, color:'var(--silver)', minWidth:52 }}>{WL[i]}</span>
                <div style={{ flex:1, height:6, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${v*20}%`, height:'100%', background:col, borderRadius:3 }} />
                </div>
                <span style={{ fontSize:13, fontFamily:'DM Mono,monospace', fontWeight:600, color:col, minWidth:16 }}>{v}</span>
              </div>
            )
          })}
        </div>
        {data.tqr > 0 && (
          <div style={{ background:'var(--ink2)', borderRadius:8, padding:'10px', textAlign:'center', border:'1px solid var(--mist)', marginBottom:10 }}>
            <div style={{ fontSize:22, fontFamily:'DM Mono,monospace', fontWeight:600, color:TQR_COLORS[data.tqr]||'var(--lime)' }}>{data.tqr}</div>
            <div style={{ fontSize:10, color:'var(--silver)' }}>TQR — {TQR_LABELS[data.tqr]}</div>
          </div>
        )}
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          <span style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:data.entrena_grupo?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)', color:data.entrena_grupo?'#4ade80':'#f87171', border:`1px solid ${data.entrena_grupo?'rgba(34,197,94,.3)':'rgba(239,68,68,.3)'}`, fontWeight:600 }}>
            {data.entrena_grupo ? '✓ Entrena con el grupo' : '✗ No entrena con el grupo'}
          </span>
          {data.fue_gimnasio && <span style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:'rgba(200,241,53,.08)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.2)', fontWeight:600 }}>🏋 Fue al gimnasio</span>}
          {data.dolor_zona && <span style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:'rgba(239,68,68,.08)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', fontWeight:600 }}>📍 {data.dolor_zona}</span>}
          {data.dolor_eva != null && data.dolor_eva > 0 && <span style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:'rgba(239,68,68,.08)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', fontWeight:600 }}>EVA: {data.dolor_eva}/10</span>}
        </div>
      </div>
      <button className="btn-ghost" onClick={onBack} style={{ width:'100%', padding:12 }}>← Volver al inicio</button>
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export default function WellnessForm({ jugadorId, onSuccess, todayWellness }) {
  const [vals, setVals] = useState({ fatiga:null, calidad_sueno:null, dolor_muscular:null, nivel_estres:null, estado_animo:null })
  const [tqr, setTqr] = useState(null)
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [dolorEva, setDolorEva] = useState(null)
  const [entrenaGrupo, setEntrenaGrupo] = useState(null)
  const [fueGimnasio, setFueGimnasio] = useState(null)
  const [gruposMusculares, setGruposMusculares] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (todayWellness) return <AlreadyCompleted data={todayWellness} onBack={onSuccess} />

  // Mostrar mapa corporal cuando dolor >= 2 (algo de dolor)
  const showBodyMap = vals.dolor_muscular !== null && vals.dolor_muscular >= 2
  // Mostrar EVA cuando se seleccionó zona
  const showEVA = showBodyMap && zonaSeleccionada !== null

  const allFilled = Object.values(vals).every(v => v !== null) && tqr !== null && entrenaGrupo !== null && fueGimnasio !== null && (!showBodyMap || zonaSeleccionada !== null || vals.dolor_muscular < 2) && (!showEVA || dolorEva !== null)

  const filledCount = Object.values(vals).filter(v=>v!==null).length + (tqr?1:0) + (entrenaGrupo!==null?1:0) + (fueGimnasio!==null?1:0)
  const totalFields = 5 + 1 + 1 + 1 // wellness + tqr + entrena + gimnasio

  async function submit(e) {
    e.preventDefault()
    if (!allFilled) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/wellness', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          jugador_id:jugadorId, ...vals,
          dolor_zona: zonaSeleccionada||null,
          dolor_eva: dolorEva,
          tqr, recovery: tqr,
          entrena_grupo:entrenaGrupo,
          fue_gimnasio:fueGimnasio,
          grupos_musculares:gruposMusculares||null,
        })
      })
      if (!res.ok) { const d=await res.json(); setError(d.error||'Error'); return }
      setDone(true); setTimeout(() => { setDone(false); onSuccess() }, 1600)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  if (done) return (
    <div style={{ textAlign:'center', padding:'48px 0' }} className="anim-up">
      <div style={{ width:64, height:64, background:'rgba(200,241,53,.1)', border:'2px solid var(--lime)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>✓</div>
      <p style={{ color:'var(--lime)', fontWeight:600, fontSize:16 }}>Wellness registrado correctamente</p>
    </div>
  )

  const radioBtn = (label, selected, onClick, col) => (
    <button type="button" onClick={onClick} style={{ flex:1, padding:'12px 8px', borderRadius:8, cursor:'pointer', textAlign:'center', border:selected?`2px solid ${col}`:'1px solid var(--fog)', background:selected?`${col}20`:'var(--ink3)', color:selected?col:'var(--silver)', fontSize:13, fontWeight:selected?600:400, transition:'all .12s' }}>{label}</button>
  )

  const sectionHead = (text) => (
    <div style={{ borderTop:'1px solid var(--mist)', paddingTop:20, marginTop:4 }}>
      <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{text}</p>
    </div>
  )

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Bienestar General (1 = Mejor · 5 = Peor)</p>

      {FIELDS.map((f) => (
        <div key={f.key}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{f.label}</label>
          <ScaleInput id={f.key} value={vals[f.key]} onChange={v => setVals(p=>({...p,[f.key]:v}))} lowLabel={f.low} highLabel={f.high} />

          {/* Body map aparece justo debajo de Dolor Muscular si valor >= 2 */}
          {f.key === 'dolor_muscular' && showBodyMap && (
            <div style={{ marginTop:14 }}>
              <div style={{ background:'var(--ink3)', border:'1px solid rgba(239,68,68,.2)', borderRadius:12, padding:16, marginBottom: showEVA ? 12 : 0 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12 }}>📍 ¿En qué parte sentís dolor o molestia?</p>
                <BodyMap onSelect={(z) => { setZonaSeleccionada(z); if (!z) setDolorEva(null) }} selected={zonaSeleccionada} />
              </div>
              {/* EVA aparece cuando hay zona seleccionada */}
              {showEVA && <EVAScale value={dolorEva} onChange={setDolorEva} />}
            </div>
          )}
        </div>
      ))}

      {sectionHead('Total Quality Recovery (TQR)')}
      <p style={{ fontSize:12, color:'var(--silver)', marginTop:-14 }}>¿Qué tan recuperado estás de la última sesión?</p>
      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
          TQR {tqr && <span style={{ color:TQR_COLORS[tqr]||'var(--lime)', fontWeight:400, textTransform:'none', letterSpacing:'normal', marginLeft:8 }}>{TQR_LABELS[tqr]}</span>}
        </label>
        <div style={{ display:'flex', gap:6 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => {
            const active = tqr === v
            const col = TQR_COLORS[v]
            return (
              <button key={v} type="button" onClick={()=>setTqr(v)} style={{ flex:1, padding:'10px 4px', borderRadius:8, border:active?`2px solid ${col}`:'1px solid var(--fog)', background:active?`${col}25`:'var(--ink3)', color:active?col:'var(--silver)', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:active?700:500, cursor:'pointer', transition:'all .12s', textAlign:'center' }}>
                {v}
              </button>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:4 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => <div key={v} style={{ flex:1, height:3, borderRadius:2, background:TQR_COLORS[v], opacity:tqr===v?1:0.3 }} />)}
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          <span style={{ fontSize:10, color:'var(--silver)' }}>Muy mal recuperado</span>
          <span style={{ fontSize:10, color:'var(--silver)' }}>Completamente recuperado</span>
        </div>
      </div>

      {sectionHead('Disponibilidad del Día')}
      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>¿Entrenás con el grupo hoy?</label>
        <div style={{ display:'flex', gap:10 }}>
          {radioBtn('✓  SÍ — Con el grupo', entrenaGrupo===true, ()=>setEntrenaGrupo(true), '#22c55e')}
          {radioBtn('✗  NO — Diferenciado', entrenaGrupo===false, ()=>setEntrenaGrupo(false), '#ef4444')}
        </div>
      </div>
      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>¿Fuiste al gimnasio esta mañana?</label>
        <div style={{ display:'flex', gap:10 }}>
          {radioBtn('✓  SÍ', fueGimnasio===true, ()=>setFueGimnasio(true), 'var(--lime)')}
          {radioBtn('✗  NO', fueGimnasio===false, ()=>setFueGimnasio(false), 'var(--silver)')}
        </div>
      </div>
      {fueGimnasio === true && (
        <div>
          <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Grupos musculares trabajados</label>
          <input className="wp-input" value={gruposMusculares} onChange={e=>setGruposMusculares(e.target.value)} placeholder="ej: Cuádriceps, Core, Isquiotibiales..." />
        </div>
      )}

      {error && <p style={{ fontSize:12, color:'#f87171' }}>{error}</p>}

      <button type="submit" className="btn-lime" disabled={!allFilled||loading} style={{ width:'100%', padding:14, fontSize:14, marginTop:4 }}>
        {loading ? 'ENVIANDO...' : `ENVIAR WELLNESS → (${filledCount}/${totalFields})`}
      </button>
    </form>
  )
}
