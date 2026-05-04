'use client'
import { useState } from 'react'
import PhotoBodyMap from '@/components/forms/PhotoBodyMap'
import Topbar from '@/components/ui/Topbar'

export default function TestBodyPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [description, setDescription] = useState('')

  return (
    <div style={{ minHeight: '100vh', background: '#020617' }}>
      <Topbar nombre="Demo Elite 3D" rol="admin" tabs={[]} activeTab="" onTabChange={() => {}} />
      
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ color: '#fff', fontSize: 42, fontWeight: 950, letterSpacing: '-0.02em', marginBottom: 12 }}>REPORTE ANATÓMICO 3D</h1>
          <p style={{ color: '#64748b', fontSize: 18, maxWidth: 600, margin: '0 auto' }}>Registro quirúrgico de lesiones con mapa articular completo.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32 }}>
          <PhotoBodyMap 
            selected={selected} 
            onSelect={setSelected} 
            description={description}
            onDescriptionChange={setDescription}
          />

          <div style={{ background: '#0f172a', padding: 32, borderRadius: 24, border: '1px solid #1e293b', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
            <h3 style={{ color: '#fff', fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Tecnología de Mapeo de Elite</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              <div>
                <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>Render Hiper-Realista</p>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>Modelado 3D de alta definición para identificar grupos musculares con exactitud anatómica.</p>
              </div>
              <div>
                <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>Zonas Sensitivas</p>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>Mapeo de coordenadas sobre la imagen para una interactividad fluida y precisa.</p>
              </div>
              <div>
                <p style={{ color: '#ef4444', fontWeight: 700, marginBottom: 8 }}>Claridad Total</p>
                <p style={{ color: '#94a3b8', fontSize: 14 }}>Elimina confusiones. El jugador señala exactamente dónde le duele sobre un modelo real.</p>
              </div>
            </div>
          </div>
        </div>
            
        </div>
          <p style={{ color: '#475569', fontSize: 12 }}>Este es un entorno de prueba. Tu reporte real de wellness no se verá afectado hasta que apruebes el cambio.</p>
        </div>
      </main>
    </div>
  )
}
