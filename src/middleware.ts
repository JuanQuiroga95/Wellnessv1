import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const pub = ['/login','/api/auth/login','/api/auth/logout','/api/seed']
  if (pub.some(p=>pathname===p)||pathname.startsWith('/_next')||pathname==='/favicon.ico') return NextResponse.next()
  const token = req.cookies.get('wp_token')?.value
  if (!token) return pathname.startsWith('/api') ? NextResponse.json({error:'No autorizado'},{status:401}) : NextResponse.redirect(new URL('/login',req.url))
  const s = await verifyToken(token)
  if (!s) { const r=NextResponse.redirect(new URL('/login',req.url)); r.cookies.delete('wp_token'); return r }

  // master_admin solo puede ir a /master
  if (pathname.startsWith('/master') && s.rol !== 'master_admin') return NextResponse.redirect(new URL('/login',req.url))
  if (s.rol === 'master_admin' && !pathname.startsWith('/master') && !pathname.startsWith('/api')) return NextResponse.redirect(new URL('/master',req.url))

  if (pathname.startsWith('/coach') && s.rol !== 'admin') return NextResponse.redirect(new URL('/player',req.url))
  if (pathname.startsWith('/player') && s.rol === 'admin') return NextResponse.redirect(new URL('/coach',req.url))
  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
