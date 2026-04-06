'use client'

import { useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Jugador {
  id: number
  nombre: string
  posicion: string
  edad: number
  estatura_cm: number
  peso_kg: number
  peso_ideal_min?: number
  peso_ideal_max?: number
}

type TestKey = 'variables' | 'pesajes' | 'cmj' | 'isometrico' | 'fv' | 'rsi' | 'dsi'

interface TestMenuItem {
  key: TestKey
  label: string
  icon: string
  categoria: 'basico' | 'avanzado'
  badge?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Semaforo({ estado }: { estado: 'verde' | 'amarillo' | 'rojo' | 'gris' }) {
  const colores = {
    verde: 'bg-emerald-500',
    amarillo: 'bg-amber-400',
    rojo: 'bg-red-500',
    gris: 'bg-slate-400',
  }
  const labels = { verde: 'Normal', amarillo: 'Precaución', rojo: 'Alerta', gris: 'Sin dato' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold text-white ${colores[estado]}`}>
      <span className="w-2 h-2 rounded-full bg-white/40 inline-block" />
      {labels[estado]}
    </span>
  )
}

function InputGroup({
  label, value, onChange, type = 'number', unit, min, max, step = '0.1', placeholder,
}: {
  label: string; value: string | number; onChange: (v: string) => void
  type?: string; unit?: string; min?: string; max?: string; step?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min} max={max} step={step} placeholder={placeholder}
          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500"
        />
        {unit && <span className="text-xs text-slate-400 whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Sub-vistas ───────────────────────────────────────────────────────────────

// 1. Variables Simples
function VariablesSimples({ jugador }: { jugador: Jugador }) {
  const [form, setForm] = useState({
    nombre: jugador.nombre || '',
    posicion: jugador.posicion || '',
    edad: String(jugador.edad || ''),
    altura: String(jugador.estatura_cm || ''),
    peso: String(jugador.peso_kg || ''),
  })
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    // TODO: PUT /api/evaluaciones/variables { jugador_id, ...form }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <InputGroup label="Nombre" value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} type="text" />
        <InputGroup label="Posición" value={form.posicion} onChange={v => setForm(p => ({ ...p, posicion: v }))} type="text" />
        <InputGroup label="Edad" value={form.edad} onChange={v => setForm(p => ({ ...p, edad: v }))} unit="años" min="15" max="45" step="1" />
        <InputGroup label="Altura" value={form.altura} onChange={v => setForm(p => ({ ...p, altura: v }))} unit="cm" min="150" max="220" step="1" />
        <InputGroup label="Peso actual" value={form.peso} onChange={v => setForm(p => ({ ...p, peso: v }))} unit="kg" min="40" max="150" />
      </div>
      <button
        onClick={handleSave}
        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {saved ? '✓ Guardado' : 'Guardar Variables'}
      </button>
    </div>
  )
}

// 2. Control de Pesaje
function ControlPesaje({ jugador }: { jugador: Jugador }) {
  const [historial, setHistorial] = useState<{ fecha: string; peso: number }[]>([
    { fecha: '2025-03-01', peso: 79 },
    { fecha: '2025-03-15', peso: 80 },
    { fecha: '2025-04-01', peso: 78 },
  ])
  const [nuevoPeso, setNuevoPeso] = useState('')
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split('T')[0])

  const pesoIdealMin = jugador.peso_ideal_min ?? 77
  const pesoIdealMax = jugador.peso_ideal_max ?? 79

  const enRango = (p: number) => p >= pesoIdealMin && p <= pesoIdealMax

  const agregarPesaje = () => {
    if (!nuevoPeso) return
    setHistorial(prev => [...prev, { fecha: nuevaFecha, peso: Number(nuevoPeso) }].sort((a, b) => a.fecha.localeCompare(b.fecha)))
    setNuevoPeso('')
  }

  return (
    <div className="space-y-6">
      {/* Peso ideal badge */}
      <div className="flex items-center gap-3 bg-slate-700/40 rounded-xl p-4 border border-slate-600/50">
        <div className="text-2xl">⚖️</div>
        <div>
          <p className="text-xs text-slate-400">Rango de peso ideal (nutricionista)</p>
          <p className="text-white font-bold text-lg">{pesoIdealMin} – {pesoIdealMax} kg</p>
        </div>
      </div>

      {/* Historial */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 pr-4">Fecha</th>
              <th className="text-right py-2 pr-4">Peso (kg)</th>
              <th className="text-left py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {historial.map((h, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="py-2 pr-4 text-slate-300">{h.fecha}</td>
                <td className={`py-2 pr-4 text-right font-bold text-lg ${enRango(h.peso) ? 'text-emerald-400' : 'text-red-400'}`}>
                  {h.peso}
                </td>
                <td className="py-2">
                  <Semaforo estado={enRango(h.peso) ? 'verde' : 'rojo'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nuevo pesaje */}
      <div className="flex gap-3 items-end pt-2 border-t border-slate-700">
        <div className="flex-1">
          <InputGroup label="Fecha" value={nuevaFecha} onChange={setNuevaFecha} type="date" />
        </div>
        <div className="flex-1">
          <InputGroup label="Peso" value={nuevoPeso} onChange={setNuevoPeso} unit="kg" placeholder="78.5" />
        </div>
        <button
          onClick={agregarPesaje}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          + Agregar
        </button>
      </div>
    </div>
  )
}

// 3. Test CMJ
function TestCMJ({ jugador }: { jugador: Jugador }) {
  type CMJSession = {
    fecha: string
    saltos: [number, number, number]
    promedio: number
    esBaseline: boolean
  }

  const [sessions, setSessions] = useState<CMJSession[]>([
    { fecha: '2025-03-01', saltos: [39, 37, 38], promedio: 38, esBaseline: true },
    { fecha: '2025-03-20', saltos: [34, 38, 27], promedio: 33, esBaseline: false },
  ])
  const [form, setForm] = useState({ fecha: new Date().toISOString().split('T')[0], s1: '', s2: '', s3: '' })

  const baseline = sessions.find(s => s.esBaseline)

  const getDiferencial = (s: CMJSession) => {
    if (!baseline || s.esBaseline) return null
    return ((baseline.promedio - s.promedio) / baseline.promedio * 100)
  }

  const agregarSession = () => {
    const s = [Number(form.s1), Number(form.s2), Number(form.s3)] as [number, number, number]
    if (s.some(v => !v)) return
    const promedio = Math.round((s[0] + s[1] + s[2]) / 3 * 100) / 100
    setSessions(prev => [...prev, {
      fecha: form.fecha, saltos: s, promedio,
      esBaseline: prev.filter(x => x.esBaseline).length === 0,
    }])
    setForm(p => ({ ...p, s1: '', s2: '', s3: '' }))
  }

  return (
    <div className="space-y-6">
      {/* Info */}
      {baseline && (
        <div className="bg-blue-900/30 border border-blue-700/40 rounded-xl p-4">
          <p className="text-xs text-blue-300 mb-1">Baseline establecido</p>
          <p className="text-white font-bold text-xl">{baseline.promedio} cm <span className="text-sm font-normal text-slate-400">— {baseline.fecha}</span></p>
        </div>
      )}

      {/* Historial */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wide">
              <th className="text-left py-2 pr-3">Fecha</th>
              <th className="text-right py-2 pr-3">S1</th>
              <th className="text-right py-2 pr-3">S2</th>
              <th className="text-right py-2 pr-3">S3</th>
              <th className="text-right py-2 pr-3">Prom.</th>
              <th className="text-right py-2 pr-3">Δ%</th>
              <th className="text-left py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => {
              const dif = getDiferencial(s)
              const esFatiga = dif !== null && dif > 10
              return (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="py-2 pr-3 text-slate-300">{s.fecha}</td>
                  {s.saltos.map((v, j) => (
                    <td key={j} className="py-2 pr-3 text-right text-slate-200">{v}</td>
                  ))}
                  <td className="py-2 pr-3 text-right font-bold text-white">{s.promedio}</td>
                  <td className={`py-2 pr-3 text-right font-mono text-sm ${dif === null ? 'text-slate-500' : esFatiga ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                    {dif === null ? '—' : `${dif > 0 ? '-' : '+'}${Math.abs(dif).toFixed(1)}%`}
                  </td>
                  <td className="py-2">
                    {s.esBaseline
                      ? <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Baseline</span>
                      : <Semaforo estado={dif === null ? 'gris' : esFatiga ? 'rojo' : 'verde'} />}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Nuevo test */}
      <div className="border-t border-slate-700 pt-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Nuevo Re-test</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <InputGroup label="Fecha" value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} type="date" />
          <InputGroup label="Salto 1" value={form.s1} onChange={v => setForm(p => ({ ...p, s1: v }))} unit="cm" placeholder="38" />
          <InputGroup label="Salto 2" value={form.s2} onChange={v => setForm(p => ({ ...p, s2: v }))} unit="cm" placeholder="37" />
          <InputGroup label="Salto 3" value={form.s3} onChange={v => setForm(p => ({ ...p, s3: v }))} unit="cm" placeholder="39" />
        </div>
        <button
          onClick={agregarSession}
          className="mt-3 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Registrar CMJ
        </button>
      </div>
    </div>
  )
}

// 4. Test Isométrico (reutilizable)
function TestIsometrico({ jugador }: { jugador: Jugador }) {
  const GRUPOS = ['Isquiotibiales', 'Cuádriceps', 'Aductores', 'Abductores', 'Glúteo']

  type IsoSession = {
    fecha: string; grupo: string
    der: [number, number, number]; derProm: number
    izq: [number, number, number]; izqProm: number
  }

  const [sessions, setSessions] = useState<IsoSession[]>([
    {
      fecha: '2025-03-01', grupo: 'Isquiotibiales',
      der: [280, 290, 285], derProm: 285,
      izq: [230, 220, 225], izqProm: 225,
    },
  ])
  const [grupoSel, setGrupoSel] = useState(GRUPOS[0])
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    d1: '', d2: '', d3: '', i1: '', i2: '', i3: '',
  })

  const calcAsimetria = (der: number, izq: number) =>
    Math.abs(der - izq) / Math.max(der, izq) * 100

  const getSemaforo = (pct: number): 'verde' | 'amarillo' | 'rojo' =>
    pct < 10 ? 'verde' : pct <= 15 ? 'amarillo' : 'rojo'

  const agregarSession = () => {
    const d = [Number(form.d1), Number(form.d2), Number(form.d3)] as [number, number, number]
    const i = [Number(form.i1), Number(form.i2), Number(form.i3)] as [number, number, number]
    if (d.concat(i).some(v => !v)) return
    const derProm = Math.round((d[0] + d[1] + d[2]) / 3)
    const izqProm = Math.round((i[0] + i[1] + i[2]) / 3)
    setSessions(prev => [...prev, { fecha: form.fecha, grupo: grupoSel, der: d, derProm, izq: i, izqProm }])
    setForm(p => ({ ...p, d1: '', d2: '', d3: '', i1: '', i2: '', i3: '' }))
  }

  const sesionesDelGrupo = sessions.filter(s => s.grupo === grupoSel)

  return (
    <div className="space-y-6">
      {/* Selector de grupo muscular */}
      <div className="flex flex-wrap gap-2">
        {GRUPOS.map(g => (
          <button
            key={g}
            onClick={() => setGrupoSel(g)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-all ${
              grupoSel === g
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Historial para el grupo seleccionado */}
      {sesionesDelGrupo.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-700 text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-3">Fecha</th>
                <th className="text-right py-2 pr-3" colSpan={3}>Derecha (N)</th>
                <th className="text-right py-2 pr-3">Prom. D</th>
                <th className="text-right py-2 pr-3" colSpan={3}>Izquierda (N)</th>
                <th className="text-right py-2 pr-3">Prom. I</th>
                <th className="text-right py-2 pr-3">Asim. %</th>
                <th className="text-left py-2">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {sesionesDelGrupo.map((s, i) => {
                const asim = calcAsimetria(s.derProm, s.izqProm)
                return (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="py-2 pr-3 text-slate-300">{s.fecha}</td>
                    {s.der.map((v, j) => <td key={j} className="py-2 pr-2 text-right text-slate-300">{v}</td>)}
                    <td className="py-2 pr-3 text-right font-bold text-white">{s.derProm}</td>
                    {s.izq.map((v, j) => <td key={j} className="py-2 pr-2 text-right text-slate-300">{v}</td>)}
                    <td className="py-2 pr-3 text-right font-bold text-white">{s.izqProm}</td>
                    <td className={`py-2 pr-3 text-right font-mono font-bold ${getSemaforo(asim) === 'verde' ? 'text-emerald-400' : getSemaforo(asim) === 'amarillo' ? 'text-amber-400' : 'text-red-400'}`}>
                      {asim.toFixed(1)}%
                    </td>
                    <td className="py-2"><Semaforo estado={getSemaforo(asim)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500 text-sm italic py-4 text-center">Sin registros para {grupoSel}</p>
      )}

      {/* Formulario nuevo test */}
      <div className="border-t border-slate-700 pt-4 space-y-3">
        <p className="text-xs text-slate-400 uppercase tracking-wide">Nuevo registro — {grupoSel}</p>
        <InputGroup label="Fecha" value={form.fecha} onChange={v => setForm(p => ({ ...p, fecha: v }))} type="date" />
        <div className="grid grid-cols-3 gap-3">
          <InputGroup label="Der. intento 1" value={form.d1} onChange={v => setForm(p => ({ ...p, d1: v }))} unit="N" />
          <InputGroup label="Der. intento 2" value={form.d2} onChange={v => setForm(p => ({ ...p, d2: v }))} unit="N" />
          <InputGroup label="Der. intento 3" value={form.d3} onChange={v => setForm(p => ({ ...p, d3: v }))} unit="N" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <InputGroup label="Izq. intento 1" value={form.i1} onChange={v => setForm(p => ({ ...p, i1: v }))} unit="N" />
          <InputGroup label="Izq. intento 2" value={form.i2} onChange={v => setForm(p => ({ ...p, i2: v }))} unit="N" />
          <InputGroup label="Izq. intento 3" value={form.i3} onChange={v => setForm(p => ({ ...p, i3: v }))} unit="N" />
        </div>
        <button
          onClick={agregarSession}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Registrar Test Isométrico
        </button>
      </div>
    </div>
  )
}

// 5. Calculadoras Avanzadas (placeholder arquitectura)
function CalculadoraAvanzada({ tipo }: { tipo: 'fv' | 'rsi' | 'dsi' }) {
  const info = {
    fv: {
      titulo: 'Perfil Fuerza-Velocidad',
      descripcion: 'Protocolo multi-carga (Samozino et al.). Requiere masa corporal, longitud de miembro inferior y alturas de salto con cargas incrementales.',
      ecuaciones: ['F₀ = intercepto de la regresión F-V', 'V₀ = -F₀ / Sfv', 'Pmax = (F₀ × V₀) / 4', 'DSfv = Sfv / Sfv_opt'],
      campos: ['Masa corporal (kg)', 'Long. miembro inf. (m)', 'Altura inicial Hi (m)', '+ Series de cargas (% BW, H1, H2, H3)'],
    },
    rsi: {
      titulo: 'RSI — Reactive Strength Index',
      descripcion: 'Mide la capacidad reactiva. Se calcula como altura de salto / tiempo de contacto. Ideal con plataforma de contacto o video de alta velocidad.',
      ecuaciones: ['RSI = Altura vuelo (m) / Tiempo contacto (s)', 'RSI Modificado = Altura / Tiempo total'],
      campos: ['Altura de caída (cm)', 'Tiempo contacto (ms)', 'Tiempo vuelo (ms)', '+ N intentos'],
    },
    dsi: {
      titulo: 'DSI — Dynamic Strength Index',
      descripcion: 'Ratio entre fuerza balística pico y fuerza isométrica pico. Guía la selección del método de entrenamiento óptimo.',
      ecuaciones: ['DSI = Fuerza balística pico / Fuerza isométrica pico', '< 0.60 → priorizar balístico', '0.60–0.80 → equilibrado', '> 0.80 → priorizar fuerza máxima'],
      campos: ['Fuerza isométrica pico (N) — del test ISO', 'Fuerza balística pico (N) — del CMJ con plataforma'],
    },
  }[tipo]

  return (
    <div className="space-y-5">
      <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4">
        <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide mb-1">⚡ Calculadora Avanzada — En desarrollo</p>
        <p className="text-slate-300 text-sm">{info.descripcion}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Ecuaciones del modelo</p>
          <ul className="space-y-1.5">
            {info.ecuaciones.map((e, i) => (
              <li key={i} className="font-mono text-sm text-blue-300">{e}</li>
            ))}
          </ul>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-4">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Inputs requeridos</p>
          <ul className="space-y-1.5">
            {info.campos.map((c, i) => (
              <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                <span className="text-slate-500 mt-0.5">→</span>{c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-500 italic">
        Esta calculadora se implementará como vista independiente con las ecuaciones completas del protocolo validado.
        La arquitectura de DB ya está preparada (tablas fv_sessions, rsi_sessions, dsi_sessions).
      </p>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────
const MENU: TestMenuItem[] = [
  { key: 'variables',   label: 'Variables',     icon: '👤', categoria: 'basico' },
  { key: 'pesajes',     label: 'Pesajes',        icon: '⚖️', categoria: 'basico' },
  { key: 'cmj',         label: 'CMJ',            icon: '🦘', categoria: 'basico', badge: 'Fatiga' },
  { key: 'isometrico',  label: 'Isométrico',     icon: '💪', categoria: 'basico', badge: 'Asimetría' },
  { key: 'fv',          label: 'F-V Profile',    icon: '⚡', categoria: 'avanzado' },
  { key: 'rsi',         label: 'RSI',            icon: '🔁', categoria: 'avanzado' },
  { key: 'dsi',         label: 'DSI',            icon: '📊', categoria: 'avanzado' },
]

export default function EvaluacionesPanel({ jugador }: { jugador: Jugador }) {
  const [activeTest, setActiveTest] = useState<TestKey>('variables')

  const renderTest = useCallback(() => {
    switch (activeTest) {
      case 'variables':  return <VariablesSimples jugador={jugador} />
      case 'pesajes':    return <ControlPesaje jugador={jugador} />
      case 'cmj':        return <TestCMJ jugador={jugador} />
      case 'isometrico': return <TestIsometrico jugador={jugador} />
      case 'fv':         return <CalculadoraAvanzada tipo="fv" />
      case 'rsi':        return <CalculadoraAvanzada tipo="rsi" />
      case 'dsi':        return <CalculadoraAvanzada tipo="dsi" />
    }
  }, [activeTest, jugador])

  const activeMeta = MENU.find(m => m.key === activeTest)!

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">Evaluaciones</h2>
          <p className="text-slate-400 text-xs">{jugador.nombre}</p>
        </div>
      </div>

      {/* Menú de tests — scroll horizontal en mobile */}
      <div className="border-b border-slate-700 px-4 overflow-x-auto">
        <div className="flex gap-1 py-2 min-w-max">
          {/* Básicos */}
          {MENU.filter(m => m.categoria === 'basico').map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTest(item.key)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTest === item.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full leading-none">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Separador */}
          <div className="mx-2 w-px bg-slate-600 self-stretch" />

          {/* Avanzados */}
          {MENU.filter(m => m.categoria === 'avanzado').map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTest(item.key)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTest === item.key
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Breadcrumb del test activo */}
      <div className="px-5 py-3 bg-slate-700/20 border-b border-slate-700/50 flex items-center gap-2">
        <span className="text-xl">{activeMeta.icon}</span>
        <div>
          <p className="text-white text-sm font-semibold leading-tight">{activeMeta.label}</p>
          <p className="text-slate-400 text-xs capitalize">{activeMeta.categoria === 'avanzado' ? 'Calculadora avanzada' : 'Test básico'}</p>
        </div>
      </div>

      {/* Contenido dinámico */}
      <div className="p-5">
        {renderTest()}
      </div>
    </div>
  )
}
