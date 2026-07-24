const fs = require('fs');
let coach = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

// Accordion replace
coach = coach.replace(
  '  const [sidebarOpen, setSidebarOpen] = useState(true)',
  \  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [openGroups, setOpenGroups] = useState({'General':true, 'Control de Carga':true, 'Análisis':true, 'Evaluaciones':true, 'Médico':true, 'Instalaciones':true, 'Recursos':true, 'Configuración':true})\
);

coach = coach.replace(
  /\{SIDEBAR_GROUPS\.map\(g => \{\s+const groupActive = g\.items\.some\(i => i\.id === tab\)\s+return \(\s+<div key=\{g\.label\} style=\{\{ marginBottom:4 \}\}>\s+\{sidebarOpen && \(\s+<div style=\{\{ padding:'8px 16px 4px', fontSize:9, fontWeight:700, color: groupActive \? 'var\(--lime\)' : 'var\(--fog\)',\s+textTransform:'uppercase', letterSpacing:'0\.1em', whiteSpace:'nowrap' \}\}>\{g\.label\}<\/div>\s+\)\}\s+\{g\.items\.map\(item => \{/g,
  \{SIDEBAR_GROUPS.map(g => {
              const groupActive = g.items.some(i => i.id === tab)
              const isGroupOpen = openGroups[g.label] !== false
              return (
                <div key={g.label} style={{ marginBottom: 4 }}>
                  {sidebarOpen && (
                    <button 
                      onClick={() => setOpenGroups(prev => ({...prev, [g.label]: !isGroupOpen}))}
                      style={{ 
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer',
                        color: groupActive ? 'var(--lime)' : 'var(--fog)', transition: 'color 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = groupActive ? 'var(--lime)' : 'var(--silver)'}
                      onMouseLeave={e => e.currentTarget.style.color = groupActive ? 'var(--lime)' : 'var(--fog)'}
                    >
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        {g.label}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                           style={{ transform: isGroupOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  )}
                  <div style={{ 
                    overflow: 'hidden', 
                    maxHeight: (!sidebarOpen || isGroupOpen) ? 1000 : 0, 
                    transition: 'max-height 0.3s ease-in-out' 
                  }}>
                    {g.items.map(item => {\
);

// Close the accordion div
coach = coach.replace(
  /<\/div>\s+\)\s+\}\)}\s+<\/div>\s+\)\s+\}\)}/g,
  \</div>
              )
            })}
                  </div>
                </div>
              )
            })}\
);

// Tables
coach = coach.replace(/<table /g, '<table className="wp-table" ');

// BulkImportPanel Modal
coach = coach.replace(
  /<div style=\{\{ background:'var\(--ink2\)', border:'1px solid rgba\(200,241,53,\.2\)', borderRadius:14, padding:24 \}\} className="anim-up">\s+<div style=\{\{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 \}\}>\s+<p style=\{\{ fontSize:13, fontWeight:700, color:'var\(--lime\)', textTransform:'uppercase', letterSpacing:'0\.06em' \}\}>/g,
  \<div className="modal-backdrop">
      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>\
);
// BulkImportPanel End
coach = coach.replace(
  /        <\/div>\s+<\/div>\s+<\/div>\s+\)\s+\}/,
  \        </div>
        </div>
      </div>
    </div>
  )
}\
);

// NewPlayerForm Modal
coach = coach.replace(
  /<div style=\{\{ background:'var\(--ink2\)', border:'1px solid rgba\(200,241,53,\.2\)', borderRadius:14, padding:24 \}\} className="anim-up">\s+<p style=\{\{ fontSize:13, fontWeight:600, color:'var\(--lime\)', marginBottom:18, textTransform:'uppercase', letterSpacing:'0\.06em' \}\}>Nuevo Jugador<\/p>/g,
  \<div className="modal-backdrop">
      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nuevo Jugador</p>\
);
coach = coach.replace(
  /<div style=\{\{ display:'flex', gap:10 \}\}>\s+<button type="button" className="btn-ghost" style=\{\{ flex:1 \}\} onClick=\{onCancel\}>Cancelar<\/button>\s+<button type="submit" className="btn-lime" style=\{\{ flex:1 \}\} disabled=\{loading\}>\{loading\?'Creando\.\.\.':'Crear jugador ?'\}<\/button>\s+<\/div>\s+<\/form>\s+<\/div>/g,
  \<div style={{ display:'flex', gap:12, marginTop:24 }}>
          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Creando...':'Crear jugador ?'}</button>
          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
      </div>
    </div>\
);

// NewLesionForm Modal
coach = coach.replace(
  /<div style=\{\{ background:'var\(--ink2\)', border:'1px solid rgba\(239,68,68,\.25\)', borderRadius:14, padding:20 \}\} className="anim-up">\s+<p style=\{\{ fontSize:13, fontWeight:600, color:'#f87171', marginBottom:16, textTransform:'uppercase', letterSpacing:'0\.06em' \}\}>/g,
  \<div className="modal-backdrop">
      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>
        <p style={{ fontSize:15, fontWeight:700, color:'#f87171', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>\
);
coach = coach.replace(
  /<div style=\{\{ display:'flex', gap:10 \}\}>\s+<button type="button" className="btn-ghost" style=\{\{ flex:1 \}\} onClick=\{onCancel\}>Cancelar<\/button>\s+<button type="submit" className="btn-lime" style=\{\{ flex:1 \}\} disabled=\{loading\}>\{loading\?'Registrando\.\.\.':'Registrar lesión ?'\}<\/button>\s+<\/div>\s+<\/form>\s+<\/div>/g,
  \<div style={{ display:'flex', gap:10, marginTop:24 }}>
          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Registrando...':'Registrar lesión ?'}</button>
          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>
        </div>
      </form>
      </div>
    </div>\
);

fs.writeFileSync('src/app/coach/CoachClient.tsx', coach, 'utf8');
