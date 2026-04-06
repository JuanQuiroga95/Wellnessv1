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

// SVG anatómico frontal - trazado profesional con grupos musculares definidos
const FRONT_SVG = `<svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="fglow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="fglowStrong" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Cabeza -->
  <ellipse cx="100" cy="26" rx="18" ry="21" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Cuello -->
  <path d="M91 44 Q100 50 109 44 L111 56 Q100 58 89 56 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Trapecio izq-->
  <path d="M89 56 Q80 60 68 66 Q63 70 62 77 L72 80 Q76 72 84 68 L89 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Trapecio der-->
  <path d="M111 56 Q120 60 132 66 Q137 70 138 77 L128 80 Q124 72 116 68 L111 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Claviculas -->
  <path d="M89 57 Q100 54 111 57" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pectoral izq -->
  <path d="M89 62 L89 98 Q95 105 100 105 L100 65 Q96 63 89 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Pectoral der -->
  <path d="M111 62 L111 98 Q105 105 100 105 L100 65 Q104 63 111 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Linea esternal -->
  <line x1="100" y1="57" x2="100" y2="105" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Hombro izq (deltoides) -->
  <path d="M68 66 Q60 68 56 78 Q54 88 58 96 L65 92 Q62 84 64 76 L72 73 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Hombro der (deltoides) -->
  <path d="M132 66 Q140 68 144 78 Q146 88 142 96 L135 92 Q138 84 136 76 L128 73 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Bicep izq -->
  <path d="M58 96 Q53 108 54 122 Q56 130 60 134 L66 130 Q63 122 62 112 L65 100 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Bicep der -->
  <path d="M142 96 Q147 108 146 122 Q144 130 140 134 L134 130 Q137 122 138 112 L135 100 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Antebrazo izq (externo) -->
  <path d="M54 122 Q50 136 50 152 Q51 162 54 168 L59 165 Q57 156 57 144 L57 126 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Antebrazo izq (interno) -->
  <path d="M60 134 Q62 148 62 158 L59 165 Z" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".8"/>
  <!-- Antebrazo der (externo) -->
  <path d="M146 122 Q150 136 150 152 Q149 162 146 168 L141 165 Q143 156 143 144 L143 126 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Antebrazo der (interno) -->
  <path d="M140 134 Q138 148 138 158 L141 165 Z" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".8"/>
  <!-- Muñeca/mano izq -->
  <path d="M50 152 Q46 162 45 172 Q46 180 54 183 Q59 179 60 168 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Muñeca/mano der -->
  <path d="M150 152 Q154 162 155 172 Q154 180 146 183 Q141 179 140 168 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Abdomen - recto abdominal contorno -->
  <path d="M89 105 L89 162 Q94 168 100 168 Q106 168 111 162 L111 105 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width="1"/>
  <!-- Líneas abs horizontales -->
  <path d="M89 120 Q100 122 111 120" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <path d="M89 134 Q100 136 111 134" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <path d="M89 148 Q100 150 111 148" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Línea alba (centro abdomen) -->
  <line x1="100" y1="105" x2="100" y2="162" stroke="rgba(180,200,220,.35)" stroke-width=".7"/>
  <!-- Serrato izq -->
  <path d="M72 80 L74 105 Q80 120 84 138 L89 138" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".8"/>
  <!-- Serrato der -->
  <path d="M128 80 L126 105 Q120 120 116 138 L111 138" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".8"/>
  <!-- Oblicuo izq -->
  <path d="M74 120 Q76 145 83 162 L89 162" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".9"/>
  <!-- Oblicuo der -->
  <path d="M126 120 Q124 145 117 162 L111 162" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".9"/>
  <!-- Cadera/ingle izq -->
  <path d="M83 162 Q79 170 77 182 Q76 192 80 198 L87 195 Q85 188 85 178 Q86 170 89 162 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Cadera/ingle der -->
  <path d="M117 162 Q121 170 123 182 Q124 192 120 198 L113 195 Q115 188 115 178 Q114 170 111 162 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Pubis -->
  <path d="M83 162 Q100 170 117 162" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Cuadricep izq -->
  <path d="M77 182 Q72 200 72 220 Q73 238 78 252 L86 250 Q82 236 82 218 Q83 200 87 184 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea interna cuad izq -->
  <path d="M85 185 Q88 204 88 222 Q87 238 84 250" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Cuadricep der -->
  <path d="M123 182 Q128 200 128 220 Q127 238 122 252 L114 250 Q118 236 118 218 Q117 200 113 184 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea interna cuad der -->
  <path d="M115 185 Q112 204 112 222 Q113 238 116 250" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Separación entre cuad izq y der -->
  <path d="M87 184 Q92 195 100 196 Q108 195 113 184" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Rótula izq -->
  <ellipse cx="80" cy="260" rx="8" ry="9" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Rótula der -->
  <ellipse cx="120" cy="260" rx="8" ry="9" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Tibia izq -->
  <path d="M74 268 Q73 285 74 300 Q75 312 78 320 L83 318 Q81 306 81 294 Q81 278 82 268 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Tibia/peroné izq -->
  <path d="M82 268 Q84 283 84 298 Q83 310 81 318" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Tibia der -->
  <path d="M126 268 Q127 285 126 300 Q125 312 122 320 L117 318 Q119 306 119 294 Q119 278 118 268 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Tibia/peroné der -->
  <path d="M118 268 Q116 283 116 298 Q117 310 119 318" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Tobillo/pie izq -->
  <path d="M74 318 Q70 326 70 336 Q71 344 78 347 Q84 346 86 340 Q86 332 84 322 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie izq -->
  <path d="M70 336 Q66 345 64 356 Q63 366 68 372 Q78 376 88 372 Q92 366 88 356 L86 340 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Tobillo/pie der -->
  <path d="M126 318 Q130 326 130 336 Q129 344 122 347 Q116 346 114 340 Q114 332 116 322 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie der -->
  <path d="M130 336 Q134 345 136 356 Q137 366 132 372 Q122 376 112 372 Q108 366 112 356 L114 340 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Dedos pie izq (silueta) -->
  <path d="M64 356 Q63 368 68 372 Q78 376 88 372 Q92 366 90 362 Q85 368 78 368 Q70 367 68 362 Z" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".6"/>
  <!-- Dedos pie der (silueta) -->
  <path d="M136 356 Q137 368 132 372 Q122 376 112 372 Q108 366 110 362 Q115 368 122 368 Q130 367 132 362 Z" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".6"/>
</svg>`;

// SVG anatómico trasero - vista posterior con grupos musculares definidos
const BACK_SVG = `<svg viewBox="0 0 200 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="bglow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="bglowStrong" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Cabeza posterior -->
  <ellipse cx="100" cy="26" rx="18" ry="21" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Cuello posterior -->
  <path d="M91 44 Q100 50 109 44 L111 56 Q100 58 89 56 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Trapecio izq (grande, triangular) -->
  <path d="M89 56 Q80 58 68 66 Q63 70 62 80 Q68 88 76 86 Q82 78 89 72 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Trapecio der -->
  <path d="M111 56 Q120 58 132 66 Q137 70 138 80 Q132 88 124 86 Q118 78 111 72 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Línea trapecios centro espalda alta -->
  <path d="M89 56 Q100 62 111 56" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".8"/>
  <!-- Deltoides posterior izq -->
  <path d="M62 80 Q56 84 54 92 Q56 100 60 104 L67 98 Q64 92 65 84 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Deltoides posterior der -->
  <path d="M138 80 Q144 84 146 92 Q144 100 140 104 L133 98 Q136 92 135 84 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Infraespinoso + Redondo izq -->
  <path d="M65 84 Q68 100 70 112 L78 110 Q77 96 75 84 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Infraespinoso + Redondo der -->
  <path d="M135 84 Q132 100 130 112 L122 110 Q123 96 125 84 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Romboides / Espalda alta centro -->
  <path d="M89 72 Q100 76 111 72 L112 98 Q100 104 88 98 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea espinal -->
  <line x1="100" y1="56" x2="100" y2="162" stroke="rgba(180,200,220,.4)" stroke-width=".8"/>
  <!-- Trícep izq -->
  <path d="M60 104 Q55 116 54 130 Q55 140 60 146 L66 142 Q63 132 63 118 Q64 110 68 106 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Trícep der -->
  <path d="M140 104 Q145 116 146 130 Q145 140 140 146 L134 142 Q137 132 137 118 Q136 110 132 106 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Dorsal izq -->
  <path d="M72 86 Q70 106 72 130 Q75 148 84 162 L89 160 Q82 146 80 128 Q79 108 79 88 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Dorsal der -->
  <path d="M128 86 Q130 106 128 130 Q125 148 116 162 L111 160 Q118 146 120 128 Q121 108 121 88 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Espalda baja/lumbar -->
  <path d="M89 98 L89 162 Q94 168 100 168 Q106 168 111 162 L111 98 Q100 106 89 98 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width="1"/>
  <!-- Líneas lumbares -->
  <path d="M89 120 Q100 124 111 120" fill="none" stroke="rgba(180,200,220,.35)" stroke-width=".7"/>
  <path d="M89 138 Q100 142 111 138" fill="none" stroke="rgba(180,200,220,.35)" stroke-width=".7"/>
  <!-- Antebrazo posterior izq -->
  <path d="M54 130 Q50 144 50 160 Q51 170 55 174 L60 172 Q58 162 58 148 L57 136 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Antebrazo posterior der -->
  <path d="M146 130 Q150 144 150 160 Q149 170 145 174 L140 172 Q142 162 142 148 L143 136 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Mano izq -->
  <path d="M50 160 Q46 170 45 180 Q46 188 54 191 Q60 187 60 172 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Mano der -->
  <path d="M150 160 Q154 170 155 180 Q154 188 146 191 Q140 187 140 172 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Glúteo izq -->
  <path d="M84 162 Q76 168 74 180 Q74 196 82 206 Q90 210 100 208 L100 168 Q92 168 84 162 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Glúteo der -->
  <path d="M116 162 Q124 168 126 180 Q126 196 118 206 Q110 210 100 208 L100 168 Q108 168 116 162 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Línea glútea -->
  <path d="M84 162 Q100 170 116 162" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Isquiotibial izq -->
  <path d="M74 198 Q70 216 70 236 Q71 250 77 260 L84 257 Q80 244 80 226 Q81 208 84 196 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea interna isquiotibial izq -->
  <path d="M84 198 Q86 216 87 234 Q86 248 84 258" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Isquiotibial der -->
  <path d="M126 198 Q130 216 130 236 Q129 250 123 260 L116 257 Q120 244 120 226 Q119 208 116 196 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea interna isquiotibial der -->
  <path d="M116 198 Q114 216 113 234 Q114 248 116 258" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Hueco poplíteo izq (corva) -->
  <path d="M74 260 Q78 266 84 268 Q90 266 94 260" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Hueco poplíteo der (corva) -->
  <path d="M126 260 Q122 266 116 268 Q110 266 106 260" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Gemelo izq (cabeza medial y lateral) -->
  <path d="M74 266 Q70 280 71 298 Q73 312 78 322 L84 319 Q81 308 80 294 Q80 278 82 266 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea gemelo izq -->
  <path d="M82 268 Q86 282 86 296 Q85 310 83 320" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Gemelo der (cabeza medial y lateral) -->
  <path d="M126 266 Q130 280 129 298 Q127 312 122 322 L116 319 Q119 308 120 294 Q120 278 118 266 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea gemelo der -->
  <path d="M118 268 Q114 282 114 296 Q115 310 117 320" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Tendón aquiles / talón izq -->
  <path d="M78 320 Q75 330 76 340 Q78 348 82 350 Q86 348 87 342 L86 326 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie posterior izq -->
  <path d="M76 340 Q72 348 70 358 Q69 368 74 374 Q84 378 90 372 Q94 364 90 354 L87 342 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Tendón aquiles / talón der -->
  <path d="M122 320 Q125 330 124 340 Q122 348 118 350 Q114 348 113 342 L114 326 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie posterior der -->
  <path d="M124 340 Q128 348 130 358 Q131 368 126 374 Q116 378 110 372 Q106 364 110 354 L113 342 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
</svg>`;

function BodyMap({ onSelect, selected }) {
  const [side, setSide] = useState('front')
  const zones = side === 'front' ? FRONT_ZONES : BACK_ZONES
  const svgSource = side === 'front' ? FRONT_SVG : BACK_SVG

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

  // Find selected zone for pin rendering
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
        {/* SVG anatómico profesional */}
        <div style={{ flexShrink:0, position:'relative' }}>
          <svg
            viewBox="0 0 200 400"
            width="160"
            style={{ cursor:'crosshair', display:'block', overflow:'visible', filter:'drop-shadow(0 0 14px rgba(56,189,248,.25))' }}
            onClick={handleSVGClick}
          >
            <defs>
              <filter id="xglowS" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Fondo transparente */}
            <rect width="200" height="400" fill="transparent"/>

            {/* SVG anatómico renderizado como foreignObject o como dangerouslySetInnerHTML en grupo */}
            <g dangerouslySetInnerHTML={{ __html: side === 'front'
              ? `<!-- Cabeza -->
  <ellipse cx="100" cy="26" rx="18" ry="21" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <ellipse cx="100" cy="26" rx="14" ry="17" fill="none" stroke="rgba(180,200,220,.3)" stroke-width=".6"/>
  <!-- Cuello -->
  <path d="M91 44 Q100 50 109 44 L111 56 Q100 58 89 56 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Trapecio izq-->
  <path d="M89 56 Q80 60 68 66 Q63 70 62 77 L72 80 Q76 72 84 68 L89 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Trapecio der-->
  <path d="M111 56 Q120 60 132 66 Q137 70 138 77 L128 80 Q124 72 116 68 L111 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Claviculas -->
  <path d="M89 57 Q100 54 111 57" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pectoral izq -->
  <path d="M89 62 L89 98 Q95 105 100 105 L100 65 Q96 63 89 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Pectoral der -->
  <path d="M111 62 L111 98 Q105 105 100 105 L100 65 Q104 63 111 62 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Linea esternal -->
  <line x1="100" y1="57" x2="100" y2="105" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Hombro izq deltoides -->
  <path d="M68 66 Q60 68 56 78 Q54 88 58 96 L65 92 Q62 84 64 76 L72 73 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Hombro der deltoides -->
  <path d="M132 66 Q140 68 144 78 Q146 88 142 96 L135 92 Q138 84 136 76 L128 73 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Bicep izq -->
  <path d="M58 96 Q53 108 54 122 Q56 130 60 134 L66 130 Q63 122 62 112 L65 100 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Pico bicep izq -->
  <path d="M56 110 Q55 118 57 122" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Bicep der -->
  <path d="M142 96 Q147 108 146 122 Q144 130 140 134 L134 130 Q137 122 138 112 L135 100 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Pico bicep der -->
  <path d="M144 110 Q145 118 143 122" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Antebrazo izq externo -->
  <path d="M54 122 Q50 136 50 152 Q51 162 54 168 L59 165 Q57 156 57 144 L57 126 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Antebrazo izq interno -->
  <path d="M60 134 Q62 148 62 158 L59 165 Z" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".8"/>
  <!-- Antebrazo der externo -->
  <path d="M146 122 Q150 136 150 152 Q149 162 146 168 L141 165 Q143 156 143 144 L143 126 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Antebrazo der interno -->
  <path d="M140 134 Q138 148 138 158 L141 165 Z" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".8"/>
  <!-- Mano izq -->
  <path d="M50 152 Q46 162 45 172 Q46 180 54 183 Q59 179 60 168 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Mano der -->
  <path d="M150 152 Q154 162 155 172 Q154 180 146 183 Q141 179 140 168 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Abdomen recto abdominal -->
  <path d="M89 105 L89 162 Q94 168 100 168 Q106 168 111 162 L111 105 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width="1"/>
  <!-- Líneas abs -->
  <path d="M89 120 Q100 122 111 120" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <path d="M89 134 Q100 136 111 134" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <path d="M89 148 Q100 150 111 148" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Línea alba -->
  <line x1="100" y1="105" x2="100" y2="162" stroke="rgba(180,200,220,.35)" stroke-width=".7"/>
  <!-- Serrato izq -->
  <path d="M72 80 L74 105 Q80 120 84 138 L89 138" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".8"/>
  <!-- Serrato der -->
  <path d="M128 80 L126 105 Q120 120 116 138 L111 138" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".8"/>
  <!-- Oblicuo izq -->
  <path d="M74 120 Q76 145 83 162 L89 162" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".9"/>
  <!-- Oblicuo der -->
  <path d="M126 120 Q124 145 117 162 L111 162" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".9"/>
  <!-- Cadera izq -->
  <path d="M83 162 Q79 170 77 182 Q76 192 80 198 L87 195 Q85 188 85 178 Q86 170 89 162 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Cadera der -->
  <path d="M117 162 Q121 170 123 182 Q124 192 120 198 L113 195 Q115 188 115 178 Q114 170 111 162 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Pubis -->
  <path d="M83 162 Q100 170 117 162" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Cuadricep izq -->
  <path d="M77 182 Q72 200 72 220 Q73 238 78 252 L86 250 Q82 236 82 218 Q83 200 87 184 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea interna cuad izq -->
  <path d="M85 185 Q88 204 88 222 Q87 238 84 250" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Cuadricep der -->
  <path d="M123 182 Q128 200 128 220 Q127 238 122 252 L114 250 Q118 236 118 218 Q117 200 113 184 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea interna cuad der -->
  <path d="M115 185 Q112 204 112 222 Q113 238 116 250" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Separación cuad -->
  <path d="M87 184 Q92 195 100 196 Q108 195 113 184" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Rótula izq -->
  <ellipse cx="80" cy="260" rx="8" ry="9" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Rótula der -->
  <ellipse cx="120" cy="260" rx="8" ry="9" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Tibia izq -->
  <path d="M74 268 Q73 285 74 300 Q75 312 78 320 L83 318 Q81 306 81 294 Q81 278 82 268 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <path d="M82 268 Q84 283 84 298 Q83 310 81 318" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Tibia der -->
  <path d="M126 268 Q127 285 126 300 Q125 312 122 320 L117 318 Q119 306 119 294 Q119 278 118 268 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <path d="M118 268 Q116 283 116 298 Q117 310 119 318" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Tobillo izq -->
  <path d="M74 318 Q70 326 70 336 Q71 344 78 347 Q84 346 86 340 Q86 332 84 322 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie izq -->
  <path d="M70 336 Q66 345 64 356 Q63 366 68 372 Q78 376 88 372 Q92 366 88 356 L86 340 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Tobillo der -->
  <path d="M126 318 Q130 326 130 336 Q129 344 122 347 Q116 346 114 340 Q114 332 116 322 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie der -->
  <path d="M130 336 Q134 345 136 356 Q137 366 132 372 Q122 376 112 372 Q108 366 112 356 L114 340 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>`
              : `<!-- Cabeza posterior -->
  <ellipse cx="100" cy="26" rx="18" ry="21" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <ellipse cx="100" cy="26" rx="14" ry="17" fill="none" stroke="rgba(180,200,220,.3)" stroke-width=".6"/>
  <!-- Cuello posterior -->
  <path d="M91 44 Q100 50 109 44 L111 56 Q100 58 89 56 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Trapecio izq -->
  <path d="M89 56 Q80 58 68 66 Q63 70 62 80 Q68 88 76 86 Q82 78 89 72 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Trapecio der -->
  <path d="M111 56 Q120 58 132 66 Q137 70 138 80 Q132 88 124 86 Q118 78 111 72 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Línea trapecios -->
  <path d="M89 56 Q100 62 111 56" fill="none" stroke="rgba(180,200,220,.5)" stroke-width=".8"/>
  <!-- Deltoides posterior izq -->
  <path d="M62 80 Q56 84 54 92 Q56 100 60 104 L67 98 Q64 92 65 84 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Deltoides posterior der -->
  <path d="M138 80 Q144 84 146 92 Q144 100 140 104 L133 98 Q136 92 135 84 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Infraespinoso izq -->
  <path d="M65 84 Q68 100 70 112 L78 110 Q77 96 75 84 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Infraespinoso der -->
  <path d="M135 84 Q132 100 130 112 L122 110 Q123 96 125 84 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Romboides / Espalda alta -->
  <path d="M89 72 Q100 76 111 72 L112 98 Q100 104 88 98 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea espinal -->
  <line x1="100" y1="56" x2="100" y2="162" stroke="rgba(180,200,220,.4)" stroke-width=".8"/>
  <!-- Trícep izq -->
  <path d="M60 104 Q55 116 54 130 Q55 140 60 146 L66 142 Q63 132 63 118 Q64 110 68 106 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea trícep izq -->
  <path d="M63 116 Q65 124 65 132" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Trícep der -->
  <path d="M140 104 Q145 116 146 130 Q145 140 140 146 L134 142 Q137 132 137 118 Q136 110 132 106 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Línea trícep der -->
  <path d="M137 116 Q135 124 135 132" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Dorsal izq -->
  <path d="M72 86 Q70 106 72 130 Q75 148 84 162 L89 160 Q82 146 80 128 Q79 108 79 88 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Dorsal der -->
  <path d="M128 86 Q130 106 128 130 Q125 148 116 162 L111 160 Q118 146 120 128 Q121 108 121 88 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <!-- Espalda baja lumbar -->
  <path d="M89 98 L89 162 Q94 168 100 168 Q106 168 111 162 L111 98 Q100 106 89 98 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width="1"/>
  <!-- Líneas lumbares -->
  <path d="M89 120 Q100 124 111 120" fill="none" stroke="rgba(180,200,220,.35)" stroke-width=".7"/>
  <path d="M89 138 Q100 142 111 138" fill="none" stroke="rgba(180,200,220,.35)" stroke-width=".7"/>
  <!-- Antebrazo posterior izq -->
  <path d="M54 130 Q50 144 50 160 Q51 170 55 174 L60 172 Q58 162 58 148 L57 136 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Antebrazo posterior der -->
  <path d="M146 130 Q150 144 150 160 Q149 170 145 174 L140 172 Q142 162 142 148 L143 136 Z" fill="none" stroke="rgba(180,200,220,.6)" stroke-width=".9"/>
  <!-- Mano izq -->
  <path d="M50 160 Q46 170 45 180 Q46 188 54 191 Q60 187 60 172 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Mano der -->
  <path d="M150 160 Q154 170 155 180 Q154 188 146 191 Q140 187 140 172 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Glúteo izq -->
  <path d="M84 162 Q76 168 74 180 Q74 196 82 206 Q90 210 100 208 L100 168 Q92 168 84 162 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Glúteo der -->
  <path d="M116 162 Q124 168 126 180 Q126 196 118 206 Q110 210 100 208 L100 168 Q108 168 116 162 Z" fill="none" stroke="rgba(180,200,220,.7)" stroke-width="1.1"/>
  <!-- Separación glútea -->
  <line x1="100" y1="162" x2="100" y2="208" stroke="rgba(180,200,220,.35)" stroke-width=".7"/>
  <!-- Isquiotibial izq -->
  <path d="M74 198 Q70 216 70 236 Q71 250 77 260 L84 257 Q80 244 80 226 Q81 208 84 196 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <path d="M84 198 Q86 216 87 234 Q86 248 84 258" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Isquiotibial der -->
  <path d="M126 198 Q130 216 130 236 Q129 250 123 260 L116 257 Q120 244 120 226 Q119 208 116 196 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <path d="M116 198 Q114 216 113 234 Q114 248 116 258" fill="none" stroke="rgba(180,200,220,.4)" stroke-width=".7"/>
  <!-- Corva izq -->
  <path d="M74 260 Q78 266 84 268 Q90 266 94 260" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Corva der -->
  <path d="M126 260 Q122 266 116 268 Q110 266 106 260" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Gemelo izq -->
  <path d="M74 266 Q70 280 71 298 Q73 312 78 322 L84 319 Q81 308 80 294 Q80 278 82 266 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <path d="M82 268 Q86 282 86 296 Q85 310 83 320" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Gemelo der -->
  <path d="M126 266 Q130 280 129 298 Q127 312 122 322 L116 319 Q119 308 120 294 Q120 278 118 266 Z" fill="none" stroke="rgba(180,200,220,.65)" stroke-width="1"/>
  <path d="M118 268 Q114 282 114 296 Q115 310 117 320" fill="none" stroke="rgba(180,200,220,.45)" stroke-width=".7"/>
  <!-- Talón izq -->
  <path d="M78 320 Q75 330 76 340 Q78 348 82 350 Q86 348 87 342 L86 326 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie posterior izq -->
  <path d="M76 340 Q72 348 70 358 Q69 368 74 374 Q84 378 90 372 Q94 364 90 354 L87 342 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Talón der -->
  <path d="M122 320 Q125 330 124 340 Q122 348 118 350 Q114 348 113 342 L114 326 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>
  <!-- Pie posterior der -->
  <path d="M124 340 Q128 348 130 358 Q131 368 126 374 Q116 378 110 372 Q106 364 110 354 L113 342 Z" fill="none" stroke="rgba(180,200,220,.55)" stroke-width=".9"/>`
            }} />

            {/* Zonas clickeables */}
            {zones.map(z => {
              const isSel = selected === z.label
              return (
                <circle
                  key={z.id}
                  cx={z.cx} cy={z.cy} r={z.r}
                  fill={isSel ? 'rgba(239,68,68,.35)' : 'rgba(56,189,248,.04)'}
                  stroke={isSel ? '#ef4444' : 'rgba(56,189,248,.15)'}
                  strokeWidth={isSel ? 2 : 1}
                  style={{ cursor:'pointer', transition:'all .15s' }}
                />
              )
            })}

            {/* PIN zona seleccionada */}
            {selectedZone && (
              <g filter="url(#xglowS)">
                <circle cx={selectedZone.cx} cy={selectedZone.cy} r={selectedZone.r + 5} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity={0.4}/>
                <circle cx={selectedZone.cx} cy={selectedZone.cy} r={selectedZone.r + 9} fill="none" stroke="#ef4444" strokeWidth="0.8" opacity={0.2}/>
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
