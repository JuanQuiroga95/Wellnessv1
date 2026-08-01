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
  const ref = 9500 * 5 // 5 semanas de pretemporada
  const ratio = value / ref
  const pct = Math.round(ratio * 100)
  const color = ratio < 1.2 ? '#4ade80' : ratio < 1.5 ? '#fbbf24' : '#f87171'

  return (
    <g transform={`translate(${x + width / 2},${y - 5})`}>
      <text x={0} y={-16} fill="#facc15" fontSize={11} fontWeight="bold" textAnchor="middle">{value.toLocaleString()}</text>
      <text x={0} y={-3} fill={color} fontSize={10} fontWeight="bold" textAnchor="middle">{pct}%</text>
    </g>
  )
}

export function UceMesocicloChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <CuadroHeader title="CARGA MESOCICLO (PRETEMPORADA)" subtitle="Suma de UCE de las primeras 5 semanas" icon="📅" />
      <div style={{ height: 260, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 40, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--border)', borderRadius:8 }} />
            <Bar dataKey="uce_total" name="UCE Total" radius={[4,4,0,0]} maxBarSize={100}>
              <LabelList dataKey="uce_total" content={<MesocicloLabel />} />
              {data.map((entry, index) => (
                <Cell key={index} fill="rgba(59, 130, 246, 0.7)" /> // Azul
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
  const color = ratio < 1.2 ? '#4ade80' : ratio < 1.5 ? '#fbbf24' : '#f87171'

  return (
    <g transform={`translate(${x + width / 2},${y - 5})`}>
      <text x={0} y={-16} fill="#facc15" fontSize={10} fontWeight="bold" textAnchor="middle">{value.toLocaleString()}</text>
      <text x={0} y={-3} fill={color} fontSize={9} fontWeight="bold" textAnchor="middle">{pct}%</text>
    </g>
  )
}

export function UceSemanalChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null

  return (
    <div style={{ background: 'var(--ink2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
      <CuadroHeader title="CARGA UCE SEMANAL" subtitle="Evolución semanal de carga" icon="⚡" />
      <div style={{ height: 260, marginTop: 20 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 40, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background:'var(--ink)', border:'1px solid var(--border)', borderRadius:8 }} />
            <Bar dataKey="uce_total" name="UCE Semanal" radius={[4,4,0,0]} maxBarSize={40}>
              <LabelList dataKey="uce_total" content={<SemanalLabel />} />
              {data.map((entry, index) => (
                <Cell key={index} fill="rgba(34, 197, 94, 0.7)" /> // Verde
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
