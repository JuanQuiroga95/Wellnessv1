export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function GET() {
  const sql = getDb();
  
  // Try to fix missing club_id in gps_logs
  const fix = await sql`
    UPDATE gps_logs 
    SET club_id = j.club_id 
    FROM jugadores j 
    WHERE j.id = gps_logs.jugador_id AND gps_logs.club_id IS NULL
    RETURNING gps_logs.id
  `;

  // Try to fix missing club_id in sesiones_plan
  const fixSesiones = await sql`
    UPDATE sesiones_plan
    SET club_id = u.club_id
    FROM usuarios u
    WHERE u.id = sesiones_plan.admin_id AND sesiones_plan.club_id IS NULL
    RETURNING sesiones_plan.id
  `;

  const logs = await sql`
    SELECT id, fecha::text, sesion_id, club_id, tipo_sesion 
    FROM gps_logs 
    WHERE fecha = '2026-05-03' OR fecha = '2026-05-01' OR fecha = '2026-04-12'
  `;

  return NextResponse.json({ 
    fixed_gps_logs: fix.length, 
    fixed_sesiones: fixSesiones.length,
    sample_logs: logs
  });
}
