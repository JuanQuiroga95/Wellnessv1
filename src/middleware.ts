import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Public routes — everything else requires a valid token
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/landing.html',
]

// Routes that are public ONLY during first-time setup (before any admin exists)
// In production, protect /api/migrate and /api/seed (root) with master_admin role
// NOTE: /api/seed/calendario and /api/seed/demo are used by regular admins (coach demo load)
const SETUP_ONLY_PATHS = [
  '/api/migrate',
]

// Seed sub-routes that are accessible by regular admins (used for demo data loading)
const ADMIN_SEED_PATHS = [
  '/api/seed/calendario',
  '/api/seed/demo',
]

// Completely blocked from outside — only accessible via Vercel Cron header
const CRON_ONLY_PATHS = ['/api/notifications']

function addSecHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return res
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always skip Next.js internals
  if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
    return NextResponse.next()
  }

  // ── Cron-only endpoints ──────────────────────────────────────────────────────
  if (CRON_ONLY_PATHS.some(p => pathname.startsWith(p))) {
    const isVercelCron = req.headers.get('x-vercel-cron') === '1'
    const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret')
    if (!isVercelCron && secret !== process.env.CRON_SECRET) {
      return addSecHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))
    }
    return addSecHeaders(NextResponse.next())
  }

  // ── Admin seed endpoints (demo load) — require admin or master_admin ──────────
  if (ADMIN_SEED_PATHS.some(p => pathname.startsWith(p))) {
    const token = req.cookies.get('wp_token')?.value
    if (!token) {
      return addSecHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))
    }
    const s = await verifyToken(token)
    if (!s || (s.rol !== 'admin' && s.rol !== 'master_admin')) {
      return addSecHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 403 }))
    }
    return addSecHeaders(NextResponse.next())
  }

  // ── Setup-only endpoints ─────────────────────────────────────────────────────
  if (SETUP_ONLY_PATHS.some(p => pathname.startsWith(p))) {
    const token = req.cookies.get('wp_token')?.value

    // No token → let the route handler decide (it checks if DB is empty for bootstrap)
    if (!token) {
      return addSecHeaders(NextResponse.next())
    }

    // With token → must be master_admin
    const s = await verifyToken(token)
    if (!s || s.rol !== 'master_admin') {
      return addSecHeaders(NextResponse.json({ error: 'No autorizado — se requiere master_admin' }, { status: 403 }))
    }
    return addSecHeaders(NextResponse.next())
  }

  // ── /api/seed root — public for GET (setup check), master_admin for POST ─────
  if (pathname === '/api/seed') {
    if (req.method === 'GET') return addSecHeaders(NextResponse.next())
    const token = req.cookies.get('wp_token')?.value
    if (!token) return addSecHeaders(NextResponse.next()) // route handler decides
    const s = await verifyToken(token)
    if (!s || s.rol !== 'master_admin') {
      return addSecHeaders(NextResponse.json({ error: 'No autorizado — se requiere master_admin' }, { status: 403 }))
    }
    return addSecHeaders(NextResponse.next())
  }

  // ── Public paths ─────────────────────────────────────────────────────────────
  if (PUBLIC_PATHS.some(p => pathname === p)) {
    return addSecHeaders(NextResponse.next())
  }

  // ── All other routes: require valid JWT ──────────────────────────────────────
  const token = req.cookies.get('wp_token')?.value
  if (!token) {
    return pathname.startsWith('/api')
      ? addSecHeaders(NextResponse.json({ error: 'No autorizado' }, { status: 401 }))
      : NextResponse.redirect(new URL('/login', req.url))
  }

  const s = await verifyToken(token)
  if (!s) {
    const r = NextResponse.redirect(new URL('/login', req.url))
    r.cookies.delete('wp_token')
    return addSecHeaders(r)
  }

  // ── Role-based routing ────────────────────────────────────────────────────────
  if (s.rol === 'master_admin') {
    if (pathname.startsWith('/api') || pathname.startsWith('/master')) return addSecHeaders(NextResponse.next())
    return NextResponse.redirect(new URL('/master', req.url))
  }

  if (s.rol === 'admin') {
    if (pathname.startsWith('/api') || pathname.startsWith('/coach')) return addSecHeaders(NextResponse.next())
    if (pathname.startsWith('/master') || pathname.startsWith('/player'))
      return NextResponse.redirect(new URL('/coach', req.url))
    return NextResponse.redirect(new URL('/coach', req.url))
  }

  if (s.rol === 'jugador') {
    if (pathname.startsWith('/api') || pathname.startsWith('/player')) return addSecHeaders(NextResponse.next())
    return NextResponse.redirect(new URL('/player', req.url))
  }

  return addSecHeaders(NextResponse.next())
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.html$|.*\\.png$|.*\\.jpg$|.*\\.svg$|.*\\.ico$).*)'],
}
