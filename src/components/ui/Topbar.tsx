'use client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Topbar({ nombre, rol, activeTab, onTabChange, tabs, clubNombre = null, onMenuClick = null }) {
  const router = useRouter()
  const [clubs, setClubs] = useState<any[]>([])
  const [switching, setSwitching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    if (rol === 'admin' || rol === 'master_admin') {
      fetch('/api/auth/my-clubs')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setClubs(d) })
        .catch(() => {})
    }
  }, [rol])

  async function switchClub(clubId: number) {
    if (switching) return
    setSwitching(true)
    try {
      const res = await fetch('/api/auth/switch-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId })
      })
      if (res.ok) {
        window.location.reload()
      } else {
        setSwitching(false)
      }
    } catch {
      setSwitching(false)
    }
  }

  async function logout() { await fetch('/api/auth/logout', { method:'POST' }); router.push('/landing.html') }
  return (
    <header className="no-print" style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--mist)' }}>
      <div style={{ borderBottom:'1px solid var(--mist)', padding:'6px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {onMenuClick && (
            <button className="mobile-only" onClick={onMenuClick} style={{ background:'transparent', border:'none', color:'var(--snow)', fontSize:24, cursor:'pointer', padding:'0 4px', marginRight:4 }}>
              ☰
            </button>
          )}
          <div className="mobile-hide" style={{ width:28, height:28, background:'var(--lime)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><path d="M6 22l5-10 5 7 3-5 5 8" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="display" style={{ fontSize:20, color:'var(--snow)', letterSpacing:'0.05em' }}>W&P</span>
          <span className="mobile-hide" style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:'var(--silver)', marginLeft:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{rol==='master_admin'?'Master Admin':rol==='admin'?'Preparador':'Jugador'}</span>
          {clubs.length > 1 ? (
            <div style={{ position: 'relative', marginLeft: 16 }}>
              <button 
                className="mobile-shrink"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={switching}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--lime)',
                  background: 'linear-gradient(180deg, rgba(200,241,53,0.1), rgba(200,241,53,0.02))',
                  border: '1px solid rgba(200,241,53,0.3)',
                  borderRadius: 8, padding: '6px 16px', cursor: 'pointer', outline: 'none',
                  boxShadow: '0 2px 10px rgba(200,241,53,0.05)',
                  transition: 'all 0.2s', minWidth: 0, justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ opacity: 0.8 }}>🛡️</span>
                  <span>{clubs.find(c => c.is_active)?.nombre || 'Seleccionar equipo'}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>

              {dropdownOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setDropdownOpen(false)} />
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 8, minWidth: '100%',
                    background: 'rgba(15,23,42,0.98)', backdropFilter: 'blur(10px)',
                    border: '1px solid var(--mist)', borderRadius: 12, overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', flexDirection: 'column'
                  }}>
                    {clubs.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setDropdownOpen(false); switchClub(c.id) }}
                        style={{
                          padding: '12px 16px', background: 'transparent', border: 'none',
                          color: c.is_active ? 'var(--lime)' : 'var(--snow)',
                          textAlign: 'left', cursor: 'pointer',
                          fontFamily: 'DM Mono, monospace', fontSize: 13,
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                          display: 'flex', alignItems: 'center', gap: 12,
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span style={{ opacity: c.is_active ? 1 : 0.5 }}>🛡️</span>
                        {c.nombre}
                        {c.is_active && <svg style={{ marginLeft: 'auto' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : clubNombre ? (
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:13, fontWeight: 600, color:'var(--lime)', background:'linear-gradient(180deg, rgba(200,241,53,0.1), rgba(200,241,53,0.02))', border:'1px solid rgba(200,241,53,0.3)', borderRadius:8, padding:'6px 16px', marginLeft:16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ opacity: 0.8 }}>🛡️</span> {clubNombre}
            </span>
          ) : null}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span className="mobile-hide" style={{ fontSize:13, color:'var(--silver)' }}>{nombre}</span>
          <button onClick={logout} className="btn-ghost mobile-shrink" style={{ padding:'6px 14px', fontSize:12 }}>Salir</button>
        </div>
      </div>
      {tabs && onTabChange && (
        <div style={{ padding:'8px 16px', display:'flex', gap:4, overflowX:'auto' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => onTabChange(t.id)} className={`nav-tab${activeTab===t.id?' active':''}`}>{t.label}</button>
          ))}
        </div>
      )}
    </header>
  )
}
