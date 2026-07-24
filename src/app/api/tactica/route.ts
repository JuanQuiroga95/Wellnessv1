import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const token = cookies().get('wp_token')?.value
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const sesion_id = searchParams.get('sesion_id')
    const jugador_id = searchParams.get('jugador_id')
    const club_id = payload.club_id || searchParams.get('club_id')

    if (!club_id) return NextResponse.json({ error: 'Falta club_id' }, { status: 400 })

    const sql = neon(process.env.DATABASE_URL!)
    
    let query = 'SELECT * FROM metricas_tacticas WHERE club_id = $1'
    let params: any[] = [club_id]

    if (sesion_id) {
      params.push(Number(sesion_id))
      query += ` AND sesion_id = $${params.length}`
    }
    if (jugador_id) {
      params.push(Number(jugador_id))
      query += ` AND jugador_id = $${params.length}`
    }

    query += ' ORDER BY created_at DESC'

    const metrics = await sql(query, params)
    return NextResponse.json({ metrics })
  } catch (err: any) {
    console.error('Tactica GET Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const token = cookies().get('wp_token')?.value
    if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const body = await request.json()
    const { jugador_id, sesion_id, goles, asistencias, perdidas, coordenadas_perdida } = body
    const club_id = payload.club_id || body.club_id

    if (!jugador_id || !sesion_id || !club_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    const result = await sql(`
      INSERT INTO metricas_tacticas 
        (club_id, jugador_id, sesion_id, goles, asistencias, perdidas, coordenadas_perdida)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (jugador_id, sesion_id)
      DO UPDATE SET
        goles = EXCLUDED.goles,
        asistencias = EXCLUDED.asistencias,
        perdidas = EXCLUDED.perdidas,
        coordenadas_perdida = EXCLUDED.coordenadas_perdida,
        created_at = NOW()
      RETURNING *
    `, [
      club_id, 
      jugador_id, 
      sesion_id, 
      goles || 0, 
      asistencias || 0, 
      perdidas || 0, 
      JSON.stringify(coordenadas_perdida || [])
    ])

    return NextResponse.json({ success: true, metric: result[0] })
  } catch (err: any) {
    console.error('Tactica POST Error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
