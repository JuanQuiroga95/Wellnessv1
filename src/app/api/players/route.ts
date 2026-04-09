export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'
const POS_ORDER: Record<string,number> = {'portero':1,'defensa central':2,'lateral derecho':2,'lateral izquierdo':2,'defensa':2,'mediocampista':3,'mediocentro':3,'mediocentro defensivo':3,'mediocentro ofensivo':3,'volante':4,'volante derecho':4,'volante izquierdo':4,'extremo':5,'extremo derecho':5,'extremo izquierdo':5,'delantero':6,'centro delantero':6}

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

async function ensurePasswordPlainCol(sql: any) {
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_plain TEXT` } catch {}
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  await ensurePasswordPlainCol(sql)
  const r = s.rol === 'master_admin'
    ? await sql`SELECT u.id,u.nombre,u.usuario,u.activo,u.password_plain,j.id AS jugador_id,j.posicion,j.edad,
               j.peso_kg::text AS peso_kg,j.estatura_cm,j.pie_habil,j.foto_url,j.email,j.fecha_nacimiento,j.hora_recordatorio,
               j.peso_ideal_min::text AS peso_ideal_min,j.peso_ideal_max::text AS peso_ideal_max
               FROM usuarios u LEFT JOIN jugadores j ON j.usuario_id=u.id
               WHERE u.rol='jugador' AND u.activo=true ORDER BY u.nombre`
    : await sql`SELECT u.id,u.nombre,u.usuario,u.activo,u.password_plain,j.id AS jugador_id,j.posicion,j.edad,
               j.peso_kg::text AS peso_kg,j.estatura_cm,j.pie_habil,j.foto_url,j.email,j.fecha_nacimiento,j.hora_recordatorio,
               j.peso_ideal_min::text AS peso_ideal_min,j.peso_ideal_max::text AS peso_ideal_max
               FROM usuarios u LEFT JOIN jugadores j ON j.usuario_id=u.id
               WHERE u.rol='jugador' AND u.activo=true AND u.club_id=${s.clubId??null}
               ORDER BY u.nombre`
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const b = await req.json()
  const {nombre,usuario,password,posicion,edad,peso_kg,estatura_cm,pie_habil,foto_url,email,fecha_nacimiento,hora_recordatorio,peso_ideal_min,peso_ideal_max} = b
  if (!nombre||!usuario||!password) return NextResponse.json({error:'Nombre, usuario y contraseña requeridos'},{status:400})
  const sql = getDb()
  await ensurePasswordPlainCol(sql)
  const ex = await sql`SELECT id FROM usuarios WHERE usuario=${usuario} LIMIT 1`
  if (ex.length) return NextResponse.json({error:'Usuario ya existe'},{status:409})
  const h = await bcrypt.hash(password,12)
  const [u] = await sql`INSERT INTO usuarios(nombre,usuario,password_hash,password_plain,rol,club_id) VALUES(${nombre},${usuario},${h},${password},'jugador',${s.clubId??null}) RETURNING id`
  const po = POS_ORDER[String(posicion||'').toLowerCase()]??99
  await sql`INSERT INTO jugadores(usuario_id,posicion,posicion_orden,edad,peso_kg,estatura_cm,pie_habil,foto_url,email,fecha_nacimiento,hora_recordatorio,club_id,peso_ideal_min,peso_ideal_max) VALUES(${(u as any).id},${posicion||null},${po},${edad||null},${peso_kg||null},${estatura_cm||null},${pie_habil||'Derecho'},${foto_url||null},${email||null},${fecha_nacimiento||null},${hora_recordatorio||'08:00'},${s.clubId??null},${peso_ideal_min||null},${peso_ideal_max||null})`
  return NextResponse.json({ok:true})
}
