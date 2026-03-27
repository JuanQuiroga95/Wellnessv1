'use client'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CustomDot = (props) => {
  const { cx, cy, payload } = props
  const size = 26
  if (payload.foto_url) {
    return (
      <g>
        <defs>
          <clipPath id={`clip-${payload.jugador_id}`}>
            <circle cx={cx} cy={cy} r={size/2} />
          </clipPath>
        </defs>
        <circle cx={cx} cy={cy} r={size/2 + 2} fill={payload.dotColor || '#4a6cf7'} />
        <image
          href={payload.foto_url}
          x={cx - size/2} y={cy - size/2}
          width={size} height={size}
          clipPath={`url(#clip-${payload.jugador_id})`}
          preserveAspectRatio="xMidYMid slice"
        />
      </g>
    )
  }
  // Initials fallback
  const initials = payload.nombre ? payload.nombre.split(' ').map(w=>w[0]).slice(0,2).join('') : '?'
  return (
    <g>
      <circle cx={cx} cy={cy} r={size/2} fill={payload.dotColor || '#4a6cf7'} opacity={0.9} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill="white" fontFamily="DM Sans,sans-serif">{initials}</text>
    </g>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background:'#111', border:'1px solid #333', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
      <div style={{ fontWeight:600, color:'white', marginBottom:4 }}>{d.nombre}</div>
      <div style={{ color:'#888' }}>{d.posicion}</div>
      <div style={{ color:'#c8f135', marginTop:4 }}>RPE prom: <strong>{d.x?.toFixed(1)}</strong></div>
      <div style={{ color:'#60a5fa' }}>Y: <strong>{d.y?.toFixed(1)}</strong></div>
    </div>
  )
}

export function ScatterPlot({ data, xLabel, yLabel, title }) {
  if (!data?.length) return (
    <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center', color:'#555', fontSize:13 }}>
      Sin suficientes datos para mostrar el gráfico
    </div>
  )

  return (
    <div>
      {title && <p style={{ fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{title}</p>}
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart margin={{ top:20, right:20, left:-10, bottom:20 }}>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,.05)" />
          <XAxis
            dataKey="x" type="number" name={xLabel}
            domain={['auto','auto']}
            tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false}
            label={{ value:xLabel, position:'insideBottom', offset:-10, fill:'#555', fontSize:10 }}
          />
          <YAxis
            dataKey="y" type="number" name={yLabel}
            domain={['auto','auto']}
            tick={{ fill:'#555', fontSize:10 }} axisLine={false} tickLine={false}
            label={{ value:yLabel, angle:-90, position:'insideLeft', fill:'#555', fontSize:10 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray:'3 3', stroke:'#333' }} />
          <Scatter data={data} shape={<CustomDot />} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}
