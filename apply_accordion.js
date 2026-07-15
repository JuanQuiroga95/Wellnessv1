const fs = require('fs');
let coach = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

coach = coach.replace(
  '  const [sidebarOpen, setSidebarOpen] = useState(true)',
  `  const [sidebarOpen, setSidebarOpen] = useState(true)\n  const [openGroups, setOpenGroups] = useState({'General':true, 'Control de Carga':true, 'Análisis':true, 'Evaluaciones':true, 'Médico':true, 'Instalaciones':true, 'Recursos':true, 'Configuración':true})`
);

coach = coach.replace(
  `            {SIDEBAR_GROUPS.map(g => {
              const groupActive = g.items.some(i => i.id === tab)
              return (
                <div key={g.label} style={{ marginBottom:4 }}>
                  {sidebarOpen && (
                    <div style={{ padding:'8px 16px 4px', fontSize:9, fontWeight:700, color: groupActive ? 'var(--lime)' : 'var(--fog)',
                      textTransform:'uppercase', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>{g.label}</div>
                  )}
                  {g.items.map(item => {`,
  `            {SIDEBAR_GROUPS.map(g => {
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
                    {g.items.map(item => {`
);

coach = coach.replace(
  `                  })}
                </div>
              )
            })}
          </div>`,
  `                  })}
                  </div>
                </div>
              )
            })}
          </div>`
);

fs.writeFileSync('src/app/coach/CoachClient.tsx', coach, 'utf8');
