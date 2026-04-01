export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

function isMaster(s: any) { return s?.rol === 'master_admin' }

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const coaches = await sql`
    SELECT u.id, u.nombre, u.usuario, u.activo, u.club_id, c.nombre AS club_nombre, u.created_at::text
    FROM usuarios u
    LEFT JOIN clubs c ON c.id=u.club_id
    WHERE u.rol='admin'
    ORDER BY u.nombre`
  return NextResponse.json(coaches)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { nombre, usuario, password, club_id } = await req.json()
  if (!nombre||!usuario||!password) return NextResponse.json({error:'Nombre, usuario y contraseña requeridos'},{status:400})
  const sql = getDb()
  const ex = await sql`SELECT id FROM usuarios WHERE usuario=${usuario} LIMIT 1`
  if (ex.length) return NextResponse.json({error:'Usuario ya existe'},{status:409})
  const h = await bcrypt.hash(password, 12)
  const [u] = await sql`INSERT INTO usuarios(nombre,usuario,password_hash,rol,club_id) VALUES(${nombre},${usuario},${h},'admin',${club_id||null}) RETURNING id`
  return NextResponse.json({ok:true, id:(u as any).id})
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { id, club_id, activo, password } = await req.json()
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  const sql = getDb()
  if (club_id !== undefined) await sql`UPDATE usuarios SET club_id=${club_id} WHERE id=${id} AND rol='admin'`
  if (activo !== undefined) await sql`UPDATE usuarios SET activo=${activo} WHERE id=${id} AND rol='admin'`
  if (password) {
    const h = await bcrypt.hash(password, 12)
    await sql`UPDATE usuarios SET password_hash=${h} WHERE id=${id} AND rol='admin'`
  }
  return NextResponse.json({ok:true})
}
