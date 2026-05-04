'use client'
import { useState } from 'react'
import AnatomicalBodyMap from '@/components/forms/AnatomicalBodyMap'
import Topbar from '@/components/ui/Topbar'

export default function TestBodyPage() {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f14' }}>
      <Topbar nombre="Demo Modern Mannequin" rol="admin" tabs={[]} activeTab="" onTabChange={() => {}} />
      
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, marginBottom: 8 }}>DEMO: Anatomía Muscular</h1>
          <p style={{ color: '#94a3b8', fontSize: 16 }}>Prueba de interactividad y diseño para el nuevo reporte de dolor.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          <AnatomicalBodyMap selected={selected} onSelect={setSelected} />

          <div style={{ background: '#0f172a', padding: 24, borderRadius: 16, border: '1px solid #1e293b' }}>
            <h3 style={{ color: '#fff', marginBottom: 12 }}>¿Por qué este diseño?</h3>
            <ul style={{ color: '#94a3b8', paddingLeft: 20, lineHeight: 1.8 }}>
              <li><strong>Anatomía Real:</strong> Las formas representan grupos musculares reales (deltoides, pectorales, vastos, etc).</li>
              <li><strong>Código de Colores:</strong> Inspirado en atlas de anatomía clínica para identificar zonas rápido.</li>
              <li><strong>Feedback Visual:</strong> Al tocar una zona, esta se ilumina con su color representativo.</li>
              <li><strong>Fácil de usar:</strong> Las zonas de clic son más amplias y precisas que el "muñeco de palotes".</li>
            </ul>
            
            {selected && (
              <div style={{ marginTop: 20, padding: 16, background: '#ef444410', border: '1px solid #ef444430', borderRadius: 12 }}>
                <p style={{ color: '#f87171', fontWeight: 700 }}>Zona seleccionada actualmente: {selected}</p>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ color: '#475569', fontSize: 12 }}>Este es un entorno de prueba. Tu reporte real de wellness no se verá afectado hasta que apruebes el cambio.</p>
        </div>
      </main>
    </div>
  )
}
