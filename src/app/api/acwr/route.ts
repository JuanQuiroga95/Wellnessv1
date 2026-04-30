export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { sanitizeInt } from '@/lib/security'
import { calcACWR } from '@/lib/acwr'

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const jid = sanitizeInt(searchParams.get('jugadorId'), 1, 9999999)
  if (!jid) return NextResponse.json({ error: 'jugadorId inválido' }, { status: 400 })

  const sql = getDb()
  const [rows, ausRows] = await Promise.all([
    sql`
      SELECT fecha::text, carga_ua::int, carga_uce::int
      FROM entrenamiento_logs
      WHERE jugador_id = ${jid} AND fecha >= CURRENT_DATE - 28
      ORDER BY fecha ASC`,
    sql`
      SELECT fecha::text
      FROM ausencias
      WHERE jugador_id = ${jid} AND fecha >= CURRENT_DATE - 28`,
  ])

  const logs = (rows as any[]).map(r => ({
    fecha: r.fecha,
    carga_ua: Number(r.carga_ua) || 0,
    carga_uce: r.carga_uce != null ? Number(r.carga_uce) : null,
  }))

  const ausencias = (ausRows as any[]).map(r => ({ fecha: r.fecha }))

  return NextResponse.json({
    ua:  calcACWR(logs, new Date(), 'ua', ausencias),
    uce: calcACWR(logs, new Date(), 'uce', ausencias),
  })
}
