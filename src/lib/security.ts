import { NextRequest, NextResponse } from 'next/server'

// ─── Rate Limiter (in-memory, per-instance) ───────────────────────────────────
// Sufficient for Vercel serverless: each instance tracks its own window.
// For multi-instance prod, replace with Upstash Redis.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  req: NextRequest,
  opts: { limit: number; windowMs: number; key?: string }
): { allowed: boolean; response?: NextResponse } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const key = opts.key ? `${opts.key}:${ip}` : ip
  const now = Date.now()

  let entry = rateLimitMap.get(key)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + opts.windowMs }
    rateLimitMap.set(key, entry)
  }
  entry.count++

  if (entry.count > opts.limit) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: 'Demasiadas solicitudes. Intentá más tarde.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
            'X-RateLimit-Limit': String(opts.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      ),
    }
  }
  return { allowed: true }
}

// Prune map periodically to avoid memory leak
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateLimitMap) {
    if (v.resetAt < now) rateLimitMap.delete(k)
  }
}, 60_000)

// ─── Input sanitization ────────────────────────────────────────────────────────
export function sanitizeString(val: unknown, maxLen = 500): string | null {
  if (val === null || val === undefined) return null
  const s = String(val).trim()
  if (s.length === 0) return null
  // Strip null bytes and control chars
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, maxLen)
}

export function sanitizeInt(val: unknown, min = 0, max = 100000): number | null {
  const n = parseInt(String(val))
  if (isNaN(n)) return null
  return Math.min(Math.max(n, min), max)
}

// ─── Club ownership verification ───────────────────────────────────────────────
// Verifies that a jugador_id belongs to the admin's club
// Call this in any admin endpoint that accepts a jugador_id parameter
export async function verifyJugadorOwnership(
  sql: any,
  jugadorId: number,
  clubId: number | null | undefined
): Promise<boolean> {
  if (!clubId) return false
  const rows = await sql`
    SELECT 1 FROM jugadores j
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE j.id = ${jugadorId} AND u.club_id = ${clubId}
    LIMIT 1`
  return rows.length > 0
}

// ─── Security headers ─────────────────────────────────────────────────────────
export function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return res
}
