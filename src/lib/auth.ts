import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// IMPORTANT: JWT_SECRET must be set in Vercel environment variables.
// Generate a strong secret: openssl rand -base64 32
// Never use the fallback in production.
const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  console.error('[SECURITY] JWT_SECRET env var is not set! Set it in Vercel dashboard.')
}
const SECRET = new TextEncoder().encode(
  jwtSecret || (() => { throw new Error('JWT_SECRET environment variable is required') })()
)

export interface Session {
  userId: number
  usuario: string
  nombre: string
  rol: string
  jugadorId?: number
  clubId?: number
  clubNombre?: string
  iat?: number
  exp?: number
}

export async function createToken(p: Session) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
    })
    return payload as any
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const t = cookies().get('wp_token')?.value
  return t ? verifyToken(t) : null
}

export async function getSessionFromRequest(req: NextRequest): Promise<Session | null> {
  const t = req.cookies.get('wp_token')?.value
  return t ? verifyToken(t) : null
}
