'use client'
import { useState } from 'react'

// Datos anatómicos profesionales extraídos de react-body-highlighter
const ANTERIOR_DATA = [
  { id: 'pecho', label: 'Pectorales', color: '#f87171', points: [
    '51.83,41.63 51.02,55.10 57.95,57.95 67.75,55.51 70.61,47.34 62.04,41.63',
    '29.79,46.53 31.42,55.51 40.81,57.95 48.16,55.10 47.75,42.04 37.55,42.04'
  ]},
  { id: 'abdomen', label: 'Abdominales', color: '#4ade80', points: [
    '56.32,59.18 57.95,64.08 58.36,77.95 58.36,92.65 56.32,98.36 55.10,104.08 51.42,107.75 51.02,84.48 50.61,67.34 51.02,57.14',
    '43.67,58.77 48.57,57.14 48.97,67.34 48.57,84.48 48.16,107.34 44.48,103.67 40.81,91.42 40.81,78.36 41.22,64.48'
  ]},
  { id: 'deltoides', label: 'Deltoides', color: '#fb923c', points: [
    '20.00,43.26 19.18,53.46 21.63,64.08 28.57,64.48 33.46,60.81 33.87,48.16 28.16,42.04',
    '71.42,48.16 71.83,60.81 76.73,64.48 83.67,64.08 86.12,53.46 85.30,43.26 77.14,42.04'
  ]},
  { id: 'biceps', label: 'Bíceps', color: '#fbbf24', points: [
    '20.00,64.48 18.77,74.69 22.44,83.26 27.34,81.22 28.57,66.12',
    '77.55,83.26 81.22,74.69 80.00,64.48 71.42,66.12 72.65,81.22'
  ]},
  { id: 'antebrazos', label: 'Antebrazos', color: '#a3e635', points: [
    '21.63,85.30 18.36,110.20 22.04,115.91 27.75,108.97 26.53,83.26',
    '77.95,115.91 81.63,110.20 78.36,85.30 73.46,83.26 72.24,108.97'
  ]},
  { id: 'cuadriceps', label: 'Cuádriceps', color: '#60a5fa', points: [
    '34.69,98.77 37.14,108.16 37.14,127.75 34.28,137.14 31.02,132.65 29.38,120.00 28.16,111.42 29.38,100.81 32.24,94.69',
    '63.26,105.71 64.48,100.00 66.93,94.69 70.20,101.22 71.02,111.83 68.16,133.06 65.30,137.55 62.44,128.57 62.04,111.42'
  ]},
  { id: 'aductores', label: 'Aductores', color: '#818cf8', points: [
    '44.48,110.61 48.16,110.61 48.57,133.87 43.67,143.67 41.22,122.44',
    '51.83,110.61 55.51,110.61 58.77,122.44 56.32,143.67 51.42,133.87'
  ]},
  { id: 'tibiales', label: 'Tibiales', color: '#c084fc', points: [
    '34.69,146.53 37.14,171.83 34.28,198.36 30.20,198.36 29.38,168.16 29.79,148.97',
    '65.30,146.53 70.20,148.97 70.61,168.16 69.79,198.36 65.71,198.36 62.85,171.83'
  ]},
]

const POSTERIOR_DATA = [
  { id: 'trapecio', label: 'Trapecio', color: '#f43f5e', points: [
    '44.68,21.70 47.65,21.70 47.23,38.29 47.65,64.68 38.29,53.19 35.31,40.85 31.06,36.59 39.14,33.19 43.82,27.23',
    '52.34,21.70 55.74,21.70 56.59,27.23 60.85,32.76 68.93,36.59 64.68,40.42 61.70,53.19 52.34,64.68 53.19,38.29'
  ]},
  { id: 'triceps', label: 'Tríceps', color: '#fbbf24', points: [
    '17.44,57.02 14.89,72.34 18.72,83.40 23.40,82.55 26.38,65.10',
    '82.55,57.02 85.10,72.34 81.27,83.40 76.59,82.55 73.61,65.10'
  ]},
  { id: 'dorsales', label: 'Dorsales', color: '#f59e0b', points: [
    '37.02,67.65 31.48,97.02 36.17,110.21 44.25,110.21 43.40,65.10',
    '62.97,67.65 68.51,97.02 63.82,110.21 55.74,110.21 56.59,65.10'
  ]},
  { id: 'lumbares', label: 'Lumbares', color: '#10b981', points: [
    '44.25,111.48 55.74,111.48 55.31,130.63 44.68,130.63'
  ]},
  { id: 'gluteos', label: 'Glúteos', color: '#22d3ee', points: [
    '33.19,111.48 43.40,111.48 44.25,142.12 31.48,142.12 28.51,123.82',
    '56.59,111.48 66.80,111.48 71.48,123.82 68.51,142.12 55.74,142.12'
  ]},
  { id: 'isquios', label: 'Isquiotibiales', color: '#6366f1', points: [
    '28.93,122.12 31.06,129.36 36.59,125.95 35.31,135.31 34.46,150.21 29.36,158.29 28.93,146.80 27.65,141.27 27.23,131.48',
    '71.48,121.70 69.36,128.93 63.82,125.95 65.53,136.59 66.38,150.21 71.06,158.29 71.48,147.65 72.76,142.12 73.61,131.91'
  ]},
  { id: 'gemelos', label: 'Gemelos', color: '#ec4899', points: [
    '29.36,163.40 33.19,163.40 35.31,178.72 31.06,205.10 27.23,205.10 26.38,178.72',
    '70.63,163.40 66.80,163.40 64.68,178.72 68.93,205.10 72.76,205.10 73.61,178.72'
  ]},
]

export default function AnatomicalBodyMap({ onSelect, selected }) {
  const [side, setSide] = useState<'front' | 'back'>('front')
  const [hovered, setHovered] = useState<string | null>(null)

  const data = side === 'front' ? ANTERIOR_DATA : POSTERIOR_DATA
  const viewBox = side === 'front' ? "0 0 100 220" : "0 0 100 220"

  return (
    <div style={{ background: '#0f172a', padding: 24, borderRadius: 20, border: '1px solid #1e293b', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {[['front', 'Vista Frontal'], ['back', 'Vista Posterior']].map(([s, l]) => (
          <button key={s} type="button" onClick={() => setSide(s as any)} style={{
            flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            border: side === s ? '2px solid #ef4444' : '1px solid #334155',
            background: side === s ? 'rgba(239,68,68,0.1)' : '#1e293b',
            color: side === s ? '#f87171' : '#94a3b8',
            transition: 'all 0.2s'
          }}>{l}</button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', justifyContent: 'center' }}>
        <svg viewBox={viewBox} width="200" style={{ display: 'block' }}>
          {/* Silueta base opaca */}
          <path d="M50,10 c-8,0-12,5-12,15 c0,10,4,15,12,15 s12,-5,12,-15 c0,-10-4,-15-12,-15 z" fill="#1e293b" />
          
          {data.map(group => (
            <g key={group.id} 
               onMouseEnter={() => setHovered(group.label)} 
               onMouseLeave={() => setHovered(null)}
               onClick={() => onSelect(group.label)}
               style={{ cursor: 'pointer' }}>
              {group.points.map((p, i) => (
                <polygon 
                  key={i} 
                  points={p} 
                  fill={selected === group.label ? group.color : hovered === group.label ? `${group.color}88` : `${group.color}33`}
                  stroke={selected === group.label ? '#fff' : group.color}
                  strokeWidth={selected === group.label ? 1.5 : 0.5}
                  style={{ transition: 'all 0.2s ease' }}
                />
              ))}
            </g>
          ))}
        </svg>

        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Músculo Seleccionado</p>
          <h3 style={{ color: selected ? (data.find(d => d.label === selected)?.color || '#fff') : '#475569', fontSize: 24, fontWeight: 900, marginBottom: 20 }}>
            {selected || 'Ninguno'}
          </h3>

          <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 8 }}>
            {data.map(group => {
              const active = selected === group.label
              return (
                <button 
                  key={group.id} 
                  onClick={() => onSelect(group.label)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', marginBottom: 6, borderRadius: 8, fontSize: 13, cursor: 'pointer',
                    border: active ? `1px solid ${group.color}` : '1px solid #1e293b',
                    background: active ? `${group.color}20` : 'transparent',
                    color: active ? group.color : '#94a3b8',
                    transition: 'all 0.1s'
                  }}
                >
                  {active ? '● ' : '○ '} {group.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
