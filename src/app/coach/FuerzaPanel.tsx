'use client'
import React, { useState, useEffect } from 'react'
import { Icons, PanelHeader } from './Headers'

export default function FuerzaPanel({ teamData, session }: { teamData: any[], session: any }) {
  const [activeTab, setActiveTab] = useState<'asignar' | 'catalogo' | 'mandamientos' | 'rpe'>('asignar')
  const [ejercicios, setEjercicios] = useState<any[]>([])
  const [mandamientos, setMandamientos] = useState<any[]>([])
  
  // Catálogo form
  const [newEjNombre, setNewEjNombre] = useState('')
  const [newEjVideo, setNewEjVideo] = useState('')
  const [newEjImagen, setNewEjImagen] = useState('')
  const [newEjDesc, setNewEjDesc] = useState('')
  const [newEjMandamiento, setNewEjMandamiento] = useState('')
  const [editEjId, setEditEjId] = useState<number | null>(null)

  // Mandamientos form
  const [newMandNumero, setNewMandNumero] = useState('')
  const [newMandNombre, setNewMandNombre] = useState('')

  // Asignación form
  const [selectedJugador, setSelectedJugador] = useState('')
  const [selectedFecha, setSelectedFecha] = useState(new Date().toISOString().split('T')[0])
  const [selectedMandamiento, setSelectedMandamiento] = useState('')
  const [selectedEjercicio, setSelectedEjercicio] = useState('')
  const [formSeries, setFormSeries] = useState('')
  const [formReps, setFormReps] = useState('')
  const [formPeso, setFormPeso] = useState('')
  const [formRpe, setFormRpe] = useState('')

  // Rutinas guardadas hoy
  const [rutinasDia, setRutinasDia] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedJugador && selectedFecha) {
      loadRutinas()
    }
  }, [selectedJugador, selectedFecha])

  const loadData = async () => {
    try {
      setLoading(true)
      try {
        const mandRes = await fetch('/api/fuerza/mandamientos')
        const mandData = await mandRes.json()
        if (mandData.mandamientos) setMandamientos(mandData.mandamientos)
      } catch (err) { console.error('Error load mandamientos', err) }
      
      try {
        const ejRes = await fetch('/api/fuerza/ejercicios')
        const ejData = await ejRes.json()
        if (ejData.ejercicios) setEjercicios(ejData.ejercicios)
      } catch (err) { console.error('Error load ejercicios', err) }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadRutinas = async () => {
    if (selectedJugador === 'todos') {
      setRutinasDia([])
      return
    }
    try {
      const res = await fetch(`/api/fuerza/rutinas?jugador_id=${selectedJugador}&fecha=${selectedFecha}`)
      const data = await res.json()
      if (data.rutinas) setRutinasDia(data.rutinas)
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddEjercicio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEjNombre) return
    try {
      const url = '/api/fuerza/ejercicios'
      const method = editEjId ? 'PUT' : 'POST'
      const bodyPayload = editEjId ? {
        id: editEjId,
        nombre: newEjNombre, 
        url_video: newEjVideo,
        imagen_url: newEjImagen,
        descripcion: newEjDesc,
        mandamiento_id: newEjMandamiento 
      } : {
        nombre: newEjNombre, 
        url_video: newEjVideo,
        imagen_url: newEjImagen,
        descripcion: newEjDesc,
        mandamiento_id: newEjMandamiento 
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })
      
      if (res.ok) {
        setNewEjNombre('')
        setNewEjVideo('')
        setNewEjImagen('')
        setNewEjDesc('')
        setNewEjMandamiento('')
        setEditEjId(null)
        loadData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditEjercicio = (e: any) => {
    setEditEjId(e.id)
    setNewEjNombre(e.nombre || '')
    setNewEjVideo(e.url_video || '')
    setNewEjImagen(e.imagen_url || '')
    setNewEjDesc(e.descripcion || '')
    setNewEjMandamiento(e.mandamiento_id ? String(e.mandamiento_id) : '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteEjercicio = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este ejercicio?')) return
    try {
      await fetch(`/api/fuerza/ejercicios?id=${id}`, { method: 'DELETE' })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddMandamiento = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/fuerza/mandamientos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: Number(newMandNumero), nombre: newMandNombre })
      })
      setNewMandNumero('')
      setNewMandNombre('')
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteMandamiento = async (id: number) => {
    if (!confirm('¿Seguro que quieres eliminar este mandamiento? Podría afectar los ejercicios asignados a él.')) return
    try {
      await fetch(`/api/fuerza/mandamientos?id=${id}`, { method: 'DELETE' })
      loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setNewEjImagen(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJugador || !selectedFecha || !selectedMandamiento || !selectedEjercicio) return
    
    try {
      const res = await fetch('/api/fuerza/rutinas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jugador_id: selectedJugador === 'todos' ? 'todos' : Number(selectedJugador),
          fecha: selectedFecha,
          mandamiento_id: Number(selectedMandamiento),
          ejercicio_id: Number(selectedEjercicio),
          series: Number(formSeries) || null,
          repeticiones: Number(formReps) || null,
          peso: formPeso,
          rpe: formRpe
        })
      })
      if (res.ok) {
        setFormSeries('')
        setFormReps('')
        setFormPeso('')
        setFormRpe('')
        if (selectedJugador === 'todos') {
          alert('Asignación masiva exitosa. Se asignó la rutina a todos los jugadores.')
        } else {
          loadRutinas()
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleBorrarRutina = async (id: number) => {
    if (!confirm('¿Borrar este ejercicio de la rutina?')) return
    try {
      await fetch(`/api/fuerza/rutinas?id=${id}`, { method: 'DELETE' })
      loadRutinas()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
      <PanelHeader icon={<span style={{fontSize: 28}}>💪</span>} title="RUTINA DE FUERZA" subtitle="Los 10 Mandamientos" color="#ec4899" />
      
      <div style={{ display:'flex', gap:16, marginBottom:24, borderBottom:'1px solid var(--mist)', paddingBottom:12 }}>
        <button 
          onClick={() => setActiveTab('asignar')}
          style={{ background:'transparent', border:'none', color: activeTab === 'asignar' ? '#ec4899' : 'var(--silver)', fontSize:14, fontWeight:600, cursor:'pointer' }}
        >
          Asignar Rutinas
        </button>
        <button 
          onClick={() => setActiveTab('catalogo')}
          style={{ background:'transparent', border:'none', color: activeTab === 'catalogo' ? '#ec4899' : 'var(--silver)', fontSize:14, fontWeight:600, cursor:'pointer' }}
        >
          Catálogo de Ejercicios
        </button>
        <button 
          onClick={() => setActiveTab('rpe')}
          style={{ background:'transparent', border:'none', color: activeTab === 'rpe' ? '#ec4899' : 'var(--silver)', fontSize:14, fontWeight:600, cursor:'pointer' }}
        >
          RPE Gimnasio Hoy
        </button>
        <button 
          onClick={() => setActiveTab('mandamientos')}
          style={{ background:'transparent', border:'none', color: activeTab === 'mandamientos' ? '#ec4899' : 'var(--silver)', fontSize:14, fontWeight:600, cursor:'pointer' }}
        >
          Configurar Mandamientos
        </button>
      </div>

      {activeTab === 'rpe' && (
        <div style={{ background:'var(--ink2)', padding:24, borderRadius:16, border:'1px solid var(--mist)' }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:16, color:'var(--snow)' }}>RPE Gimnasio Registrados Hoy</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {teamData.filter(p => {
              const todayStr = new Date().toISOString().split('T')[0]
              const logToday = p.recentLogs?.find((l:any) => l.fecha === todayStr)
              return logToday && logToday.rpe_gimnasio !== null
            }).length === 0 ? (
              <p style={{ color:'var(--silver)', fontSize:14 }}>No hay registros de RPE Gimnasio hoy.</p>
            ) : (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--mist)', color: 'var(--silver)' }}>
                    <th style={{ padding: '10px 0', fontSize:12, textTransform:'uppercase' }}>Jugador</th>
                    <th style={{ padding: '10px 0', fontSize:12, textTransform:'uppercase' }}>RPE Gimnasio</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.filter(p => {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const logToday = p.recentLogs?.find((l:any) => l.fecha === todayStr)
                    return logToday && logToday.rpe_gimnasio !== null
                  }).map(p => {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const rpe = p.recentLogs.find((l:any) => l.fecha === todayStr).rpe_gimnasio
                    const rpeColor = rpe > 7 ? '#ef4444' : rpe > 4 ? '#f59e0b' : '#22c55e'
                    return (
                      <tr key={p.jugador_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 0', color: 'var(--snow)', fontWeight:600 }}>{p.nombre}</td>
                        <td style={{ padding: '12px 0' }}>
                          <span style={{ 
                            background:`${rpeColor}22`, color:rpeColor, border:`1px solid ${rpeColor}44`,
                            padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 
                          }}>{rpe}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'mandamientos' && (
        <div style={{ background:'var(--ink2)', padding:24, borderRadius:16, border:'1px solid var(--mist)' }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:16, color:'var(--snow)' }}>Añadir Mandamiento</h3>
          <form onSubmit={handleAddMandamiento} style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:32 }}>
            <input 
              type="number" placeholder="Número (Ej: 11)" 
              value={newMandNumero} onChange={e => setNewMandNumero(e.target.value)}
              style={{ width: 120, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px 14px', color:'var(--snow)', fontSize:14 }} 
              required
            />
            <input 
              type="text" placeholder="Nombre del Mandamiento" 
              value={newMandNombre} onChange={e => setNewMandNombre(e.target.value)}
              style={{ flex:1, minWidth:250, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px 14px', color:'var(--snow)', fontSize:14 }} 
              required
            />
            <button type="submit" className="hover-scale" style={{ background:'#ec4899', color:'#fff', border:'none', borderRadius:8, padding:'10px 24px', fontWeight:600, cursor:'pointer' }}>
              Guardar
            </button>
          </form>

          <h3 style={{ margin:'0 0 16px 0', fontSize:16, color:'var(--snow)' }}>Mandamientos Guardados ({mandamientos.length})</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {mandamientos.length === 0 && (
              <div style={{ padding: 16, color: 'var(--silver)', fontSize: 14 }}>No hay mandamientos cargados. Puedes añadirlos arriba.</div>
            )}
            {mandamientos.map(m => (
              <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--ink3)', padding:'12px 16px', borderRadius:8 }}>
                <div>
                  <span style={{ color:'#ec4899', fontWeight:'bold', marginRight:8 }}>{m.numero}.</span>
                  <span style={{ color:'var(--snow)', fontWeight:500 }}>{m.nombre}</span>
                </div>
                <button onClick={() => handleDeleteMandamiento(m.id)} style={{ background:'transparent', border:'none', cursor:'pointer', padding:4, display:'flex', alignItems:'center' }}>
                  <span style={{fontSize: 18}}>🗑️</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'catalogo' && (
        <div style={{ background:'var(--ink2)', padding:24, borderRadius:16, border:'1px solid var(--mist)' }}>
          <h3 style={{ margin:'0 0 16px 0', fontSize:16, color:'var(--snow)' }}>Añadir Ejercicio al Catálogo</h3>
          <form onSubmit={handleAddEjercicio} style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:32 }}>
            <select 
              value={newEjMandamiento} onChange={e => setNewEjMandamiento(e.target.value)}
              style={{ flex:1, minWidth:250, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px 14px', color:'var(--snow)', fontSize:14 }} 
              required
            >
              <option value="">Seleccionar Mandamiento...</option>
              {mandamientos.map(m => (
                <option key={m.id} value={m.id}>{m.numero}. {m.nombre}</option>
              ))}
            </select>
            <input 
              type="text" placeholder="Nombre del Ejercicio (Ej: Sentadilla Trasera)" 
              value={newEjNombre} onChange={e => setNewEjNombre(e.target.value)}
              style={{ flex:1, minWidth:250, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px 14px', color:'var(--snow)', fontSize:14 }} 
              required
            />
            <input 
              type="url" placeholder="URL Video YouTube (Opcional)" 
              value={newEjVideo} onChange={e => setNewEjVideo(e.target.value)}
              style={{ flex:1, minWidth:250, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px 14px', color:'var(--snow)', fontSize:14 }} 
            />
            
            <div style={{ flex: 1, minWidth: 250, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ cursor: 'pointer', background: 'var(--ink3)', border: '1px solid var(--mist)', borderRadius: 8, padding: '10px 14px', color: 'var(--snow)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, flex: 1, transition: 'background .15s' }} className="hover-bg-ink2">
                <span style={{ fontSize: 16 }}>📷</span>
                {newEjImagen ? 'Imagen cargada (Click para cambiar)' : 'Subir Imagen (Opcional)'}
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
              {newEjImagen && (
                <button type="button" onClick={() => setNewEjImagen('')} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
                  Quitar
                </button>
              )}
            </div>

            <textarea 
              placeholder="Descripción del ejercicio (Opcional)" 
              value={newEjDesc} onChange={e => setNewEjDesc(e.target.value)}
              style={{ width:'100%', minHeight:80, background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px 14px', color:'var(--snow)', fontSize:14, resize:'vertical' }} 
            />
            <div style={{ display:'flex', gap:12, marginTop:12 }}>
              <button type="submit" className="hover-scale" style={{ background:'#ec4899', color:'white', border:'none', borderRadius:8, padding:'10px 20px', fontWeight:600, cursor:'pointer' }}>
                {editEjId ? 'Actualizar Ejercicio' : 'Guardar Ejercicio'}
              </button>
              {editEjId && (
                <button type="button" onClick={() => {
                  setEditEjId(null); setNewEjNombre(''); setNewEjVideo(''); setNewEjImagen(''); setNewEjDesc(''); setNewEjMandamiento('')
                }} className="hover-scale" style={{ background:'transparent', color:'var(--silver)', border:'1px solid var(--fog)', borderRadius:8, padding:'10px 20px', fontWeight:600, cursor:'pointer' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <h3 style={{ margin:'0 0 16px 0', fontSize:16, color:'var(--snow)' }}>Ejercicios Guardados ({ejercicios.length})</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {ejercicios.map(e => (
              <div key={e.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--ink3)', padding:'12px 16px', borderRadius:8 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {e.imagen_url && (
                    <img src={e.imagen_url} alt={e.nombre} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--mist)' }} />
                  )}
                  <div>
                    <div style={{ fontWeight:600, color:'var(--snow)' }}>{e.nombre}</div>
                    {e.url_video && <a href={e.url_video} target="_blank" rel="noreferrer" style={{ fontSize:12, color:'#ec4899', textDecoration:'none' }}>Ver Video</a>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:12 }}>
                  <button onClick={() => handleEditEjercicio(e)} className="hover-scale" style={{ background:'transparent', border:'none', color:'var(--silver)', cursor:'pointer', fontSize:12, textDecoration:'underline' }}>
                    Editar
                  </button>
                  <button onClick={() => handleDeleteEjercicio(e.id)} className="hover-scale" style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', width:20, height:20, padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {Icons.Trash}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'asignar' && (
        <div style={{ display:'flex', gap:24, flexWrap:'wrap', alignItems:'flex-start' }}>
          {/* Columna Izquierda: Formulario */}
          <div style={{ flex:1, minWidth:300, background:'var(--ink2)', padding:24, borderRadius:16, border:'1px solid var(--mist)' }}>
            <h3 style={{ margin:'0 0 16px 0', fontSize:16, color:'var(--snow)' }}>Planificar Rutina Diaria</h3>
            <form onSubmit={handleAsignar} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>Jugador</label>
                <select 
                  value={selectedJugador} onChange={e => setSelectedJugador(e.target.value)}
                  style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} required
                >
                  <option value="">Selecciona un jugador...</option>
                  <option value="todos">👉 Todos los jugadores (Asignación Masiva)</option>
                  {teamData.map(p => (
                    <option key={p.jugador_id} value={p.jugador_id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>Fecha</label>
                <input 
                  type="date" value={selectedFecha} onChange={e => setSelectedFecha(e.target.value)}
                  style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} required
                />
              </div>

              <hr style={{ border:'none', borderBottom:'1px solid var(--mist)', margin:'8px 0' }} />

              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>1. Elige un Mandamiento</label>
                <select 
                  value={selectedMandamiento} onChange={e => { setSelectedMandamiento(e.target.value); setSelectedEjercicio('') }}
                  style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} required
                >
                  <option value="">Selecciona el mandamiento...</option>
                  {mandamientos.map(m => (
                    <option key={m.id} value={m.id}>{m.numero}. {m.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>2. Elige el Ejercicio</label>
                <select 
                  value={selectedEjercicio} onChange={e => setSelectedEjercicio(e.target.value)}
                  style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} required
                >
                  <option value="">Selecciona un ejercicio del catálogo...</option>
                  {(selectedMandamiento ? ejercicios.filter(e => String(e.mandamiento_id) === selectedMandamiento) : ejercicios).map(e => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              <div style={{ display:'flex', gap:12 }}>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>Series</label>
                  <input type="number" placeholder="Ej: 4" value={formSeries} onChange={e => setFormSeries(e.target.value)} style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>Reps</label>
                  <input type="number" placeholder="Ej: 8" value={formReps} onChange={e => setFormReps(e.target.value)} style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} />
                </div>
              </div>

              <div style={{ display:'flex', gap:12 }}>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>Peso (opcional)</label>
                  <input type="text" placeholder="Ej: 80kg" value={formPeso} onChange={e => setFormPeso(e.target.value)} style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ display:'block', fontSize:12, color:'var(--silver)', marginBottom:4 }}>RPE (opcional)</label>
                  <input type="text" placeholder="Ej: RPE 8" value={formRpe} onChange={e => setFormRpe(e.target.value)} style={{ width:'100%', background:'var(--ink3)', border:'1px solid var(--mist)', borderRadius:8, padding:'10px', color:'var(--snow)' }} />
                </div>
              </div>

              <button type="submit" className="hover-scale" style={{ background:'#ec4899', color:'white', border:'none', borderRadius:8, padding:'12px', fontWeight:700, cursor:'pointer', marginTop:8 }}>
                + Asignar a Rutina
              </button>
            </form>
          </div>

          {/* Columna Derecha: Rutina Resultante */}
          <div style={{ flex:1.5, minWidth:300 }}>
            {selectedJugador && selectedFecha ? (
              <div style={{ background:'var(--ink2)', padding:24, borderRadius:16, border:'1px solid var(--mist)' }}>
                <h3 style={{ margin:'0 0 4px 0', fontSize:16, color:'var(--snow)' }}>Rutina del Día</h3>
                <p style={{ margin:'0 0 16px 0', fontSize:12, color:'var(--silver)' }}>
                  {selectedJugador === 'todos' ? 'Asignación Masiva (Selecciona un jugador para ver su rutina)' : teamData.find(p=>p.jugador_id===Number(selectedJugador))?.nombre} - {selectedFecha}
                </p>
                
                {rutinasDia.length === 0 ? (
                  <div style={{ color:'var(--fog)', fontSize:14, padding:20, textAlign:'center', border:'1px dashed var(--mist)', borderRadius:8 }}>
                    {selectedJugador === 'todos' ? 'Listo para asignar a todo el equipo.' : 'No hay ejercicios planificados para esta fecha.'}
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                    {/* Agrupar por mandamiento visualmente */}
                    {Array.from(new Set(rutinasDia.map(r => r.mandamiento_numero))).sort((a:any, b:any) => a - b).map(num => {
                      const rutinasMandamiento = rutinasDia.filter(r => r.mandamiento_numero === num)
                      return (
                        <div key={num as number} style={{ background:'rgba(236,72,153,0.05)', border:'1px solid rgba(236,72,153,0.1)', borderRadius:8, padding:12 }}>
                          <h4 style={{ margin:'0 0 12px 0', fontSize:13, color:'#ec4899', textTransform:'uppercase' }}>
                            Mandamiento {num as number}: {rutinasMandamiento[0].mandamiento_nombre}
                          </h4>
                          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {rutinasMandamiento.map(r => (
                              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--ink3)', padding:'10px', borderRadius:6 }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                  {r.ejercicio_imagen_url && (
                                    <img src={r.ejercicio_imagen_url} alt={r.ejercicio_nombre} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--mist)' }} />
                                  )}
                                  <div>
                                    <div style={{ fontSize:14, fontWeight:600, color:'var(--snow)' }}>{r.ejercicio_nombre}</div>
                                    <div style={{ fontSize:11, color:'var(--silver)', marginTop:4, display:'flex', gap:8 }}>
                                      {r.series && <span><strong style={{color:'var(--fog)'}}>Series:</strong> {r.series}</span>}
                                      {r.repeticiones && <span><strong style={{color:'var(--fog)'}}>Reps:</strong> {r.repeticiones}</span>}
                                      {r.peso && <span><strong style={{color:'var(--fog)'}}>Peso:</strong> {r.peso}</span>}
                                      {r.rpe && <span><strong style={{color:'var(--fog)'}}>RPE:</strong> {r.rpe}</span>}
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => handleBorrarRutina(r.id)} className="hover-scale" style={{ background:'transparent', border:'none', color:'#ef4444', cursor:'pointer', width:16, height:16, padding:0, display:'flex', alignItems:'center', justifyContent:'center', opacity:0.7 }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14H7L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background:'var(--ink2)', padding:24, borderRadius:16, border:'1px dashed var(--mist)', color:'var(--fog)', textAlign:'center' }}>
                Selecciona un jugador y una fecha para ver o armar su rutina.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
