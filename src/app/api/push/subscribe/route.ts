import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST: Save or update a push subscription for the authenticated user
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Datos de subscription incompletos' }, { status: 400 })
    }

    const sql = getDb()

    // Upsert: if this endpoint already exists for this user, update it
    await sql`
      INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth)
      VALUES (${session.userId}, ${endpoint}, ${keys.p256dh}, ${keys.auth})
      ON CONFLICT (usuario_id, endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        created_at = NOW()
    `

    // Also ensure notification_preferences row exists with defaults
    await sql`
      INSERT INTO notification_preferences (usuario_id)
      VALUES (${session.userId})
      ON CONFLICT (usuario_id) DO NOTHING
    `

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[push/subscribe] Error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}

// DELETE: Remove a push subscription (user disabling notifications)
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const { endpoint } = body

    const sql = getDb()

    if (endpoint) {
      // Remove specific subscription
      await sql`
        DELETE FROM push_subscriptions
        WHERE usuario_id = ${session.userId} AND endpoint = ${endpoint}
      `
    } else {
      // Remove all subscriptions for this user
      await sql`
        DELETE FROM push_subscriptions WHERE usuario_id = ${session.userId}
      `
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[push/subscribe] Delete error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
