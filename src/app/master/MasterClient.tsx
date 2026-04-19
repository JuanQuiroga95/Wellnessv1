'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function MasterClient({ session, clubs: initialClubs, coaches: initialCoaches }) {
  const [clubs, setClubs] = useState(initialClubs)
  const [coaches, setCoaches] = useState(initialCoaches)
  const [tab, setTab] = useState<'clubs'|'coaches'|'borrar'>('clubs')
  const [showNewClub, setShowNewClub] = useState(false)
  const [showNewCoach, setShowNewCoach] = useState(false)
  const [repairing, setRepairing] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const router = useRouter()

  async function repairClubIds() {
    if (!confirm('¿Reparar club_id en todas las tablas? Esto asigna correctamente cada registro a su club. No borra datos.')) return
    setRepairing(true)
    try {
      const r = await fetch('/api/admin/repair-club-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'repair' }) })
      const d = await r.json()
      if (d.ok) alert('✅ Reparación completada. Los registros ahora tienen su club_id correcto.')
      else alert('Error: ' + JSON.stringify(d))
    } finally { setRepairing(false) }
  }

  async function cleanGhostData() {
    if (!confirm('¿Limpiar datos fantasma? Esto elimina jugadores, usuarios y logs que pertenecen a clubes que ya no existen. Esta acción no se puede deshacer.')) return
    setCleaning(true)
    try {
      const r = await fetch('/api/master/cleanup', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        alert('✅ Limpieza completada:\n' + (d.report || []).join('\n'))
        reload()
      } else {
        alert('Error durante la limpieza:\n' + (d.error || JSON.stringify(d)))
      }
    } finally { setCleaning(false) }
  }

  async function reload() {
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/clubs'),
        fetch('/api/master/coaches'),
      ])
      if (!r1.ok || !r2.ok) { console.error('Error recargando datos'); return }
      const [c1, c2] = await Promise.all([r1.json(), r2.json()])
      if (Array.isArray(c1)) setClubs(c1)
      if (Array.isArray(c2)) setCoaches(c2)
    } catch(e) {
      console.error('Error en reload:', e)
    }
  }

  // Run migration on mount to ensure pais column exists in production DB
  useEffect(() => {
    fetch('/api/migrate', { method: 'POST' }).catch(() => {})
  }, [])

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
          {(['clubs','coaches','borrar'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ padding:'8px 24px', borderRadius:7, cursor:'pointer', fontSize:12, fontWeight:600, border:'none', background:tab===t?(t==='borrar'?'#ef4444':'var(--lime)'):'transparent', color:tab===t?(t==='borrar'?'#fff':'var(--ink)'):'var(--silver)', transition:'all .12s', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              {t === 'clubs' ? '🏟️ Clubes' : t === 'coaches' ? '👨‍🏫 Profesores' : '🗑 Borrar Datos'}
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
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={cleanGhostData} disabled={cleaning} style={{ fontSize:12, padding:'10px 18px', borderRadius:8, background:'rgba(239,68,68,.12)', color:'#f87171', border:'1px solid rgba(239,68,68,.35)', cursor:'pointer', fontWeight:600 }}>
                  {cleaning ? '⏳ Limpiando...' : '🧹 Limpiar fantasmas'}
                </button>
                <button onClick={repairClubIds} disabled={repairing} style={{ fontSize:12, padding:'10px 18px', borderRadius:8, background:'rgba(251,191,36,.12)', color:'#fbbf24', border:'1px solid rgba(251,191,36,.35)', cursor:'pointer', fontWeight:600 }}>
                  {repairing ? '⏳ Reparando...' : '🔧 Reparar IDs de BD'}
                </button>
                <button onClick={()=>setShowNewClub(true)} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nuevo club</button>
              </div>
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
          <CoachesTab coaches={coaches} clubs={clubs} showNewCoach={showNewCoach} setShowNewCoach={setShowNewCoach} reload={reload} />
        )}
        {/* BORRAR DATOS TAB */}
        {tab === 'borrar' && (
          <BorrarDatosTab clubs={clubs} coaches={coaches} />
        )}
      </main>
    </div>
  )
}

// ── Borrar Datos Tab ──────────────────────────────────────────────────────────
const DATA_CATEGORIES = [
  { key: 'wellness',      label: 'Wellness',          icon: '💚', desc: 'Registros diarios de bienestar de los jugadores' },
  { key: 'rpe',           label: 'RPE / Cargas',       icon: '⚡', desc: 'Logs de RPE, carga interna y entrenamiento' },
  { key: 'partidos',      label: 'Partidos',           icon: '⚽', desc: 'Minutos jugados y registros de competición' },
  { key: 'gps',           label: 'GPS',                icon: '📡', desc: 'Datos GPS importados de Catapult' },
  { key: 'calendario',    label: 'Calendario',         icon: '📅', desc: 'Sesiones planificadas y bloques de tareas' },
  { key: 'biblioteca',    label: 'Biblioteca',         icon: '📚', desc: 'Tareas guardadas en la biblioteca' },
  { key: 'evaluaciones',  label: 'Evaluaciones',       icon: '📋', desc: 'Pesajes, CMJ, isométricos y evaluaciones físicas' },
  { key: 'lesiones',      label: 'Lesiones',           icon: '🩹', desc: 'Historial de lesiones registradas' },
  { key: 'jugadores',     label: 'Jugadores',          icon: '👥', desc: 'Elimina los jugadores y sus cuentas de usuario' },
]

function BorrarDatosTab({ clubs, coaches }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div>
        <h2 className="display" style={{ fontSize:40, color:'#ef4444' }}>BORRAR DATOS</h2>
        <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Elegí qué datos borrar de cada club. Podés seleccionar categorías específicas. Esta acción <strong style={{ color:'#f87171' }}>no se puede deshacer</strong>.</p>
      </div>
      {clubs.length === 0
        ? <div style={{ padding:48, textAlign:'center', color:'var(--silver)' }}>Sin clubes.</div>
        : clubs.map(club => (
            <BorrarClubPanel key={club.id} club={club} coach={coaches.find(c => c.club_id === club.id)} />
          ))
      }
    </div>
  )
}

function BorrarClubPanel({ club, coach }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string|null>(null)
  const [open, setOpen] = useState(false)

  function toggle(key: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setResult(null)
  }

  function selectAll() {
    setSelected(new Set(DATA_CATEGORIES.map(c => c.key)))
    setResult(null)
  }

  function clearAll() {
    setSelected(new Set())
    setResult(null)
  }

  async function handleDelete() {
    if (selected.size === 0) return
    const cats = Array.from(selected)
    const catLabels = cats.map(k => DATA_CATEGORIES.find(c => c.key === k)?.label).join(', ')
    if (!confirm(`⚠️ ¿Borrar de "${club.nombre}":\n\n${catLabels}\n\nEsta acción no se puede deshacer.`)) return
    if (!confirm(`Confirmá: borrar estos datos de "${club.nombre}"`)) return

    setLoading(true); setResult(null)
    try {
      const r = await fetch('/api/admin/repair-club-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_club_data', club_id: club.id, categories: cats })
      })
      const d = await r.json()
      if (d.ok) {
        setResult(`✅ Borrado exitoso: ${catLabels}`)
        setSelected(new Set())
      } else {
        setResult('❌ Error: ' + JSON.stringify(d))
      }
    } catch (e) {
      setResult('❌ Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const paisObj = PAISES.find((p:any) => p.name === club.pais || p.code === club.pais)

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
      {/* Header — siempre visible */}
      <button onClick={() => setOpen(o => !o)} style={{ width:'100%', padding:'16px 20px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:8, background:'var(--ink3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            {club.logo_url
              ? <img src={club.logo_url} style={{ width:'100%', height:'100%', objectFit:'contain', padding:3 }} alt=""/>
              : <span style={{ fontSize:20 }}>🏟️</span>
            }
          </div>
          <div style={{ textAlign:'left' }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--snow)', marginBottom:1 }}>{club.nombre}</p>
            <p style={{ fontSize:11, color:'var(--silver)' }}>
              {coach ? `👨‍🏫 ${coach.nombre}` : 'Sin profe asignado'} · {club.jugadores || 0} jugadores
            </p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {selected.size > 0 && (
            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(239,68,68,.15)', color:'#f87171', border:'1px solid rgba(239,68,68,.3)', fontWeight:600 }}>
              {selected.size} categoría{selected.size > 1 ? 's' : ''} seleccionada{selected.size > 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize:14, color:'var(--fog)', transition:'transform .15s', display:'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </button>

      {/* Panel expandible */}
      {open && (
        <div style={{ borderTop:'1px solid var(--mist)', padding:'16px 20px 20px' }}>
          {/* Acciones rápidas */}
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <button onClick={selectAll} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', cursor:'pointer', fontWeight:600 }}>
              Seleccionar todo
            </button>
            <button onClick={clearAll} style={{ fontSize:11, padding:'5px 12px', borderRadius:7, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', cursor:'pointer' }}>
              Limpiar selección
            </button>
          </div>

          {/* Checkboxes por categoría */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:8, marginBottom:16 }}>
            {DATA_CATEGORIES.map(cat => {
              const isSelected = selected.has(cat.key)
              const isDestructive = cat.key === 'jugadores'
              return (
                <button key={cat.key} onClick={() => toggle(cat.key)} style={{
                  display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer', textAlign:'left',
                  border: isSelected
                    ? `1.5px solid ${isDestructive ? '#ef4444' : 'rgba(239,68,68,.5)'}`
                    : '1px solid var(--fog)',
                  background: isSelected
                    ? (isDestructive ? 'rgba(239,68,68,.18)' : 'rgba(239,68,68,.1)')
                    : 'var(--ink3)',
                  transition:'all .12s',
                }}>
                  <div style={{
                    width:18, height:18, borderRadius:4, border: isSelected ? 'none' : '1.5px solid var(--fog)',
                    background: isSelected ? (isDestructive ? '#ef4444' : '#f87171') : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1,
                    fontSize:11, color:'#fff', fontWeight:700,
                  }}>
                    {isSelected ? '✓' : ''}
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color: isSelected ? (isDestructive ? '#ef4444' : '#f87171') : 'var(--silver)', marginBottom:2 }}>
                      {cat.icon} {cat.label}
                    </div>
                    <div style={{ fontSize:10, color:'var(--fog)', lineHeight:1.4 }}>{cat.desc}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Resultado */}
          {result && (
            <div style={{ marginBottom:12, padding:'10px 14px', borderRadius:8, background: result.startsWith('✅') ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', border:`1px solid ${result.startsWith('✅') ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`, fontSize:12, color: result.startsWith('✅') ? '#4ade80' : '#f87171' }}>
              {result}
            </div>
          )}

          {/* Botón borrar */}
          <button
            onClick={handleDelete}
            disabled={selected.size === 0 || loading}
            style={{
              width:'100%', padding:'11px', borderRadius:10, cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
              background: selected.size === 0 ? 'var(--ink3)' : 'rgba(239,68,68,.85)',
              color: selected.size === 0 ? 'var(--fog)' : '#fff',
              border: selected.size === 0 ? '1px solid var(--fog)' : '1px solid #ef4444',
              fontSize:13, fontWeight:700, transition:'all .12s',
            }}
          >
            {loading ? '⏳ Borrando...' : selected.size === 0 ? 'Seleccioná al menos una categoría' : `🗑 Borrar ${selected.size} categoría${selected.size > 1 ? 's' : ''} de "${club.nombre}"`}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Lista de países con código ISO para bandera ───────────────────────────────
const PAISES = [
  {code:'ar',name:'Argentina'},{code:'es',name:'España'},
  {code:'br',name:'Brasil'},{code:'mx',name:'México'},
  {code:'co',name:'Colombia'},{code:'cl',name:'Chile'},
  {code:'uy',name:'Uruguay'},{code:'py',name:'Paraguay'},
  {code:'pe',name:'Perú'},{code:'bo',name:'Bolivia'},
  {code:'ve',name:'Venezuela'},{code:'ec',name:'Ecuador'},
  {code:'us',name:'Estados Unidos'},{code:'pt',name:'Portugal'},
  {code:'it',name:'Italia'},{code:'fr',name:'Francia'},
  {code:'de',name:'Alemania'},{code:'gb',name:'Reino Unido'},
  {code:'nl',name:'Países Bajos'},{code:'be',name:'Bélgica'},
  {code:'cr',name:'Costa Rica'},{code:'pa',name:'Panamá'},
  {code:'gt',name:'Guatemala'},{code:'sa',name:'Arabia Saudita'},
  {code:'ae',name:'Emiratos Árabes'},{code:'jp',name:'Japón'},
  {code:'cn',name:'China'},{code:'au',name:'Australia'},
  {code:'za',name:'Sudáfrica'},{code:'tr',name:'Turquía'},
  {code:'ma',name:'Marruecos'},{code:'eg',name:'Egipto'},
]

function FlagImg({ code, size=20 }: { code: string, size?: number }) {
  return <img src={`https://flagcdn.com/w40/${code}.png`} width={size} height={Math.round(size*0.67)}
    style={{ objectFit:'cover', borderRadius:2, flexShrink:0 }} alt={code} />
}

// ── Selector de país custom con banderas reales ────────────────────────────────
function PaisSelector({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = PAISES.find(p => p.name === value)

  return (
    <div style={{ position:'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:'100%', padding:'8px 12px', borderRadius:8, background:'var(--ink3)', border:'1px solid var(--fog)',
          color: selected ? 'var(--snow)' : 'var(--fog)', fontSize:13, cursor:'pointer',
          display:'flex', alignItems:'center', gap:8, textAlign:'left' }}>
        {selected ? (
          <><FlagImg code={selected.code} size={20} /><span>{selected.name}</span></>
        ) : (
          <span>— Sin país —</span>
        )}
        <span style={{ marginLeft:'auto', color:'var(--fog)', fontSize:11 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:200,
          background:'var(--ink2)', border:'1px solid var(--fog)', borderRadius:10,
          maxHeight:240, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,.6)' }}>
          <div onClick={() => { onChange(''); setOpen(false) }}
            style={{ padding:'8px 12px', cursor:'pointer', color:'var(--fog)', fontSize:12,
              borderBottom:'1px solid var(--mist)' }}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--ink3)'}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
            — Sin país —
          </div>
          {PAISES.map(p => (
            <div key={p.code} onClick={() => { onChange(p.name); setOpen(false) }}
              style={{ padding:'7px 12px', cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                background: value === p.name ? 'rgba(200,241,53,.08)' : 'transparent',
                color: value === p.name ? 'var(--lime)' : 'var(--snow)', fontSize:13 }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='var(--ink3)'}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background= value === p.name ? 'rgba(200,241,53,.08)' : 'transparent'}>
              <FlagImg code={p.code} size={22} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function ClubCard({ club, coaches, onRefresh }) {
  const [editing, setEditing] = useState(false)
  const [nombre, setNombre] = useState(club.nombre)
  const [pais, setPais] = useState(club.pais || '')
  const [logoUrl, setLogoUrl] = useState(club.logo_url || '')
  const [logoPreview, setLogoPreview] = useState(club.logo_url || '')
  const [saving, setSaving] = useState(false)

  async function saveClub() {
    setSaving(true)
    const payload: any = { id: club.id }
    if (nombre !== club.nombre) payload.nombre = nombre
    payload.pais = pais || null  // always send pais to ensure it persists
    if (logoUrl !== (club.logo_url || '')) payload.logo_url = logoUrl || null
    const res = await fetch('/api/clubs', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
    const data = await res.json()
    if (data.error) { alert('Error al guardar: ' + data.error); setSaving(false); return }
    setSaving(false); setEditing(false); onRefresh()
  }

  async function handleLogo(e: any) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = () => { setLogoUrl(reader.result as string); setLogoPreview(reader.result as string) }
    reader.readAsDataURL(file)
  }

  async function deleteClub() {
    if (!confirm(`¿Eliminar el club "${club.nombre}"? Esto NO elimina los usuarios.`)) return
    await fetch(`/api/clubs?id=${club.id}`,{method:'DELETE'})
    onRefresh()
  }

  async function deleteClubData() {
    if (!confirm(`⚠️ ¿Borrar TODOS los datos del plantel de "${club.nombre}"?\n\nEsto elimina jugadores, entrenamientos, wellness, evaluaciones, partidos y sesiones.\nNO borra el club ni al profesor.\n\nEsta acción no se puede deshacer.`)) return
    if (!confirm(`Confirmá de nuevo: ¿borrar todos los datos de "${club.nombre}"?`)) return
    const r = await fetch('/api/admin/repair-club-ids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_club_data', club_id: club.id }) })
    const d = await r.json()
    if (d.ok) { alert(`✅ Datos borrados. Se eliminaron ${d.deleted_jugadores} jugadores y todos sus registros.`); onRefresh() }
    else alert('Error: ' + JSON.stringify(d))
  }

  const paisObj = PAISES.find(p => p.name === pais || p.code === pais)

  return (
    <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, padding:20 }}>
      {editing ? (
        <div style={{ marginBottom:14 }}>
          {/* Nombre */}
          <div style={{ display:'flex', gap:8, marginBottom:10 }}>
            <input className="wp-input" value={nombre} onChange={e=>setNombre(e.target.value)}
              style={{ flex:1, padding:'7px 12px', fontSize:13 }} autoFocus placeholder="Nombre del club" />
            <button onClick={saveClub} disabled={saving} style={{ fontSize:12, padding:'7px 12px', borderRadius:8, background:'var(--lime)', color:'var(--ink)', border:'none', cursor:'pointer', fontWeight:700 }}>{saving?'...':'✓'}</button>
            <button onClick={()=>setEditing(false)} style={{ fontSize:12, padding:'7px 10px', borderRadius:8, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', cursor:'pointer' }}>✕</button>
          </div>
          {/* País */}
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:9, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>País</label>
            <PaisSelector value={pais} onChange={setPais} />
          </div>
          {/* Escudo */}
          <div>
            <label style={{ fontSize:9, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>Escudo del club</label>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              <div style={{ width:48, height:48, borderRadius:8, background:'var(--ink3)', border:'1px solid var(--fog)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                {logoPreview ? <img src={logoPreview} style={{ width:'100%', height:'100%', objectFit:'contain', padding:4 }} alt=""/> : <span style={{ fontSize:22 }}>🏟️</span>}
              </div>
              <label style={{ cursor:'pointer', fontSize:12, padding:'6px 14px', borderRadius:8, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', whiteSpace:'nowrap' }}>
                📁 Subir escudo
                <input type="file" accept="image/*" onChange={handleLogo} style={{ display:'none' }} />
              </label>
              {logoPreview && (
                <button onClick={()=>{ setLogoUrl(''); setLogoPreview('') }} style={{ fontSize:11, padding:'6px 10px', borderRadius:8, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', cursor:'pointer' }}>✕ Quitar</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:44, height:44, borderRadius:8, background:'var(--ink3)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
              {club.logo_url
                ? <img src={club.logo_url} style={{ width:'100%', height:'100%', objectFit:'contain', padding:3 }} alt="logo"/>
                : <span style={{ fontSize:22 }}>🏟️</span>
              }
            </div>
            <div>
              <p style={{ fontSize:15, fontWeight:700, color:'var(--snow)' }}>{club.nombre}</p>
              <p style={{ fontSize:11, color:'var(--silver)', marginTop:1, display:'flex', alignItems:'center', gap:5 }}>
                {paisObj && <FlagImg code={paisObj.code} size={16} />}
                {paisObj ? paisObj.name : (club.pais || '')}
              </p>
              <p style={{ fontSize:9, color:'var(--fog)', fontFamily:'DM Mono,monospace', marginTop:1 }}>ID: {club.id}</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={()=>setEditing(true)} style={{ fontSize:11, padding:'4px 8px', borderRadius:6, background:'var(--ink3)', color:'var(--silver)', border:'1px solid var(--fog)', cursor:'pointer' }}>✏️</button>
            <button onClick={deleteClubData} title="Borrar datos del plantel" style={{ fontSize:11, padding:'4px 8px', borderRadius:6, background:'rgba(251,191,36,.1)', color:'#fbbf24', border:'1px solid rgba(251,191,36,.25)', cursor:'pointer' }}>🧹</button>
            <button onClick={deleteClub} title="Eliminar club" style={{ fontSize:11, padding:'4px 8px', borderRadius:6, background:'rgba(239,68,68,.1)', color:'#f87171', border:'1px solid rgba(239,68,68,.25)', cursor:'pointer' }}>🗑</button>
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
function CoachesTab({ coaches, clubs, showNewCoach, setShowNewCoach, reload }) {
  const [search, setSearch] = useState('')
  const filtered = coaches.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    c.usuario.toLowerCase().includes(search.toLowerCase()) ||
    (c.club_nombre || '').toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h2 className="display" style={{ fontSize:40, color:'var(--snow)' }}>PROFESORES</h2>
          <p style={{ fontSize:12, color:'var(--silver)', marginTop:2 }}>Asigná cada profesor a su club</p>
        </div>
        <button onClick={()=>setShowNewCoach(true)} className="btn-lime" style={{ fontSize:12, padding:'10px 18px' }}>+ Nuevo profesor</button>
      </div>

      {showNewCoach && <NewCoachForm clubs={clubs} onSuccess={()=>{ setShowNewCoach(false); reload() }} onCancel={()=>setShowNewCoach(false)} />}

      {/* Buscador */}
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'var(--fog)', pointerEvents:'none' }}>🔍</span>
        <input
          className="wp-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, usuario o club..."
          style={{ width:'100%', padding:'9px 12px 9px 36px', fontSize:13, boxSizing:'border-box' }}
        />
        {search && (
          <button onClick={() => setSearch('')}
            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--fog)', cursor:'pointer', fontSize:16, lineHeight:1, padding:0 }}>✕</button>
        )}
      </div>

      <div style={{ background:'var(--ink2)', border:'1px solid var(--mist)', borderRadius:16, overflow:'hidden' }}>
        {coaches.length === 0
          ? <div style={{ padding:40, textAlign:'center', color:'var(--silver)' }}>Sin profesores aún.</div>
          : filtered.length === 0
            ? <div style={{ padding:32, textAlign:'center', color:'var(--fog)', fontSize:13 }}>Sin resultados para "{search}"</div>
            : filtered.map((coach, i) => (
                <CoachRow key={coach.id} coach={coach} clubs={clubs} last={i===filtered.length-1} onRefresh={reload} />
              ))
        }
      </div>
      {search && filtered.length > 0 && (
        <p style={{ fontSize:11, color:'var(--fog)', textAlign:'right', marginTop:-8 }}>
          {filtered.length} de {coaches.length} profesores
        </p>
      )}
    </div>
  )
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function subscriptionBadge(days: number | null) {
  if (days === null) return { label: 'Sin fecha', color: '#6b7280', bg: 'rgba(107,114,128,.12)' }
  if (days < 30)  return { label: `${days}d`, color: '#22c55e', bg: 'rgba(34,197,94,.12)' }
  if (days < 90)  return { label: `${Math.floor(days/30)}m ${days%30}d`, color: '#60a5fa', bg: 'rgba(96,165,250,.12)' }
  if (days < 180) return { label: `${Math.floor(days/30)}m`, color: '#f59e0b', bg: 'rgba(245,158,11,.12)' }
  if (days < 365) return { label: `${Math.floor(days/30)}m`, color: '#f97316', bg: 'rgba(249,115,22,.12)' }
  return { label: `${Math.floor(days/365)}a ${Math.floor((days%365)/30)}m`, color: '#ef4444', bg: 'rgba(239,68,68,.12)' }
}

function CoachRow({ coach, clubs, last, onRefresh }) {
  const [open, setOpen] = useState(false)
  const [clubId, setClubId] = useState(String(coach.club_id||''))
  const [saving, setSaving] = useState(false)
  const [newPass, setNewPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [currentPass, setCurrentPass] = useState(coach.password_plain || null)
  // Sync when coach data refreshes
  useEffect(() => { setCurrentPass(coach.password_plain || null) }, [coach.password_plain])

  const diasDesdeCreacion = daysSince(coach.created_at)
  const diasDesdeLogin = daysSince(coach.last_login)
  const subBadge = subscriptionBadge(diasDesdeCreacion)

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
        {/* Subscription duration */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
          <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10, background:subBadge.bg, color:subBadge.color, fontFamily:'DM Mono,monospace', fontWeight:600, border:`1px solid ${subBadge.color}33` }}>
            📅 {subBadge.label}
          </span>
          <span style={{ fontSize:10, color: diasDesdeLogin === null ? 'var(--fog)' : diasDesdeLogin <= 3 ? '#22c55e' : diasDesdeLogin <= 14 ? '#f59e0b' : '#ef4444', fontFamily:'DM Mono,monospace' }}>
            {diasDesdeLogin === null ? '⚪ Sin ingresos' : diasDesdeLogin === 0 ? '🟢 Hoy' : diasDesdeLogin === 1 ? '🟢 Ayer' : diasDesdeLogin <= 3 ? `🟢 Hace ${diasDesdeLogin}d` : diasDesdeLogin <= 14 ? `🟡 Hace ${diasDesdeLogin}d` : `🔴 Hace ${diasDesdeLogin}d`}
          </span>
        </div>
        {(() => {
          const clubObj = clubs.find((c: any) => c.id === coach.club_id)
          return coach.club_nombre
            ? <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, padding:'3px 10px 3px 6px', borderRadius:20, background:'rgba(96,165,250,.12)', color:'#93c5fd', border:'1px solid rgba(96,165,250,.25)', fontWeight:600 }}>
                {clubObj?.logo_url
                  ? <img src={clubObj.logo_url} style={{ width:20, height:20, objectFit:'contain', borderRadius:4, flexShrink:0 }} alt="" />
                  : <span style={{ fontSize:13 }}>🏟️</span>
                }
                {coach.club_nombre}
              </span>
            : <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'rgba(245,158,11,.1)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.25)', fontWeight:600 }}>⚠ Sin club</span>
        })()}
        <span style={{ color:'var(--fog)', fontSize:14, transition:'transform .2s', display:'inline-block', transform:open?'rotate(90deg)':'none' }}>›</span>
      </button>

      {open && (
        <div style={{ padding:'14px 24px 20px', background:'var(--ink3)', borderTop:'1px solid var(--mist)' }}>
          {/* Subscription stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
            {[
              { label:'Creado el', val: coach.created_at ? new Date(coach.created_at).toLocaleDateString('es-AR') : '—', color:'var(--silver)' },
              { label:'Antigüedad', val: diasDesdeCreacion !== null ? `${diasDesdeCreacion} días` : '—', color: subBadge.color },
              { label:'Último ingreso', val: coach.last_login ? new Date(coach.last_login).toLocaleDateString('es-AR') : 'Nunca', color: diasDesdeLogin !== null && diasDesdeLogin <= 7 ? '#22c55e' : '#f59e0b' },
              { label:'Total ingresos', val: coach.login_count || 0, color:'#60a5fa' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--ink2)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:9, color:'var(--fog)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:14, fontWeight:600, color:s.color, fontFamily:'DM Mono,monospace' }}>{s.val}</div>
              </div>
            ))}
          </div>
          {/* Renewal alert */}
          {diasDesdeCreacion !== null && (
            <div style={{ marginBottom:14, padding:'8px 12px', borderRadius:8, fontSize:11,
              background: diasDesdeCreacion >= 330 ? 'rgba(239,68,68,.1)' : diasDesdeCreacion >= 80 ? 'rgba(245,158,11,.08)' : 'rgba(34,197,94,.06)',
              color: diasDesdeCreacion >= 330 ? '#f87171' : diasDesdeCreacion >= 80 ? '#fbbf24' : '#4ade80',
              border: `1px solid ${diasDesdeCreacion >= 330 ? 'rgba(239,68,68,.3)' : diasDesdeCreacion >= 80 ? 'rgba(245,158,11,.2)' : 'rgba(34,197,94,.15)'}`,
            }}>
              {diasDesdeCreacion >= 330 ? `⚠️ Renovación inminente — cumple 1 año en ${365 - diasDesdeCreacion} días`
                : diasDesdeCreacion >= 170 ? `📅 Cumple 6 meses en ${180 - diasDesdeCreacion} días`
                : diasDesdeCreacion >= 80 ? `📅 Cumple 3 meses en ${90 - diasDesdeCreacion} días`
                : diasDesdeCreacion >= 25 ? `📅 Cumple 1 mes en ${30 - diasDesdeCreacion} días`
                : `✅ Cuenta nueva — ${30 - diasDesdeCreacion} días hasta el primer mes`}
            </div>
          )}
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
                  {currentPass ? (showPass ? currentPass : '••••••••') : '— cambiala para registrarla —'}
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
