import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { Resend } from 'resend'

// Usa onboarding@resend.dev para pruebas, o un email de tu dominio verificado
const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET(req: NextRequest) {
  // Validación de seguridad básica (se puede usar un header Authorization o un query param)
  const authHeader = req.headers.get('authorization')
  const secret = process.env.API_SECRET_TOKEN || 'mi_secreto_cron_123'
  
  if (authHeader !== `Bearer ${secret}` && req.nextUrl.searchParams.get('token') !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Falta RESEND_API_KEY en variables de entorno' }, { status: 500 })
  }

  const sql = getDb()
  
  // Calcular la hora local en Argentina (Buenos Aires)
  const now = new Date()
  const argTimeStr = now.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false })
  // argTimeStr tiene formato "dd/mm/yyyy, hh:mm:ss"
  const timePart = argTimeStr.split(', ')[1] || argTimeStr.split(' ')[1]
  const [hourStr, minStr] = timePart.split(':')
  
  let hours = parseInt(hourStr, 10)
  let minutes = parseInt(minStr, 10)

  // Redondear a la media hora más cercana (00 o 30) para tolerar leves retrasos de GitHub Actions
  let roundedMin = minutes < 15 ? '00' : minutes < 45 ? '30' : '00'
  if (minutes >= 45) {
    hours = (hours + 1) % 24
  }
  
  const targetTime = `${hours.toString().padStart(2, '0')}:${roundedMin}`
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })

  // Buscar jugadores que pidieron recordatorio a esta hora y no llenaron el form
  const players = await sql`
    SELECT j.id, u.nombre, j.email, j.hora_recordatorio 
    FROM jugadores j
    JOIN usuarios u ON j.usuario_id = u.id
    WHERE j.email IS NOT NULL 
      AND j.email != ''
      AND j.hora_recordatorio = ${targetTime}
      AND u.activo = true
      AND NOT EXISTS (
        SELECT 1 FROM wellness_logs w 
        WHERE w.jugador_id = j.id AND w.fecha = ${todayStr}
      )
  `

  if (players.length === 0) {
    return NextResponse.json({ message: `Sin recordatorios pendientes para las ${targetTime}` })
  }

  // Enviar los emails
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tu-plataforma.com'
  
  const results = await Promise.all(players.map(async (p) => {
    try {
      const data = await resend.emails.send({
        from: 'Wellness App <onboarding@resend.dev>', // Importante: Cambiar al dominio verificado en Resend
        to: [p.email],
        subject: '📋 Recordatorio Diario: Completá tu Wellness',
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #000;">Hola ${p.nombre.split(' ')[0]},</h2>
            <p>Este es tu recordatorio diario para completar el cuestionario pre-entrenamiento.</p>
            <p>Tus datos nos ayudan a planificar mejor la carga de hoy y prevenir lesiones.</p>
            <div style="margin-top: 30px;">
              <a href="${appUrl}/login" style="padding: 12px 24px; background-color: #c8f135; color: #000; text-decoration: none; font-weight: bold; border-radius: 8px;">Completar Wellness Ahora</a>
            </div>
          </div>
        `
      })
      return { email: p.email, success: true, data }
    } catch (e) {
      return { email: p.email, success: false, error: e }
    }
  }))

  return NextResponse.json({ message: `Se enviaron ${results.filter(r => r.success).length} recordatorios para las ${targetTime}`, results })
}
