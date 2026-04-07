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
  { id:'cabeza',    label:'Cabeza',          cx:100, cy:22,  r:17 },
  { id:'cuello',    label:'Cuello',          cx:100, cy:50,  r:9  },
  { id:'pecho',     label:'Pecho',           cx:100, cy:90,  r:22 },
  { id:'abdomen',   label:'Abdomen',         cx:100, cy:138, r:18 },
  { id:'aductor_d', label:'Aductor Der.',    cx:85,  cy:183, r:13 },
  { id:'aductor_i', label:'Aductor Izq.',    cx:115, cy:183, r:13 },
  { id:'cuad_d',    label:'Cuádriceps Der.', cx:82,  cy:228, r:18 },
  { id:'cuad_i',    label:'Cuádriceps Izq.', cx:118, cy:228, r:18 },
  { id:'rodilla_d', label:'Rodilla Der.',    cx:81,  cy:272, r:12 },
  { id:'rodilla_i', label:'Rodilla Izq.',    cx:119, cy:272, r:12 },
  { id:'tobillo_d', label:'Tobillo Der.',    cx:79,  cy:346, r:10 },
  { id:'tobillo_i', label:'Tobillo Izq.',    cx:121, cy:346, r:10 },
]
const BACK_ZONES = [
  { id:'nuca',      label:'Cuello',          cx:100, cy:50,  r:9  },
  { id:'esp_alta',  label:'Espalda Alta',    cx:100, cy:90,  r:22 },
  { id:'lumbar',    label:'Espalda Baja',    cx:100, cy:143, r:16 },
  { id:'gluteo_d',  label:'Glúteo Der.',     cx:86,  cy:182, r:17 },
  { id:'gluteo_i',  label:'Glúteo Izq.',     cx:114, cy:182, r:17 },
  { id:'gemelo_d',  label:'Gemelo Der.',     cx:81,  cy:310, r:14 },
  { id:'gemelo_i',  label:'Gemelo Izq.',     cx:119, cy:310, r:14 },
  { id:'tobillo_d', label:'Tobillo Der.',    cx:79,  cy:350, r:10 },
  { id:'tobillo_i', label:'Tobillo Izq.',    cx:121, cy:350, r:10 },
]

// Stroke config
const ST = { stroke:'#8899aa', strokeWidth:'1', fill:'none' }
const ST2 = { stroke:'#8899aa', strokeWidth:'0.7', fill:'none', opacity:'0.6' }

function MuscleFront() {
  return (
    <g>
      {/* ── CABEZA ── */}
      <ellipse cx="100" cy="22" rx="15" ry="18" {...ST}/>

      {/* ── CUELLO ── */}
      <path d="M93,38 L93,54 M107,38 L107,54" {...ST}/>
      <path d="M93,54 Q100,57 107,54" {...ST}/>

      {/* ── TRAPECIO / HOMBROS ── */}
      {/* Línea clavícula */}
      <path d="M93,54 Q86,52 76,56" {...ST}/>
      <path d="M107,54 Q114,52 124,56" {...ST}/>
      {/* Deltoides izq */}
      <path d="M76,56 Q64,60 60,72 Q57,82 62,92 Q68,98 74,96 Q70,84 72,72 L76,64 Z" {...ST}/>
      {/* Deltoides der */}
      <path d="M124,56 Q136,60 140,72 Q143,82 138,92 Q132,98 126,96 Q130,84 128,72 L124,64 Z" {...ST}/>
      {/* Trapecio sobre hombro izq */}
      <path d="M93,54 Q84,56 76,62" {...ST2}/>
      <path d="M107,54 Q116,56 124,62" {...ST2}/>

      {/* ── PECTORALES ── */}
      {/* Contorno torso */}
      <path d="M74,96 Q72,110 73,128 Q74,148 78,164 Q82,176 88,184 Q94,188 100,189 Q106,188 112,184 Q118,176 122,164 Q126,148 127,128 Q128,110 126,96" {...ST}/>
      {/* Pec izq */}
      <path d="M74,96 Q80,88 100,84 Q86,104 78,116 Q74,108 74,96 Z" {...ST}/>
      {/* Pec der */}
      <path d="M126,96 Q120,88 100,84 Q114,104 122,116 Q126,108 126,96 Z" {...ST}/>
      {/* Línea esternal */}
      <line x1="100" y1="62" x2="100" y2="184" {...ST2}/>
      {/* Línea bajo pec */}
      <path d="M78,116 Q100,120 122,116" {...ST2}/>

      {/* ── ABDOMEN ── */}
      {/* Líneas abs */}
      <path d="M84,126 Q100,129 116,126" {...ST2}/>
      <path d="M83,140 Q100,143 117,140" {...ST2}/>
      <path d="M84,155 Q100,158 116,155" {...ST2}/>
      {/* Serrato izq */}
      <path d="M74,110 Q70,122 71,136 L76,128 L76,116 Z" {...ST2}/>
      <path d="M71,136 Q70,148 72,158 L77,148 L76,134 Z" {...ST2}/>
      {/* Serrato der */}
      <path d="M126,110 Q130,122 129,136 L124,128 L124,116 Z" {...ST2}/>
      <path d="M129,136 Q130,148 128,158 L123,148 L124,134 Z" {...ST2}/>
      {/* Oblicuo izq */}
      <path d="M74,130 Q72,150 76,166 L82,162 Q79,148 80,132 Z" {...ST2}/>
      {/* Oblicuo der */}
      <path d="M126,130 Q128,150 124,166 L118,162 Q121,148 120,132 Z" {...ST2}/>

      {/* ── BRAZOS ── */}
      {/* Bícep izq */}
      <path d="M62,92 Q56,106 56,122 Q57,134 62,140 L68,136 Q64,126 65,112 Q66,102 70,96 Z" {...ST}/>
      {/* Separación bícep/braquial izq */}
      <path d="M60,108 Q59,118 61,128" {...ST2}/>
      {/* Antebrazo izq */}
      <path d="M56,122 Q51,136 51,154 Q52,166 57,170 L63,167 Q60,156 60,140 L62,124 Z" {...ST}/>
      {/* Mano izq */}
      <path d="M51,154 Q47,164 46,174 Q48,183 56,185 Q62,182 62,168 Z" {...ST}/>
      {/* Bícep der */}
      <path d="M138,92 Q144,106 144,122 Q143,134 138,140 L132,136 Q136,126 135,112 Q134,102 130,96 Z" {...ST}/>
      <path d="M140,108 Q141,118 139,128" {...ST2}/>
      {/* Antebrazo der */}
      <path d="M144,122 Q149,136 149,154 Q148,166 143,170 L137,167 Q140,156 140,140 L138,124 Z" {...ST}/>
      {/* Mano der */}
      <path d="M149,154 Q153,164 154,174 Q152,183 144,185 Q138,182 138,168 Z" {...ST}/>

      {/* ── PELVIS / CADERA ── */}
      <path d="M82,172 Q80,180 80,188 Q82,196 100,198 Q118,196 120,188 Q120,180 118,172" {...ST}/>
      {/* Arco pélvico */}
      <path d="M84,166 Q100,172 116,166" {...ST2}/>

      {/* ── CUÁDRICEPS IZQUIERDO ── */}
      {/* Recto femoral */}
      <path d="M88,196 Q84,214 83,234 Q83,252 84,264 L90,262 Q90,248 91,230 Q92,210 94,196 Z" {...ST}/>
      {/* Vasto externo */}
      <path d="M80,198 Q74,216 73,238 Q73,256 76,266 L83,264 Q80,252 80,234 Q81,214 84,200 Z" {...ST}/>
      {/* Vasto interno */}
      <path d="M93,198 Q96,216 97,236 Q97,252 95,264 L90,262 Q91,248 91,230 Q91,210 90,198 Z" {...ST2}/>
      {/* Línea separación */}
      <path d="M76,206 Q80,226 80,246" {...ST2}/>

      {/* ── CUÁDRICEPS DERECHO ── */}
      <path d="M112,196 Q116,214 117,234 Q117,252 116,264 L110,262 Q110,248 109,230 Q108,210 106,196 Z" {...ST}/>
      <path d="M120,198 Q126,216 127,238 Q127,256 124,266 L117,264 Q120,252 120,234 Q119,214 116,200 Z" {...ST}/>
      <path d="M107,198 Q104,216 103,236 Q103,252 105,264 L110,262 Q109,248 109,230 Q109,210 110,198 Z" {...ST2}/>
      <path d="M124,206 Q120,226 120,246" {...ST2}/>

      {/* ── RODILLAS ── */}
      <ellipse cx="81" cy="272" rx="9" ry="8" {...ST}/>
      <ellipse cx="119" cy="272" rx="9" ry="8" {...ST}/>

      {/* ── TIBIAS / PANTORRILLA FRONTAL ── */}
      {/* Tibia izq */}
      <path d="M74,280 Q72,298 73,316 Q74,330 77,340 L83,338 Q81,326 81,312 Q81,296 82,280 Z" {...ST}/>
      {/* Peroné izq */}
      <path d="M82,280 Q84,298 84,314 Q83,328 82,338" {...ST2}/>
      {/* Tibia der */}
      <path d="M126,280 Q128,298 127,316 Q126,330 123,340 L117,338 Q119,326 119,312 Q119,296 118,280 Z" {...ST}/>
      <path d="M118,280 Q116,298 116,314 Q117,328 118,338" {...ST2}/>

      {/* ── TOBILLOS / PIES ── */}
      {/* Pie izq */}
      <path d="M73,338 Q70,348 70,358 Q72,366 78,368 Q85,366 87,358 Q86,348 83,340 Z" {...ST}/>
      <path d="M68,362 L65,374 Q70,381 80,381 Q91,379 94,371 L88,360 Z" {...ST}/>
      {/* Pie der */}
      <path d="M127,338 Q130,348 130,358 Q128,366 122,368 Q115,366 113,358 Q114,348 117,340 Z" {...ST}/>
      <path d="M132,362 L135,374 Q130,381 120,381 Q109,379 106,371 L112,360 Z" {...ST}/>
    </g>
  )
}

function MuscleBack() {
  return (
    <g>
      {/* ── CABEZA ── */}
      <ellipse cx="100" cy="22" rx="15" ry="18" {...ST}/>

      {/* ── CUELLO ── */}
      <path d="M93,38 L93,54 M107,38 L107,54" {...ST}/>
      <path d="M93,54 Q100,57 107,54" {...ST}/>

      {/* ── TRAPECIO ── */}
      {/* Gran trapecio en rombo */}
      <path d="M93,54 Q80,58 68,66 Q60,76 62,88 Q68,96 78,94 Q86,82 93,72 Z" {...ST}/>
      <path d="M107,54 Q120,58 132,66 Q140,76 138,88 Q132,96 122,94 Q114,82 107,72 Z" {...ST}/>
      <path d="M93,54 Q100,60 107,54" {...ST}/>
      {/* Centro trapecio */}
      <path d="M93,72 Q100,76 107,72 L108,108 Q100,114 92,108 Z" {...ST}/>

      {/* ── DELTOIDES POSTERIOR ── */}
      <path d="M62,88 Q56,92 54,102 Q55,112 60,116 L66,112 Q63,104 64,96 Z" {...ST}/>
      <path d="M138,88 Q144,92 146,102 Q145,112 140,116 L134,112 Q137,104 136,96 Z" {...ST}/>

      {/* ── INFRAESPINOSO / REDONDO ── */}
      <path d="M62,88 Q65,104 68,116 L76,114 Q74,100 72,88 Z" {...ST}/>
      <path d="M138,88 Q135,104 132,116 L124,114 Q126,100 128,88 Z" {...ST}/>

      {/* ── DORSAL ANCHO ── */}
      <path d="M68,92 Q65,112 67,136 Q70,156 78,170 L84,168 Q78,154 76,134 Q74,112 76,92 Z" {...ST}/>
      <path d="M132,92 Q135,112 133,136 Q130,156 122,170 L116,168 Q122,154 124,134 Q126,112 124,92 Z" {...ST}/>

      {/* ── ESPALDA BAJA / LUMBAR ── */}
      <path d="M92,108 Q88,126 88,146 Q89,162 94,172 L100,174 L106,172 Q111,162 112,146 Q112,126 108,108 Z" {...ST}/>
      {/* Línea espinal */}
      <line x1="100" y1="58" x2="100" y2="170" {...ST2}/>
      {/* Líneas lumbares */}
      <path d="M88,130 Q100,134 112,130" {...ST2}/>
      <path d="M88,148 Q100,152 112,148" {...ST2}/>

      {/* ── BRAZOS (TRÍCEPS) ── */}
      {/* Trícep izq */}
      <path d="M60,116 Q54,130 54,148 Q55,160 60,164 L66,160 Q63,148 63,132 Q64,120 68,114 Z" {...ST}/>
      {/* Línea cabeza larga/lateral trícep */}
      <path d="M58,124 Q57,136 59,148" {...ST2}/>
      {/* Antebrazo posterior izq */}
      <path d="M54,148 Q50,162 50,178 Q52,189 57,191 L63,188 Q60,178 60,162 L61,150 Z" {...ST}/>
      {/* Mano izq */}
      <path d="M50,178 Q46,188 46,198 Q48,207 56,209 Q62,206 62,190 Z" {...ST}/>
      {/* Trícep der */}
      <path d="M140,116 Q146,130 146,148 Q145,160 140,164 L134,160 Q137,148 137,132 Q136,120 132,114 Z" {...ST}/>
      <path d="M142,124 Q143,136 141,148" {...ST2}/>
      {/* Antebrazo posterior der */}
      <path d="M146,148 Q150,162 150,178 Q148,189 143,191 L137,188 Q140,178 140,162 L139,150 Z" {...ST}/>
      {/* Mano der */}
      <path d="M150,178 Q154,188 154,198 Q152,207 144,209 Q138,206 138,190 Z" {...ST}/>

      {/* ── GLÚTEOS ── */}
      {/* Glúteo izq - grande, redondeado */}
      <path d="M84,170 Q76,176 74,190 Q74,206 82,214 Q90,218 100,216 L100,174 Q92,174 84,170 Z" {...ST}/>
      {/* Glúteo der */}
      <path d="M116,170 Q124,176 126,190 Q126,206 118,214 Q110,218 100,216 L100,174 Q108,174 116,170 Z" {...ST}/>
      {/* Línea glútea */}
      <line x1="100" y1="170" x2="100" y2="216" {...ST2}/>
      {/* Pliegue inferior glúteo */}
      <path d="M76,210 Q88,218 100,218 Q112,218 124,210" {...ST2}/>

      {/* ── ISQUIOTIBIALES ── */}
      {/* Isquio izq */}
      <path d="M76,214 Q70,232 70,254 Q71,268 76,276 L83,273 Q79,260 79,240 Q80,220 84,212 Z" {...ST}/>
      {/* Bíceps femoral */}
      <path d="M83,214 Q86,232 87,252 Q86,266 84,274" {...ST2}/>
      {/* Isquio der */}
      <path d="M124,214 Q130,232 130,254 Q129,268 124,276 L117,273 Q121,260 121,240 Q120,220 116,212 Z" {...ST}/>
      <path d="M117,214 Q114,232 113,252 Q114,266 116,274" {...ST2}/>

      {/* ── HUECO POPLÍTEO ── */}
      <path d="M70,276 Q78,282 88,282 Q84,278 78,274 Z" {...ST}/>
      <path d="M130,276 Q122,282 112,282 Q116,278 122,274 Z" {...ST}/>

      {/* ── GEMELOS ── */}
      {/* Gemelo izq - forma de diamante */}
      <path d="M70,282 Q66,298 67,318 Q69,334 74,340 L80,337 Q78,324 77,308 Q77,292 79,282 Z" {...ST}/>
      {/* Cabeza medial gemelo izq */}
      <path d="M79,282 Q83,298 83,316 Q82,330 80,338" {...ST}/>
      {/* Gemelo der */}
      <path d="M130,282 Q134,298 133,318 Q131,334 126,340 L120,337 Q122,324 123,308 Q123,292 121,282 Z" {...ST}/>
      <path d="M121,282 Q117,298 117,316 Q118,330 120,338" {...ST}/>

      {/* ── TENDÓN AQUILES / TALÓN ── */}
      {/* Izq */}
      <path d="M74,338 Q71,348 72,358 Q74,367 79,369 Q84,367 85,358 Q84,348 80,339 Z" {...ST}/>
      {/* Pie posterior izq */}
      <path d="M68,362 L66,374 Q72,382 82,381 Q92,379 95,370 L89,360 Z" {...ST}/>
      {/* Der */}
      <path d="M126,338 Q129,348 128,358 Q126,367 121,369 Q116,367 115,358 Q116,348 120,339 Z" {...ST}/>
      {/* Pie posterior der */}
      <path d="M132,362 L134,374 Q128,382 118,381 Q108,379 105,370 L111,360 Z" {...ST}/>
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
        <div style={{ flexShrink:0 }}>
          <svg viewBox="0 0 200 400" width="155" style={{ cursor:'crosshair', display:'block' }} onClick={handleSVGClick}>
            <defs>
              <filter id="selGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {side === 'front' ? <MuscleFront /> : <MuscleBack />}

            {/* Zonas hover interactivas */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle key={z.id} cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.3)' : 'transparent'}
                  stroke={isSel ? '#ef4444' : 'transparent'}
                  strokeWidth={isSel ? 1.5 : 0}
                  style={{ cursor:'pointer', transition:'all .12s' }}
                />
              )
            })}

            {/* Pin selección */}
            {selZone && (
              <g filter="url(#selGlow)">
                <circle cx={selZone.cx} cy={selZone.cy} r={selZone.r + 6} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.35}/>
                <circle cx={selZone.cx} cy={selZone.cy} r={8} fill="#ef4444"/>
                <circle cx={selZone.cx} cy={selZone.cy} r={3} fill="white"/>
              </g>
            )}
          </svg>
          <p style={{ fontSize:9, color:'var(--silver)', textAlign:'center', marginTop:4 }}>Tocá la zona</p>
        </div>

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
