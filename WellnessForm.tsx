'use client'
import { useState } from 'react'
import ScaleInput from '@/components/ui/ScaleInput'

// ── CONSTANTES DE CONFIGURACIÓN (Manteniendo tu lógica original) ─────────────────
const FIELDS = [
  { key:'fatiga',         label:'Fatiga',           low:'Muy fresco',    high:'Muy fatigado'  },
  { key:'calidad_sueno',  label:'Calidad de Sueño', low:'Muy buena',     high:'Muy mala'      },
  { key:'dolor_muscular', label:'Dolor Muscular',   low:'Sin dolor',     high:'Mucho dolor'   },
  { key:'nivel_estres',   label:'Nivel de Estrés',  low:'Muy relajado',  high:'Muy estresado' },
  { key:'estado_animo',   label:'Estado de Ánimo',  low:'Muy alto',      high:'Muy bajo'      },
]

const TQR_LABELS = {
  1:'Muy mal', 2:'Mal', 3:'Bastante mal', 4:'Algo mal', 5:'Moderado',
  6:'Bastante bien', 7:'Bien', 8:'Muy bien', 9:'Excelente', 10:'Completamente recuperado'
}
const TQR_COLORS = ['','#ef4444','#ef4444','#f97316','#f97316','#eab308','#eab308','#22c55e','#22c55e','#c8f135','#c8f135']

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

// ── COMPONENTE: VISUALIZACIÓN ANATÓMICA SVG (Nuevo) ──────────────────────────────
function BodyVisual({ side, selected, onSelect }) {
  const isFront = side === 'front';
  // Estilo cuando el músculo está seleccionado
  const activeClass = "text-red-500 fill-red-500/30 stroke-[3px]";
  // Estilo base
  const idleClass = "text-slate-700 hover:text-blue-400 transition-all cursor-pointer fill-transparent";

  return (
    <svg viewBox="0 0 350 850" className="w-[160px] h-auto drop-shadow-[0_0_15px_rgba(56,189,248,0.2)]">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {isFront ? (
          <>
            <path d="M175 45c-20 0-35 15-35 40 0 20 10 35 35 35s35-15 35-35c0-25-15-40-35-40z" 
                  className={selected === 'Cabeza' ? activeClass : idleClass} onClick={() => onSelect('Cabeza')} />
            <path d="M125 150c-15 5-25 30-25 50 0 40 25 50 75 50s75-10 75-50" 
                  className={selected === 'Pecho' ? activeClass : idleClass} onClick={() => onSelect('Pecho')} />
            <path d="M140 260h70M140 300h70M140 340h70" 
                  className={selected === 'Abdomen' ? activeClass : idleClass} onClick={() => onSelect('Abdomen')} />
            <path d="M100 160c-20 10-30 40-40 80s-15 150-10 200" 
                  className={selected === 'Bícep Der.' ? activeClass : idleClass} onClick={() => onSelect('Bícep Der.')} />
            <path d="M250 160c20 10 30 40 40 80s15 150 10 200" 
                  className={selected === 'Bícep Izq.' ? activeClass : idleClass} onClick={() => onSelect('Bícep Izq.')} />
            <path d="M140 430c-10 50-20 150-15 250" 
                  className={selected === 'Cuádricep Der.' ? activeClass : idleClass} onClick={() => onSelect('Cuádricep Der.')} />
            <path d="M210 430c10 50 20 150 15 250" 
                  className={selected === 'Cuádricep Izq.' ? activeClass : idleClass} onClick={() => onSelect('Cuádricep Izq.')} />
          </>
        ) : (
          <>
            <path d="M125 150c-10 10-25 40-25 80 0 60 40 100 75 100s75-40 75-100" 
                  className={selected === 'Espalda Alta' ? activeClass : idleClass} onClick={() => onSelect('Espalda Alta')} />
            <path d="M130 430c0 40 20 70 45 70s45-30 45-70" 
                  className={selected === 'Glúteo Der.' ? activeClass : idleClass} onClick={() => onSelect('Glúteo Der.')} />
            <path d="M100 160c-25 30-35 80-40 150s5 150 15 240" 
                  className={selected === 'Trícep Der.' ? activeClass : idleClass} onClick={() => onSelect('Trícep Der.')} />
            <path d="M140 500c-5 60-15 180-10 300" 
                  className={selected === 'Isquiotibial Der.' ? activeClass : idleClass} onClick={() => onSelect('Isquiotibial Der.')} />
            <path d="M210 500c5 60 15 180 10 300" 
                  className={selected === 'Isquiotibial Izq.' ? activeClass : idleClass} onClick={() => onSelect('Isquiotibial Izq.')} />
          </>
        )}
      </g>
    </svg>
  );
}

// ── COMPONENTE: MAPA CORPORAL (Lógica de selección) ──────────────────────────────
function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front')
  const zones = side === 'front' ? 
    ['Cabeza', 'Cuello', 'Hombro Der.', 'Hombro Izq.', 'Pecho', 'Bícep Der.', 'Bícep Izq.', 'Abdomen', 'Cuádricep Der.', 'Cuádricep Izq.'] : 
    ['Nuca', 'Espalda Alta', 'Lumbar', 'Glúteo Der.', 'Glúteo Izq.', 'Trícep Der.', 'Trícep Izq.', 'Isquiotibial Der.', 'Isquiotibial Izq.', 'Gemelo Der.', 'Gemelo Izq.'];

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['front','FRONTAL'],['back','TRASERO']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s)} style={{
            flex:1, padding:'7px 0', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700,
            border: side===s ? '1.5px solid rgba(56,189,248,.7)' : '1px solid rgba(56,189,248,.2)',
            background: side===s ? 'rgba(56,189,248,.12)' : 'transparent',
            color: side===s ? '#7dd3fc' : 'rgba(125,211,252,.4)',
            transition:'all .15s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
        <div style={{ flexShrink:0, textAlign:'center' }}>
          <BodyVisual side={side} selected={selected} onSelect={onSelect} />
          <p style={{ fontSize:9, color:'rgba(125,211,252,.5)', marginTop:8 }}>TOCÁ LA ZONA</p>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, color:'rgba(125,211,252,.5)', marginBottom:6, textTransform:'uppercase' }}>O elegí de la lista:</p>
          <div style={{ maxHeight:240, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
            <button type="button" onClick={() => onSelect('Ningún dolor')} style={{
              padding:'6px 10px', borderRadius:7, fontSize:11, cursor:'pointer', textAlign:'left',
              border: selected==='Ningún dolor' ? '1px solid #4ade80' : '1px solid rgba(74,222,128,.18)',
              color: selected==='Ningún dolor' ? '#4ade80' : 'rgba(125,211,252,.5)',
            }}>✓ Ningún dolor</button>
            {zones.map(z => (
              <button key={z} type="button" onClick={() => onSelect(z)} style={{
                padding:'5px 10px', borderRadius:7, fontSize:11, cursor:'pointer', textAlign:'left',
                border: selected===z ? '1px solid #ef4444' : '1px solid rgba(56,189,248,.12)',
                background: selected===z ? 'rgba(239,68,68,.12)' : 'transparent',
                color: selected===z ? '#f87171' : 'rgba(125,211,252,.6)',
              }}>{z}</button>
            ))}
          </div>
          {selected && (
            <div style={{ marginTop:8, padding:'8px 10px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8 }}>
              <p style={{ fontSize:12, color:'#f87171', fontWeight:600 }}>📍 {selected}</p>
              <button type="button" onClick={() => onSelect(null)} style={{ fontSize:10, color:'rgba(125,211,252,.5)', background:'none', border:'none', cursor:'pointer' }}>× Limpiar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE: ESCALA EVA (Sin cambios) ─────────────────────────────────────────
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
    </div>
  )
}

// ── COMPONENTE: PANTALLA YA COMPLETADO (Sin cambios) ──────────────────────────────
function AlreadyCompleted({ data, onBack }) {
  const total = WK.reduce((s,k) => s + (Number(data[k])||0), 0)
  const rd = !total ? null : total <= 12 ? {label:'Listo para entrenar',color:'#c8f135'} : total <= 18 ? {label:'Atención Wellness',color:'#f59e0b'} : {label:'Bajar Carga',color:'#ef4444'}

  return (
    <div className="anim-up" style={{ textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(200,241,53,.1)', border:'2px solid var(--lime)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>✓</div>
      <h3 className="display" style={{ fontSize:32, color:'var(--lime)', marginBottom:6 }}>YA COMPLETASTE HOY</h3>
      <p style={{ fontSize:13, color:'var(--silver)', marginBottom:20 }}>Solo podés completar el wellness una vez por día.</p>
      <button className="btn-ghost" onClick={onBack} style={{ width:'100%', padding:12 }}>← Volver al inicio</button>
    </div>
  )
}

// ── COMPONENTE PRINCIPAL: WELLNESS FORM (Manteniendo toda tu lógica) ──────────────
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

  const showBodyMap = vals.dolor_muscular !== null && vals.dolor_muscular >= 2
  const showEVA = showBodyMap && zonaSeleccionada !== null && zonaSeleccionada !== 'Ningún dolor'

  // Validación de campos llenos
  const allFilled = Object.values(vals).every(v => v !== null) && tqr !== null && entrenaGrupo !== null && fueGimnasio !== null && (!showBodyMap || zonaSeleccionada !== null || vals.dolor_muscular < 2) && (!showEVA || dolorEva !== null)

  const filledCount = Object.values(vals).filter(v=>v!==null).length + (tqr?1:0) + (entrenaGrupo!==null?1:0) + (fueGimnasio!==null?1:0)
  const totalFields = 5 + 1 + 1 + 1 

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

          {f.key === 'dolor_muscular' && showBodyMap && (
            <div style={{ marginTop:14 }}>
              <div style={{ background:'var(--ink3)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:12, padding:16 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', marginBottom:12 }}>📍 ¿En qué parte sentís dolor o molestia?</p>
                <BodyMap onSelect={setZonaSeleccionada} selected={zonaSeleccionada} />
              </div>
              {showEVA && <div style={{marginTop:12}}><EVAScale value={dolorEva} onChange={setDolorEva} /></div>}
            </div>
          )}
        </div>
      ))}

      {sectionHead('Total Quality Recovery (TQR)')}
      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
          TQR {tqr && <span style={{ color:TQR_COLORS[tqr]||'var(--lime)', fontWeight:400, marginLeft:8 }}>{TQR_LABELS[tqr]}</span>}
        </label>
        <div style={{ display:'flex', gap:6 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => (
            <button key={v} type="button" onClick={()=>setTqr(v)} style={{ flex:1, padding:'10px 4px', borderRadius:8, border:tqr===v?`2px solid ${TQR_COLORS[v]}`:'1px solid var(--fog)', background:tqr===v?`${TQR_COLORS[v]}25`:'var(--ink3)', color:tqr===v?TQR_COLORS[v]:'var(--silver)', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:tqr===v?700:500, cursor:'pointer' }}>
              {v}
            </button>
          ))}
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
