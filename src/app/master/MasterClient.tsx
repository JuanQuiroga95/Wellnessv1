'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterClient({ session, clubs: initialClubs, coaches: initialCoaches }) {
  const [clubs, setClubs] = useState(initialClubs)
  const [coaches, setCoaches] = useState(initialCoaches)
  const [tab, setTab] = useState<'clubs'|'coaches'>('clubs')
  const [showNewClub, setShowNewClub] = useState(false)
  const [showNewCoach, setShowNewCoach] = useState(false)
  const router = useRouter()

  async function reload() {
    const [c1, c2] = await Promise.all([
      fetch('/api/clubs').then(r=>r.json()),
      fetch('/api/master/coaches').then(r=>r.json()),
    ])
    setClubs(c1); setCoaches(c2)
  }

  async function logout() {
    await fetch('/api/auth/logout', {method:'POST'})
    router.push('/login')
  }

  const totalJugadores = clubs.reduce((s,c)=>s+(c.jugadores||0), 0)
  const totalCoaches = coaches.length
  const activeClubs = clubs.length

  return (
    <div style={{ minHeight:'100vh', background:'var(--ink)', fontFamily:'DM Sans,sans-serif' }}>
      {/* Topbar */}
      <div style={{ background:'var(--ink2)', borderBottom:'1px solid var(--mist)', padding:'0 24px', height:58, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#c8f135,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>👑</div>
          <div>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--snow)' }}>MASTER ADMIN</span>
            <span style={{ fontSize:11, color:'var(--lime)', marginLeft:10, fontFamily:'DM Mono,monospace' }}>{session.nombre}</span>
          </div>
        </div>
        <button onClick={logout} style={{ fontSize:12, padding:'6px 14px', borderRadius:8, background:'transparent', border:'1px solid var(--fog)', color:'var(--silver)', cursor:'pointer' }}>
          Cerrar sesión
        </button>
      </div>

      <main style={{ maxWidth:960, margin:'0 auto', padding:'28px 16px' }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:24 }}>
          {[
            ['🏟️', activeClubs, 'Clubes activos', '#c8f135'],
            ['👨‍🏫', totalCoaches, 'Profesores', '#60a5fa'],
            ['⚽', totalJugadores, 'Jugadores totales', '#22c55e'],
          ].map(([ico,val,lbl,col])=>(
            <div key={lbl as string} style={{ background:'var(--ink2)', border:`1px solid ${col}33`, borderRadius:16, padding:20, textAlign:'center' }}>
              <div style={{ fontSize:28, marginBottom:4 }}>{ico}</div>
              <div className="display" style={{ fontSize:40, color:col as string, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11, color:'var(--silver)', marginTop:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>{lbl as string}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:10, padding:3, marginBottom:20, alignSelf:'flex-start', width:'fit-content' }}>
          {(['clubs','coaches'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 24px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, border:'none', background:tab===t?'var(--lime)':'transparent', color:tab===t?'var(--ink)':'var(--silver)', transition:'all .12s', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {t === 'clubs' ? '🏟️ Clubes' : '👨‍🏫 Profesores'}
            </button>
          ))}
        </div>

        {/* CLUBS TAB */}
        {tab === 'clubs' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 className="display" style={{ fontSize:40, color:'var(--snow)' }}>CLUBES</h2>
                <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Cada club tiene su plantel aislado e independiente</p>
              </div>
              <button onClick={()=>setShowNewClub(true)} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nuevo club</button>
            </div>

            {showNewClub && <NewClubForm onSuccess={()=>{ setShowNewClub(false); reload() }} onCancel={()=>setShowNewClub(false)} />}

            {clubs.length === 0
              ? <div style={{ padding:48, textAlign:'center', color:'var(--silver)' }}>Sin clubes aún. Creá el primero.</div>
              : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                  {clubs.map(club=>(
                    <ClubCard key={club.id} club={club} coaches={coaches.filter(c=>c.club_id===club.id)} onRefresh={reload} />
                  ))}
                </div>
            }
          </div>
        )}

        {/* COACHES TAB */}
        {tab === 'coaches' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 className="display" style={{ fontSize:40, color:'var(--snow)' }}>PROFESORES</h2>
                <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Asigná cada profesor a su club</p>
              </div>
              <button onClick={()=>setShowNewCoach(true)} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nuevo profesor</button>
            </div>

            {showNewCoach && <NewCoachForm clubs={clubs} onSuccess={()=>{ setShowNewCoach(false); reload() }} onCancel={()=>setShowNewCoach(false)} />}

            <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
              {coaches.length === 0
                ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Sin profesores aún.</div>
                : coaches.map((coach,i)=>(
                    <CoachRow key={coach.id} coach={coach} clubs={clubs} last={i===coaches.length-1} onRefresh={reload} />
                  ))
              }
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Club Card ──────────────────────────────────────────────────────────────────
function ClubCard({ club, coaches, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [nombre, setNombre] = useState(club.nombre)
  const [saving, setSaving] = useState(false)

  async function saveClub() {
    setSaving(true)
    await fetch('/api/clubs',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:club.id,nombre})})
    setSaving(false); setEditing(false); onRefresh()
  }

  async function deleteClub() {
    if (!confirm(`¿Eliminar el club "${club.nombre}"? Esto NO elimina los usuarios.`)) return
    await fetch(`/api/clubs?id=${club.id}`,{method:'DELETE'})
    onRefresh()
  }

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
      {editing ? (
        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <input className="wp-input" value={nombre} onChange={e=>setNombre(e.target.value)} style={{ flex:1, padding:'7px 12px', fontSize:13 }} autoFocus />
          <button onClick={saveClub} disabled={saving} style={{ fontSize:12, padding:'7px 12px', borderRadius:8, background:'var(--lime)', color:'var(--ink)', border:'none', cursor:'pointer', fontWeight:700 }}>✓</button>
          <button onClick={()=>setEditing(false)} style={{ fontSize:12, padding:'7px 10px', borderRadius:8, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', cursor:'pointer' }}>✕</button>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {club.logo_url
              ? <img src={club.logo_url} style={{ width:40, height:40, objectFit:'contain', borderRadius:8 }} alt="logo"/>
              : <div style={{ width:40, height:40, borderRadius:8, background:'var(--ink3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🏟️</div>
            }
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'var(--snow)' }}>{club.nombre}</p>
              <p style={{ fontSize:10, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>ID: {club.id}</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setEditing(true)} style={{ fontSize:11, padding:'4px 8px', borderRadius:6, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', cursor:'pointer' }}>✏️</button>
            <button onClick={deleteClub} style={{ fontSize:11, padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', cursor:'pointer' }}>🗑</button>
          </div>
        </div>
      )}

      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <div style={{ flex:1, background:'var(--ink3)', borderRadius:10, padding:'10px 0', textAlign:'center' }}>
          <div className="mono" style={{ fontSize:20, fontWeight:600, color:'#60a5fa' }}>{coaches.length}</div>
          <div style={{ fontSize:10, color:'var(--silver)', marginTop:3 }}>Profesores</div>
        </div>
        <div style={{ flex:1, background:'var(--ink3)', borderRadius:10, padding:'10px 0', textAlign:'center' }}>
          <div className="mono" style={{ fontSize:20, fontWeight:600, color:'#22c55e' }}>{club.jugadores}</div>
          <div style={{ fontSize:10, color:'var(--silver)', marginTop:3 }}>Jugadores</div>
        </div>
      </div>

      {coaches.length > 0 && (
        <div>
          <p style={{ fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Profesores asignados</p>
          {coaches.map(c=>(
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid var(--mist)' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:c.activo?'#22c55e':'#555', flexShrink:0 }} />
              <span style={{ fontSize:12, color:'var(--snow)', flex:1 }}>{c.nombre}</span>
              <span style={{ fontSize:10, color:'var(--fog)', fontFamily:'DM Mono,monospace' }}>@{c.usuario}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Coach Row ──────────────────────────────────────────────────────────────────
function CoachRow({ coach, clubs, last, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [clubId, setClubId] = useState(String(coach.club_id||''))
  const [saving, setSaving] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [currentPass, setCurrentPass] = useState(coach.password_plain || null)

  async function assignClub() {
    setSaving(true)
    await fetch('/api/master/coaches',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:coach.id,club_id:clubId?Number(clubId):null})})
    setSaving(false); onRefresh()
  }

  async function toggleActive() {
    await fetch('/api/master/coaches',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:coach.id,activo:!coach.activo})})
    onRefresh()
  }

  async function changePassword() {
    if (!newPass || newPass.length < 6) return
    await fetch('/api/master/coaches',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:coach.id,password:newPass})})
    setCurrentPass(newPass); setNewPass(''); alert('Contraseña actualizada ✓')
  }

  return (
    <div style={{ borderBottom:last?'none':'1px solid var(--mist)' }}>
      <button onClick={()=>setOpen(!open)} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 20px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}
        onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--ink3)'}
        onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
      >
        <div style={{ width:10, height:10, borderRadius:'50%', background:coach.activo?'#22c55e':'#555', flexShrink:0 }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:14, color:'var(--snow)' }}>{coach.nombre}</div>
          <div style={{ fontSize:11, color:'var(--silver)', marginTop:1 }}>@{coach.usuario}</div>
        </div>
        {coach.club_nombre
          ? <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(96,165,250,.12)', color:'#93c5fd', border:'1px solid rgba(96,165,250,.25)', fontWeight:600 }}>🏟️ {coach.club_nombre}</span>
          : <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(245,158,11,.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.25)', fontWeight:600 }}>⚠ Sin club</span>
        }
        <span style={{ color:'var(--fog)', fontSize:14, transition:'transform .2s', display:'inline-block', transform:open?'rotate(90deg)':'none' }}>›</span>
      </button>

      {open && (
        <div style={{ padding:'14px 24px 20px', background:'var(--ink3)', borderTop:'1px solid var(--mist)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Assign club */}
            <div>
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Asignar club</label>
              <div style={{ display:'flex', gap:8 }}>
                <select className="wp-input" value={clubId} onChange={e=>setClubId(e.target.value)} style={{ flex:1, padding:'8px 12px', fontSize:13, appearance:'none' }}>
                  <option value="" style={{ background:'var(--ink2)' }}>— Sin club —</option>
                  {clubs.map(c=><option key={c.id} value={c.id} style={{ background:'var(--ink2)' }}>{c.nombre}</option>)}
                </select>
                <button onClick={assignClub} disabled={saving} className="btn-lime" style={{ fontSize:12, padding:'8px 14px' }}>
                  {saving?'...':'Guardar'}
                </button>
              </div>
            </div>

            {/* Password section */}
            <div>
              {/* Current password reveal */}
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Contraseña actual</label>
              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <div style={{ flex:1, background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'DM Mono,monospace', color: currentPass ? 'var(--lime)' : 'var(--fog)', letterSpacing: showPass ? '0.05em' : '0.2em' }}>
                  {currentPass ? (showPass ? currentPass : '••••••••') : '— no registrada —'}
                </div>
                {currentPass && (
                  <button type="button" onClick={()=>setShowPass(v=>!v)}
                    style={{ padding:'8px 12px', borderRadius:8, border:'1px solid var(--mist)', background:'var(--ink2)', color:'var(--silver)', cursor:'pointer', fontSize:15 }}>
                    {showPass ? '🙈' : '👁'}
                  </button>
                )}
              </div>
              {/* Change password */}
              <label style={{ display:'block', fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Cambiar contraseña</label>
              <div style={{ display:'flex', gap:8 }}>
                <input className="wp-input" type="text" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="Mín. 6 caracteres" style={{ flex:1, padding:'8px 12px', fontSize:13 }} />
                <button onClick={changePassword} disabled={newPass.length<6} className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }}>Cambiar</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop:14 }}>
            <button onClick={toggleActive} className="btn-ghost" style={{ fontSize:12, padding:'7px 14px', color:coach.activo?'#f87171':'#4ade80', borderColor:coach.activo?'rgba(239,68,68,.3)':'rgba(34,197,94,.3)' }}>
              {coach.activo ? '✕ Desactivar acceso' : '✓ Activar acceso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── New Club Form ──────────────────────────────────────────────────────────────
function NewClubForm({ onSuccess, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!nombre.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/clubs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:nombre.trim()})})
      if (!res.ok) { const d=await res.json(); setError(d.error||'Error'); return }
      onSuccess()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:20 }} className="anim-up">
      <p style={{ fontSize:13, fontWeight:600, color:'var(--lime)', marginBottom:14, textTransform:'uppercase', letterSpacing:'0.06em' }}>🏟️ Nuevo Club</p>
      <div style={{ display:'flex', gap:10 }}>
        <input className="wp-input" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre del club" style={{ flex:1, padding:'10px 14px', fontSize:14 }} autoFocus onKeyDown={e=>e.key==='Enter'&&submit()} />
        <button onClick={submit} disabled={loading||!nombre.trim()} className="btn-lime" style={{ fontSize:13, padding:'10px 20px' }}>{loading?'Creando...':'Crear →'}</button>
        <button onClick={onCancel} className="btn-ghost" style={{ fontSize:13, padding:'10px 14px' }}>Cancelar</button>
      </div>
      {error && <p style={{ fontSize:12, color:'#f87171', marginTop:10 }}>{error}</p>}
    </div>
  )
}

// ── New Coach Form ─────────────────────────────────────────────────────────────
function NewCoachForm({ clubs, onSuccess, onCancel }) {
  const [f, setF] = useState({ nombre:'', usuario:'', password:'', club_id:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k,v) => setF(p=>({...p,[k]:v}))

  async function submit() {
    if (!f.nombre||!f.usuario||!f.password) { setError('Nombre, usuario y contraseña son requeridos'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/master/coaches',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...f,club_id:f.club_id?Number(f.club_id):null})})
      if (!res.ok) { const d=await res.json(); setError(d.error||'Error'); return }
      onSuccess()
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid rgba(96,165,250,.2)', borderRadius:14, padding:20 }} className="anim-up">
      <p style={{ fontSize:13, fontWeight:600, color:'#60a5fa', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.06em' }}>👨‍🏫 Nuevo Profesor</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        {[['nombre','Nombre completo','Pedro Martínez'],['usuario','Usuario','pedro.martinez'],['password','Contraseña','Mín. 6 caracteres']].map(([k,lbl,ph])=>(
          <div key={k}>
            <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{lbl}</label>
            <input className="wp-input" type={k==='password'?'password':'text'} value={f[k]} onChange={e=>set(k,e.target.value)} placeholder={ph} required />
          </div>
        ))}
        <div>
          <label style={{ display:'block', fontSize:10, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>Club asignado</label>
          <select className="wp-input" value={f.club_id} onChange={e=>set('club_id',e.target.value)} style={{ appearance:'none' }}>
            <option value="" style={{ background:'var(--ink2)' }}>— Asignar después —</option>
            {clubs.map(c=><option key={c.id} value={c.id} style={{ background:'var(--ink2)' }}>{c.nombre}</option>)}
          </select>
        </div>
      </div>
      {error && <p style={{ fontSize:12, color:'#f87171', marginBottom:10 }}>{error}</p>}
      <div style={{ display:'flex', gap:10 }}>
        <button onClick={onCancel} className="btn-ghost" style={{ flex:1 }}>Cancelar</button>
        <button onClick={submit} disabled={loading} className="btn-lime" style={{ flex:2 }}>{loading?'Creando...':'Crear profesor →'}</button>
      </div>
    </div>
  )
}
