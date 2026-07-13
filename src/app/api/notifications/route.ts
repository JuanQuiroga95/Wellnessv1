import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendReminderEmail, sendBirthdayEmail, sendACWRAlertEmail } from '@/lib/email'
import { calcACWR } from '@/lib/acwr'
import { sendPushToUser, wasAlreadySent, markAsSent } from '@/lib/push'
import { getCurrentTimeInTZ, getTodayInTZ, getTomorrowInTZ } from '@/lib/timezones'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─── Unified Notification Cron ────────────────────────────────────────────────
// Called every 30 min by GitHub Actions (main) or once/day by Vercel cron (backup).
//
// For each user with push enabled:
//   1. Calculate their local time using their timezone preference
//   2. If their local time matches hora_manana → send morning notifications
//   3. If their local time matches hora_tarde → send evening notifications
//   4. Track sent notifications in notification_log to avoid duplicates
//
// Query param ?batch=all forces sending all notifications (Vercel daily backup)

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret')
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const isBatchAll = req.nextUrl.searchParams.get('batch') === 'all'

  if (!isVercelCron && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sql = getDb()
  const results: any[] = []

  try {
    // ── Load all users with their notification preferences ──────────────────
    const users = await sql`
      SELECT u.id, u.nombre, u.email, u.rol, u.club_id, u.activo,
             COALESCE(np.push_enabled, true) AS push_enabled,
             COALESCE(np.timezone, 'America/Argentina/Buenos_Aires') AS timezone,
             COALESCE(np.hora_manana, '08:00') AS hora_manana,
             COALESCE(np.hora_tarde, '20:00') AS hora_tarde,
             COALESCE(np.alerta_cumpleanos, true) AS alerta_cumpleanos,
             COALESCE(np.alerta_acwr, true) AS alerta_acwr,
             COALESCE(np.alerta_dia_partido, true) AS alerta_dia_partido,
             COALESCE(np.alerta_sesion_dia, true) AS alerta_sesion_dia,
             COALESCE(np.alerta_wellness_pendientes, true) AS alerta_wellness_pendientes,
             COALESCE(np.alerta_alta_lesion, true) AS alerta_alta_lesion,
             COALESCE(np.alerta_wellness_reminder, true) AS alerta_wellness_reminder,
             COALESCE(np.alerta_sesion_manana, true) AS alerta_sesion_manana
      FROM usuarios u
      LEFT JOIN notification_preferences np ON np.usuario_id = u.id
      WHERE u.activo = true
    `

    // ── Group users by timezone to batch time calculations ───────────────────
    const timezones = new Set((users as any[]).map(u => String(u.timezone)))
    const tzInfo: Record<string, { currentTime: string; today: string; todayMMDD: string; tomorrow: string }> = {}

    for (const tz of timezones) {
      const currentTime = getCurrentTimeInTZ(tz)
      const today = getTodayInTZ(tz)
      tzInfo[tz] = {
        currentTime,
        today,
        todayMMDD: today.slice(5),
        tomorrow: getTomorrowInTZ(tz),
      }
    }

    // ── Process each user ────────────────────────────────────────────────────
    for (const user of users as any[]) {
      const tz = String(user.timezone)
      const info = tzInfo[tz]
      if (!info) continue

      const isAdmin = user.rol === 'admin' || user.rol === 'master_admin'
      const isPlayer = user.rol === 'jugador'
      const isMorning = isBatchAll || info.currentTime === user.hora_manana
      const isEvening = isBatchAll || info.currentTime === user.hora_tarde

      // Skip if neither morning nor evening for this user
      if (!isMorning && !isEvening) continue

      // ── MORNING notifications ──────────────────────────────────────────────
      if (isMorning && isAdmin) {
        // 1. Birthday alerts
        if (user.alerta_cumpleanos) {
          try {
            const birthdays = await sql`
              SELECT u.nombre AS jugador_nombre,
                     EXTRACT(YEAR FROM AGE(NOW(), j.fecha_nacimiento))::int AS cumple_edad
              FROM jugadores j
              JOIN usuarios u ON u.id = j.usuario_id
              WHERE j.fecha_nacimiento IS NOT NULL
                AND TO_CHAR(j.fecha_nacimiento, 'MM-DD') = ${info.todayMMDD}
                AND u.activo = true
                AND u.club_id = ${user.club_id}
            `
            for (const b of birthdays as any[]) {
              const tipo = `cumpleanos_${b.jugador_nombre}`
              if (await wasAlreadySent(sql, user.id, tipo, info.today)) continue

              // Push notification
              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: '🎂 ¡Cumpleaños hoy!',
                  body: `${b.jugador_nombre} cumple ${b.cumple_edad} años`,
                  url: '/coach',
                  tag: `birthday-${info.today}`,
                })
              }

              // Email notification
              if (user.email) {
                await sendBirthdayEmail(String(user.email), String(user.nombre), String(b.jugador_nombre), Number(b.cumple_edad))
              }

              await markAsSent(sql, user.id, tipo, info.today)
              results.push({ type: 'birthday', coach: user.nombre, jugador: b.jugador_nombre })
            }
          } catch (e: any) {
            results.push({ type: 'birthday', error: e?.message })
          }
        }

        // 2. Session of the day
        if (user.alerta_sesion_dia) {
          try {
            const sesiones = await sql`
              SELECT tipo, titulo, hora_inicio, objetivo, rival, rival_foto
              FROM sesiones_plan
              WHERE (club_id = ${user.club_id} OR admin_id = ${user.id})
                AND fecha = ${info.today}
              ORDER BY hora_inicio ASC
              LIMIT 3
            `
            for (const s of sesiones as any[]) {
              const isMatch = String(s.tipo).toLowerCase() === 'partido'
              const tipo = isMatch ? 'dia_partido' : 'sesion_dia'

              if (isMatch && !user.alerta_dia_partido) continue
              if (await wasAlreadySent(sql, user.id, `${tipo}_${info.today}`, info.today)) continue

              if (user.push_enabled) {
                const title = isMatch ? '⚽ ¡Día de partido!' : `📅 Sesión hoy: ${s.titulo || s.tipo}`
                const body = isMatch
                  ? `vs ${s.rival || '?'} — ${s.hora_inicio || ''}`
                  : `${s.hora_inicio || ''} — ${s.objetivo || s.tipo}`

                await sendPushToUser(sql, user.id, {
                  title,
                  body,
                  url: '/coach',
                  tag: `${tipo}-${info.today}`,
                })
              }

              await markAsSent(sql, user.id, `${tipo}_${info.today}`, info.today)
              results.push({ type: tipo, coach: user.nombre, session: s.titulo || s.tipo })
            }
          } catch (e: any) {
            results.push({ type: 'sesion_dia', error: e?.message })
          }
        }

        // 3. ACWR alerts
        if (user.alerta_acwr) {
          try {
            if (await wasAlreadySent(sql, user.id, 'acwr', info.today)) continue

            const logsRows = await sql`
              SELECT el.jugador_id::int, u2.nombre AS jugador_nombre,
                     el.fecha::text, el.carga_ua::int
              FROM entrenamiento_logs el
              JOIN jugadores j ON j.id = el.jugador_id
              JOIN usuarios u2 ON u2.id = j.usuario_id
              WHERE u2.club_id = ${user.club_id}
                AND u2.activo = true AND u2.rol = 'jugador'
                AND el.fecha >= CURRENT_DATE - 28
              ORDER BY el.jugador_id, el.fecha ASC
            `

            const byPlayer: Record<number, { nombre: string; logs: { fecha: string; carga_ua: number }[] }> = {}
            for (const row of logsRows as any[]) {
              if (!byPlayer[row.jugador_id]) byPlayer[row.jugador_id] = { nombre: String(row.jugador_nombre), logs: [] }
              byPlayer[row.jugador_id].logs.push({ fecha: String(row.fecha), carga_ua: Number(row.carga_ua) || 0 })
            }

            const alertas: { nombre: string; ratio: number; status: string }[] = []
            for (const { nombre, logs } of Object.values(byPlayer)) {
              const acwr = calcACWR(logs)
              if (acwr.status === 'precaucion' || acwr.status === 'peligro') {
                alertas.push({ nombre, ratio: acwr.ratio, status: acwr.status })
              }
            }

            if (alertas.length > 0) {
              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: '⚠️ Alerta de Carga ACWR',
                  body: `${alertas.length} jugador${alertas.length > 1 ? 'es' : ''} en zona de riesgo`,
                  url: '/coach',
                  tag: `acwr-${info.today}`,
                })
              }

              if (user.email) {
                await sendACWRAlertEmail(String(user.email), String(user.nombre), alertas)
              }

              await markAsSent(sql, user.id, 'acwr', info.today)
              results.push({ type: 'acwr_alert', coach: user.nombre, alertas: alertas.length })
            }
          } catch (e: any) {
            results.push({ type: 'acwr_alert', error: e?.message })
          }
        }

        // 4. Injury discharge alerts
        if (user.alerta_alta_lesion) {
          try {
            const altas = await sql`
              SELECT u2.nombre AS jugador_nombre
              FROM lesiones l
              JOIN jugadores j ON j.id = l.jugador_id
              JOIN usuarios u2 ON u2.id = j.usuario_id
              WHERE l.fecha_alta = ${info.today}
                AND u2.club_id = ${user.club_id}
                AND l.estado = 'Alta'
            `
            for (const a of altas as any[]) {
              const tipo = `alta_lesion_${a.jugador_nombre}`
              if (await wasAlreadySent(sql, user.id, tipo, info.today)) continue

              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: '🏥 Alta médica',
                  body: `${a.jugador_nombre} fue dado de alta`,
                  url: '/coach',
                  tag: `alta-${info.today}`,
                })
              }

              await markAsSent(sql, user.id, tipo, info.today)
              results.push({ type: 'alta_lesion', coach: user.nombre, jugador: a.jugador_nombre })
            }
          } catch (e: any) {
            results.push({ type: 'alta_lesion', error: e?.message })
          }
        }
      }

      // ── MORNING notifications for PLAYERS ──────────────────────────────────
      if (isMorning && isPlayer) {
        // Match day notification
        if (user.alerta_sesion_manana) {
          try {
            const sesiones = await sql`
              SELECT tipo, titulo, hora_inicio, rival
              FROM sesiones_plan
              WHERE club_id = ${user.club_id}
                AND fecha = ${info.today}
                AND tipo = 'partido'
              LIMIT 1
            `
            for (const s of sesiones as any[]) {
              const tipo = 'dia_partido_jugador'
              if (await wasAlreadySent(sql, user.id, tipo, info.today)) continue

              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: '⚽ ¡Hoy jugás!',
                  body: `vs ${s.rival || '?'} — ${s.hora_inicio || ''}`,
                  url: '/player',
                  tag: `match-${info.today}`,
                })
              }

              await markAsSent(sql, user.id, tipo, info.today)
              results.push({ type: 'dia_partido_jugador', jugador: user.nombre })
            }
          } catch (e: any) {
            results.push({ type: 'dia_partido_jugador', error: e?.message })
          }
        }
      }

      // ── EVENING notifications ──────────────────────────────────────────────
      if (isEvening && isPlayer) {
        // Wellness reminder
        if (user.alerta_wellness_reminder) {
          try {
            const tipo = 'wellness_reminder'
            if (await wasAlreadySent(sql, user.id, tipo, info.today)) continue

            // Check if player completed wellness today
            const jugador = await sql`
              SELECT j.id FROM jugadores j WHERE j.usuario_id = ${user.id} LIMIT 1
            `
            if (jugador.length === 0) continue

            const wellness = await sql`
              SELECT 1 FROM wellness_logs WHERE jugador_id = ${jugador[0].id} AND fecha = ${info.today} LIMIT 1
            `

            if (wellness.length === 0) {
              // Player hasn't completed wellness today
              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: '📋 ¡Completá tu Wellness!',
                  body: 'Solo toma 2 minutos. Tu info ayuda a prevenir lesiones.',
                  url: '/player',
                  tag: `wellness-${info.today}`,
                  actions: [{ action: 'open', title: 'Completar ahora' }],
                })
              }

              // Also send email if available
              const playerEmail = await sql`
                SELECT COALESCE(j.email, u2.email) AS email
                FROM jugadores j JOIN usuarios u2 ON u2.id = j.usuario_id
                WHERE j.usuario_id = ${user.id} AND COALESCE(j.email, u2.email) IS NOT NULL AND COALESCE(j.email, u2.email) <> ''
                LIMIT 1
              `
              if (playerEmail.length > 0 && playerEmail[0].email) {
                await sendReminderEmail(String(playerEmail[0].email), String(user.nombre))
              }

              await markAsSent(sql, user.id, tipo, info.today)
              results.push({ type: 'wellness_reminder', jugador: user.nombre })
            }
          } catch (e: any) {
            results.push({ type: 'wellness_reminder', error: e?.message })
          }
        }

        // Tomorrow's session notification
        if (user.alerta_sesion_manana) {
          try {
            const tipo = 'sesion_manana'
            if (await wasAlreadySent(sql, user.id, tipo, info.today)) continue

            const sesiones = await sql`
              SELECT tipo, titulo, hora_inicio, rival
              FROM sesiones_plan
              WHERE club_id = ${user.club_id} AND fecha = ${info.tomorrow}
              ORDER BY hora_inicio ASC LIMIT 1
            `
            if (sesiones.length > 0) {
              const s = sesiones[0]
              const isMatch = String(s.tipo).toLowerCase() === 'partido'

              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: isMatch ? '⚽ ¡Mañana jugás!' : '📅 Entrenamiento mañana',
                  body: isMatch
                    ? `vs ${s.rival || '?'} — ${s.hora_inicio || ''}`
                    : `${s.hora_inicio || ''} — ${s.titulo || s.tipo}`,
                  url: '/player',
                  tag: `tomorrow-${info.tomorrow}`,
                })
              }

              await markAsSent(sql, user.id, tipo, info.today)
              results.push({ type: 'sesion_manana', jugador: user.nombre })
            }
          } catch (e: any) {
            results.push({ type: 'sesion_manana', error: e?.message })
          }
        }
      }

      // ── EVENING notifications for COACHES ──────────────────────────────────
      if (isEvening && isAdmin) {
        // Wellness summary — how many players didn't complete
        if (user.alerta_wellness_pendientes) {
          try {
            const tipo = 'wellness_resumen'
            if (await wasAlreadySent(sql, user.id, tipo, info.today)) continue

            const pendientes = await sql`
              SELECT COUNT(*)::int AS count
              FROM jugadores j
              JOIN usuarios u2 ON u2.id = j.usuario_id
              WHERE u2.club_id = ${user.club_id}
                AND u2.activo = true AND u2.rol = 'jugador'
                AND NOT EXISTS (
                  SELECT 1 FROM wellness_logs w WHERE w.jugador_id = j.id AND w.fecha = ${info.today}
                )
            `
            const count = pendientes[0]?.count || 0

            if (count > 0) {
              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: '📋 Wellness pendientes',
                  body: `${count} jugador${count > 1 ? 'es' : ''} no completaron hoy`,
                  url: '/coach',
                  tag: `wellness-summary-${info.today}`,
                })
              }

              await markAsSent(sql, user.id, tipo, info.today)
              results.push({ type: 'wellness_resumen', coach: user.nombre, pendientes: count })
            }
          } catch (e: any) {
            results.push({ type: 'wellness_resumen', error: e?.message })
          }
        }

        // Tomorrow's session for coaches
        if (user.alerta_sesion_dia) {
          try {
            const tipo = 'sesion_manana_coach'
            if (await wasAlreadySent(sql, user.id, tipo, info.today)) continue

            const sesiones = await sql`
              SELECT tipo, titulo, hora_inicio, objetivo, rival
              FROM sesiones_plan
              WHERE (club_id = ${user.club_id} OR admin_id = ${user.id})
                AND fecha = ${info.tomorrow}
              ORDER BY hora_inicio ASC LIMIT 1
            `
            if (sesiones.length > 0) {
              const s = sesiones[0]
              const isMatch = String(s.tipo).toLowerCase() === 'partido'

              if (user.push_enabled) {
                await sendPushToUser(sql, user.id, {
                  title: isMatch ? '⚽ Partido mañana' : `📅 Mañana: ${s.titulo || s.tipo}`,
                  body: isMatch
                    ? `vs ${s.rival || '?'} — ${s.hora_inicio || ''}`
                    : `${s.hora_inicio || ''} — ${s.objetivo || s.tipo}`,
                  url: '/coach',
                  tag: `tomorrow-coach-${info.tomorrow}`,
                })
              }

              await markAsSent(sql, user.id, tipo, info.today)
              results.push({ type: 'sesion_manana_coach', coach: user.nombre })
            }
          } catch (e: any) {
            results.push({ type: 'sesion_manana_coach', error: e?.message })
          }
        }
      }
    }
  } catch (err: any) {
    console.error('[notifications] Fatal error:', err?.message)
    results.push({ type: 'error', message: String(err?.message || err) })
  }

  return NextResponse.json({ ok: true, results, count: results.length })
}
