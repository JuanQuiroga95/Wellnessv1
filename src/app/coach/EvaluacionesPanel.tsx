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

type TestKey = 'variables' | 'pesajes' | 'cmj' | 'isometrico'

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
function PesajesPanel({ jugador }: { jugador: Jugador }) {
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
          <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>Provisto por nutricionista</span>
        </div>
      ) : (
        <div style={{
          background: '#1e293b', borderRadius: 10, padding: '10px 14px', marginBottom: 16,
          border: '1px dashed #334155', fontSize: 12, color: '#475569',
        }}>
          ⚠️ Sin rango de peso ideal definido — la nutricionista debe configurarlo en el perfil del jugador.
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

  const promPreview = [form.s1, form.s2, form.s3].every(Boolean)
    ? ((Number(form.s1) + Number(form.s2) + Number(form.s3)) / 3).toFixed(2)
    : null

  const handleAdd = async () => {
    if (!form.s1 || !form.s2 || !form.s3) return
    setSaving(true)
    await fetch('/api/evaluaciones/cmj', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jugador_id: jugador.id, fecha: form.fecha,
        salto1_cm: Number(form.s1), salto2_cm: Number(form.s2), salto3_cm: Number(form.s3),
        notas: form.notas || null,
      }),
    })
    setSaving(false)
    setForm(p => ({ ...p, s1: '', s2: '', s3: '', notas: '' }))
    load()
  }

  const handleSetBaseline = async (id: number) => {
    await fetch('/api/evaluaciones/cmj', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, jugador_id: jugador.id }),
    })
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
      <div style={{
        background: '#1e293b', borderRadius: 10, padding: '10px 14px',
        marginBottom: 16, fontSize: 12, color: '#64748b', border: '1px solid #334155', lineHeight: 1.6,
      }}>
        📋 <strong style={{ color: '#94a3b8' }}>Protocolo:</strong> 3 saltos máximos. El primer test se guarda automáticamente como{' '}
        <strong style={{ color: '#a3e635' }}>baseline</strong>.
        Se marca <strong style={{ color: '#ef4444' }}>fatiga</strong> si la pérdida vs baseline supera el <strong>10%</strong>.
        Podés cambiar el baseline manualmente con ⚑.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '160px repeat(3, 100px) 1fr auto', gap: 10, alignItems: 'end', marginBottom: 8 }}>
        <Field label="Fecha" value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} type="date" />
        <Field label="Salto 1" value={form.s1} onChange={v => setForm(p => ({ ...p, s1: v }))} unit="cm" min="0" max="100" />
        <Field label="Salto 2" value={form.s2} onChange={v => setForm(p => ({ ...p, s2: v }))} unit="cm" min="0" max="100" />
        <Field label="Salto 3" value={form.s3} onChange={v => setForm(p => ({ ...p, s3: v }))} unit="cm" min="0" max="100" />
        <Field label="Notas" value={form.notas} onChange={v => setForm(p => ({ ...p, notas: v }))} type="text" placeholder="Observaciones..." />
        <Btn onClick={handleAdd} disabled={saving || !form.s1 || !form.s2 || !form.s3}>{saving ? '...' : '+ Registrar'}</Btn>
      </div>

      {promPreview && (
        <div style={{ marginBottom: 16, color: '#94a3b8', fontSize: 13 }}>
          → Promedio: <strong style={{ color: '#a3e635', fontSize: 16 }}>{promPreview} cm</strong>
        </div>
      )}

      {loading ? (
        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>Cargando...</div>
      ) : historial.length === 0 ? (
        <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>Sin tests registrados.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e293b' }}>
                {['Fecha', 'S1', 'S2', 'S3', 'Promedio', 'Baseline', 'Diferencial', 'Pérdida %', 'Estado', 'Notas', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historial.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #0f172a', background: r.es_baseline ? '#a3e63508' : 'transparent' }}>
                  <td style={{ padding: '8px 8px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {r.fecha?.split('T')[0] ?? r.fecha}
                    {r.es_baseline && <span style={{ marginLeft: 6, fontSize: 10, color: '#a3e635', fontWeight: 700 }}>BASE</span>}
                  </td>
                  <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>{r.salto1_cm}</td>
                  <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>{r.salto2_cm}</td>
                  <td style={{ padding: '8px 8px', color: '#cbd5e1' }}>{r.salto3_cm}</td>
                  <td style={{ padding: '8px 8px', fontWeight: 700, color: '#f1f5f9' }}>{Number(r.promedio_cm).toFixed(1)} cm</td>
                  <td style={{ padding: '8px 8px', color: '#64748b' }}>{r.baseline_cm ? `${Number(r.baseline_cm).toFixed(1)} cm` : '—'}</td>
                  <td style={{ padding: '8px 8px', fontWeight: 600, color: Number(r.diferencial_cm) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {r.diferencial_cm != null ? `${Number(r.diferencial_cm) >= 0 ? '+' : ''}${Number(r.diferencial_cm).toFixed(1)} cm` : '—'}
                  </td>
                  <td style={{ padding: '8px 8px', color: '#94a3b8' }}>
                    {r.pct_perdida != null ? `${Number(r.pct_perdida).toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ padding: '8px 8px' }}>
                    {r.estado_fatiga === 'sin_baseline' ? <Semaforo estado="gris" /> : <Semaforo estado={getFatigaEstado(r.estado_fatiga)} />}
                  </td>
                  <td style={{ padding: '8px 8px', color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notas ?? '—'}</td>
                  <td style={{ padding: '8px 8px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {!r.es_baseline && <Btn onClick={() => handleSetBaseline(r.id)} variant="ghost" small>⚑ Base</Btn>}
                      <Btn onClick={() => handleDelete(r.id)} variant="ghost" small>✕</Btn>
                    </div>
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
      )}
    </Card>
  )
}

// ─── Panel principal de Evaluaciones ─────────────────────────────────────────
interface TeamPlayer {
  id: number
  nombre: string
  posicion?: string
  [key: string]: any
}

export default function EvaluacionesPanel({ teamData }: { teamData: TeamPlayer[] }) {
  const [selectedJugadorId, setSelectedJugadorId] = useState<number | null>(
    teamData.length > 0 ? teamData[0].id : null
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

  const ADVANCED = [
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
          Tests físicos · Variables, Pesajes, CMJ, Isométricos — PFV, DSI, RSI próximamente
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
              key={j.id}
              onClick={() => { setSelectedJugadorId(j.id); setJugadorData(null) }}
              style={{
                padding: '7px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                border: `1px solid ${selectedJugadorId === j.id ? '#a3e635' : '#1e293b'}`,
                background: selectedJugadorId === j.id ? '#a3e63518' : '#0f172a',
                color: selectedJugadorId === j.id ? '#a3e635' : '#64748b',
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

        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Calculadoras avanzadas (próximamente)
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ADVANCED.map(m => (
            <div key={m.key} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', borderRadius: 10, fontSize: 13,
              border: '1px dashed #1e293b', background: '#0a0f14',
              color: '#2d3748', minWidth: 120, opacity: 0.6,
            }}>
              <span style={{ fontSize: 18, marginBottom: 2 }}>{m.icon}</span>
              <span style={{ fontWeight: 700 }}>{m.label}</span>
              <span style={{ fontSize: 10 }}>{m.desc}</span>
            </div>
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
          {activeTest === 'pesajes'    && <PesajesPanel    jugador={jugadorData} />}
          {activeTest === 'cmj'        && <CMJPanel        jugador={jugadorData} />}
          {activeTest === 'isometrico' && <IsometricoPanel jugador={jugadorData} />}
        </>
      )}
    </div>
  )
}
