import React, { useState, useEffect } from 'react'
import { Icons, PanelHeader, CuadroHeader } from './Headers'

// Componente para mapa de calor/pérdidas
function CanchaMap({ puntos, onAddPunto, onRemovePunto }: any) {
  return (
    <div 
      style={{ 
        width: '100%', maxWidth: 400, aspectRatio: '1.5/1', margin: '0 auto',
        background: '#22c55e', border: '2px solid white', position: 'relative',
        cursor: onAddPunto ? 'crosshair' : 'default', overflow: 'hidden'
      }}
      onClick={(e) => {
        if (!onAddPunto) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        onAddPunto({ x, y })
      }}
    >
      {/* Líneas de la cancha (simplificadas) */}
      <div style={{ position:'absolute', top:'50%', left:0, right:0, height:2, background:'rgba(255,255,255,0.4)', transform:'translateY(-50%)' }} />
      <div style={{ position:'absolute', top:'50%', left:'50%', width:40, height:40, border:'2px solid rgba(255,255,255,0.4)', borderRadius:'50%', transform:'translate(-50%, -50%)' }} />
      
      {/* Puntos de pérdida */}
      {puntos.map((pt: any, i: number) => (
        <div key={i}
          onClick={(e) => {
            e.stopPropagation()
            if (onRemovePunto) onRemovePunto(i)
          }}
          style={{
            position: 'absolute',
            left: `${pt.x}%`, top: `${pt.y}%`,
            width: 12, height: 12, background: 'red', borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            border: '2px solid white', cursor: onRemovePunto ? 'pointer' : 'default',
            boxShadow: '0 0 8px rgba(255,0,0,0.8)'
          }}
        />
      ))}
    </div>
  )
}

export default function TacticaPanel({ teamData, session, today }: { teamData: any[], session: any, today: string }) {
  const [loading, setLoading] = useState(false)
  const [sesiones, setSesiones] = useState<any[]>([])
  const [selectedSesion, setSelectedSesion] = useState<any>(null)
  const [metricas, setMetricas] = useState<any[]>([])
  
  const [editPlayer, setEditPlayer] = useState<any>(null)
  
  // Edit state
  const [goles, setGoles] = useState(0)
  const [asistencias, setAsistencias] = useState(0)
  const [puntosPerdida, setPuntosPerdida] = useState<any[]>([])

  useEffect(() => {
    // Fetch last 30 days sesiones
    async function init() {
      setLoading(true)
      try {
        const d = new Date(today); d.setDate(d.getDate()-365)
        const dEnd = new Date(today); dEnd.setDate(dEnd.getDate()+90)
        const desde = d.toISOString().slice(0,10)
        const hasta = dEnd.toISOString().slice(0,10)
        const rc = await fetch(`/api/calendario?desde=${desde}&hasta=${hasta}`)
        const data = await rc.json()
        const ses = data.sesiones || []
        setSesiones(ses.filter((s:any) => s.tipo !== 'descanso').sort((a:any,b:any) => b.fecha.localeCompare(a.fecha)))
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    init()
  }, [today])

  useEffect(() => {
    if (!selectedSesion) return
    async function loadMetricas() {
      setLoading(true)
      try {
        const res = await fetch(`/api/tactica?sesion_id=${selectedSesion.id}`)
        const data = await res.json()
        setMetricas(data.metrics || [])
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    loadMetricas()
  }, [selectedSesion])

  const handleSave = async () => {
    if (!editPlayer || !selectedSesion) return
    try {
      const res = await fetch('/api/tactica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jugador_id: editPlayer.id,
          sesion_id: selectedSesion.id,
          goles,
          asistencias,
          perdidas: puntosPerdida.length,
          coordenadas_perdida: puntosPerdida
        })
      })
      if (res.ok) {
        // reload metrics
        const r2 = await fetch(`/api/tactica?sesion_id=${selectedSesion.id}`)
        const d2 = await r2.json()
        setMetricas(d2.metrics || [])
        setEditPlayer(null)
      } else {
        alert("Error en el servidor al guardar")
      }
    } catch (e) {
      alert("Error de red guardando métricas")
    }
  }

  const openEditor = (player: any) => {
    const existing = metricas.find(m => m.jugador_id === player.id)
    setGoles(existing?.goles || 0)
    setAsistencias(existing?.asistencias || 0)
    
    let pts = []
    if (existing?.coordenadas_perdida) {
      try { pts = typeof existing.coordenadas_perdida === 'string' ? JSON.parse(existing.coordenadas_perdida) : existing.coordenadas_perdida } catch(e){}
    }
    setPuntosPerdida(pts)
    setEditPlayer(player)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 40 }}>
      <PanelHeader title="MÉTRICAS TÁCTICAS" subtitle="Goles, Asistencias y Mapa de Pérdidas" icon={Icons.metricas || '📊'} />

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <label style={{ color: 'var(--silver)', fontSize: 13, fontWeight: 600 }}>Seleccionar Sesión:</label>
        <select 
          className="wp-input" 
          style={{ width: 300 }}
          value={selectedSesion?.id || ''}
          onChange={(e) => {
            const s = sesiones.find(x => x.id === Number(e.target.value))
            setSelectedSesion(s || null)
          }}
        >
          <option value="">— Elegir Sesión —</option>
          {sesiones.map(s => (
            <option key={s.id} value={s.id}>{s.fecha} - {s.titulo || s.tipo}</option>
          ))}
        </select>
        {loading && <span style={{ color: 'var(--fog)', fontSize:12 }}>Cargando...</span>}
      </div>

      {selectedSesion && (
        <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 20 }}>
          <CuadroHeader title={`Plantel - ${selectedSesion.fecha}`} subtitle="Click en un jugador para editar sus métricas" icon="👥" />
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 16 }}>
            {teamData.map(p => {
              const existing = metricas.find(m => m.jugador_id === p.id)
              return (
                <div 
                  key={p.id} 
                  className="hover-scale"
                  onClick={() => openEditor(p)}
                  style={{ 
                    background: existing ? 'rgba(59,130,246,0.1)' : 'var(--ink3)', 
                    border: existing ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--mist)', 
                    borderRadius: 10, padding: 12, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 4
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--snow)' }}>{p.nombre}</div>
                  {existing ? (
                    <div style={{ fontSize: 11, color: 'var(--silver)', display:'flex', justifyContent:'space-between' }}>
                      <span title="Goles">⚽ {existing.goles}</span>
                      <span title="Asistencias">🎯 {existing.asistencias}</span>
                      <span title="Pérdidas" style={{ color:'#ef4444' }}>❌ {existing.perdidas}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--fog)' }}>Sin registros</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {editPlayer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 24, width: '90%', maxWidth: 500, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: 'var(--snow)', fontSize: 18 }}>Editar: {editPlayer.nombre}</h3>
              <button onClick={() => setEditPlayer(null)} style={{ background: 'transparent', border: 'none', color: 'var(--silver)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ color: 'var(--silver)', fontSize: 12, fontWeight: 600, display:'block', marginBottom:4 }}>⚽ Goles</label>
                <input type="number" min={0} className="wp-input" value={goles} onChange={e=>setGoles(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ color: 'var(--silver)', fontSize: 12, fontWeight: 600, display:'block', marginBottom:4 }}>🎯 Asistencias</label>
                <input type="number" min={0} className="wp-input" value={asistencias} onChange={e=>setAsistencias(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <label style={{ color: 'var(--silver)', fontSize: 12, fontWeight: 600, display:'block', marginBottom:8 }}>
                ❌ Pérdidas de Balón ({puntosPerdida.length})
                <br/><span style={{ fontSize: 10, color: 'var(--fog)', fontWeight:400 }}>Hacé click en la cancha para marcar dónde perdió la pelota. Click en un punto para borrarlo.</span>
              </label>
              
              <CanchaMap 
                puntos={puntosPerdida} 
                onAddPunto={(pt:any) => setPuntosPerdida((p:any) => [...p, pt])}
                onRemovePunto={(idx:number) => setPuntosPerdida((p:any) => p.filter((_:any, i:number) => i !== idx))}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
              <button className="btn-ghost" onClick={() => setEditPlayer(null)}>Cancelar</button>
              <button className="btn-lime" onClick={handleSave}>Guardar Métricas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
