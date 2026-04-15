export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db'

import { getSessionFromRequest } from '@/lib/auth'



function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }



function localToday(): string {

  const d = new Date()

  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

}



export async function GET(req: NextRequest) {

  try {

    const s = await getSessionFromRequest(req)

    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })



    const { searchParams } = new URL(req.url)

    const desde = searchParams.get('desde') || '2024-01-01'

    const hasta = searchParams.get('hasta') || localToday()

    

    // FIX 1: Bajamos el mínimo a 1 minuto para que Damián no quede fuera del gráfico

    const minEntrenamiento = 1; 



    const hastaInc = (() => {

      const d = new Date(hasta + 'T23:59:59.999Z')

      return d.toISOString()

    })()



    const clubId = s.clubId ? Number(s.clubId) : null

    const sql = getDb()



    // 1. Logs de entrenamiento

    const trainLogs = await sql`

      SELECT el.jugador_id, u.nombre, el.fecha::text, el.carga_ua, el.duracion_min, el.rpe

      FROM entrenamiento_logs el

      JOIN jugadores j ON j.id = el.jugador_id

      JOIN usuarios u ON u.id = j.usuario_id

      WHERE el.fecha >= ${desde}::date AND el.fecha <= ${hastaInc}::timestamp

        AND u.club_id = ${clubId}

      ORDER BY el.fecha ASC

    `



    // 2. Sesiones para Carga Externa (UCE)

    const sesionesParaUCE = await sql`

      SELECT fecha::text, ejercicios FROM sesiones_plan

      WHERE club_id = ${clubId} AND fecha >= ${desde}::date AND fecha <= ${hastaInc}::timestamp

    `



    // 3. Cálculo de Carga Externa (CE) por fecha

    const ceByDate: Record<string, number> = {}

    for (const ses of sesionesParaUCE as any[]) {

      let ceTotal = 0

      for (const bl of (ses.ejercicios || [])) {

        const minTotal = (Number(bl.series)||1) * (Number(bl.minutos)||0)

        const ne = Number(bl.ne) || 5

        let jug = Number(bl.jugadores) || (Number(bl.atacantes)||0) + (Number(bl.defensores)||0) || 1

        

        if (minTotal > 0 && bl.largo && bl.ancho) {

          const densidad = (Number(bl.largo) * Number(bl.ancho)) / jug

          const distEstimada = Math.max(0, (19.243 * Math.log(densidad) - 5.029) * minTotal)

          ceTotal += Math.round(distEstimada * (ne / 5))

        } else {

          ceTotal += minTotal * ne

        }

      }

      ceByDate[ses.fecha] = (ceByDate[ses.fecha] || 0) + ceTotal

    }



    // 4. Tabla de Jugadores (La que ya te funciona)

    const playerMap: Record<number, any> = {}

    trainLogs.forEach((log: any) => {

      if (!playerMap[log.jugador_id]) {

        playerMap[log.jugador_id] = { jugador_id: log.jugador_id, nombre: log.nombre, total_ua: 0, total_rpe: 0, count: 0 }

      }

      playerMap[log.jugador_id].total_ua += Number(log.carga_ua) || 0

      playerMap[log.jugador_id].total_rpe += Number(log.rpe) || 0

      playerMap[log.jugador_id].count += 1

    })



    const players = Object.values(playerMap).map((p: any) => ({

      jugador_id: p.jugador_id,

      nombre: p.nombre,

      rpe: Math.round((p.total_rpe / p.count) * 10) / 10,

      ua: Math.round(p.total_ua / p.count),

      ua_total: p.total_ua,

      sesiones: p.count

    })).sort((a,b) => a.nombre.localeCompare(b.nombre))



    // 5. Datos diarios para el GRÁFICO (Aquí estaba el error)

    const dailyMap: Record<string, any> = {}

    trainLogs.forEach((log: any) => {

      // Si el log es muy corto pero el usuario lo cargó, lo incluimos igual

      if (log.duracion_min < minEntrenamiento) return

      

      if (!dailyMap[log.fecha]) dailyMap[log.fecha] = { total_ua: 0, total_rpe: 0, count: 0 }

      dailyMap[log.fecha].total_ua += Number(log.carga_ua) || 0

      dailyMap[log.fecha].total_rpe += Number(log.rpe) || 0

      dailyMap[log.fecha].count += 1

    })



    const daily = Object.keys(dailyMap).sort().map(fecha => {

      const d = dailyMap[fecha]

      const avg_rpe = d.total_rpe / d.count

      const ce = ceByDate[fecha] || 0

      

      return {

        fecha,

        label: fecha,

        avg_ua: Math.round(d.total_ua / d.count),

        avg_rpe: Math.round(avg_rpe * 10) / 10,

        // FIX FINAL UCE: Si hay CE, calculamos; si no, UA.

        avg_uce: ce > 0 ? Math.round(ce * (avg_rpe / 5)) : Math.round(d.total_ua / d.count),

        n: d.count

      }

    })



    return NextResponse.json({ daily, players, qualifyingCount: players.length })

  } catch (err) {

    console.error(err)

    return NextResponse.json({ error: String(err) }, { status: 500 })

  }

}
