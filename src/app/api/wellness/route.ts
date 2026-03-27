import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({error:'No autorizado'},{status:401})
  const { searchParams } = new URL(req.url)
  const jid = searchParams.get('jugadorId')
  const days = parseInt(searchParams.get('days')||'14')
  if (s.rol==='jugador' && String(s.jugadorId)!==jid) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const r = await sql`
    SELECT fecha::text, fatiga::int, calidad_sueno::int, dolor_muscular::int,
           nivel_estres::int, estado_animo::int, dolor_zona,
           COALESCE(dolor_eva::int,0) AS dolor_eva,
           COALESCE(tqr::int,0) AS tqr,
           COALESCE(recovery::int,0) AS recovery,
           COALESCE(entrena_grupo::text,'true') AS entrena_grupo,
           COALESCE(fue_gimnasio::text,'false') AS fue_gimnasio,
           COALESCE(grupos_musculares,'') AS grupos_musculares
    FROM wellness_logs WHERE jugador_id=${jid} AND fecha>=CURRENT_DATE-${days}::int ORDER BY fecha DESC`
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({error:'No autorizado'},{status:401})
  const b = await req.json()
  const { jugador_id, fatiga, calidad_sueno, dolor_muscular, nivel_estres, estado_animo,
          dolor_zona, dolor_eva, tqr, recovery, entrena_grupo, fue_gimnasio, grupos_musculares, fecha } = b
  if (s.rol==='jugador' && s.jugadorId!==jugador_id) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  const d = fecha || new Date().toISOString().split('T')[0]
  // Lookup club_id from jugador if player is posting
  let clubId = s.clubId ?? null
  if (s.rol === 'jugador') {
    const rows = await sql`SELECT club_id FROM jugadores WHERE id=${jugador_id} LIMIT 1`
    clubId = (rows[0] as any)?.club_id ?? null
  }
  const [r] = await sql`
    INSERT INTO wellness_logs(jugador_id,fecha,fatiga,calidad_sueno,dolor_muscular,nivel_estres,estado_animo,
                              dolor_zona,dolor_eva,tqr,recovery,entrena_grupo,fue_gimnasio,grupos_musculares,club_id)
    VALUES(${jugador_id},${d},${fatiga},${calidad_sueno},${dolor_muscular},${nivel_estres},${estado_animo},
           ${dolor_zona||null},${dolor_eva||null},${tqr||null},${recovery||null},
           ${entrena_grupo??true},${fue_gimnasio??false},${grupos_musculares||null},${clubId})
    RETURNING id, fecha::text`
  return NextResponse.json(r)
}
