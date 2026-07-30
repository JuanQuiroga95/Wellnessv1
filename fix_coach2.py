import sys

with open('src/app/coach/CoachClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """                {/* Injury / diff */}
                {p.dolor_zona && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)' }} title={`EVA: ${p.dolor_eva||'—'}${p.dolor_descripcion ? ' · ' + p.dolor_descripcion : ''}`}>📍 {p.dolor_zona}</span>}
              </div>"""

replacement = """                {/* Injury / diff */}
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, maxWidth:240, justifyContent:'flex-end' }}>
                  {p.dolor_zona && (() => {
                     let z = p.dolor_zona;
                     try { z = JSON.parse(p.dolor_zona).join(', ') } catch(e){}
                     return <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden', maxWidth:180 }} title={`EVA: ${p.dolor_eva||'—'}${p.dolor_descripcion ? ' · ' + p.dolor_descripcion : ''}`}>📍 {z}</span>
                  })()}
                  {p.tqr > 0 && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:p.tqr>=8?'rgba(200,241,53,.1)':p.tqr>=6?'rgba(34,197,94,.1)':p.tqr>=4?'rgba(245,158,11,.1)':'rgba(239,68,68,.1)', color:p.tqr>=8?'#c8f135':p.tqr>=6?'#22c55e':p.tqr>=4?'#f59e0b':'#ef4444', border:`1px solid ${p.tqr>=8?'rgba(200,241,53,.25)':p.tqr>=6?'rgba(34,197,94,.25)':p.tqr>=4?'rgba(245,158,11,.25)':'rgba(239,68,68,.25)'}` }}>TQR {p.tqr}</span>}
                  {p.fue_gimnasio && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.25)' }}>🏋️ Gim</span>}
                </div>
              </div>"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/coach/CoachClient.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")
