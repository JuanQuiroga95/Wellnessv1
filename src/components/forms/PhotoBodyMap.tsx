'use client'
import { useState } from 'react'

const ZONES = [
  // VISTA FRONTAL (Izquierda - x aprox 150 a 350)
  { id: 'pecho', label: 'Pectorales', x: 250, y: 300, r: 40 },
  { id: 'abdomen', label: 'Abdominales', x: 250, y: 400, r: 35 },
  { id: 'deltoides_izq', label: 'Deltoides (F)', x: 180, y: 280, r: 25 },
  { id: 'deltoides_der', label: 'Deltoides (F)', x: 320, y: 280, r: 25 },
  { id: 'biceps_izq', label: 'Bíceps', x: 160, y: 360, r: 20 },
  { id: 'biceps_der', label: 'Bíceps', x: 340, y: 360, r: 20 },
  { id: 'cuadriceps_izq', label: 'Cuádriceps', x: 210, y: 580, r: 45 },
  { id: 'cuadriceps_der', label: 'Cuádriceps', x: 290, y: 580, r: 45 },
  { id: 'aductor_izq', label: 'Aductores', x: 235, y: 540, r: 25 },
  { id: 'aductor_der', label: 'Aductores', x: 265, y: 540, r: 25 },
  { id: 'rodilla_izq', label: 'Rodillas', x: 210, y: 720, r: 20 },
  { id: 'rodilla_der', label: 'Rodillas', x: 290, y: 720, r: 20 },
  { id: 'tibial_izq', label: 'Tibiales', x: 215, y: 840, r: 30 },
  { id: 'tibial_der', label: 'Tibiales', x: 285, y: 840, r: 30 },

  // VISTA POSTERIOR (Derecha - x aprox 650 a 850)
  { id: 'trapecio', label: 'Trapecio', x: 750, y: 240, r: 40 },
  { id: 'deltoides_post_izq', label: 'Deltoides (P)', x: 670, y: 280, r: 25 },
  { id: 'deltoides_post_der', label: 'Deltoides (P)', x: 830, y: 280, r: 25 },
  { id: 'triceps_izq', label: 'Tríceps', x: 650, y: 360, r: 20 },
  { id: 'triceps_der', label: 'Tríceps', x: 850, y: 360, r: 20 },
  { id: 'dorsales', label: 'Dorsales', x: 750, y: 360, r: 50 },
  { id: 'lumbares', label: 'Lumbares', x: 750, y: 460, r: 30 },
  { id: 'gluteos', label: 'Glúteos', x: 750, y: 560, r: 55 },
  { id: 'isquios_izq', label: 'Isquiotibiales', x: 710, y: 700, r: 45 },
  { id: 'isquios_der', label: 'Isquiotibiales', x: 790, y: 700, r: 45 },
  { id: 'gemelos_izq', label: 'Gemelos', x: 710, y: 850, r: 35 },
  { id: 'gemelos_der', label: 'Gemelos', x: 790, y: 850, r: 35 },
]

export default function PhotoBodyMap({ onSelect, selected }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ background: '#050a0f', padding: 20, borderRadius: 24, border: '1px solid #1e293b', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 800, margin: '0 auto', overflow: 'hidden', borderRadius: 16, border: '1px solid #334155' }}>
        <img src="/images/anatomy-render.png" alt="Anatomy" style={{ width: '100%', display: 'block' }} />
        
        <svg viewBox="0 0 1000 1000" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <radialGradient id="highlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {ZONES.map(z => {
            const isActive = selected === z.label || hovered === z.id
            return (
              <g key={z.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }} 
                 onMouseEnter={() => setHovered(z.id)} 
                 onMouseLeave={() => setHovered(null)}
                 onClick={() => onSelect(z.label)}>
                <circle cx={z.x} cy={z.y} r={z.r} 
                        fill={isActive ? 'url(#highlight)' : 'transparent'} 
                        stroke={isActive ? '#ef4444' : 'transparent'} 
                        strokeWidth="2"
                        style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                
                {isActive && (
                   <text x={z.x} y={z.y - z.r - 10} textAnchor="middle" fill="#fff" 
                         style={{ fontSize: 24, fontWeight: 800, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))', textTransform: 'uppercase' }}>
                     {z.label}
                   </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '16px 24px', borderRadius: 16 }}>
        <div>
          <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Seleccionado</p>
          <h3 style={{ color: '#ef4444', fontSize: 24, fontWeight: 900 }}>{selected || '—'}</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Tocá la zona de dolor sobre la anatomía 3D.</p>
        </div>
      </div>
    </div>
  )
}
