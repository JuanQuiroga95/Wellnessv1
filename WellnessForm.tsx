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
    const scaleY = 420 / rect.height
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
          <svg viewBox="0 0 200 420" width="155" style={{ cursor:'crosshair', display:'block' }} onClick={handleSVGClick}>
            <defs>
              <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#252525"/>
                <stop offset="40%" stopColor="#2e2e2e"/>
                <stop offset="100%" stopColor="#1e1e1e"/>
              </linearGradient>
              <linearGradient id="muscleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#333333"/>
                <stop offset="100%" stopColor="#1a1a1a"/>
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* ── HEAD ── */}
            {/* Jaw/chin */}
            <path d="M88,38 Q100,48 112,38 L110,43 Q100,50 90,43 Z" fill="#2a2a2a" stroke="#444" strokeWidth="0.8"/>
            {/* Head */}
            <ellipse cx="100" cy="22" rx="15" ry="18" fill="url(#bodyGrad)" stroke="#555" strokeWidth="1.2"/>
            {/* Ear left */}
            <ellipse cx="85.5" cy="22" rx="3" ry="5" fill="#252525" stroke="#444" strokeWidth="0.8"/>
            {/* Ear right */}
            <ellipse cx="114.5" cy="22" rx="3" ry="5" fill="#252525" stroke="#444" strokeWidth="0.8"/>
            {/* Hair top */}
            <path d="M86,8 Q100,3 114,8 Q113,5 100,4 Q87,5 86,8Z" fill="#1a1a1a" stroke="#333" strokeWidth="0.5"/>

            {/* ── NECK ── */}
            <path d="M93,39 L93,52 Q100,55 107,52 L107,39 Q100,42 93,39Z" fill="url(#bodyGrad)" stroke="#444" strokeWidth="1"/>
            {/* Trapezius start */}
            <path d="M90,40 C82,44 76,50 70,56" stroke="#404040" strokeWidth="1.5" fill="none"/>
            <path d="M110,40 C118,44 124,50 130,56" stroke="#404040" strokeWidth="1.5" fill="none"/>

            {/* ── SHOULDERS ── */}
            {/* Left deltoid */}
            <path d="M93,50 C85,50 72,54 62,64 C58,68 56,75 58,82 C60,88 66,90 72,88 C76,85 78,80 80,74 C82,67 86,59 93,55 Z"
              fill="url(#bodyGrad)" stroke="#4a4a4a" strokeWidth="1.2"/>
            {/* Right deltoid */}
            <path d="M107,50 C115,50 128,54 138,64 C142,68 144,75 142,82 C140,88 134,90 128,88 C124,85 122,80 120,74 C118,67 114,59 107,55 Z"
              fill="url(#bodyGrad)" stroke="#4a4a4a" strokeWidth="1.2"/>

            {/* ── TORSO ── */}
            {/* Main torso shape — athletic V-taper */}
            <path d="M93,52 L72,57 C62,62 58,76 58,90 L60,128 C61,148 65,164 74,176 L82,186 L100,189 L118,186 L126,176 C135,164 139,148 140,128 L142,90 C142,76 138,62 128,57 L107,52 Q100,55 93,52Z"
              fill="url(#bodyGrad)" stroke="#4a4a4a" strokeWidth="1.2"/>

            {side === 'front' && <>
              {/* Pec left */}
              <path d="M72,60 C70,68 70,82 76,92 C82,98 92,98 96,92 L96,68 C90,62 80,58 72,60Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.8" opacity="0.9"/>
              {/* Pec right */}
              <path d="M128,60 C130,68 130,82 124,92 C118,98 108,98 104,92 L104,68 C110,62 120,58 128,60Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.8" opacity="0.9"/>
              {/* Sternum line */}
              <line x1="100" y1="58" x2="100" y2="178" stroke="#383838" strokeWidth="1" opacity="0.6"/>
              {/* Pec separation line */}
              <path d="M76,92 Q100,100 124,92" stroke="#333" strokeWidth="0.8" fill="none" opacity="0.7"/>
              {/* Abs outlines */}
              <path d="M88,102 L88,120 Q100,123 112,120 L112,102 Q100,99 88,102Z" fill="url(#muscleGrad)" stroke="#333" strokeWidth="0.7" opacity="0.8"/>
              <path d="M88,122 L88,140 Q100,143 112,140 L112,122 Q100,119 88,122Z" fill="url(#muscleGrad)" stroke="#333" strokeWidth="0.7" opacity="0.7"/>
              <path d="M88,142 L88,158 Q100,161 112,158 L112,142 Q100,139 88,142Z" fill="url(#muscleGrad)" stroke="#333" strokeWidth="0.7" opacity="0.6"/>
              {/* Obliques */}
              <path d="M72,100 C72,118 74,138 80,154 L84,166" stroke="#333" strokeWidth="0.8" fill="none" opacity="0.6"/>
              <path d="M128,100 C128,118 126,138 120,154 L116,166" stroke="#333" strokeWidth="0.8" fill="none" opacity="0.6"/>
            </>}

            {side === 'back' && <>
              {/* Trapezius muscle */}
              <path d="M93,52 C88,54 78,60 73,68 C70,74 72,82 78,86 C86,90 96,88 100,86 C104,88 114,90 122,86 C128,82 130,74 127,68 C122,60 112,54 107,52 Z"
                fill="url(#muscleGrad)" stroke="#3a3a3a" strokeWidth="0.8" opacity="0.9"/>
              {/* Lat left */}
              <path d="M64,68 C60,76 58,92 60,110 C62,124 68,134 76,140 L82,144 L82,112 C80,98 76,82 72,72 Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.8" opacity="0.85"/>
              {/* Lat right */}
              <path d="M136,68 C140,76 142,92 140,110 C138,124 132,134 124,140 L118,144 L118,112 C120,98 124,82 128,72 Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.8" opacity="0.85"/>
              {/* Spine */}
              <line x1="100" y1="56" x2="100" y2="180" stroke="#383838" strokeWidth="1.2" opacity="0.7"/>
              {/* Rhomboids / upper back detail */}
              <path d="M82,68 Q100,72 118,68 Q116,82 100,86 Q84,82 82,68Z" fill="url(#muscleGrad)" stroke="#363636" strokeWidth="0.7" opacity="0.8"/>
              {/* Lower back / erectors */}
              <path d="M88,130 L90,180 Q100,183 110,180 L112,130 Q100,127 88,130Z" fill="url(#muscleGrad)" stroke="#333" strokeWidth="0.7" opacity="0.75"/>
              {/* Horizontal back lines */}
              <path d="M76,100 Q100,104 124,100" stroke="#333" strokeWidth="0.7" fill="none" opacity="0.5"/>
              <path d="M76,118 Q100,122 124,118" stroke="#333" strokeWidth="0.7" fill="none" opacity="0.45"/>
            </>}

            {/* ── ARMS ── */}
            {/* LEFT ARM */}
            {/* Upper arm (bicep/tricep) */}
            <path d="M62,64 C54,70 46,82 40,100 C37,112 38,128 44,138 C48,144 54,146 60,144 C66,142 70,136 72,128 C74,118 73,106 72,94 C71,82 68,72 65,65 Z"
              fill="url(#bodyGrad)" stroke="#4a4a4a" strokeWidth="1.1"/>
            {side === 'front' && <>
              {/* Bicep peak */}
              <path d="M44,96 C42,106 44,120 50,130 C54,136 60,138 64,134 C68,130 70,122 70,112 C68,104 63,96 57,92 C52,90 46,90 44,96Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.85"/>
            </>}
            {side === 'back' && <>
              {/* Tricep */}
              <path d="M42,92 C40,104 42,118 48,128 C52,134 60,136 65,131 C68,127 70,120 70,112 C68,100 64,90 57,88 C51,87 44,88 42,92Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.85"/>
            </>}
            {/* Forearm left */}
            <path d="M44,138 C42,148 42,162 46,172 C48,178 54,180 60,178 C66,176 70,170 72,162 C74,154 73,144 70,138 C66,134 56,134 52,136 Z"
              fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>
            {/* Hand left */}
            <ellipse cx="55" cy="182" rx="8" ry="6" fill="url(#bodyGrad)" stroke="#444" strokeWidth="0.8"/>

            {/* RIGHT ARM */}
            <path d="M138,64 C146,70 154,82 160,100 C163,112 162,128 156,138 C152,144 146,146 140,144 C134,142 130,136 128,128 C126,118 127,106 128,94 C129,82 132,72 135,65 Z"
              fill="url(#bodyGrad)" stroke="#4a4a4a" strokeWidth="1.1"/>
            {side === 'front' && <>
              {/* Bicep peak */}
              <path d="M156,96 C158,106 156,120 150,130 C146,136 140,138 136,134 C132,130 130,122 130,112 C132,104 137,96 143,92 C148,90 154,90 156,96Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.85"/>
            </>}
            {side === 'back' && <>
              {/* Tricep */}
              <path d="M158,92 C160,104 158,118 152,128 C148,134 140,136 135,131 C132,127 130,120 130,112 C132,100 136,90 143,88 C149,87 156,88 158,92Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.85"/>
            </>}
            {/* Forearm right */}
            <path d="M156,138 C158,148 158,162 154,172 C152,178 146,180 140,178 C134,176 130,170 128,162 C126,154 127,144 130,138 C134,134 144,134 148,136 Z"
              fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>
            {/* Hand right */}
            <ellipse cx="145" cy="182" rx="8" ry="6" fill="url(#bodyGrad)" stroke="#444" strokeWidth="0.8"/>

            {/* ── HIPS / PELVIS ── */}
            <path d="M82,184 C80,188 79,194 80,198 L100,200 L120,198 C121,194 120,188 118,184 Z"
              fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>

            {/* ── LEGS ── */}
            {/* LEFT LEG — thigh */}
            <path d="M82,186 C78,196 76,214 76,234 C76,252 78,268 80,282 C82,292 86,298 90,298 C94,298 97,292 98,282 C100,268 100,252 100,234 C100,218 98,200 96,188 Z"
              fill="url(#bodyGrad)" stroke="#454545" strokeWidth="1.2"/>
            {side === 'front' && <>
              {/* Quad sweep left */}
              <path d="M78,198 C76,212 76,232 78,250 C80,262 86,272 91,272 C95,270 96,260 96,248 C96,232 94,212 90,198 C87,192 80,194 78,198Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.8"/>
            </>}
            {side === 'back' && <>
              {/* Hamstring left */}
              <path d="M80,196 C78,212 78,232 80,252 C82,264 88,274 93,274 C97,272 98,260 97,246 C96,230 93,210 88,197 C85,191 81,192 80,196Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.8"/>
            </>}
            {/* RIGHT LEG — thigh */}
            <path d="M118,186 C122,196 124,214 124,234 C124,252 122,268 120,282 C118,292 114,298 110,298 C106,298 103,292 102,282 C100,268 100,252 100,234 C100,218 102,200 104,188 Z"
              fill="url(#bodyGrad)" stroke="#454545" strokeWidth="1.2"/>
            {side === 'front' && <>
              {/* Quad sweep right */}
              <path d="M122,198 C124,212 124,232 122,250 C120,262 114,272 109,272 C105,270 104,260 104,248 C104,232 106,212 110,198 C113,192 120,194 122,198Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.8"/>
            </>}
            {side === 'back' && <>
              {/* Hamstring right */}
              <path d="M120,196 C122,212 122,232 120,252 C118,264 112,274 107,274 C103,272 102,260 103,246 C104,230 107,210 112,197 C115,191 119,192 120,196Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.8"/>
            </>}

            {/* LEFT KNEE */}
            <ellipse cx="87" cy="302" rx="11" ry="8" fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>
            {/* RIGHT KNEE */}
            <ellipse cx="113" cy="302" rx="11" ry="8" fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>

            {/* LEFT CALF */}
            <path d="M80,308 C78,320 78,338 80,352 C82,360 86,364 90,364 C94,364 97,360 98,352 C100,338 99,320 96,308 C93,304 84,304 80,308Z"
              fill="url(#bodyGrad)" stroke="#454545" strokeWidth="1.1"/>
            {side === 'back' && <>
              <path d="M81,314 C79,326 80,342 83,354 C86,360 90,362 93,358 C96,354 97,340 96,326 C95,316 91,308 87,308 C84,308 82,310 81,314Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.85"/>
            </>}
            {/* RIGHT CALF */}
            <path d="M120,308 C122,320 122,338 120,352 C118,360 114,364 110,364 C106,364 103,360 102,352 C100,338 101,320 104,308 C107,304 116,304 120,308Z"
              fill="url(#bodyGrad)" stroke="#454545" strokeWidth="1.1"/>
            {side === 'back' && <>
              <path d="M119,314 C121,326 120,342 117,354 C114,360 110,362 107,358 C104,354 103,340 104,326 C105,316 109,308 113,308 C116,308 118,310 119,314Z"
                fill="url(#muscleGrad)" stroke="#383838" strokeWidth="0.7" opacity="0.85"/>
            </>}

            {/* ANKLES + FEET */}
            <ellipse cx="87" cy="367" rx="8" ry="5" fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>
            <ellipse cx="113" cy="367" rx="8" ry="5" fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>
            {/* Left foot */}
            <path d="M79,370 C76,374 72,380 70,386 C70,390 76,392 84,391 C90,390 94,386 94,382 L90,372 Z"
              fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>
            {/* Right foot */}
            <path d="M121,370 C124,374 128,380 130,386 C130,390 124,392 116,391 C110,390 106,386 106,382 L110,372 Z"
              fill="url(#bodyGrad)" stroke="#404040" strokeWidth="1"/>

            {/* ── Clickable zones ── */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.55)' : 'rgba(255,255,255,.03)'}
                  stroke={isSel ? '#ef4444' : 'rgba(255,255,255,.08)'}
                  strokeWidth={isSel ? 2 : 1}
                  style={{ cursor:'pointer', transition:'all .15s' }}
                />
              )
            })}
            {/* Selected pin */}
            {selected && (() => {
              const z = zones.find(z => z.label === selected)
              return z ? (
                <g filter="url(#glow)">
                  <circle cx={z.cx} cy={z.cy} r={8} fill="#ef4444" opacity={.95}/>
                  <circle cx={z.cx} cy={z.cy} r={12} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.4}/>
                  <text x={z.cx} y={z.cy+1} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="white" fontWeight="bold">✕</text>
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
