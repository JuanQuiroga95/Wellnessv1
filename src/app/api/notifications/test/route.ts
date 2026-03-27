import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { sendReminderEmail, sendBirthdayEmail } from '@/lib/email'
import { getSessionFromRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Manual test endpoint — only accessible by admin
// GET /api/notifications/test?type=reminder   → sends reminder to all players with email
// GET /api/notifications/test?type=birthday   → sends birthday test to admin
export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const type = req.nextUrl.searchParams.get('type') || 'reminder'
  const sql = getDb()
  const results: any[] = []

  if (type === 'reminder') {
    const players = await sql`
      SELECT u.nombre, COALESCE(j.email, u.email) AS email, j.hora_recordatorio
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.activo = true
        AND COALESCE(j.email, u.email) IS NOT NULL
        AND COALESCE(j.email, u.email) <> ''
    `
    for (const p of players as any[]) {
      const r = await sendReminderEmail(String(p.email), String(p.nombre))
      results.push({ nombre: p.nombre, email: p.email, ...r })
    }
  }

  if (type === 'birthday') {
    const admins = await sql`
      SELECT nombre, email FROM usuarios WHERE rol = 'admin' AND activo = true AND email IS NOT NULL AND email <> ''
    `
    for (const a of admins as any[]) {
      const r = await sendBirthdayEmail(String(a.email), String(a.nombre), 'Jugador de Prueba', 25)
      results.push({ to: a.email, ...r })
    }
  }

  return NextResponse.json({
    ok: true,
    type,
    env: {
      GMAIL_USER: process.env.GMAIL_USER || '✗ FALTA — configurá en Vercel',
      GMAIL_PASS: process.env.GMAIL_PASS ? '✓ configurado' : '✗ FALTA — configurá en Vercel',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || '(no configurado)',
    },
    results,
  })
}
