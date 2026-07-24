'use client'

import { useState, useEffect, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Jugador {
  id: number
  nombre: string
  posicion?: string
  edad?: number
  estatura_cm?: number
  peso_kg?: number
  peso_ideal_min?: number
  peso_ideal_max?: number
}

type TestKey = 'variables' | 'pesajes' | 'hidratacion' | 'cmj' | 'isometrico' | 'pfv' | 'rsi' | 'dsi' | 'antropometria' | 'todos'

// ─── Semáforo genérico ────────────────────────────────────────────────────────
function Semaforo({ estado }: { estado: 'verde' | 'amarillo' | 'rojo' | 'gris' }) {
  const map = {
    verde:    { bg: '#22c55e', label: 'Normal' },
    amarillo: { bg: '#facc15', label: 'Precaución' },
    rojo:     { bg: '#ef4444', label: 'Alerta' },
    gris:     { bg: '#64748b', label: 'Sin dato' },
  }
  const { bg, label } = map[estado]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: bg + '22', border: `1px solid ${bg}66`,
      borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 700,
      color: bg, letterSpacing: '0.04em',
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: bg, display: 'inline-block' }} />
      {label}
    </span>
  )
}

// ─── Input reutilizable ───────────────────────────────────────────────────────
function Field({
  label, value, onChange, unit, type = 'number', step = '0.1', min, max, placeholder, readOnly,
}: {
  label: string; value: string | number; onChange?: (v: string) => void
  unit?: string; type?: string; step?: string; min?: string; max?: string
  placeholder?: string; readOnly?: boolean
}) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type={type} value={value} readOnly={readOnly}
          onChange={e => onChange?.(e.target.value)}
          min={min} max={max} step={step} placeholder={placeholder}
          style={{
            flex: 1, background: readOnly ? '#0f172a' : '#1e293b',
            border: '1px solid #334155', borderRadius: 8,
            padding: '8px 12px', fontSize: 14, color: '#f1f5f9',
            outline: 'none', width: '100%',
          }}
        />
        {unit && <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{unit}</span>}
      </div>
    </div>
  )
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ title, children, accent = '#a3e635' }: { title?: string; children: React.ReactNode; accent?: string }) {
  return (
    <div style={{
      background: '#0f172a', border: '1px solid #1e293b',
      borderRadius: 14, padding: '20px 22px', marginBottom: 16,
    }}>
      {title && (
        <div style={{
          fontSize: 11, fontWeight: 800, color: accent,
          letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 3, height: 14, borderRadius: 2, background: accent, display: 'inline-block' }} />
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Botón primario ───────────────────────────────────────────────────────────
function Btn({ onClick, children, variant = 'primary', disabled, small }: {
  onClick?: () => void; children: React.ReactNode
  variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; small?: boolean
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: '#a3e635', color: '#0a0f14', fontWeight: 800 },
    ghost:   { background: '#1e293b', color: '#94a3b8', fontWeight: 600, border: '1px solid #334155' },
    danger:  { background: '#ef4444', color: '#fff', fontWeight: 700 },
  }
  return (
    <button className="hover-scale"
      onClick={onClick} disabled={disabled}
      style={{
        ...styles[variant],
        padding: small ? '5px 12px' : '8px 18px',
        borderRadius: 8, fontSize: small ? 12 : 13,
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </button>
  )
}

// ─── 1. Variables Simples ─────────────────────────────────────────────────────
function VariablesPanel({ jugador, onRefresh }: { jugador: Jugador; onRefresh: () => void }) {
  const [form, setForm] = useState({
    posicion:    jugador.posicion    ?? '',
    edad:        String(jugador.edad        ?? ''),
    estatura_cm: String(jugador.estatura_cm ?? ''),
    peso_kg:     String(jugador.peso_kg     ?? ''),
  })
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await fetch('/api/evaluaciones/variables', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jugador_id: jugador.id,
        posicion: form.posicion || null,
        edad: form.edad ? Number(form.edad) : null,
        estatura_cm: form.estatura_cm ? Number(form.estatura_cm) : null,
        peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
      }),
    })
    setSaving(false); setOk(true)
    setTimeout(() => { setOk(false); onRefresh() }, 1500)
  }

  const imc = form.peso_kg && form.estatura_cm
    ? (Number(form.peso_kg) / Math.pow(Number(form.estatura_cm) / 100, 2)).toFixed(1)
    : null

  return (
    <Card title="Variables Simples">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Field label="Nombre" value={jugador.nombre} type="text" readOnly />
        <Field label="Posición" value={form.posicion} onChange={v => setForm(p => ({ ...p, posicion: v }))} type="text" />
        <Field label="Edad" value={form.edad} onChange={v => setForm(p => ({ ...p, edad: v }))} unit="años" min="15" max="45" step="1" />
        <Field label="Altura" value={form.estatura_cm} onChange={v => setForm(p => ({ ...p, estatura_cm: v }))} unit="cm" min="150" max="220" step="1" />
        <Field label="Peso actual" value={form.peso_kg} onChange={v => setForm(p => ({ ...p, peso_kg: v }))} unit="kg" min="40" max="150" />
        {imc && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>IMC</div>
            <div style={{
              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              padding: '8px 12px', fontSize: 18, fontWeight: 800,
              color: Number(imc) < 25 ? '#a3e635' : Number(imc) < 30 ? '#facc15' : '#ef4444',
            }}>{imc}</div>
          </div>
        )}
      </div>
      <Btn onClick={handleSave} disabled={saving}>{ok ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar'}</Btn>
    </Card>
  )
}

// ─── 1b. Antropometría — Composición Corporal (Faulkner 4 pliegues) ──────────
function AntropometriaPanel({ jugador }: { jugador: Jugador }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    peso_kg: jugador.peso_kg?.toString() || '',
    altura_cm: jugador.estatura_cm?.toString() || '',
    pliegue_triceps: '', pliegue_subescapular: '', pliegue_suprailiaco: '', pliegue_abdominal: '',
    notas: '',
  })

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/evaluaciones/antropometria?jugador_id=${jugador.id}`)
      if (r.ok) setHistorial(await r.json())
    } catch {}
    setLoading(false)
  }
  useEffect(() => { load() }, [jugador.id])

  // Live preview calculation
  const pliegues = [form.pliegue_triceps, form.pliegue_subescapular, form.pliegue_suprailiaco, form.pliegue_abdominal]
  const allPliegues = pliegues.every(p => p !== '' && Number(p) > 0)
  const sum4 = allPliegues ? pliegues.reduce((s, p) => s + Number(p), 0) : null
  const pctGrasa = sum4 !== null ? (sum4 * 0.153) + 5.783 : null
  const peso = Number(form.peso_kg) || 0
  const masaGrasa = pctGrasa !== null && peso > 0 ? (peso * pctGrasa) / 100 : null
  const masaMagra = masaGrasa !== null && peso > 0 ? peso - masaGrasa : null

  const clasificacion = (pct: number) => {
    if (pct <= 10.5) return { label: 'Élite / Competición', color: '#22c55e', icon: '🟢' }
    if (pct <= 13) return { label: 'Nivel Aceptable', color: '#f59e0b', icon: '🟡' }
    return { label: 'Exceso de Grasa', color: '#ef4444', icon: '🔴' }
  }

  const handleSave = async () => {
    if (!allPliegues || !form.peso_kg) return
    setSaving(true)
    await fetch('/api/evaluaciones/antropometria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jugador_id: jugador.id, fecha: form.fecha, peso_kg: Number(form.peso_kg),
        altura_cm: form.altura_cm ? Number(form.altura_cm) : null,
        pliegue_triceps: Number(form.pliegue_triceps), pliegue_subescapular: Number(form.pliegue_subescapular),
        pliegue_suprailiaco: Number(form.pliegue_suprailiaco), pliegue_abdominal: Number(form.pliegue_abdominal),
        notas: form.notas || null,
      }),
    })
    setSaving(false)
    setForm(p => ({ ...p, pliegue_triceps: '', pliegue_subescapular: '', pliegue_suprailiaco: '', pliegue_abdominal: '', notas: '' }))
    load()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/evaluaciones/antropometria?id=${id}`, { method: 'DELETE' })
    load()
  }

  const chartPts = [...historial].reverse().slice(-12)

  // Alerta si la masa magra cayó > 2 kg desde la primera medición
  let alertaMasaMagra = null
  if (historial.length >= 2) {
    const primera = Number(historial[historial.length - 1].masa_magra_kg)
    const ultima = Number(historial[0].masa_magra_kg)
    const delta = ultima - primera
    if (delta <= -2) {
      alertaMasaMagra = { delta: Math.abs(delta).toFixed(1), primera: primera.toFixed(1), ultima: ultima.toFixed(1) }
    }
  }

  return (
    <Card title="Composición Corporal — Método Faulkner (4 Pliegues)" accent="#06b6d4">
      <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#64748b', border: '1px solid #334155', lineHeight: 1.6 }}>
        📋 <strong style={{ color: '#94a3b8' }}>Protocolo:</strong> Medir con plicómetro profesional (3 mediciones, usar promedio).
        Pliegues: <strong style={{ color: '#06b6d4' }}>Tríceps</strong> (vertical), <strong style={{ color: '#06b6d4' }}>Subescapular</strong> (diagonal 45°),{' '}
        <strong style={{ color: '#06b6d4' }}>Suprailiaco</strong> (diagonal sobre cresta) y <strong style={{ color: '#06b6d4' }}>Abdominal</strong> (vertical a 2cm del ombligo).
      </div>

      {/* Form */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
        <Field label="Fecha" value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} type="date" />
        <Field label="Peso" value={form.peso_kg} onChange={v => setForm(p => ({ ...p, peso_kg: v }))} unit="kg" min="30" max="150" />
        <Field label="Altura" value={form.altura_cm} onChange={v => setForm(p => ({ ...p, altura_cm: v }))} unit="cm" min="140" max="210" />
        <Field label="Tríceps" value={form.pliegue_triceps} onChange={v => setForm(p => ({ ...p, pliegue_triceps: v }))} unit="mm" min="1" max="50" />
        <Field label="Subescapular" value={form.pliegue_subescapular} onChange={v => setForm(p => ({ ...p, pliegue_subescapular: v }))} unit="mm" min="1" max="50" />
        <Field label="Suprailiaco" value={form.pliegue_suprailiaco} onChange={v => setForm(p => ({ ...p, pliegue_suprailiaco: v }))} unit="mm" min="1" max="50" />
        <Field label="Abdominal" value={form.pliegue_abdominal} onChange={v => setForm(p => ({ ...p, pliegue_abdominal: v }))} unit="mm" min="1" max="50" />
      </div>

      {/* Live preview */}
      {pctGrasa !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Σ 4 Pliegues', value: `${sum4} mm`, color: '#06b6d4' },
            { label: '% Grasa Corporal', value: `${pctGrasa.toFixed(2)}%`, color: clasificacion(pctGrasa).color },
            { label: 'Masa Grasa', value: masaGrasa !== null ? `${masaGrasa.toFixed(2)} kg` : '—', color: '#f97316' },
            { label: 'Masa Magra', value: masaMagra !== null ? `${masaMagra.toFixed(2)} kg` : '—', color: '#22c55e' },
          ].map(item => (
            <div key={item.label} style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', border: `1px solid ${item.color}33` }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.value}</div>
            </div>
          ))}
          <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', border: `1px solid ${clasificacion(pctGrasa).color}33`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Clasificación</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: clasificacion(pctGrasa).color }}>{clasificacion(pctGrasa).icon} {clasificacion(pctGrasa).label}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'end' }}>
        <div style={{ flex: 1 }}>
          <Field label="Notas" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} type="text" placeholder="Observaciones..." />
        </div>
        <Btn onClick={handleSave} disabled={saving || !allPliegues || !form.peso_kg}>{saving ? 'Guardando...' : '+ Registrar'}</Btn>
      </div>

      {/* Referencia */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, fontSize: 11 }}>
        <span style={{ color: '#22c55e' }}>● 8% – 10.5% Élite</span>
        <span style={{ color: '#f59e0b' }}>● 10.6% – 13% Aceptable</span>
        <span style={{ color: '#ef4444' }}>● {'>'} 14% Exceso</span>
        <span style={{ color: '#64748b', fontStyle: 'italic' }}>Fórmula: (Σ4 × 0.153) + 5.783</span>
      </div>

      {/* Alerta de pérdida de masa muscular */}
      {alertaMasaMagra && (
        <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>Pérdida de masa muscular significativa</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              Bajó <strong style={{ color: '#f87171' }}>{alertaMasaMagra.delta} kg</strong> de masa magra desde la primera medición ({alertaMasaMagra.primera} kg → {alertaMasaMagra.ultima} kg). Revisar nutrición y carga de entrenamiento.
            </div>
          </div>
        </div>
      )}

      {/* Gráfico doble: % Grasa + Masa Magra */}
      {chartPts.length >= 2 && (() => {
        const W = 460, H = 110, pad = { l: 38, r: 38, t: 14, b: 22 }
        const pW = W - pad.l - pad.r, pH = H - pad.t - pad.b

        const grasaVals = chartPts.map(p => Number(p.pct_grasa))
        const magraVals = chartPts.map(p => Number(p.masa_magra_kg))

        const gMin = Math.min(...grasaVals) - 1,  gMax = Math.max(...grasaVals) + 1
        const mMin = Math.min(...magraVals) - 1,  mMax = Math.max(...magraVals) + 1

        const tx  = (i: number) => pad.l + (i / (chartPts.length - 1)) * pW
        const tyG = (v: number) => pad.t + pH - ((v - gMin) / (gMax - gMin)) * pH
        const tyM = (v: number) => pad.t + pH - ((v - mMin) / (mMax - mMin)) * pH

        const dGrasa = chartPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${tx(i)},${tyG(Number(p.pct_grasa))}`).join(' ')
        const dMagra = chartPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${tx(i)},${tyM(Number(p.masa_magra_kg))}`).join(' ')

        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Evolución Composición Corporal</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 10 }}>
                <span style={{ color: '#06b6d4' }}>─ % Grasa</span>
                <span style={{ color: '#22c55e' }}>─ Masa Magra (kg)</span>
              </div>
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
              {/* Zona óptima % grasa */}
              <rect x={pad.l} y={tyG(13)} width={pW} height={Math.max(0, tyG(10.5) - tyG(13))} fill="#f59e0b0a" />
              <rect x={pad.l} y={tyG(10.5)} width={pW} height={Math.max(0, pad.t + pH - tyG(10.5))} fill="#22c55e0a" />
              <line x1={pad.l} y1={tyG(10.5)} x2={pad.l + pW} y2={tyG(10.5)} stroke="#22c55e33" strokeDasharray="3 3" />
              <line x1={pad.l} y1={tyG(13)}   x2={pad.l + pW} y2={tyG(13)}   stroke="#f59e0b33" strokeDasharray="3 3" />
              {/* Eje Y izquierdo (% grasa) */}
              <text x={pad.l - 4} y={tyG(gMin + 0.5) + 3} textAnchor="end" fontSize={8} fill="#06b6d488">{gMin.toFixed(0)}%</text>
              <text x={pad.l - 4} y={tyG(gMax - 0.5) + 3} textAnchor="end" fontSize={8} fill="#06b6d488">{gMax.toFixed(0)}%</text>
              {/* Eje Y derecho (masa magra) */}
              <text x={pad.l + pW + 4} y={tyM(mMin + 0.5) + 3} textAnchor="start" fontSize={8} fill="#22c55e88">{mMin.toFixed(0)}</text>
              <text x={pad.l + pW + 4} y={tyM(mMax - 0.5) + 3} textAnchor="start" fontSize={8} fill="#22c55e88">{mMax.toFixed(0)}</text>
              {/* Líneas */}
              <path d={dGrasa} fill="none" stroke="#06b6d4" strokeWidth={2} strokeLinejoin="round" />
              <path d={dMagra} fill="none" stroke="#22c55e" strokeWidth={2} strokeLinejoin="round" strokeDasharray="5 3" />
              {/* Puntos */}
              {chartPts.map((p, i) => (
                <g key={i}>
                  <circle cx={tx(i)} cy={tyG(Number(p.pct_grasa))}    r={3} fill="#06b6d4" />
                  <circle cx={tx(i)} cy={tyM(Number(p.masa_magra_kg))} r={3} fill="#22c55e" />
                </g>
              ))}
              {/* Fechas eje X (cada 3 puntos) */}
              {chartPts.map((p, i) => i % Math.ceil(chartPts.length / 4) === 0 && (
                <text key={i} x={tx(i)} y={H - 4} textAnchor="middle" fontSize={8} fill="#475569">
                  {String(p.fecha).slice(5)}
                </text>
              ))}
            </svg>
          </div>
        )
      })()}

      {/* History table */}
      {loading ? (
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</div>
      ) : historial.length === 0 ? (
        <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin mediciones registradas.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b' }}>
              {['Fecha', 'Peso', 'Σ4', '% Grasa', 'M. Grasa', 'M. Magra', 'Clasif.', 'Notas', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historial.map((r: any) => {
              const cl = clasificacion(Number(r.pct_grasa))
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '7px 8px', color: '#94a3b8' }}>{r.fecha?.split('T')[0] ?? r.fecha}</td>
                  <td style={{ padding: '7px 8px', color: '#f1f5f9', fontWeight: 600 }}>{r.peso_kg} kg</td>
                  <td style={{ padding: '7px 8px', color: '#06b6d4', fontWeight: 600 }}>{r.sum_4_pliegues} mm</td>
                  <td style={{ padding: '7px 8px', color: cl.color, fontWeight: 800, fontSize: 14 }}>{Number(r.pct_grasa).toFixed(2)}%</td>
                  <td style={{ padding: '7px 8px', color: '#f97316' }}>{Number(r.masa_grasa_kg).toFixed(1)} kg</td>
                  <td style={{ padding: '7px 8px', color: '#22c55e' }}>{Number(r.masa_magra_kg).toFixed(1)} kg</td>
                  <td style={{ padding: '7px 8px', color: cl.color, fontSize: 11 }}>{cl.icon} {cl.label}</td>
                  <td style={{ padding: '7px 8px', color: '#64748b' }}>{r.notas ?? '—'}</td>
                  <td style={{ padding: '7px 8px' }}><Btn onClick={() => handleDelete(r.id)} variant="ghost" small>✕</Btn></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ─── 1c. Calculadora de Hidratación ───────────────────────────────────────────
function HidratacionPanel({ jugador }: { jugador: Jugador }) {
  const [hidPre, setHidPre]           = useState('')
  const [hidPost, setHidPost]         = useState('')
  const [hidDurMin, setHidDurMin]     = useState('')

  const perdidaMl = hidPre && hidPost && Number(hidPre) > Number(hidPost)
    ? Math.round((Number(hidPre) - Number(hidPost)) * 1000)
    : null
  const pctPerdida = perdidaMl && hidPre ? ((perdidaMl / (Number(hidPre) * 1000)) * 100).toFixed(1) : null
  const reposicion = perdidaMl ? Math.round(perdidaMl * 1.5) : null

  return (
    <Card title="Calculadora de Hidratación — Protocolo de Reposición" accent="#06b6d4">
      <div style={{ background: '#1e293b', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#64748b', border: '1px solid #334155', lineHeight: 1.6 }}>
        💧 <strong style={{ color: '#94a3b8' }}>Protocolo:</strong> Pesar al jugador antes y después de la sesión (sin ropa húmeda).
        La reposición ideal es del <strong style={{ color: '#06b6d4' }}>150% de la pérdida</strong> para compensar la diuresis posterior.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 14 }}>
        <Field label="Peso Pre (kg)"  value={hidPre}    onChange={setHidPre}    unit="kg" min="40" max="150" />
        <Field label="Peso Post (kg)" value={hidPost}   onChange={setHidPost}   unit="kg" min="40" max="150" />
        <Field label="Duración (min)" value={hidDurMin} onChange={setHidDurMin} unit="min" min="10" max="300" />
      </div>

      {perdidaMl !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {[
            { label: 'Pérdida de líquidos', value: `${perdidaMl} mL`, sub: `(${pctPerdida}% del peso corporal)`, color: perdidaMl > 2000 ? '#ef4444' : perdidaMl > 1000 ? '#f59e0b' : '#22c55e' },
            { label: 'Reposición recomendada', value: `${reposicion} mL`, sub: '150% de la pérdida (Sawka et al.)', color: '#06b6d4' },
            { label: 'Nivel de deshidratación', value: Number(pctPerdida) >= 3 ? 'Alta ⚠' : Number(pctPerdida) >= 2 ? 'Moderada' : 'Leve', sub: Number(pctPerdida) >= 3 ? 'Riesgo rendimiento' : Number(pctPerdida) >= 2 ? 'Atención' : 'Aceptable', color: Number(pctPerdida) >= 3 ? '#ef4444' : Number(pctPerdida) >= 2 ? '#f59e0b' : '#22c55e' },
            ...(hidDurMin && Number(hidDurMin) > 0 ? [{ label: 'Tasa de sudoración', value: `${Math.round(perdidaMl / Number(hidDurMin) * 60)} mL/h`, sub: 'Pérdida por hora estimada', color: '#a3e635' }] : []),
          ].map((item, i) => (
            <div key={i} style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', border: `1px solid ${item.color}33` }}>
              <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: item.color, marginBottom: 2 }}>{item.value}</div>
              <div style={{ fontSize: 10, color: '#475569' }}>{item.sub}</div>
            </div>
          ))}
        </div>
      )}
      {!perdidaMl && (hidPre || hidPost) && (
        <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>Ingresá ambos pesos para calcular.</div>
      )}
      {!hidPre && !hidPost && (
        <div style={{ fontSize: 12, color: '#334155' }}>Ingresá el peso antes y después del entrenamiento para obtener la pérdida de fluidos y la recomendación de reposición.</div>
      )}
    </Card>
  )
}

// ─── 2. Pesajes ───────────────────────────────────────────────────────────────
function PesajesPanel({ jugador, onRefresh }: { jugador: Jugador; onRefresh?: () => void }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], peso_kg: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/evaluaciones/pesajes?jugador_id=${jugador.id}`)
      if (!r.ok) { setHistorial([]); setLoading(false); return }
      const data = await r.json()
      setHistorial(Array.isArray(data) ? data : [])
    } catch {
      setHistorial([])
    }
    setLoading(false)
  }, [jugador.id])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.peso_kg) return
    setSaving(true)
    await fetch('/api/evaluaciones/pesajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugador_id: jugador.id, ...form, peso_kg: Number(form.peso_kg) }),
    })
    setSaving(false)
    setForm(p => ({ ...p, peso_kg: '', notas: '' }))
    load()
    // Reload jugador profile so peso_kg shows updated value in this session
    onRefresh?.()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/evaluaciones/pesajes?id=${id}`, { method: 'DELETE' })
    load()
  }

  const getPesoEstado = (peso: number): 'verde' | 'rojo' | 'gris' => {
    const min = jugador.peso_ideal_min
    const max = jugador.peso_ideal_max
    if (!min || !max) return 'gris'
    return peso >= min && peso <= max ? 'verde' : 'rojo'
  }

  return (
    <Card title="Control de Pesaje">
      {jugador.peso_ideal_min && jugador.peso_ideal_max ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#1e293b', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          border: '1px solid #334155',
        }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>PESO IDEAL</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#a3e635' }}>
            {jugador.peso_ideal_min} – {jugador.peso_ideal_max} kg
          </span>
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>Configurado por el coach</span>
        </div>
      ) : (
        <div style={{
          background: '#1e293b', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          border: '1px dashed #334155', fontSize: 12, color: '#475569',
        }}>
          ⚠️ Sin rango de peso ideal definido — el coach debe configurarlo en el perfil del jugador (sección Jugadores → Editar).
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '180px 140px 1fr auto', gap: 10, alignItems: 'end', marginBottom: 20 }}>
        <Field label="Fecha" value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} type="date" />
        <Field label="Peso (kg)" value={form.peso_kg} onChange={v => setForm(p => ({ ...p, peso_kg: v }))} unit="kg" min="40" max="150" />
        <Field label="Notas (opcional)" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} type="text" placeholder="Observaciones..." />
        <Btn onClick={handleAdd} disabled={saving || !form.peso_kg}>{saving ? '...' : '+ Agregar'}</Btn>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</div>
      ) : historial.length === 0 ? (
        <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin pesajes registrados.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Fecha', 'Peso', 'Estado', 'Registrado por', 'Notas', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historial.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{p.fecha?.split('T')[0] ?? p.fecha}</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f1f5f9', fontSize: 15 }}>{p.peso_kg} kg</td>
                  <td style={{ padding: '8px 10px' }}><Semaforo estado={getPesoEstado(Number(p.peso_kg))} /></td>
                  <td style={{ padding: '8px 10px', color: '#64748b', fontSize: 11 }}>{p.registrado_por}</td>
                  <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.notas ?? '—'}</td>
                  <td style={{ padding: '8px 10px' }}>
                    <Btn onClick={() => handleDelete(p.id)} variant="ghost" small>✕</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ─── 3. CMJ ───────────────────────────────────────────────────────────────────
function CMJPanel({ jugador }: { jugador: Jugador }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], s1: '', s2: '', s3: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nuevoRecord, setNuevoRecord] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/evaluaciones/cmj?jugador_id=${jugador.id}`)
      if (!r.ok) { setHistorial([]); setLoading(false); return }
      const data = await r.json()
      setHistorial(Array.isArray(data) ? data : [])
    } catch {
      setHistorial([])
    }
    setLoading(false)
  }, [jugador.id])

  useEffect(() => { load() }, [load])

  // Récord personal: el mayor promedio de todos los tests
  const recordPersonal = historial.length > 0
    ? historial.reduce((max, r) => Number(r.promedio_cm) > Number(max.promedio_cm) ? r : max, historial[0])
    : null

  const promPreview = [form.s1, form.s2, form.s3].every(Boolean)
    ? ((Number(form.s1) + Number(form.s2) + Number(form.s3)) / 3).toFixed(2)
    : null

  // ¿El preview rompe el récord?
  const rompeRecord = promPreview && recordPersonal
    ? Number(promPreview) > Number(recordPersonal.promedio_cm)
    : promPreview && !recordPersonal

  const handleAdd = async () => {
    if (!form.s1 || !form.s2 || !form.s3) return
    setSaving(true)
    const res = await fetch('/api/evaluaciones/cmj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jugador_id: jugador.id, fecha: form.fecha,
        salto1_cm: Number(form.s1), salto2_cm: Number(form.s2), salto3_cm: Number(form.s3),
        notas: form.notas || null,
      }),
    })
    const data = await res.json()
    setSaving(false)
    setForm(p => ({ ...p, s1: '', s2: '', s3: '', notas: '' }))
    if (data.es_nuevo_record) {
      setNuevoRecord(true)
      setTimeout(() => setNuevoRecord(false), 5000)
    }
    load()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/evaluaciones/cmj?id=${id}`, { method: 'DELETE' })
    load()
  }

  const getFatigaEstado = (estado: string): 'verde' | 'rojo' | 'gris' =>
    estado === 'normal' ? 'verde' : estado === 'fatiga' ? 'rojo' : 'gris'

  return (
    <Card title="Test CMJ — Countermovement Jump">

      {/* ── Récord Personal Widget ── */}
      <div style={{ marginBottom: 20 }}>
        {nuevoRecord ? (
          <div style={{
            background: 'linear-gradient(135deg, #a3e63520, #facc1520)',
            border: '2px solid #a3e635',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            animation: 'pulse 1s ease-in-out',
          }}>
            <span style={{ fontSize: 36 }}>🏆</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#a3e635', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                ¡Nueva mayor altura lograda!
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2 }}>
                {recordPersonal ? Number(recordPersonal.promedio_cm).toFixed(1) : '—'} cm
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {jugador.nombre} acaba de romper su récord personal 🔥
              </div>
            </div>
          </div>
        ) : recordPersonal ? (
          <div style={{
            background: '#0a0f14', border: '1px solid #facc1540',
            borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 28 }}>🏆</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#facc15', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                Récord Personal
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#facc15', lineHeight: 1 }}>
                {Number(recordPersonal.promedio_cm).toFixed(1)} cm
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 3 }}>
                Logrado el {recordPersonal.fecha?.split('T')[0] ?? recordPersonal.fecha}
              </div>
            </div>
            {rompeRecord && (
              <div style={{
                background: '#a3e63520', border: '1px solid #a3e63560',
                borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#a3e635', fontWeight: 700,
              }}>
                ⚡ Este test lo rompe
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: '#0a0f14', border: '1px dashed #1e293b',
            borderRadius: 14, padding: '14px 18px', fontSize: 12, color: '#475569',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            Sin récord registrado aún — el primer test lo establece.
          </div>
        )}
      </div>

      {/* ── Protocolo ── */}
      <div style={{
        background: '#1e293b', borderRadius: 10, padding: '10px 14px',
        marginBottom: 16, fontSize: 12, color: '#64748b', border: '1px solid #334155', lineHeight: 1.6,
      }}>
        📋 <strong style={{ color: '#94a3b8' }}>Protocolo:</strong> 3 saltos máximos.
        El diferencial se calcula vs el <strong style={{ color: '#94a3b8' }}>test anterior</strong>.
        Se marca <strong style={{ color: '#ef4444' }}>fatiga</strong> si la caída supera el <strong>10%</strong> respecto al primer test del día.
      </div>

      {/* ── Formulario ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(3, 100px) 1fr auto', gap: 10, alignItems: 'end', marginBottom: 8 }}>
        <Field label="Fecha" value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} type="date" />
        <Field label="Salto 1" value={form.s1} onChange={v => setForm(p => ({ ...p, s1: v }))} unit="cm" min="0" max="100" />
        <Field label="Salto 2" value={form.s2} onChange={v => setForm(p => ({ ...p, s2: v }))} unit="cm" min="0" max="100" />
        <Field label="Salto 3" value={form.s3} onChange={v => setForm(p => ({ ...p, s3: v }))} unit="cm" min="0" max="100" />
        <Field label="Notas" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} type="text" placeholder="Observaciones..." />
        <Btn onClick={handleAdd} disabled={saving || !form.s1 || !form.s2 || !form.s3}>{saving ? '...' : '+ Registrar'}</Btn>
      </div>

      {promPreview && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            → Promedio: <strong style={{ color: '#a3e635', fontSize: 16 }}>{promPreview} cm</strong>
          </span>
          {rompeRecord && (
            <span style={{
              background: '#a3e63520', border: '1px solid #a3e63560',
              borderRadius: 99, padding: '2px 10px', fontSize: 11, color: '#a3e635', fontWeight: 700,
            }}>
              🏆 Nuevo récord
            </span>
          )}
        </div>
      )}

      {/* ── Tabla historial ── */}
      {loading ? (
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</div>
      ) : historial.length === 0 ? (
        <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin tests registrados.</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['Fecha', 'S1', 'S2', 'S3', 'Promedio', 'Diferencial', 'Estado', 'Notas', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((r: any, idx: number) => {
                  // Diferencial vs el test inmediatamente anterior en el historial (que viene ordenado DESC)
                  const anterior = historial[idx + 1]
                  const diff = anterior ? Number(r.promedio_cm) - Number(anterior.promedio_cm) : null
                  const esRecord = recordPersonal && r.id === recordPersonal.id
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #0f172a', background: esRecord ? '#facc1508' : 'transparent' }}>
                      <td style={{ padding: '8px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {r.fecha?.split('T')[0] ?? r.fecha}
                        {esRecord && <span style={{ marginLeft: 6, fontSize: 10, color: '#facc15', fontWeight: 700 }}>🏆 REC</span>}
                        {r.es_baseline && !esRecord && <span style={{ marginLeft: 6, fontSize: 10, color: '#475569', fontWeight: 600 }}>BASE</span>}
                      </td>
                      <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>{r.salto1_cm}</td>
                      <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>{r.salto2_cm}</td>
                      <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>{r.salto3_cm}</td>
                      <td style={{ padding: '8px 8px', fontWeight: 700, color: '#f1f5f9' }}>{Number(r.promedio_cm).toFixed(1)} cm</td>
                      <td style={{ padding: '8px 8px', fontWeight: 600, color: diff === null ? '#475569' : diff >= 0 ? '#22c55e' : '#ef4444' }}>
                        {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} cm`}
                      </td>
                      <td style={{ padding: '8px 8px' }}>
                        {r.estado_fatiga === 'sin_baseline' ? <Semaforo estado="gris" /> : <Semaforo estado={getFatigaEstado(r.estado_fatiga)} />}
                      </td>
                      <td style={{ padding: '8px 8px', color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notas ?? '—'}</td>
                      <td style={{ padding: '8px 8px' }}>
                        <Btn onClick={() => handleDelete(r.id)} variant="ghost" small>✕</Btn>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Gráfico CMJ ── */}
          {historial.length >= 2 && <CMJChart historial={historial} recordId={recordPersonal?.id} />}
        </>
      )}
    </Card>
  )
}

// ─── 4. Isométrico ────────────────────────────────────────────────────────────
const GRUPOS = ['Isquiotibiales', 'Cuádriceps', 'Aductores', 'Abductores', 'Flexores de cadera']

function IsometricoPanel({ jugador }: { jugador: Jugador }) {
  const [grupo, setGrupo] = useState('Isquiotibiales')
  const [historial, setHistorial] = useState<any[]>([])
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    d1: '', d2: '', d3: '', i1: '', i2: '', i3: '',
    unidad: 'N', notas: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/evaluaciones/isometrico?jugador_id=${jugador.id}&grupo=${encodeURIComponent(grupo)}`)
      if (!r.ok) { setHistorial([]); setLoading(false); return }
      const data = await r.json()
      setHistorial(Array.isArray(data) ? data : [])
    } catch {
      setHistorial([])
    }
    setLoading(false)
  }, [jugador.id, grupo])

  useEffect(() => { load() }, [load])

  const promDer = [form.d1, form.d2, form.d3].every(Boolean)
    ? ((Number(form.d1) + Number(form.d2) + Number(form.d3)) / 3).toFixed(1) : null
  const promIzq = [form.i1, form.i2, form.i3].every(Boolean)
    ? ((Number(form.i1) + Number(form.i2) + Number(form.i3)) / 3).toFixed(1) : null
  const asimPreview = promDer && promIzq
    ? (Math.abs(Number(promDer) - Number(promIzq)) / Math.max(Number(promDer), Number(promIzq)) * 100).toFixed(1) : null

  const handleAdd = async () => {
    if ([form.d1, form.d2, form.d3, form.i1, form.i2, form.i3].some(v => !v)) return
    setSaving(true)
    await fetch('/api/evaluaciones/isometrico', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jugador_id: jugador.id, fecha: form.fecha, grupo_muscular: grupo,
        der_intento1: Number(form.d1), der_intento2: Number(form.d2), der_intento3: Number(form.d3),
        izq_intento1: Number(form.i1), izq_intento2: Number(form.i2), izq_intento3: Number(form.i3),
        unidad: form.unidad, notas: form.notas || null,
      }),
    })
    setSaving(false)
    setForm(p => ({ ...p, d1: '', d2: '', d3: '', i1: '', i2: '', i3: '', notas: '' }))
    load()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/evaluaciones/isometrico?id=${id}`, { method: 'DELETE' })
    load()
  }

  const getSemaforo = (pct: number): 'verde' | 'amarillo' | 'rojo' =>
    pct < 10 ? 'verde' : pct <= 15 ? 'amarillo' : 'rojo'

  return (
    <Card title="Tests Isométricos">
      {/* Selector de grupo muscular */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {GRUPOS.map(g => (
          <button className="hover-scale" key={g} onClick={() => setGrupo(g)} style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            border: `1px solid ${grupo === g ? '#a3e635' : '#334155'}`,
            background: grupo === g ? '#a3e63522' : '#1e293b',
            color: grupo === g ? '#a3e635' : '#64748b',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>{g}</button>
        ))}
      </div>

      {/* Referencia semáforo */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        background: '#1e293b', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        border: '1px solid #334155', fontSize: 12, color: '#64748b',
      }}>
        <span>🟢 <strong style={{ color: '#22c55e' }}>Verde:</strong> &lt;10%</span>
        <span>🟡 <strong style={{ color: '#facc15' }}>Amarillo:</strong> 10–15%</span>
        <span>🔴 <strong style={{ color: '#ef4444' }}>Rojo:</strong> &gt;15% — Alto riesgo</span>
      </div>

      {/* Formulario */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '160px 90px 1fr', gap: 10, alignItems: 'end', marginBottom: 12 }}>
          <Field label="Fecha" value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} type="date" />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>Unidad</div>
            <select value={form.unidad} onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))}
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#f1f5f9', width: '100%' }}>
              <option value="N">N (Newtons)</option>
              <option value="%BW">%BW</option>
              <option value="Nm">Nm</option>
            </select>
          </div>
          <Field label="Notas" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} type="text" placeholder="Observaciones..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          {/* Pierna Derecha */}
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 14, border: '1px solid #334155' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🦵 Pierna Derecha
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <Field label="Intento 1" value={form.d1} onChange={v => setForm(p => ({ ...p, d1: v }))} unit={form.unidad} min="0" />
              <Field label="Intento 2" value={form.d2} onChange={v => setForm(p => ({ ...p, d2: v }))} unit={form.unidad} min="0" />
              <Field label="Intento 3" value={form.d3} onChange={v => setForm(p => ({ ...p, d3: v }))} unit={form.unidad} min="0" />
            </div>
            {promDer && <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>Promedio: <strong style={{ color: '#60a5fa' }}>{promDer} {form.unidad}</strong></div>}
          </div>

          {/* Pierna Izquierda */}
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 14, border: '1px solid #334155' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f472b6', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              🦵 Pierna Izquierda
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <Field label="Intento 1" value={form.i1} onChange={v => setForm(p => ({ ...p, i1: v }))} unit={form.unidad} min="0" />
              <Field label="Intento 2" value={form.i2} onChange={v => setForm(p => ({ ...p, i2: v }))} unit={form.unidad} min="0" />
              <Field label="Intento 3" value={form.i3} onChange={v => setForm(p => ({ ...p, i3: v }))} unit={form.unidad} min="0" />
            </div>
            {promIzq && <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>Promedio: <strong style={{ color: '#f472b6' }}>{promIzq} {form.unidad}</strong></div>}
          </div>
        </div>

        {/* Preview asimetría */}
        {asimPreview && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#0f172a', borderRadius: 10, padding: '10px 16px',
            border: '1px solid #334155', marginBottom: 12,
          }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>Asimetría:</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>{asimPreview}%</span>
            <Semaforo estado={getSemaforo(Number(asimPreview))} />
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
              Dominante: <strong style={{ color: '#94a3b8' }}>
                {Number(promDer) >= Number(promIzq) ? 'Derecha' : 'Izquierda'}
              </strong>
            </span>
          </div>
        )}

        <Btn onClick={handleAdd} disabled={saving || [form.d1, form.d2, form.d3, form.i1, form.i2, form.i3].some(v => !v)}>
          {saving ? 'Guardando...' : '+ Registrar Test'}
        </Btn>
      </div>

      {/* Historial */}
      {loading ? (
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</div>
      ) : historial.length === 0 ? (
        <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin tests de {grupo} registrados.</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e293b' }}>
                  {['Fecha', 'Prom. Der.', 'Prom. Izq.', 'Asimetría', 'Dominante', 'Estado', 'Unidad', 'Notas', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((r: any) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #0f172a' }}>
                    <td style={{ padding: '8px 8px', color: '#94a3b8' }}>{r.fecha?.split('T')[0] ?? r.fecha}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 700, color: '#60a5fa' }}>{Number(r.der_promedio).toFixed(1)}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 700, color: '#f472b6' }}>{Number(r.izq_promedio).toFixed(1)}</td>
                    <td style={{ padding: '8px 8px', fontWeight: 700, color: '#f1f5f9' }}>{Number(r.pct_asimetria).toFixed(1)}%</td>
                    <td style={{ padding: '8px 8px', color: '#94a3b8', textTransform: 'capitalize' }}>{r.lado_dominante}</td>
                    <td style={{ padding: '8px 8px' }}><Semaforo estado={getSemaforo(Number(r.pct_asimetria))} /></td>
                    <td style={{ padding: '8px 8px', color: '#64748b' }}>{r.unidad}</td>
                    <td style={{ padding: '8px 8px', color: '#64748b' }}>{r.notas ?? '—'}</td>
                    <td style={{ padding: '8px 8px' }}>
                      <Btn onClick={() => handleDelete(r.id)} variant="ghost" small>✕</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Gráfico Isométrico ── */}
          {historial.length >= 2 && <IsometricoChart historial={historial} grupo={grupo} />}
        </>
      )}
    </Card>
  )
}

// ─── Chart: CMJ evolución ─────────────────────────────────────────────────────
function CMJChart({ historial, recordId }: { historial: any[], recordId?: number }) {
  const pts      = [...historial].reverse()
  const promedios = pts.map(r => Number(r.promedio_cm))
  const labels    = pts.map(r => (r.fecha?.split('T')[0] ?? r.fecha)?.slice(5))
  const baseline  = pts.find(r => r.es_baseline)
  const baseVal   = baseline ? Number(baseline.promedio_cm) : null

  const W = 560, H = 200, pL = 44, pR = 16, pT = 20, pB = 36
  const innerW = W - pL - pR
  const innerH = H - pT - pB
  const n = pts.length

  const minP = Math.min(...promedios) * 0.92
  const maxP = Math.max(...promedios) * 1.06
  const tx  = (i: number) => pL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const tyP = (v: number) => pT + (1 - (v - minP) / (maxP - minP)) * innerH

  const pathProm = promedios.map((v, i) => `${i === 0 ? 'M' : 'L'}${tx(i)},${tyP(v)}`).join(' ')

  return (
    <div style={{ marginTop: 24, background: '#0a0f14', borderRadius: 12, padding: '16px 14px 10px', border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#a3e635', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Evolución CMJ
        </span>
        <div style={{ display: 'flex', gap: 14, fontSize: 10, color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 2, background: '#a3e635', display: 'inline-block', borderRadius: 1 }} />
            Promedio (cm)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10 }}>🏆</span>
            Récord personal
          </span>
          {baseVal && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 14, height: 1, background: '#94a3b8', opacity: 0.5, display: 'inline-block' }} />
              Baseline: {baseVal.toFixed(1)} cm
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={pL} y1={pT + f * innerH} x2={W - pR} y2={pT + f * innerH} stroke="#1e293b" strokeWidth={1} />
        ))}

        {baseVal && (
          <line x1={pL} y1={tyP(baseVal)} x2={W - pR} y2={tyP(baseVal)}
            stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" opacity={0.3} />
        )}

        <line x1={pL} y1={pT} x2={pL} y2={H - pB} stroke="#334155" strokeWidth={1} />
        <line x1={pL} y1={H - pB} x2={W - pR} y2={H - pB} stroke="#334155" strokeWidth={1} />

        {[0, 0.5, 1].map(f => {
          const v = minP + f * (maxP - minP)
          return (
            <text key={f} x={pL - 6} y={pT + (1 - f) * innerH + 4} textAnchor="end" fontSize={8} fill="#475569">
              {v.toFixed(0)}
            </text>
          )
        })}

        <path d={pathProm} fill="none" stroke="#a3e635" strokeWidth={2.5} strokeLinejoin="round" />

        {promedios.map((v, i) => {
          const cx = tx(i), cy = tyP(v)
          const isRec = pts[i]?.id === recordId
          const isBase = pts[i]?.es_baseline
          return (
            <g key={i}>
              {isRec && (
                <circle cx={cx} cy={cy} r={10} fill="#facc1520" stroke="#facc15" strokeWidth={1.5} opacity={0.6} />
              )}
              <circle cx={cx} cy={cy} r={isBase ? 6 : 4}
                fill={isRec ? '#facc15' : isBase ? '#a3e635' : '#0a0f14'}
                stroke={isRec ? '#facc15' : '#a3e635'} strokeWidth={2} />
              <text x={cx} y={cy - 12} textAnchor="middle" fontSize={9} fontWeight={700} fill={isRec ? '#facc15' : '#a3e635'}>
                {v.toFixed(1)}
              </text>
              {isRec && (
                <text x={cx} y={cy - 22} textAnchor="middle" fontSize={8} fill="#facc15">🏆</text>
              )}
            </g>
          )
        })}

        {labels.map((lbl, i) => (
          <text key={i} x={tx(i)} y={H - pB + 14} textAnchor="middle" fontSize={8} fill="#475569">{lbl}</text>
        ))}
      </svg>
    </div>
  )
}

// ─── Chart: Isométrico evolución ──────────────────────────────────────────────
function IsometricoChart({ historial, grupo }: { historial: any[]; grupo: string }) {
  const pts    = [...historial].reverse()
  const ders   = pts.map(r => Number(r.der_promedio))
  const izqs   = pts.map(r => Number(r.izq_promedio))
  const asims  = pts.map(r => Number(r.pct_asimetria))
  const labels = pts.map(r => (r.fecha?.split('T')[0] ?? r.fecha)?.slice(5))

  const W = 560, H = 210, pL = 44, pR = 44, pT = 20, pB = 36
  const innerW = W - pL - pR
  const innerH = H - pT - pB
  const n = pts.length

  const allF = [...ders, ...izqs]
  const minF = Math.min(...allF) * 0.90
  const maxF = Math.max(...allF) * 1.08
  const tx  = (i: number) => pL + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const tyF = (v: number) => pT + (1 - (v - minF) / (maxF - minF)) * innerH
  const maxA = Math.max(...asims, 20)
  const tyA  = (v: number) => pT + (1 - v / maxA) * innerH

  const pathDer = ders.map((v, i) => `${i === 0 ? 'M' : 'L'}${tx(i)},${tyF(v)}`).join(' ')
  const pathIzq = izqs.map((v, i) => `${i === 0 ? 'M' : 'L'}${tx(i)},${tyF(v)}`).join(' ')
  const y10 = tyA(10)
  const y15 = tyA(15)

  return (
    <div style={{ marginTop: 24, background: '#0a0f14', borderRadius: 12, padding: '16px 14px 10px', border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#a3e635', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Evolución — {grupo}
        </span>
        <div style={{ display: 'flex', gap: 14, fontSize: 10, color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 2, background: '#60a5fa', display: 'inline-block', borderRadius: 1 }} />
            Derecha
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 14, height: 2, background: '#f472b6', display: 'inline-block', borderRadius: 1 }} />
            Izquierda
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, background: '#facc15', display: 'inline-block', borderRadius: '50%' }} />
            Asimetría % (eje der.)
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, display: 'block', overflow: 'visible' }}>
        {[0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={pL} y1={pT + f * innerH} x2={W - pR} y2={pT + f * innerH} stroke="#1e293b" strokeWidth={1} />
        ))}

        <rect x={pL} y={y15} width={innerW} height={Math.max(0, (H - pB) - y15)} fill="#ef444408" />
        <rect x={pL} y={y10} width={innerW} height={Math.max(0, y15 - y10)} fill="#facc1508" />
        <line x1={pL} y1={y10} x2={W - pR} y2={y10} stroke="#facc15" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.5} />
        <line x1={pL} y1={y15} x2={W - pR} y2={y15} stroke="#ef4444" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.5} />
        <text x={W - pR + 3} y={y10 + 4} fontSize={7} fill="#facc15" opacity={0.8}>10%</text>
        <text x={W - pR + 3} y={y15 + 4} fontSize={7} fill="#ef4444" opacity={0.8}>15%</text>

        <line x1={pL} y1={pT} x2={pL} y2={H - pB} stroke="#334155" strokeWidth={1} />
        <line x1={pL} y1={H - pB} x2={W - pR} y2={H - pB} stroke="#334155" strokeWidth={1} />
        <line x1={W - pR} y1={pT} x2={W - pR} y2={H - pB} stroke="#334155" strokeWidth={1} />

        {[0, 0.5, 1].map(f => {
          const v = minF + f * (maxF - minF)
          return (
            <text key={f} x={pL - 6} y={pT + (1 - f) * innerH + 4} textAnchor="end" fontSize={8} fill="#475569">
              {v.toFixed(0)}
            </text>
          )
        })}
        {[0, 0.5, 1].map(f => {
          const v = f * maxA
          return (
            <text key={f} x={W - pR + 6} y={pT + (1 - f) * innerH + 4} textAnchor="start" fontSize={8} fill="#64748b">
              {v.toFixed(0)}%
            </text>
          )
        })}

        <path d={pathDer} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />
        <path d={pathIzq} fill="none" stroke="#f472b6" strokeWidth={2} strokeLinejoin="round" />

        {ders.map((v, i) => (
          <g key={`d${i}`}>
            <circle cx={tx(i)} cy={tyF(v)} r={4} fill="#0a0f14" stroke="#60a5fa" strokeWidth={2} />
            <text x={tx(i)} y={tyF(v) - 8} textAnchor="middle" fontSize={8} fill="#60a5fa">{v.toFixed(1)}</text>
          </g>
        ))}
        {izqs.map((v, i) => (
          <g key={`z${i}`}>
            <circle cx={tx(i)} cy={tyF(v)} r={4} fill="#0a0f14" stroke="#f472b6" strokeWidth={2} />
            <text x={tx(i)} y={tyF(v) + 16} textAnchor="middle" fontSize={8} fill="#f472b6">{v.toFixed(1)}</text>
          </g>
        ))}

        {asims.map((a, i) => {
          const col  = a > 15 ? '#ef4444' : a > 10 ? '#facc15' : '#22c55e'
          const barH = Math.min((a / maxA) * innerH * 0.5, innerH * 0.5)
          const barY = H - pB - barH
          return (
            <g key={`a${i}`}>
              <rect x={tx(i) - 5} y={barY} width={10} height={barH} fill={col} opacity={0.3} rx={2} />
              <circle cx={tx(i)} cy={tyA(a)} r={4} fill={col} />
              <text x={tx(i)} y={tyA(a) - 8} textAnchor="middle" fontSize={8} fontWeight={700} fill={col}>
                {a.toFixed(1)}%
              </text>
            </g>
          )
        })}

        {labels.map((lbl, i) => (
          <text key={i} x={tx(i)} y={H - pB + 14} textAnchor="middle" fontSize={8} fill="#475569">{lbl}</text>
        ))}
      </svg>
    </div>
  )
}


// ─── 5. Perfil Fuerza-Velocidad (PFV) — Samozino ────────────────────────────
function PFVPanel({ jugador }: { jugador: Jugador }) {
  const [sesiones, setSesiones] = useState<any[]>([])
  const [activeSesion, setActiveSesion] = useState<number | null>(null)
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], carga_kg: '', velocidad_ms: '', altura_salto_m: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newSesNombre, setNewSesNombre] = useState('')
  const [creatingSes, setCreatingSes] = useState(false)
  const [mode, setMode] = useState<'salto'|'velocidad'>('salto')
  const [masaKg, setMasaKg] = useState(jugador.peso_kg?.toString() || '75')
  const [lowerLimb, setLowerLimb] = useState('0.80')
  const [initialHi, setInitialHi] = useState('0.40')
  const [deletingSes, setDeletingSes] = useState(false)

  // h_po auto-calculated from lower limb length - initial height
  const hPoCalc = Math.max(0.1, (Number(lowerLimb) || 0.8) - (Number(initialHi) || 0.4))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/evaluaciones/pfv?jugador_id=${jugador.id}`)
      if (!r.ok) { setSesiones([]); setLoading(false); return }
      const data = await r.json()
      const arr = Array.isArray(data) ? data : []
      setSesiones(arr)
      if (arr.length > 0 && activeSesion === null) setActiveSesion(arr[0].sesion_id)
    } catch { setSesiones([]) }
    setLoading(false)
  }, [jugador.id])

  useEffect(() => { load() }, [load])

  const sesActual = sesiones.find(s => s.sesion_id === activeSesion)
  const puntos: { id: number; carga: number; vel: number; altura_salto_m?: number; notas?: string }[] = sesActual?.puntos ?? []

  const masa = Number(masaKg) || 75
  const h_po_val = hPoCalc
  const g = 9.81

  const cbrt = (x: number) => x >= 0 ? Math.pow(x, 1/3) : -Math.pow(-x, 1/3)

  const jumpData = puntos.map(p => {
    const masaTotal = masa + p.carga
    const h_salto = Number(p.altura_salto_m) || 0
    if (h_salto <= 0) return { ...p, masaTotal, v_mean: 0, f_media: 0, f_rel: 0, p_watt: 0 }
    const f_media = masaTotal * g * (h_salto / h_po_val + 1)
    const v_mean = Math.sqrt(g * h_salto / 2)
    const f_rel = f_media / masa
    const p_watt = f_media * v_mean
    return { ...p, masaTotal, v_mean, f_media, f_rel, p_watt }
  }).filter(d => d.v_mean > 0)

  const fvRegression = (() => {
    if (jumpData.length < 2) return null
    const n = jumpData.length
    const xVals = jumpData.map(d => d.v_mean)
    const yVals = jumpData.map(d => d.f_media)
    const sumX = xVals.reduce((a, b) => a + b, 0)
    const sumY = yVals.reduce((a, b) => a + b, 0)
    const sumXY = xVals.reduce((a, x, i) => a + x * yVals[i], 0)
    const sumXX = xVals.reduce((a, x) => a + x * x, 0)
    const denom = n * sumXX - sumX * sumX
    if (Math.abs(denom) < 1e-10) return null
    const slope = (n * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / n
    const F0 = intercept
    const V0 = slope < 0 ? -intercept / slope : 0
    const Sfv = slope
    const Pmax = F0 > 0 && V0 > 0 ? (F0 * V0) / 4 : 0
    const meanY = sumY / n
    const ssRes = yVals.reduce((a, y, i) => a + Math.pow(y - (intercept + slope * xVals[i]), 2), 0)
    const ssTot = yVals.reduce((a, y) => a + Math.pow(y - meanY, 2), 0)
    const R2 = ssTot > 0 ? 1 - ssRes / ssTot : 0

    const F0_rel = F0 / masa
    const Sfv_rel = Sfv / masa
    const Pmax_rel = Pmax / masa

    // Sfv_opt: Samozino cubic (alpha=90° vertical jump)
    const g_eff = g
    const hp = h_po_val
    let Sfv_opt_rel = -999
    let balance = 0
    if (Pmax_rel > 0) {
      const sqrtInner = 2 * Math.pow(g_eff, 3) * Math.pow(hp, 9) * Math.pow(Pmax_rel, 6)
        + 27 * Math.pow(hp, 8) * Math.pow(Pmax_rel, 8)
      const S_arg = -Math.pow(g_eff, 6) * Math.pow(hp, 6)
        - 18 * Math.pow(g_eff, 3) * Math.pow(hp, 5) * Math.pow(Pmax_rel, 2)
        - 54 * Math.pow(hp, 4) * Math.pow(Pmax_rel, 4)
        + 6 * Math.sqrt(3) * Math.sqrt(sqrtInner)
      const S = cbrt(S_arg)
      if (Math.abs(S) > 1e-10) {
        const p1 = -(g_eff * g_eff) / (3 * Pmax_rel)
        const num2 = -(Math.pow(g_eff, 4) * Math.pow(hp, 4)) - 12 * g_eff * Math.pow(hp, 3) * Math.pow(Pmax_rel, 2)
        const p2 = -num2 / (3 * hp * hp * Pmax_rel * S)
        const p3 = S / (3 * hp * hp * Pmax_rel)
        Sfv_opt_rel = p1 + p2 + p3
      }
      balance = Sfv_opt_rel !== 0 ? Math.round((Sfv_rel / Sfv_opt_rel) * 100) : 0
    }

    // Optimal line endpoints (in F/kg vs V space)
    // F0_opt and V0_opt for the optimal slope line that passes through same Pmax
    const F0_opt_rel = Sfv_opt_rel !== -999 ? 2 * Math.sqrt(-Pmax_rel * Sfv_opt_rel) : F0_rel
    const V0_opt = Sfv_opt_rel !== -999 && Sfv_opt_rel !== 0 ? 4 * Pmax_rel / F0_opt_rel : V0

    let diagnostico: string, diagColor: string, category: string
    if (balance < 60) { diagnostico = 'ALTO DÉFICIT DE FUERZA'; diagColor = '#f59e0b'; category = 'Fuerza máxima' }
    else if (balance < 90) { diagnostico = 'DÉFICIT DE FUERZA'; diagColor = '#f59e0b'; category = 'Trabajo mixto fuerza' }
    else if (balance <= 110) { diagnostico = 'PERFIL ÓPTIMO'; diagColor = '#22c55e'; category = 'Mantener programa' }
    else if (balance <= 140) { diagnostico = 'DÉFICIT DE VELOCIDAD'; diagColor = '#ef4444'; category = 'Fuerza-velocidad, potencia' }
    else { diagnostico = 'ALTO DÉFICIT DE VELOCIDAD'; diagColor = '#ef4444'; category = 'Trabajo balístico y VBT' }

    return {
      F0, V0, Sfv, Pmax, R2,
      F0_rel, Sfv_rel, Pmax_rel,
      Sfv_opt_rel, F0_opt_rel, V0_opt,
      balance, diagnostico, diagColor, category,
    }
  })()

  const fvSimple = (() => {
    if (mode !== 'velocidad' || puntos.length < 2) return null
    const n = puntos.length
    const sumF = puntos.reduce((a, p) => a + p.carga, 0)
    const sumV = puntos.reduce((a, p) => a + p.vel, 0)
    const sumFV = puntos.reduce((a, p) => a + p.carga * p.vel, 0)
    const sumFF = puntos.reduce((a, p) => a + p.carga * p.carga, 0)
    const denom = n * sumFF - sumF * sumF
    if (Math.abs(denom) < 1e-10) return null
    const slope = (n * sumFV - sumF * sumV) / denom
    const intercept = (sumV - slope * sumF) / n
    const F0 = slope < 0 ? -intercept / slope : null
    const V0 = intercept > 0 ? intercept : null
    const Pmax = F0 && V0 ? (F0 * V0 / 4) : null
    return { slope, intercept, F0, V0, Pmax }
  })()

  const handleAddPunto = async () => {
    const carga = Number(form.carga_kg)
    if (isNaN(carga) || !activeSesion) return
    if (mode === 'salto' && !form.altura_salto_m) return
    if (mode === 'velocidad' && !form.velocidad_ms) return
    setSaving(true)
    await fetch('/api/evaluaciones/pfv', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jugador_id: jugador.id, sesion_id: activeSesion, fecha: form.fecha,
        carga_kg: carga,
        velocidad_ms: mode === 'velocidad' ? Number(form.velocidad_ms) : null,
        altura_salto_m: mode === 'salto' ? Number(form.altura_salto_m) : null,
        notas: form.notas || null,
      }),
    })
    setSaving(false)
    setForm(p => ({ ...p, carga_kg: '', velocidad_ms: '', altura_salto_m: '' }))
    load()
  }

  const handleDeletePunto = async (id: number) => {
    await fetch(`/api/evaluaciones/pfv?id=${id}`, { method: 'DELETE' })
    load()
  }

  const handleCreateSesion = async () => {
    if (!newSesNombre.trim()) return
    setCreatingSes(true)
    const r = await fetch('/api/evaluaciones/pfv/sesion', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugador_id: jugador.id, nombre: newSesNombre.trim() }),
    })
    const d = await r.json()
    setCreatingSes(false); setNewSesNombre('')
    await load()
    if (d.sesion_id) setActiveSesion(d.sesion_id)
  }

  const handleDeleteSesion = async (sesId: number) => {
    if (!confirm('¿Eliminar esta sesión y todos sus puntos?')) return
    setDeletingSes(true)
    await fetch(`/api/evaluaciones/pfv/sesion?id=${sesId}`, { method: 'DELETE' })
    if (activeSesion === sesId) setActiveSesion(null)
    await load()
    setDeletingSes(false)
  }

  // Chart dimensions
  const chartW = 460, chartH = 260, pad = { t: 25, r: 25, b: 45, l: 55 }

  return (
    <Card title="Perfil Fuerza-Velocidad (F-V)" accent="#a3e635">
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {([['salto', '🦘 Protocolo Saltos (CMJ + carga)', 'Mide alturas de salto'], ['velocidad', '🏋️ Protocolo Velocidad (VBT)', 'Mide velocidad propulsiva']] as const).map(([key, label, desc]) => (
          <button className="hover-scale" key={key} onClick={() => setMode(key)} style={{
            flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 12, cursor: 'pointer', textAlign: 'left',
            border: `1px solid ${mode === key ? '#a3e635' : '#334155'}`,
            background: mode === key ? '#a3e63514' : '#0f172a',
            color: mode === key ? '#a3e635' : '#64748b',
          }}>
            <div style={{ fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{desc}</div>
          </button>
        ))}
      </div>

      {mode === 'salto' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <Field label="Masa corporal" value={masaKg} onChange={v => setMasaKg(v)} unit="kg" min="40" max="150" />
          <Field label="Lower limb length" value={lowerLimb} onChange={v => setLowerLimb(v)} unit="m" min="0.5" max="1.2" step="0.01" />
          <Field label="Initial height (Hi)" value={initialHi} onChange={v => setInitialHi(v)} unit="m" min="0.2" max="0.8" step="0.01" />
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>h_po (auto)</div>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 14, color: '#06b6d4', fontWeight: 800 }}>{hPoCalc.toFixed(2)} m</div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Sesiones</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {sesiones.map(s => (
            <div key={s.sesion_id} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button className="hover-scale" onClick={() => setActiveSesion(s.sesion_id)} style={{
                padding: '6px 14px', borderRadius: '8px 0 0 8px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${activeSesion === s.sesion_id ? '#a3e635' : '#334155'}`,
                background: activeSesion === s.sesion_id ? '#a3e63518' : '#1e293b',
                color: activeSesion === s.sesion_id ? '#a3e635' : '#64748b',
              }}>{s.nombre} <span style={{ fontSize: 10, opacity: 0.6 }}>({s.fecha?.split('T')[0]})</span></button>
              <button className="hover-scale" onClick={() => handleDeleteSesion(s.sesion_id)} disabled={deletingSes} style={{
                padding: '6px 8px', borderRadius: '0 8px 8px 0', fontSize: 11, cursor: 'pointer',
                border: `1px solid ${activeSesion === s.sesion_id ? '#a3e635' : '#334155'}`,
                borderLeft: 'none', background: '#1e293b', color: '#ef4444',
              }} title="Eliminar sesión">✕</button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input value={newSesNombre} onChange={e => setNewSesNombre(e.target.value)} placeholder="Nueva sesión..." style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#f1f5f9', outline: 'none', width: 130 }} onKeyDown={e => e.key === 'Enter' && handleCreateSesion()} />
            <Btn onClick={handleCreateSesion} disabled={creatingSes || !newSesNombre.trim()} small>+ Sesión</Btn>
          </div>
        </div>
      </div>

      {activeSesion && (<>
        <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr auto', gap: 10, alignItems: 'end', marginBottom: 20 }}>
          <Field label="Carga adicional" value={form.carga_kg} onChange={v => setForm(p => ({ ...p, carga_kg: v }))} unit="kg" min="0" max="200" />
          {mode === 'salto' ? (
            <Field label="Altura salto" value={form.altura_salto_m} onChange={v => setForm(p => ({ ...p, altura_salto_m: v }))} unit="m" min="0" max="1" step="0.001" />
          ) : (
            <Field label="Velocidad" value={form.velocidad_ms} onChange={v => setForm(p => ({ ...p, velocidad_ms: v }))} unit="m/s" min="0" max="5" step="0.01" />
          )}
          <Field label="Notas" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} type="text" placeholder="Obs..." />
          <Btn onClick={handleAddPunto} disabled={saving || !form.carga_kg || (mode === 'salto' ? !form.altura_salto_m : !form.velocidad_ms)}>+ Punto</Btn>
        </div>

        {/* ── Results cards (jump mode) ── */}
        {mode === 'salto' && fvRegression && (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'F₀ (N/kg)', value: `${fvRegression.F0_rel.toFixed(1)}`, color: '#22c55e' },
              { label: 'V₀ (m/s)', value: `${fvRegression.V0.toFixed(2)}`, color: '#ef4444' },
              { label: 'Pmax (W/kg)', value: `${fvRegression.Pmax_rel.toFixed(1)}`, color: '#3b82f6' },
              { label: 'Balance FV', value: `${fvRegression.balance}%`, color: fvRegression.diagColor },
              { label: 'R²', value: fvRegression.R2.toFixed(3), color: '#f1f5f9' },
            ].map(item => (
              <div key={item.label} style={{ background: '#0f172a', borderRadius: 10, padding: '10px 14px', border: `1px solid ${item.color}33` }}>
                <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Diagnostic banner */}
          <div style={{
            background: `${fvRegression.diagColor}11`, border: `1px solid ${fvRegression.diagColor}44`,
            borderRadius: 10, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 28 }}>{fvRegression.balance >= 90 && fvRegression.balance <= 110 ? '✅' : fvRegression.balance < 90 ? '🏋️' : '⚡'}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: fvRegression.diagColor }}>{fvRegression.diagnostico}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>
                Sfv: {fvRegression.Sfv_rel.toFixed(2)} N·s/m/kg · Sfv_opt: {fvRegression.Sfv_opt_rel.toFixed(2)} N·s/m/kg · Foco: {fvRegression.category}
              </div>
            </div>
          </div>

          {/* Interpretation table */}
          <div style={{ marginBottom: 16, background: '#0f172a', borderRadius: 10, border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #1e293b' }}>Guía de interpretación</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <tbody>
                {[
                  { range: '< 60%', cat: 'Alto déficit fuerza', focus: 'Fuerza máxima', color: '#f59e0b' },
                  { range: '60 – 89%', cat: 'Déficit de fuerza', focus: 'Trabajo mixto fuerza', color: '#f59e0b' },
                  { range: '90 – 110%', cat: 'Bien balanceado', focus: 'Mantener programa', color: '#22c55e' },
                  { range: '111 – 140%', cat: 'Déficit de velocidad', focus: 'Fuerza-velocidad, potencia', color: '#ef4444' },
                  { range: '> 140%', cat: 'Alto déficit velocidad', focus: 'Trabajo balístico y VBT', color: '#ef4444' },
                ].map(r => (
                  <tr key={r.range} style={{ borderBottom: '1px solid #1e293b', background: fvRegression.balance >= (r.range === '< 60%' ? 0 : r.range === '60 – 89%' ? 60 : r.range === '90 – 110%' ? 90 : r.range === '111 – 140%' ? 111 : 141) && fvRegression.balance <= (r.range === '< 60%' ? 59 : r.range === '60 – 89%' ? 89 : r.range === '90 – 110%' ? 110 : r.range === '111 – 140%' ? 140 : 999) ? `${r.color}18` : 'transparent' }}>
                    <td style={{ padding: '6px 14px', color: r.color, fontWeight: 700, width: 80 }}>{r.range}</td>
                    <td style={{ padding: '6px 14px', color: '#94a3b8' }}>{r.cat}</td>
                    <td style={{ padding: '6px 14px', color: '#64748b', fontStyle: 'italic' }}>{r.focus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* F-V Chart with axes in N/kg and m/s */}
          {jumpData.length >= 2 && (() => {
            const fRel = jumpData.map(d => d.f_rel)
            const vMean = jumpData.map(d => d.v_mean)
            const F0_rel = fvRegression.F0_rel
            const V0 = fvRegression.V0
            const F0_opt_rel = fvRegression.F0_opt_rel
            const V0_opt = fvRegression.V0_opt

            const maxV = Math.max(V0, V0_opt, ...vMean) * 1.15
            const maxF = Math.max(F0_rel, F0_opt_rel, ...fRel) * 1.15
            const plotW = chartW - pad.l - pad.r
            const plotH = chartH - pad.t - pad.b
            const toX = (v: number) => pad.l + (v / maxV) * plotW
            const toY = (f: number) => chartH - pad.b - (f / maxF) * plotH

            // Axis tick values
            const vTicks: number[] = []
            const vStep = maxV > 6 ? 2 : maxV > 3 ? 1 : 0.5
            for (let v = 0; v <= maxV; v += vStep) vTicks.push(Math.round(v * 10) / 10)

            const fTicks: number[] = []
            const fStep = maxF > 40 ? 10 : maxF > 20 ? 5 : 2
            for (let f = 0; f <= maxF; f += fStep) fTicks.push(Math.round(f))

            return (
              <div style={{ marginBottom: 20, background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Perfil F-V Vertical</div>
                <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: '100%', maxWidth: chartW, display: 'block' }}>
                  {/* Grid lines */}
                  {vTicks.map(v => (
                    <g key={`gv${v}`}>
                      <line x1={toX(v)} y1={pad.t} x2={toX(v)} y2={chartH - pad.b} stroke="#1e293b" strokeWidth={0.5} />
                      <text x={toX(v)} y={chartH - pad.b + 14} textAnchor="middle" fontSize={9} fill="#475569">{v.toFixed(1)}</text>
                    </g>
                  ))}
                  {fTicks.map(f => (
                    <g key={`gf${f}`}>
                      <line x1={pad.l} y1={toY(f)} x2={chartW - pad.r} y2={toY(f)} stroke="#1e293b" strokeWidth={0.5} />
                      <text x={pad.l - 6} y={toY(f) + 3} textAnchor="end" fontSize={9} fill="#475569">{f}</text>
                    </g>
                  ))}
                  {/* Axes */}
                  <line x1={pad.l} y1={pad.t} x2={pad.l} y2={chartH - pad.b} stroke="#334155" strokeWidth={1} />
                  <line x1={pad.l} y1={chartH - pad.b} x2={chartW - pad.r} y2={chartH - pad.b} stroke="#334155" strokeWidth={1} />
                  <text x={chartW / 2} y={chartH - 4} textAnchor="middle" fontSize={10} fill="#64748b">Velocidad (m/s)</text>
                  <text x={14} y={chartH / 2} textAnchor="middle" fontSize={10} fill="#64748b" transform={`rotate(-90,14,${chartH / 2})`}>Fuerza (N/kg)</text>

                  {/* Optimal slope (green dashed) — from (0, F0_opt_rel) to (V0_opt, 0) */}
                  <line x1={toX(0)} y1={toY(Math.min(F0_opt_rel, maxF))} x2={toX(Math.min(V0_opt, maxV))} y2={toY(0)} stroke="#22c55e" strokeWidth={2} strokeDasharray="6 4" opacity={0.8} />
                  {/* Real slope (blue solid) — from (0, F0_rel) to (V0, 0) */}
                  <line x1={toX(0)} y1={toY(Math.min(F0_rel, maxF))} x2={toX(Math.min(V0, maxV))} y2={toY(0)} stroke="#3b82f6" strokeWidth={2.5} opacity={0.9} />

                  {/* Data points */}
                  {jumpData.map((d, i) => (
                    <g key={i}>
                      <circle cx={toX(d.v_mean)} cy={toY(d.f_rel)} r={5} fill="#3b82f6" stroke="#0f172a" strokeWidth={2} />
                      <text x={toX(d.v_mean)} y={toY(d.f_rel) - 10} textAnchor="middle" fontSize={8} fill="#94a3b8">{d.carga}kg</text>
                    </g>
                  ))}

                  {/* Legend */}
                  <line x1={chartW - 160} y1={pad.t + 4} x2={chartW - 140} y2={pad.t + 4} stroke="#3b82f6" strokeWidth={2.5} />
                  <text x={chartW - 136} y={pad.t + 7} fontSize={9} fill="#3b82f6">Pendiente Actual</text>
                  <line x1={chartW - 160} y1={pad.t + 18} x2={chartW - 140} y2={pad.t + 18} stroke="#22c55e" strokeWidth={2} strokeDasharray="4 3" />
                  <text x={chartW - 136} y={pad.t + 21} fontSize={9} fill="#22c55e">Pendiente Óptima</text>
                </svg>
              </div>
            )
          })()}
        </>)}

        {/* VBT mode results */}
        {mode === 'velocidad' && fvSimple && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'F₀', value: fvSimple.F0 ? `${fvSimple.F0.toFixed(1)} kg` : '—', color: '#22c55e' },
              { label: 'V₀', value: fvSimple.V0 ? `${fvSimple.V0.toFixed(2)} m/s` : '—', color: '#ef4444' },
              { label: 'Pmax', value: fvSimple.Pmax ? `${fvSimple.Pmax.toFixed(1)} W·kg⁻¹` : '—', color: '#3b82f6' },
            ].map(item => (
              <div key={item.label} style={{ background: '#1e293b', borderRadius: 10, padding: '12px 16px', border: `1px solid ${item.color}33` }}>
                <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Data table */}
        {loading ? (
          <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</div>
        ) : puntos.length === 0 ? (
          <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin puntos. Agregá saltos o cargas.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {(mode === 'salto' ? ['Carga', 'Masa Total', 'Altura', 'V media', 'F media', 'F/kg', 'P (W)', 'Notas', ''] : ['Carga (kg)', 'Velocidad (m/s)', 'Notas', '']).map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mode === 'salto' ? jumpData.map((d: any, i: number) => (
                <tr key={d.id || i} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '7px 8px', fontWeight: 700, color: '#a3e635' }}>{d.carga} kg</td>
                  <td style={{ padding: '7px 8px', color: '#94a3b8' }}>{d.masaTotal} kg</td>
                  <td style={{ padding: '7px 8px', fontWeight: 700, color: '#06b6d4' }}>{(Number(d.altura_salto_m) || 0).toFixed(2)} m</td>
                  <td style={{ padding: '7px 8px', color: '#ef4444' }}>{d.v_mean.toFixed(2)} m/s</td>
                  <td style={{ padding: '7px 8px', color: '#f97316', fontWeight: 700 }}>{d.f_media.toFixed(0)} N</td>
                  <td style={{ padding: '7px 8px', color: '#22c55e' }}>{d.f_rel.toFixed(2)}</td>
                  <td style={{ padding: '7px 8px', color: '#3b82f6' }}>{d.p_watt.toFixed(0)}</td>
                  <td style={{ padding: '7px 8px', color: '#64748b' }}>{d.notas ?? '—'}</td>
                  <td style={{ padding: '7px 8px' }}><Btn onClick={() => handleDeletePunto(d.id)} variant="ghost" small>✕</Btn></td>
                </tr>
              )) : puntos.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #0f172a' }}>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#a3e635' }}>{p.carga} kg</td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#ef4444' }}>{p.vel} m/s</td>
                  <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.notas ?? '—'}</td>
                  <td style={{ padding: '8px 10px' }}><Btn onClick={() => handleDeletePunto(p.id)} variant="ghost" small>✕</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </>)}

      {!activeSesion && !loading && (
        <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 30 }}>Creá una sesión para comenzar.</div>
      )}
    </Card>
  )
}

// ─── 6. RSI — Reactive Strength Index ────────────────────────────────────────
function RSIPanel({ jugador }: { jugador: Jugador }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], altura_cm: '', contacto_ms: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/evaluaciones/rsi?jugador_id=${jugador.id}`)
      if (!r.ok) { setHistorial([]); setLoading(false); return }
      const data = await r.json()
      setHistorial(Array.isArray(data) ? data : [])
    } catch { setHistorial([]) }
    setLoading(false)
  }, [jugador.id])

  useEffect(() => { load() }, [load])

  const rsiPreview = form.altura_cm && form.contacto_ms
    ? (Number(form.altura_cm) / 100 / (Number(form.contacto_ms) / 1000)).toFixed(2)
    : null

  const handleAdd = async () => {
    if (!form.altura_cm || !form.contacto_ms) return
    setSaving(true)
    await fetch('/api/evaluaciones/rsi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugador_id: jugador.id, fecha: form.fecha, altura_cm: Number(form.altura_cm), contacto_ms: Number(form.contacto_ms), notas: form.notas || null }),
    })
    setSaving(false)
    setForm(p => ({ ...p, altura_cm: '', contacto_ms: '', notas: '' }))
    load()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/evaluaciones/rsi?id=${id}`, { method: 'DELETE' })
    load()
  }

  const getRSIEstado = (rsi: number): 'verde' | 'amarillo' | 'rojo' =>
    rsi >= 2.5 ? 'verde' : rsi >= 1.5 ? 'amarillo' : 'rojo'

  const baseline = historial.find(r => r.es_baseline)

  return (
    <Card title="RSI — Reactive Strength Index">
      <div style={{ background:'#1e293b', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#64748b', border:'1px solid #334155', lineHeight:1.6 }}>
        📋 <strong style={{ color:'#94a3b8' }}>Cálculo:</strong>{' '}
        RSI = Altura de salto (m) ÷ Tiempo de contacto (s).{' '}
        <strong style={{ color:'#a3e635' }}>≥ 2.5</strong> excelente ·{' '}
        <strong style={{ color:'#facc15' }}>1.5–2.5</strong> normal ·{' '}
        <strong style={{ color:'#ef4444' }}>{'<'} 1.5</strong> mejorable.
        Indica la capacidad reactiva del sistema neuromuscular.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'150px 150px 1fr auto', gap:10, alignItems:'end', marginBottom:8 }}>
        <Field label="Fecha" value={form.fecha} onChange={v=>setForm(p=>({...p,fecha:v}))} type="date" />
        <Field label="Altura salto (cm)" value={form.altura_cm} onChange={v=>setForm(p=>({...p,altura_cm:v}))} unit="cm" min="0" max="100" />
        <Field label="Tiempo contacto (ms)" value={form.contacto_ms} onChange={v=>setForm(p=>({...p,contacto_ms:v}))} unit="ms" min="0" max="600" step="1" />
        <Field label="Notas" value={form.notas} onChange={v=>setForm(p=>({...p,notas:v}))} type="text" placeholder="Obs..." />
      </div>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:20 }}>
        {rsiPreview && (
          <div style={{ fontSize:13, color:'#94a3b8' }}>
            → RSI: <strong style={{ fontSize:20, color:'#a3e635' }}>{rsiPreview}</strong>
          </div>
        )}
        <Btn onClick={handleAdd} disabled={saving||!form.altura_cm||!form.contacto_ms}>+ Registrar</Btn>
      </div>

      {/* Mini sparkline de tendencia */}
      {historial.length >= 3 && (
        <div style={{ background:'#0f172a', borderRadius:10, padding:'12px 16px', marginBottom:16, border:'1px solid #1e293b' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Tendencia RSI</div>
          <svg viewBox="0 0 400 80" style={{ width:'100%', maxWidth:400 }}>
            {(() => {
              const pts = [...historial].reverse().slice(-12)
              const vals = pts.map(r => Number(r.rsi))
              const minV = Math.min(...vals) * 0.9
              const maxV = Math.max(...vals) * 1.1
              const w = 400, h = 60, pL = 10, pR = 10, pT = 5, pB = 15
              const tx = (i:number) => pL + (i/(pts.length-1)) * (w-pL-pR)
              const ty = (v:number) => pT + (1-(v-minV)/(maxV-minV)) * (h-pT-pB)
              const d = pts.map((p,i) => `${i===0?'M':'L'}${tx(i)},${ty(Number(p.rsi))}`).join(' ')
              return (
                <>
                  <path d={d} fill="none" stroke="#a3e635" strokeWidth={2} />
                  {pts.map((p,i) => (
                    <circle key={i} cx={tx(i)} cy={ty(Number(p.rsi))} r={3} fill="#a3e635" />
                  ))}
                  {pts.map((p,i) => (
                    <text key={i} x={tx(i)} y={h} textAnchor="middle" fontSize={7} fill="#475569">{p.fecha?.split('T')[0]?.slice(5)}</text>
                  ))}
                </>
              )
            })()}
          </svg>
        </div>
      )}

      {loading ? (
        <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:20 }}>Cargando...</div>
      ) : historial.length === 0 ? (
        <div style={{ color:'#475569', fontSize:13, textAlign:'center', padding:20 }}>Sin tests registrados.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #1e293b' }}>
              {['Fecha','Altura','T. Contacto','RSI','vs Baseline','Estado','Notas',''].map(h=>(
                <th key={h} style={{ textAlign:'left', padding:'6px 10px', color:'#64748b', fontSize:10, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historial.map((r:any) => {
              const rsi = Number(r.rsi)
              const diff = baseline && !r.es_baseline ? rsi - Number(baseline.rsi) : null
              return (
                <tr key={r.id} style={{ borderBottom:'1px solid #0f172a', background: r.es_baseline ? '#a3e63508' : 'transparent' }}>
                  <td style={{ padding:'8px 10px', color:'#94a3b8', whiteSpace:'nowrap' }}>
                    {r.fecha?.split('T')[0] ?? r.fecha}
                    {r.es_baseline && <span style={{ marginLeft:6, fontSize:10, color:'#a3e635', fontWeight:700 }}>BASE</span>}
                  </td>
                  <td style={{ padding:'8px 10px', color:'#cbd5e1' }}>{r.altura_cm} cm</td>
                  <td style={{ padding:'8px 10px', color:'#cbd5e1' }}>{r.contacto_ms} ms</td>
                  <td style={{ padding:'8px 10px', fontWeight:800, color:'#f1f5f9', fontSize:15 }}>{rsi.toFixed(2)}</td>
                  <td style={{ padding:'8px 10px', fontWeight:600, color: diff === null ? '#475569' : diff >= 0 ? '#22c55e' : '#ef4444' }}>
                    {diff === null ? '—' : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`}
                  </td>
                  <td style={{ padding:'8px 10px' }}><Semaforo estado={getRSIEstado(rsi)} /></td>
                  <td style={{ padding:'8px 10px', color:'#64748b' }}>{r.notas ?? '—'}</td>
                  <td style={{ padding:'8px 10px' }}><Btn onClick={()=>handleDelete(r.id)} variant="ghost" small>✕</Btn></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ─── 7. DSI — Dynamic Strength Index ─────────────────────────────────────────
function DSIPanel({ jugador }: { jugador: Jugador }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], fuerza_balistico_n: '', fuerza_isometrico_n: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/evaluaciones/dsi?jugador_id=${jugador.id}`)
      if (!r.ok) { setHistorial([]); setLoading(false); return }
      const data = await r.json()
      setHistorial(Array.isArray(data) ? data : [])
    } catch { setHistorial([]) }
    setLoading(false)
  }, [jugador.id])

  useEffect(() => { load() }, [load])

  const dsiPreview = form.fuerza_balistico_n && form.fuerza_isometrico_n
    ? (Number(form.fuerza_balistico_n) / Number(form.fuerza_isometrico_n)).toFixed(3)
    : null

  const getDSIEstado = (dsi: number): 'verde' | 'amarillo' | 'rojo' => {
    // DSI: <0.6 → déficit balístico (necesita potencia), 0.6–0.8 → zona mixta, >0.8 → déficit isométrico (necesita fuerza máxima)
    if (dsi >= 0.6 && dsi <= 0.8) return 'verde'
    return 'amarillo'
  }

  const getDSIInterpretacion = (dsi: number) => {
    if (dsi < 0.6) return { texto: 'Priorizar trabajo de potencia/velocidad', color: '#60a5fa' }
    if (dsi <= 0.8) return { texto: 'Perfil equilibrado — mantener', color: '#22c55e' }
    return { texto: 'Priorizar trabajo de fuerza máxima', color: '#f59e0b' }
  }

  const handleAdd = async () => {
    if (!form.fuerza_balistico_n || !form.fuerza_isometrico_n) return
    setSaving(true)
    await fetch('/api/evaluaciones/dsi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugador_id: jugador.id, fecha: form.fecha, fuerza_balistico_n: Number(form.fuerza_balistico_n), fuerza_isometrico_n: Number(form.fuerza_isometrico_n), notas: form.notas || null }),
    })
    setSaving(false)
    setForm(p => ({ ...p, fuerza_balistico_n: '', fuerza_isometrico_n: '', notas: '' }))
    load()
  }

  const handleDelete = async (id: number) => {
    await fetch(`/api/evaluaciones/dsi?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <Card title="DSI — Dynamic Strength Index">
      <div style={{ background:'#1e293b', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#64748b', border:'1px solid #334155', lineHeight:1.6 }}>
        📋 <strong style={{ color:'#94a3b8' }}>Cálculo:</strong>{' '}
        DSI = Fuerza pico balística (N) ÷ Fuerza pico isométrica (N).{' '}
        <strong style={{ color:'#60a5fa' }}>{'<'} 0.6</strong> → entrenar potencia ·{' '}
        <strong style={{ color:'#22c55e' }}>0.6 – 0.8</strong> → perfil equilibrado ·{' '}
        <strong style={{ color:'#f59e0b' }}>{'>'} 0.8</strong> → entrenar fuerza máxima.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'180px 180px 1fr auto', gap:10, alignItems:'end', marginBottom:8 }}>
        <Field label="Fecha" value={form.fecha} onChange={v=>setForm(p=>({...p,fecha:v}))} type="date" />
        <Field label="F. Pico Balístico (N)" value={form.fuerza_balistico_n} onChange={v=>setForm(p=>({...p,fuerza_balistico_n:v}))} unit="N" min="0" max="5000" step="1" />
        <Field label="F. Pico Isométrico (N)" value={form.fuerza_isometrico_n} onChange={v=>setForm(p=>({...p,fuerza_isometrico_n:v}))} unit="N" min="0" max="5000" step="1" />
        <Field label="Notas" value={form.notas} onChange={v=>setForm(p=>({...p,notas:v}))} type="text" placeholder="Obs..." />
      </div>
      <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:20 }}>
        {dsiPreview && (() => {
          const dsi = Number(dsiPreview)
          const interp = getDSIInterpretacion(dsi)
          return (
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <span style={{ fontSize:13, color:'#94a3b8' }}>→ DSI: <strong style={{ fontSize:20, color:'#f1f5f9' }}>{dsiPreview}</strong></span>
              <span style={{ fontSize:12, color:interp.color, fontWeight:600 }}>→ {interp.texto}</span>
            </div>
          )
        })()}
        <Btn onClick={handleAdd} disabled={saving||!form.fuerza_balistico_n||!form.fuerza_isometrico_n}>+ Registrar</Btn>
      </div>

      {loading ? (
        <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:20 }}>Cargando...</div>
      ) : historial.length === 0 ? (
        <div style={{ color:'#475569', fontSize:13, textAlign:'center', padding:20 }}>Sin tests registrados.</div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #1e293b' }}>
              {['Fecha','F. Balística','F. Isométrica','DSI','Interpretación','Notas',''].map(h=>(
                <th key={h} style={{ textAlign:'left', padding:'6px 10px', color:'#64748b', fontSize:10, fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historial.map((r:any) => {
              const dsi = Number(r.dsi)
              const interp = getDSIInterpretacion(dsi)
              return (
                <tr key={r.id} style={{ borderBottom:'1px solid #0f172a' }}>
                  <td style={{ padding:'8px 10px', color:'#94a3b8' }}>{r.fecha?.split('T')[0] ?? r.fecha}</td>
                  <td style={{ padding:'8px 10px', color:'#60a5fa', fontWeight:600 }}>{r.fuerza_balistico_n} N</td>
                  <td style={{ padding:'8px 10px', color:'#f472b6', fontWeight:600 }}>{r.fuerza_isometrico_n} N</td>
                  <td style={{ padding:'8px 10px', fontWeight:800, color:'#f1f5f9', fontSize:15 }}>{dsi.toFixed(3)}</td>
                  <td style={{ padding:'8px 10px', fontSize:11, color:interp.color, fontWeight:600 }}>{interp.texto}</td>
                  <td style={{ padding:'8px 10px', color:'#64748b' }}>{r.notas ?? '—'}</td>
                  <td style={{ padding:'8px 10px' }}><Btn onClick={()=>handleDelete(r.id)} variant="ghost" small>✕</Btn></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Card>
  )
}

// ─── Panel principal de Evaluaciones ─────────────────────────────────────────
interface TeamPlayer {
  jugador_id: number
  id?: number
  nombre: string
  posicion?: string
  [key: string]: any
}

export default function EvaluacionesPanel({ teamData }: { teamData: TeamPlayer[] }) {
  const [selectedJugadorId, setSelectedJugadorId] = useState<number | null>(
    teamData.length > 0 ? (teamData[0].jugador_id ?? teamData[0].id ?? null) : null
  )
  const [activeTest, setActiveTest] = useState<TestKey>('todos')
  const [jugadorData, setJugadorData] = useState<Jugador | null>(null)
  const [loadingJugador, setLoadingJugador] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [posFilter, setPosFilter] = useState<string>('todas')
  const [dashData, setDashData] = useState<any>(null)
  const [dashLoading, setDashLoading] = useState(false)

  const loadJugador = useCallback(async (id: number) => {
    setLoadingJugador(true)
    try {
      const r = await fetch(`/api/evaluaciones/variables?jugador_id=${id}`)
      if (!r.ok) { setJugadorData(null); setLoadingJugador(false); return }
      setJugadorData(await r.json())
    } catch { setJugadorData(null) }
    setLoadingJugador(false)
  }, [])

  useEffect(() => {
    if (selectedJugadorId && activeTest !== 'todos') loadJugador(selectedJugadorId)
  }, [selectedJugadorId, refreshKey, loadJugador, activeTest])

  useEffect(() => {
    if (activeTest !== 'todos') return
    setDashLoading(true)
    fetch('/api/evaluaciones/antropometria?all=true')
      .then(r => r.ok ? r.json() : [])
      .then(antro => setDashData({ antro }))
      .catch(() => {})
      .finally(() => setDashLoading(false))
  }, [activeTest, refreshKey])

  const MENU: { key: TestKey; label: string; icon: string; desc: string }[] = [
    { key: 'todos',         label: 'Todos',          icon: '👥', desc: 'Dashboard equipo' },
    { key: 'variables',     label: 'Variables',      icon: '📊', desc: 'Datos antropométricos' },
    { key: 'antropometria', label: 'Comp. Corporal', icon: '📐', desc: 'Faulkner 4 pliegues' },
    { key: 'pesajes',       label: 'Pesajes',        icon: '⚖️', desc: 'Historial vs ideal' },
    { key: 'hidratacion',   label: 'Hidratación',    icon: '💧', desc: 'Calculadora reposición' },
    { key: 'cmj',           label: 'CMJ',            icon: '🦘', desc: 'Salto + índice fatiga' },
    { key: 'isometrico',    label: 'Isométrico',     icon: '💪', desc: 'Asimetría bilateral' },
  ]

  const ADVANCED: { key: TestKey; label: string; icon: string; desc: string }[] = [
    { key: 'pfv', label: 'Perfil F-V', icon: '📈', desc: 'Fuerza-Velocidad' },
    { key: 'rsi', label: 'RSI',        icon: '⚡', desc: 'Reactive Strength' },
    { key: 'dsi', label: 'DSI',        icon: '🎯', desc: 'Dynamic Strength' },
  ]

  const POS_GROUPS: { label: string; match: (p: string) => boolean }[] = [
    { label: 'Porteros',        match: p => /portero|arquero/i.test(p) },
    { label: 'Defensas',        match: p => /central|lateral|defen/i.test(p) },
    { label: 'Mediocampistas',  match: p => /medioc|volante/i.test(p) },
    { label: 'Extremos',        match: p => /extremo/i.test(p) },
    { label: 'Delanteros',      match: p => /delant|centro del/i.test(p) },
  ]

  const posColor = (pos: string) => {
    const p = (pos || '').toLowerCase()
    if (/portero|arquero/.test(p)) return '#22c55e'
    if (/central|lateral|defen/.test(p)) return '#3b82f6'
    if (/medioc|volante/.test(p)) return '#a78bfa'
    if (/extremo/.test(p)) return '#ec4899'
    if (/delant/.test(p)) return '#ef4444'
    return '#64748b'
  }

  if (teamData.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Sin jugadores.</div>
  }

  const filteredTeam = posFilter === 'todas'
    ? teamData
    : teamData.filter(j => POS_GROUPS.find(g => g.label === posFilter)?.match(j.posicion || '') ?? false)

  const clasificacion = (pct: number) =>
    pct <= 10.5 ? { label: 'Élite', color: '#22c55e', icon: '🟢' }
    : pct <= 13 ? { label: 'Aceptable', color: '#f59e0b', icon: '🟡' }
    : { label: 'Exceso', color: '#ef4444', icon: '🔴' }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>📋 Evaluaciones & Tests</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Tests físicos · Comp. Corporal, Pesajes, CMJ, Isométricos, F-V, RSI, DSI</p>
      </div>

      {/* Menú de tests */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Tests disponibles</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {MENU.map(m => (
            <button className="hover-scale" key={m.key} onClick={() => setActiveTest(m.key)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', borderRadius: 10, fontSize: 13,
              border: `1px solid ${activeTest === m.key ? '#a3e635' : '#1e293b'}`,
              background: activeTest === m.key ? '#a3e63514' : '#0f172a',
              color: activeTest === m.key ? '#a3e635' : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s', minWidth: 110,
            }}>
              <span style={{ fontSize: 18, marginBottom: 2 }}>{m.icon}</span>
              <span style={{ fontWeight: 700 }}>{m.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{m.desc}</span>
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#a3e635', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Calculadoras avanzadas</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ADVANCED.map(m => (
            <button className="hover-scale" key={m.key} onClick={() => setActiveTest(m.key)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', borderRadius: 10, fontSize: 13,
              border: `1px solid ${activeTest === m.key ? '#a3e635' : '#334155'}`,
              background: activeTest === m.key ? '#a3e63514' : '#0f172a',
              color: activeTest === m.key ? '#a3e635' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.15s', minWidth: 110,
            }}>
              <span style={{ fontSize: 18, marginBottom: 2 }}>{m.icon}</span>
              <span style={{ fontWeight: 700 }}>{m.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ TODOS — Dashboard ═══════ */}
      {activeTest === 'todos' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Filtrar por posición</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className="hover-scale" onClick={() => setPosFilter('todas')} style={{
                padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${posFilter === 'todas' ? '#a3e635' : '#334155'}`,
                background: posFilter === 'todas' ? '#a3e63518' : '#0f172a',
                color: posFilter === 'todas' ? '#a3e635' : '#64748b',
              }}>Todos ({teamData.length})</button>
              {POS_GROUPS.map(g => {
                const count = teamData.filter(j => g.match(j.posicion || '')).length
                if (count === 0) return null
                return (
                  <button className="hover-scale" key={g.label} onClick={() => setPosFilter(g.label)} style={{
                    padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${posFilter === g.label ? '#a3e635' : '#334155'}`,
                    background: posFilter === g.label ? '#a3e63518' : '#0f172a',
                    color: posFilter === g.label ? '#a3e635' : '#94a3b8',
                  }}>{g.label} ({count})</button>
                )
              })}
            </div>
          </div>

          {dashLoading ? (
            <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 40 }}>Cargando datos del equipo...</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155' }}>
                    {['Jugador', 'Posición', 'Peso', '% Grasa', 'Clasif.', 'M. Magra', 'Σ4 Pliegues', 'Última medición'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTeam.map(j => {
                    const jid = j.jugador_id ?? j.id
                    const antro = (dashData?.antro || []).find((a: any) => a.jugador_id === jid)
                    const pctG = antro ? Number(antro.pct_grasa) : null
                    const cl = pctG !== null ? clasificacion(pctG) : null
                    return (
                      <tr key={jid} style={{ borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
                        onClick={() => { setSelectedJugadorId(jid); setActiveTest('antropometria'); setJugadorData(null) }}>
                        <td style={{ padding: '10px 10px', color: '#f1f5f9', fontWeight: 600 }}>{j.nombre}</td>
                        <td style={{ padding: '10px 10px' }}><span style={{ fontSize: 11, color: posColor(j.posicion || ''), fontWeight: 600 }}>{j.posicion || '—'}</span></td>
                        <td style={{ padding: '10px 10px', color: antro ? '#f1f5f9' : '#475569' }}>{antro ? `${antro.peso_kg} kg` : '—'}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 800, fontSize: 14, color: cl?.color || '#475569' }}>{pctG !== null ? `${pctG.toFixed(1)}%` : '—'}</td>
                        <td style={{ padding: '10px 10px' }}>{cl ? <span style={{ fontSize: 11, color: cl.color, fontWeight: 600 }}>{cl.icon} {cl.label}</span> : <span style={{ color: '#475569' }}>—</span>}</td>
                        <td style={{ padding: '10px 10px', color: antro ? '#22c55e' : '#475569' }}>{antro ? `${Number(antro.masa_magra_kg).toFixed(1)} kg` : '—'}</td>
                        <td style={{ padding: '10px 10px', color: antro ? '#06b6d4' : '#475569' }}>{antro ? `${antro.sum_4_pliegues} mm` : '—'}</td>
                        <td style={{ padding: '10px 10px', color: '#64748b', fontSize: 11 }}>{antro ? (antro.fecha?.split('T')[0] ?? antro.fecha) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredTeam.length === 0 && <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 30 }}>No hay jugadores en esta posición.</div>}
            </div>
          )}
        </div>
      )}

      {/* ═══════ Individual player view ═══════ */}
      {activeTest !== 'todos' && (<>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Jugador</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {teamData.map(j => (
              <button className="hover-scale" key={j.jugador_id ?? j.id} onClick={() => { setSelectedJugadorId(j.jugador_id ?? j.id); setJugadorData(null) }} style={{
                padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                border: `1px solid ${selectedJugadorId === (j.jugador_id ?? j.id) ? '#a3e635' : '#1e293b'}`,
                background: selectedJugadorId === (j.jugador_id ?? j.id) ? '#a3e63518' : '#0f172a',
                color: selectedJugadorId === (j.jugador_id ?? j.id) ? '#a3e635' : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>{j.nombre}{j.posicion && <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 11 }}>{j.posicion}</span>}</button>
            ))}
          </div>
        </div>

        {loadingJugador ? (
          <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 40 }}>Cargando jugador...</div>
        ) : !jugadorData ? (
          <div style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: 40 }}>Seleccioná un jugador.</div>
        ) : (
          <>
            {activeTest === 'variables'     && <VariablesPanel     jugador={jugadorData} onRefresh={() => setRefreshKey(k => k + 1)} />}
            {activeTest === 'antropometria'  && <AntropometriaPanel jugador={jugadorData} />}
            {activeTest === 'pesajes'        && <PesajesPanel       jugador={jugadorData} onRefresh={() => setRefreshKey(k => k + 1)} />}
            {activeTest === 'hidratacion'    && <HidratacionPanel    jugador={jugadorData} />}
            {activeTest === 'cmj'            && <CMJPanel           jugador={jugadorData} />}
            {activeTest === 'isometrico'     && <IsometricoPanel    jugador={jugadorData} />}
            {activeTest === 'pfv'            && <PFVPanel           jugador={jugadorData} />}
            {activeTest === 'rsi'            && <RSIPanel           jugador={jugadorData} />}
            {activeTest === 'dsi'            && <DSIPanel           jugador={jugadorData} />}
          </>
        )}
      </>)}
    </div>
  )
}
