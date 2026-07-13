import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Get notification preferences for the authenticated user
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const sql = getDb()

  // Get or create preferences with defaults
  let rows = await sql`
    SELECT * FROM notification_preferences WHERE usuario_id = ${session.id}
  `.catch(() => [])

  if (rows.length === 0) {
    await sql`
      INSERT INTO notification_preferences (usuario_id)
      VALUES (${session.id})
      ON CONFLICT (usuario_id) DO NOTHING
    `.catch(() => {})

    rows = await sql`
      SELECT * FROM notification_preferences WHERE usuario_id = ${session.id}
    `.catch(() => [])
  }

  const prefs = rows[0] || {
    push_enabled: true,
    timezone: 'America/Argentina/Buenos_Aires',
    hora_manana: '08:00',
    hora_tarde: '20:00',
    alerta_cumpleanos: true,
    alerta_acwr: true,
    alerta_dia_partido: true,
    alerta_sesion_dia: true,
    alerta_wellness_pendientes: true,
    alerta_alta_lesion: true,
    alerta_wellness_reminder: true,
    alerta_sesion_manana: true,
  }

  // Also check if user has any push subscriptions registered
  const subCount = await sql`
    SELECT COUNT(*)::int AS count FROM push_subscriptions WHERE usuario_id = ${session.id}
  `.catch(() => [{ count: 0 }])

  return NextResponse.json({
    ok: true,
    preferences: prefs,
    hasSubscription: (subCount[0]?.count || 0) > 0,
  })
}

// PUT: Update notification preferences
export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await req.json()
    const sql = getDb()

    // Validate timezone if provided
    if (body.timezone && typeof body.timezone !== 'string') {
      return NextResponse.json({ error: 'Timezone inválido' }, { status: 400 })
    }

    // Validate hour format if provided
    const hourRegex = /^\d{2}:\d{2}$/
    if (body.hora_manana && !hourRegex.test(body.hora_manana)) {
      return NextResponse.json({ error: 'Formato de hora inválido (usar HH:MM)' }, { status: 400 })
    }
    if (body.hora_tarde && !hourRegex.test(body.hora_tarde)) {
      return NextResponse.json({ error: 'Formato de hora inválido (usar HH:MM)' }, { status: 400 })
    }

    // Upsert preferences
    await sql`
      INSERT INTO notification_preferences (
        usuario_id, push_enabled, timezone, hora_manana, hora_tarde,
        alerta_cumpleanos, alerta_acwr, alerta_dia_partido, alerta_sesion_dia,
        alerta_wellness_pendientes, alerta_alta_lesion,
        alerta_wellness_reminder, alerta_sesion_manana, updated_at
      ) VALUES (
        ${session.id},
        ${body.push_enabled ?? true},
        ${body.timezone ?? 'America/Argentina/Buenos_Aires'},
        ${body.hora_manana ?? '08:00'},
        ${body.hora_tarde ?? '20:00'},
        ${body.alerta_cumpleanos ?? true},
        ${body.alerta_acwr ?? true},
        ${body.alerta_dia_partido ?? true},
        ${body.alerta_sesion_dia ?? true},
        ${body.alerta_wellness_pendientes ?? true},
        ${body.alerta_alta_lesion ?? true},
        ${body.alerta_wellness_reminder ?? true},
        ${body.alerta_sesion_manana ?? true},
        NOW()
      )
      ON CONFLICT (usuario_id) DO UPDATE SET
        push_enabled = EXCLUDED.push_enabled,
        timezone = EXCLUDED.timezone,
        hora_manana = EXCLUDED.hora_manana,
        hora_tarde = EXCLUDED.hora_tarde,
        alerta_cumpleanos = EXCLUDED.alerta_cumpleanos,
        alerta_acwr = EXCLUDED.alerta_acwr,
        alerta_dia_partido = EXCLUDED.alerta_dia_partido,
        alerta_sesion_dia = EXCLUDED.alerta_sesion_dia,
        alerta_wellness_pendientes = EXCLUDED.alerta_wellness_pendientes,
        alerta_alta_lesion = EXCLUDED.alerta_alta_lesion,
        alerta_wellness_reminder = EXCLUDED.alerta_wellness_reminder,
        alerta_sesion_manana = EXCLUDED.alerta_sesion_manana,
        updated_at = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[push/preferences] Error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
