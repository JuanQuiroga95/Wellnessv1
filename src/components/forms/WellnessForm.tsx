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
const FRONT_ZONES = [
  { id:'cabeza_f',      label:'Cabeza',             cx:100, cy:25,  r:20 },
  { id:'cuello_f',      label:'Cuello',             cx:100, cy:56,  r:11 },
  { id:'hombro_d',      label:'Hombro Der.',        cx:65,  cy:76,  r:13 },
  { id:'hombro_i',      label:'Hombro Izq.',        cx:135, cy:76,  r:13 },
  { id:'pecho',         label:'Pecho',              cx:100, cy:98,  r:18 },
  { id:'bicep_d',       label:'Bícep Der.',         cx:57,  cy:112, r:11 },
  { id:'bicep_i',       label:'Bícep Izq.',         cx:143, cy:112, r:11 },
  { id:'abdomen',       label:'Abdomen',            cx:100, cy:140, r:16 },
  { id:'antebrazo_d',   label:'Antebrazo Der.',     cx:48,  cy:148, r:10 },
  { id:'antebrazo_i',   label:'Antebrazo Izq.',     cx:152, cy:148, r:10 },
  { id:'ingle_d',       label:'Ingle/Cadera Der.',  cx:83,  cy:178, r:13 },
  { id:'ingle_i',       label:'Ingle/Cadera Izq.',  cx:117, cy:178, r:13 },
  { id:'cuad_d',        label:'Cuádricep Der.',     cx:80,  cy:220, r:15 },
  { id:'cuad_i',        label:'Cuádricep Izq.',     cx:120, cy:220, r:15 },
  { id:'rodilla_d',     label:'Rodilla Der.',       cx:80,  cy:265, r:12 },
  { id:'rodilla_i',     label:'Rodilla Izq.',       cx:120, cy:265, r:12 },
  { id:'tibia_d',       label:'Tibia Der.',         cx:77,  cy:305, r:11 },
  { id:'tibia_i',       label:'Tibia Izq.',         cx:123, cy:305, r:11 },
  { id:'tobillo_d',     label:'Tobillo Der.',       cx:77,  cy:345, r:10 },
  { id:'tobillo_i',     label:'Tobillo Izq.',       cx:123, cy:345, r:10 },
  { id:'empeine_d',     label:'Empeine Der.',       cx:74,  cy:370, r:9  },
  { id:'empeine_i',     label:'Empeine Izq.',       cx:126, cy:370, r:9  },
  { id:'dedo_d',        label:'Dedos Pie Der.',     cx:72,  cy:386, r:8  },
  { id:'dedo_i',        label:'Dedos Pie Izq.',     cx:128, cy:386, r:8  },
]
const BACK_ZONES = [
  { id:'nuca',          label:'Nuca/Cabeza',        cx:100, cy:25,  r:20 },
  { id:'cervical',      label:'Cervical',           cx:100, cy:55,  r:11 },
  { id:'trap_d',        label:'Trapecio Der.',      cx:70,  cy:72,  r:13 },
  { id:'trap_i',        label:'Trapecio Izq.',      cx:130, cy:72,  r:13 },
  { id:'espalda_alta',  label:'Espalda Alta',       cx:100, cy:95,  r:16 },
  { id:'tricep_d',      label:'Trícep Der.',        cx:57,  cy:112, r:11 },
  { id:'tricep_i',      label:'Trícep Izq.',        cx:143, cy:112, r:11 },
  { id:'lumbar',        label:'Lumbar',             cx:100, cy:148, r:16 },
  { id:'gluteo_d',      label:'Glúteo Der.',        cx:82,  cy:183, r:14 },
  { id:'gluteo_i',      label:'Glúteo Izq.',        cx:118, cy:183, r:14 },
  { id:'isquio_d',      label:'Isquiotibial Der.',  cx:80,  cy:230, r:15 },
  { id:'isquio_i',      label:'Isquiotibial Izq.',  cx:120, cy:230, r:15 },
  { id:'corva_d',       label:'Corva Der.',         cx:80,  cy:268, r:12 },
  { id:'corva_i',       label:'Corva Izq.',         cx:120, cy:268, r:12 },
  { id:'gemelo_d',      label:'Gemelo Der.',        cx:77,  cy:308, r:13 },
  { id:'gemelo_i',      label:'Gemelo Izq.',        cx:123, cy:308, r:13 },
  { id:'talon_d',       label:'Talón Der.',         cx:77,  cy:347, r:10 },
  { id:'talon_i',       label:'Talón Izq.',         cx:123, cy:347, r:10 },
  { id:'planta_d',      label:'Planta Pie Der.',    cx:74,  cy:372, r:10 },
  { id:'planta_i',      label:'Planta Pie Izq.',    cx:126, cy:372, r:10 },
]

function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front')
  const zones = side === 'front' ? FRONT_ZONES : BACK_ZONES

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
      if (d < z.r + 10 && d < minDist) { minDist = d; nearest = z }
    }
    if (nearest) onSelect(nearest.label)
  }

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {[['front','Vista Frontal'],['back','Vista Trasera']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s)} style={{
            flex:1, padding:'8px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
            border: side===s ? '2px solid #ef4444' : '1px solid var(--fog)',
            background: side===s ? 'rgba(239,68,68,.1)' : 'var(--ink2)',
            color: side===s ? '#f87171' : 'var(--silver)',
            transition:'all .12s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        {/* SVG Body */}
        <div style={{ flexShrink:0 }}>
          <svg viewBox="0 0 200 400" width="150" style={{ cursor:'crosshair', display:'block' }} onClick={handleSVGClick}>
            {/* ── Athletic body ── */}

            {/* Head */}
            <ellipse cx="100" cy="23" rx="16" ry="19" fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5"/>
            {/* Neck */}
            <rect x="91" y="41" width="18" height="13" rx="4" fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5"/>

            {/* Torso — wide shoulders, V-taper waist, slight hip */}
            <path d="M90,54 L64,57 C58,63 57,78 59,96 L63,138 C64,155 68,168 76,178 L84,188 L100,190 L116,188 L124,178 C132,168 136,155 137,138 L141,96 C143,78 142,63 136,57 L110,54 Z"
              fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5"/>

            {/* Left arm (character's left) — tapered with slight forearm */}
            <path d="M64,57 C56,62 46,76 40,100 L37,150 C36,162 41,170 49,170 C57,170 62,163 62,152 L63,118 C64,98 65,80 68,66 Z"
              fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5"/>
            {/* Right arm */}
            <path d="M136,57 C144,62 154,76 160,100 L163,150 C164,162 159,170 151,170 C143,170 138,163 138,152 L137,118 C136,98 135,80 132,66 Z"
              fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5"/>

            {/* Left leg — thigh wider, tapers to ankle */}
            <path d="M84,188 L81,268 C80,283 79,295 78,322 L75,358 L67,388 L79,390 L84,358 L88,322 L91,290 L93,190 Z"
              fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5"/>
            {/* Right leg */}
            <path d="M116,188 L119,268 C120,283 121,295 122,322 L125,358 L133,388 L121,390 L116,358 L112,322 L109,290 L107,190 Z"
              fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1.5"/>

            {/* Feet */}
            <ellipse cx="73" cy="391" rx="12" ry="5" fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1"/>
            <ellipse cx="127" cy="391" rx="12" ry="5" fill="#1c1c1c" stroke="#3a3a3a" strokeWidth="1"/>

            {/* Front detail: subtle pec/abs lines */}
            {side === 'front' && <>
              <line x1="100" y1="80" x2="100" y2="176" stroke="#2e2e2e" strokeWidth="1" opacity="0.7"/>
              <line x1="72" y1="108" x2="128" y2="108" stroke="#2e2e2e" strokeWidth="0.8" opacity="0.5"/>
              <line x1="74" y1="132" x2="126" y2="132" stroke="#2e2e2e" strokeWidth="0.8" opacity="0.4"/>
            </>}
            {/* Back detail: spine line */}
            {side === 'back' && <>
              <line x1="100" y1="56" x2="100" y2="178" stroke="#2e2e2e" strokeWidth="1.2" opacity="0.7"/>
            </>}
            {/* ── Clickable zones ── */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.7)' : 'rgba(255,255,255,.06)'}
                  stroke={isSel ? '#ef4444' : 'rgba(255,255,255,.12)'}
                  strokeWidth={isSel ? 2 : 1}
                  style={{ cursor:'pointer', transition:'all .12s' }}
                />
              )
            })}
            {/* Selected pin */}
            {selected && (() => {
              const z = zones.find(z => z.label === selected)
              return z ? (
                <g>
                  <circle cx={z.cx} cy={z.cy} r={7} fill="#ef4444" opacity={.9}/>
                  <text x={z.cx} y={z.cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white">✕</text>
                </g>
              ) : null
            })()}
          </svg>
          <p style={{ fontSize:9, color:'var(--silver)', textAlign:'center', marginTop:4 }}>Tocá la zona</p>
        </div>

        {/* Zone list */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, color:'var(--silver)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>O elegí de la lista:</p>
          <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
            {/* Ningún dolor — always first */}
            <button type="button" onClick={() => onSelect('Ningún dolor')} style={{
              padding:'5px 10px', borderRadius:7, fontSize:11, cursor:'pointer', textAlign:'left',
              border: selected==='Ningún dolor' ? '1px solid #4ade80' : '1px solid var(--fog)',
              background: selected==='Ningún dolor' ? 'rgba(74,222,128,.12)' : 'transparent',
              color: selected==='Ningún dolor' ? '#4ade80' : 'var(--silver)',
              fontWeight: selected==='Ningún dolor' ? 600 : 400,
              transition:'all .1s',
            }}>✓ Ningún dolor</button>
            {zones.map(z => (
              <button key={z.id} type="button" onClick={() => onSelect(z.label)} style={{
                padding:'5px 10px', borderRadius:7, fontSize:11, cursor:'pointer', textAlign:'left',
                border: selected===z.label ? '1px solid #ef4444' : '1px solid var(--fog)',
                background: selected===z.label ? 'rgba(239,68,68,.12)' : 'transparent',
                color: selected===z.label ? '#f87171' : 'var(--silver)',
                transition:'all .1s',
              }}>{z.label}</button>
            ))}
          </div>
          {selected && (
            <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8 }}>
              <p style={{ fontSize:12, color:'#f87171', fontWeight:600, marginBottom:3 }}>📍 {selected}</p>
              <button type="button" onClick={() => onSelect(null)} style={{ fontSize:10, color:'var(--silver)', background:'none', border:'none', cursor:'pointer' }}>× Limpiar</button>
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
