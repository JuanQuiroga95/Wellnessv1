'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSeed, setShowSeed] = useState(false)
  const [seedDone, setSeedDone] = useState(false)

  // Check on mount if DB is already initialized — if so, hide the seed button entirely
  useEffect(() => {
    fetch('/api/seed')
      .then(r => r.json())
      .then(d => { if (!d.initialized) setShowSeed(true) })
      .catch(() => {})
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al ingresar'); return }
      await new Promise(r => setTimeout(r, 100))
      router.push(data.rol === 'master_admin' ? '/master' : data.rol === 'admin' ? '/coach' : '/player')
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  async function initDB() {
    try {
      // Run migrations first (fixes constraints, adds columns)
      await fetch('/api/migrate', { method: 'POST' })
      const res = await fetch('/api/seed', { method: 'POST' })
      if (res.ok) {
        setSeedDone(true)
        setTimeout(() => setShowSeed(false), 4000)
      }
    } catch {}
  }

  return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', display:'flex', flexDirection:'column', overflow:'hidden', position:'relative' }}>
      <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%) rotate(-12deg)', fontFamily:'Bebas Neue,sans-serif', fontSize:'28vw', color:'rgba(255,255,255,0.025)', lineHeight:1, pointerEvents:'none', userSelect:'none', whiteSpace:'nowrap' }}>W&P</div>
      <div className="scanline" />
      <div className="ticker-wrap" style={{ borderBottom:'1px solid var(--mist)', padding:'10px 0', background:'var(--ink2)' }}>
        <div className="ticker-inner" style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--lime)', letterSpacing:'0.08em' }}>
          WELLNESS & PERFORMANCE · CONTROL DE CARGA · ACWR · RPE · BIENESTAR · RENDIMIENTO · WELLNESS & PERFORMANCE · CONTROL DE CARGA · ACWR · RPE · BIENESTAR · RENDIMIENTO ·
        </div>
      </div>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          <div className="anim-up" style={{ marginBottom:40 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{ width:44, height:44, borderRadius:10, background:'var(--lime)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="22" height="22" viewBox="0 0 32 32" fill="none"><path d="M6 22l5-10 5 7 3-5 5 8" stroke="#080808" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--silver)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Sistema de gestión</span>
            </div>
            <h1 className="display" style={{ fontSize:72, color:'var(--snow)' }}>WELLNESS<br /><span style={{ color:'var(--lime)' }}>&</span> PERF.</h1>
          </div>
          <div className="card anim-up delay-2" style={{ padding:28 }}>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Usuario</label>
                <input className="wp-input" type="text" value={usuario} onChange={e=>setUsuario(e.target.value)} placeholder="tu.usuario" required autoComplete="username" autoCapitalize="none" />
              </div>
              <div>
                <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Contraseña</label>
                <input className="wp-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />
              </div>
              {error && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#fca5a5' }}>{error}</div>}
              <button className="btn-lime" type="submit" disabled={loading} style={{ width:'100%', padding:14, fontSize:15, marginTop:4 }}>{loading ? 'INGRESANDO...' : 'INGRESAR →'}</button>
            </form>

            {showSeed && (
              <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid var(--mist)' }}>
                {!seedDone ? (
                  <>
                    <p style={{ fontSize:11, color:'var(--fog)', marginBottom:8 }}>¿Primera vez? Inicializá la base de datos:</p>
                    <button onClick={initDB} style={{ background:'transparent', border:'1px solid var(--fog)', borderRadius:8, padding:'8px 12px', fontSize:11, color:'var(--silver)', cursor:'pointer', width:'100%', textAlign:'left', fontFamily:'DM Mono,monospace' }}>
                      Inicializar base de datos →
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize:12, color:'var(--lime)', fontFamily:'DM Mono,monospace' }}>✓ Base de datos lista. Ya podés ingresar.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ borderTop:'1px solid var(--mist)', padding:'12px 24px', display:'flex', justifyContent:'space-between' }}>
        <span style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:'var(--fog)' }}>W&P v1.0</span>
        <a href="/landing.html" style={{ fontFamily:'DM Mono,monospace', fontSize:10, color:'var(--fog)', textDecoration:'none' }}>← Volver al inicio</a>
      </div>
    </div>
  )
}
