import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendReminderEmail, sendBirthdayEmail, sendACWRAlertEmail } from '@/lib/email'
import { calcACWR } from '@/lib/acwr'

export const dynamic = 'force-dynamic'

// Vercel Hobby: cron runs once per day at 11:00 UTC = 08:00 Argentina (UTC-3)
// Sends reminders to ALL players who haven't completed wellness today and have email set
// hora_recordatorio is saved but used only as reference (not enforced on Hobby plan)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret')
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  if (!isVercelCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = getDb()

  // Argentina time (UTC-3)
  const AR_OFFSET_MS = -3 * 60 * 60 * 1000
  const nowAR = new Date(Date.now() + AR_OFFSET_MS)
  const today = nowAR.toISOString().split('T')[0]
  const todayMMDD = today.slice(5)

  const results: any[] = []

  // 1. Wellness reminders — all players with email who haven't completed wellness today
  const playersToRemind = await sql`
    SELECT u.nombre, COALESCE(j.email, u.email) AS email, j.id AS jugador_id, j.hora_recordatorio
    FROM jugadores j
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE u.activo = true
      AND COALESCE(j.email, u.email) IS NOT NULL
      AND COALESCE(j.email, u.email) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM wellness_logs w
        WHERE w.jugador_id = j.id AND w.fecha = ${today}
      )
  `

  for (const p of playersToRemind as any[]) {
    const r = await sendReminderEmail(String(p.email), String(p.nombre))
    results.push({ type: 'reminder', nombre: p.nombre, email: p.email, ...r })
  }

  // 2. Birthday alerts — players with birthday today
  const birthdays = await sql`
    SELECT u.nombre AS jugador_nombre,
           EXTRACT(YEAR FROM AGE(NOW(), j.fecha_nacimiento))::int AS cumple_edad
    FROM jugadores j
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE j.fecha_nacimiento IS NOT NULL
      AND TO_CHAR(j.fecha_nacimiento, 'MM-DD') = ${todayMMDD}
      AND u.activo = true
  `

  if ((birthdays as any[]).length > 0) {
    const admins = await sql`
      SELECT nombre, email FROM usuarios
      WHERE rol = 'admin' AND activo = true AND email IS NOT NULL AND email <> ''
    `
    for (const admin of admins as any[]) {
      for (const b of birthdays as any[]) {
        const r = await sendBirthdayEmail(
          String(admin.email),
          String(admin.nombre),
          String(b.jugador_nombre),
          Number(b.cumple_edad)
        )
        results.push({ type: 'birthday', jugador: b.jugador_nombre, to: admin.email, ...r })
      }
    }
  }

  // 3. ACWR alerts — notify each coach if any player in their club is in precaución or peligro
  try {
    const adminsWithEmail = await sql`
      SELECT u.id AS admin_id, u.nombre, u.email, u.club_id
      FROM usuarios u
      WHERE u.rol = 'admin' AND u.activo = true
        AND u.email IS NOT NULL AND u.email <> ''
        AND u.club_id IS NOT NULL
    `

    for (const admin of adminsWithEmail as any[]) {
      // Load last 28 days of training logs for all active players in this club
      const logsRows = await sql`
        SELECT el.jugador_id::int, u.nombre AS jugador_nombre,
               el.fecha::text, el.carga_ua::int
        FROM entrenamiento_logs el
        JOIN jugadores j ON j.id = el.jugador_id
        JOIN usuarios u ON u.id = j.usuario_id
        WHERE u.club_id = ${admin.club_id}
          AND u.activo = true
          AND u.rol = 'jugador'
          AND el.fecha >= CURRENT_DATE - 28
        ORDER BY el.jugador_id, el.fecha ASC
      `

      // Group logs by player
      const byPlayer: Record<number, { nombre: string; logs: { fecha: string; carga_ua: number }[] }> = {}
      for (const row of logsRows as any[]) {
        if (!byPlayer[row.jugador_id]) byPlayer[row.jugador_id] = { nombre: String(row.jugador_nombre), logs: [] }
        byPlayer[row.jugador_id].logs.push({ fecha: String(row.fecha), carga_ua: Number(row.carga_ua) || 0 })
      }

      // Identify players in precaución or peligro
      const alertas: { nombre: string; ratio: number; status: string }[] = []
      for (const { nombre, logs } of Object.values(byPlayer)) {
        const acwr = calcACWR(logs)
        if (acwr.status === 'precaucion' || acwr.status === 'peligro') {
          alertas.push({ nombre, ratio: acwr.ratio, status: acwr.status })
        }
      }

      if (alertas.length > 0) {
        const r = await sendACWRAlertEmail(String(admin.email), String(admin.nombre), alertas)
        results.push({ type: 'acwr_alert', coach: admin.nombre, alertas: alertas.length, ...r })
      }
    }
  } catch (acwrErr: any) {
    // Never let ACWR alerts break the rest of the cron
    console.error('[notifications] ACWR alert error:', acwrErr?.message)
    results.push({ type: 'acwr_alert', error: String(acwrErr?.message || acwrErr) })
  }

  return NextResponse.json({ ok: true, today, results })
}
