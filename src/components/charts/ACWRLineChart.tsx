'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, ReferenceArea } from 'recharts'

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  if (!payload[0]?.payload) return null
  const d = payload[0].payload
  let statusColor = '#3b82f6'
  if (d.ratio < 0.8) statusColor = '#38bdf8'
  else if (d.ratio >= 0.8 && d.ratio < 1.3) statusColor = '#22c55e'
  else if (d.ratio >= 1.3 && d.ratio < 1.5) statusColor = '#f59e0b'
  else if (d.ratio >= 1.5) statusColor = '#ef4444'

  return (
    <div style={{ background:'var(--ink2)', border:`1px solid ${statusColor}44`, borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      <div style={{ color:'var(--silver)', marginBottom:4, fontFamily:'DM Mono,monospace', fontSize:10 }}>{d.name}</div>
      <div style={{ color:statusColor, fontFamily:'DM Mono,monospace', fontWeight:600, fontSize:16 }}>
        {d.ratio > 0 ? d.ratio.toFixed(2) : '—'}
      </div>
    </div>
  )
}

const CustomizedLabel = (props: any) => {
  const { x, y, value } = props;
  return (
    <text x={x} y={y} dy={-10} fill="var(--silver)" fontSize={10} fontFamily="DM Mono,monospace" textAnchor="middle">
      {value > 0 ? value.toFixed(2) : ''}
    </text>
  );
};

export default function ACWRLineChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis domain={[0.5, 1.8]} stroke="var(--fog)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v.toFixed(1)} />
        <Tooltip content={<Tip />} cursor={{ stroke:'rgba(255,255,255,.05)', strokeWidth: 2 }} />
        
        {/* Sweet Spot area */}
        <ReferenceArea y1={0.8} y2={1.3} fill="#22c55e" fillOpacity={0.08} />
        <ReferenceLine y={1.3} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
        <ReferenceLine y={0.8} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />

        <Line 
          isAnimationActive={true} 
          animationDuration={1000} 
          type="monotone" 
          dataKey="ratio" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: 'var(--ink)' }}
          activeDot={{ r: 6, fill: '#3b82f6' }}
          label={<CustomizedLabel />}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
