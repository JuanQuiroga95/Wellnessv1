'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  if (!payload[0]?.payload) return null
  const d = payload[0].payload
  const c = d.horas >= 8 ? '#22c55e' : d.horas >= 6 ? '#f59e0b' : d.horas > 0 ? '#ef4444' : '#2a2a2a'
  return (
    <div style={{ background:'var(--ink2)', border:`1px solid ${c}44`, borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--silver)', marginBottom:4, fontFamily:'DM Mono,monospace', fontSize:10 }}>{d.fecha}</div>
      <div style={{ color:c, fontFamily:'DM Mono,monospace', fontWeight:600, fontSize:16 }}>
        {d.horas > 0 ? `${d.horas.toFixed(1)} hs` : '—'}
      </div>
    </div>
  )
}

export default function SleepChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top:4, right:4, left:-22, bottom:0 }} barSize={12}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill:'#555', fontSize:9, fontFamily:'DM Mono,monospace' }} axisLine={false} tickLine={false} interval={3} />
        <YAxis domain={[0, 12]} tick={{ fill:'#555', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(0)} />
        <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,.03)' }} />
        <ReferenceLine y={8} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} opacity={.5} />
        <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} opacity={.5} />
        <Bar isAnimationActive={true} animationDuration={1000} dataKey="horas" radius={[3,3,0,0]}>
          {data.map((e,i) => (
            <Cell key={i} fill={e.horas >= 8 ? '#22c55e' : e.horas >= 6 ? '#f59e0b' : e.horas > 0 ? '#ef4444' : '#2a2a2a'} fillOpacity={.9} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
