const fs = require('fs');
let coach = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8').replace(/\r\n/g, '\n');

// Accordion
coach = coach.replace(
  '  const [sidebarOpen, setSidebarOpen] = useState(true)',
  `  const [sidebarOpen, setSidebarOpen] = useState(true)\n  const [openGroups, setOpenGroups] = useState({'General':true, 'Control de Carga':true, 'Análisis':true, 'Evaluaciones':true, 'Médico':true, 'Instalaciones':true, 'Recursos':true, 'Configuración':true})`
);

coach = coach.replace(
  `            {SIDEBAR_GROUPS.map(g => {\n              const groupActive = g.items.some(i => i.id === tab)\n              return (\n                <div key={g.label} style={{ marginBottom:4 }}>\n                  {sidebarOpen && (\n                    <div style={{ padding:'8px 16px 4px', fontSize:9, fontWeight:700, color: groupActive ? 'var(--lime)' : 'var(--fog)',\n                      textTransform:'uppercase', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>{g.label}</div>\n                  )}\n                  {g.items.map(item => {`,
  `            {SIDEBAR_GROUPS.map(g => {\n              const groupActive = g.items.some(i => i.id === tab)\n              const isGroupOpen = openGroups[g.label] !== false\n              return (\n                <div key={g.label} style={{ marginBottom: 4 }}>\n                  {sidebarOpen && (\n                    <button \n                      onClick={() => setOpenGroups(prev => ({...prev, [g.label]: !isGroupOpen}))}\n                      style={{ \n                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',\n                        padding: '8px 16px', background: 'transparent', border: 'none', cursor: 'pointer',\n                        color: groupActive ? 'var(--lime)' : 'var(--fog)', transition: 'color 0.2s'\n                      }}\n                      onMouseEnter={e => e.currentTarget.style.color = groupActive ? 'var(--lime)' : 'var(--silver)'}\n                      onMouseLeave={e => e.currentTarget.style.color = groupActive ? 'var(--lime)' : 'var(--fog)'}\n                    >\n                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>\n                        {g.label}\n                      </span>\n                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" \n                           style={{ transform: isGroupOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>\n                        <polyline points="6 9 12 15 18 9"></polyline>\n                      </svg>\n                    </button>\n                  )}\n                  <div style={{ \n                    overflow: 'hidden', \n                    maxHeight: (!sidebarOpen || isGroupOpen) ? 1000 : 0, \n                    transition: 'max-height 0.3s ease-in-out' \n                  }}>\n                    {g.items.map(item => {`
);

coach = coach.replace(
  `                  })}\n                </div>\n              )\n            })}\n          </div>`,
  `                  })}\n                  </div>\n                </div>\n              )\n            })}\n          </div>`
);

// NewPlayerForm
coach = coach.replace(
  `<div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:24 }} className="anim-up">\n      <p style={{ fontSize:13, fontWeight:600, color:'var(--lime)', marginBottom:18, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nuevo Jugador</p>`,
  `<div className="modal-backdrop">\n      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>\n        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nuevo Jugador</p>`
);
coach = coach.replace(
  `        <div style={{ display:'flex', gap:10 }}>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Creando...':'Crear jugador →'}</button>\n        </div>\n      </form>\n    </div>`,
  `        <div style={{ display:'flex', gap:12, marginTop:24 }}>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Creando...':'Crear jugador →'}</button>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n        </div>\n      </form>\n      </div>\n    </div>`
);

// BulkImportPanel
coach = coach.replace(
  `<div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:24 }} className="anim-up">\n      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>\n        <p style={{ fontSize:13, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>\n          📤 Importación masiva de jugadores\n        </p>`,
  `<div className="modal-backdrop">\n      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>\n      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>\n        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>\n          📤 Importación masiva de jugadores\n        </p>`
);
coach = coach.replace(
  `      </div>\n    </div>\n  )\n}\n\n//`,
  `      </div>\n      </div>\n    </div>\n  )\n}\n\n//`
);

fs.writeFileSync('src/app/coach/CoachClient.tsx', coach, 'utf8');
console.log(coach.includes('modal-backdrop'));
