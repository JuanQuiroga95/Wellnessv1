import { Resend } from 'resend'

// Uses Resend — free up to 3000 emails/month, no domain required for testing
// Required env var in Vercel:
//   RESEND_API_KEY = re_xxxxxxxxxxxxxxxx  (get from resend.com)
//
// Optional — if you have a custom domain verified in Resend:
//   RESEND_FROM = "W&P App <notificaciones@tudominio.com>"
// Without custom domain, Resend sends from onboarding@resend.dev (works fine for testing)

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

function getFrom() {
  return process.env.RESEND_FROM || 'W&P App <onboarding@resend.dev>'
}

function getAppUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://tu-app.vercel.app'
}

export async function sendReminderEmail(to: string, nombre: string) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Email error: RESEND_API_KEY no configurado')
    return { ok: false, error: 'RESEND_API_KEY no configurado en variables de entorno' }
  }

  const appUrl = getAppUrl()

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to,
      subject: '📋 Recordatorio: Completá tu Wellness de hoy',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d0d;color:#eee;padding:32px;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;background:#c8f135;border-radius:8px;padding:8px 16px">
              <span style="font-size:20px;font-weight:900;color:#000;letter-spacing:1px">W&amp;P</span>
            </div>
          </div>
          <h2 style="color:#c8f135;margin:0 0 12px">¡Hola, ${nombre}! 👋</h2>
          <p style="color:#aaa;line-height:1.6;margin:0 0 20px">
            Todavía no completaste el cuestionario de <strong style="color:#fff">Wellness Pre-Entrenamiento</strong> de hoy.
          </p>
          <p style="color:#aaa;line-height:1.6;margin:0 0 28px">
            Solo toma 2 minutos y ayuda al cuerpo técnico a cuidar tu rendimiento y salud.
          </p>
          <div style="text-align:center">
            <a href="${appUrl}/login"
               style="display:inline-block;background:#c8f135;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
              Completar Wellness →
            </a>
          </div>
          <p style="color:#555;font-size:11px;text-align:center;margin-top:28px">
            Para dejar de recibir este recordatorio, pedile al preparador que quite tu email del perfil.
          </p>
        </div>
      `,
    })
    if (error) throw new Error(error.message)
    return { ok: true, id: data?.id }
  } catch (err: any) {
    console.error('Email error:', err)
    return { ok: false, error: String(err?.message || err) }
  }
}

export async function sendACWRAlertEmail(to: string, coachNombre: string, alertas: { nombre: string; ratio: number; status: string }[]) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY no configurado' }
  }

  const appUrl = getAppUrl()
  const filas = alertas.map(a => {
    const color = a.status === 'peligro' ? '#ef4444' : '#f59e0b'
    const label = a.status === 'peligro' ? '🔴 Riesgo Alto' : '🟡 Precaución'
    return `<tr>
      <td style="padding:10px 12px;color:#f1f5f9;font-weight:600">${a.nombre}</td>
      <td style="padding:10px 12px;color:${color};font-weight:700;font-size:16px">${a.ratio.toFixed(2)}</td>
      <td style="padding:10px 12px;color:${color};font-weight:600">${label}</td>
    </tr>`
  }).join('')

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to,
      subject: `⚠️ Alerta de Carga — ${alertas.length} jugador${alertas.length > 1 ? 'es' : ''} en zona de riesgo`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0d0d0d;color:#eee;padding:32px;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;background:#c8f135;border-radius:8px;padding:8px 16px">
              <span style="font-size:20px;font-weight:900;color:#000;letter-spacing:1px">W&amp;P</span>
            </div>
          </div>
          <h2 style="color:#f59e0b;margin:0 0 8px">⚠️ Alerta de Carga ACWR</h2>
          <p style="color:#aaa;margin:0 0 20px">Hola ${coachNombre}, los siguientes jugadores tienen una relación carga aguda/crónica fuera del rango óptimo (0.8–1.3):</p>
          <table style="width:100%;border-collapse:collapse;background:#1e293b;border-radius:10px;overflow:hidden;margin-bottom:24px">
            <thead>
              <tr style="background:#0f172a">
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase">Jugador</th>
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase">ACWR</th>
                <th style="padding:10px 12px;text-align:left;color:#64748b;font-size:11px;text-transform:uppercase">Estado</th>
              </tr>
            </thead>
            <tbody>${filas}</tbody>
          </table>
          <p style="color:#aaa;font-size:12px;margin:0 0 24px">ACWR óptimo: 0.8–1.3 · Precaución: 1.3–1.5 · Riesgo Alto: &gt;1.5</p>
          <div style="text-align:center">
            <a href="${appUrl}/coach" style="display:inline-block;background:#c8f135;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
              Ver plantel →
            </a>
          </div>
        </div>
      `,
    })
    if (error) throw new Error(error.message)
    return { ok: true, id: data?.id }
  } catch (err: any) {
    console.error('ACWR alert email error:', err)
    return { ok: false, error: String(err?.message || err) }
  }
}

export async function sendBirthdayEmail(to: string, coachNombre: string, jugadorNombre: string, edad?: number) {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, error: 'RESEND_API_KEY no configurado' }
  }

  const appUrl = getAppUrl()

  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to,
      subject: `🎂 Cumpleaños hoy: ${jugadorNombre}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0d0d;color:#eee;padding:32px;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="display:inline-block;background:#c8f135;border-radius:8px;padding:8px 16px">
              <span style="font-size:20px;font-weight:900;color:#000;letter-spacing:1px">W&amp;P</span>
            </div>
          </div>
          <div style="text-align:center;font-size:48px;margin:16px 0">🎂</div>
          <h2 style="color:#c8f135;margin:0 0 12px;text-align:center">¡Hoy cumple años ${jugadorNombre}!</h2>
          ${edad ? `<p style="color:#aaa;text-align:center;margin:0 0 20px">Cumple <strong style="color:#fff">${edad} años</strong> hoy.</p>` : ''}
          <p style="color:#aaa;line-height:1.6;margin:0 0 28px;text-align:center">
            ¡No te olvides de saludarlo, ${coachNombre}! 🎉
          </p>
          <div style="text-align:center">
            <a href="${appUrl}/coach"
               style="display:inline-block;background:#c8f135;color:#000;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none">
              Ver plantilla →
            </a>
          </div>
        </div>
      `,
    })
    if (error) throw new Error(error.message)
    return { ok: true, id: data?.id }
  } catch (err: any) {
    console.error('Birthday email error:', err)
    return { ok: false, error: String(err?.message || err) }
  }
}
