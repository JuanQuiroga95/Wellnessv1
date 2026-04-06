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

// ── COMPONENTE: BODY MAP PROFESIONAL ──────────────────────────────────────────
const FRONT_ZONES = [
  { id:'cabeza_f',      label:'Cabeza',             top: '6%',   left: '50%' },
  { id:'cuello_f',      label:'Cuello',             top: '14%',  left: '50%' },
  { id:'hombro_d',      label:'Hombro Der.',        top: '19%',  left: '32%' },
  { id:'hombro_i',      label:'Hombro Izq.',        top: '19%',  left: '68%' },
  { id:'pecho',         label:'Pecho',              top: '25%',  left: '50%' },
  { id:'bicep_d',       label:'Bícep Der.',         top: '29%',  left: '24%' },
  { id:'bicep_i',       label:'Bícep Izq.',         top: '29%',  left: '76%' },
  { id:'abdomen',       label:'Abdomen',            top: '38%',  left: '50%' },
  { id:'antebrazo_d',   label:'Antebrazo Der.',     top: '41%',  left: '18%' },
  { id:'antebrazo_i',   label:'Antebrazo Izq.',     top: '41%',  left: '82%' },
  { id:'ingle_d',       label:'Cuádricep/Ingle D',  top: '55%',  left: '42%' },
  { id:'ingle_i',       label:'Cuádricep/Ingle I',  top: '55%',  left: '58%' },
  { id:'rodilla_d',     label:'Rodilla Der.',       top: '73%',  left: '42%' },
  { id:'rodilla_i',     label:'Rodilla Izq.',       top: '73%',  left: '58%' },
  { id:'tibia_d',       label:'Tibia/Tobillo D',    top: '86%',  left: '43%' },
  { id:'tibia_i',       label:'Tibia/Tobillo I',    top: '86%',  left: '57%' },
]

const BACK_ZONES = [
  { id:'nuca',          label:'Nuca/Cabeza',        top: '6%',   left: '50%' },
  { id:'trap_d',        label:'Trapecio Der.',      top: '17%',  left: '42%' },
  { id:'trap_i',        label:'Trapecio Izq.',      top: '17%',  left: '58%' },
  { id:'espalda_alta',  label:'Espalda Alta',       top: '24%',  left: '50%' },
  { id:'tricep_d',      label:'Trícep Der.',        top: '29%',  left: '24%' },
  { id:'tricep_i',      label:'Trícep Izq.',        top: '29%',  left: '76%' },
  { id:'lumbar',        label:'Lumbar',             top: '41%',  left: '50%' },
  { id:'gluteo_d',      label:'Glúteo Der.',        top: '52%',  left: '41%' },
  { id:'gluteo_i',      label:'Glúteo Izq.',        top: '52%',  left: '59%' },
  { id:'isquio_d',      label:'Isquiotibial Der.',  top: '65%',  left: '41%' },
  { id:'isquio_i',      label:'Isquiotibial Izq.',  top: '65%',  left: '59%' },
  { id:'gemelo_d',      label:'Gemelo Der.',        top: '82%',  left: '41%' },
  { id:'gemelo_i',      label:'Gemelo Izq.',        top: '82%',  left: '59%' },
  { id:'talon_d',       label:'Talón/Planta D',     top: '93%',  left: '42%' },
  { id:'talon_i',       label:'Talón/Planta I',     top: '93%',  left: '58%' },
]

function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front')
  const zones = side === 'front' ? FRONT_ZONES : BACK_ZONES

  // Imagen estilo Rayos X / Muscular profesional (Archivo 3)
  const bodyImage = side === 'front' 
    ? "https://www.visiblebody.com/hubfs/Learn%20Articles/Muscular%20System/Muscle_Anatomy_Overview_1.png"
    : "https://www.visiblebody.com/hubfs/Learn%20Articles/Muscular%20System/Muscle_Anatomy_Overview_2.png"

  return (
    <div style={{ background: '#0a0a0a', borderRadius: 16, padding: 16, border: '1px solid #222', marginTop: 8 }}>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['front','VISTA FRONTAL'],['back','VISTA TRASERA']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s)} style={{
            flex:1, padding:'12px 0', borderRadius:10, cursor:'pointer', fontSize:10, fontWeight:800,
            letterSpacing:'1px',
            border: side===s ? '2px solid #ef4444' : '1px solid #333',
            background: side===s ? 'rgba(239,68,68,0.15)' : 'transparent',
            color: side===s ? '#fff' : '#666',
            transition:'all .2s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:20, alignItems:'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Mapa con Imagen de Fondo Real */}
        <div style={{ 
          position:'relative', width: 200, height: 400, background: '#000', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 0 20px rgba(0,0,0,0.5)', border: '1px solid #1a1a1a'
        }}>
          <img src={bodyImage} alt="Atleta" style={{ 
            width: '100%', height: '100%', objectFit: 'contain', opacity: 0.7,
            filter: 'brightness(0.8) contrast(1.2) hue-rotate(180deg)' // Efecto azulado deportivo
          }} />

          {zones.map(z => {
            const isSel = selected === z.label
            return (
              <button key={z.id} type="button" onClick={() => onSelect(z.label)} style={{
                position: 'absolute', top: z.top, left: z.left, transform: 'translate(-50%, -50%)',
                width: isSel ? 22 : 14, height: isSel ? 22 : 14, borderRadius: '50%',
                background: isSel ? '#ef4444' : 'rgba(239,68,68,0.3)',
                border: isSel ? '2px solid #fff' : '1px solid rgba(239,68,68,0.5)',
                cursor: 'pointer', zIndex: isSel ? 10 : 5,
                boxShadow: isSel ? '0 0 15px #ef4444' : '0 0 5px rgba(0,0,0,0.5)',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }} />
            )
          })}
        </div>

        {/* Lista Lateral */}
        <div style={{ flex:1, minWidth: 160 }}>
          <p style={{ fontSize:10, color:'#555', fontWeight:700, marginBottom:10, textTransform:'uppercase' }}>Selección rápida:</p>
          <div style={{ maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:5, paddingRight: 4 }}>
            <button type="button" onClick={() => onSelect('Ningún dolor')} style={{
              padding:'10px', borderRadius:8, fontSize:11, cursor:'pointer', textAlign:'left',
              border: selected==='Ningún dolor' ? '1px solid #4ade80' : '1px solid #222',
              background: selected==='Ningún dolor' ? 'rgba(74,222,128,0.1)' : '#111',
              color: selected==='Ningún dolor' ? '#4ade80' : '#888',
              fontWeight: 700
            }}>✓ Sin molestias</button>
            
            {zones.map(z => (
              <button key={z.id} type="button" onClick={() => onSelect(z.label)} style={{
                padding:'9px 12px', borderRadius:8, fontSize:11, cursor:'pointer', textAlign:'left',
                border: selected===z.label ? '1px solid #ef4444' : '1px solid #1a1a1a',
                background: selected===z.label ? 'rgba(239,68,68,0.1)' : '#111',
                color: selected===z.label ? '#fff' : '#777',
                transition:'all .1s',
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
    <div style={{ background:'#111', border:'1px solid #222', borderRadius:12, padding:16, marginTop: 12 }}>
      <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
        📊 Intensidad del Dolor (Escala EVA)
      </p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {EVA_LEVELS.map(l => {
          const active = value === l.val
          return (
            <button key={l.val} type="button" onClick={()=>onChange(l.val)} style={{
              flex:1, minWidth:85, padding:'14px 8px', borderRadius:10, cursor:'pointer', textAlign:'center',
              border: active ? `2px solid ${l.color}` : '1px solid #222',
              background: active ? `${l.color}15` : '#0a0a0a',
              transition:'all .12s',
            }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{l.emoji}</div>
              <div style={{ fontSize:10, fontWeight:active?700:500, color:active?l.color:'#666', lineHeight:1.2 }}>{l.label}</div>
              <div className="mono" style={{ fontSize:10, color:active?l.color:'#444', marginTop:3 }}>{l.val}/10</div>
            </button>
          )
        })}
      </div>
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

  const showBodyMap = vals.dolor_muscular !== null && vals.dolor_muscular >= 2
  const showEVA = showBodyMap && zonaSeleccionada !== null && zonaSeleccionada !== 'Ningún dolor'

  const allFilled = Object.values(vals).every(v => v !== null) && tqr !== null && entrenaGrupo !== null && fueGimnasio !== null && (!showBodyMap || zonaSeleccionada !== null) && (!showEVA || dolorEva !== null)

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
      if (!res.ok) throw new Error('Error')
      setDone(true); setTimeout(() => { setDone(false); onSuccess() }, 1600)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  const radioBtn = (label, selected, onClick, col) => (
    <button type="button" onClick={onClick} style={{ flex:1, padding:'14px 10px', borderRadius:10, cursor:'pointer', border:selected?`2px solid ${col}`:'1px solid #222', background:selected?`${col}15`:'#111', color:selected?col:'#666', fontSize:13, fontWeight:selected?700:400, transition:'all .15s' }}>{label}</button>
  )

  if (done) return <div style={{ textAlign:'center', padding:'60px 0' }}><p style={{ color:'var(--lime)', fontWeight:700, fontSize:18 }}>✓ REGISTRO EXITOSO</p></div>

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>{f.label}</label>
          <ScaleInput id={f.key} value={vals[f.key]} onChange={v => setVals(p=>({...p,[f.key]:v}))} lowLabel={f.low} highLabel={f.high} />

          {f.key === 'dolor_muscular' && showBodyMap && (
            <div className="anim-up" style={{ marginTop: 20 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', marginBottom:8 }}>📍 Mapa de Dolor / Molestia</p>
              <BodyMap onSelect={(z) => { setZonaSeleccionada(z); if (z==='Ningún dolor') setDolorEva(0) }} selected={zonaSeleccionada} />
              {showEVA && <EVAScale value={dolorEva} onChange={setDolorEva} />}
            </div>
          )}
        </div>
      ))}

      <div style={{ borderTop:'1px solid #222', paddingTop:24 }}>
        <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', marginBottom:12 }}>Recuperación TQR</label>
        <div style={{ display:'flex', gap:5 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => (
            <button key={v} type="button" onClick={()=>setTqr(v)} style={{ flex:1, padding:'12px 0', borderRadius:8, border:tqr===v?`2px solid ${TQR_COLORS[v]}`:'1px solid #222', background:tqr===v?`${TQR_COLORS[v]}20`:'#111', color:tqr===v?TQR_COLORS[v]:'#555', fontSize:13, fontWeight:800 }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase' }}>¿Entrenás hoy con el grupo?</label>
        <div style={{ display:'flex', gap:10 }}>
          {radioBtn('SÍ - NORMAL', entrenaGrupo===true, ()=>setEntrenaGrupo(true), '#22c55e')}
          {radioBtn('NO - DIFERENCIADO', entrenaGrupo===false, ()=>setEntrenaGrupo(false), '#ef4444')}
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <label style={{ fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase' }}>¿Gimnasio hoy?</label>
        <div style={{ display:'flex', gap:10 }}>
          {radioBtn('SÍ', fueGimnasio===true, ()=>setFueGimnasio(true), 'var(--lime)')}
          {radioBtn('NO', fueGimnasio===false, ()=>setFueGimnasio(false), '#555')}
        </div>
      </div>

      {error && <p style={{ fontSize:12, color:'#f87171', textAlign:'center' }}>{error}</p>}
      <button type="submit" className="btn-lime" disabled={!allFilled||loading} style={{ width:'100%', padding:18, fontSize:14, fontWeight:800, borderRadius:12 }}>
        {loading ? 'PROCESANDO...' : 'ENVIAR WELLNESS DIARIO →'}
      </button>
    </form>
  )
}
