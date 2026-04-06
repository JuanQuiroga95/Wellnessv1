'use client'
import { useState } from 'react'
import ScaleInput from '@/components/ui/ScaleInput'

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

// ── COMPONENTE: DIBUJO ANATÓMICO INTERACTIVO ──────────────────────────────────
function BodyVisual({ side, selected, onSelect }) {
  const isFront = side === 'front';
  const activeStyle = { fill: 'rgba(239, 68, 68, 0.3)', stroke: '#ef4444', strokeWidth: '3' };
  const idleStyle = { fill: 'transparent', stroke: 'currentColor', strokeWidth: '1.5' };

  return (
    <svg 
      viewBox="0 0 350 850" 
      className="w-[180px] h-auto transition-all"
      style={{ filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.1))' }}
    >
      <g className="text-slate-700 hover:text-blue-400 transition-colors">
        {isFront ? (
          <>
            {/* Cabeza */}
            <path d="M175 45c-20 0-35 15-35 40 0 20 10 35 35 35s35-15 35-35c0-25-15-40-35-40z" 
                  style={selected === 'Cabeza' ? activeStyle : idleStyle} onClick={() => onSelect('Cabeza')} />
            {/* Pecho */}
            <path d="M125 150c-15 5-25 30-25 50 0 40 25 50 75 50s75-10 75-50c0-20-10-45-25-50" 
                  style={selected === 'Pecho' ? activeStyle : idleStyle} onClick={() => onSelect('Pecho')} />
            {/* Abdomen */}
            <path d="M140 260h70M140 300h70M140 340h70M140 380h70" 
                  style={selected === 'Abdomen' ? activeStyle : idleStyle} onClick={() => onSelect('Abdomen')} />
            {/* Brazos */}
            <path d="M100 160c-20 10-30 40-40 80s-15 150-10 200" 
                  style={selected === 'Bícep Der.' ? activeStyle : idleStyle} onClick={() => onSelect('Bícep Der.')} />
            <path d="M250 160c20 10 30 40 40 80s15 150 10 200" 
                  style={selected === 'Bícep Izq.' ? activeStyle : idleStyle} onClick={() => onSelect('Bícep Izq.')} />
            {/* Piernas */}
            <path d="M140 430c-10 50-20 150-15 250" 
                  style={selected === 'Cuádricep Der.' ? activeStyle : idleStyle} onClick={() => onSelect('Cuádricep Der.')} />
            <path d="M210 430c10 50 20 150 15 250" 
                  style={selected === 'Cuádricep Izq.' ? activeStyle : idleStyle} onClick={() => onSelect('Cuádricep Izq.')} />
          </>
        ) : (
          <>
            {/* Espalda Alta */}
            <path d="M125 150c-10 10-25 40-25 80 0 60 40 100 75 100s75-40 75-100" 
                  style={selected === 'Espalda Alta' ? activeStyle : idleStyle} onClick={() => onSelect('Espalda Alta')} />
            {/* Glúteos */}
            <path d="M130 430c0 40 20 70 45 70s45-30 45-70" 
                  style={selected === 'Glúteo Der.' ? activeStyle : idleStyle} onClick={() => onSelect('Glúteo Der.')} />
            {/* Isquios */}
            <path d="M140 500c-5 60-15 180-10 300" 
                  style={selected === 'Isquiotibial Der.' ? activeStyle : idleStyle} onClick={() => onSelect('Isquiotibial Der.')} />
            <path d="M210 500c5 60 15 180 10 300" 
                  style={selected === 'Isquiotibial Izq.' ? activeStyle : idleStyle} onClick={() => onSelect('Isquiotibial Izq.')} />
          </>
        )}
      </g>
    </svg>
  );
}

// ── COMPONENTE: BODY MAP (Selector Frontal/Trasero y Lista) ───────────────────
function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front')
  const zones = side === 'front' ? 
    ['Cabeza', 'Cuello', 'Hombro Der.', 'Hombro Izq.', 'Pecho', 'Bícep Der.', 'Bícep Izq.', 'Abdomen', 'Cuádricep Der.', 'Cuádricep Izq.'] : 
    ['Nuca', 'Espalda Alta', 'Lumbar', 'Glúteo Der.', 'Glúteo Izq.', 'Isquiotibial Der.', 'Isquiotibial Izq.', 'Gemelo Der.', 'Gemelo Izq.'];

  return (
    <div className="anim-up">
      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        {[['front','VISTA FRONTAL'],['back','VISTA TRASERA']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s)} style={{
            flex:1, padding:'10px 0', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700,
            border: side===s ? '1.5px solid #ef4444' : '1px solid rgba(239,68,68,.2)',
            background: side===s ? 'rgba(239,68,68,.12)' : 'transparent',
            color: side===s ? '#f87171' : 'var(--silver)',
            transition:'all .15s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
        <div style={{ flexShrink:0, textAlign:'center' }}>
          <BodyVisual side={side} selected={selected} onSelect={onSelect} />
          <p style={{ fontSize:9, color:'rgba(125,211,252,.5)', marginTop:8 }}>TOCÁ LA ZONA</p>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, color:'var(--silver)', marginBottom:8, textTransform:'uppercase' }}>O elegí de la lista:</p>
          <div style={{ maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:4, paddingRight:4 }}>
            <button type="button" onClick={() => onSelect('Ningún dolor')} style={{
              padding:'8px 12px', borderRadius:8, fontSize:12, cursor:'pointer', textAlign:'left',
              border: selected==='Ningún dolor' ? '1px solid #4ade80' : '1px solid var(--mist)',
              color: selected==='Ningún dolor' ? '#4ade80' : 'var(--silver)',
              transition:'all .1s'
            }}>✓ Ningún dolor</button>
            {zones.map(z => (
              <button key={z} type="button" onClick={() => onSelect(z)} style={{
                padding:'8px 12px', borderRadius:8, fontSize:12, cursor:'pointer', textAlign:'left',
                border: selected===z ? '1px solid #ef4444' : '1px solid var(--mist)',
                background: selected===z ? 'rgba(239,68,68,.1)' : 'transparent',
                color: selected===z ? '#f87171' : 'var(--silver)',
                transition:'all .1s'
              }}>{z}</button>
            ))}
          </div>
          {selected && (
            <div style={{ marginTop:12, padding:'12px', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:10 }}>
              <p style={{ fontSize:13, color:'#f87171', fontWeight:600 }}>📍 {selected}</p>
              <button type="button" onClick={() => onSelect(null)} style={{ fontSize:11, color:'rgba(125,211,252,.5)', background:'none', border:'none', cursor:'pointer', marginTop:4 }}>× Limpiar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── COMPONENTE: FORMULARIO PRINCIPAL ──────────────────────────────────────────
export default function WellnessForm({ jugadorId, onSuccess, todayWellness }) {
  const [vals, setVals] = useState({ fatiga:null, calidad_sueno:null, dolor_muscular:null, nivel_estres:null, estado_animo:null })
  const [tqr, setTqr] = useState(null)
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [dolorEva, setDolorEva] = useState(null)
  const [entrenaGrupo, setEntrenaGrupo] = useState(null)
  const [fueGimnasio, setFueGimnasio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (todayWellness) return (
    <div className="anim-up" style={{ textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(200,241,53,.1)', border:'2px solid var(--lime)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>✓</div>
      <h3 className="display" style={{ fontSize:28, color:'var(--lime)', marginBottom:6 }}>WELLNESS COMPLETADO</h3>
      <p style={{ fontSize:14, color:'var(--silver)', marginBottom:24 }}>Mañana podrás registrar uno nuevo.</p>
      <button className="btn-ghost" onClick={onSuccess} style={{ width:'100%', padding:12 }}>← Volver</button>
    </div>
  )

  const showBodyMap = vals.dolor_muscular !== null && vals.dolor_muscular >= 2
  const showEVA = showBodyMap && zonaSeleccionada !== null && zonaSeleccionada !== 'Ningún dolor'

  const allFilled = Object.values(vals).every(v => v !== null) && tqr !== null && entrenaGrupo !== null && fueGimnasio !== null

  async function submit(e) {
    e.preventDefault()
    if (!allFilled) return
    setLoading(true)
    try {
      const res = await fetch('/api/wellness', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ jugador_id:jugadorId, ...vals, dolor_zona: zonaSeleccionada, dolor_eva: dolorEva, tqr, entrena_grupo:entrenaGrupo, fue_gimnasio:fueGimnasio })
      })
      if (res.ok) { setDone(true); setTimeout(onSuccess, 1500) }
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', marginBottom:10 }}>{f.label}</label>
          <ScaleInput id={f.key} value={vals[f.key]} onChange={v => setVals(p=>({...p,[f.key]:v}))} lowLabel={f.low} highLabel={f.high} />
          
          {f.key === 'dolor_muscular' && showBodyMap && (
            <div style={{ marginTop:16, padding:'16px', background:'var(--ink3)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:14 }}>
              <BodyMap onSelect={setZonaSeleccionada} selected={zonaSeleccionada} />
            </div>
          )}
        </div>
      ))}

      {showEVA && (
        <div className="anim-up">
           <ScaleInput 
             id="eva_scale" 
             value={dolorEva} 
             onChange={setDolorEva} 
             lowLabel="Sin dolor" 
             highLabel="Dolor insoportable" 
             max={10} 
           />
           <p style={{ fontSize:11, color:'#f87171', textAlign:'center', marginTop:8 }}>Escala EVA para: {zonaSeleccionada}</p>
        </div>
      )}

      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', marginBottom:10 }}>TQR (Recuperación)</label>
        <div style={{ display:'flex', gap:5 }}>
          {[1,2,3,4,5,6,7,8,9,10].map(v => (
            <button key={v} type="button" onClick={()=>setTqr(v)} style={{ flex:1, padding:'12px 0', borderRadius:8, border:tqr===v?`2px solid ${TQR_COLORS[v]}`:'1px solid var(--fog)', background:tqr===v?`${TQR_COLORS[v]}20`:'var(--ink3)', color:tqr===v?TQR_COLORS[v]:'var(--silver)', fontWeight:tqr===v?700:400 }}>{v}</button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-lime" disabled={!allFilled||loading} style={{ width:'100%', padding:16, fontSize:15, fontWeight:700 }}>
        {loading ? 'ENVIANDO...' : 'REGISTRAR WELLNESS →'}
      </button>
    </form>
  )
}
