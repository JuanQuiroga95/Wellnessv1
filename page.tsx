import nodemailer from 'nodemailer'

// Uses Gmail + App Password — no domain needed, sends to anyone
// Required env vars in Vercel:
//   GMAIL_USER = tucuenta@gmail.com
//   GMAIL_PASS = contraseña de aplicación de 16 caracteres (no tu password normal)

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })
}

function getFrom() {
  const user = process.env.GMAIL_USER || ''
  return `W&P App <${user}>`
}

function getAppUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://tu-app.vercel.app'
}

export async function sendReminderEmail(to: string, nombre: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('Email error: GMAIL_USER o GMAIL_PASS no configurados')
    return { ok: false, error: 'GMAIL_USER o GMAIL_PASS no configurados en variables de entorno' }
  }

  const appUrl = getAppUrl()

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
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
    return { ok: true, id: info.messageId }
  } catch (err: any) {
    console.error('Email error:', err)
    return { ok: false, error: String(err?.message || err) }
  }
}

export async function sendBirthdayEmail(to: string, coachNombre: string, jugadorNombre: string, edad?: number) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error('Email error: GMAIL_USER o GMAIL_PASS no configurados')
    return { ok: false, error: 'GMAIL_USER o GMAIL_PASS no configurados en variables de entorno' }
  }

  const appUrl = getAppUrl()

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
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
    return { ok: true, id: info.messageId }
  } catch (err: any) {
    console.error('Birthday email error:', err)
    return { ok: false, error: String(err?.message || err) }
  }
}
