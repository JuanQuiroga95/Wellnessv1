import sys

with open('src/app/coach/AnalyticsPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """{p.fue_gimnasio && <span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.25)' }}>🏋️ Gim</span>}"""
replacement = """<span style={{ fontSize:11, padding:'3px 8px', borderRadius:6, background:p.fue_gimnasio?'rgba(200,241,53,.1)':'rgba(255,255,255,.05)', color:p.fue_gimnasio?'var(--lime)':'var(--fog)', border:`1px solid ${p.fue_gimnasio?'rgba(200,241,53,.25)':'rgba(255,255,255,.1)'}` }}>
                      {p.fue_gimnasio ? '🏋️ Gimnasio: SÍ' : '❌ Gimnasio: NO'}
                    </span>"""

if target in content:
    content = content.replace(target, replacement)
    
    # Also fix the `marginTop: hasDolor || p.fue_gimnasio || p.tqr > 0 ? 5 : 0` to always apply since we always show gym
    target2 = """marginTop: hasDolor || p.fue_gimnasio || p.tqr > 0 ? 5 : 0"""
    replacement2 = """marginTop: 5"""
    content = content.replace(target2, replacement2)

    with open('src/app/coach/AnalyticsPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success Analytics")
else:
    print("Target not found in Analytics")

with open('src/app/coach/CoachClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """{p.fue_gimnasio && <span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:'rgba(200,241,53,.1)', color:'var(--lime)', border:'1px solid rgba(200,241,53,.25)' }}>🏋️ Gim</span>}"""
replacement = """<span style={{ fontSize:11, padding:'2px 7px', borderRadius:6, background:p.fue_gimnasio?'rgba(200,241,53,.1)':'rgba(255,255,255,.05)', color:p.fue_gimnasio?'var(--lime)':'var(--fog)', border:`1px solid ${p.fue_gimnasio?'rgba(200,241,53,.25)':'rgba(255,255,255,.1)'}` }}>
                    {p.fue_gimnasio ? '🏋️ Gimnasio: SÍ' : '❌ Gimnasio: NO'}
                  </span>"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/coach/CoachClient.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success Coach Gimnasio")
else:
    print("Target Gimnasio not found in Coach")

# Fix print timeout
with open('src/app/coach/CoachClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => setTimeout(doP, 500);
    }
    // Main window timeout - won't be throttled
    setTimeout(doP, 2500);"""
replacement = """    if (iframe.contentWindow) {
      iframe.contentWindow.onload = () => setTimeout(doP, 100);
    }
    // Main window timeout - won't be throttled
    setTimeout(doP, 800);"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/coach/CoachClient.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success Coach Print")
else:
    print("Target Print not found in Coach")
