'use client'
import { useState } from 'react'

const ZONES = [
  // VISTA FRONTAL (Centro aprox 275)
  { id: 'cabeza',    label: 'Cabeza',          x: 275, y: 85,  r: 45 },
  { id: 'cuello',    label: 'Cuello',          x: 275, y: 175, r: 25 },
  { id: 'hombro_i',  label: 'Hombro Izq.',     x: 185, y: 245, r: 35 },
  { id: 'hombro_d',  label: 'Hombro Der.',     x: 365, y: 245, r: 35 },
  { id: 'pecho_i',   label: 'Pecho Izq.',      x: 235, y: 290, r: 40 },
  { id: 'pecho_d',   label: 'Pecho Der.',      x: 315, y: 290, r: 40 },
  { id: 'biceps_i',  label: 'Bíceps Izq.',     x: 145, y: 340, r: 25 },
  { id: 'biceps_d',  label: 'Bíceps Der.',     x: 405, y: 340, r: 25 },
  { id: 'codo_i',    label: 'Codo Izq.',       x: 115, y: 420, r: 25 },
  { id: 'codo_d',    label: 'Codo Der.',       x: 435, y: 420, r: 25 },
  { id: 'anteb_i',   label: 'Antebrazo Izq.',  x: 95,  y: 490, r: 25 },
  { id: 'anteb_d',   label: 'Antebrazo Der.',  x: 455, y: 490, r: 25 },
  { id: 'abdomen',   label: 'Abdomen',         x: 275, y: 410, r: 45 },
  { id: 'muñeca_i',  label: 'Muñeca Izq.',     x: 75,  y: 560, r: 20 },
  { id: 'muñeca_d',  label: 'Muñeca Der.',     x: 475, y: 560, r: 20 },
  { id: 'mano_i',    label: 'Mano Izq.',       x: 60,  y: 610, r: 22 },
  { id: 'mano_d',    label: 'Mano Der.',       x: 490, y: 610, r: 22 },
  { id: 'cadera_i',  label: 'Cadera Izq.',     x: 235, y: 515, r: 30 },
  { id: 'cadera_d',  label: 'Cadera Der.',     x: 315, y: 515, r: 30 },
  { id: 'aductor_i', label: 'Aductor Izq.',    x: 255, y: 580, r: 25 },
  { id: 'aductor_d', label: 'Aductor Der.',    x: 295, y: 580, r: 25 },
  { id: 'cuad_i',    label: 'Cuádriceps Izq.', x: 225, y: 670, r: 45 },
  { id: 'cuad_d',    label: 'Cuádriceps Der.', x: 325, y: 670, r: 45 },
  { id: 'rodilla_i', label: 'Rodilla Izq.',    x: 225, y: 795, r: 25 },
  { id: 'rodilla_d', label: 'Rodilla Der.',    x: 325, y: 795, r: 25 },
  { id: 'tibia_i',   label: 'Tibia Izq.',      x: 225, y: 885, r: 35 },
  { id: 'tibia_d',   label: 'Tibia Der.',      x: 325, y: 885, r: 35 },
  { id: 'tobillo_i', label: 'Tobillo Izq.',    x: 225, y: 975, r: 20 },
  { id: 'tobillo_d', label: 'Tobillo Der.',    x: 325, y: 975, r: 20 },
  { id: 'pie_i',     label: 'Pie Izq.',        x: 225, y: 1010, r: 15 },
  { id: 'pie_d',     label: 'Pie Der.',        x: 325, y: 1010, r: 15 },

  // VISTA POSTERIOR (Centro aprox 725)
  { id: 'nuca',      label: 'Nuca',              x: 725, y: 175, r: 25 },
  { id: 'trapecio',  label: 'Trapecio',          x: 725, y: 220, r: 40 },
  { id: 'h_back_i',  label: 'Hombro Izq.',       x: 635, y: 245, r: 35 },
  { id: 'h_back_d',  label: 'Hombro Der.',       x: 815, y: 245, r: 35 },
  { id: 'esp_alta',  label: 'Espalda Alta',      x: 725, y: 310, r: 55 },
  { id: 'triceps_i', label: 'Tríceps Izq.',      x: 595, y: 340, r: 25 },
  { id: 'triceps_d', label: 'Tríceps Der.',      x: 855, y: 340, r: 25 },
  { id: 'c_back_i',  label: 'Codo Izq.',         x: 565, y: 420, r: 25 },
  { id: 'c_back_d',  label: 'Codo Der.',         x: 885, y: 420, r: 25 },
  { id: 'lumbar',    label: 'Espalda Baja',      x: 725, y: 450, r: 45 },
  { id: 'm_back_i',  label: 'Muñeca Izq.',       x: 525, y: 560, r: 20 },
  { id: 'm_back_d',  label: 'Muñeca Der.',       x: 925, y: 560, r: 20 },
  { id: 'gluteo_i',  label: 'Glúteo Izq.',       x: 685, y: 575, r: 45 },
  { id: 'gluteo_d',  label: 'Glúteo Der.',       x: 765, y: 575, r: 45 },
  { id: 'isquio_i',  label: 'Isquiotibial Izq.', x: 685, y: 720, r: 50 },
  { id: 'isquio_d',  label: 'Isquiotibial Der.', x: 765, y: 720, r: 50 },
  { id: 'gemelo_i',  label: 'Gemelo Izq.',       x: 685, y: 865, r: 40 },
  { id: 'gemelo_d',  label: 'Gemelo Der.',       x: 765, y: 865, r: 40 },
  { id: 't_back_i',  label: 'Tobillo Izq.',      x: 685, y: 975, r: 20 },
  { id: 't_back_d',  label: 'Tobillo Der.',      x: 765, y: 975, r: 20 },
]

export default function PhotoBodyMap({ onSelect, selected, description, onDescriptionChange }) {
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ 
        background: 'rgba(15, 23, 42, 0.6)', 
        backdropFilter: 'blur(12px)',
        padding: 16, 
        borderRadius: 32, 
        border: '1px solid rgba(255, 255, 255, 0.1)', 
        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        position: 'relative'
      }}>
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          maxWidth: 850, 
          margin: '0 auto', 
          overflow: 'hidden', 
          borderRadius: 24, 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          background: '#020617'
        }}>
          <img src="/images/anatomy-render.png" alt="Anatomy" style={{ width: '100%', display: 'block', opacity: 0.9 }} />
          
          <svg viewBox="0 0 1024 1024" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <radialGradient id="highlight" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {ZONES.map(z => {
              const isActive = selected === z.label || hovered === z.id
              return (
                <g key={z.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }} 
                   onMouseEnter={() => setHovered(z.id)} 
                   onMouseLeave={() => setHovered(null)}
                   onClick={() => onSelect(z.label)}>
                  
                  <circle cx={z.x} cy={z.y} r={isActive ? z.r * 1.1 : z.r * 0.8} 
                          fill={isActive ? 'url(#highlight)' : 'rgba(255,255,255,0.02)'} 
                          stroke={isActive ? '#ef4444' : 'rgba(255,255,255,0.05)'} 
                          strokeWidth={isActive ? 2 : 1}
                          filter={isActive ? 'url(#glow)' : 'none'}
                          style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  
                  {isActive && (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={z.x - 75} y={z.y - z.r - 55} width={150} height={34} rx={17} 
                            fill="rgba(239, 68, 68, 0.9)" 
                            style={{ backdropFilter: 'blur(4px)' }} />
                      <text x={z.x} y={z.y - z.r - 33} textAnchor="middle" fill="#fff" 
                            style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {z.label}
                      </text>
                      <path d={`M ${z.x} ${z.y - z.r - 21} L ${z.x - 6} ${z.y - z.r - 21} L ${z.x} ${z.y - z.r - 12} L ${z.x + 6} ${z.y - z.r - 21} Z`} fill="rgba(239, 68, 68, 0.9)" />
                    </g>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
      </div>

      <div style={{ 
        background: 'rgba(15, 23, 42, 0.4)', 
        backdropFilter: 'blur(8px)',
        padding: 32, 
        borderRadius: 28, 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <button onClick={() => onSelect('Ningún dolor')} style={{
            flex: 1, padding: '16px', borderRadius: 16, fontSize: 13, fontWeight: 800, cursor: 'pointer',
            border: selected === 'Ningún dolor' ? '2px solid #4ade80' : '1px solid rgba(255,255,255,0.1)',
            background: selected === 'Ningún dolor' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.03)',
            color: selected === 'Ningún dolor' ? '#4ade80' : '#64748b',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>✓ Sin Molestias</button>
          
          <button onClick={() => onSelect('Otro')} style={{
            flex: 1, padding: '16px', borderRadius: 16, fontSize: 13, fontWeight: 800, cursor: 'pointer',
            border: selected === 'Otro' ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
            background: selected === 'Otro' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
            color: selected === 'Otro' ? '#f59e0b' : '#64748b',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>? Otra Zona</button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, marginLeft: 4 }}>Observaciones Adicionales</label>
          <textarea 
            placeholder="Describe la sensación o el momento del dolor..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            style={{
              width: '100%', minHeight: 120, padding: 20, borderRadius: 20, marginTop: 12,
              background: 'rgba(2, 6, 23, 0.4)', border: '1px solid rgba(255,255,255,0.05)', 
              color: '#fff', fontSize: 15, outline: 'none', transition: 'border-color 0.2s',
              lineHeight: '1.6'
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
          />
        </div>
        
        {selected && selected !== 'Ningún dolor' && (
          <div style={{ 
            marginTop: 20, padding: '12px 20px', borderRadius: 12, 
            background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 14, color: '#f87171' }}>Zona seleccionada:</span>
            <strong style={{ fontSize: 14, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selected}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
