// ─── Web Push Notification utilities (server-side) ──────────────────────────
// Uses the web-push library to send push notifications via the Web Push API.
// Requires VAPID keys configured in environment variables.

import webpush from 'web-push'

// Configure VAPID keys on first import
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@wp-app.com'

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE)
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
  tag?: string
  actions?: { action: string; title: string }[]
}

interface PushSubscriptionData {
  endpoint: string
  p256dh: string
  auth: string
}

/**
 * Send a push notification to a single subscription.
 * Returns { ok: true } on success, or { ok: false, expired: true } if the subscription is gone.
 */
export async function sendPush(sub: PushSubscriptionData, payload: PushPayload): Promise<{ ok: boolean; expired?: boolean; error?: string }> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return { ok: false, error: 'VAPID keys not configured' }
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 } // 1 hour TTL
    )
    return { ok: true }
  } catch (err: any) {
    // Status 410 Gone or 404 = subscription expired/invalid → should be deleted
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      return { ok: false, expired: true }
    }
    console.error('[push] Error sending notification:', err?.message || err)
    return { ok: false, error: String(err?.message || err) }
  }
}

/**
 * Send a push notification to ALL subscriptions of a given user.
 * Automatically cleans up expired subscriptions.
 */
export async function sendPushToUser(sql: any, userId: number, payload: PushPayload): Promise<{ sent: number; expired: number }> {
  const subs = await sql`
    SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE usuario_id = ${userId}
  `

  let sent = 0, expired = 0
  for (const sub of subs as any[]) {
    const result = await sendPush({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth }, payload)
    if (result.ok) {
      sent++
    } else if (result.expired) {
      // Clean up expired subscription
      await sql`DELETE FROM push_subscriptions WHERE id = ${sub.id}`
      expired++
    }
  }

  return { sent, expired }
}

/**
 * Send a push notification to all admins (coaches) of a specific club.
 * Respects notification_preferences if a preference type is specified.
 */
export async function sendPushToAdmins(
  sql: any,
  clubId: number,
  payload: PushPayload,
  prefColumn?: string
): Promise<{ sent: number; expired: number }> {
  // Get all admin user IDs for this club that have push enabled
  let admins: any[]
  if (prefColumn) {
    admins = await sql`
      SELECT u.id FROM usuarios u
      LEFT JOIN notification_preferences np ON np.usuario_id = u.id
      WHERE u.rol = 'admin' AND u.activo = true AND u.club_id = ${clubId}
        AND COALESCE(np.push_enabled, true) = true
        AND COALESCE(np.${sql(prefColumn)}, true) = true
    `.catch(() => [])
    // Fallback: if the dynamic column query fails, just get all admins
    if (!admins || admins.length === 0) {
      admins = await sql`
        SELECT u.id FROM usuarios u
        LEFT JOIN notification_preferences np ON np.usuario_id = u.id
        WHERE u.rol = 'admin' AND u.activo = true AND u.club_id = ${clubId}
          AND COALESCE(np.push_enabled, true) = true
      `
    }
  } else {
    admins = await sql`
      SELECT u.id FROM usuarios u
      LEFT JOIN notification_preferences np ON np.usuario_id = u.id
      WHERE u.rol = 'admin' AND u.activo = true AND u.club_id = ${clubId}
        AND COALESCE(np.push_enabled, true) = true
    `
  }

  let totalSent = 0, totalExpired = 0
  for (const admin of admins as any[]) {
    const { sent, expired } = await sendPushToUser(sql, admin.id, payload)
    totalSent += sent
    totalExpired += expired
  }
  return { sent: totalSent, expired: totalExpired }
}

/**
 * Check if a notification was already sent today (avoids duplicates).
 * Returns true if already sent.
 */
export async function wasAlreadySent(sql: any, userId: number, tipo: string, fecha: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM notification_log WHERE usuario_id = ${userId} AND tipo = ${tipo} AND fecha = ${fecha} LIMIT 1
  `.catch(() => [])
  return rows.length > 0
}

/**
 * Mark a notification as sent.
 */
export async function markAsSent(sql: any, userId: number, tipo: string, fecha: string): Promise<void> {
  await sql`
    INSERT INTO notification_log (usuario_id, tipo, fecha)
    VALUES (${userId}, ${tipo}, ${fecha})
    ON CONFLICT (usuario_id, tipo, fecha) DO NOTHING
  `.catch(() => {})
}
