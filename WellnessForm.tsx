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

// ── Body Map SVG Anatómico Profesional ────────────────────────────────────────

// Vista FRONTAL - paths JSX del cuerpo anatómico
function FrontBodySVG() {
  const s = 'rgba(180,210,230,.75)'
  const sm = 'rgba(180,210,230,.5)'
  const sw = '1.1'
  const sw2 = '.85'
  return (
    <>
      {/* Cabeza */}
      <ellipse cx="100" cy="26" rx="18" ry="21" fill="none" stroke={s} strokeWidth={sw}/>
      <ellipse cx="100" cy="26" rx="13" ry="16" fill="none" stroke={sm} strokeWidth=".5"/>
      {/* Cuello */}
      <path d="M91 44 Q100 51 109 44 L111 57 Q100 60 89 57 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Clavículas */}
      <path d="M89 57 Q94 54 100 53 Q106 54 111 57" fill="none" stroke={s} strokeWidth=".8"/>
      {/* Trapecio izq */}
      <path d="M89 57 Q80 61 68 68 Q63 72 62 80 L72 82 Q75 74 83 70 L89 63 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Trapecio der */}
      <path d="M111 57 Q120 61 132 68 Q137 72 138 80 L128 82 Q125 74 117 70 L111 63 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Deltoides izq */}
      <path d="M62 80 Q55 83 52 93 Q51 102 56 108 L63 104 Q60 96 62 87 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Deltoides der */}
      <path d="M138 80 Q145 83 148 93 Q149 102 144 108 L137 104 Q140 96 138 87 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Pectoral izq */}
      <path d="M72 82 Q70 88 70 100 Q72 108 82 112 Q90 113 100 110 L100 68 Q93 66 83 70 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Pectoral der */}
      <path d="M128 82 Q130 88 130 100 Q128 108 118 112 Q110 113 100 110 L100 68 Q107 66 117 70 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Línea esternal */}
      <line x1="100" y1="57" x2="100" y2="110" stroke={sm} strokeWidth=".7"/>
      {/* Bícep izq */}
      <path d="M52 93 Q47 106 48 120 Q50 130 55 135 L62 131 Q59 122 58 110 L56 97 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Separación bícep izq */}
      <path d="M56 103 Q57 113 58 122" fill="none" stroke={sm} strokeWidth=".6"/>
      {/* Bícep der */}
      <path d="M148 93 Q153 106 152 120 Q150 130 145 135 L138 131 Q141 122 142 110 L144 97 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Separación bícep der */}
      <path d="M144 103 Q143 113 142 122" fill="none" stroke={sm} strokeWidth=".6"/>
      {/* Antebrazo izq externo */}
      <path d="M48 120 Q44 135 44 151 Q45 162 49 167 L54 164 Q52 154 52 142 L52 124 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Antebrazo izq interno */}
      <path d="M55 135 Q57 149 57 161 L54 164 Z" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Antebrazo der externo */}
      <path d="M152 120 Q156 135 156 151 Q155 162 151 167 L146 164 Q148 154 148 142 L148 124 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Antebrazo der interno */}
      <path d="M145 135 Q143 149 143 161 L146 164 Z" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Mano/muñeca izq */}
      <path d="M44 151 Q40 161 39 171 Q40 180 48 183 Q54 179 54 164 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Mano/muñeca der */}
      <path d="M156 151 Q160 161 161 171 Q160 180 152 183 Q146 179 146 164 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Abdomen - contorno */}
      <path d="M72 108 L74 163 Q84 170 100 170 Q116 170 126 163 L128 108 Q114 115 100 115 Q86 115 72 108 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Líneas abdominales */}
      <path d="M87 122 Q100 124 113 122" fill="none" stroke={sm} strokeWidth=".7"/>
      <path d="M87 135 Q100 137 113 135" fill="none" stroke={sm} strokeWidth=".7"/>
      <path d="M87 149 Q100 151 113 149" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Línea alba */}
      <line x1="100" y1="110" x2="100" y2="163" stroke={sm} strokeWidth=".7"/>
      {/* Oblicuo izq */}
      <path d="M72 120 Q74 146 82 163 L87 163" fill="none" stroke={sm} strokeWidth=".8"/>
      {/* Oblicuo der */}
      <path d="M128 120 Q126 146 118 163 L113 163" fill="none" stroke={sm} strokeWidth=".8"/>
      {/* Cadera/ingle izq */}
      <path d="M74 163 Q70 173 69 184 Q70 196 76 202 L84 199 Q81 190 82 180 Q83 172 87 163 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Cadera/ingle der */}
      <path d="M126 163 Q130 173 131 184 Q130 196 124 202 L116 199 Q119 190 118 180 Q117 172 113 163 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Arco pubis */}
      <path d="M82 163 Q100 172 118 163" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Cuádricep izq - contorno externo */}
      <path d="M69 184 Q64 203 64 224 Q65 243 71 256 L80 253 Q75 240 76 220 Q77 202 82 186 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Cuádricep izq - línea interna */}
      <path d="M82 188 Q85 208 85 226 Q84 242 80 254" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Cuádricep der - contorno externo */}
      <path d="M131 184 Q136 203 136 224 Q135 243 129 256 L120 253 Q125 240 124 220 Q123 202 118 186 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Cuádricep der - línea interna */}
      <path d="M118 188 Q115 208 115 226 Q116 242 120 254" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Separación entre cuádriceps */}
      <path d="M85 186 Q90 198 100 200 Q110 198 115 186" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Rótula izq */}
      <ellipse cx="72" cy="263" rx="9" ry="10" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Rótula der */}
      <ellipse cx="128" cy="263" rx="9" ry="10" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Tibia/peroné izq */}
      <path d="M65 272 Q64 290 65 307 Q67 318 71 325 L77 323 Q75 311 75 298 Q75 282 76 272 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      <path d="M76 272 Q78 288 78 304 Q77 316 75 324" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Tibia/peroné der */}
      <path d="M135 272 Q136 290 135 307 Q133 318 129 325 L123 323 Q125 311 125 298 Q125 282 124 272 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      <path d="M124 272 Q122 288 122 304 Q123 316 125 324" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Tobillo izq */}
      <path d="M65 322 Q61 331 61 342 Q63 350 70 352 Q77 350 79 344 Q79 335 77 325 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Tobillo der */}
      <path d="M135 322 Q139 331 139 342 Q137 350 130 352 Q123 350 121 344 Q121 335 123 325 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Pie izq */}
      <path d="M61 342 Q57 352 55 362 Q54 372 59 378 Q69 382 80 378 Q85 370 81 360 L79 344 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Dedos pie izq */}
      <path d="M55 366 Q58 376 69 380 Q79 381 84 374" fill="none" stroke={sm} strokeWidth=".6"/>
      {/* Pie der */}
      <path d="M139 342 Q143 352 145 362 Q146 372 141 378 Q131 382 120 378 Q115 370 119 360 L121 344 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Dedos pie der */}
      <path d="M145 366 Q142 376 131 380 Q121 381 116 374" fill="none" stroke={sm} strokeWidth=".6"/>
    </>
  )
}

// Vista TRASERA - paths JSX del cuerpo anatómico posterior
function BackBodySVG() {
  const s = 'rgba(180,210,230,.75)'
  const sm = 'rgba(180,210,230,.5)'
  const sw = '1.1'
  const sw2 = '.85'
  return (
    <>
      {/* Cabeza posterior */}
      <ellipse cx="100" cy="26" rx="18" ry="21" fill="none" stroke={s} strokeWidth={sw}/>
      <ellipse cx="100" cy="26" rx="13" ry="16" fill="none" stroke={sm} strokeWidth=".5"/>
      {/* Cuello posterior */}
      <path d="M91 44 Q100 51 109 44 L111 57 Q100 60 89 57 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Trapecio izq - gran músculo triangular */}
      <path d="M89 57 Q80 60 68 68 Q62 73 62 83 Q68 92 78 90 Q85 81 89 73 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Trapecio der */}
      <path d="M111 57 Q120 60 132 68 Q138 73 138 83 Q132 92 122 90 Q115 81 111 73 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Conexión trapecios arriba */}
      <path d="M89 57 Q100 63 111 57" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Línea espinal */}
      <line x1="100" y1="57" x2="100" y2="165" stroke={sm} strokeWidth=".8"/>
      {/* Deltoides posterior izq */}
      <path d="M62 83 Q55 87 52 96 Q53 106 58 110 L65 106 Q62 98 63 89 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Deltoides posterior der */}
      <path d="M138 83 Q145 87 148 96 Q147 106 142 110 L135 106 Q138 98 137 89 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Infraespinoso + Redondo mayor izq */}
      <path d="M62 83 Q64 98 66 112 L75 110 Q74 96 72 83 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Infraespinoso + Redondo mayor der */}
      <path d="M138 83 Q136 98 134 112 L125 110 Q126 96 128 83 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Romboides / Espalda alta */}
      <path d="M89 73 Q100 78 111 73 L112 100 Q100 107 88 100 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Trícep izq */}
      <path d="M52 96 Q47 110 47 126 Q48 137 53 143 L60 139 Q57 128 57 114 Q58 106 62 100 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Línea cabeza larga trícep izq */}
      <path d="M57 108 Q58 118 58 128" fill="none" stroke={sm} strokeWidth=".6"/>
      {/* Trícep der */}
      <path d="M148 96 Q153 110 153 126 Q152 137 147 143 L140 139 Q143 128 143 114 Q142 106 138 100 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Línea cabeza larga trícep der */}
      <path d="M143 108 Q142 118 142 128" fill="none" stroke={sm} strokeWidth=".6"/>
      {/* Dorsal ancho izq */}
      <path d="M72 88 Q70 108 72 132 Q75 150 85 165 L90 163 Q83 148 82 130 Q81 108 80 90 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Dorsal ancho der */}
      <path d="M128 88 Q130 108 128 132 Q125 150 115 165 L110 163 Q117 148 118 130 Q119 108 120 90 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Espalda baja / Lumbar */}
      <path d="M88 100 L88 165 Q94 170 100 170 Q106 170 112 165 L112 100 Q100 108 88 100 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Líneas lumbares */}
      <path d="M88 120 Q100 124 112 120" fill="none" stroke={sm} strokeWidth=".7"/>
      <path d="M88 140 Q100 144 112 140" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Antebrazo posterior izq */}
      <path d="M47 126 Q43 141 43 158 Q44 169 48 174 L53 172 Q51 162 51 148 L51 132 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Antebrazo posterior der */}
      <path d="M153 126 Q157 141 157 158 Q156 169 152 174 L147 172 Q149 162 149 148 L149 132 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Mano izq */}
      <path d="M43 158 Q39 168 38 178 Q39 186 47 190 Q53 186 53 172 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Mano der */}
      <path d="M157 158 Q161 168 162 178 Q161 186 153 190 Q147 186 147 172 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Glúteo izq - grande y redondeado */}
      <path d="M84 165 Q75 172 73 185 Q72 200 80 210 Q89 215 100 213 L100 170 Q92 170 84 165 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Glúteo der */}
      <path d="M116 165 Q125 172 127 185 Q128 200 120 210 Q111 215 100 213 L100 170 Q108 170 116 165 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Separación glútea */}
      <line x1="100" y1="165" x2="100" y2="213" stroke={sm} strokeWidth=".7"/>
      {/* Pliegue glúteo */}
      <path d="M73 205 Q86 214 100 215 Q114 214 127 205" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Isquiotibial izq - contorno */}
      <path d="M73 200 Q68 218 68 240 Q69 256 76 265 L84 262 Q79 248 79 228 Q80 210 85 202 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Isquiotibial izq - separación bíceps femoral */}
      <path d="M85 204 Q87 222 88 240 Q87 254 85 262" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Isquiotibial der - contorno */}
      <path d="M127 200 Q132 218 132 240 Q131 256 124 265 L116 262 Q121 248 121 228 Q120 210 115 202 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Isquiotibial der - separación */}
      <path d="M115 204 Q113 222 112 240 Q113 254 115 262" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Hueco poplíteo izq */}
      <path d="M68 264 Q74 271 82 273 Q90 271 96 264" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Hueco poplíteo der */}
      <path d="M132 264 Q126 271 118 273 Q110 271 104 264" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Gemelo izq - cabeza medial y lateral */}
      <path d="M68 270 Q64 286 65 304 Q67 318 73 327 L79 324 Q77 312 77 298 Q77 281 79 270 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Línea entre cabezas gemelo izq */}
      <path d="M79 272 Q83 286 83 300 Q82 314 80 324" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Gemelo der - cabeza medial y lateral */}
      <path d="M132 270 Q136 286 135 304 Q133 318 127 327 L121 324 Q123 312 123 298 Q123 281 121 270 Z" fill="none" stroke={s} strokeWidth={sw}/>
      {/* Línea entre cabezas gemelo der */}
      <path d="M121 272 Q117 286 117 300 Q118 314 120 324" fill="none" stroke={sm} strokeWidth=".7"/>
      {/* Tendón de Aquiles izq */}
      <path d="M73 325 Q70 334 71 344 Q73 353 78 355 Q83 353 84 346 L83 330 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Pie posterior izq */}
      <path d="M71 344 Q67 353 65 363 Q64 373 70 379 Q80 383 91 379 Q95 371 91 361 L84 346 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Tendón de Aquiles der */}
      <path d="M127 325 Q130 334 129 344 Q127 353 122 355 Q117 353 116 346 L117 330 Z" fill="none" stroke={s} strokeWidth={sw2}/>
      {/* Pie posterior der */}
      <path d="M129 344 Q133 353 135 363 Q136 373 130 379 Q120 383 109 379 Q105 371 109 361 L116 346 Z" fill="none" stroke={s} strokeWidth={sw2}/>
    </>
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
      if (d < z.r + 12 && d < minDist) { minDist = d; nearest = z }
    }
    if (nearest) onSelect(nearest.label)
  }

  const selectedZone = selected ? zones.find(z => z.label === selected) : null

  return (
    <div>
      {/* Toggle frontal/trasero */}
      <div style={{ display:'flex', gap:6, marginBottom:14 }}>
        {[['front','Vista Frontal'],['back','Vista Trasera']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s)} style={{
            flex:1, padding:'8px 0', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:700,
            letterSpacing:'0.06em',
            border: side===s ? '1.5px solid rgba(239,68,68,.7)' : '1px solid rgba(239,68,68,.2)',
            background: side===s ? 'rgba(239,68,68,.12)' : 'transparent',
            color: side===s ? '#f87171' : 'rgba(248,113,113,.4)',
            transition:'all .15s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
        {/* SVG anatómico */}
        <div style={{ flexShrink:0, position:'relative' }}>
          <svg
            viewBox="0 0 200 400"
            width="160"
            style={{ cursor:'crosshair', display:'block', overflow:'visible' }}
            onClick={handleSVGClick}
          >
            <defs>
              <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <rect width="200" height="400" fill="transparent"/>

            {/* Figura anatómica */}
            {side === 'front' ? <FrontBodySVG /> : <BackBodySVG />}

            {/* Zonas clickeables (invisible, solo para interacción) */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle
                  key={z.id}
                  cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.3)' : 'rgba(56,189,248,.03)'}
                  stroke={isSel ? 'rgba(239,68,68,.8)' : 'rgba(56,189,248,.1)'}
                  strokeWidth={isSel ? 2 : .8}
                  style={{ cursor:'pointer', transition:'all .15s' }}
                />
              )
            })}

            {/* PIN zona seleccionada */}
            {selectedZone && (
              <g filter="url(#pinGlow)">
                <circle cx={selectedZone.cx} cy={selectedZone.cy} r={selectedZone.r + 6} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.35}/>
                <circle cx={selectedZone.cx} cy={selectedZone.cy} r={selectedZone.r + 11} fill="none" stroke="#ef4444" strokeWidth="0.8" opacity={0.15}/>
                <circle cx={selectedZone.cx} cy={selectedZone.cy} r={9} fill="#ef4444" opacity={0.95}/>
                <circle cx={selectedZone.cx} cy={selectedZone.cy} r={3.5} fill="white" opacity={0.95}/>
              </g>
            )}
          </svg>
          <p style={{ fontSize:9, color:'rgba(125,211,252,.5)', textAlign:'center', marginTop:4, letterSpacing:'0.05em' }}>Tocá la zona</p>
        </div>

        {/* Lista de zonas */}
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:10, color:'rgba(125,211,252,.5)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.07em' }}>O elegí de la lista:</p>
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
