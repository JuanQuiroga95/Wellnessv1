import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me-in-production-32c')

export interface Session { userId: number; usuario: string; nombre: string; rol: string; jugadorId?: number; clubId?: number; clubNombre?: string }

export async function createToken(p: Session) {
  return new SignJWT({ ...p }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(SECRET)
}
export async function verifyToken(token: string): Promise<Session | null> {
  try { const { payload } = await jwtVerify(token, SECRET); return payload as any } catch { return null }
}
export async function getSession(): Promise<Session | null> {
  const t = cookies().get('wp_token')?.value
  return t ? verifyToken(t) : null
}
export async function getSessionFromRequest(req: NextRequest): Promise<Session | null> {
  const t = req.cookies.get('wp_token')?.value
  return t ? verifyToken(t) : null
}
