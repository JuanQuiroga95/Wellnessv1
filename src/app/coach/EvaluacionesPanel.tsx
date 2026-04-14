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

type TestKey = 'variables' | 'pesajes' | 'cmj' | 'isometrico' | 'pfv' | 'rsi' | 'dsi'

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
    <button
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

// ─── 2. Pesajes ───────────────────────────────────────────────────────────────
function PesajesPanel({ jugador, onRefresh }: { jugador: Jugador; onRefresh?: () => void }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [form, setForm] = useState({ fecha: localToday(), peso_kg: '', notas: '' })
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
  const [form, setForm] = useState({ fecha: localToday(), s1: '', s2: '', s3: '', notas: '' })
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
    fecha: localToday(),
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
          <button key={g} onClick={() => setGrupo(g)} style={{
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

// ─── 5. Perfil Fuerza-Velocidad (PFV) ────────────────────────────────────────
function PFVPanel({ jugador }: { jugador: Jugador }) {
  const [sesiones, setSesiones] = useState<any[]>([])
  const [activeSesion, setActiveSesion] = useState<number | null>(null)
  const [form, setForm] = useState({ fecha: localToday(), carga_kg: '', velocidad_ms: '', notas: '' })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newSesNombre, setNewSesNombre] = useState('')
  const [creatingSes, setCreatingSes] = useState(false)

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
  const puntos: {carga: number, vel: number}[] = sesActual?.puntos ?? []

  // Calcular regresión lineal F-V
  const fvResult = (() => {
    if (puntos.length < 2) return null
    const n = puntos.length
    const sumF = puntos.reduce((a,p) => a + p.carga, 0)
    const sumV = puntos.reduce((a,p) => a + p.vel, 0)
    const sumFV = puntos.reduce((a,p) => a + p.carga * p.vel, 0)
    const sumFF = puntos.reduce((a,p) => a + p.carga * p.carga, 0)
    const slope = (n * sumFV - sumF * sumV) / (n * sumFF - sumF * sumF)
    const intercept = (sumV - slope * sumF) / n
    // F0 = velocidad 0 → F0 = -intercept/slope
    const F0 = slope < 0 ? -intercept / slope : null
    // V0 = fuerza 0 → V0 = intercept
    const V0 = intercept > 0 ? intercept : null
    // Pmax = F0 * V0 / 4
    const Pmax = F0 && V0 ? (F0 * V0 / 4) : null
    return { slope, intercept, F0, V0, Pmax }
  })()

  const handleAddPunto = async () => {
    if (!form.carga_kg || !form.velocidad_ms || !activeSesion) return
    setSaving(true)
    await fetch('/api/evaluaciones/pfv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugador_id: jugador.id, sesion_id: activeSesion, fecha: form.fecha, carga_kg: Number(form.carga_kg), velocidad_ms: Number(form.velocidad_ms), notas: form.notas || null }),
    })
    setSaving(false)
    setForm(p => ({ ...p, carga_kg: '', velocidad_ms: '' }))
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jugador_id: jugador.id, nombre: newSesNombre.trim() }),
    })
    const d = await r.json()
    setCreatingSes(false)
    setNewSesNombre('')
    await load()
    if (d.sesion_id) setActiveSesion(d.sesion_id)
  }

  // SVG chart
  const chartW = 420, chartH = 200, pad = { t:20, r:20, b:40, l:50 }
  const maxF = puntos.length ? Math.max(...puntos.map(p=>p.carga)) * 1.1 : 100
  const maxV = puntos.length ? Math.max(...puntos.map(p=>p.vel)) * 1.2 : 3
  const toX = (f: number) => pad.l + (f / maxF) * (chartW - pad.l - pad.r)
  const toY = (v: number) => chartH - pad.b - (v / maxV) * (chartH - pad.t - pad.b)

  return (
    <Card title="Perfil Fuerza-Velocidad (F-V)">
      <div style={{ background:'#1e293b', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'#64748b', border:'1px solid #334155', lineHeight:1.6 }}>
        📋 <strong style={{ color:'#94a3b8' }}>Protocolo:</strong> Registrá múltiples cargas (kg) con su velocidad media propulsiva (m/s) en una sesión.
        Se calcula automáticamente <strong style={{ color:'#a3e635' }}>F₀</strong> (fuerza teórica máxima),{' '}
        <strong style={{ color:'#60a5fa' }}>V₀</strong> (velocidad máxima) y{' '}
        <strong style={{ color:'#f59e0b' }}>Pmax</strong> (potencia mecánica máxima).
      </div>

      {/* Selector de sesiones */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Sesiones</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
          {sesiones.map(s => (
            <button key={s.sesion_id} onClick={()=>setActiveSesion(s.sesion_id)} style={{
              padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s',
              border:`1px solid ${activeSesion===s.sesion_id?'#a3e635':'#334155'}`,
              background: activeSesion===s.sesion_id ? '#a3e63518' : '#1e293b',
              color: activeSesion===s.sesion_id ? '#a3e635' : '#64748b',
            }}>{s.nombre}</button>
          ))}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input value={newSesNombre} onChange={e=>setNewSesNombre(e.target.value)} placeholder="Nueva sesión..." style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:8, padding:'6px 10px', fontSize:12, color:'#f1f5f9', outline:'none', width:130 }} onKeyDown={e=>e.key==='Enter'&&handleCreateSesion()} />
            <Btn onClick={handleCreateSesion} disabled={creatingSes||!newSesNombre.trim()} small>+ Sesión</Btn>
          </div>
        </div>
      </div>

      {activeSesion && (
        <>
          {/* Formulario de punto */}
          <div style={{ display:'grid', gridTemplateColumns:'140px 140px 1fr auto', gap:10, alignItems:'end', marginBottom:20 }}>
            <Field label="Carga (kg)" value={form.carga_kg} onChange={v=>setForm(p=>({...p,carga_kg:v}))} unit="kg" min="0" max="500" />
            <Field label="Velocidad (m/s)" value={form.velocidad_ms} onChange={v=>setForm(p=>({...p,velocidad_ms:v}))} unit="m/s" min="0" max="5" step="0.01" />
            <Field label="Notas" value={form.notas} onChange={v=>setForm(p=>({...p,notas:v}))} type="text" placeholder="Observaciones..." />
            <Btn onClick={handleAddPunto} disabled={saving||!form.carga_kg||!form.velocidad_ms}>+ Punto</Btn>
          </div>

          {/* Resultados F-V */}
          {fvResult && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[
                { label:'F₀ — Fuerza teórica máx.', value: fvResult.F0 ? `${fvResult.F0.toFixed(1)} kg` : '—', color:'#a3e635' },
                { label:'V₀ — Velocidad teórica máx.', value: fvResult.V0 ? `${fvResult.V0.toFixed(2)} m/s` : '—', color:'#60a5fa' },
                { label:'Pmax — Potencia mecánica', value: fvResult.Pmax ? `${fvResult.Pmax.toFixed(1)} W·kg⁻¹` : '—', color:'#f59e0b' },
              ].map(item => (
                <div key={item.label} style={{ background:'#1e293b', borderRadius:10, padding:'12px 16px', border:`1px solid ${item.color}33` }}>
                  <div style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{item.label}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Gráfico F-V */}
          {puntos.length >= 2 && fvResult && (
            <div style={{ marginBottom:20, background:'#0f172a', borderRadius:12, padding:'16px', border:'1px solid #1e293b' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>Curva F-V</div>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width:'100%', maxWidth:chartW, display:'block' }}>
                {/* Ejes */}
                <line x1={pad.l} y1={pad.t} x2={pad.l} y2={chartH-pad.b} stroke="#334155" strokeWidth={1} />
                <line x1={pad.l} y1={chartH-pad.b} x2={chartW-pad.r} y2={chartH-pad.b} stroke="#334155" strokeWidth={1} />
                {/* Labels ejes */}
                <text x={pad.l-8} y={chartH-pad.b+4} textAnchor="end" fontSize={9} fill="#475569">0</text>
                <text x={chartW/2} y={chartH-4} textAnchor="middle" fontSize={9} fill="#475569">Fuerza (kg)</text>
                <text x={12} y={chartH/2} textAnchor="middle" fontSize={9} fill="#475569" transform={`rotate(-90,12,${chartH/2})`}>Vel (m/s)</text>
                {/* Línea de regresión */}
                {(() => {
                  const x1 = 0, y1 = fvResult.intercept + fvResult.slope * x1
                  const xMax = fvResult.F0 ? Math.min(fvResult.F0, maxF) : maxF
                  const y2 = fvResult.intercept + fvResult.slope * xMax
                  return <line x1={toX(x1)} y1={toY(Math.max(y1,0))} x2={toX(xMax)} y2={toY(Math.max(y2,0))} stroke="#a3e635" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                })()}
                {/* Puntos */}
                {puntos.map((p,i) => (
                  <circle key={i} cx={toX(p.carga)} cy={toY(p.vel)} r={5} fill="#60a5fa" stroke="#0f172a" strokeWidth={1.5} />
                ))}
              </svg>
            </div>
          )}

          {/* Tabla de puntos */}
          {loading ? (
            <div style={{ color:'#64748b', fontSize:13, textAlign:'center', padding:20 }}>Cargando...</div>
          ) : puntos.length === 0 ? (
            <div style={{ color:'#475569', fontSize:13, textAlign:'center', padding:20 }}>Sin puntos. Agregá cargas y velocidades.</div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #1e293b' }}>
                  {['Carga (kg)', 'Velocidad (m/s)', 'Notas', ''].map(h=>(
                    <th key={h} style={{ textAlign:'left', padding:'6px 10px', color:'#64748b', fontSize:10, fontWeight:700, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {puntos.map((p:any) => (
                  <tr key={p.id} style={{ borderBottom:'1px solid #0f172a' }}>
                    <td style={{ padding:'8px 10px', fontWeight:700, color:'#a3e635' }}>{p.carga} kg</td>
                    <td style={{ padding:'8px 10px', fontWeight:700, color:'#60a5fa' }}>{p.vel} m/s</td>
                    <td style={{ padding:'8px 10px', color:'#64748b' }}>{p.notas ?? '—'}</td>
                    <td style={{ padding:'8px 10px' }}><Btn onClick={()=>handleDeletePunto(p.id)} variant="ghost" small>✕</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {!activeSesion && !loading && (
        <div style={{ color:'#475569', fontSize:13, textAlign:'center', padding:30 }}>Creá una sesión para comenzar.</div>
      )}
    </Card>
  )
}

// ─── 6. RSI — Reactive Strength Index ────────────────────────────────────────
function RSIPanel({ jugador }: { jugador: Jugador }) {
  const [historial, setHistorial] = useState<any[]>([])
  const [form, setForm] = useState({ fecha: localToday(), altura_cm: '', contacto_ms: '', notas: '' })
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
  const [form, setForm] = useState({ fecha: localToday(), fuerza_balistico_n: '', fuerza_isometrico_n: '', notas: '' })
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


function localToday(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export default function EvaluacionesPanel({ teamData }: { teamData: TeamPlayer[] }) {
  const [selectedJugadorId, setSelectedJugadorId] = useState<number | null>(
    teamData.length > 0 ? (teamData[0].jugador_id ?? teamData[0].id ?? null) : null
  )
  const [activeTest, setActiveTest] = useState<TestKey>('variables')
  const [jugadorData, setJugadorData] = useState<Jugador | null>(null)
  const [loadingJugador, setLoadingJugador] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadJugador = useCallback(async (id: number) => {
    setLoadingJugador(true)
    try {
      const r = await fetch(`/api/evaluaciones/variables?jugador_id=${id}`)
      if (!r.ok) { setJugadorData(null); setLoadingJugador(false); return }
      const data = await r.json()
      setJugadorData(data)
    } catch {
      setJugadorData(null)
    }
    setLoadingJugador(false)
  }, [])

  useEffect(() => {
    if (selectedJugadorId) loadJugador(selectedJugadorId)
  }, [selectedJugadorId, refreshKey, loadJugador])

  const MENU: { key: TestKey; label: string; icon: string; desc: string }[] = [
    { key: 'variables',  label: 'Variables',   icon: '📊', desc: 'Datos antropométricos' },
    { key: 'pesajes',    label: 'Pesajes',      icon: '⚖️', desc: 'Historial vs ideal' },
    { key: 'cmj',        label: 'CMJ',          icon: '🦘', desc: 'Salto + índice fatiga' },
    { key: 'isometrico', label: 'Isométrico',   icon: '💪', desc: 'Asimetría bilateral' },
  ]

  const ADVANCED: { key: TestKey; label: string; icon: string; desc: string }[] = [
    { key: 'pfv', label: 'Perfil F-V', icon: '📈', desc: 'Fuerza-Velocidad' },
    { key: 'rsi', label: 'RSI',        icon: '⚡', desc: 'Reactive Strength' },
    { key: 'dsi', label: 'DSI',        icon: '🎯', desc: 'Dynamic Strength' },
  ]

  if (teamData.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
        Sin jugadores. Creá uno en "Jugadores".
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
          📋 Evaluaciones & Tests
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
          Tests físicos · Variables, Pesajes, CMJ, Isométricos, Perfil F-V, RSI, DSI
        </p>
      </div>

      {/* Selector de jugador */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Jugador
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {teamData.map(j => (
            <button
              key={j.jugador_id ?? j.id}
              onClick={() => { setSelectedJugadorId(j.jugador_id ?? j.id); setJugadorData(null) }}
              style={{
                padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                border: `1px solid ${selectedJugadorId === (j.jugador_id ?? j.id) ? '#a3e635' : '#1e293b'}`,
                background: selectedJugadorId === (j.jugador_id ?? j.id) ? '#a3e63518' : '#0f172a',
                color: selectedJugadorId === (j.jugador_id ?? j.id) ? '#a3e635' : '#64748b',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {j.nombre}
              {j.posicion && <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 11 }}>{j.posicion}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Menú de tests */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Tests disponibles
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {MENU.map(m => (
            <button key={m.key} onClick={() => setActiveTest(m.key)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', borderRadius: 10, fontSize: 13,
              border: `1px solid ${activeTest === m.key ? '#a3e635' : '#1e293b'}`,
              background: activeTest === m.key ? '#a3e63514' : '#0f172a',
              color: activeTest === m.key ? '#a3e635' : '#64748b',
              cursor: 'pointer', transition: 'all 0.15s', minWidth: 120,
            }}>
              <span style={{ fontSize: 18, marginBottom: 2 }}>{m.icon}</span>
              <span style={{ fontWeight: 700 }}>{m.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{m.desc}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 10, fontWeight: 700, color: '#a3e635', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Calculadoras avanzadas
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ADVANCED.map(m => (
            <button key={m.key} onClick={() => setActiveTest(m.key)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', borderRadius: 10, fontSize: 13,
              border: `1px solid ${activeTest === m.key ? '#a3e635' : '#334155'}`,
              background: activeTest === m.key ? '#a3e63514' : '#0f172a',
              color: activeTest === m.key ? '#a3e635' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.15s', minWidth: 120,
            }}>
              <span style={{ fontSize: 18, marginBottom: 2 }}>{m.icon}</span>
              <span style={{ fontWeight: 700 }}>{m.label}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{m.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido dinámico */}
      {loadingJugador ? (
        <div style={{ color: '#64748b', fontSize: 14, textAlign: 'center', padding: 40 }}>Cargando jugador...</div>
      ) : !jugadorData ? (
        <div style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: 40 }}>Seleccioná un jugador.</div>
      ) : (
        <>
          {activeTest === 'variables'  && <VariablesPanel  jugador={jugadorData} onRefresh={() => setRefreshKey(k => k + 1)} />}
          {activeTest === 'pesajes'    && <PesajesPanel    jugador={jugadorData} onRefresh={() => setRefreshKey(k => k + 1)} />}
          {activeTest === 'cmj'        && <CMJPanel        jugador={jugadorData} />}
          {activeTest === 'isometrico' && <IsometricoPanel jugador={jugadorData} />}
          {activeTest === 'pfv'        && <PFVPanel        jugador={jugadorData} />}
          {activeTest === 'rsi'        && <RSIPanel        jugador={jugadorData} />}
          {activeTest === 'dsi'        && <DSIPanel        jugador={jugadorData} />}
        </>
      )}
    </div>
  )
}
