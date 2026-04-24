'use client'
import { useState, useEffect, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
const FASES = [
  { key: 'F0 - Solo kinesio',       short: 'F0', label: 'Solo Kinesio',          color: '#94a3b8' },
  { key: 'F1 - Ind. sin balón',     short: 'F1', label: 'Ind. Sin Balón',        color: '#f87171' },
  { key: 'F2 - Ind. con balón',     short: 'F2', label: 'Ind. Con Balón',        color: '#fb923c' },
  { key: 'F3 - Grupal controlado',  short: 'F3', label: 'Grupal Ctrl.',          color: '#fbbf24' },
  { key: 'F4 - Reducido sin contacto', short: 'F4', label: 'Reducido',           color: '#a3e635' },
  { key: 'F5 - Intermitente box2box', short: 'F5', label: 'Intermitente Box2Box', color: '#34d399' },
  { key: 'F6 - Con categoría',      short: 'F6', label: 'Con Categoría',         color: '#22c55e' },
]
const FASE_MAP: Record<string,typeof FASES[0]> = {}
FASES.forEach(f => { FASE_MAP[f.key] = f })

const ACTIVIDADES = [
  { key: 'gimnasio',     label: 'Gimnasio',     icon: '🏋️' },
  { key: 'campo_ind',    label: 'Campo ind.',    icon: '🏃' },
  { key: 'tecnica',      label: 'Técnica',       icon: '⚽' },
  { key: 'reducido',     label: 'Reducido',      icon: '👥' },
  { key: 'intermitente', label: 'Intermitente',  icon: '📊' },
  { key: 'sprint',       label: 'Sprint',        icon: '💨' },
  { key: 'contacto',     label: 'Contacto',      icon: '🤝' },
  { key: 'con_categ',    label: 'Con categ.',     icon: '🏆' },
]

const STATUS_COLORS: Record<string,{bg:string,text:string,label:string}> = {
  ok:        { bg: '#22c55e22', text: '#22c55e', label: 'OK' },
  cuidado:   { bg: '#f59e0b22', text: '#f59e0b', label: '!' },
  no_puede:  { bg: '#ef444422', text: '#ef4444', label: 'X' },
  pendiente: { bg: '#64748b22', text: '#64748b', label: '—' },
}

const TIPOS = ['Desgarro Muscular', 'Doms muscular', 'Esguince/ Lesion lig', 'Lesion meniscos/ Cartilago', 'Fractura', 'Tendinopatia', 'Otra Lesion Osea', 'Laceracion', 'Contusión', 'Sobrecarga']
const MECANISMOS = ['Pateando', 'Choque', 'Saltando/Aterrizando', 'Sobreuso', 'Derribado por otro jugador', 'Golpe por la pelota', 'Carrera/Sprint', 'Caida', 'Cambio dirección', 'Otro']
const REGIONES = ['Muslo anterior', 'Muslo posterior', 'Pie/Talon', 'Tobillo', 'Cadera/Pubis', 'Lumbar/Sacro/Pelvis', 'Rodilla', 'Pantorrilla', 'Hombro', 'Cabeza', 'Mano/Muñeca', 'Otra']
const LATERALIDADES = ['Bilateral', 'Derecha', 'Izquierda']

type SubTab = 'dashboard' | 'readaptacion' | 'profes' | 'nueva'

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnfermeriaPanel({ teamData, onRefresh }: { teamData: any[]; onRefresh: () => void }) {
  const [subTab, setSubTab] = useState<SubTab>('dashboard')
  const [lesiones, setLesiones] = useState<any[]>([])
  const [allLesiones, setAllLesiones] = useState<any[]>([])
  const [readapChecks, setReadapChecks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState('all')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterRegion, setFilterRegion] = useState('all')
  const [registroView, setRegistroView] = useState<'activos'|'todos'|'recurrentes'>('activos')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [actR, allR, rcR] = await Promise.all([
        fetch('/api/lesiones?activas=true'),
        fetch('/api/lesiones?activas=false'),
        fetch('/api/lesiones/readaptacion?all=true'),
      ])
      const act = actR.ok ? await actR.json() : []
      const all = allR.ok ? await allR.json() : []
      const rc = rcR.ok ? await rcR.json() : []
      setLesiones(Array.isArray(act) ? act : [])
      setAllLesiones(Array.isArray(all) ? all : [])
      setReadapChecks(Array.isArray(rc) ? rc : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateLesion(id: number, patch: any) {
    await fetch('/api/lesiones', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) })
    load()
    onRefresh()
  }

  async function saveChecks(lesionId: number, checks: any) {
    await fetch('/api/lesiones/readaptacion', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lesion_id: lesionId, ...checks }) })
    load()
  }

  // ── Computed data ──
  const activas = lesiones.filter(l => l.activa)
  const today = new Date()
  const diasBaja = (l: any) => {
    const ini = new Date(l.fecha_inicio)
    const fin = l.fecha_alta ? new Date(l.fecha_alta) : today
    return Math.max(0, Math.floor((fin.getTime() - ini.getTime()) / 86400000))
  }

  // Filter for registro
  const registroBase = registroView === 'activos' ? activas
    : registroView === 'recurrentes' ? allLesiones.filter(l => l.recurrente)
    : allLesiones
  const filtered = registroBase.filter(l => {
    if (filterTipo !== 'all' && l.tipo_lesion !== filterTipo) return false
    if (filterEstado !== 'all' && l.estado !== filterEstado) return false
    if (filterRegion !== 'all' && l.region_corporal !== filterRegion) return false
    return true
  })

  // KPIs
  const totalLesiones = allLesiones.length
  const activosHoy = activas.length
  const activosConAlta = activas.filter(l => l.estado === 'Alta').length
  const diasArr = allLesiones.map(diasBaja).filter(d => d > 0)
  const diasProm = diasArr.length > 0 ? Math.round(diasArr.reduce((a, b) => a + b, 0) / diasArr.length) : 0
  const diasMax = diasArr.length > 0 ? Math.max(...diasArr) : 0
  const recurrentes = allLesiones.filter(l => l.recurrente).length
  const pctRecurrentes = totalLesiones > 0 ? Math.round((recurrentes / totalLesiones) * 100) : 0

  // Chart data
  const byRegion: Record<string, number> = {}
  const byTipo: Record<string, number> = {}
  const byMecanismo: Record<string, number> = {}
  allLesiones.forEach(l => {
    const r = l.region_corporal || l.zona || 'Otra'
    const t = l.tipo_lesion || 'Sin tipo'
    const m = l.mecanismo || 'Desconocido'
    byRegion[r] = (byRegion[r] || 0) + 1
    byTipo[t] = (byTipo[t] || 0) + 1
    byMecanismo[m] = (byMecanismo[m] || 0) + 1
  })
  const regionSorted = Object.entries(byRegion).sort((a, b) => b[1] - a[1])
  const tipoSorted = Object.entries(byTipo).sort((a, b) => b[1] - a[1])
  const mecanismoSorted = Object.entries(byMecanismo).sort((a, b) => b[1] - a[1])

  const TIPO_COLORS: Record<string, string> = {
    'Desgarro Muscular': '#22c55e', 'Doms muscular': '#4ade80', 'Esguince/ Lesion lig': '#a16207',
    'Lesion meniscos/ Cartilago': '#b45309', 'Fractura': '#64748b', 'Tendinopatia': '#78716c',
    'Contusión': '#a3e635', 'Sobrecarga': '#84cc16', 'Otra Lesion Osea': '#6b7280',
  }

  // Section render helper
  const SectionBox = ({ children, title, extra }: { children: React.ReactNode; title: string; extra?: React.ReactNode }) => (
    <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 14, padding: 20, flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>│ {title}</p>
        {extra}
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 className="display" style={{ fontSize: 44, color: 'var(--snow)', margin: 0 }}>ENFERMERÍA</h2>
          <p style={{ fontSize: 12, color: 'var(--silver)', marginTop: 2 }}>Dpto. Médico · Control y seguimiento de lesiones</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--mist)', paddingBottom: 2 }}>
        {[
          { key: 'dashboard' as SubTab, label: 'Dashboard' },
          { key: 'readaptacion' as SubTab, label: 'Readaptación' },
          { key: 'profes' as SubTab, label: 'Vista Profes' },
          { key: 'nueva' as SubTab, label: '+ Nueva lesión' },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{
            padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: subTab === t.key ? '1px solid var(--lime)' : '1px solid transparent',
            borderBottom: 'none',
            borderRadius: '10px 10px 0 0',
            background: subTab === t.key ? 'rgba(163,230,53,.08)' : 'transparent',
            color: subTab === t.key ? 'var(--lime)' : 'var(--fog)',
          }}>{t.label}</button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: 'center', color: 'var(--silver)' }}>Cargando...</div>}

      {/* ═══════ DASHBOARD ═══════ */}
      {!loading && subTab === 'dashboard' && (() => {
        // Estado de la plantilla
        const totalPlantilla = teamData.length
        const enRecuperacion = activas.length
        const saludables = totalPlantilla - enRecuperacion

        // Proyección de recuperación: group active injuries by ETA ranges

        // Top 3 injured zones for the runner SVG

        return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Hero Banner */}
          <div style={{ background: 'linear-gradient(135deg, #0a1a0f 0%, #0f2518 40%, #0a1a10 100%)', border: '1px solid rgba(34,197,94,.15)', borderRadius: 16, padding: '32px 36px', position: 'relative', overflow: 'hidden', minHeight: 260 }}>
            {/* Background grid effect */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div style={{ position: 'relative', display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <h3 style={{ fontSize: 26, fontWeight: 800, color: 'var(--snow)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                  ¡PORTAL DE GESTIÓN DE LESIONES!
                </h3>
                <p style={{ fontSize: 14, color: 'var(--silver)', margin: '0 0 20px', lineHeight: 1.6 }}>
                  Tu visión integral para un retorno a la competición seguro y eficiente
                </p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 8, background: 'rgba(163,230,53,.12)', border: '1px solid rgba(163,230,53,.25)', fontSize: 12, fontWeight: 700, color: '#a3e635', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  ⚡ Monitorización Integral de Atletas
                </div>
              </div>
              {/* Runner image */}
              <div style={{ flexShrink: 0, width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src="/images/runner-medical.png" alt="Runner" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(168,85,247,.3))' }} />
              </div>
            </div>
          </div>

          {/* Estado Plantilla + Proyección Recuperación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Estado de la Plantilla */}
            <SectionBox title="Estado de la Plantilla">
              <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', fontSize: 11 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }}/> Saludable ({saludables})</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }}/> En Recuperación ({enRecuperacion})</span>
              </div>
              {(() => {
                const barH = 160, barW = 280, pad = { l: 30, r: 20, t: 10, b: 30 }
                const cats = [
                  { label: 'Saludable', value: saludables, color: '#22c55e' },
                  { label: 'En Recuperación', value: enRecuperacion, color: '#f59e0b' },
                ]
                const maxVal = Math.max(...cats.map(c => c.value), 1)
                const plotW = barW - pad.l - pad.r
                const plotH = barH - pad.t - pad.b
                const bw = plotW / cats.length * 0.5
                const gap = plotW / cats.length
                // Y axis ticks
                const yTicks: number[] = []
                const step = maxVal > 20 ? 5 : maxVal > 10 ? 2 : 1
                for (let v = 0; v <= maxVal; v += step) yTicks.push(v)
                if (!yTicks.includes(maxVal)) yTicks.push(maxVal)

                return (
                  <svg viewBox={`0 0 ${barW} ${barH}`} style={{ width: '100%', maxWidth: barW }}>
                    {yTicks.map(v => (
                      <g key={v}>
                        <line x1={pad.l} y1={pad.t + plotH - (v / maxVal) * plotH} x2={barW - pad.r} y2={pad.t + plotH - (v / maxVal) * plotH} stroke="var(--mist)" strokeWidth={0.5}/>
                        <text x={pad.l - 5} y={pad.t + plotH - (v / maxVal) * plotH + 3} textAnchor="end" fontSize="9" fill="var(--fog)">{v}</text>
                      </g>
                    ))}
                    <line x1={pad.l} y1={pad.t + plotH} x2={barW - pad.r} y2={pad.t + plotH} stroke="var(--mist)" strokeWidth={0.5}/>
                    {cats.map((c, i) => {
                      const x = pad.l + gap * i + gap / 2 - bw / 2
                      const h = (c.value / maxVal) * plotH
                      return (
                        <g key={c.label}>
                          <rect x={x} y={pad.t + plotH - h} width={bw} height={h} fill={c.color} rx={4}/>
                          <text x={x + bw / 2} y={pad.t + plotH + 14} textAnchor="middle" fontSize="9" fill="var(--silver)">{c.label}</text>
                          <text x={x + bw / 2} y={pad.t + plotH - h - 4} textAnchor="middle" fontSize="10" fill={c.color} fontWeight="700">{c.value}</text>
                        </g>
                      )
                    })}
                  </svg>
                )
              })()}
            </SectionBox>

            {/* Proyección de Recuperación — Line chart */}
            <SectionBox title="Proyección de Recuperación" extra={
              <span style={{ fontSize: 10, color: 'var(--silver)' }}>Proyección de retorno en las próximas semanas</span>
            }>
              {activas.length === 0 ? (
                <p style={{ color: 'var(--fog)', fontSize: 12, textAlign: 'center', padding: 20 }}>✓ Sin jugadores en recuperación</p>
              ) : (() => {
                // Build cumulative recovery data: at day X, how many players will be back
                const withEta = activas
                  .map(l => ({ remaining: l.eta_dias ? Math.max(0, Number(l.eta_dias) - diasBaja(l)) : -1 }))
                  .filter(d => d.remaining >= 0)
                  .sort((a, b) => a.remaining - b.remaining)

                if (withEta.length === 0) return <p style={{ color: 'var(--fog)', fontSize: 12, textAlign: 'center', padding: 20 }}>Sin datos de ETA</p>

                // Create time points for x-axis
                const maxDay = Math.max(...withEta.map(d => d.remaining), 7)
                const dayTicks = [0]
                const step = maxDay > 60 ? 14 : maxDay > 30 ? 7 : maxDay > 14 ? 5 : 3
                for (let d = step; d <= maxDay; d += step) dayTicks.push(d)
                if (!dayTicks.includes(maxDay) && maxDay > 0) dayTicks.push(maxDay)

                // Cumulative: at each tick, how many players recovered
                const points = dayTicks.map(day => ({
                  day,
                  count: withEta.filter(d => d.remaining <= day).length,
                }))
                const maxCount = withEta.length

                const cW = 340, cH = 170, p = { l: 35, r: 15, t: 15, b: 35 }
                const pW = cW - p.l - p.r, pH = cH - p.t - p.b
                const toX = (d: number) => p.l + (d / maxDay) * pW
                const toY = (c: number) => p.t + pH - (c / Math.max(maxCount, 1)) * pH

                // Area path
                const linePts = points.map(pt => `${toX(pt.day)},${toY(pt.count)}`).join(' L')
                const areaD = `M${toX(0)},${toY(0)} L${linePts} L${toX(points[points.length - 1].day)},${toY(0)} Z`
                const lineD = `M${linePts}`

                // Y ticks
                const yTicks: number[] = []
                for (let i = 0; i <= maxCount; i++) yTicks.push(i)

                return (
                  <div>
                    <svg viewBox={`0 0 ${cW} ${cH}`} style={{ width: '100%', maxWidth: cW }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {/* Grid */}
                      {yTicks.map(v => (
                        <g key={`y${v}`}>
                          <line x1={p.l} y1={toY(v)} x2={cW - p.r} y2={toY(v)} stroke="var(--mist)" strokeWidth={0.5} />
                          <text x={p.l - 6} y={toY(v) + 3} textAnchor="end" fontSize="9" fill="var(--fog)">{v}</text>
                        </g>
                      ))}
                      {dayTicks.map(d => (
                        <text key={`x${d}`} x={toX(d)} y={cH - p.b + 16} textAnchor="middle" fontSize="9" fill="var(--fog)">{d}</text>
                      ))}
                      <line x1={p.l} y1={p.t + pH} x2={cW - p.r} y2={p.t + pH} stroke="var(--mist)" strokeWidth={0.5} />
                      {/* Area fill */}
                      <path d={areaD} fill="url(#areaGrad)" />
                      {/* Line */}
                      <path d={lineD} fill="none" stroke="#22c55e" strokeWidth={2.5} strokeLinejoin="round" />
                      {/* Dots */}
                      {points.map((pt, i) => (
                        <circle key={i} cx={toX(pt.day)} cy={toY(pt.count)} r={4} fill="#22c55e" stroke="#0f172a" strokeWidth={2} />
                      ))}
                      {/* X label */}
                      <text x={cW / 2} y={cH - 2} textAnchor="middle" fontSize="9" fill="var(--fog)">Días</text>
                    </svg>
                  </div>
                )
              })()}
            </SectionBox>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setSubTab('nueva')} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              background: 'rgba(163,230,53,.08)', border: '1px solid rgba(163,230,53,.25)', cursor: 'pointer',
              color: '#a3e635', fontSize: 13, fontWeight: 700,
            }}>+ Nuevo Registro de Lesión</button>
            <button onClick={() => setSubTab('readaptacion')} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.2)', cursor: 'pointer',
              color: '#60a5fa', fontSize: 13, fontWeight: 700,
            }}>🔄 Ver Readaptación</button>
            <button onClick={() => setSubTab('profes')} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              background: 'rgba(249,115,22,.06)', border: '1px solid rgba(249,115,22,.2)', cursor: 'pointer',
              color: '#f97316', fontSize: 13, fontWeight: 700,
            }}>👥 Vista Profes</button>
          </div>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { value: totalLesiones, label: 'Total Lesiones', sub: `Temporada ${today.getFullYear()}`, color: 'var(--snow)' },
              { value: activosHoy, label: 'Activos Hoy', sub: `${activosConAlta} con alta`, color: '#ef4444' },
              { value: diasProm, label: 'Días Prom. Baja', sub: `Máx: ${diasMax}d`, color: 'var(--snow)' },
              { value: `${pctRecurrentes}%`, label: 'Recurrentes', sub: `${recurrentes} de ${totalLesiones}`, color: pctRecurrentes > 20 ? '#ef4444' : 'var(--snow)' },
            ].map((kpi, i) => (
              <div key={i} style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 42, fontWeight: 800, color: kpi.color, fontFamily: 'DM Mono,monospace', lineHeight: 1 }}>{kpi.value}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{kpi.label}</div>
                <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2 }}>{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ color: 'var(--fog)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase' }}>Filtrar:</span>
            <select className="wp-input" style={{ padding: '6px 10px', fontSize: 12, maxWidth: 180 }} value={filterRegion} onChange={e => setFilterRegion(e.target.value)}>
              <option value="all">Todas las regiones</option>
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="wp-input" style={{ padding: '6px 10px', fontSize: 12, maxWidth: 180 }} value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
              <option value="all">Todos los tipos</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="wp-input" style={{ padding: '6px 10px', fontSize: 12, maxWidth: 180 }} value={filterEstado} onChange={e => setFilterEstado(e.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="activos">Solo activos</option>
              <option value="Alta">Con alta</option>
            </select>
            {(filterRegion !== 'all' || filterTipo !== 'all' || filterEstado !== 'all') && (
              <button className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => { setFilterRegion('all'); setFilterTipo('all'); setFilterEstado('all') }}>× Limpiar</button>
            )}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {/* Region bar chart */}
            <SectionBox title="Por Región Corporal">
              {regionSorted.length === 0 ? <p style={{ color: 'var(--fog)', fontSize: 12 }}>Sin datos</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {regionSorted.slice(0, 8).map(([name, count]) => {
                    const max = regionSorted[0][1]
                    const pct = (count / max) * 100
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--silver)', width: 120, textAlign: 'right', flexShrink: 0 }}>{name}</span>
                        <div style={{ flex: 1, height: 18, background: 'var(--ink3)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, #22c55e, #4ade80)`, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--silver)', width: 20, fontFamily: 'DM Mono,monospace' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </SectionBox>

            {/* Tipo donut */}
            <SectionBox title="Tipo de Lesión">
              {tipoSorted.length === 0 ? <p style={{ color: 'var(--fog)', fontSize: 12 }}>Sin datos</p> : (() => {
                const total = tipoSorted.reduce((a, [, c]) => a + c, 0)
                const size = 150
                let cumAngle = 0
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
                      {tipoSorted.map(([name, count], i) => {
                        const angle = (count / total) * 360
                        const start = cumAngle
                        cumAngle += angle
                        const r = size / 2 - 5
                        const cx = size / 2, cy = size / 2
                        const color = TIPO_COLORS[name] || ['#22c55e', '#4ade80', '#86efac', '#a78bfa', '#f59e0b', '#78716c'][i % 6]
                        // Full circle when only one type
                        if (angle >= 359.9) return <circle key={name} cx={cx} cy={cy} r={r} fill={color} stroke="var(--ink)" strokeWidth={1.5} />
                        const rad1 = (start - 90) * Math.PI / 180
                        const rad2 = (start + angle - 90) * Math.PI / 180
                        const x1 = cx + r * Math.cos(rad1), y1 = cy + r * Math.sin(rad1)
                        const x2 = cx + r * Math.cos(rad2), y2 = cy + r * Math.sin(rad2)
                        const large = angle > 180 ? 1 : 0
                        return <path key={name} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={color} stroke="var(--ink)" strokeWidth={1.5} />
                      })}
                      <circle cx={size / 2} cy={size / 2} r={size / 4} fill="var(--ink2)" />
                    </svg>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {tipoSorted.map(([name], i) => (
                        <span key={name} style={{ fontSize: 9, color: 'var(--silver)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: TIPO_COLORS[name] || ['#22c55e', '#4ade80', '#86efac', '#a78bfa', '#f59e0b', '#78716c'][i % 6] }} />
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </SectionBox>

            {/* Ranking por zona */}
            <SectionBox title="Ranking por Zona">
              {regionSorted.length === 0 ? <p style={{ color: 'var(--fog)', fontSize: 12 }}>Sin datos</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {regionSorted.slice(0, 6).map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: 'var(--silver)' }}>{name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 3, background: '#22c55e', borderRadius: 2 }} />
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', fontFamily: 'DM Mono,monospace' }}>{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionBox>
          </div>

          {/* Mecanismo chart */}
          <SectionBox title="Mecanismo de Lesión">
            {mecanismoSorted.length === 0 ? <p style={{ color: 'var(--fog)', fontSize: 12 }}>Sin datos</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mecanismoSorted.map(([name, count]) => {
                  const max = mecanismoSorted[0][1]
                  const pct = (count / max) * 100
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: 'var(--silver)', width: 160, textAlign: 'right', flexShrink: 0 }}>{name}</span>
                      <div style={{ flex: 1, height: 18, background: 'var(--ink3)', borderRadius: 4, overflow: 'hidden', maxWidth: 400 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, #22c55e, #86efac)`, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--silver)', fontFamily: 'DM Mono,monospace' }}>{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionBox>

          {/* Registro de lesiones table */}
          <SectionBox title="Registro de Lesiones" extra={
            <div style={{ display: 'flex', gap: 4 }}>
              {(['todos', 'activos', 'recurrentes'] as const).map(v => (
                <button key={v} onClick={() => setRegistroView(v)} style={{
                  padding: '5px 14px', fontSize: 11, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
                  border: registroView === v ? '1px solid var(--lime)' : '1px solid var(--mist)',
                  background: registroView === v ? 'rgba(163,230,53,.1)' : 'transparent',
                  color: registroView === v ? 'var(--lime)' : 'var(--fog)',
                  textTransform: 'capitalize',
                }}>{v}</button>
              ))}
            </div>
          }>
            <div style={{ fontSize: 11, color: 'var(--fog)', textAlign: 'right', marginBottom: 8 }}>{filtered.length} registros</div>
            {filtered.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--fog)', textAlign: 'center', padding: 20 }}>Sin registros.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--mist)' }}>
                      {['Jugador', 'Fecha', 'Región', 'Tipo', 'Mecanismo', 'Días', 'Estado'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: 'var(--fog)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((l: any) => {
                      const d = diasBaja(l)
                      const estCol = l.activa ? '#ef4444' : '#22c55e'
                      return (
                        <tr key={l.id} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                          <td style={{ padding: '10px 10px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--snow)' }}>{l.jugador_nombre}</div>
                            <div style={{ fontSize: 10, color: 'var(--fog)' }}>{l.posicion || ''}</div>
                          </td>
                          <td style={{ padding: '10px 10px', color: 'var(--fog)', fontFamily: 'DM Mono,monospace', fontSize: 11 }}>{l.fecha_inicio?.split('-').slice(1).join('/')}</td>
                          <td style={{ padding: '10px 10px', color: 'var(--snow)', fontWeight: 600 }}>{l.region_corporal || l.zona || '—'}</td>
                          <td style={{ padding: '10px 10px', color: 'var(--silver)' }}>{l.tipo_lesion || '—'}</td>
                          <td style={{ padding: '10px 10px', color: 'var(--fog)' }}>{l.mecanismo || '—'}</td>
                          <td style={{ padding: '10px 10px' }}>
                            <span style={{ fontFamily: 'DM Mono,monospace', fontWeight: 800, fontSize: 14, color: d > 30 ? '#ef4444' : d > 14 ? '#f59e0b' : '#22c55e' }}>{d}</span>
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${estCol}18`, color: estCol, fontWeight: 700, border: `1px solid ${estCol}44` }}>
                              {l.activa ? 'ACTIVO' : 'ALTA'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionBox>
        </div>
      )})()}

      {/* ═══════ READAPTACIÓN ═══════ */}
      {!loading && subTab === 'readaptacion' && (
        <div>
          <p style={{ fontSize: 12, color: 'var(--silver)', marginBottom: 16 }}>Solo lesionados activos · Clic para expandir</p>

          {/* Phase filter buttons */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20, fontSize: 10 }}>
            <span style={{ color: 'var(--fog)', fontWeight: 600, textTransform: 'uppercase', padding: '6px 0', marginRight: 6 }}>Fases:</span>
            {FASES.map(f => {
              const count = activas.filter(l => l.fase === f.key).length
              return (
                <span key={f.key} style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${f.color}44`, color: f.color, background: `${f.color}11`,
                }}>{f.short} {f.label} {count > 0 && `(${count})`}</span>
              )
            })}
          </div>

          {activas.length === 0 ? (
            <p style={{ color: 'var(--fog)', textAlign: 'center', padding: 40 }}>✓ Sin jugadores en enfermería.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {activas.map(l => (
                <ReadaptacionCard key={l.id} lesion={l} checks={readapChecks.find(r => r.lesion_id === l.id)}
                  onUpdateFase={(fase: string) => updateLesion(l.id, { fase })}
                  onSaveChecks={(c: any) => saveChecks(l.id, c)}
                  onDarAlta={() => updateLesion(l.id, { activa: false })}
                  diasBaja={diasBaja(l)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ VISTA PROFES ═══════ */}
      {!loading && subTab === 'profes' && (
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--silver)', marginBottom: 4 }}>Lesionados activos · Lo que puede hacer cada jugador esta semana</p>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20, marginTop: 12 }}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#ef4444', fontFamily: 'DM Mono,monospace' }}>{activas.length}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase' }}>Lesionados Activos</div>
            </div>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#22c55e', fontFamily: 'DM Mono,monospace' }}>
                {activas.filter(l => ['F4 - Reducido sin contacto', 'F5 - Intermitente box2box', 'F6 - Con categoría'].includes(l.fase || '')).length}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase' }}>En Fase Avanzada (F4+)</div>
            </div>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#94a3b8', fontFamily: 'DM Mono,monospace' }}>
                {activas.filter(l => ['F0 - Solo kinesio', 'F1 - Ind. sin balón'].includes(l.fase || '')).length}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase' }}>Solo Kinesio (F0-F1)</div>
            </div>
          </div>

          {activas.length === 0 ? (
            <p style={{ color: 'var(--fog)', textAlign: 'center', padding: 40 }}>✓ Sin jugadores en enfermería.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {activas.map(l => {
                const checks = readapChecks.find(r => r.lesion_id === l.id)
                const faseInfo = FASE_MAP[l.fase] || FASES[0]
                const d = diasBaja(l)
                return (
                  <div key={l.id} style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 14, padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--snow)' }}>{l.jugador_nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--fog)' }}>
                          {l.posicion} · {l.region_corporal || l.zona || '—'} · {l.lateralidad || ''} · {l.tipo_lesion || ''}
                        </div>
                        <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>{d}d para alta</div>
                      </div>
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 6, fontWeight: 700, color: faseInfo.color, background: `${faseInfo.color}18`, border: `1px solid ${faseInfo.color}44` }}>
                        {faseInfo.short} - {faseInfo.label}
                      </span>
                    </div>
                    {/* Activity grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {ACTIVIDADES.map(act => {
                        const status = checks?.[act.key] || 'pendiente'
                        const st = STATUS_COLORS[status] || STATUS_COLORS.pendiente
                        return (
                          <div key={act.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: st.bg }}>
                            <span style={{ fontSize: 14 }}>{act.icon}</span>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: st.text }}>{act.label}</div>
                              <div style={{ fontSize: 10, color: st.text, opacity: 0.7 }}>
                                {status === 'ok' ? 'Puede' : status === 'cuidado' ? 'Con cuidado' : status === 'no_puede' ? 'No puede' : '—'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {checks?.nota_kinesio && (
                      <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', fontSize: 11, color: '#fca5a5' }}>
                        ⚠ <strong>Nota del kinesiólogo:</strong> {checks.nota_kinesio}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════ NUEVA LESIÓN ═══════ */}
      {!loading && subTab === 'nueva' && (
        <NewLesionFormEnf teamData={teamData} onSuccess={() => { setSubTab('dashboard'); load(); onRefresh() }} />
      )}
    </div>
  )
}

// ─── Readaptación Card ────────────────────────────────────────────────────────
function ReadaptacionCard({ lesion: l, checks, onUpdateFase, onSaveChecks, onDarAlta, diasBaja }: {
  lesion: any; checks: any; onUpdateFase: (f: string) => void; onSaveChecks: (c: any) => void; onDarAlta: () => void; diasBaja: number
}) {
  const [open, setOpen] = useState(false)
  const [localChecks, setLocalChecks] = useState<any>(checks || {})
  const [nota, setNota] = useState(checks?.nota_kinesio || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalChecks(checks || {})
    setNota(checks?.nota_kinesio || '')
  }, [checks])

  const faseInfo = FASE_MAP[l.fase] || FASES[0]

  const cycleStatus = (key: string) => {
    const order = ['pendiente', 'ok', 'cuidado', 'no_puede']
    const current = localChecks[key] || 'pendiente'
    const next = order[(order.indexOf(current) + 1) % order.length]
    setLocalChecks((p: any) => ({ ...p, [key]: next }))
  }

  const save = async () => {
    setSaving(true)
    await onSaveChecks({ ...localChecks, nota_kinesio: nota || null })
    setSaving(false)
  }

  return (
    <div style={{ background: 'var(--ink2)', border: `1px solid ${open ? faseInfo.color + '44' : 'var(--mist)'}`, borderRadius: 14, overflow: 'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--snow)' }}>{l.jugador_nombre}</div>
          <div style={{ fontSize: 10, color: 'var(--fog)' }}>
            {l.posicion} · {l.region_corporal || l.zona || '—'} · {l.lateralidad || ''} · {diasBaja}d est.
          </div>
        </div>
        <span style={{ fontSize: 10, padding: '5px 12px', borderRadius: 6, fontWeight: 700, color: faseInfo.color, background: `${faseInfo.color}18`, border: `1px solid ${faseInfo.color}44`, whiteSpace: 'nowrap' }}>
          {faseInfo.short} - {faseInfo.label.toUpperCase()}
        </span>
        {l.eta_dias && <div style={{ textAlign: 'right', minWidth: 40 }}><div className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{l.eta_dias}d</div></div>}
        <span style={{ color: 'var(--fog)', fontSize: 14, display: 'inline-block', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--mist)' }}>
          {/* Activity grid with clickable toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 14 }}>
            {ACTIVIDADES.map(act => {
              const status = localChecks[act.key] || 'pendiente'
              const st = STATUS_COLORS[status]
              return (
                <button key={act.key} onClick={() => cycleStatus(act.key)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
                  border: `1px solid ${st.text}44`, background: st.bg, transition: 'all .15s',
                }}>
                  <span style={{ fontSize: 18 }}>{act.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--silver)' }}>{act.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: st.text }}>{st.label}</span>
                </button>
              )
            })}
          </div>

          {/* Kinesio note */}
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--silver)', textTransform: 'uppercase', marginBottom: 4 }}>Nota para el profe</label>
            <input className="wp-input" value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: Cuidado con cambios de dirección bruscos..." style={{ fontSize: 12, padding: '8px 12px' }} />
          </div>

          {/* Phase selector + save */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'end', marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--silver)', textTransform: 'uppercase', marginBottom: 4 }}>Fase</label>
              <select className="wp-input" style={{ padding: '8px 12px', fontSize: 12, appearance: 'none' }} value={l.fase || FASES[0].key} onChange={e => onUpdateFase(e.target.value)}>
                {FASES.map(f => <option key={f.key} value={f.key} style={{ background: 'var(--ink2)' }}>{f.short} - {f.label}</option>)}
              </select>
            </div>
            <button className="btn-lime" style={{ fontSize: 12, padding: '8px 18px' }} onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px', color: '#4ade80', borderColor: 'rgba(34,197,94,.3)' }} onClick={onDarAlta}>✓ Alta</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Enhanced New Lesion Form ─────────────────────────────────────────────────
// Helper component (defined outside to prevent re-render focus loss)
const LabelField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
)

function NewLesionFormEnf({ teamData, onSuccess }: { teamData: any[]; onSuccess: () => void }) {
  const [f, setF] = useState({
    jugador_id: '', fecha_inicio: new Date().toISOString().split('T')[0],
    tipo_lesion: 'Desgarro Muscular', region_corporal: '', zona: '', lateralidad: 'Bilateral',
    mecanismo: '', descripcion: '', eta_dias: '', fase: 'F0 - Solo kinesio',
    recurrente: false, causa: '',
  })
  const [loading, setLoading] = useState(false)
  const set = (k: string, v: any) => setF(p => ({ ...p, [k]: v }))

  async function submit(e: any) {
    e.preventDefault()
    if (!f.jugador_id) return
    setLoading(true)
    try {
      await fetch('/api/lesiones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f, jugador_id: Number(f.jugador_id),
          eta_dias: f.eta_dias ? Number(f.eta_dias) : null,
          estado: 'Tratamiento',
        }),
      })
      onSuccess()
    } finally { setLoading(false) }
  }


  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 14, padding: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏥 Nueva Lesión</p>
      <form onSubmit={submit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
          <LabelField label="Jugador">
            <select className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.jugador_id} onChange={e => set('jugador_id', e.target.value)} required>
              <option value="">— Seleccionar —</option>
              {teamData.map(p => <option key={p.jugador_id} value={p.jugador_id}>{p.nombre}</option>)}
            </select>
          </LabelField>
          <LabelField label="Fecha inicio">
            <input type="date" className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} />
          </LabelField>
          <LabelField label="Tipo de lesión">
            <select className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.tipo_lesion} onChange={e => set('tipo_lesion', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </LabelField>
          <LabelField label="Región corporal">
            <select className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.region_corporal} onChange={e => set('region_corporal', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </LabelField>
          <LabelField label="Lateralidad">
            <select className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.lateralidad} onChange={e => set('lateralidad', e.target.value)}>
              {LATERALIDADES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </LabelField>
          <LabelField label="Mecanismo">
            <select className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.mecanismo} onChange={e => set('mecanismo', e.target.value)}>
              <option value="">— Seleccionar —</option>
              {MECANISMOS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </LabelField>
          <LabelField label="Zona específica">
            <input className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.zona} onChange={e => set('zona', e.target.value)} placeholder="ej: Isquiotibial derecho" />
          </LabelField>
          <LabelField label="ETA (días)">
            <input type="number" className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.eta_dias} onChange={e => set('eta_dias', e.target.value)} placeholder="ej: 21" />
          </LabelField>
          <LabelField label="Fase inicial">
            <select className="wp-input" style={{ padding: '8px 12px', fontSize: 13 }} value={f.fase} onChange={e => set('fase', e.target.value)}>
              {FASES.map(fa => <option key={fa.key} value={fa.key}>{fa.short} - {fa.label}</option>)}
            </select>
          </LabelField>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <LabelField label="Descripción / Observaciones">
            <input className="wp-input" value={f.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Detalles adicionales..." />
          </LabelField>
          <LabelField label="Causa">
            <input className="wp-input" value={f.causa} onChange={e => set('causa', e.target.value)} placeholder="Mecanismo detallado..." />
          </LabelField>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--silver)', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.recurrente} onChange={e => set('recurrente', e.target.checked)} /> Lesión recurrente
          </label>
        </div>
        <button type="submit" className="btn-lime" style={{ width: '100%', fontSize: 14, padding: '12px 0' }} disabled={loading || !f.jugador_id}>
          {loading ? 'Registrando...' : 'Registrar Lesión →'}
        </button>
      </form>
    </div>
  )
}
