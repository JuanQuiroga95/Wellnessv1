'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
const LINES = [
  { key:'fatiga', label:'Fatiga', color:'#f59e0b' },
  { key:'calidad_sueno', label:'Sueño', color:'#3b82f6' },
  { key:'dolor_muscular', label:'Dolor', color:'#ef4444' },
  { key:'nivel_estres', label:'Estrés', color:'#a855f7' },
  { key:'estado_animo', label:'Ánimo', color:'#22c55e' },
]
export default function WellnessTrend({ data }) {
  const sorted = [...data].sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(d=>({...d,label:d.fecha.slice(5)}))
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={sorted} margin={{ top:4, right:4, left:-22, bottom:0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)" vertical={false} />
        <XAxis dataKey="label" tick={{ fill:'#555', fontSize:9 }} axisLine={false} tickLine={false} />
        <YAxis domain={[1,5]} ticks={[1,2,3,4,5]} tick={{ fill:'#555', fontSize:9 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, fontSize:12 }} />
        <Legend wrapperStyle={{ fontSize:11, paddingTop:8 }} />
        {LINES.map(l => <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={1.5} dot={false} activeDot={{ r:3 }} />)}
      </LineChart>
    </ResponsiveContainer>
  )
}
