'use client'
import { useState } from 'react'

const ZONES = [
  // VISTA FRONTAL (Lado Izquierdo, x central aprox 245)
  { id: 'cabeza',    label: 'Cabeza',          x: 245, y: 90,  r: 45 },
  { id: 'cuello',    label: 'Cuello',          x: 245, y: 170, r: 25 },
  { id: 'hombro_i',  label: 'Hombro Izq.',     x: 180, y: 255, r: 35 },
  { id: 'hombro_d',  label: 'Hombro Der.',     x: 310, y: 255, r: 35 },
  { id: 'pecho',     label: 'Pecho',           x: 245, y: 280, r: 50 },
  { id: 'codo_i',    label: 'Codo Izq.',       x: 135, y: 410, r: 25 },
  { id: 'codo_d',    label: 'Codo Der.',       x: 355, y: 410, r: 25 },
  { id: 'abdomen',   label: 'Abdomen',         x: 245, y: 410, r: 40 },
  { id: 'muñeca_i',  label: 'Muñeca Izq.',     x: 95,  y: 520, r: 20 },
  { id: 'muñeca_d',  label: 'Muñeca Der.',     x: 395, y: 520, r: 20 },
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
  { id: 'h_back_i',  label: 'Hombro Izq.',       x: 685, y: 255, r: 35 },
  { id: 'h_back_d',  label: 'Hombro Der.',       x: 825, y: 255, r: 35 },
  { id: 'esp_alta',  label: 'Espalda Alta',      x: 755, y: 300, r: 60 },
  { id: 'c_back_i',  label: 'Codo Izq.',         x: 645, y: 410, r: 25 },
  { id: 'c_back_d',  label: 'Codo Der.',         x: 865, y: 410, r: 25 },
  { id: 'lumbar',    label: 'Espalda Baja',      x: 755, y: 440, r: 45 },
  { id: 'm_back_i',  label: 'Muñeca Izq.',       x: 605, y: 520, r: 20 },
  { id: 'm_back_d',  label: 'Muñeca Der.',       x: 905, y: 520, r: 20 },
  { id: 'gluteo_d',  label: 'Glúteo Der.',       x: 805, y: 560, r: 50 },
  { id: 'gluteo_i',  label: 'Glúteo Izq.',       x: 705, y: 560, r: 50 },
  { id: 'isquio_d',  label: 'Isquiotibial Der.', x: 810, y: 710, r: 50 },
  { id: 'isquio_i',  label: 'Isquiotibial Izq.', x: 700, y: 710, r: 50 },
  { id: 'gemelo_d',  label: 'Gemelo Der.',       x: 815, y: 840, r: 40 },
  { id: 'gemelo_i',  label: 'Gemelo Izq.',       x: 695, y: 840, r: 40 },
  { id: 't_back_d',  label: 'Tobillo Der.',      x: 820, y: 960, r: 20 },
  { id: 't_back_i',  label: 'Tobillo Izq.',      x: 690, y: 960, r: 20 },
]

export default function PhotoBodyMap({ onSelect, selected, description, onDescriptionChange }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#050a0f', padding: 12, borderRadius: 24, border: '1px solid #1e293b', boxShadow: '0 25px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 850, margin: '0 auto', overflow: 'hidden', borderRadius: 20, border: '1px solid #334155' }}>
          <img src="/images/anatomy-render.png" alt="Anatomy" style={{ width: '100%', display: 'block' }} />
          
          <svg viewBox="0 0 1024 1024" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <radialGradient id="highlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
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
                  
                  <circle cx={z.x} cy={z.y} r={isActive ? z.r : z.r * 0.7} 
                          fill={isActive ? 'url(#highlight)' : 'transparent'} 
                          stroke={isActive ? '#ef4444' : 'transparent'} 
                          strokeWidth={isActive ? 3 : 0}
                          style={{ transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  
                  {isActive && (
                    <g>
                      <rect x={z.x - 75} y={z.y - z.r - 45} width={150} height={30} rx={15} fill="rgba(239, 68, 68, 0.95)" />
                      <text x={z.x} y={z.y - z.r - 25} textAnchor="middle" fill="#fff" 
                            style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase' }}>
                        {z.label}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div style={{ background: '#0f172a', padding: 24, borderRadius: 20, border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button onClick={() => onSelect('Ningún dolor')} style={{
            flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            border: selected === 'Ningún dolor' ? '2px solid #4ade80' : '1px solid #334155',
            background: selected === 'Ningún dolor' ? 'rgba(74,222,128,0.1)' : '#1e293b',
            color: selected === 'Ningún dolor' ? '#4ade80' : '#94a3b8'
          }}>✓ NINGÚN DOLOR</button>
          
          <button onClick={() => onSelect('Otro')} style={{
            flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
            border: selected === 'Otro' ? '2px solid #f59e0b' : '1px solid #334155',
            background: selected === 'Otro' ? 'rgba(245,158,11,0.1)' : '#1e293b',
            color: selected === 'Otro' ? '#f59e0b' : '#94a3b8'
          }}>? OTRO LUGAR</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Descripción del dolor / Molestia</label>
          <textarea 
            placeholder="Ej: Siento un pinchazo al arrancar, me duele al tacto..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            style={{
              width: '100%', minHeight: 100, padding: 16, borderRadius: 12, marginTop: 8,
              background: '#050a0f', border: '1px solid #334155', color: '#fff', fontSize: 14, outline: 'none'
            }}
          />
        </div>
        
        {selected && selected !== 'Ningún dolor' && (
          <p style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>
            Reportando en: <strong>{selected}</strong>
          </p>
        )}
      </div>
    </div>
  )
}
