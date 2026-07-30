import sys

with open('src/app/coach/AnalyticsPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                  {hasDolor && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {p.dolor_zona && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>📍 {p.dolor_zona}</span>}
                      {p.dolor_eva>0 && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>EVA {p.dolor_eva}/10</span>}
                    </div>
                  )}
   
                  {p.fue_gimnasio && (
                    <div style={{ marginTop: 5 }}>
                      <span style={{ fontSize:10, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.2)', borderRadius:5, padding:'2px 6px' }}>🏋️ Fue al gimnasio</span>
                    </div>
                  )}             </>"""

replacement = """                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop: hasDolor || p.fue_gimnasio || p.tqr > 0 ? 5 : 0 }}>
                    {p.dolor_zona && (() => {
                      let z = p.dolor_zona;
                      try { z = JSON.parse(p.dolor_zona).join(', ') } catch(e){}
                      return <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>📍 {z}</span>
                    })()}
                    {p.dolor_eva>0 && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }}>EVA {p.dolor_eva}/10</span>}
                    {p.tqr>0 && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:p.tqr>=8?'rgba(200,241,53,.1)':p.tqr>=6?'rgba(34,197,94,.1)':p.tqr>=4?'rgba(245,158,11,.1)':'rgba(239,68,68,.1)', color:p.tqr>=8?'#c8f135':p.tqr>=6?'#22c55e':p.tqr>=4?'#f59e0b':'#ef4444', border:`1px solid ${p.tqr>=8?'rgba(200,241,53,.25)':p.tqr>=6?'rgba(34,197,94,.25)':p.tqr>=4?'rgba(245,158,11,.25)':'rgba(239,68,68,.25)'}` }}>TQR {p.tqr}</span>}
                    {p.fue_gimnasio && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.25)' }}>🏋️ Gim</span>}
                  </div>
                </>"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/coach/AnalyticsPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
