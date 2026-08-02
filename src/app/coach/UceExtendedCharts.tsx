'use client'
import React from 'react'
import { CuadroHeader } from './Headers'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

export function UceSemanalKPI({ uceSemanal }: { uceSemanal: number }) {
  const refUce = 9500
  const ratio = uceSemanal / refUce
  const pct = Math.round(ratio * 100)
  
  let color = '#22c55e' // verde
  if (ratio >= 1.5) {
    color = '#ef4444' // rojo
  } else if (ratio >= 1.2) {
    color = '#f59e0b' // naranja
  }

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <CuadroHeader title="CARGA UCE SEMANAL" subtitle="Sumatoria UCE del Microciclo actual" icon="⚡" />
      <div style={{ marginTop: 20, position: 'relative' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
           <div style={{ fontSize: 13, color: 'var(--silver)', fontWeight: 600 }}>Total UCE Semana</div>
           <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
             <span style={{ fontSize: 22, fontWeight: 900, color: color }}>{uceSemanal.toLocaleString()}</span>
             <span style={{ fontSize: 16, fontWeight: 800, color: color }}>{ratio.toFixed(2)} ({pct}%)</span>
           </div>
         </div>
         <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 6 }} />
            {pct > 100 && (
               <div style={{ position: 'absolute', top: 0, left: '100%', width: `${Math.min(pct - 100, 100)}%`, height: '100%', background: 'rgba(239, 68, 68, 0.8)', borderLeft: '2px solid var(--ink)' }} />
            )}
            <div style={{ position: 'absolute', left: '100%', transform: 'translateX(-100%)', top: 0, width: 2, height: '100%', background: 'rgba(255,255,255,0.5)' }} />
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 11, color: 'var(--silver)', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
            <div style={{ flex: 1 }}>REFERENCIA (9,500 UCE/SEMANA):</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
               <div style={{ color: '#22c55e', display: 'flex', alignItems:'center', gap:4 }}><span style={{width:6,height:6,borderRadius:3,background:'#22c55e'}}></span> &lt;1.2 (&lt;120%) Recuperación (R)</div>
               <div style={{ color: '#f59e0b', display: 'flex', alignItems:'center', gap:4 }}><span style={{width:6,height:6,borderRadius:3,background:'#f59e0b'}}></span> 1.2–1.5 (120-150%) Mantenimiento (M)</div>
               <div style={{ color: '#ef4444', display: 'flex', alignItems:'center', gap:4 }}><span style={{width:6,height:6,borderRadius:3,background:'#ef4444'}}></span> &gt;1.5 (&gt;150%) Carga alta (CA)</div>
            </div>
         </div>
      </div>
    </div>
  )
}

const MesocicloLabel = (props: any) => {
  const { x, y, width, value } = props
  if (value == null || value === 0) return null
  const ref = 36000 // 4 partidos en el Mesociclo
  const ratio = value / ref
  const pct = Math.round(ratio * 100)
  
  let color = '#38bdf8' // celeste
  let textLabel = 'BAJA CARGA'
  if (pct >= 100 && pct <= 150) {
    color = '#22c55e' // verde
    textLabel = 'MANTENIMIENTO'
  } else if (pct > 150) {
    color = '#ef4444' // rojo
    textLabel = 'CARGA ALTA'
  }

  const w = 120;
  const h = 50;

  return (
    <foreignObject x={x + width / 2 - w / 2} y={y - h - 5} width={w} height={h} style={{ overflow: 'visible' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
           <span style={{ fontSize: 13, fontWeight: 900, color: '#facc15' }}>{value.toLocaleString()}</span>
           <span style={{ fontSize: 10, fontWeight: 900, color: color, border: `2px solid ${color}`, borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pct}%</span>
        </div>
        <div style={{ fontSize: 8, fontWeight: 900, color: color, padding: '3px 8px', borderRadius: 12, border: `1px solid ${color}`, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 4, height: 4, borderRadius: 2, background: color }}></span>
          {textLabel}
        </div>
      </div>
    </foreignObject>
  )
}

export function UceMesocicloChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <CuadroHeader title="CARGA MESOCICLO" subtitle="Suma de UCE por mes" icon="📅" />
      <div style={{ height: 260, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 70, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--border)', borderRadius:8 }} />
            <Bar dataKey="uce_total" name="UCE Total" radius={[4,4,0,0]} maxBarSize={100}>
              <LabelList dataKey="uce_total" content={<MesocicloLabel />} />
              {data.map((entry, index) => {
                const pct = Math.round((entry.uce_total / 36000) * 100)
                let barColor = 'rgba(56, 189, 248, 0.7)'
                if (pct >= 100 && pct <= 150) barColor = 'rgba(34, 197, 94, 0.7)'
                else if (pct > 150) barColor = 'rgba(239, 68, 68, 0.7)'
                return <Cell key={index} fill={barColor} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 11, fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(56, 189, 248, 0.7)' }}></span>
          <span style={{ color: 'var(--silver)' }}>&lt; 100% BAJA CARGA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(34, 197, 94, 0.7)' }}></span>
          <span style={{ color: 'var(--silver)' }}>100-150% MANTENIMIENTO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239, 68, 68, 0.7)' }}></span>
          <span style={{ color: 'var(--silver)' }}>&gt; 150% CARGA ALTA</span>
        </div>
      </div>
    </div>
  )
}

const SemanalLabel = (props: any) => {
  const { x, y, width, value } = props
  if (value == null || value === 0) return null
  const ref = 9500
  const ratio = value / ref
  const pct = Math.round(ratio * 100)
  
  let color = '#38bdf8' // celeste
  let textLabel = 'BAJA CARGA'
  if (pct >= 100 && pct <= 150) {
    color = '#22c55e' // verde
    textLabel = 'MANTENIMIENTO'
  } else if (pct > 150) {
    color = '#ef4444' // rojo
    textLabel = 'CARGA ALTA'
  }

  const w = 120;
  const h = 50;

  return (
    <foreignObject x={x + width / 2 - w / 2} y={y - h - 5} width={w} height={h} style={{ overflow: 'visible' }}>
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
           <span style={{ fontSize: 13, fontWeight: 900, color: '#facc15' }}>{value.toLocaleString()}</span>
           <span style={{ fontSize: 10, fontWeight: 900, color: color, border: `2px solid ${color}`, borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pct}%</span>
        </div>
        <div style={{ fontSize: 8, fontWeight: 900, color: color, padding: '3px 8px', borderRadius: 12, border: `1px solid ${color}`, letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 4, height: 4, borderRadius: 2, background: color }}></span>
          {textLabel}
        </div>
      </div>
    </foreignObject>
  )
}

export function UceSemanalChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <CuadroHeader title="CARGA UCE SEMANAL" subtitle="Evolución semanal de carga" icon="⚡" />
      <div style={{ height: 260, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 70, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--border)', borderRadius:8 }} />
            <Bar dataKey="uce_total" name="UCE Semanal" radius={[4,4,0,0]} maxBarSize={40}>
              <LabelList dataKey="uce_total" content={<SemanalLabel />} />
              {data.map((entry, index) => {
                const pct = Math.round((entry.uce_total / 9500) * 100)
                let barColor = 'rgba(56, 189, 248, 0.7)'
                if (pct >= 100 && pct <= 150) barColor = 'rgba(34, 197, 94, 0.7)'
                else if (pct > 150) barColor = 'rgba(239, 68, 68, 0.7)'
                return <Cell key={index} fill={barColor} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 12, fontSize: 11, fontWeight: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(56, 189, 248, 0.7)' }}></span>
          <span style={{ color: 'var(--silver)' }}>&lt; 100% BAJA CARGA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(34, 197, 94, 0.7)' }}></span>
          <span style={{ color: 'var(--silver)' }}>100-150% MANTENIMIENTO</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(239, 68, 68, 0.7)' }}></span>
          <span style={{ color: 'var(--silver)' }}>&gt; 150% CARGA ALTA</span>
        </div>
      </div>
    </div>
  )
}

