export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getDb } from '@/lib/db'
import MasterClient from './MasterClient'

export default async function MasterPage() {
  const session = await getSession()
  if (!session || session.rol !== 'master_admin') redirect('/login')
  const sql = getDb()

  // Ensure columns exist before querying
  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_plain TEXT` } catch {}
  try { await sql`ALTER TABLE clubs ADD COLUMN IF NOT EXISTS pais VARCHAR(100)` } catch {}

  const [clubs, coaches] = await Promise.all([
    sql`SELECT c.id, c.nombre, c.logo_url, c.pais, c.created_at::text,
               COUNT(DISTINCT CASE WHEN u.rol='admin' AND u.activo=true THEN u.id END)::int AS coaches,
               COUNT(DISTINCT CASE WHEN u.rol='jugador' AND u.activo=true THEN u.id END)::int AS jugadores
        FROM clubs c
        LEFT JOIN usuarios u ON u.club_id=c.id
        GROUP BY c.id ORDER BY c.nombre`,
    sql`SELECT u.id, u.nombre, u.usuario, u.activo, u.club_id, c.nombre AS club_nombre,
               u.created_at::text, u.password_plain,
               u.last_login::text, u.login_count,
               COALESCE(
                 (SELECT json_agg(ac.club_id) FROM admin_clubs ac WHERE ac.admin_id = u.id),
                 '[]'::json
               ) AS club_ids
        FROM usuarios u LEFT JOIN clubs c ON c.id=u.club_id
        WHERE u.rol='admin' ORDER BY u.nombre`,
  ])

  return <MasterClient session={session} clubs={clubs} coaches={coaches} />
}
