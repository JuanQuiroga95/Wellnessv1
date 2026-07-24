'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Calendar, CheckCircle2, ChevronRight, Activity, X } from 'lucide-react'
import { PanelHeader, Icons } from './Headers'

// ─── Constants ────────────────────────────────────────────────────────────────
const FASES = [
  { key: 'F1 - Rec. Funcional',    short: 'F1', label: 'Rec. Funcional',    color: '#94a3b8' },
  { key: 'F2 - Pre-optimización',  short: 'F2', label: 'Pre-optimización',  color: '#f87171' },
  { key: 'F3 - Campo',             short: 'F3', label: 'Campo',              color: '#fbbf24' },
  { key: 'F4 - RTTr',              short: 'F4', label: 'RTTr',               color: '#34d399' },
  { key: 'F5 - RTP',               short: 'F5', label: 'RTP',                color: '#22c55e' },
]
const FASE_MAP: Record<string,typeof FASES[0]> = {}
FASES.forEach(f => { FASE_MAP[f.key] = f })

const ACTIVIDADES = [
  { key: 'control_dolor',    label: 'Control del Dolor',       icon: '💊', desc: 'Terapia manual y agentes físicos' },
  { key: 'movilidad_rom',    label: 'Movilidad / ROM',          icon: '🔄', desc: 'Recuperar rangos de movimiento completos' },
  { key: 'activacion_iso',   label: 'Activación Muscular',      icon: '💪', desc: 'Isométricos de baja carga — evitar atrofia' },
  { key: 'fuerza_base',      label: 'Fuerza de Base',           icon: '🏋️', desc: 'Trabajo hipertrófico + estabilidad de core' },
  { key: 'propiocepcion',    label: 'Propiocepción',            icon: '⚖️', desc: 'Equilibrio y reentrenamiento articular (SNC)' },
  { key: 'saltos_bipodales', label: 'Saltos Bipodales',         icon: '⬆️', desc: 'Impacto controlado con dos piernas' },
  { key: 'carrera_lineal',   label: 'Carrera Lineal',           icon: '🏃', desc: 'Trote suave → cambios de ritmo progresivos' },
  { key: 'cambios_dir',      label: 'Cambios de Dirección',     icon: '↩️', desc: 'Giros, frenadas y desplazamientos laterales' },
  { key: 'tecnica_ind',      label: 'Técnica Individual',       icon: '⚽', desc: 'Pases cortos y conducción sin oposición' },
  { key: 'sin_contacto',     label: 'Sin Contacto',             icon: '👥', desc: 'Rondos y posesión con peto diferenciado' },
  { key: 'carga_gps',        label: 'Carga GPS Controlada',     icon: '📊', desc: 'Monitoreo de volumen de carrera con GPS' },
  { key: 'sim_fatiga',       label: 'Simulación de Fatiga',     icon: '🔋', desc: 'Gestos técnicos bajo estado de cansancio' },
  { key: 'criterio_fuerza',  label: 'Fuerza < 10% diferencia', icon: '⚡', desc: 'Test isocinético: pierna lesionada vs sana' },
  { key: 'criterio_saltos',  label: 'Jump Tests OK',            icon: '🦘', desc: 'Valores similares a test de pre-temporada' },
  { key: 'criterio_tampa',   label: 'Escala Tampa OK',          icon: '🧠', desc: 'Confianza psicológica — sin kinesiofobia' },
]

const FASE_ACTIVIDADES: Record<string, string[]> = {
  'F1 - Rec. Funcional':   ['control_dolor', 'movilidad_rom', 'activacion_iso'],
  'F2 - Pre-optimización': ['fuerza_base', 'propiocepcion', 'saltos_bipodales'],
  'F3 - Campo':            ['carrera_lineal', 'cambios_dir', 'tecnica_ind'],
  'F4 - RTTr':             ['sin_contacto', 'carga_gps', 'sim_fatiga'],
  'F5 - RTP':              ['criterio_fuerza', 'criterio_saltos', 'criterio_tampa'],
}

const SPRINT_NIVELES = [
  { nivel: 1, short: 'N1', label: 'Trote',              desc: 'Sin dolor, marcha normal — inicio post-dolor',         color: '#fbbf24' },
  { nivel: 2, short: 'N2', label: 'Intervalos 60–70%',  desc: 'Ciclos de contracción-relajación más rápidos',          color: '#fb923c' },
  { nivel: 3, short: 'N3', label: 'Sprint 80–90%',      desc: 'Línea recta, aceleración gradual, deceleración larga',  color: '#f87171' },
  { nivel: 4, short: 'N4', label: 'Sprint Máximo 100%', desc: 'Sin miedo al movimiento — listo para avanzar a F4',    color: '#ef4444' },
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

  async function deleteLesion(id: number) {
    if (!confirm('🚨 ¿Estás seguro de que querés ELIMINAR esta lesión?')) return
    await fetch(`/api/lesiones?id=${id}`, { method: 'DELETE' })
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
        <PanelHeader 
          icon={Icons.medico} 
          title="ENFERMERÍA" 
          subtitle="MÉDICO" 
          description="Dpto. Médico · Control y seguimiento de lesiones" 
          color="#a855f7" 
        />
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--mist)', paddingBottom: 2 }}>
        {[
          { key: 'dashboard' as SubTab, label: 'Dashboard' },
          { key: 'readaptacion' as SubTab, label: 'Readaptación' },
          { key: 'profes' as SubTab, label: 'Vista Profes' },
          { key: 'nueva' as SubTab, label: '+ Nueva lesión' },
        ].map(t => (
          <button className="hover-scale" key={t.key} onClick={() => setSubTab(t.key)} style={{
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
          <div style={{ background: 'linear-gradient(135deg, #0a1a0f 0%, #0f2518 40%, #0a1a10 100%)', border: '1px solid rgba(34,197,94,.15)', borderRadius: 16, padding: '32px 36px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 1px 1px, #22c55e 1px, transparent 0)', backgroundSize: '24px 24px' }} />
            <div style={{ position: 'relative', display: 'flex', gap: 24, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
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
              {/* W&P Logo */}
              <div style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 16, background: 'rgba(163,230,53,.08)', border: '1px solid rgba(163,230,53,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32, fontWeight: 900, color: '#a3e635', fontFamily: 'DM Mono,monospace' }}>W&P</span>
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
                      {/* Y label */}
                      <text x={10} y={p.t + pH / 2} textAnchor="middle" fontSize="8" fill="var(--fog)" transform={`rotate(-90,10,${p.t + pH / 2})`}>Vuelta de jugadores</text>
                    </svg>
                  </div>
                )
              })()}
            </SectionBox>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="hover-scale" onClick={() => setSubTab('nueva')} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              background: 'rgba(163,230,53,.08)', border: '1px solid rgba(163,230,53,.25)', cursor: 'pointer',
              color: '#a3e635', fontSize: 13, fontWeight: 700,
            }}>+ Nuevo Registro de Lesión</button>
            <button className="hover-scale" onClick={() => setSubTab('readaptacion')} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10,
              background: 'rgba(96,165,250,.06)', border: '1px solid rgba(96,165,250,.2)', cursor: 'pointer',
              color: '#60a5fa', fontSize: 13, fontWeight: 700,
            }}>🔄 Ver Readaptación</button>
            <button className="hover-scale" onClick={() => setSubTab('profes')} style={{
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
                <button className="hover-scale" key={v} onClick={() => setRegistroView(v)} style={{
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
                <table className="wp-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--mist)' }}>
                      {['Jugador', 'Fecha', 'Región', 'Tipo', 'Mecanismo', 'Días', 'Estado', ''].map(h => (
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
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: `${estCol}18`, color: estCol, fontWeight: 700, border: `1px solid ${estCol}44`, display: 'inline-block', textAlign: 'center', width: 'fit-content' }}>
                                {l.activa ? 'ACTIVO' : 'ALTA'}
                              </span>
                              {l.activa && (
                                <div style={{ display: 'flex', gap: 2, width: 70 }}>
                                  {FASES.map((f, i) => {
                                    const fIdx = FASES.findIndex(x => x.key === l.fase)
                                    const currentIdx = fIdx >= 0 ? fIdx : 0
                                    const isPast = i <= currentIdx
                                    return <div key={i} title={f.short} style={{ flex: 1, height: 4, borderRadius: 1, background: isPast ? f.color : 'var(--mist)', opacity: i === currentIdx ? 1 : isPast ? 0.6 : 0.2 }} />
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                            <button className="hover-scale" onClick={() => deleteLesion(l.id)} style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', fontSize:14, opacity:0.8, padding:'4px 8px' }} title="Eliminar lesión">🗑️</button>
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
                  onDelete={() => deleteLesion(l.id)}
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
                {activas.filter(l => ['F4 - RTTr', 'F5 - RTP'].includes(l.fase || '')).length}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase' }}>En Fase Avanzada (F4–F5)</div>
            </div>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#94a3b8', fontFamily: 'DM Mono,monospace' }}>
                {activas.filter(l => ['F1 - Rec. Funcional', 'F2 - Pre-optimización'].includes(l.fase || '')).length}
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase' }}>Fase Clínica (F1–F2)</div>
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
        <NewLesionFormEnf teamData={teamData} onCancel={() => setSubTab('dashboard')} onSuccess={() => { 
          setSubTab('dashboard'); 
          setFilterTipo('all');
          setFilterEstado('all');
          setFilterRegion('all');
          load(); 
          onRefresh();
        }} />
      )}
    </div>
  )
}

// ─── Readaptación Card ────────────────────────────────────────────────────────
function ReadaptacionCard({ lesion: l, checks, onUpdateFase, onSaveChecks, onDarAlta, onDelete, diasBaja }: {
  lesion: any; checks: any; onUpdateFase: (f: string) => void; onSaveChecks: (c: any) => void; onDarAlta: () => void; onDelete: () => void; diasBaja: number
}) {
  const [open, setOpen] = useState(false)
  const [localChecks, setLocalChecks] = useState<any>(checks?.checks_data || {})
  const [nota, setNota] = useState(checks?.nota_kinesio || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalChecks(checks?.checks_data || {})
    setNota(checks?.nota_kinesio || '')
  }, [checks])

  const faseIdx = FASES.findIndex(f => f.key === l.fase)
  const faseInfo = faseIdx >= 0 ? FASES[faseIdx] : FASES[0]
  const currentFaseActs = FASE_ACTIVIDADES[faseInfo.key] || []
  const sprintNivel = Number(localChecks.sprint_nivel) || 0
  const sprintOk = faseInfo.key !== 'F3 - Campo' || sprintNivel >= 4
  const faseCompleta = (currentFaseActs.length === 0 || currentFaseActs.every(k => localChecks[k] === 'ok')) && sprintOk
  const isLastFase = faseIdx === FASES.length - 1
  const isFirstFase = faseIdx === 0

  const cycleStatus = (key: string) => {
    const order = ['pendiente', 'ok', 'cuidado', 'no_puede']
    const current = localChecks[key] || 'pendiente'
    setLocalChecks((p: any) => ({ ...p, [key]: order[(order.indexOf(current) + 1) % order.length] }))
  }

  const save = async () => {
    setSaving(true)
    await onSaveChecks({ checks_data: localChecks, nota_kinesio: nota || null })
    setSaving(false)
  }

  return (
    <div style={{ background: 'var(--ink2)', border: `1px solid ${open ? faseInfo.color + '44' : 'var(--mist)'}`, borderRadius: 14, overflow: 'hidden' }}>
      {/* ── Header ── */}
      <button className="hover-scale" onClick={() => setOpen(!open)} style={{
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
          {faseInfo.short} — {faseInfo.label.toUpperCase()}
        </span>
        {faseCompleta && !isLastFase && (
          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 700, color: '#a3e635', background: 'rgba(163,230,53,.12)', border: '1px solid rgba(163,230,53,.3)', whiteSpace: 'nowrap' }}>
            ✓ Listo
          </span>
        )}
        {l.eta_dias && <div style={{ textAlign: 'right', minWidth: 40 }}><div className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{l.eta_dias}d</div></div>}
        <span style={{ color: 'var(--fog)', fontSize: 14, display: 'inline-block', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>

      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--mist)' }}>

          {/* ── Barra de progreso de fases ── */}
          <div style={{ margin: '18px 0 22px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 13, left: '3%', right: '3%', height: 2, background: 'var(--mist)', zIndex: 0 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
              {FASES.map((f, i) => {
                const isPast = i < faseIdx
                const isCurrent = i === faseIdx
                const dotColor = isPast ? '#22c55e' : isCurrent ? f.color : '#334155'
                const textColor = isPast ? '#22c55e' : isCurrent ? f.color : '#475569'
                return (
                  <div key={f.key} onClick={() => onUpdateFase(f.key)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <div style={{
                      width: isCurrent ? 28 : 22, height: isCurrent ? 28 : 22, borderRadius: '50%',
                      background: dotColor, border: `2px solid ${dotColor}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: 'white',
                      boxShadow: isCurrent ? `0 0 0 4px ${f.color}33` : 'none',
                      transition: 'all .2s',
                    }}>
                      {isPast ? '✓' : f.short}
                    </div>
                    <span style={{ fontSize: 8, fontWeight: isCurrent ? 700 : 400, color: textColor, textAlign: 'center', lineHeight: 1.2, maxWidth: 46 }}>
                      {f.label}
                      {l.fase_historial?.[f.key] && (
                        <div style={{ color: 'var(--silver)', fontSize: 7, marginTop: 3, fontFamily: 'DM Mono,monospace' }}>
                          {l.fase_historial[f.key].split('-').slice(1).join('/')}
                        </div>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Actividades de la fase actual ── */}
          {currentFaseActs.length === 0 ? (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(148,163,184,.06)', border: '1px solid rgba(148,163,184,.15)', fontSize: 12, color: 'var(--silver)', marginBottom: 14 }}>
              Fase exclusiva de kinesiólogo — Sin actividades de campo requeridas.
            </div>
          ) : (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Actividades {faseInfo.short} · Clic para cambiar estado
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${currentFaseActs.length === 1 ? 1 : 2}, 1fr)`, gap: 8 }}>
                {currentFaseActs.map(key => {
                  const act = ACTIVIDADES.find(a => a.key === key)!
                  const status = localChecks[key] || 'pendiente'
                  const st = STATUS_COLORS[status]
                  return (
                    <button className="hover-scale" key={key} onClick={() => cycleStatus(key)} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderRadius: 10, cursor: 'pointer', border: `1px solid ${st.text}44`,
                      background: st.bg, transition: 'all .15s', textAlign: 'left',
                    }}>
                      <span style={{ fontSize: 24 }}>{act.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{act.label}</div>
                        {isLastFase && <div style={{ fontSize: 10, color: 'var(--silver)', marginTop: 2, lineHeight: 1.3 }}>{act.desc}</div>}
                        <div style={{ fontSize: 11, fontWeight: 700, color: st.text, marginTop: isLastFase ? 4 : 0 }}>
                          {isLastFase
                            ? (status === 'ok' ? '✓ Cumplido' : status === 'cuidado' ? '⚠ Parcial' : status === 'no_puede' ? '✕ No cumple' : '— Sin evaluar')
                            : (status === 'ok' ? '✓ Puede' : status === 'cuidado' ? '⚠ Con cuidado' : status === 'no_puede' ? '✕ No puede' : '— Pendiente')}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Progresión de Sprint (F3 only) ── */}
          {faseInfo.key === 'F3 - Campo' && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--fog)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Progresión de Sprint{sprintNivel > 0 ? ` · ${SPRINT_NIVELES[sprintNivel - 1].label}` : ' · Sin iniciar'}
              </p>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <div style={{ position: 'absolute', top: 14, left: '6%', right: '6%', height: 2, background: 'var(--mist)', zIndex: 0 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                  {SPRINT_NIVELES.map(sn => {
                    const isReached = sprintNivel >= sn.nivel
                    const isCurrent = sprintNivel === sn.nivel
                    const dotColor = isReached ? sn.color : '#334155'
                    return (
                      <div key={sn.nivel} onClick={() => setLocalChecks((p: any) => ({ ...p, sprint_nivel: sn.nivel }))}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <div style={{
                          width: isCurrent ? 30 : 22, height: isCurrent ? 30 : 22, borderRadius: '50%',
                          background: dotColor, border: `2px solid ${dotColor}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: 'white',
                          boxShadow: isCurrent ? `0 0 0 4px ${sn.color}33` : 'none',
                          transition: 'all .2s',
                        }}>
                          {isReached && !isCurrent ? '✓' : sn.short}
                        </div>
                        <span style={{ fontSize: 8, fontWeight: isCurrent ? 700 : 400, color: isReached ? sn.color : '#475569', textAlign: 'center', maxWidth: 54, lineHeight: 1.2 }}>
                          {sn.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
              {sprintNivel > 0 && (
                <div style={{ padding: '8px 14px', borderRadius: 8, background: `${SPRINT_NIVELES[sprintNivel - 1].color}12`, border: `1px solid ${SPRINT_NIVELES[sprintNivel - 1].color}30`, fontSize: 11, color: SPRINT_NIVELES[sprintNivel - 1].color }}>
                  {SPRINT_NIVELES[sprintNivel - 1].desc}
                </div>
              )}
              {sprintNivel < 4 && (
                <p style={{ fontSize: 10, color: 'var(--silver)', marginTop: 6 }}>
                  ⚠ Se requiere Sprint Máximo (N4) para avanzar a F4
                </p>
              )}
            </div>
          )}

          {/* ── Banner fase completa ── */}
          {faseCompleta && !isLastFase && (
            <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(163,230,53,.07)', border: '1px solid rgba(163,230,53,.25)', fontSize: 12, color: '#a3e635', fontWeight: 600, marginBottom: 14 }}>
              ✓ {faseInfo.short} completa — Listo para avanzar a {FASES[faseIdx + 1].short}: {FASES[faseIdx + 1].label}
            </div>
          )}

          {/* ── Banner alta médica (F5 RTP completa) ── */}
          {isLastFase && faseCompleta && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(34,197,94,.07)', border: '1px solid rgba(34,197,94,.3)', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: '#4ade80', fontWeight: 700 }}>🏆 Criterios de alta verificados — El jugador cumple el protocolo RTP completo</span>
              <button className="hover-scale" style={{ padding: '7px 18px', borderRadius: 8, background: '#22c55e', color: 'white', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }} onClick={onDarAlta}>
                Dar Alta
              </button>
            </div>
          )}

          {/* ── Nota kinesio ── */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--silver)', textTransform: 'uppercase', marginBottom: 4 }}>Nota para el profe</label>
            <input className="wp-input" value={nota} onChange={e => setNota(e.target.value)} placeholder="Ej: Cuidado con cambios de dirección bruscos..." style={{ fontSize: 12, padding: '8px 12px' }} />
          </div>

          {/* ── Navegación de fases + guardar ── */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px' }}
              onClick={() => !isFirstFase && onUpdateFase(FASES[faseIdx - 1].key)} disabled={isFirstFase}>
              ◀ {isFirstFase ? '—' : FASES[faseIdx - 1].short}
            </button>
            <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px',
                color: faseCompleta && !isLastFase ? '#a3e635' : 'var(--silver)',
                borderColor: faseCompleta && !isLastFase ? 'rgba(163,230,53,.4)' : 'var(--fog)',
              }}
              onClick={() => !isLastFase && onUpdateFase(FASES[faseIdx + 1].key)} disabled={isLastFase}>
              {isLastFase ? '— Final' : `${FASES[faseIdx + 1].short} ▶`}
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn-lime" style={{ fontSize: 12, padding: '8px 18px' }} onClick={save} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            {!isLastFase && (
              <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px', color: '#4ade80', borderColor: 'rgba(34,197,94,.3)' }} onClick={onDarAlta}>✓ Alta</button>
            )}
            <button className="btn-ghost" style={{ fontSize: 12, padding: '8px 14px', color: '#ef4444', borderColor: 'rgba(239,68,68,.3)' }} onClick={onDelete}>🗑️ Borrar</button>
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

function NewLesionFormEnf({ teamData, onSuccess, onCancel }: { teamData: any[]; onSuccess: () => void; onCancel?: () => void }) {
  const [f, setF] = useState({
    jugador_id: '', fecha_inicio: new Date().toISOString().split('T')[0],
    tipo_lesion: 'Desgarro Muscular', region_corporal: '', zona: '', lateralidad: 'Bilateral',
    mecanismo: '', descripcion: '', eta_dias: '', fase: 'F1 - Rec. Funcional',
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
    <div className="modal-backdrop">
      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#f87171', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏥 Nueva Lesión</p>
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
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button type="submit" className="btn-lime" style={{ flex: 1, fontSize: 14, padding: '12px 0' }} disabled={loading || !f.jugador_id}>
            {loading ? 'Registrando...' : 'Registrar Lesión →'}
          </button>
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
      </div>
    </div>
  )
}
