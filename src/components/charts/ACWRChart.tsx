'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts'
const COL = { optimo:'#22c55e', precaucion:'#f59e0b', peligro:'#ef4444', sin_datos:'#2a2a2a' }
const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload; const c = COL[d.status]
  return <div style={{ background:'var(--ink2)', border:`1px solid ${c}44`, borderRadius:10, padding:'10px 14px', fontSize:12 }}><div style={{ color:'var(--silver)', marginBottom:4, fontFamily:'DM Mono,monospace', fontSize:10 }}>{d.date}</div><div style={{ color:c, fontFamily:'DM Mono,monospace', fontWeight:600, fontSize:16 }}>{d.ratio > 0 ? d.ratio.toFixed(2) : '—'}</div></div>
}
export default function ACWRChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top:4, right:4, left:-22, bottom:0 }} barSize={12}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill:'#555', fontSize:9, fontFamily:'DM Mono,monospace' }} axisLine={false} tickLine={false} interval={3} />
        <YAxis domain={[0,2]} tick={{ fill:'#555', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>v.toFixed(1)} />
        <Tooltip content={<Tip />} cursor={{ fill:'rgba(255,255,255,.03)' }} />
        <ReferenceLine y={0.8} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} opacity={.5} />
        <ReferenceLine y={1.3} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} opacity={.5} />
        <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} opacity={.5} />
        <Bar dataKey="ratio" radius={[3,3,0,0]}>{data.map((e,i) => <Cell key={i} fill={COL[e.status]} fillOpacity={.9} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
