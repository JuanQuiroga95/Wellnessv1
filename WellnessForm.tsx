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

const TQR_COLORS = ['','#ef4444','#ef4444','#f97316','#f97316','#eab308','#eab308','#22c55e','#22c55e','#c8f135','#c8f135']
const TQR_LABELS = {
  1:'Muy mal', 2:'Mal', 3:'Bastante mal', 4:'Algo mal', 5:'Moderado',
  6:'Bastante bien', 7:'Bien', 8:'Muy bien', 9:'Excelente', 10:'Completamente recuperado'
}

// ── COMPONENTES INTERNOS DEL MAPA ─────────────────────────────────────────────

function BodyPart({ d, label, selected, onSelect }) {
  const isSelected = selected === label;
  return (
    <path
      d={d}
      onClick={(e) => {
        e.stopPropagation(); // Evita conflictos de eventos
        onSelect(label);
      }}
      style={{
        fill: isSelected ? 'rgba(239, 68, 68, 0.4)' : 'transparent',
        stroke: isSelected ? '#ef4444' : '#475569',
        strokeWidth: isSelected ? 3 : 1.5,
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      className="hover:stroke-blue-400"
    />
  );
}

function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front');
  
  const zones = side === 'front' 
    ? ['Cabeza', 'Pecho', 'Abdomen', 'Bícep Der.', 'Bícep Izq.', 'Cuádricep Der.', 'Cuádricep Izq.'] 
    : ['Espalda Alta', 'Glúteo Der.', 'Glúteo Izq.', 'Isquiotibial Der.', 'Isquiotibial Izq.'];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button 
          type="button" 
          onClick={() => setSide('front')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${side === 'front' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-slate-800 text-slate-500'}`}
        >
          VISTA FRONTAL
        </button>
        <button 
          type="button" 
          onClick={() => setSide('back')}
          className={`flex-1 py-2 rounded-lg text-[11px] font-bold border transition-all ${side === 'back' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-slate-800 text-slate-500'}`}
        >
          VISTA TRASERA
        </button>
      </div>

      <div className="flex gap-6 items-start">
        <div className="shrink-0">
          <svg viewBox="0 0 350 850" className="w-[150px] h-auto">
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {side === 'front' ? (
                <>
                  <BodyPart label="Cabeza" d="M175 45c-20 0-35 15-35 40 0 20 10 35 35 35s35-15 35-35c0-25-15-40-35-40z" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Pecho" d="M125 150c-15 5-25 30-25 50 0 40 25 50 75 50s75-10 75-50c0-20-10-45-25-50" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Abdomen" d="M140 260h70M140 300h70M140 340h70" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Bícep Der." d="M100 160c-20 10-30 40-40 80s-15 150-10 200" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Bícep Izq." d="M250 160c20 10 30 40 40 80s15 150 10 200" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Cuádricep Der." d="M140 430c-10 50-20 150-15 250" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Cuádricep Izq." d="M210 430c10 50 20 150 15 250" selected={selected} onSelect={onSelect} />
                </>
              ) : (
                <>
                  <BodyPart label="Espalda Alta" d="M125 150c-10 10-25 40-25 80 0 60 40 100 75 100s75-40 75-100" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Glúteo Der." d="M130 430c0 40 20 70 45 70s45-30 45-70" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Isquiotibial Der." d="M140 500c-5 60-15 180-10 300" selected={selected} onSelect={onSelect} />
                  <BodyPart label="Isquiotibial Izq." d="M210 500c5 60 15 180 10 300" selected={selected} onSelect={onSelect} />
                </>
              )}
            </g>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 uppercase mb-2">O elegí de la lista:</p>
          <div className="max-h-[250px] overflow-y-auto flex flex-col gap-1 pr-2">
            <button 
              type="button" 
              onClick={() => onSelect('Ningún dolor')}
              className={`text-left p-2 rounded border text-xs transition-all ${selected === 'Ningún dolor' ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-slate-800 text-slate-400'}`}
            >
              ✓ Ningún dolor
            </button>
            {zones.map(z => (
              <button 
                key={z} 
                type="button" 
                onClick={() => onSelect(z)}
                className={`text-left p-2 rounded border text-xs transition-all ${selected === z ? 'border-red-500 text-red-400 bg-red-500/10' : 'border-slate-800 text-slate-400'}`}
              >
                {z}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── FORMULARIO PRINCIPAL ──────────────────────────────────────────────────────

export default function WellnessForm({ jugadorId, onSuccess, todayWellness }) {
  const [vals, setVals] = useState({ fatiga:null, calidad_sueno:null, dolor_muscular:null, nivel_estres:null, estado_animo:null })
  const [tqr, setTqr] = useState(null)
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [entrenaGrupo, setEntrenaGrupo] = useState(null)
  const [fueGimnasio, setFueGimnasio] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (todayWellness) return (
    <div className="text-center p-8">
      <div className="w-16 h-16 rounded-full bg-lime-500/10 border-2 border-lime-500 flex items-center justify-center mx-auto mb-4 text-2xl text-lime-500">✓</div>
      <h3 className="text-xl font-bold text-lime-500 mb-2">WELLNESS COMPLETADO</h3>
      <button className="text-slate-400 text-sm underline" onClick={onSuccess}>Volver al inicio</button>
    </div>
  )

  const showBodyMap = vals.dolor_muscular !== null && vals.dolor_muscular >= 2
  const allFilled = Object.values(vals).every(v => v !== null) && tqr !== null && entrenaGrupo !== null && fueGimnasio !== null

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/wellness', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ jugador_id:jugadorId, ...vals, dolor_zona: zonaSeleccionada, tqr, entrena_grupo:entrenaGrupo, fue_gimnasio:fueGimnasio })
      })
      if (res.ok) onSuccess()
      else setError('Error al guardar')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {FIELDS.map((f) => (
        <div key={f.key} className="flex flex-col gap-2">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</label>
          <ScaleInput value={vals[f.key]} onChange={v => setVals(p=>({...p,[f.key]:v}))} lowLabel={f.low} highLabel={f.high} />
          
          {f.key === 'dolor_muscular' && showBodyMap && (
            <div className="mt-4 p-4 rounded-xl border border-red-500/20 bg-slate-900/50">
              <p className="text-[11px] font-bold text-red-400 uppercase mb-4">📍 ¿Dónde sentís la molestia?</p>
              <BodyMap onSelect={setZonaSeleccionada} selected={zonaSeleccionada} />
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-3">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TQR (Recuperación)</label>
        <div className="flex gap-1">
          {[1,2,3,4,5,6,7,8,9,10].map(v => (
            <button 
              key={v} 
              type="button" 
              onClick={()=>setTqr(v)}
              className={`flex-1 py-3 rounded text-sm font-mono transition-all ${tqr === v ? 'bg-red-500/20 border-2' : 'bg-slate-800 border'} `}
              style={{ borderColor: tqr === v ? TQR_COLORS[v] : 'transparent', color: tqr === v ? TQR_COLORS[v] : '#94a3b8' }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <button 
        type="submit" 
        disabled={!allFilled || loading}
        className="w-full py-4 rounded-xl bg-lime-500 text-black font-bold text-sm hover:bg-lime-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'ENVIANDO...' : 'REGISTRAR WELLNESS →'}
      </button>
      {error && <p className="text-red-500 text-xs text-center">{error}</p>}
    </form>
  )
}
