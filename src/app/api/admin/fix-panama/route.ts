export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb()
  
  try {
    const clubs = await sql`SELECT id, nombre FROM clubs WHERE nombre ILIKE '%Panamá%' OR nombre ILIKE '%panama%'`
    const clubIds = clubs.map(c => c.id)
    
    if (!clubIds.length) {
      const allClubs = await sql`SELECT id, nombre FROM clubs`
      return NextResponse.json({ error: 'Panama club not found', allClubs })
    }

    // RPE Fix (entrenamiento_logs)
    const rpeRes = await sql`
      UPDATE entrenamiento_logs
      SET fecha = fecha - INTERVAL '1 day'
      WHERE 
        (created_at::time >= '00:00:00'::time AND created_at::time < '05:00:00'::time)
        AND fecha >= '2026-07-01'
        AND jugador_id IN (
          SELECT id FROM jugadores WHERE club_id = ANY(${clubIds}) OR usuario_id IN (SELECT id FROM usuarios WHERE club_id = ANY(${clubIds}))
        )
      RETURNING id, fecha, created_at
    `

    // Wellness Fix
    const wRes = await sql`
      UPDATE wellness_logs
      SET fecha = fecha - INTERVAL '1 day'
      WHERE 
        (created_at::time >= '00:00:00'::time AND created_at::time < '05:00:00'::time)
        AND fecha >= '2026-07-01'
        AND jugador_id IN (
          SELECT id FROM jugadores WHERE club_id = ANY(${clubIds}) OR usuario_id IN (SELECT id FROM usuarios WHERE club_id = ANY(${clubIds}))
        )
      RETURNING id, fecha, created_at
    `

    return NextResponse.json({
      success: true,
      clubs,
      fixedRPE: rpeRes.length,
      fixedWellness: wRes.length,
      details: {
        rpe: rpeRes,
        wellness: wRes
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
