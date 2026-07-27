'use client'
import { useState } from 'react'
import ScaleInput from '@/components/ui/ScaleInput'
import PhotoBodyMap from '@/components/forms/PhotoBodyMap'

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

const FIELDS_PANAMA = [
  { key:'fatiga',         label:'¿QUÉ TAN RECUPERADO TE SIENTES AL DESPERTAR?', low:'Nada recuperado', high:'Muy bien recuperado', colors: ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'] },
  { key:'calidad_sueno',  label:'¿CÓMO DORMISTE ANOCHE?', low:'Muy mal', high:'Excelente', colors: ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'] },
  { key:'dolor_muscular', label:'¿CÓMO SIENTES TUS MÚSCULOS AL DESPERTAR?', low:'Muy adolorido', high:'Muy buenas sens.', colors: ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'] },
  { key:'nivel_estres',   label:'¿QUÉ NIVEL DE ENERGÍA TIENES ESTA MAÑANA?', low:'Muy cansado', high:'Con mucha energía', colors: ['#ef4444','#f97316','#eab308','#84cc16','#22c55e'] },
]

const COLORS_HIDRATACION = ['#ef4444', '#eab308', '#fef08a', '#fef9c3', '#ffffff']

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
  { id:'nuca',      label:'Cuello',            cx:100, cy:50,  r:9  },
  { id:'esp_alta',  label:'Espalda Alta',      cx:100, cy:90,  r:22 },
  { id:'lumbar',    label:'Espalda Baja',      cx:100, cy:143, r:16 },
  { id:'gluteo_d',  label:'Glúteo Der.',       cx:114, cy:182, r:17 },
  { id:'gluteo_i',  label:'Glúteo Izq.',       cx:86,  cy:182, r:17 },
  { id:'isquio_d',  label:'Isquiotibial Der.', cx:117, cy:228, r:18 },
  { id:'isquio_i',  label:'Isquiotibial Izq.', cx:83,  cy:228, r:18 },
  { id:'gemelo_d',  label:'Gemelo Der.',       cx:119, cy:310, r:14 },
  { id:'gemelo_i',  label:'Gemelo Izq.',       cx:81,  cy:310, r:14 },
  { id:'tobillo_d', label:'Tobillo Der.',      cx:121, cy:350, r:10 },
  { id:'tobillo_i', label:'Tobillo Izq.',      cx:79,  cy:350, r:10 },
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
      {/* Hombro izq: misma inclinación que deltoides frontal */}
      <path d="M93,54 Q84,56 76,62 Q68,68 66,76 Q64,84 68,90 Q74,96 78,94 Q80,84 82,74 Q86,64 93,58 Z" {...ST}/>
      {/* Hombro der */}
      <path d="M107,54 Q116,56 124,62 Q132,68 134,76 Q136,84 132,90 Q126,96 122,94 Q120,84 118,74 Q114,64 107,58 Z" {...ST}/>
      {/* Rombo central trapecio inferior */}
      <path d="M93,58 Q100,62 107,58 L108,108 Q100,112 92,108 Z" {...ST}/>
      {/* Líneas de fibras del trapecio */}
      <path d="M93,58 Q86,64 78,66" {...ST2}/>
      <path d="M107,58 Q114,64 122,66" {...ST2}/>

      {/* ── DELTOIDES POSTERIOR ── */}
      {/* Mismo tamaño/posición que deltoides frontal */}
      <path d="M66,76 Q60,80 58,90 Q57,100 62,106 Q67,110 70,106 Q66,96 66,86 Z" {...ST}/>
      <path d="M134,76 Q140,80 142,90 Q143,100 138,106 Q133,110 130,106 Q134,96 134,86 Z" {...ST}/>

      {/* ── INFRAESPINOSO / REDONDO MAYOR ── */}
      <path d="M68,90 Q66,106 68,118 L76,116 Q76,102 74,90 Z" {...ST}/>
      <path d="M132,90 Q134,106 132,118 L124,116 Q124,102 126,90 Z" {...ST}/>
      {/* Línea separación infraespinoso/redondo */}
      <path d="M68,102 Q72,104 76,102" {...ST2}/>
      <path d="M132,102 Q128,104 124,102" {...ST2}/>

      {/* ── DORSAL ANCHO ── */}
      {/* Arranca desde axila, mismo ancho que torso frontal */}
      <path d="M68,94 Q64,114 65,136 Q67,158 76,172 L84,170 Q77,156 75,136 Q73,114 74,94 Z" {...ST}/>
      <path d="M132,94 Q136,114 135,136 Q133,158 124,172 L116,170 Q123,156 125,136 Q127,114 126,94 Z" {...ST}/>

      {/* ── TORSO POSTERIOR (contorno) ── */}
      {/* Exactamente igual al contorno frontal para mismas proporciones */}
      <path d="M74,94 Q72,110 73,128 Q74,148 78,164 Q82,176 88,184 Q94,188 100,189 Q106,188 112,184 Q118,176 122,164 Q126,148 127,128 Q128,110 126,94" {...ST}/>

      {/* ── COLUMNA / ROMBOIDES ── */}
      <line x1="100" y1="58" x2="100" y2="172" {...ST2}/>
      {/* Línea escapular */}
      <path d="M82,84 Q100,88 118,84" {...ST2}/>
      {/* Líneas lumbares */}
      <path d="M86,126 Q100,130 114,126" {...ST2}/>
      <path d="M86,144 Q100,148 114,144" {...ST2}/>
      <path d="M87,160 Q100,163 113,160" {...ST2}/>
      {/* Borde escápula izq */}
      <path d="M74,76 Q72,92 74,108 Q82,112 88,104 Q88,88 82,78 Z" {...ST2}/>
      {/* Borde escápula der */}
      <path d="M126,76 Q128,92 126,108 Q118,112 112,104 Q112,88 118,78 Z" {...ST2}/>

      {/* ── BRAZOS — TRÍCEPS ── */}
      {/* Mismo recorrido que bíceps/antebrazo frontal */}
      {/* Trícep izq */}
      <path d="M62,106 Q56,120 56,136 Q57,148 62,154 L68,150 Q65,138 65,124 Q66,112 70,106 Z" {...ST}/>
      {/* División cabezas trícep izq */}
      <path d="M60,118 Q59,130 61,142" {...ST2}/>
      {/* Antebrazo posterior izq */}
      <path d="M56,136 Q51,150 51,168 Q52,180 57,184 L63,181 Q60,170 60,154 L62,138 Z" {...ST}/>
      {/* Mano izq — misma forma que frontal */}
      <path d="M51,168 Q47,178 46,188 Q48,196 56,198 Q62,196 62,182 Z" {...ST}/>

      {/* Trícep der */}
      <path d="M138,106 Q144,120 144,136 Q143,148 138,154 L132,150 Q135,138 135,124 Q134,112 130,106 Z" {...ST}/>
      <path d="M140,118 Q141,130 139,142" {...ST2}/>
      {/* Antebrazo posterior der */}
      <path d="M144,136 Q149,150 149,168 Q148,180 143,184 L137,181 Q140,170 140,154 L138,138 Z" {...ST}/>
      {/* Mano der */}
      <path d="M149,168 Q153,178 154,188 Q152,196 144,198 Q138,196 138,182 Z" {...ST}/>

      {/* ── GLÚTEOS ── */}
      {/* Misma altura que pelvis frontal (y=172–198) */}
      <path d="M84,172 Q76,178 74,192 Q74,208 82,216 Q90,220 100,218 L100,176 Q92,175 84,172 Z" {...ST}/>
      <path d="M116,172 Q124,178 126,192 Q126,208 118,216 Q110,220 100,218 L100,176 Q108,175 116,172 Z" {...ST}/>
      <line x1="100" y1="172" x2="100" y2="218" {...ST2}/>
      {/* Pliegue glúteo — equivale a línea bajo pélvis frontal */}
      <path d="M76,212 Q88,220 100,220 Q112,220 124,212" {...ST2}/>

      {/* ── ISQUIOTIBIALES ── */}
      {/* Mismo ancho y recorrido que cuádriceps frontal */}
      {/* Vasto externo → bíceps femoral izq */}
      <path d="M76,216 Q70,236 70,258 Q71,272 76,280 L83,277 Q79,262 79,242 Q80,222 84,214 Z" {...ST}/>
      {/* Recto → semitendinoso izq */}
      <path d="M84,214 Q88,234 88,256 Q87,270 85,278 L80,277 Q81,262 81,242 Q81,222 76,218 Z" {...ST2}/>
      {/* Semitendinoso izq */}
      <path d="M90,216 Q94,236 94,258 Q93,270 91,278 L85,278 Q87,262 87,242 Q87,222 88,214 Z" {...ST}/>
      {/* Línea bíceps femoral izq */}
      <path d="M83,218 Q82,240 82,260" {...ST2}/>

      {/* Isquio der */}
      <path d="M124,216 Q130,236 130,258 Q129,272 124,280 L117,277 Q121,262 121,242 Q120,222 116,214 Z" {...ST}/>
      <path d="M116,214 Q112,234 112,256 Q113,270 115,278 L120,277 Q119,262 119,242 Q119,222 124,218 Z" {...ST2}/>
      <path d="M110,216 Q106,236 106,258 Q107,270 109,278 L115,278 Q113,262 113,242 Q113,222 112,214 Z" {...ST}/>
      <path d="M117,218 Q118,240 118,260" {...ST2}/>

      {/* ── HUECO POPLÍTEO ── */}
      {/* Mismo nivel que rodilla frontal (cy=272) */}
      <ellipse cx="81" cy="282" rx="9" ry="5" {...ST2}/>
      <ellipse cx="119" cy="282" rx="9" ry="5" {...ST2}/>

      {/* ── GEMELOS ── */}
      {/* Mismo ancho y recorrido que tibias frontales */}
      {/* Cabeza lateral gemelo izq */}
      <path d="M72,282 Q67,300 68,320 Q70,336 75,342 L81,339 Q79,326 78,310 Q78,294 80,284 Z" {...ST}/>
      {/* Cabeza medial gemelo izq */}
      <path d="M80,284 Q84,302 84,320 Q83,334 81,340" {...ST}/>
      {/* Línea separación cabezas */}
      <path d="M76,290 Q77,308 77,326" {...ST2}/>

      {/* Cabeza lateral gemelo der */}
      <path d="M128,282 Q133,300 132,320 Q130,336 125,342 L119,339 Q121,326 122,310 Q122,294 120,284 Z" {...ST}/>
      {/* Cabeza medial gemelo der */}
      <path d="M120,284 Q116,302 116,320 Q117,334 119,340" {...ST}/>
      <path d="M124,290 Q123,308 123,326" {...ST2}/>

      {/* ── TENDÓN AQUILES / TOBILLO ── */}
      {/* Exactamente igual al tobillo frontal */}
      {/* Izq */}
      <path d="M74,340 Q71,350 72,360 Q74,368 79,370 Q84,368 85,360 Q84,350 80,341 Z" {...ST}/>
      {/* Pie posterior izq — orientación igual que pie frontal (hacia afuera) */}
      <path d="M68,364 L65,376 Q70,383 80,382 Q91,380 94,372 L88,362 Z" {...ST}/>
      {/* Línea tendón aquiles */}
      <path d="M77,340 L77,362" {...ST2}/>

      {/* Der */}
      <path d="M126,340 Q129,350 128,360 Q126,368 121,370 Q116,368 115,360 Q116,350 120,341 Z" {...ST}/>
      {/* Pie posterior der */}
      <path d="M132,364 L135,376 Q130,383 120,382 Q109,380 106,372 L112,362 Z" {...ST}/>
      <path d="M123,340 L123,362" {...ST2}/>
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
        {[['front','Vista Frontal'],['back','Vista Posterior']].map(([s,l]) => (
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
            <button type="button" onClick={() => onSelect('Otro')} style={{
              padding:'5px 10px', borderRadius:7, fontSize:11, cursor:'pointer', textAlign:'left',
              border: selected==='Otro' ? '1px solid #f59e0b' : '1px solid var(--fog)',
              background: selected==='Otro' ? 'rgba(245,158,11,.12)' : 'transparent',
              color: selected==='Otro' ? '#fbbf24' : 'var(--silver)',
              transition:'all .1s',
            }}>✏️ Otro</button>
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
function AlreadyCompleted({ isPanama, data, onBack, canAddSecond, onAddSecond }: any) {
  const total = WK.reduce((s,k) => s + (Number(data[k])||0), 0)
  const rd = !total ? null : total <= 12 ? {label:'Listo para entrenar',color:'#c8f135'} : total <= 18 ? {label:'Atención Wellness',color:'#f59e0b'} : {label:'Bajar Carga',color:'#ef4444'}

  return (
    <div className="anim-up" style={{ textAlign:'center' }}>
      <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(200,241,53,.1)', border:'2px solid var(--lime)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:32 }}>✓</div>
      <h3 className="display" style={{ fontSize:32, color:'var(--lime)', marginBottom:6 }}>{canAddSecond ? 'TURNO 1 COMPLETADO' : 'YA COMPLETASTE HOY'}</h3>
      <p style={{ fontSize:13, color:'var(--silver)', marginBottom:20 }}>{canAddSecond ? 'Podés completar el wellness del 2do turno.' : 'Ya completaste los 2 turnos de wellness del día.'}</p>

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
            const displayVal = (isPanama && i < 4 && v > 0) ? (6 - v) : v
            const label = isPanama ? ['Recuperación','Sueño','Músculos','Energía','Hidratación'][i] : WL[i]
            return (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:12, color:'var(--silver)', minWidth:52 }}>{label}</span>
                <div style={{ flex:1, height:6, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${v*20}%`, height:'100%', background:col, borderRadius:3 }} />
                </div>
                <span style={{ fontSize:13, fontFamily:'DM Mono,monospace', fontWeight:600, color:col, minWidth:16 }}>{displayVal}</span>
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
          {data.dolor_zona && (() => { let zonas: string[]; try { const p = JSON.parse(data.dolor_zona); zonas = Array.isArray(p) ? p : [data.dolor_zona] } catch { zonas = [data.dolor_zona] }; return zonas.map(z => <span key={z} style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:'rgba(239,68,68,.08)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', fontWeight:600 }}>📍 {z}</span>) })()}
          {data.dolor_eva != null && data.dolor_eva > 0 && <span style={{ fontSize:12, padding:'5px 12px', borderRadius:20, background:'rgba(239,68,68,.08)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', fontWeight:600 }}>EVA: {data.dolor_eva}/10</span>}
          {data.dolor_descripcion && <p style={{ fontSize:11, color:'#f87171', marginTop:6, fontStyle:'italic' }}>💬 {data.dolor_descripcion}</p>}
        </div>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button className="btn-ghost" onClick={onBack} style={{ flex:1, padding:12 }}>← Volver al inicio</button>
        {canAddSecond && (
          <button className="btn-lime" onClick={onAddSecond} style={{ flex:1, padding:12 }}>📋 Completar Turno 2 →</button>
        )}
      </div>
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export default function WellnessForm({ isPanama, jugadorId, onSuccess, todayWellness, todayWellnessCount = 0 }: any) {
  const [vals, setVals] = useState({ fatiga:null, calidad_sueno:null, dolor_muscular:null, nivel_estres:null, estado_animo:null })
  const [horasSueno, setHorasSueno] = useState('')
  const [tqr, setTqr] = useState(null)
  const [zonasSeleccionadas, setZonasSeleccionadas] = useState<string[]>([])
  const [dolorDescripcion, setDolorDescripcion] = useState('')
  const [dolorEva, setDolorEva] = useState(null)
  const [entrenaGrupo, setEntrenaGrupo] = useState(true)
  const [fueGimnasio, setFueGimnasio] = useState(false)
  const [gruposMusculares, setGruposMusculares] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [showSecondTurn, setShowSecondTurn] = useState(false)

  const [tieneMolestia, setTieneMolestia] = useState<boolean|null>(null) // Para Panamá

  // Allow 2nd survey on double-session days
  if (todayWellness && !showSecondTurn) {
    const canAddSecond = todayWellnessCount < 2
    return <AlreadyCompleted isPanama={isPanama} data={todayWellness} onBack={onSuccess} canAddSecond={canAddSecond} onAddSecond={() => setShowSecondTurn(true)} />
  }

  // Mostrar mapa corporal
  const showBodyMap = isPanama 
    ? tieneMolestia === true 
    : vals.dolor_muscular !== null && vals.dolor_muscular >= 2
  // Mostrar EVA cuando se seleccionó zona (no "Ningún dolor")
  const showEVA = showBodyMap && zonasSeleccionadas.length > 0 && !zonasSeleccionadas.includes('Ningún dolor')

  function handleZoneSelect(z: string) {
    if (z === 'Ningún dolor') {
      setZonasSeleccionadas(['Ningún dolor'])
      setDolorEva(null)
      setDolorDescripcion('')
      return
    }
    setZonasSeleccionadas(prev => {
      const withoutNinguno = prev.filter(x => x !== 'Ningún dolor')
      if (withoutNinguno.includes(z)) {
        if (z === 'Otro') setDolorDescripcion('')
        return withoutNinguno.filter(x => x !== z)
      }
      return [...withoutNinguno, z]
    })
  }

  const allFilled = Object.values(vals).every(v => v !== null) 
    && (isPanama ? tieneMolestia !== null : horasSueno !== '') 
    && (isPanama ? true : tqr !== null)
    && (!showBodyMap || zonasSeleccionadas.length > 0)
    && (!showEVA || dolorEva !== null)

  const filledCount = Object.values(vals).filter(v=>v!==null).length + (isPanama && tieneMolestia!==null?1:horasSueno!==''?1:0) + (isPanama?0:tqr?1:0)
  const totalFields = 5 + (isPanama?1:2) // wellness + (molestia/horas+tqr)

  async function submit(e) {
    e.preventDefault()
    if (!allFilled) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/wellness', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          jugador_id:jugadorId,
          fatiga: isPanama ? (6 - (vals.fatiga as number)) : vals.fatiga,
          calidad_sueno: isPanama ? (6 - (vals.calidad_sueno as number)) : vals.calidad_sueno,
          dolor_muscular: isPanama ? (6 - (vals.dolor_muscular as number)) : vals.dolor_muscular,
          nivel_estres: isPanama ? (6 - (vals.nivel_estres as number)) : vals.nivel_estres,
          estado_animo: vals.estado_animo, // Hidratación u original, no se invierte
          horas_sueno: horasSueno ? parseFloat(horasSueno) : 0,
          dolor_zona: zonasSeleccionadas.length > 0 ? JSON.stringify(zonasSeleccionadas) : null,
          dolor_descripcion: dolorDescripcion||null,
          dolor_eva: dolorEva,
          tqr, recovery: tqr,
          entrena_grupo:entrenaGrupo,
          fue_gimnasio:fueGimnasio,
          grupos_musculares:gruposMusculares||null,
        })
      })
      if (!res.ok) { const d=await res.json(); setError(d.error||'Error'); return }
      window.dispatchEvent(new CustomEvent('wellness-data-updated'))
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
      {isPanama ? (
        <>
          <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Bienestar y Recuperación</p>
          {FIELDS_PANAMA.map((f) => (
            <div key={f.key}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{f.label}</label>
              <ScaleInput id={f.key} value={vals[f.key]} onChange={(v:any) => setVals(p=>({...p,[f.key]:v}))} lowLabel={f.low} highLabel={f.high} customColors={f.colors} />
            </div>
          ))}
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>NIVEL DE HIDRATACIÓN (1=Deshidratado, 5=Sobrehidratado)</label>
            <ScaleInput id="estado_animo" value={vals.estado_animo} onChange={(v:any) => setVals(p=>({...p,estado_animo:v}))} min={1} max={5} lowLabel="Deshidratado" highLabel="Sobrehidratado" customColors={COLORS_HIDRATACION} />
          </div>
          <div style={{ marginTop:14 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>¿TENÉS ALGUNA MOLESTIA O DOLOR MUSCULAR/ARTICULAR?</label>
            <div style={{ display:'flex', gap:10 }}>
              {radioBtn('NO, ME SIENTO BIEN', tieneMolestia===false, ()=>setTieneMolestia(false), 'var(--lime)')}
              {radioBtn('SÍ, TENGO DOLOR', tieneMolestia===true, ()=>setTieneMolestia(true), '#ef4444')}
            </div>
          </div>
          {showBodyMap && (
            <div className="anim-up" style={{ marginTop:14 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>📍 ¿En qué parte sentís dolor o molestia?</p>
              <PhotoBodyMap selected={zonasSeleccionadas} onSelect={handleZoneSelect} description={dolorDescripcion} onDescriptionChange={setDolorDescripcion} />
              {showEVA && <EVAScale value={dolorEva} onChange={setDolorEva} />}
            </div>
          )}
        </>
      ) : (
        <>
          <p style={{ fontSize:10, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Bienestar General (1 = Mejor · 5 = Peor)</p>
          
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{f.label}</label>
              <ScaleInput id={f.key} value={vals[f.key]} onChange={(v:any) => setVals(p=>({...p,[f.key]:v}))} lowLabel={f.low} highLabel={f.high} />
              
              {/* Input de horas de sueño debajo de calidad de sueño */}
              {f.key === 'calidad_sueno' && (
                <div style={{ marginTop:14, padding:14, background:'var(--ink3)', borderRadius:10, border:'1px solid var(--mist)' }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
                    Horas de sueño
                  </label>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <input
                      type="number" min="0" max="24" step="0.5"
                      className="wp-input"
                      value={horasSueno}
                      onChange={e=>setHorasSueno(e.target.value)}
                      style={{ width:100, textAlign:'center', fontSize:18, fontWeight:700, fontFamily:'DM Mono,monospace', color:'var(--lime)' }}
                      placeholder="ej: 7.5"
                    />
                    <span style={{ fontSize:12, color:'var(--fog)' }}>horas en total</span>
                  </div>
                </div>
              )}
    
              {/* Body map aparece justo debajo de Dolor Muscular si valor >= 2 */}
              {f.key === 'dolor_muscular' && showBodyMap && (
                <div style={{ marginTop:14 }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>📍 ¿En qué parte sentís dolor o molestia?</p>
                  <PhotoBodyMap
                    selected={zonasSeleccionadas}
                    onSelect={handleZoneSelect}
                    description={dolorDescripcion}
                    onDescriptionChange={setDolorDescripcion}
                  />
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

          {!isPanama && (
            <div style={{ display:'flex', flexDirection:'column', gap:16, marginTop:24, padding:16, background:'var(--ink2)', borderRadius:12, border:'1px solid var(--mist)' }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={entrenaGrupo} onChange={e=>setEntrenaGrupo(e.target.checked)} style={{ width:18, height:18, accentColor:'var(--lime)' }} />
                <span style={{ fontSize:14, fontWeight:600, color:entrenaGrupo?'var(--lime)':'var(--silver)' }}>¿Hoy entrenas con el grupo?</span>
              </label>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox" checked={fueGimnasio} onChange={e=>setFueGimnasio(e.target.checked)} style={{ width:18, height:18, accentColor:'var(--lime)' }} />
                <span style={{ fontSize:14, fontWeight:600, color:fueGimnasio?'var(--lime)':'var(--silver)' }}>¿Has ido al gimnasio por la mañana?</span>
              </label>
            </div>
          )}
        </>
      )}

      {error && <p style={{ fontSize:12, color:'#f87171' }}>{error}</p>}

      <button type="submit" className="btn-lime" disabled={!allFilled||loading} style={{ width:'100%', padding:14, fontSize:14, marginTop:4 }}>
        {loading ? 'ENVIANDO...' : `ENVIAR WELLNESS → (${filledCount}/${totalFields})`}
      </button>
    </form>
  )
}
