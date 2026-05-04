'use client'
import { useState } from 'react'

const MUSCLE_GROUPS = {
  // Vista Frontal
  cabeza:    { label: 'Cabeza', color: '#94a3b8' },
  cuello:    { label: 'Cuello', color: '#94a3b8' },
  deltoides: { label: 'Deltoides', color: '#fb923c' },
  pecho:     { label: 'Pectorales', color: '#f87171' },
  biceps:    { label: 'Bíceps', color: '#fbbf24' },
  antebrazos:{ label: 'Antebrazos', color: '#a3e635' },
  abdomen:   { label: 'Abdominales', color: '#4ade80' },
  oblicuos:  { label: 'Oblicuos', color: '#2dd4bf' },
  cuadriceps:{ label: 'Cuádriceps', color: '#60a5fa' },
  aductores: { label: 'Aductores', color: '#818cf8' },
  tibiales:  { label: 'Tibiales', color: '#c084fc' },
  // Vista Posterior
  trapecio:  { label: 'Trapecio', color: '#f43f5e' },
  triceps:   { label: 'Tríceps', color: '#fbbf24' },
  dorsales:  { label: 'Dorsales', color: '#f59e0b' },
  lumbares:  { label: 'Lumbares', color: '#10b981' },
  gluteos:   { label: 'Glúteos', color: '#22d3ee' },
  isquios:   { label: 'Isquiotibiales', color: '#6366f1' },
  gemelos:   { label: 'Gemelos', color: '#ec4899' },
}

const STROKE = '#1e293b'

export default function AnatomicalBodyMap({ onSelect, selected }) {
  const [side, setSide] = useState<'front'|'back'>('front')
  const [hovered, setHovered] = useState<string | null>(null)

  const isSelected = (label: string) => selected === label
  const isHovered = (id: string) => hovered === id

  const getStyle = (id: string, color: string) => ({
    fill: isSelected(MUSCLE_GROUPS[id].label) ? color : isHovered(id) ? `${color}99` : `${color}33`,
    stroke: isSelected(MUSCLE_GROUPS[id].label) ? '#fff' : STROKE,
    strokeWidth: isSelected(MUSCLE_GROUPS[id].label) ? 1.5 : 0.5,
    transition: 'all 0.2s ease',
    cursor: 'pointer'
  })

  const Zone = ({ id, d }: { id: string, d: string }) => (
    <path 
      d={d} 
      {...getStyle(id, MUSCLE_GROUPS[id].color)}
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      onClick={() => onSelect(MUSCLE_GROUPS[id].label)}
    />
  )

  return (
    <div style={{ background: '#0f172a', padding: 20, borderRadius: 16, border: '1px solid #1e293b' }}>
      <div style={{ display:'flex', gap:8, marginBottom:20 }}>
        {[['front','Vista Frontal'],['back','Vista Posterior']].map(([s,l]) => (
          <button key={s} type="button" onClick={() => setSide(s as any)} style={{
            flex:1, padding:'10px', borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:700,
            border: side===s ? '2px solid #ef4444' : '1px solid #334155',
            background: side===s ? '#ef444415' : '#1e293b',
            color: side===s ? '#f87171' : '#94a3b8',
            transition:'all .15s',
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 200 400" width="180" height="360">
          {side === 'front' ? (
            <g>
              {/* CABEZA */}
              <Zone id="cabeza" d="M100,10 c-10,0 -15,8 -15,18 s5,18 15,18 s15,-8 15,-18 s-5,-18 -15,-18" />
              {/* CUELLO */}
              <Zone id="cuello" d="M92,46 h16 v8 h-16 z" />
              {/* TRAPECIO FRONTAL */}
              <Zone id="trapecio" d="M92,46 l-12,4 c-10,2 -15,10 -15,10 l5,5 c5,-5 12,-10 22,-10 z M108,46 l12,4 c10,2 15,10 15,10 l-5,5 c-5,-5 -12,-10 -22,-10 z" />
              {/* PECHO */}
              <Zone id="pecho" d="M100,85 c-15,0 -25,5 -30,15 c-2,5 -2,15 2,20 c10,0 20,-5 28,-15 z M100,85 c15,0 25,5 30,15 c2,5 2,15 -2,20 c-10,0 -20,-5 -28,-15 z" />
              {/* DELTOIDES */}
              <Zone id="deltoides" d="M68,65 c-8,2 -12,10 -12,20 s4,25 10,25 s8,-15 8,-25 s-2,-18 -6,-20 z M132,65 c8,2 12,10 12,20 s-4,25 -10,25 s-8,-15 -8,-25 s2,-18 6,-20 z" />
              {/* BICEPS */}
              <Zone id="biceps" d="M56,110 c-4,10 -4,30 2,40 c4,0 8,-10 8,-25 s-2,-15 -10,-15 z M144,110 c4,10 4,30 -2,40 c-4,0 -8,-10 -8,-25 s2,-15 10,-15 z" />
              {/* ANTEBRAZOS */}
              <Zone id="antebrazos" d="M58,155 c-5,15 -5,40 5,50 c4,0 6,-15 6,-30 s-2,-20 -11,-20 z M142,155 c5,15 5,40 -5,50 c-4,0 -6,-15 -6,-30 s2,-20 11,-20 z" />
              {/* ABDOMEN */}
              <Zone id="abdomen" d="M85,125 h30 v15 h-30 z M85,142 h30 v15 h-30 z M85,159 h30 v15 h-30 z" />
              {/* OBLICUOS */}
              <Zone id="oblicuos" d="M82,125 c-5,10 -5,40 0,50 h3 c-3,-15 -3,-35 0,-50 z M118,125 c5,10 5,40 0,50 h-3 c3,-15 3,-35 0,-50 z" />
              {/* CUADRICEPS */}
              <Zone id="cuadriceps" d="M72,200 c-5,20 -5,60 5,80 c10,0 15,-30 15,-50 s-5,-30 -20,-30 z M128,200 c5,20 5,60 -5,80 c-10,0 -15,-30 -15,-50 s5,-30 20,-30 z" />
              {/* ADUCTORES */}
              <Zone id="aductores" d="M92,200 c2,15 2,40 -2,55 h6 c4,-15 4,-40 2,-55 z M108,200 c-2,15 -2,40 2,55 h-6 c-4,-15 -4,-40 -2,-55 z" />
              {/* TIBIALES */}
              <Zone id="tibiales" d="M78,295 c-4,15 -4,50 4,65 h6 c-4,-15 -4,-50 -10,-65 z M122,295 c4,15 4,50 -4,65 h-6 c4,-15 4,-50 10,-65 z" />
            </g>
          ) : (
            <g>
              {/* TRAPECIO POSTERIOR */}
              <Zone id="trapecio" d="M100,46 l-30,15 l10,30 l20,-10 l20,10 l10,-30 z" />
              {/* DELTOIDES POSTERIOR */}
              <Zone id="deltoides" d="M68,65 c-8,2 -12,10 -12,20 s4,25 10,25 s8,-15 8,-25 s-2,-18 -6,-20 z M132,65 c8,2 12,10 12,20 s-4,25 -10,25 s-8,-15 -8,-25 s2,-18 6,-20 z" />
              {/* TRICEPS */}
              <Zone id="triceps" d="M56,110 c-4,10 -4,30 2,40 c4,0 8,-10 8,-25 s-2,-15 -10,-15 z M144,110 c4,10 4,30 -2,40 c-4,0 -8,-10 -8,-25 s2,-15 10,-15 z" />
              {/* DORSALES */}
              <Zone id="dorsales" d="M70,105 c-5,15 -5,50 15,65 v-65 z M130,105 c5,15 5,50 -15,65 v-65 z" />
              {/* LUMBARES */}
              <Zone id="lumbares" d="M85,175 h30 v20 h-30 z" />
              {/* GLUTEOS */}
              <Zone id="gluteos" d="M75,200 c-10,10 -10,40 25,45 v-45 z M125,200 c10,10 10,40 -25,45 v-45 z" />
              {/* ISQUIOS */}
              <Zone id="isquios" d="M72,250 c-5,20 -5,60 5,80 c10,0 15,-30 15,-50 s-5,-30 -20,-30 z M128,250 c5,20 5,60 -5,80 c-10,0 -15,-30 -15,-50 s5,-30 20,-30 z" />
              {/* GEMELOS */}
              <Zone id="gemelos" d="M78,335 c-5,15 -5,40 5,50 h8 c-4,-15 -4,-35 -13,-50 z M122,335 c5,15 5,40 -5,50 h-8 c4,-15 4,-35 13,-50 z" />
            </g>
          )}
        </svg>

        <div style={{ flex: 1, color: '#f1f5f9' }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Zona Seleccionada</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: selected ? MUSCLE_GROUPS[Object.keys(MUSCLE_GROUPS).find(k => MUSCLE_GROUPS[k].label === selected) || '']?.color || '#ef4444' : '#475569' }}>
              {selected || 'Ninguna'}
            </p>
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', paddingRight: 10 }}>
            {Object.keys(MUSCLE_GROUPS).map(k => {
              const m = MUSCLE_GROUPS[k]
              const active = selected === m.label
              return (
                <button 
                  key={k} 
                  onClick={() => onSelect(m.label)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 4, borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    border: active ? `1px solid ${m.color}` : '1px solid transparent',
                    background: active ? `${m.color}20` : 'transparent',
                    color: active ? m.color : '#94a3b8',
                    transition: 'all 0.1s'
                  }}
                >
                  {active ? '● ' : '○ '} {m.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 10, color: '#475569', textAlign: 'center', marginTop: 16 }}>
        {hovered ? `Detectado: ${MUSCLE_GROUPS[hovered].label}` : 'Pasa el mouse o toca una zona'}
      </p>
    </div>
  )
}
