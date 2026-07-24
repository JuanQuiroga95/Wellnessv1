'use client'
const W = ['#c8f135','#22c55e','#eab308','#f97316','#ef4444']
const R = ['#3b82f6','#3b82f6','#22c55e','#22c55e','#eab308','#eab308','#f97316','#f97316','#ef4444','#ef4444','#b91c1c']
export default function ScaleInput({ id, value, onChange, min=1, max=5, lowLabel, highLabel, isRpe=false }) {
  const nums = Array.from({ length: max - min + 1 }, (_,i) => i + min)
  const color = (v) => isRpe ? R[v]||'#ef4444' : W[v-1]||'#888'
  return (
    <div>
      <div style={{ display:'flex', gap:6 }}>
        {nums.map(v => {
          const active = value === v
          const col = color(v)
          return (
            <button key={v} type="button" onClick={() => onChange(v)} style={{ flex:1, padding:'10px 4px', borderRadius:8, border: active ? `2px solid ${col}` : '1px solid var(--fog)', background: active ? `${col}25` : 'var(--ink3)', color: active ? col : 'var(--silver)', fontFamily:'DM Mono,monospace', fontSize:14, fontWeight: active ? 700 : 500, cursor:'pointer', transition:'all .12s', textAlign:'center' }}>
              {v}
            </button>
          )
        })}
      </div>
      {!isRpe && (
        <div style={{ display:'flex', gap:6, marginTop:4 }}>
          {nums.map(v => <div key={v} style={{ flex:1, height:3, borderRadius:2, background:color(v), opacity: value===v ? 1 : 0.3 }} />)}
        </div>
      )}
      {(lowLabel || highLabel) && (
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, padding:'0 2px' }}>
          <span style={{ fontSize:10, color:'var(--silver)' }}>{lowLabel}</span>
          <span style={{ fontSize:10, color:'var(--silver)' }}>{highLabel}</span>
        </div>
      )}
    </div>
  )
}
