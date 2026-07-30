'use client'
import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function InBodyPlayerChart({ data }: { data: any[] }) {
  // Sort data chronologically (oldest to newest) for chart left-to-right flow
  const chartData = [...data].reverse().map(d => ({
    name: String(d.fecha).substring(0, 10),
    peso: Number(d.peso_kg),
    grasa: Number(d.pgc_pct),
    musculo: Number(d.mme_kg)
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <p style={{ color: 'var(--silver)', marginBottom: '8px', fontWeight: 600 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0', fontWeight: 700 }}>
              {entry.name}: {entry.value} {entry.name === 'Peso' || entry.name === 'Músculo' ? 'kg' : '%'}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={(v) => v.toFixed(0)} />
        <YAxis yAxisId="right" orientation="right" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
        
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,.05)', strokeWidth: 2 }} />
        <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--silver)' }} />

        <Line 
          yAxisId="left"
          name="Peso"
          isAnimationActive={true} 
          type="monotone" 
          dataKey="peso" 
          stroke="#3b82f6" 
          strokeWidth={3}
          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: 'var(--ink)' }}
          activeDot={{ r: 6, fill: '#3b82f6' }}
        />
        <Line 
          yAxisId="right"
          name="Grasa %"
          isAnimationActive={true} 
          type="monotone" 
          dataKey="grasa" 
          stroke="#f87171" 
          strokeWidth={3}
          dot={{ r: 4, fill: '#f87171', strokeWidth: 2, stroke: 'var(--ink)' }}
          activeDot={{ r: 6, fill: '#f87171' }}
        />
        <Line 
          yAxisId="left"
          name="Músculo"
          isAnimationActive={true} 
          type="monotone" 
          dataKey="musculo" 
          stroke="#a855f7" 
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ r: 3, fill: '#a855f7', strokeWidth: 1, stroke: 'var(--ink)' }}
          activeDot={{ r: 5, fill: '#a855f7' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
