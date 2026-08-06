import React, { useState, useEffect } from 'react'
import { PanelHeader, Icons } from './Headers'

export default function AjustesClubPanel() {
  const [loading, setLoading] = useState(true)
  const [esSeleccion, setEsSeleccion] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/club')
        const data = await res.json()
        if (data.club) {
          setEsSeleccion(data.club.es_seleccion || false)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleToggle = async () => {
    const newValue = !esSeleccion
    setEsSeleccion(newValue) // optimistic UI update
    setSaving(true)
    try {
      const res = await fetch('/api/admin/club', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ es_seleccion: newValue })
      })
      if (!res.ok) throw new Error('Error al guardar')
      // reload the page to refresh the session/settings everywhere
      window.location.reload()
    } catch (err) {
      console.error(err)
      setEsSeleccion(!newValue) // revert on error
      alert('Hubo un error al guardar los ajustes.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--silver)' }}>Cargando ajustes...</div>
  }

  return (
    <div className="anim-up" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      <PanelHeader 
        icon="⚙️" 
        title="Ajustes de Club" 
        subtitle="Configuraciones generales de tu institución" 
      />

      <div style={{ background: 'var(--ink2)', border: '1px solid var(--mist)', borderRadius: 16, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18, color: 'var(--snow)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Modo Selección Nacional {esSeleccion && <span style={{ fontSize: 11, background: 'rgba(34,197,94,0.15)', color: '#4ade80', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)' }}>Activado</span>}
            </h3>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--silver)', lineHeight: 1.5 }}>
              Activar este modo adapta el sistema para la dinámica de Selecciones Nacionales:
              <br/><br/>
              • <b>Club de Origen:</b> Permite registrar a qué club pertenece cada jugador de la convocatoria.<br/>
              • <b>Reportes por Club:</b> Habilita la opción de generar informes de rendimiento agrupados por club para enviar a sus preparadores físicos.<br/>
              • <b>Justificación de Ausencias:</b> Añade estados diarios especiales como "Con Club - Partido" o "Con Club - Entrenamiento" para que estas ausencias no penalicen los promedios grupales del microciclo.
            </p>
          </div>
          
          <button 
            onClick={handleToggle}
            disabled={saving}
            style={{ 
              width: 56, height: 32, borderRadius: 16, border: 'none', cursor: 'pointer', position: 'relative',
              background: esSeleccion ? 'var(--lime)' : 'var(--ink)',
              transition: 'background 0.3s',
              opacity: saving ? 0.7 : 1,
              flexShrink: 0
            }}
          >
            <div style={{
              position: 'absolute', top: 4, left: esSeleccion ? 28 : 4,
              width: 24, height: 24, borderRadius: '50%', background: '#fff',
              transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>
      </div>
    </div>
  )
}
