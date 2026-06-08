export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

function isMaster(s: any) { return s?.rol === 'master_admin' }

async function ensurePasswordPlainCol(sql: any) {
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_plain TEXT` } catch {}
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  await ensurePasswordPlainCol(sql)
  const coaches = await sql`
    SELECT u.id, u.nombre, u.usuario, u.activo, u.club_id, c.nombre AS club_nombre,
           u.created_at::text, u.password_plain,
           u.last_login::text, u.login_count,
           COALESCE(
             (SELECT json_agg(ac.club_id) FROM admin_clubs ac WHERE ac.admin_id = u.id),
             '[]'::json
           ) AS club_ids
    FROM usuarios u
    LEFT JOIN clubs c ON c.id=u.club_id
    WHERE u.rol='admin'
    ORDER BY u.created_at DESC`
  return NextResponse.json(coaches)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { nombre, usuario, password, club_id, club_ids } = await req.json()
  if (!nombre||!usuario||!password) return NextResponse.json({error:'Nombre, usuario y contraseña requeridos'},{status:400})
  const sql = getDb()
  await ensurePasswordPlainCol(sql)
  const ex = await sql`SELECT id FROM usuarios WHERE usuario=${usuario} LIMIT 1`
  if (ex.length) return NextResponse.json({error:'Usuario ya existe'},{status:409})
  const h = await bcrypt.hash(password, 12)
  
  const cids = Array.isArray(club_ids) ? club_ids : (club_id ? [club_id] : [])
  const activeClub = cids.length > 0 ? cids[0] : null

  const [u] = await sql`
    INSERT INTO usuarios(nombre,usuario,password_hash,password_plain,rol,club_id)
    VALUES(${nombre},${usuario},${h},${password},'admin',${activeClub})
    RETURNING id`
  const newId = (u as any).id

  if (cids.length > 0) {
    try {
      for (const cid of cids) {
        await sql`INSERT INTO admin_clubs(admin_id, club_id) VALUES(${newId}, ${cid}) ON CONFLICT DO NOTHING`
      }
    } catch { /* admin_clubs might not exist yet */ }
  }

  return NextResponse.json({ok:true, id:newId})
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { id, club_id, club_ids, activo, password } = await req.json()
  if (!id) return NextResponse.json({error:'id requerido'},{status:400})
  const sql = getDb()
  await ensurePasswordPlainCol(sql)

  if (club_ids !== undefined && Array.isArray(club_ids)) {
    try {
      await sql`DELETE FROM admin_clubs WHERE admin_id=${id}`
      for (const cid of club_ids) {
        await sql`INSERT INTO admin_clubs(admin_id, club_id) VALUES(${id}, ${cid}) ON CONFLICT DO NOTHING`
      }
      const current = await sql`SELECT club_id FROM usuarios WHERE id=${id} LIMIT 1`
      let currentCid = current[0]?.club_id
      if (currentCid && !club_ids.includes(currentCid)) {
        currentCid = club_ids.length > 0 ? club_ids[0] : null
        await sql`UPDATE usuarios SET club_id=${currentCid} WHERE id=${id} AND rol='admin'`
      } else if (!currentCid && club_ids.length > 0) {
        await sql`UPDATE usuarios SET club_id=${club_ids[0]} WHERE id=${id} AND rol='admin'`
      } else if (club_ids.length === 0) {
        await sql`UPDATE usuarios SET club_id=NULL WHERE id=${id} AND rol='admin'`
      }
    } catch { /* graceful fallback */ }
  } else if (club_id !== undefined) {
    await sql`UPDATE usuarios SET club_id=${club_id} WHERE id=${id} AND rol='admin'`
    if (club_id) {
      try { await sql`INSERT INTO admin_clubs(admin_id, club_id) VALUES(${id}, ${club_id}) ON CONFLICT DO NOTHING` } catch {}
    }
  }

  if (activo !== undefined) await sql`UPDATE usuarios SET activo=${activo} WHERE id=${id} AND rol='admin'`
  if (password) {
    const h = await bcrypt.hash(password, 12)
    await sql`UPDATE usuarios SET password_hash=${h}, password_plain=${password} WHERE id=${id} AND rol='admin'`
  }
  return NextResponse.json({ok:true})
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isMaster(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  const sql = getDb()
  await sql`DELETE FROM usuarios WHERE id = ${Number(id)} AND rol = 'admin'`
  return NextResponse.json({ ok: true })
}
