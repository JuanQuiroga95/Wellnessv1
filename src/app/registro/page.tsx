'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

const PAISES = [
  'Argentina','Uruguay','Chile','Brasil','Paraguay','Bolivia','Perú','Colombia','Venezuela',
  'Ecuador','México','España','Portugal','Italia','Francia','Alemania','Inglaterra',
  'Estados Unidos','Otro'
]

export default function RegistroPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState<'loading'|'valid'|'invalid'|'submitting'|'done'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [tokenNota, setTokenNota] = useState('')

  const [form, setForm] = useState({
    nombre: '', usuario: '', password: '', confirmar: '', clubNombre: '', pais: 'Argentina'
  })

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStatus('invalid'); setErrorMsg('No se proporcionó un link de invitación.'); return }
    fetch(`/api/invites/register?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setStatus('valid'); setTokenNota(d.nota || '') }
        else { setStatus('invalid'); setErrorMsg(d.error || 'Link inválido') }
      })
      .catch(() => { setStatus('invalid'); setErrorMsg('Error al validar el link') })
  }, [token])

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.nombre.trim() || !form.usuario.trim() || !form.password || !form.clubNombre.trim()) {
      setErrorMsg('Completá todos los campos obligatorios'); return
    }
    if (form.password !== form.confirmar) {
      setErrorMsg('Las contraseñas no coinciden'); return
    }
    if (form.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres'); return
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(form.usuario)) {
      setErrorMsg('El usuario solo puede tener letras, números, puntos, guiones y guiones bajos'); return
    }

    setStatus('submitting')
    setErrorMsg('')

    const r = await fetch('/api/invites/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form })
    })
    const d = await r.json()
    if (d.ok) {
      setStatus('done')
      setTimeout(() => router.push('/coach'), 1500)
    } else {
      setStatus('valid')
      setErrorMsg(d.error || 'Error al crear la cuenta')
    }
  }

  // ── Styles ──
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1a1a1a', border: '1px solid #333',
    borderRadius: 10, padding: '12px 14px', fontSize: 15,
    fontFamily: 'DM Sans, sans-serif', color: '#eee', outline: 'none',
    boxSizing: 'border-box'
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#888',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 6
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif', padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>

        {/* Logo / Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg,#c8f135,#22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 16px'
          }}>⚡</div>
          <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color: '#eee', letterSpacing: '0.04em', margin: 0 }}>
            W&P — DEMO
          </h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>
            Creá tu cuenta gratuita · 7 días de acceso completo
          </p>
        </div>

        <div style={{ background: '#111', border: '1px solid #252525', borderRadius: 16, padding: 28 }}>

          {/* LOADING */}
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: 32, color: '#888' }}>
              Validando link...
            </div>
          )}

          {/* INVALID */}
          {status === 'invalid' && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚫</div>
              <h2 style={{ color: '#ef4444', fontSize: 18, marginBottom: 8 }}>Link inválido</h2>
              <p style={{ color: '#888', fontSize: 14 }}>{errorMsg}</p>
              <p style={{ color: '#555', fontSize: 12, marginTop: 16 }}>
                Contactá a W&P para recibir un nuevo link de invitación.
              </p>
            </div>
          )}

          {/* DONE */}
          {status === 'done' && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <h2 style={{ color: '#c8f135', fontSize: 20, marginBottom: 8 }}>¡Cuenta creada!</h2>
              <p style={{ color: '#888', fontSize: 14 }}>Redirigiendo a tu panel...</p>
            </div>
          )}

          {/* FORM */}
          {(status === 'valid' || status === 'submitting') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {tokenNota && (
                <div style={{ background: 'rgba(200,241,53,.08)', border: '1px solid rgba(200,241,53,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c8f135' }}>
                  📋 {tokenNota}
                </div>
              )}

              <div style={{ borderBottom: '1px solid #1e1e1e', paddingBottom: 18 }}>
                <p style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Tu perfil</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nombre completo *</label>
                    <input style={inputStyle} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Pérez" />
                  </div>
                  <div>
                    <label style={labelStyle}>Usuario *</label>
                    <input style={inputStyle} value={form.usuario} onChange={e => set('usuario', e.target.value.toLowerCase().replace(/\s/g,''))} placeholder="juan.perez" />
                    <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Solo letras, números, puntos y guiones. Sin espacios.</p>
                  </div>
                  <div>
                    <label style={labelStyle}>Contraseña *</label>
                    <input style={inputStyle} type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirmar contraseña *</label>
                    <input style={inputStyle} type="password" value={form.confirmar} onChange={e => set('confirmar', e.target.value)} placeholder="Repetí la contraseña" />
                  </div>
                </div>
              </div>

              <div>
                <p style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Tu club / equipo</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nombre del club o equipo *</label>
                    <input style={inputStyle} value={form.clubNombre} onChange={e => set('clubNombre', e.target.value)} placeholder="Club Atlético San Martín" />
                  </div>
                  <div>
                    <label style={labelStyle}>País</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.pais} onChange={e => set('pais', e.target.value)}>
                      {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                  {errorMsg}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={status === 'submitting'}
                style={{
                  background: status === 'submitting' ? '#333' : '#c8f135',
                  color: status === 'submitting' ? '#888' : '#080808',
                  border: 'none', borderRadius: 10, padding: '14px 0',
                  fontSize: 15, fontWeight: 700, cursor: status === 'submitting' ? 'default' : 'pointer',
                  width: '100%', fontFamily: 'DM Sans, sans-serif',
                  transition: 'opacity .15s'
                }}
              >
                {status === 'submitting' ? 'Creando cuenta...' : '🚀 Crear mi cuenta demo'}
              </button>

              <p style={{ fontSize: 11, color: '#555', textAlign: 'center', lineHeight: 1.5 }}>
                Al registrarte aceptás usar la plataforma durante 7 días como prueba.<br/>
                Este link es de uso único y personal.
              </p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#333', marginTop: 16 }}>
          Wellness & Performance · Sistema de control de carga
        </p>
      </div>
    </div>
  )
}
