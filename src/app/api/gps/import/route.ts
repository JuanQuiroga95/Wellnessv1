export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import * as XLSX from 'xlsx'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function normStr(s: string): string {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ')
}
const normalizeName = normStr

// ─── UNIVERSAL METRIC MAP (Catapult + UBICO + Wimu + Oliver) ───────────────
const METRIC_COL_MAP: Array<[string, string]> = [
  // 1. METRICAS ESPECIFICAS (Mecanismos de prioridad para evitar sobreescrituras)
  // METROS POR MINUTO
  ['meterage per minute','dist_per_min'],['meterage per min','dist_per_min'],
  ['distance per minute','dist_per_min'],['dist per min','dist_per_min'],['dist/min','dist_per_min'],
  ['metros por minuto','dist_per_min'],['metres par minute','dist_per_min'],
  ['m/min','dist_per_min'], // Ubico/Wimu
  
  // HIGH SPEED RUNNING
  ['high speed running','dist_hir'],['high speed dist','dist_hir'],['high speed distance','dist_hir'],
  ['high speed','dist_hir'],['hsr','dist_hir'],['high intensity running','dist_hir'],
  ['alta intensidad','dist_hir'],['course haute intensite','dist_hir'],['haute intensite','dist_hir'],
  
  // VELOCIDAD BANDAS
  ['vel b4 tot dist','dist_v4'],['vel b4 tot','dist_v4'],['vel b4','dist_v4'],
  ['velocity band 4','dist_v4'],['v4 dist','dist_v4'],['banda 4','dist_v4'],
  ['15-20','dist_v4'],['15 20','dist_v4'],
  ['vel b6 tot dist','dist_v5'],['vel b6 tot','dist_v5'],['vel b6','dist_v5'],
  ['vel b5 tot dist','dist_v5'],['vel b5 tot','dist_v5'],['vel b5','dist_v5'],
  ['velocity band 6','dist_v5'],['velocity band 5','dist_v5'],
  ['v6 dist','dist_v5'],['v5 dist','dist_v5'],
  
  // SPRINTS
  ['sprint distance','dist_v5'],['sprint dist','dist_v5'],['distancia sprint','dist_v5'],
  ['banda 6','dist_v5'],['banda 5','dist_v5'],['>20','dist_v5'],['> 20','dist_v5'], // Ubico
  ['number of sprints','n_sprints'],['number sprints','n_sprints'],['num sprints','n_sprints'],
  ['numero sprints','n_sprints'],['numero de sprints','n_sprints'],['sprints','n_sprints'],
  ['numero sprint','n_sprints'],['número sprint','n_sprints'],['numero de sprint','n_sprints'],

  // 2. DISTANCIA TOTAL (Variantes específicas primero)
  ['total distance','dist_total'],['total dist','dist_total'],['tot dist','dist_total'],
  ['distancia total','dist_total'],['distance totale','dist_total'],['dist totale','dist_total'],
  ['tot dist m','dist_total'],['total distance m','dist_total'],['total dist m','dist_total'],
  ['distancia total m','dist_total'],

  // 3. ACEL / DECEL
  ['acc b2-3 tot effs','acc3'],['acc b2-3 tot','acc3'],['acc b2-3','acc3'],
  ['accelerations b2 3','acc3'],['accelerations b2','acc3'],['aceleraciones b2','acc3'],
  ['acc b2','acc3'],['acc2 eff','acc3'],['acc 2','acc3'],['accel b2','acc3'],['acc 80 2','acc3'],
  ['aceleraciones','acc3'],['accelerations','acc3'], // Ubico
  ['decel b2-3 tot effs','dec3'],['decel b2-3 tot','dec3'],['decel b2-3','dec3'],
  ['decelerations b2 3','dec3'],['decelerations b2','dec3'],['desaceleraciones b2','dec3'],
  ['dec b2','dec3'],['dec2 eff','dec3'],['dec 2','dec3'],['decel b2','dec3'],['dec 80 2','dec3'],
  ['desaceleraciones','dec3'],['decelerations','dec3'], // Ubico
  
  ['accel b1','acc1'],['decel b1','dec1'],
  ['accel b4','acc4'],['decel b4','dec4'],

  // 4. PLAYER LOAD & OTRAS
  ['player load','player_load'],['load','player_load'],['charge','player_load'],
  ['velocidad maxima','max_velocity'],['max velocity','max_velocity'],['vitesse max','max_velocity'],
  ['max speed','max_velocity'],['peak velocity','max_velocity'],['peak speed','max_velocity'],
  ['top speed','max_velocity'],['vmax','max_velocity'],
  ['duracion','duracion_min'],['duration','duracion_min'],['time','duracion_min'],['tiempo','duracion_min'],
]

// Finds the best metric key for a given column header
function mapHeaderToMetric(header: string): string | null {
  const h = header.toLowerCase().trim()
  for (const [pattern, key] of METRIC_COL_MAP) {
    if (h === pattern || h.includes(pattern)) return key
  }
  return null
}

async function matchPlayers(rows: any[], clubId: number | null) {
  const sql = getDb()
  const dbPlayers = clubId 
    ? await sql`SELECT j.id, u.nombre FROM jugadores j JOIN usuarios u ON j.usuario_id = u.id WHERE j.club_id = ${clubId}`
    : await sql`SELECT j.id, u.nombre FROM jugadores j JOIN usuarios u ON j.usuario_id = u.id`
  
  const matched: any[] = []
  const unmatched: string[] = []

  for (const row of rows) {
    const rawName = row.name
    if (!rawName) continue
    
    const nRaw = normalizeName(rawName)
    
    // 1. Exact match (normalize both)
    let p = dbPlayers.find(dp => normalizeName(dp.nombre) === nRaw)
    let method = 'nombre'

    // 2. Partial match (starts with or ends with)
    if (!p) {
      p = dbPlayers.find(dp => {
        const nDb = normalizeName(dp.nombre)
        return nDb.includes(nRaw) || nRaw.includes(nDb)
      })
      method = 'parcial'
    }

    if (p) {
      matched.push({
        jugador_id: p.id,
        jugador_nombre: p.nombre,
        nombre_catapult: rawName,
        match_method: method,
        metricas: row.metricas,
        sin_datos: row.sin_datos
      })
    } else {
      unmatched.push(rawName)
    }
  }

  return { matched, unmatched }
}

function parseRawRows(rows: any[][]): any[] {
  if (rows.length < 2) return []
  
  // Find the header row (the one that has "Distance" or "Name")
  let headerIdx = -1
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i]
    if (row.some(c => {
      const s = String(c).toLowerCase()
      return s.includes('dist') || s.includes('nombre') || s.includes('name') || s.includes('player') || s.includes('meterage')
    })) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return []

  const headers = rows[headerIdx].map(h => String(h || ''))
  const dataRows = rows.slice(headerIdx + 1)
  const results: any[] = []

  // Column indexes for Player Name (can be multiple columns in different formats)
  const nameCols = headers.reduce((acc, h, i) => {
    const hl = h.toLowerCase()
    if (hl.includes('nombre') || hl.includes('name') || hl.includes('player') || hl.includes('athlete')) acc.push(i)
    return acc
  }, [] as number[])

  for (const row of dataRows) {
    // Extract name
    let name = ''
    for (const idx of nameCols) {
      const val = String(row[idx] || '').trim()
      if (val && !val.toLowerCase().includes('total') && !val.toLowerCase().includes('average')) {
        name = val; break
      }
    }
    if (!name) continue
    
    // Ignore aggregate rows
    const nl = name.toLowerCase()
    const isAggregate = ['team', 'average', 'promedio', 'total', 'equipo', 'media',
      'squad', 'mean', 'promedio equipo', 'team average', 'max', 'maximo', 'máximo'].some(k => nl === k || nl.startsWith(k + ' ') || nl.endsWith(' ' + k))
    if (isAggregate) continue

    const metricas: any = {}
    let hasAnyData = false
    headers.forEach((h, i) => {
      const mKey = mapHeaderToMetric(h)
      if (mKey) {
        let val = row[i]
        if (typeof val === 'string') {
          val = val.replace(/[^\d.,-]/g, '').replace(',', '.')
          val = parseFloat(val)
        }
        if (typeof val === 'number' && !isNaN(val)) {
          metricas[mKey] = val
          if (val > 0) hasAnyData = true
        }
      }
    })

    if (Object.keys(metricas).length > 0) {
      results.push({ name, metricas, sin_datos: !hasAnyData })
    }
  }
  return results
}

// PDF Parser for Session Summary (OpenField)
function parsePdfAllMethods(text: string): any[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const results: any[] = []
  
  // 1. Find Header Line
  let headerIdx = -1
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const l = lines[i].toLowerCase()
    if ((l.includes('player') || l.includes('nombre')) && (l.includes('dist') || l.includes('meterage'))) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) return []

  const headerLine = lines[headerIdx]
  const headerParts = headerLine.split(/\s{2,}/).filter(Boolean)
  const colMap = headerParts.map(p => ({ label: p, metric: mapHeaderToMetric(p) }))
  
  // 2. Parse Data Rows
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.toLowerCase().includes('squad') || line.toLowerCase().includes('team') || line.toLowerCase().includes('promedio')) continue
    
    // Pattern: [Name...] [Number] [Number] ...
    // Names in Catapult PDFs usually don't have numbers
    const parts = line.split(/\s+/).filter(Boolean)
    if (parts.length < 3) continue
    
    // Find where name ends and numbers begin
    let firstNumIdx = -1
    for (let j = 0; j < parts.length; j++) {
      if (/^-?\d+([.,]\d+)?$/.test(parts[j].replace(/[^\d.,-]/g, ''))) {
        firstNumIdx = j; break
      }
    }
    if (firstNumIdx === -1 || firstNumIdx === 0) continue

    const name = parts.slice(0, firstNumIdx).join(' ')
    const numParts = parts.slice(firstNumIdx)
    
    const metricas: any = {}
    let hasAnyData = false
    // Map mapped metrics to their values
    let metricIdx = 0
    colMap.forEach(cm => {
      if (cm.metric) {
        const rawVal = numParts[metricIdx]
        if (rawVal) {
          const val = parseFloat(rawVal.replace(/[^\d.,-]/g, '').replace(',', '.'))
          if (!isNaN(val)) {
            metricas[cm.metric] = val
            if (val > 0) hasAnyData = true
          }
        }
        metricIdx++
      } else if (cm.label.toLowerCase() !== 'player' && cm.label.toLowerCase() !== 'nombre') {
        // Skip unmapped columns in the data parts too
        metricIdx++
      }
    })

    if (Object.keys(metricas).length > 0) {
      results.push({ name, metricas, sin_datos: !hasAnyData })
    }
  }
  return results
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req); 
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    
    const body = await req.json()
    const { fecha, tipo_sesion, sesion_id, confirm, pdfText, rows } = body
    if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 })
    
    let parsedRows = (rows && Array.isArray(rows)) ? parseRawRows(rows) : (pdfText ? parsePdfAllMethods(pdfText) : [])
    if (!parsedRows.length) return NextResponse.json({ error: 'No se encontraron datos.' }, { status: 400 })
    
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    const { matched, unmatched } = await matchPlayers(parsedRows, clubId)
    
    if (!confirm) {
      let alreadyExists = false
      if (clubId) {
        const check = sesion_id
          ? await sql`SELECT 1 FROM gps_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId}) AND fecha = ${fecha}::date AND sesion_id = ${sesion_id} LIMIT 1`
          : await sql`SELECT 1 FROM gps_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId}) AND fecha = ${fecha}::date AND sesion_id IS NULL AND tipo_sesion = ${tipo_sesion} LIMIT 1`
        alreadyExists = check.length > 0
      }
      return NextResponse.json({ 
        preview: true, fecha, tipo_sesion, sesion_id, 
        fuente: pdfText ? 'pdf' : 'excel', matched, unmatched, 
        total_filas: parsedRows.length, 
        columnas_detectadas: Object.keys(parsedRows[0]?.metricas||{}),
        alreadyExists
      })
    }
    
    if (confirm && clubId) {
      const sid = (sesion_id === 0 || sesion_id === '0') ? null : sesion_id
      
      if (sid) {
        await sql`DELETE FROM gps_logs WHERE fecha = ${fecha}::date AND sesion_id = ${sid} AND jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`
      } else {
        await sql`DELETE FROM gps_logs WHERE fecha = ${fecha}::date AND (sesion_id IS NULL OR sesion_id = 0) AND tipo_sesion = ${tipo_sesion} AND jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`
      }
      
      for (const m of matched) {
        const met = m.metricas || {}
        await sql`INSERT INTO gps_logs (jugador_id, club_id, fecha, sesion_id, tipo_sesion, dist_total, dist_hir, dist_v4, dist_v5, player_load, max_velocity, acc2, dec2, acc3, dec3, dist_per_min, n_sprints, metricas, fuente)
                  VALUES (${m.jugador_id}, ${clubId}, ${fecha}, ${sid}, ${tipo_sesion}, ${met.dist_total||0}, ${met.dist_hir||0}, ${met.dist_v4||0}, ${met.dist_v5||0}, ${met.player_load||0}, ${met.max_velocity||0}, ${met.acc2||0}, ${met.dec2||0}, ${met.acc3||0}, ${met.dec3||0}, ${met.dist_per_min||0}, ${met.n_sprints||0}, ${JSON.stringify(met)}, ${pdfText?'pdf':'excel'})`
      }
      
      return NextResponse.json({ ok: true, saved: matched.length, unmatched })
    }
    
    return NextResponse.json({ ok: true, saved: 0, error: 'No se pudo guardar: falta confirmación o clubId' })
  } catch (err) { 
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 }) 
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha')
    const tipo_sesion = searchParams.get('tipo_sesion')
    const sesion_id = searchParams.get('sesion_id')

    if (!fecha || !tipo_sesion) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    if (!clubId) return NextResponse.json({ error: 'No club' }, { status: 400 })

    const sid = (sesion_id === 'null' || sesion_id === 'undefined' || !sesion_id || sesion_id === '0') ? null : Number(sesion_id)

    // Use RETURNING id so deleted.length gives the actual count (Neon HTTP driver doesn't expose .count/.rowCount on plain DELETE)
    let deleted: any[]
    if (sid) {
      deleted = await sql`
        DELETE FROM gps_logs
        WHERE fecha::date = ${fecha}::date
          AND sesion_id = ${sid}
          AND jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})
        RETURNING id
      `
    } else {
      deleted = await sql`
        DELETE FROM gps_logs
        WHERE fecha::date = ${fecha}::date
          AND tipo_sesion = ${tipo_sesion}
          AND (sesion_id IS NULL OR sesion_id = 0)
          AND jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})
        RETURNING id
      `
    }

    return NextResponse.json({ ok: true, count: deleted.length })
  } catch (err: any) {
    console.error('[GPS DELETE error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
