
// tz-safe date helpers
function localToday(): string { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
function localDaysAgo(n: number): string { const d=new Date(); d.setDate(d.getDate()-n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function calcGps(largo: number, ancho: number, jug: number, series: number, minutos: number, overrides: any = {}) {
  if (!largo || !ancho || !jug || !series || !minutos) return {}
  const densidad = (largo * ancho) / jug
  const t = series * minutos
  const v = (key: string, formula: () => number) =>
    overrides[key] !== undefined ? Number(overrides[key]) : Math.max(0, Math.round(formula()))
  return {
    distTotal:  v('distTotal',  () => (19.243 * Math.log(densidad) - 5.029)  * t),
    distSprint: v('distSprint', () => (0.018 * densidad - 0.844)             * t),
    distMP:     v('distMP',     () => (7.0421 * Math.log(densidad) - 15.255) * t),
    distAcel:   v('distAcel',   () => (1.321  * Math.log(densidad) - 0.629)  * t),
    distDecel:  v('distDecel',  () => (1.157  * Math.log(densidad) - 0.418)  * t),
    nSprints:   v('nSprints',   () => (0.001  * densidad - 0.046)            * t),
    nAcel:      v('nAcel',      () => (0.212  * Math.log(densidad) - 0.23)   * t),
    nDecel:     v('nDecel',     () => (0.1041 * Math.log(densidad) - 0.096)  * t),
  }
}

// 7 days of realistic training sessions
const SESIONES_DEMO = [
  {
    offset: -6, titulo: 'MD-6', tipo: 'entrenamiento', objetivo: 'Resistencia', rpe_objetivo: 6,
    tareas: [
      { ventana: 'Activación en campo', subtarea: 'Movilidad', series: 2, minutos: 8, pausa: 2, jugadores: 15, largo: 0, ancho: 0 },
      { ventana: 'Juego de posesión', series: 4, minutos: 5, pausa: 2, jugadores: 10, largo: 30, ancho: 20 },
      { ventana: 'Partido de entrenamiento', series: 2, minutos: 15, pausa: 3, jugadores: 14, largo: 60, ancho: 40 },
    ]
  },
  {
    offset: -5, titulo: 'MD-5', tipo: 'entrenamiento', objetivo: 'Fuerza', rpe_objetivo: 7,
    tareas: [
      { ventana: 'Activación en gimnasio', subtarea: 'Isométricos', series: 3, minutos: 6, pausa: 2, jugadores: 15, largo: 0, ancho: 0 },
      { ventana: 'Trabajo analítico', series: 3, minutos: 10, pausa: 3, jugadores: 12, largo: 0, ancho: 0 },
      { ventana: 'Juego de posición', series: 3, minutos: 8, pausa: 2, jugadores: 8, largo: 40, ancho: 25 },
    ]
  },
  {
    offset: -4, titulo: 'MD-4', tipo: 'entrenamiento', objetivo: 'Velocidad', rpe_objetivo: 8,
    tareas: [
      { ventana: 'Activación en campo', subtarea: 'Circuito neuromuscular', series: 2, minutos: 7, pausa: 2, jugadores: 15, largo: 0, ancho: 0 },
      { ventana: 'Partido reducido', series: 5, minutos: 4, pausa: 2, jugadores: 6, largo: 20, ancho: 15 },
      { ventana: 'Partido modificado', series: 2, minutos: 12, pausa: 3, jugadores: 12, largo: 50, ancho: 35 },
    ]
  },
  {
    offset: -3, titulo: 'MD-3', tipo: 'recuperacion', objetivo: 'Recuperación', rpe_objetivo: 4,
    tareas: [
      { ventana: 'Activación en gimnasio', subtarea: 'Movilidad', series: 2, minutos: 10, pausa: 2, jugadores: 15, largo: 0, ancho: 0 },
      { ventana: 'Juego de posesión', series: 3, minutos: 6, pausa: 3, jugadores: 10, largo: 35, ancho: 25 },
    ]
  },
  {
    offset: -2, titulo: 'MD-2', tipo: 'entrenamiento', objetivo: 'Velocidad', rpe_objetivo: 8,
    tareas: [
      { ventana: 'Activación en campo', subtarea: 'Pliometría', series: 3, minutos: 6, pausa: 2, jugadores: 14, largo: 0, ancho: 0 },
      { ventana: 'Partido reducido', series: 6, minutos: 3, pausa: 2, jugadores: 4, largo: 15, ancho: 12 },
      { ventana: 'Partido de entrenamiento', series: 1, minutos: 20, pausa: 5, jugadores: 14, largo: 65, ancho: 45 },
    ]
  },
  {
    offset: -1, titulo: 'MD-1', tipo: 'entrenamiento', objetivo: 'Activación', rpe_objetivo: 5,
    tareas: [
      { ventana: 'Activación en campo', subtarea: 'Movilidad', series: 2, minutos: 8, pausa: 2, jugadores: 14, largo: 0, ancho: 0 },
      { ventana: 'Juego de posición', series: 2, minutos: 8, pausa: 3, jugadores: 8, largo: 45, ancho: 30 },
    ]
  },
  {
    offset: 0, titulo: 'MD', tipo: 'partido', objetivo: 'Competición', rpe_objetivo: 9,
    tareas: [
      { ventana: 'Activación en campo', subtarea: 'Circuito técnico', series: 1, minutos: 15, pausa: 3, jugadores: 14, largo: 0, ancho: 0 },
      { ventana: 'Partido oficial', series: 2, minutos: 45, pausa: 15, jugadores: 14, largo: 100, ancho: 65 },
    ]
  },
]

const RPE_POR_TITULO: Record<string, number[]> = {
  'MD-6': [5,6,6,7,5,6],
  'MD-5': [6,7,7,8,6,7],
  'MD-4': [7,8,8,9,7,8],
  'MD-3': [4,4,5,4,3,4],
  'MD-2': [7,8,8,9,8,7],
  'MD-1': [4,5,5,4,5,4],
  'MD':   [8,9,9,10,8,9],
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const sql = getDb()

    // Get all players from this club
    const jugadores = s.clubId ? await sql`
      SELECT j.id AS jugador_id
      FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id = ${s.clubId} AND u.activo = true` : []

    let sesionesCreadas = 0
    let logsCreados = 0

    for (const demo of SESIONES_DEMO) {
      const d = new Date()
      d.setDate(d.getDate() + demo.offset)
      const fecha = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

      // Build ejercicios array with GPS data
      const ejercicios = demo.tareas.map(t => {
        const gps = calcGps(t.largo, t.ancho, t.jugadores, t.series, t.minutos)
        return {
          ventana: t.ventana,
          subtarea: (t as any).subtarea || '',
          jugadores: String(t.jugadores),
          series: String(t.series),
          minutos: String(t.minutos),
          pausa: String(t.pausa),
          largo: String(t.largo),
          ancho: String(t.ancho),
          descripcion: '',
          imagen: '',
          overrides: Object.keys(gps).length ? gps : {},
        }
      })

      // Insert session
      try {
        await sql`
          INSERT INTO sesiones_plan(admin_id, club_id, fecha, tipo, titulo, objetivo, rpe_objetivo, ejercicios)
          VALUES(${s.userId}, ${s.clubId ? Number(s.clubId) : null}, ${fecha}, ${demo.tipo}, ${demo.titulo},
                 ${demo.objetivo}, ${demo.rpe_objetivo}, ${JSON.stringify(ejercicios)}::jsonb)
          ON CONFLICT DO NOTHING`
        sesionesCreadas++
      } catch(e) { console.error('sesion insert error', e) }

      // Insert RPE logs for each player (simulate they all trained)
      const rpeList = RPE_POR_TITULO[demo.titulo] || [6,7,7,6]
      for (let i = 0; i < (jugadores as any[]).length; i++) {
        const p = (jugadores as any[])[i]
        const rpe = rpeList[i % rpeList.length]
        const duracion = demo.tareas.reduce((acc, t) => acc + t.series * t.minutos, 0)
        try {
          await sql`
            INSERT INTO entrenamiento_logs(jugador_id, fecha, rpe, duracion_min, tipo_sesion, club_id)
            VALUES(${p.jugador_id}, ${fecha}, ${rpe}, ${duracion}, 'EQUIPO', ${s.clubId ? Number(s.clubId) : null})
            ON CONFLICT DO NOTHING`
          logsCreados++
        } catch(e) { /* ignore conflict */ }
      }
    }

    return NextResponse.json({ ok: true, sesionesCreadas, logsCreados, jugadores: (jugadores as any[]).length })
  } catch (err) {
    console.error('[seed/calendario error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const sql = getDb()
    const d7ago = localDaysAgo(7)
    const d7ade = localDaysAgo(-7)
    await sql`DELETE FROM sesiones_plan WHERE admin_id = ${s.userId} AND fecha BETWEEN ${d7ago} AND ${d7ade}`
    if (s.clubId) {
      await sql`DELETE FROM entrenamiento_logs WHERE club_id = ${s.clubId} AND fecha BETWEEN ${d7ago} AND ${d7ade}`
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
