'use client'
import { useState } from 'react'

// EXACTAMENTE LA MISMA LISTA QUE EL ORIGINAL
const ZONES = [
  // VISTA FRONTAL (Lado Izquierdo, x central aprox 245)
  { id: 'cabeza',    label: 'Cabeza',          x: 245, y: 90,  r: 45 },
  { id: 'cuello',    label: 'Cuello',          x: 245, y: 170, r: 25 },
  { id: 'pecho',     label: 'Pecho',           x: 245, y: 280, r: 50 },
  { id: 'abdomen',   label: 'Abdomen',         x: 245, y: 410, r: 40 },
  { id: 'aductor_d', label: 'Aductor Der.',    x: 265, y: 560, r: 30 },
  { id: 'aductor_i', label: 'Aductor Izq.',    x: 225, y: 560, r: 30 },
  { id: 'cuad_d',    label: 'Cuádriceps Der.', x: 290, y: 640, r: 50 },
  { id: 'cuad_i',    label: 'Cuádriceps Izq.', x: 200, y: 640, r: 50 },
  { id: 'rodilla_d', label: 'Rodilla Der.',    x: 295, y: 760, r: 25 },
  { id: 'rodilla_i', label: 'Rodilla Izq.',    x: 195, y: 760, r: 25 },
  { id: 'tobillo_d', label: 'Tobillo Der.',    x: 290, y: 940, r: 20 },
  { id: 'tobillo_i', label: 'Tobillo Izq.',    x: 200, y: 940, r: 20 },

  // VISTA POSTERIOR (Lado Derecho, x central aprox 755)
  { id: 'nuca',      label: 'Cuello',            x: 755, y: 170, r: 25 },
  { id: 'esp_alta',  label: 'Espalda Alta',      x: 755, y: 300, r: 60 },
  { id: 'lumbar',    label: 'Espalda Baja',      x: 755, y: 440, r: 45 },
  { id: 'gluteo_d',  label: 'Glúteo Der.',       x: 805, y: 560, r: 50 },
  { id: 'gluteo_i',  label: 'Glúteo Izq.',       x: 705, y: 560, r: 50 },
  { id: 'isquio_d',  label: 'Isquiotibial Der.', x: 810, y: 710, r: 50 },
  { id: 'isquio_i',  label: 'Isquiotibial Izq.', x: 700, y: 710, r: 50 },
  { id: 'gemelo_d',  label: 'Gemelo Der.',       x: 815, y: 840, r: 40 },
  { id: 'gemelo_i',  label: 'Gemelo Izq.',       x: 695, y: 840, r: 40 },
  { id: 'tobillo_back_d', label: 'Tobillo Der.',  x: 820, y: 960, r: 20 },
  { id: 'tobillo_back_i', label: 'Tobillo Izq.',  x: 690, y: 960, r: 20 },
]

export default function PhotoBodyMap({ onSelect, selected }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ background: '#050a0f', padding: 12, borderRadius: 24, border: '1px solid #1e293b', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 850, margin: '0 auto', overflow: 'hidden', borderRadius: 20, border: '1px solid #334155' }}>
        <img src="/images/anatomy-render.png" alt="Anatomy" style={{ width: '100%', display: 'block' }} />
        
        <svg viewBox="0 0 1024 1024" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <defs>
            <radialGradient id="highlight" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {ZONES.map(z => {
            const isActive = selected === z.label || hovered === z.id
            return (
              <g key={z.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }} 
                 onMouseEnter={() => setHovered(z.id)} 
                 onMouseLeave={() => setHovered(null)}
                 onClick={() => onSelect(z.label)}>
                
                {/* Zona de impacto visual */}
                <circle cx={z.x} cy={z.y} r={isActive ? z.r : z.r * 0.8} 
                        fill={isActive ? 'url(#highlight)' : 'transparent'} 
                        stroke={isActive ? '#ef4444' : 'transparent'} 
                        strokeWidth={isActive ? 3 : 0}
                        style={{ transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                
                {/* Etiqueta flotante */}
                {isActive && (
                  <g filter="url(#glow)">
                    <rect x={z.x - 70} y={z.y - z.r - 45} width={140} height={32} rx={16} fill="rgba(239, 68, 68, 0.9)" />
                    <text x={z.x} y={z.y - z.r - 24} textAnchor="middle" fill="#fff" 
                          style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {z.label}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '16px 24px', borderRadius: 16, border: '1px solid #1e293b' }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Zona Seleccionada</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             <div style={{ width: 12, height: 12, borderRadius: '50%', background: selected ? '#ef4444' : '#334155', boxShadow: selected ? '0 0 10px #ef4444' : 'none' }} />
             <h3 style={{ color: selected ? '#fff' : '#475569', fontSize: 20, fontWeight: 900 }}>{selected || 'NINGUNA'}</h3>
          </div>
        </div>
        <div style={{ textAlign: 'right', maxWidth: 300 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Tocá directamente sobre el modelo 3D para localizar el foco del dolor.</p>
        </div>
      </div>
    </div>
  )
}
