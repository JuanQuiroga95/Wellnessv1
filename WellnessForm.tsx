'use client'
import { useState } from 'react'
import ScaleInput from '@/components/ui/ScaleInput'

// ── CONFIGURACIÓN DE ESCALAS ──────────────────────────────────────────────────
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

// ── COMPONENTE: BODY MAP PROFESIONAL ──────────────────────────────────────────
const FRONT_ZONES = [
  { id:'cabeza_f',      label:'Cabeza',             top: '5%',   left: '50%' },
  { id:'cuello_f',      label:'Cuello',             top: '13%',  left: '50%' },
  { id:'hombro_d',      label:'Hombro Der.',        top: '18%',  left: '36%' },
  { id:'hombro_i',      label:'Hombro Izq.',        top: '18%',  left: '64%' },
  { id:'pecho',         label:'Pecho',              top: '23%',  left: '50%' },
  { id:'bicep_d',       label:'Bícep Der.',         top: '28%',  left: '30%' },
  { id:'bicep_i',       label:'Bícep Izq.',         top: '28%',  left: '70%' },
  { id:'abdomen',       label:'Abdomen',            top: '35%',  left: '50%' },
  { id:'antebrazo_d',   label:'Antebrazo Der.',     top: '40%',  left: '25%' },
  { id:'antebrazo_i',   label:'Antebrazo Izq.',     top: '40%',  left: '75%' },
  { id:'ingle_d',       label:'Ingle/Cadera Der.',  top: '48%',  left: '42%' },
  { id:'ingle_i',       label:'Ingle/Cadera Izq.',  top: '48%',  left: '58%' },
  { id:'cuad_d',        label:'Cuádricep Der.',     top: '60%',  left: '40%' },
  { id:'cuad_i',        label:'Cuádricep Izq.',     top: '60%',  left: '60%' },
  { id:'rodilla_d',     label:'Rodilla Der.',       top: '72%',  left: '40%' },
  { id:'rodilla_i',     label:'Rodilla Izq.',       top: '72%',  left: '60%' },
  { id:'tibia_d',       label:'Tibia Der.',         top: '82%',  left: '38%' },
  { id:'tibia_i',       label:'Tibia Izq.',         top: '82%',  left: '62%' },
  { id:'tobillo_d',     label:'Tobillo Der.',       top: '90%',  left: '38%' },
  { id:'tobillo_i',     label:'Tobillo Izq.',       top: '90%',  left: '62%' },
]

const BACK_ZONES = [
  { id:'nuca',          label:'Nuca/Cabeza',        top: '5%',   left: '50%' },
  { id:'cervical',      label:'Cervical',           top: '13%',  left: '50%' },
  { id:'trap_d',        label:'Trapecio Der.',      top: '17%',  left: '40%' },
  { id:'trap_i',        label:'Trapecio Izq.',      top: '17%',  left: '60%' },
  { id:'espalda_alta',  label:'Espalda Alta',       top: '25%',  left: '50%' },
  { id:'tricep_d',      label:'Trícep Der.',        top: '28%',  left: '30%' },
  { id:'tricep_i',      label:'Trícep Izq.',        top: '28%',  left: '70%' },
  { id:'lumbar',        label:'Lumbar',             top: '42%',  left: '50%' },
  { id:'gluteo_d',      label:'Glúteo Der.',        top: '52%',  left: '40%' },
  { id:'gluteo_i',      label:'Glúteo Izq.',        top: '52%',  left: '60%' },
  { id:'isquio_d',      label:'Isquiotibial Der.',  top: '65%',  left: '40%' },
  { id:'isquio_i',      label:'Isquiotibial Izq.',  top: '65%',  left: '60%' },
  { id:'gemelo_d',      label:'Gemelo Der.',        top: '82%',  left: '38%' },
  { id:'gemelo_i',      label:'Gemelo Izq.',        top: '82%',  left: '62%' },
  { id:'talon_d',       label:'Talón Der.',         top: '92%',  left: '38%' },
  { id:'talon_i',       label:'Talón Izq.',         top: '92%',  left: '62%' },
]

function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front')
  const zones = side === 'front' ? FRONT_ZONES : BACK_ZONES

  // Imágenes de anatomía profesional (Reemplazar con archivos locales en /public si es posible)
  const bodyImage = side === 'front' 
    ? "https://www.visiblebody.com/hubfs/Learn%20Articles/Muscular%20System/Muscle_Anatomy_Overview_1.png"
    : "https://www.visiblebody.com/hubfs/Learn%20Articles/Muscular%20System/Muscle_Anatomy_Overview_2.png"

  return (
    <div style={{ background: 'var(--ink2)', borderRadius: 16, padding: 12, border: '1px solid var(--mist)' }}>
      <div style={{ display:'flex', gap:8, marginBottom:16 }}>
        {[['front','FRONTAL'],['back','DORSAL']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s)} style={{
            flex:1, padding:'10px 0', borderRadius:10, cursor:'pointer', fontSize:10, fontWeight:800,
            letterSpacing:'1px',
            border: side===s ? '2px solid #ef4444' : '1px solid var(--mist)',
            background: side===s ? 'rgba(239,68,68,0.1)' : 'transparent',
            color: side===s ? '#fff' : 'var(--silver)',
            transition:'all .2s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:16, alignItems:'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ 
          position:'relative', width: 160, height: 340, background: '#000', borderRadius: 12,
          overflow: 'hidden', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9)', border: '1px solid #222'
        }}>
          <img src={bodyImage} alt="Anatomy" style={{ 
            width: '100%', height: '100%', objectFit: 'contain', opacity: 0.6,
            filter: 'grayscale(100%) brightness(0.9) contrast(1.1)' 
          }} />

          {zones.map(z => {
            const isSel = selected === z.label
            return (
              <button key={z.id} type="button" onClick={() => onSelect(z.label)} style={{
                position: 'absolute', top: z.top, left: z.left, transform: 'translate(-50%, -50%)',
                width: isSel ? 20 : 12, height: isSel ? 20 : 12, borderRadius: '50%',
                background: isSel ? '#ef4444' : 'rgba(255,255,255,0.2)',
                border: isSel ? '2px solid #fff' : '1px solid rgba(255,255,255,0.4)',
                cursor: 'pointer', zIndex: isSel ? 10 : 5,
                boxShadow: isSel ? '0 0 12px #ef4444' : 'none',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }} />
            )
          })}
        </div>

        <div style={{ flex:1, minWidth: 140 }}>
          <p style={{ fontSize:10, color:'var(--silver)', fontWeight:700, marginBottom:8, textTransform:'uppercase' }}>Zonas</p>
          <div style={{ maxHeight:280, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
            <button type="button" onClick={() => onSelect('Ningún dolor')} style={{
              padding:'8px 10px', borderRadius:8, fontSize:11, cursor:'pointer', textAlign:'left',
              border: selected==='Ningún dolor' ? '1px solid #4ade80' : '1px solid var(--mist)',
              background: selected==='Ningún dolor' ? 'rgba(74,222,128,0.1)' : 'var(--ink3)',
              color: selected==='Ningún dolor' ? '#4ade80' : 'var(--silver)',
              fontWeight: 700
            }}>✓ Sin molestias</button>
            
            {zones.map(z => (
              <button key={z.id} type="button" onClick={() => onSelect(z.label)} style={{
                padding:'7px 10px', borderRadius:8, fontSize:11, cursor:'pointer', textAlign:'left',
                border: selected===z.label ? '1px solid #ef4444' : '1px solid var(--mist)',
                background: selected===z.label ? 'rgba(239,68,68,0.1)' : 'var(--ink3)',
                color: selected===z.label ? '#fff' : 'var(--silver)',
              }}>{z.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE: ESCALA EVA ────────────────────────────────────────────────────
function EVAScale({ value, onChange }) {
  return (
    <div style={{ background:'var(--ink3)', border:'1px solid rgba(239,68,68,.25)', borderRadius:12, padding:16 }} className="anim-up">
      <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
        📊 Intensidad del Dolor (EVA)
      </p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop: 10 }}>
        {EVA_LEVELS.map(l => {
          const active = value === l.val
          return (
            <button key={l.val} type="button" onClick={()=>onChange(l.val)} style={{
              flex:1, minWidth:80, padding:'12px 6px', borderRadius:10, cursor:'pointer', textAlign:'center',
              border: active ? `2px solid ${l.color}` : '1px solid var(--fog)',
              background: active ? `${l.color}25` : 'var(--ink2)',
              transition:'all .12s',
            }}>
              <div style={{ fontSize:20, marginBottom:4 }}>{l.emoji}</div>
              <div style={{ fontSize:10, fontWeight:active?700:500, color:active?l.color:'var(--silver)', lineHeight:1.2 }}>{l.label}</div>
              <div className="mono" style={{ fontSize:10, color:active?l.color:'var(--fog)', marginTop:3 }}>{l.val}/10</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── VISTA: YA COMPLETADO ───────────────────────────────────────────────────────
function AlreadyCompleted({ data, onBack }) {
  const total = WK.reduce((s,k) => s + (Number(data[k])||0), 0)
  const rd = !total ? null : total <= 12 ? {label:'Listo para entrenar',color:'#c8f135'} : total <= 18 ? {label:'Atención Wellness',color:'#f59e0b'} : {label:'Bajar Carga',color:'#ef4444'}

  return (
    <div className="anim-up" style={{ textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(200,241,53,.1)', border:'2px solid var(--lime)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>✓</div>
      <h3 className="display" style={{ fontSize:32, color:'var(--lime)', marginBottom:6 }}>YA COMPLETASTE HOY</h3>
      <p style={{ fontSize:13, color:'var(--silver)', marginBottom:20 }}>Registro diario finalizado.</p>
      {rd && (
        <div style={{ marginBottom:16, padding:'10px 20px', borderRadius:12, background:`${rd.color}15`, border:`1px solid ${rd.color}44`, display:'inline-block' }}>
          <span style={{ fontSize:13, fontWeight:700, color:rd.color }}>Readiness: {rd.label} ({total}/25)</span>
        </div>
      )}
      <button className="btn-ghost" onClick={onBack} style={{ width:'100%', padding:12 }}>← Volver al inicio</button>
    </div>
  )
}

// ── FORMULARIO PRINCIPAL ──────────────────────────────────────────────────────
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

  const allFilled = Object.values(vals).every(v => v !== null) && tqr !== null && entrenaGrupo !== null && fueGimnasio !== null && (!showBodyMap || zonaSeleccionada !== null) && (!showEVA || dolorEva !== null)
  const filledCount = Object.values(vals).filter(v=>v!==null).length + (tqr?1:0) + (entrenaGrupo!==null?1:0) + (fueGimnasio!==null?1:0)
  const totalFields = 8

  async function submit(e) {
    e.preventDefault()
    if (!allFilled) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/wellness', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          jugador_id:jugadorId, ...vals,
          dolor_zona: zonaSeleccionada,
          dolor_eva: dolorEva,
          tqr, entrena_grupo:entrenaGrupo,
          fue_gimnasio:fueGimnasio,
          grupos_musculares:gruposMusculares||null,
        })
      })
      if (!res.ok) throw new Error('Error al enviar')
      setDone(true); setTimeout(() => { setDone(false); onSuccess() }, 1600)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const radioBtn = (label, selected, onClick, col) => (
    <button type="button" onClick={onClick} style={{ flex:1, padding:'12px 8px', borderRadius:8, cursor:'pointer', border:selected?`2px solid ${col}`:'1px solid var(--fog)', background:selected?`${col}20`:'var(--ink3)', color:selected?col:'var(--silver)', fontSize:13, fontWeight:selected?600:400, transition:'all .12s' }}>{label}</button>
  )

  if (done) return <div style={{ textAlign:'center', padding:'48px 0' }} className="anim-up"><p style={{ color:'var(--lime)', fontWeight:600 }}>✓ Wellness registrado</p></div>

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Bienestar (1: Mejor · 5: Peor)</p>

      {FIELDS.map((f) => (
        <div key={f.key}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', marginBottom:8 }}>{f.label}</label>
          <ScaleInput id={f.key} value={vals[f.key]} onChange={v => setVals(p=>({...p,[f.key]:v}))} lowLabel={f.low} highLabel={f.high} />

          {f.key === 'dolor_muscular' && showBodyMap && (
            <div style={{ marginTop:14 }} className="anim-up">
              <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', marginBottom:12 }}>📍 Localización del dolor</p>
              <BodyMap onSelect={(z) => { setZonaSeleccionada(z); if (z==='Ningún dolor') setDolorEva(0) }} selected={zonaSeleccionada} />
              {showEVA && <div style={{ marginTop: 12 }}><EVAScale value={dolorEva} onChange={setDolorEva} /></div>}
            </div>
          )}
        </div>
      ))}

      <div style={{ borderTop:'1px solid var(--mist)', paddingTop:20 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', marginBottom:8 }}>Recuperación TQR (1-10)</label>
        <div style={{ display:'flex', gap:4 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => (
            <button key={v} type="button" onClick={()=>setTqr(v)} style={{ flex:1, padding:'10px 0', borderRadius:6, border:tqr===v?`2px solid ${TQR_COLORS[v]}`:'1px solid var(--fog)', background:tqr===v?`${TQR_COLORS[v]}25`:'var(--ink3)', color:tqr===v?TQR_COLORS[v]:'var(--silver)', fontSize:12, fontWeight:700, cursor:'pointer' }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <label style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase' }}>¿Entrenás hoy?</label>
        <div style={{ display:'flex', gap:10 }}>
          {radioBtn('SÍ - Grupo', entrenaGrupo===true, ()=>setEntrenaGrupo(true), '#22c55e')}
          {radioBtn('NO - Difer.', entrenaGrupo===false, ()=>setEntrenaGrupo(false), '#ef4444')}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <label style={{ fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase' }}>¿Gimnasio hoy?</label>
        <div style={{ display:'flex', gap:10 }}>
          {radioBtn('SÍ', fueGimnasio===true, ()=>setFueGimnasio(true), 'var(--lime)')}
          {radioBtn('NO', fueGimnasio===false, ()=>setFueGimnasio(false), 'var(--silver)')}
        </div>
      </div>

      {error && <p style={{ fontSize:12, color:'#f87171' }}>{error}</p>}
      <button type="submit" className="btn-lime" disabled={!allFilled||loading} style={{ width:'100%', padding:16, fontSize:14 }}>
        {loading ? 'ENVIANDO...' : `ENVIAR WELLNESS (${filledCount}/${totalFields})`}
      </button>
    </form>
  )
}
