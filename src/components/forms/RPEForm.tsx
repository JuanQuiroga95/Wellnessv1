'use client'
import { useState } from 'react'
import ScaleInput from '@/components/ui/ScaleInput'
const DESC = {0:'Reposo total',1:'Muy leve',2:'Leve',3:'Moderado',4:'Un poco duro',5:'Duro',6:'Duro+',7:'Muy duro',8:'Muy duro+',9:'Máximo',10:'Esfuerzo absoluto'}
const TIPOS = [{value:'EQUIPO',label:'Equipo — Sesión completa'},{value:'PARCIAL',label:'Equipo — Sesión parcial'},{value:'READAPTACION',label:'Readaptación'}]
export default function RPEForm({ jugadorId, onSuccess }) {
  const [rpe, setRpe] = useState(null)
  const [rpeGimnasio, setRpeGimnasio] = useState(null)
  const [hizoFuerza, setHizoFuerza] = useState(false)
  const [tipo, setTipo] = useState('EQUIPO')
  const [duracion, setDuracion] = useState('90')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const canSubmit = rpe !== null && duracion !== '' && Number(duracion) > 0
  async function submit(e) {
    e.preventDefault(); if (!canSubmit) return
    setLoading(true); setError('')
    try {
      const body: any = { jugador_id:jugadorId, rpe, duracion_min:Number(duracion), tipo_sesion:tipo }
      if (hizoFuerza && rpeGimnasio !== null) body.rpe_gimnasio = rpeGimnasio
      const res = await fetch('/api/logs', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      if (!res.ok) { const d=await res.json(); setError(d.error||'Error'); return }
      setDone(true); setTimeout(()=>{ setDone(false); onSuccess() }, 1600)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }
  if (done) return (
    <div style={{ textAlign:'center', padding:'48px 0' }} className="anim-up">
      <div style={{ width:64, height:64, background:'rgba(200,241,53,.1)', border:'2px solid var(--lime)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:28 }}>✓</div>
      <p style={{ color:'var(--lime)', fontWeight:600, fontSize:16 }}>Carga registrada</p>
    </div>
  )
  return (
    <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Tipo de sesión</label>
        <select className="wp-input" value={tipo} onChange={e=>setTipo(e.target.value)} style={{ appearance:'none', cursor:'pointer' }}>
          {TIPOS.map(t=><option key={t.value} value={t.value} style={{ background:'var(--ink2)' }}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
          Duración <span style={{ color:'var(--fog)', fontWeight:400, textTransform:'none', letterSpacing:'normal' }}>(minutos)</span>
        </label>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input
            type="number" min="1" max="300"
            className="wp-input"
            value={duracion}
            onChange={e=>setDuracion(e.target.value)}
            style={{ width:100, textAlign:'center', fontSize:22, fontWeight:700, fontFamily:'DM Mono,monospace', color:'var(--lime)' }}
          />
          <span style={{ fontSize:12, color:'var(--fog)' }}>min · default 90 · editá si fue distinto</span>
        </div>
      </div>
      <div>
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
          RPE Campo — Escala de Borg (0–10) {rpe!==null && <span style={{ color:'var(--lime)', fontWeight:400, textTransform:'none', letterSpacing:'normal', marginLeft:8 }}>{DESC[rpe]}</span>}
        </label>
        <ScaleInput id="rpe" value={rpe} onChange={setRpe} min={0} max={10} lowLabel="Reposo total" highLabel="Máximo absoluto" isRpe={true} customColors={{}} />
      </div>

      <div style={{ background:'var(--ink2)', padding:16, borderRadius:12, border:'1px solid var(--mist)' }}>
        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <input type="checkbox" checked={hizoFuerza} onChange={e=>setHizoFuerza(e.target.checked)} style={{ width:18, height:18, accentColor:'var(--lime)' }} />
          <span style={{ fontSize:14, fontWeight:600, color:hizoFuerza?'var(--lime)':'var(--silver)' }}>¿Hiciste sesión de fuerza en el gimnasio?</span>
        </label>
        {hizoFuerza && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:'1px dashed rgba(255,255,255,.1)' }} className="anim-up">
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
              RPE Gimnasio (0-10) {rpeGimnasio!==null && <span style={{ color:'#f59e0b', fontWeight:400, textTransform:'none', letterSpacing:'normal', marginLeft:8 }}>{DESC[rpeGimnasio]}</span>}
            </label>
            <ScaleInput id="rpeGimnasio" value={rpeGimnasio} onChange={setRpeGimnasio} min={0} max={10} lowLabel="Reposo total" highLabel="Máximo absoluto" isRpe={true} customColors={{}} />
          </div>
        )}
      </div>

      {rpe !== null && (
        <div style={{ textAlign:'center', padding:20, borderRadius:14, background:'rgba(200,241,53,.06)', border:'1px solid rgba(200,241,53,.2)' }}>
          <div className="display" style={{ fontSize:56, color:'var(--lime)', lineHeight:1 }}>{rpe}</div>
          <div style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--silver)', marginTop:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>RPE registrado</div>
          <div style={{ fontSize:12, color:'var(--fog)', marginTop:4 }}>{DESC[rpe]}</div>
          {duracion && Number(duracion) > 0 && (
            <div style={{ fontSize:13, color:'var(--silver)', marginTop:8, background:'rgba(255,255,255,.04)', borderRadius:8, padding:'6px 12px', display:'inline-block' }}>
              <span style={{ color:'var(--lime)', fontWeight:700, fontSize:16 }}>{Number(duracion) * Number(rpe)} UA</span>
              <span style={{ color:'var(--fog)', marginLeft:8 }}>{duracion} min × RPE {rpe}</span>
            </div>
          )}
        </div>
      )}
      {error && <p style={{ fontSize:12, color:'#f87171' }}>{error}</p>}
      <button type="submit" className="btn-lime" disabled={!canSubmit||loading} style={{ width:'100%', padding:14, fontSize:14 }}>
        {loading ? 'REGISTRANDO...' : 'REGISTRAR CARGA →'}
      </button>
      <p style={{ textAlign:'center', fontSize:11, color:'var(--silver)' }}>Completar 15–30 min después de la sesión</p>
    </form>
  )
}
