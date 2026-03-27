'use client'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const READINESS_COLOR = (total) => total <= 12 ? '#c8f135' : total <= 18 ? '#f59e0b' : '#ef4444'

function PlayerDot(props) {
  const { cx, cy, payload } = props
  const col = READINESS_COLOR(payload.wellness)
  const initials = (payload.nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <g>
      <circle cx={cx} cy={cy} r={18} fill={`${col}25`} stroke={col} strokeWidth={2}/>
      {payload.foto ? (
        <image href={payload.foto} x={cx-12} y={cy-12} width={24} height={24} clipPath={`circle(12px at 12px 12px)`} style={{ borderRadius:'50%' }}/>
      ) : (
        <text x={cx} y={cy+4} textAnchor="middle" fill={col} fontSize={10} fontWeight={700} fontFamily="DM Sans,sans-serif">{initials}</text>
      )}
    </g>
  )
}

const CustomTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const col = READINESS_COLOR(d.wellness)
  return (
    <div style={{ background:'var(--ink2)', border:`1px solid ${col}44`, borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      <p style={{ fontWeight:600, color:'var(--snow)', marginBottom:4 }}>{d.nombre}</p>
      <p style={{ color:'var(--silver)' }}>{d.posicion||'—'}</p>
      <p style={{ color:col }}>Wellness total: {d.wellness?.toFixed(1)}</p>
      <p style={{ color:'#60a5fa' }}>RPE prom: {d.rpe?.toFixed(1)}</p>
      {d.dolor !== undefined && <p style={{ color:'#f87171' }}>Dolor prom: {d.dolor?.toFixed(1)}</p>}
    </div>
  )
}

export default function ReadinessChart({ data, mode = 'wellness' }) {
  // mode: 'wellness' = RPE vs Wellness, 'dolor' = RPE vs Dolor
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top:20, right:20, left:-10, bottom:10 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.04)"/>
        <XAxis type="number" dataKey="rpe" name="RPE" domain={[0,10]} tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false} label={{ value:'RPE Promedio', position:'insideBottom', offset:-4, fill:'#555', fontSize:10 }}/>
        <YAxis type="number" dataKey={mode==='dolor'?'dolor':'wellness'} name={mode==='dolor'?'Dolor':'Wellness'}
          domain={mode==='dolor'?[1,5]:[5,25]}
          tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false}
          label={{ value: mode==='dolor'?'Dolor Promedio':'Wellness Total', angle:-90, position:'insideLeft', fill:'#555', fontSize:10 }}
        />
        <Tooltip content={<CustomTip />} cursor={{ fill:'rgba(255,255,255,.03)' }}/>
        {mode==='wellness' && (
          <>
            <ReferenceLine y={12} stroke="#c8f135" strokeDasharray="3 3" strokeWidth={1} opacity={.5} label={{ value:'Óptimo', fill:'#c8f135', fontSize:9 }}/>
            <ReferenceLine y={18} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1} opacity={.5} label={{ value:'Atención', fill:'#f59e0b', fontSize:9 }}/>
          </>
        )}
        <Scatter data={data} shape={<PlayerDot />}/>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
