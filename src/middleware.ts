import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const pub = ['/login','/api/auth/login','/api/auth/logout','/api/seed','/api/migrate']
  if (pub.some(p=>pathname===p)||pathname.startsWith('/_next')||pathname==='/favicon.ico') return NextResponse.next()
  const token = req.cookies.get('wp_token')?.value
  if (!token) return pathname.startsWith('/api') ? NextResponse.json({error:'No autorizado'},{status:401}) : NextResponse.redirect(new URL('/login',req.url))
  const s = await verifyToken(token)
  if (!s) { const r=NextResponse.redirect(new URL('/login',req.url)); r.cookies.delete('wp_token'); return r }

  // master_admin → solo /master y /api
  if (s.rol === 'master_admin') {
    if (pathname.startsWith('/api')) return NextResponse.next()
    if (pathname.startsWith('/master')) return NextResponse.next()
    return NextResponse.redirect(new URL('/master', req.url))
  }

  // admin (coach) → /coach y /api, no /player ni /master
  if (s.rol === 'admin') {
    if (pathname.startsWith('/api')) return NextResponse.next()
    if (pathname.startsWith('/coach')) return NextResponse.next()
    if (pathname.startsWith('/master')) return NextResponse.redirect(new URL('/coach', req.url))
    return NextResponse.redirect(new URL('/coach', req.url))
  }

  // jugador → solo /player y /api
  if (s.rol === 'jugador') {
    if (pathname.startsWith('/api')) return NextResponse.next()
    if (pathname.startsWith('/player')) return NextResponse.next()
    return NextResponse.redirect(new URL('/player', req.url))
  }

  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
