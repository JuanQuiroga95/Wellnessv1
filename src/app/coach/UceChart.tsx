'use client'
import React from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'
import { CuadroHeader } from './Headers'

export default function UceChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null

  // Ensure data is sorted by typical MD order if needed, or it's already sorted.
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <p style={{ color: 'var(--snow)', marginBottom: '8px', fontWeight: 700 }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color, margin: '4px 0', fontWeight: 600 }}>
              {entry.name}: {entry.value} {entry.name.includes('RPE') && entry.value === null ? '(Sin datos)' : ''}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div style={{ marginBottom: 20, background: 'var(--ink2)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 16, overflow: 'hidden' }}>
      <CuadroHeader title="RESUMEN UCE VS RPE" subtitle="Gráfico combinado de Carga (UCE) y RPE" icon="📊" />
      <div style={{ padding: '20px' }}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="md" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
            
            <YAxis yAxisId="left" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} orientation="left" />
            <YAxis yAxisId="right" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} orientation="right" domain={[0, 10]} />
            
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--silver)' }} />

            <Bar yAxisId="left" dataKey="uce_real" name="UCE (Real)" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#f97316" /> // Naranja
              ))}
            </Bar>

            <Line yAxisId="right" type="monotone" dataKey="rpe_obj" name="RPE Objetivo" stroke="#2563eb" strokeWidth={3} dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: 'var(--ink)' }} activeDot={{ r: 6 }} />
            <Line yAxisId="right" type="monotone" dataKey="rpe_real" name="RPE Real" connectNulls stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'var(--ink)' }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
