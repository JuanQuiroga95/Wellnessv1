import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET environment variable is required. Set it in Vercel → Settings → Environment Variables.')
  return new TextEncoder().encode(s)
}

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
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    return payload as any
  } catch {
    return null
  }
}

// Lazy import of cookies() to avoid tainting API routes at module load time
export async function getSession(): Promise<Session | null> {
  const { cookies } = await import('next/headers')
  const t = cookies().get('wp_token')?.value
  return t ? verifyToken(t) : null
}

export async function getSessionFromRequest(req: NextRequest): Promise<Session | null> {
  const t = req.cookies.get('wp_token')?.value
  return t ? verifyToken(t) : null
}
