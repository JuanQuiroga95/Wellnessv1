const MAP = {
  optimo:     { dot:'#22c55e', label:'Óptimo',    bg:'rgba(34,197,94,.1)',  text:'#4ade80' },
  precaucion: { dot:'#f59e0b', label:'Precaución',bg:'rgba(245,158,11,.1)',text:'#fbbf24' },
  peligro:    { dot:'#ef4444', label:'Riesgo',    bg:'rgba(239,68,68,.1)',  text:'#f87171' },
  sin_datos:  { dot:'#888',    label:'Sin datos', bg:'rgba(136,136,136,.1)',text:'#aaa' },
}
export default function StatusBadge({ status, ratio }) {
  const s = MAP[status] || MAP.sin_datos
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:100, background:s.bg, fontSize:11, fontWeight:600, color:s.text, border:`1px solid ${s.dot}44`, whiteSpace:'nowrap' }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot, flexShrink:0, display:'inline-block' }} />
      {s.label}{ratio && status !== 'sin_datos' ? ` · ${ratio.toFixed(2)}` : ''}
    </span>
  )
}
