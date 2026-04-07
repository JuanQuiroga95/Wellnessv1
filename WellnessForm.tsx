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

// Zonas simplificadas — solo las principales para el jugador
const FRONT_ZONES = [
  { id:'cabeza',    label:'Cabeza',          cx:100, cy:24,  r:18 },
  { id:'cuello',    label:'Cuello',          cx:100, cy:52,  r:10 },
  { id:'pecho',     label:'Pecho',           cx:100, cy:88,  r:22 },
  { id:'abdomen',   label:'Abdomen',         cx:100, cy:135, r:18 },
  { id:'aductor_d', label:'Aductor Der.',    cx:84,  cy:182, r:14 },
  { id:'aductor_i', label:'Aductor Izq.',    cx:116, cy:182, r:14 },
  { id:'cuad_d',    label:'Cuádriceps Der.', cx:80,  cy:228, r:18 },
  { id:'cuad_i',    label:'Cuádriceps Izq.', cx:120, cy:228, r:18 },
  { id:'rodilla_d', label:'Rodilla Der.',    cx:79,  cy:274, r:13 },
  { id:'rodilla_i', label:'Rodilla Izq.',    cx:121, cy:274, r:13 },
  { id:'tobillo_d', label:'Tobillo Der.',    cx:77,  cy:344, r:11 },
  { id:'tobillo_i', label:'Tobillo Izq.',    cx:123, cy:344, r:11 },
]
const BACK_ZONES = [
  { id:'nuca',       label:'Cuello',           cx:100, cy:52,  r:10 },
  { id:'esp_alta',   label:'Espalda Alta',     cx:100, cy:90,  r:22 },
  { id:'esp_baja',   label:'Espalda Baja',     cx:100, cy:138, r:18 },
  { id:'gluteo_d',   label:'Glúteo Der.',      cx:85,  cy:180, r:16 },
  { id:'gluteo_i',   label:'Glúteo Izq.',      cx:115, cy:180, r:16 },
  { id:'gemelo_d',   label:'Gemelo Der.',      cx:80,  cy:308, r:15 },
  { id:'gemelo_i',   label:'Gemelo Izq.',      cx:120, cy:308, r:15 },
  { id:'tobillo_d',  label:'Tobillo Der.',     cx:78,  cy:349, r:11 },
  { id:'tobillo_i',  label:'Tobillo Izq.',     cx:122, cy:349, r:11 },
]

// ── Componente figura frontal atlética ──────────────────────────────────────
function AthleteFront() {
  const body = '#1a1a1a'
  const line = '#4a5568'
  const lineS = '#2d3748'
  return (
    <g>
      {/* === CABEZA === */}
      <ellipse cx="100" cy="24" rx="16" ry="19" fill={body} stroke={line} strokeWidth="1.4"/>
      {/* Oreja izq/der */}
      <ellipse cx="84.5" cy="25" rx="3" ry="5" fill={body} stroke={line} strokeWidth="1"/>
      <ellipse cx="115.5" cy="25" rx="3" ry="5" fill={body} stroke={line} strokeWidth="1"/>

      {/* === CUELLO === */}
      <path d="M93,42 Q100,45 107,42 L109,55 Q100,57 91,55 Z" fill={body} stroke={line} strokeWidth="1.2"/>

      {/* === TRAPECIO / HOMBROS === */}
      {/* Hombro izq — deltoides redondeado */}
      <path d="M91,55 Q78,57 67,64 Q58,72 57,84 Q59,94 65,98 Q70,88 74,78 L80,70 L91,63 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      {/* Hombro der */}
      <path d="M109,55 Q122,57 133,64 Q142,72 143,84 Q141,94 135,98 Q130,88 126,78 L120,70 L109,63 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>

      {/* === TORSO — V-taper pronunciado === */}
      {/* Pectorales: ancho arriba, estrecho en cintura */}
      <path d="M74,78 Q72,92 73,108 Q75,122 78,134 Q82,152 86,168 Q90,178 100,180 Q110,178 114,168 Q118,152 122,134 Q125,122 127,108 Q128,92 126,78 L120,70 L100,66 L80,70 Z"
        fill={body} stroke={line} strokeWidth="1.4"/>
      {/* Línea pectoral */}
      <path d="M78,80 Q100,88 122,80" fill="none" stroke={lineS} strokeWidth="1" opacity="0.8"/>
      <line x1="100" y1="74" x2="100" y2="175" stroke={lineS} strokeWidth="0.9" opacity="0.7"/>
      {/* Líneas abdominales */}
      <path d="M85,115 Q100,119 115,115" fill="none" stroke={lineS} strokeWidth="0.9" opacity="0.6"/>
      <path d="M84,134 Q100,138 116,134" fill="none" stroke={lineS} strokeWidth="0.9" opacity="0.5"/>
      <path d="M85,153 Q100,157 115,153" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.4"/>
      {/* Serrato */}
      <path d="M75,105 Q72,118 74,132" fill="none" stroke={lineS} strokeWidth="0.7" opacity="0.4"/>
      <path d="M125,105 Q128,118 126,132" fill="none" stroke={lineS} strokeWidth="0.7" opacity="0.4"/>

      {/* === BRAZO IZQUIERDO === */}
      {/* Bícep */}
      <path d="M65,98 Q58,112 57,128 Q57,140 61,148 L67,145 Q64,134 65,120 Q66,108 70,100 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      {/* Línea bícep */}
      <path d="M62,110 Q61,120 62,130" fill="none" stroke={lineS} strokeWidth="0.7" opacity="0.5"/>
      {/* Antebrazo */}
      <path d="M61,148 Q57,162 56,178 Q57,190 62,192 L67,190 Q64,180 64,166 L67,145 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      {/* Mano */}
      <ellipse cx="60" cy="196" rx="7" ry="9" fill={body} stroke={line} strokeWidth="1"/>

      {/* === BRAZO DERECHO === */}
      <path d="M135,98 Q142,112 143,128 Q143,140 139,148 L133,145 Q136,134 135,120 Q134,108 130,100 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <path d="M138,110 Q139,120 138,130" fill="none" stroke={lineS} strokeWidth="0.7" opacity="0.5"/>
      <path d="M139,148 Q143,162 144,178 Q143,190 138,192 L133,190 Q136,180 136,166 L133,145 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <ellipse cx="140" cy="196" rx="7" ry="9" fill={body} stroke={line} strokeWidth="1"/>

      {/* === PELVIS / CADERA === */}
      <path d="M86,168 Q84,176 84,185 L100,186 L116,185 Q116,176 114,168 Q107,173 100,174 Q93,173 86,168 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>

      {/* === PIERNA IZQUIERDA === */}
      {/* Cuádricep — forma ovoide, no rectangular */}
      <path d="M84,185 Q78,198 76,218 Q75,238 76,256 Q77,266 79,276 L87,274 Q86,262 86,244 Q87,224 88,206 Q90,192 92,185 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      {/* Línea separación cuád */}
      <path d="M83,196 Q84,220 84,244 Q84,260 85,272" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      {/* Rótula */}
      <ellipse cx="80" cy="278" rx="8" ry="7" fill={body} stroke={line} strokeWidth="1.1"/>
      {/* Tibia */}
      <path d="M74,284 Q73,300 74,318 Q75,332 77,342 L83,340 Q82,328 82,314 Q82,298 82,284 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      {/* Tobillo/pie */}
      <path d="M74,340 Q72,350 72,358 Q74,366 80,368 Q87,366 88,358 Q87,350 84,342 Z"
        fill={body} stroke={line} strokeWidth="1.1"/>
      <path d="M70,362 Q72,372 80,374 Q90,372 93,365" fill="none" stroke={line} strokeWidth="1" fill="none"/>
      <path d="M70,362 L68,374 Q74,380 82,379 Q91,378 94,370 L88,360 Z"
        fill={body} stroke={line} strokeWidth="1"/>

      {/* === PIERNA DERECHA === */}
      <path d="M116,185 Q122,198 124,218 Q125,238 124,256 Q123,266 121,276 L113,274 Q114,262 114,244 Q113,224 112,206 Q110,192 108,185 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      <path d="M117,196 Q116,220 116,244 Q116,260 115,272" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      <ellipse cx="120" cy="278" rx="8" ry="7" fill={body} stroke={line} strokeWidth="1.1"/>
      <path d="M126,284 Q127,300 126,318 Q125,332 123,342 L117,340 Q118,328 118,314 Q118,298 118,284 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <path d="M126,340 Q128,350 128,358 Q126,366 120,368 Q113,366 112,358 Q113,350 116,342 Z"
        fill={body} stroke={line} strokeWidth="1.1"/>
      <path d="M130,362 L132,374 Q126,380 118,379 Q109,378 106,370 L112,360 Z"
        fill={body} stroke={line} strokeWidth="1"/>
    </g>
  )
}

// ── Componente figura trasera atlética ──────────────────────────────────────
function AthleteBack() {
  const body = '#1a1a1a'
  const line = '#4a5568'
  const lineS = '#2d3748'
  return (
    <g>
      {/* === CABEZA === */}
      <ellipse cx="100" cy="24" rx="16" ry="19" fill={body} stroke={line} strokeWidth="1.4"/>
      <ellipse cx="84.5" cy="25" rx="3" ry="5" fill={body} stroke={line} strokeWidth="1"/>
      <ellipse cx="115.5" cy="25" rx="3" ry="5" fill={body} stroke={line} strokeWidth="1"/>

      {/* === CUELLO === */}
      <path d="M93,42 Q100,45 107,42 L109,55 Q100,57 91,55 Z" fill={body} stroke={line} strokeWidth="1.2"/>

      {/* === TRAPECIOS (grandes, triangulares) === */}
      <path d="M91,55 Q80,58 68,66 Q60,74 60,86 Q62,96 70,98 Q76,86 82,77 L89,68 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      <path d="M109,55 Q120,58 132,66 Q140,74 140,86 Q138,96 130,98 Q124,86 118,77 L111,68 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      {/* Unión trapecio superior */}
      <path d="M91,55 Q100,60 109,55" fill="none" stroke={line} strokeWidth="1.2"/>

      {/* === ESPALDA — torso ancho con V-taper === */}
      <path d="M70,98 Q68,114 70,132 Q72,150 76,164 Q80,176 86,184 Q93,188 100,188 Q107,188 114,184 Q120,176 124,164 Q128,150 130,132 Q132,114 130,98 L120,77 L100,72 L80,77 Z"
        fill={body} stroke={line} strokeWidth="1.4"/>
      {/* Línea columna */}
      <line x1="100" y1="58" x2="100" y2="184" stroke={lineS} strokeWidth="1" opacity="0.8"/>
      {/* Escápulas */}
      <path d="M80,80 Q76,94 78,108 Q84,112 90,106 Q88,92 84,80 Z" fill="none" stroke={lineS} strokeWidth="0.9" opacity="0.6"/>
      <path d="M120,80 Q124,94 122,108 Q116,112 110,106 Q112,92 116,80 Z" fill="none" stroke={lineS} strokeWidth="0.9" opacity="0.6"/>
      {/* Dorsal */}
      <path d="M72,110 Q70,130 74,152 Q78,168 86,178" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      <path d="M128,110 Q130,130 126,152 Q122,168 114,178" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      {/* Líneas lumbares */}
      <path d="M84,150 Q100,154 116,150" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.4"/>

      {/* === BRAZO IZQUIERDO === */}
      {/* Trícep */}
      <path d="M60,86 Q53,100 52,118 Q52,132 56,142 L62,139 Q59,128 60,114 Q62,100 66,90 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <path d="M56,104 Q55,116 57,128" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      {/* Antebrazo */}
      <path d="M56,142 Q52,158 52,172 Q53,184 58,186 L64,184 Q61,174 61,160 L62,139 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <ellipse cx="56" cy="190" rx="7" ry="9" fill={body} stroke={line} strokeWidth="1"/>

      {/* === BRAZO DERECHO === */}
      <path d="M140,86 Q147,100 148,118 Q148,132 144,142 L138,139 Q141,128 140,114 Q138,100 134,90 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <path d="M144,104 Q145,116 143,128" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      <path d="M144,142 Q148,158 148,172 Q147,184 142,186 L136,184 Q139,174 139,160 L138,139 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <ellipse cx="144" cy="190" rx="7" ry="9" fill={body} stroke={line} strokeWidth="1"/>

      {/* === GLÚTEOS === */}
      <path d="M86,184 Q80,192 80,204 Q82,216 92,220 Q100,222 100,222 Q100,222 108,220 Q118,216 120,204 Q120,192 114,184 Q107,188 100,189 Q93,188 86,184 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      <line x1="100" y1="184" x2="100" y2="222" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>

      {/* === PIERNA IZQUIERDA === */}
      {/* Isquiotibial */}
      <path d="M80,218 Q75,234 74,254 Q74,270 76,280 L84,278 Q83,266 83,248 Q84,230 87,216 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      <path d="M82,226 Q81,248 82,268" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.4"/>
      {/* Hueco poplíteo */}
      <path d="M74,282 Q80,288 88,288 Q85,284 80,280 Z" fill={body} stroke={line} strokeWidth="1"/>
      {/* Gemelo */}
      <path d="M74,288 Q70,304 71,322 Q73,336 76,344 L82,342 Q80,330 80,316 Q80,300 82,288 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <path d="M82,290 Q84,306 84,320 Q83,334 82,342" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      {/* Tobillo/pie */}
      <path d="M74,342 Q72,354 73,362 Q75,370 80,372 Q87,370 88,362 Q87,354 83,344 Z"
        fill={body} stroke={line} strokeWidth="1.1"/>
      <path d="M70,366 L68,378 Q74,384 82,383 Q91,382 94,374 L88,364 Z"
        fill={body} stroke={line} strokeWidth="1"/>

      {/* === PIERNA DERECHA === */}
      <path d="M120,218 Q125,234 126,254 Q126,270 124,280 L116,278 Q117,266 117,248 Q116,230 113,216 Z"
        fill={body} stroke={line} strokeWidth="1.3"/>
      <path d="M118,226 Q119,248 118,268" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.4"/>
      <path d="M126,282 Q120,288 112,288 Q115,284 120,280 Z" fill={body} stroke={line} strokeWidth="1"/>
      <path d="M126,288 Q130,304 129,322 Q127,336 124,344 L118,342 Q120,330 120,316 Q120,300 118,288 Z"
        fill={body} stroke={line} strokeWidth="1.2"/>
      <path d="M118,290 Q116,306 116,320 Q117,334 118,342" fill="none" stroke={lineS} strokeWidth="0.8" opacity="0.5"/>
      <path d="M126,342 Q128,354 127,362 Q125,370 120,372 Q113,370 112,362 Q113,354 117,344 Z"
        fill={body} stroke={line} strokeWidth="1.1"/>
      <path d="M130,366 L132,378 Q126,384 118,383 Q109,382 106,374 L112,364 Z"
        fill={body} stroke={line} strokeWidth="1"/>
    </g>
  )
}

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

  const selZone = selected ? zones.find(z => z.label === selected) : null

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {[['front','Vista Frontal'],['back','Vista Trasera']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s as any)} style={{
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
            <defs>
              <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {side === 'front' ? <AthleteFront /> : <AthleteBack />}

            {/* Zonas interactivas */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.45)' : 'rgba(255,255,255,.04)'}
                  stroke={isSel ? '#ef4444' : 'rgba(255,255,255,.1)'}
                  strokeWidth={isSel ? 2 : 0.8}
                  style={{ cursor:'pointer', transition:'all .12s' }}
                />
              )
            })}

            {/* Pin selección */}
            {selZone && (
              <g filter="url(#glow)">
                <circle cx={selZone.cx} cy={selZone.cy} r={selZone.r + 5} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.4}/>
                <circle cx={selZone.cx} cy={selZone.cy} r={8} fill="#ef4444"/>
                <circle cx={selZone.cx} cy={selZone.cy} r={3} fill="white"/>
              </g>
            )}
          </svg>
          <p style={{ fontSize:9, color:'var(--silver)', textAlign:'center', marginTop:4 }}>Tocá la zona</p>
        </div>

        {/* Zone list */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, color:'var(--silver)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>O elegí de la lista:</p>
          <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:3 }}>
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
