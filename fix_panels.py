import sys

def modify_inicio_panel():
    path = 'src/app/coach/InicioPanel.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add missingRpe and change ACWR logic
    t1 = """  const missingWellness = teamData.filter(p => !p.respondedToday && !p.lesion && p.entrena_grupo !== false).length"""
    r1 = """  const missingWellness = teamData.filter(p => !p.respondedToday && !p.lesion && p.entrena_grupo !== false).length\n  const missingRpe = teamData.filter(p => !p.rpeToday && !p.lesion && p.entrena_grupo !== false).length"""
    
    t2 = """              const avg = acwrD.perSessionTeamAvg?.[s.titulo]
              if (avg) {
                byWeek[wStr].distTotal += Number(avg.distTotal || 0)
                byWeek[wStr].mec += Number(avg.acc3 || 0) + Number(avg.dec3 || 0)
              }"""
    r2 = """              const avg = acwrD.perSession?.[s.titulo]
              if (avg) {
                byWeek[wStr].distTotal += Number(avg.distTotal || 0)
                byWeek[wStr].mec += Number(avg.nAcel3 || 0) + Number(avg.nDecel3 || 0)
              }"""

    # 2. Add Falta RPE box
    t3 = """        <AnimateOnScroll delay={400}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: missingWellness > 0 ? '#60a5fa' : '#22c55e' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Falta Wellness</p>
                <div style={{ fontSize: 36, color: 'var(--snow)', fontWeight: 800, lineHeight: 1.2, marginTop: 8 }}>{missingWellness}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>{missingWellness === 1 ? 'jugador sin responder' : 'jugadores sin responder'}</p>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📱</div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>"""
    
    r3 = """        <AnimateOnScroll delay={400}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: missingWellness > 0 ? '#60a5fa' : '#22c55e' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Falta Wellness</p>
                <div style={{ fontSize: 36, color: 'var(--snow)', fontWeight: 800, lineHeight: 1.2, marginTop: 8 }}>{missingWellness}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>{missingWellness === 1 ? 'jugador sin responder' : 'jugadores sin responder'}</p>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2 }}>📱</div>
            </div>
          </div>
        </AnimateOnScroll>
        <AnimateOnScroll delay={500}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: missingRpe > 0 ? '#f43f5e' : '#22c55e' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--silver)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Falta RPE</p>
                <div style={{ fontSize: 36, color: 'var(--snow)', fontWeight: 800, lineHeight: 1.2, marginTop: 8 }}>{missingRpe}</div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--fog)', marginTop: 4 }}>{missingRpe === 1 ? 'jugador sin responder' : 'jugadores sin responder'}</p>
              </div>
              <div style={{ fontSize: 32, opacity: 0.2 }}>🏃</div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>"""
      
    if t1 in content:
        content = content.replace(t1, r1)
    if t2 in content:
        content = content.replace(t2, r2)
    if t3 in content:
        content = content.replace(t3, r3)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success InicioPanel.tsx")

modify_inicio_panel()

def modify_coach_client():
    path = 'src/app/coach/CoachClient.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add RPE metrics
    t1 = """  const pending = filteredTeamData.filter(p=>!p.respondedToday)"""
    r1 = """  const pending = filteredTeamData.filter(p=>!p.respondedToday)
  const respondedRpe = filteredTeamData.filter(p=>p.rpeToday)
  const pendingRpe = filteredTeamData.filter(p=>!p.rpeToday)"""
  
    t2 = """              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, gridColumn:'span 2' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Wellness Hoy</p>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span className="display" style={{ fontSize:52, color:'var(--lime)', lineHeight:1 }}>{responded.length}</span>
                  <span className="display" style={{ fontSize:28, color:'var(--fog)', lineHeight:1 }}>/ {teamData.length}</span>
                </div>
                <div style={{ marginTop:10, height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${teamData.length?(responded.length/teamData.length)*100:0}%`, background:'var(--lime)', borderRadius:3 }} />
                </div>
                {pending.length>0 && <p style={{ fontSize:11, color:'#f87171', marginTop:6 }}>⚠ Pendientes: {pending.map(p=>p.nombre.split(' ')[0]).join(', ')}</p>}
              </div>"""
              
    r2 = """              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, gridColumn:'span 2' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Wellness Hoy</p>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span className="display" style={{ fontSize:52, color:'var(--lime)', lineHeight:1 }}>{responded.length}</span>
                  <span className="display" style={{ fontSize:28, color:'var(--fog)', lineHeight:1 }}>/ {teamData.length}</span>
                </div>
                <div style={{ marginTop:10, height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${teamData.length?(responded.length/teamData.length)*100:0}%`, background:'var(--lime)', borderRadius:3 }} />
                </div>
                {pending.length>0 && <p style={{ fontSize:11, color:'#f87171', marginTop:6 }}>⚠ Pendientes: {pending.map(p=>p.nombre.split(' ')[0]).join(', ')}</p>}
              </div>
              <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:14, padding:16, gridColumn:'span 2' }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>RPE Hoy</p>
                <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                  <span className="display" style={{ fontSize:52, color:'var(--lime)', lineHeight:1 }}>{respondedRpe.length}</span>
                  <span className="display" style={{ fontSize:28, color:'var(--fog)', lineHeight:1 }}>/ {teamData.length}</span>
                </div>
                <div style={{ marginTop:10, height:5, background:'var(--mist)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${teamData.length?(respondedRpe.length/teamData.length)*100:0}%`, background:'var(--lime)', borderRadius:3 }} />
                </div>
                {pendingRpe.length>0 && <p style={{ fontSize:11, color:'#f87171', marginTop:6 }}>⚠ Pendientes: {pendingRpe.map(p=>p.nombre.split(' ')[0]).join(', ')}</p>}
              </div>"""
              
    if t1 in content:
        content = content.replace(t1, r1)
    if t2 in content:
        content = content.replace(t2, r2)
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success CoachClient.tsx")
    
modify_coach_client()
