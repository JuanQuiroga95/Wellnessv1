'use client'
import { useState } from 'react'

const ZONES = [
  // ── VISTA FRONTAL ────────────────────────────────────────────────────────────
  { id: 'cabeza',    label: 'Cabeza',            x: 263, y: 78,  r: 42 },
  { id: 'cuello',    label: 'Cuello',            x: 263, y: 155, r: 18 },
  { id: 'hombro_d',  label: 'Hombro Der.',       x: 178, y: 200, r: 28 },
  { id: 'hombro_i',  label: 'Hombro Izq.',       x: 350, y: 200, r: 28 },
  { id: 'pecho_d',   label: 'Pectoral Der.',     x: 228, y: 272, r: 42 },
  { id: 'pecho_i',   label: 'Pectoral Izq.',     x: 298, y: 272, r: 42 },
  { id: 'biceps_d',  label: 'Bíceps Der.',       x: 160, y: 325, r: 22 },
  { id: 'biceps_i',  label: 'Bíceps Izq.',       x: 365, y: 325, r: 22 },
  { id: 'anteb_d',   label: 'Antebrazo Der.',    x: 113, y: 408, r: 20 },
  { id: 'anteb_i',   label: 'Antebrazo Izq.',    x: 409, y: 408, r: 20 },
  { id: 'abdomen',   label: 'Zona Abdominal',    x: 263, y: 378, r: 38 },
  { id: 'muñeca_d',  label: 'Muñeca Der.',       x: 94,  y: 469, r: 18 },
  { id: 'muñeca_i',  label: 'Muñeca Izq.',       x: 433, y: 471, r: 18 },
  { id: 'mano_d',    label: 'Mano Der.',         x: 90,  y: 496, r: 20 },
  { id: 'mano_i',    label: 'Mano Izq.',         x: 434, y: 496, r: 20 },
  { id: 'cadera_d',  label: 'Cadera Der.',       x: 195, y: 455, r: 26 },
  { id: 'cadera_i',  label: 'Cadera Izq.',       x: 335, y: 455, r: 26 },
  { id: 'pubis',     label: 'Pubis / Inguinal',  x: 263, y: 462, r: 20 },
  { id: 'aductor_d', label: 'Aductor Der.',      x: 250, y: 545, r: 22 },
  { id: 'aductor_i', label: 'Aductor Izq.',      x: 278, y: 545, r: 22 },
  { id: 'cuad_d',    label: 'Cuádriceps Der.',   x: 199, y: 577, r: 38 },
  { id: 'cuad_i',    label: 'Cuádriceps Izq.',   x: 335, y: 576, r: 38 },
  { id: 'rodilla_d', label: 'Rodilla Der.',      x: 199, y: 707, r: 22 },
  { id: 'rodilla_i', label: 'Rodilla Izq.',      x: 323, y: 703, r: 22 },
  { id: 'tibia_d',   label: 'Tibia Der.',        x: 190, y: 809, r: 28 },
  { id: 'tibia_i',   label: 'Tibia Izq.',        x: 338, y: 806, r: 28 },
  { id: 'tobillo_d', label: 'Tobillo Der.',      x: 195, y: 906, r: 18 },
  { id: 'tobillo_i', label: 'Tobillo Izq.',      x: 329, y: 905, r: 18 },
  { id: 'pie_d',     label: 'Pie Der.',          x: 195, y: 980, r: 15 },
  { id: 'pie_i',     label: 'Pie Izq.',          x: 329, y: 980, r: 15 },

  // ── VISTA POSTERIOR ──────────────────────────────────────────────────────────
  { id: 'nuca',      label: 'Nuca',              x: 762, y: 155, r: 22 },
  { id: 'trapecio',  label: 'Trapecio',          x: 762, y: 222, r: 35 },
  { id: 'h_back_d',  label: 'Hombro Der.',       x: 665, y: 200, r: 28 },
  { id: 'h_back_i',  label: 'Hombro Izq.',       x: 858, y: 200, r: 28 },
  { id: 'esp_alta',  label: 'Espalda Alta',      x: 762, y: 305, r: 48 },
  { id: 'triceps_d', label: 'Tríceps Der.',      x: 645, y: 325, r: 22 },
  { id: 'triceps_i', label: 'Tríceps Izq.',      x: 878, y: 325, r: 22 },
  { id: 'c_back_d',  label: 'Codo Der.',         x: 632, y: 402, r: 20 },
  { id: 'c_back_i',  label: 'Codo Izq.',         x: 892, y: 402, r: 20 },
  { id: 'lumbar',    label: 'Espalda Baja',      x: 762, y: 442, r: 38 },
  { id: 'm_back_d',  label: 'Muñeca Der.',       x: 620, y: 535, r: 18 },
  { id: 'm_back_i',  label: 'Muñeca Izq.',       x: 903, y: 535, r: 18 },
  { id: 'gluteo_d',  label: 'Glúteo Der.',       x: 717, y: 495, r: 38 },
  { id: 'gluteo_i',  label: 'Glúteo Izq.',       x: 808, y: 495, r: 38 },
  { id: 'isquio_d',  label: 'Isquiotibial Der.', x: 717, y: 638, r: 43 },
  { id: 'isquio_i',  label: 'Isquiotibial Izq.', x: 808, y: 638, r: 43 },
  { id: 'gemelo_d',  label: 'Gemelo Der.',       x: 704, y: 764, r: 33 },
  { id: 'gemelo_i',  label: 'Gemelo Izq.',       x: 833, y: 764, r: 33 },
  { id: 't_back_d',  label: 'Talón Der.',        x: 717, y: 948, r: 18 },
  { id: 't_back_i',  label: 'Talón Izq.',        x: 839, y: 942, r: 18 },
]

export default function PhotoBodyMap({ onSelect, selected, description, onDescriptionChange }) {
  const [hovered, setHovered] = useState(null)
  const [calMode, setCalMode] = useState(false)
  const [calPos, setCalPos] = useState<{x:number, y:number} | null>(null)
  const [calPinned, setCalPinned] = useState<{x:number, y:number} | null>(null)

  function handleCalMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!calMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1024)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1024)
    setCalPos({ x, y })
  }

  function handleCalClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!calMode) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1024)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1024)
    setCalPinned({ x, y })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Botón modo calibración ── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => { setCalMode(!calMode); setCalPinned(null) }} style={{
          padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
          background: calMode ? 'rgba(251,191,36,.15)' : 'rgba(255,255,255,.05)',
          border: calMode ? '1px solid rgba(251,191,36,.5)' : '1px solid rgba(255,255,255,.1)',
          color: calMode ? '#fbbf24' : '#64748b',
        }}>
          {calMode ? '⚡ CALIBRACIÓN ON — Click para fijar punto' : '🎯 Modo calibración'}
        </button>
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
        padding: 16,
        borderRadius: 32,
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        position: 'relative'
      }}>
        <div
          onMouseMove={handleCalMove}
          onClick={handleCalClick}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 850,
            margin: '0 auto',
            overflow: 'hidden',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.05)',
            background: '#020617',
            cursor: calMode ? 'crosshair' : 'default',
          }}>
          <img src="/images/anatomy-render.png" alt="Anatomy" style={{ width: '100%', display: 'block', opacity: 0.9 }} />

          {/* coordenadas en tiempo real */}
          {calMode && calPos && (
            <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,.85)', color: '#fbbf24', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, pointerEvents: 'none', zIndex: 20 }}>
              x: {calPos.x} · y: {calPos.y}
            </div>
          )}
          {/* punto fijado al hacer click */}
          {calMode && calPinned && (
            <div style={{ position: 'absolute', top: 32, left: 8, background: 'rgba(239,68,68,.9)', color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, pointerEvents: 'none', zIndex: 20 }}>
              📍 x: {calPinned.x} · y: {calPinned.y}
            </div>
          )}

          <svg viewBox="0 0 1024 1024"
               style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: calMode ? 'none' : 'none' }}>
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
