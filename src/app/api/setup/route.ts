export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  try {
    const sql = getDb()
    let clubId;
    const existing = await sql`SELECT id FROM clubs WHERE nombre = 'No Convocados' LIMIT 1`;
    if (existing.length > 0) {
      clubId = existing[0].id;
    } else {
      const res = await sql`INSERT INTO clubs (nombre, pais) VALUES ('No Convocados', 'Panamá') RETURNING id`;
      clubId = res[0].id;
    }

    const admins = await sql`SELECT DISTINCT admin_id FROM admin_clubs`;
    for (const ad of admins) {
      await sql`INSERT INTO admin_clubs (admin_id, club_id) VALUES (${ad.admin_id}, ${clubId}) ON CONFLICT DO NOTHING`;
    }
    
    return NextResponse.json({ ok: true, clubId })
  } catch(e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
