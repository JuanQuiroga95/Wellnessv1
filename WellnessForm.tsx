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
        {/* ── SVG cuerpo estilo rayos X ── */}
        <div style={{ flexShrink:0, position:'relative' }}>
          <svg
            viewBox="0 0 200 400"
            width="160"
            style={{ cursor:'crosshair', display:'block', filter:'drop-shadow(0 0 18px rgba(56,189,248,.25))' }}
            onClick={handleSVGClick}
          >
            <defs>
              {/* Gradiente azul tipo rayos X */}
              <radialGradient id="xrayBody" cx="50%" cy="40%" r="55%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.55"/>
                <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="#075985" stopOpacity="0.15"/>
              </radialGradient>
              <radialGradient id="xrayEdge" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#0c4a6e" stopOpacity="0"/>
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5"/>
              </radialGradient>
              <linearGradient id="xrayLimb" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5"/>
                <stop offset="50%" stopColor="#7dd3fc" stopOpacity="0.3"/>
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5"/>
              </linearGradient>
              <filter id="xglow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="xglowStrong" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="hoverGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* ── Fondo sutil ── */}
            <rect width="200" height="400" fill="transparent"/>

            {/* ── CABEZA ── */}
            <ellipse cx="100" cy="22" rx="17" ry="20"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1.2" opacity="0.9" filter="url(#xglow)"/>
            {/* orejas */}
            <ellipse cx="83" cy="22" rx="3.5" ry="6" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.8" opacity="0.7"/>
            <ellipse cx="117" cy="22" rx="3.5" ry="6" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.8" opacity="0.7"/>

            {/* ── CUELLO ── */}
            <path d="M94,41 L94,54 Q100,57 106,54 L106,41 Q100,44 94,41Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8"/>

            {/* ── HOMBROS ── */}
            {/* Hombro izquierdo (a la izq en SVG = derecho del jugador) */}
            <path d="M94,51 C86,51 74,56 64,66 C60,70 58,78 60,85 C62,91 68,93 74,90 C79,87 81,81 83,74 C85,66 88,59 94,54Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1.1" opacity="0.85" filter="url(#xglow)"/>
            {/* Hombro derecho */}
            <path d="M106,51 C114,51 126,56 136,66 C140,70 142,78 140,85 C138,91 132,93 126,90 C121,87 119,81 117,74 C115,66 112,59 106,54Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1.1" opacity="0.85" filter="url(#xglow)"/>

            {/* ── TORSO ── */}
            <path d="M94,52 L74,58 C64,63 60,76 60,90 L62,128 C63,148 67,163 76,175 L84,186 L100,189 L116,186 L124,175 C133,163 137,148 138,128 L140,90 C140,76 136,63 126,58 L106,52 Q100,55 94,52Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1.2" opacity="0.9" filter="url(#xglow)"/>

            {side === 'front' && <>
              {/* Línea esternal */}
              <line x1="100" y1="58" x2="100" y2="180" stroke="#7dd3fc" strokeWidth="0.8" opacity="0.4"/>
              {/* Separación pectorales */}
              <path d="M74,90 Q100,98 126,90" stroke="#7dd3fc" strokeWidth="0.7" fill="none" opacity="0.35"/>
              {/* Abs */}
              <path d="M89,103 Q100,106 111,103 Q110,118 100,120 Q90,118 89,103Z" stroke="#7dd3fc" strokeWidth="0.6" fill="none" opacity="0.3"/>
              <path d="M89,122 Q100,125 111,122 Q110,137 100,139 Q90,137 89,122Z" stroke="#7dd3fc" strokeWidth="0.6" fill="none" opacity="0.25"/>
              <path d="M89,141 Q100,144 111,141 Q110,154 100,156 Q90,154 89,141Z" stroke="#7dd3fc" strokeWidth="0.6" fill="none" opacity="0.2"/>
            </>}
            {side === 'back' && <>
              {/* Espina dorsal */}
              <line x1="100" y1="56" x2="100" y2="182" stroke="#7dd3fc" strokeWidth="1" opacity="0.4"/>
              {/* Trapecio */}
              <path d="M94,52 C88,56 78,62 73,70 C70,76 72,84 78,88 Q100,92 122,88 C128,84 130,76 127,70 C122,62 112,56 106,52Z"
                stroke="#7dd3fc" strokeWidth="0.7" fill="none" opacity="0.35"/>
              {/* Líneas horizontales espalda */}
              <path d="M76,102 Q100,106 124,102" stroke="#7dd3fc" strokeWidth="0.6" fill="none" opacity="0.25"/>
              <path d="M76,120 Q100,124 124,120" stroke="#7dd3fc" strokeWidth="0.6" fill="none" opacity="0.2"/>
            </>}

            {/* ── BRAZO IZQUIERDO (SVG izq) ── */}
            <path d="M62,66 C54,72 46,84 40,102 C37,114 38,130 44,140 C48,146 54,148 60,146 C66,144 70,138 72,128 C74,118 73,106 72,94 C71,82 68,72 64,66Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1" opacity="0.85" filter="url(#xglow)"/>
            {/* Antebrazo izquierdo */}
            <path d="M44,140 C42,150 42,164 46,174 C48,180 54,182 60,180 C66,178 70,172 72,162 C74,154 72,144 70,140 C66,136 50,136 46,138Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8"/>
            {/* Mano izquierda */}
            <ellipse cx="56" cy="184" rx="9" ry="7" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.8" opacity="0.7"/>

            {/* ── BRAZO DERECHO (SVG der) ── */}
            <path d="M138,66 C146,72 154,84 160,102 C163,114 162,130 156,140 C152,146 146,148 140,146 C134,144 130,138 128,128 C126,118 127,106 128,94 C129,82 132,72 136,66Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1" opacity="0.85" filter="url(#xglow)"/>
            {/* Antebrazo derecho */}
            <path d="M156,140 C158,150 158,164 154,174 C152,180 146,182 140,180 C134,178 130,172 128,162 C126,154 128,144 130,140 C134,136 150,136 154,138Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8"/>
            {/* Mano derecha */}
            <ellipse cx="144" cy="184" rx="9" ry="7" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.8" opacity="0.7"/>

            {/* ── PELVIS ── */}
            <path d="M84,185 C80,190 78,196 80,202 L100,204 L120,202 C122,196 120,190 116,185Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1" opacity="0.85"/>

            {/* ── PIERNA IZQUIERDA (SVG izq) ── */}
            {/* Muslo */}
            <path d="M84,186 C80,196 78,216 78,236 C78,254 80,270 82,282 C84,292 88,298 92,298 C96,298 98,292 99,282 C100,268 100,254 100,236 C100,218 98,200 96,188Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1.1" opacity="0.87" filter="url(#xglow)"/>
            {/* Rodilla izquierda */}
            <ellipse cx="88" cy="300" rx="12" ry="9" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1" opacity="0.85"/>
            {/* Pantorrilla izquierda */}
            <path d="M82,308 C80,320 80,338 82,352 C84,360 88,364 92,364 C96,364 98,360 99,352 C100,338 100,320 96,308 C93,304 85,304 82,308Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1" opacity="0.85"/>
            {/* Tobillo+pie izquierdo */}
            <ellipse cx="88" cy="366" rx="9" ry="6" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8"/>
            <path d="M80,370 C76,374 72,380 70,386 C70,390 78,392 88,391 C94,390 96,385 95,380 L92,372Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8"/>

            {/* ── PIERNA DERECHA (SVG der) ── */}
            {/* Muslo */}
            <path d="M116,186 C120,196 122,216 122,236 C122,254 120,270 118,282 C116,292 112,298 108,298 C104,298 102,292 101,282 C100,268 100,254 100,236 C100,218 102,200 104,188Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1.1" opacity="0.87" filter="url(#xglow)"/>
            {/* Rodilla derecha */}
            <ellipse cx="112" cy="300" rx="12" ry="9" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1" opacity="0.85"/>
            {/* Pantorrilla derecha */}
            <path d="M118,308 C120,320 120,338 118,352 C116,360 112,364 108,364 C104,364 102,360 101,352 C100,338 100,320 104,308 C107,304 115,304 118,308Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="1" opacity="0.85"/>
            {/* Tobillo+pie derecho */}
            <ellipse cx="112" cy="366" rx="9" ry="6" fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8"/>
            <path d="M120,370 C124,374 128,380 130,386 C130,390 122,392 112,391 C106,390 104,385 105,380 L108,372Z"
              fill="url(#xrayBody)" stroke="#38bdf8" strokeWidth="0.9" opacity="0.8"/>

            {/* ── ZONAS CLICKEABLES ── */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle
                  key={z.id}
                  cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.45)' : 'rgba(56,189,248,.05)'}
                  stroke={isSel ? '#ef4444' : 'rgba(56,189,248,.18)'}
                  strokeWidth={isSel ? 2 : 1}
                  style={{ cursor:'pointer', transition:'all .15s' }}
                />
              )
            })}

            {/* ── PIN de zona seleccionada ── */}
            {selected && (() => {
              const z = zones.find(zz => zz.label === selected)
              return z ? (
                <g filter="url(#xglowStrong)">
                  <circle cx={z.cx} cy={z.cy} r={z.r + 4} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.35}/>
                  <circle cx={z.cx} cy={z.cy} r={8} fill="#ef4444" opacity={0.92}/>
                  <circle cx={z.cx} cy={z.cy} r={3} fill="white" opacity={0.9}/>
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
