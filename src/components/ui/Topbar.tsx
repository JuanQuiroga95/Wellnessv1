'use client'
import { useRouter } from 'next/navigation'
export default function Topbar({ nombre, rol, activeTab, onTabChange, tabs, clubNombre = null }) {
  const router = useRouter()
  async function logout() { await fetch('/api/auth/logout', { method:'POST' }); router.push('/landing.html') }
  return (
    <header style={{ position:'sticky', top:0, zIndex:50, background:'rgba(8,8,8,0.92)', backdropFilter:'blur(12px)', borderBottom:'1px solid var(--mist)' }}>
      <div style={{ borderBottom:'1px solid var(--mist)', padding:'6px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:28, height:28, background:'var(--lime)', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><path d="M6 22l5-10 5 7 3-5 5 8" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="display" style={{ fontSize:20, color:'var(--snow)', letterSpacing:'0.05em' }}>W&P</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:'var(--silver)', marginLeft:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>{rol==='master_admin'?'Master Admin':rol==='admin'?'Preparador':'Jugador'}</span>
          {clubNombre && (
            <span style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:'var(--lime)', background:'rgba(200,241,53,.08)', border:'1px solid rgba(200,241,53,.2)', borderRadius:6, padding:'2px 8px', marginLeft:4 }}>
              🏟️ {clubNombre}
            </span>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, color:'var(--silver)' }}>{nombre}</span>
          <button onClick={logout} className="btn-ghost" style={{ padding:'6px 14px', fontSize:12 }}>Salir</button>
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
