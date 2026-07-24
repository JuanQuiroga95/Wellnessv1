const fs = require('fs');
let panel = fs.readFileSync('src/app/coach/InicioPanel.tsx', 'utf8');

const additionalLogic = `
  // Helper for birthdays
  function isBirthdayUpcoming(dateStr, todayStr) {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-');
    const [ty, tm, td] = todayStr.split('-');
    
    const today = new Date(ty, tm - 1, td);
    const bday = new Date(ty, m - 1, d); // this year's birthday
    
    // If birthday passed this year, check next year
    if (bday < today) bday.setFullYear(parseInt(ty) + 1);
    
    const diffTime = Math.abs(bday - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays <= 7;
  }
  
  const upcomingBirthdays = teamData.filter(p => isBirthdayUpcoming(p.fecha_nacimiento, today));
  const readaptacionPlayers = teamData.filter(p => p.lesion && p.lesion.estado === 'Readaptación');
  const hasAlerts = upcomingBirthdays.length > 0 || readaptacionPlayers.length > 0;
`;

panel = panel.replace(
  '  const missingWellness = teamData.filter(p => !p.respondedToday && !p.lesion && p.entrena_grupo !== false).length',
  '  const missingWellness = teamData.filter(p => !p.respondedToday && !p.lesion && p.entrena_grupo !== false).length\n' + additionalLogic
);

const alertsHtml = `

        {/* Alerts Section */}
        {hasAlerts && (
          <AnimateOnScroll delay={550}>
            <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20, height: '100%', minHeight: 350 }}>
              <CuadroHeader title="ALERTAS DEL PLANTEL" subtitle="Novedades y avisos" icon={Icons.jugadores} />
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {upcomingBirthdays.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🎂 Próximos Cumpleaños</h4>
                    {upcomingBirthdays.map((p, i) => (
                      <div key={i} style={{ background: 'var(--ink3)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 20 }}>🎉</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2 }}>
                            {p.fecha_nacimiento.slice(5).replace('-','/')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {readaptacionPlayers.length > 0 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 12, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏃 Readaptación (Fase Final)</h4>
                    {readaptacionPlayers.map((p, i) => (
                      <div key={i} style={{ background: 'var(--ink3)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 20 }}>🔥</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--silver)', marginTop: 2 }}>
                            {p.lesion.tipo_lesion} - {p.lesion.zona}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </AnimateOnScroll>
        )}
`;

panel = panel.replace(
  '        {/* Charts Section */}',
  alertsHtml + '\n        {/* Charts Section */}'
);

fs.writeFileSync('src/app/coach/InicioPanel.tsx', panel, 'utf8');
