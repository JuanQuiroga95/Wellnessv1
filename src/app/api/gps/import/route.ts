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
// ORDER MATTERS: More specific patterns MUST come before generic ones.
// e.g. 'hsr (m/min)' before 'm/min', 'dist sprint/min' before 'dist/min'
const METRIC_COL_MAP: Array<[string, string]> = [
  // ── 0. METRICAS DERIVADAS (más específicas — deben ir PRIMERO) ──────────
  // Estas contienen substrings como "m/min", "/min" que colisionarían con
  // las genéricas si se evaluaran después.
  ['hsr (m/min)', 'hsr_per_min'], ['hsr per min', 'hsr_per_min'],
  ['hsr/min', 'hsr_per_min'], ['hsr m/min', 'hsr_per_min'],
  ['dist sprint/min', 'sprint_dist_per_min'], ['sprint dist per minute', 'sprint_dist_per_min'],
  ['sprint/min', 'sprint_dist_per_min'], ['sprint m/min', 'sprint_dist_per_min'],
  ['acc int/min', 'acc_int_per_min'],
  ['acc/min (n/min)', 'acc_per_min'], ['acc/min(n/min)', 'acc_per_min'],
  ['acc/min', 'acc_per_min'], ['aceleraciones/min', 'acc_per_min'], ['accel/min', 'acc_per_min'],
  ['dec/min (n/min)', 'dec_per_min'], ['dec/min(n/min)', 'dec_per_min'],
  ['dec/min', 'dec_per_min'], ['desaceleraciones/min', 'dec_per_min'], ['decel/min', 'dec_per_min'],
  ['max acc', 'max_acc'], ['maxima aceleracion', 'max_acc'],
  ['max dec', 'max_dec'], ['maxima desaceleracion', 'max_dec'],

  // ── 1. METROS POR MINUTO (dist_per_min) ─────────────────────────────────
  ['meterage per minute','dist_per_min'],['meterage per min','dist_per_min'],
  ['distance per minute','dist_per_min'],['dist per min','dist_per_min'],['dist/min','dist_per_min'],
  ['metros por minuto','dist_per_min'],['metres par minute','dist_per_min'],
  ['m/min','dist_per_min'], // Ubico/Wimu — ahora seguro porque hsr/sprint ya se matchearon

  // ── 2. HIGH SPEED RUNNING ───────────────────────────────────────────────
  ['high speed running','dist_hir'],['high speed dist','dist_hir'],['high speed distance','dist_hir'],
  ['high speed','dist_hir'],['hsr','dist_hir'],['high intensity running','dist_hir'],
  ['alta intensidad','dist_hir'],['course haute intensite','dist_hir'],['haute intensite','dist_hir'],

  // ── 3. VELOCIDAD BANDAS ─────────────────────────────────────────────────
  ['vel b4 tot dist','dist_v4'],['vel b4 tot','dist_v4'],['vel b4','dist_v4'],
  ['velocity band 4','dist_v4'],['v4 dist','dist_v4'],['banda 4','dist_v4'],
  ['15-20','dist_v4'],['15 20','dist_v4'],
  ['vel b6 tot dist','dist_v5'],['vel b6 tot','dist_v5'],['vel b6','dist_v5'],
  ['vel b5 tot dist','dist_v5'],['vel b5 tot','dist_v5'],['vel b5','dist_v5'],
  ['velocity band 6','dist_v5'],['velocity band 5','dist_v5'],
  ['v6 dist','dist_v5'],['v5 dist','dist_v5'],

  // ── 4. SPRINTS ──────────────────────────────────────────────────────────
  ['sprint distance','dist_v5'],['sprint dist','dist_v5'],['distancia sprint','dist_v5'],
  ['banda 6','dist_v5'],['banda 5','dist_v5'],['>20','dist_v5'],['> 20','dist_v5'], // Ubico
  ['number of sprints','n_sprints'],['number sprints','n_sprints'],['num sprints','n_sprints'],
  ['numero sprints','n_sprints'],['numero de sprints','n_sprints'],['sprints','n_sprints'],
  ['numero sprint','n_sprints'],['número sprint','n_sprints'],['numero de sprint','n_sprints'],

  // ── 5. DISTANCIA TOTAL ──────────────────────────────────────────────────
  ['total distance','dist_total'],['total dist','dist_total'],['tot dist','dist_total'],
  ['distancia total','dist_total'],['distance totale','dist_total'],['dist totale','dist_total'],
  ['tot dist m','dist_total'],['total distance m','dist_total'],['total dist m','dist_total'],
  ['distancia total m','dist_total'],

  // ── 6. ACEL / DECEL ─────────────────────────────────────────────────────
  ['acc b2-3 tot effs','acc2'],['acc b2-3 tot','acc2'],['acc b2-3','acc2'],
  ['accelerations b2 3','acc2'],['accelerations b2','acc2'],['aceleraciones b2','acc2'],
  ['acc b2','acc2'],['acc2 eff','acc2'],['acc 2','acc2'],['accel b2','acc2'],['acc 80 2','acc2'],
  ['aceleraciones','acc2'],['accelerations','acc2'], // Ubico
  ['decel b2-3 tot effs','dec2'],['decel b2-3 tot','dec2'],['decel b2-3','dec2'],
  ['decelerations b2 3','dec2'],['decelerations b2','dec2'],['desaceleraciones b2','dec2'],
  ['dec b2','dec2'],['dec2 eff','dec2'],['dec 2','dec2'],['decel b2','dec2'],['dec 80 2','dec2'],
  ['desaceleraciones','dec2'],['decelerations','dec2'], // Ubico

  ['accel b1','acc1'],['decel b1','dec1'],
  ['accel b4','acc4'],['decel b4','dec4'],

  // ── 7. PLAYER LOAD & OTRAS ─────────────────────────────────────────────
  ['player load','player_load'],['load','player_load'],['charge','player_load'],
  ['velocidad maxima','max_velocity'],['max velocity','max_velocity'],['vitesse max','max_velocity'],
  ['max speed','max_velocity'],['peak velocity','max_velocity'],['peak speed','max_velocity'],
  ['top speed','max_velocity'],['vmax','max_velocity'],
  ['maximum velocity','max_velocity'],['maximum speed','max_velocity'],
  ['velocity max','max_velocity'],['speed max','max_velocity'],
  ['max vel','max_velocity'],['vel max','max_velocity'],
  ['velocidad max','max_velocity'],['vel maxima','max_velocity'],['vel. max','max_velocity'],
  ['duracion','duracion_min'],['duration','duracion_min'],['time','duracion_min'],['tiempo','duracion_min'],
]

// Finds the best metric key for a given column header.
// Two-pass: exact match first, then substring match with safeguards for short patterns.
function mapHeaderToMetric(header: string): string | null {
  const h = (header || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim()
  if (!h) return null

  // Pass 1: exact match (highest priority)
  for (const [pattern, key] of METRIC_COL_MAP) {
    if (h === pattern) return key
  }

  // Pass 2: substring match — but for short patterns (≤4 chars like "hsr", "load")
  // require the pattern to appear as a whole word, not as a substring of a larger word.
  for (const [pattern, key] of METRIC_COL_MAP) {
    if (h.includes(pattern)) {
      if (pattern.length <= 4) {
        // Check word boundary: pattern must not be part of a larger word
        const re = new RegExp(`(?:^|[^a-z])${pattern.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')}(?:$|[^a-z])`)
        if (re.test(h)) return key
      } else {
        return key
      }
    }
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
  const usedIds = new Set<number>()  // Track already-matched DB player IDs to avoid duplicates

  for (const row of rows) {
    const rawName = row.name
    if (!rawName) continue
    
    const nRaw = normalizeName(rawName)
    const nRawParts = nRaw.split(' ')
    
    // 1. Exact match (normalize both)
    let p = dbPlayers.find(dp => !usedIds.has(dp.id) && normalizeName(dp.nombre) === nRaw)
    let method = 'nombre'

    // 2. Fallback: match by last word (last name) and first initial
    if (!p && nRawParts.length >= 1) {
      const rawLastName = nRawParts[nRawParts.length - 1]
      // Find players whose last name matches the raw last name
      const candidates = dbPlayers.filter(dp => {
        if (usedIds.has(dp.id)) return false
        const nDbParts = normalizeName(dp.nombre).split(' ')
        // Check if the last word of DB name matches the raw last name (must be >= 3 chars to be safe)
        return rawLastName.length >= 3 && nDbParts[nDbParts.length - 1] === rawLastName
      })

      if (candidates.length === 1) {
        // If exactly one match, we found it!
        p = candidates[0]
        method = 'apellido_unico'
      } else if (candidates.length > 1 && nRawParts.length >= 2) {
        // If multiple matches, disambiguate using first initial
        const rawFirstInitial = nRawParts[0][0]
        const best = candidates.find(dp => {
          const nDbParts = normalizeName(dp.nombre).split(' ')
          return nDbParts[0].startsWith(rawFirstInitial)
        })
        if (best) {
          p = best
          method = 'apellido_inicial'
        }
      }
    }

    // 3. Partial match (one includes the other) — skip very short names to avoid false matches
    if (!p) {
      p = dbPlayers.find(dp => {
        if (usedIds.has(dp.id)) return false
        const nDb = normalizeName(dp.nombre)
        // Require at least 4 chars on BOTH sides to avoid matching 'al' inside 'alberto'
        if (nDb.length < 4 || nRaw.length < 4) return false
        return nDb.includes(nRaw) || nRaw.includes(nDb)
      })
      method = 'parcial'
    }

    if (p) {
      usedIds.add(p.id)  // Mark this DB player as used
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
          if (mKey === 'duracion_min' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(val.trim())) {
            const parts = val.trim().split(':')
            val = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
            if (parts[2]) val += parseInt(parts[2], 10) / 60
          } else {
            val = val.replace(/[^\d.,-]/g, '').replace(',', '.')
            val = parseFloat(val)
          }
        }
        if (typeof val === 'number' && !isNaN(val)) {
          if (mKey === 'duracion_min' && val > 0 && val < 1) {
            val = Math.round(val * 1440)
          }
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
          let val: number
          if (cm.metric === 'duracion_min' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(rawVal.trim())) {
            const parts = rawVal.trim().split(':')
            val = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
            if (parts[2]) val += parseInt(parts[2], 10) / 60
          } else {
            val = parseFloat(rawVal.replace(/[^\d.,-]/g, '').replace(',', '.'))
          }
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
      console.log('[GPS import] confirm: clubId=', clubId, 'fecha=', fecha, 'tipo=', tipo_sesion, 'sid=', sid, 'matched=', matched.length)

      if (sid) {
        await sql`DELETE FROM gps_logs WHERE fecha = ${fecha}::date AND sesion_id = ${sid} AND club_id = ${clubId}`
      } else {
        await sql`DELETE FROM gps_logs WHERE fecha = ${fecha}::date AND (sesion_id IS NULL OR sesion_id = 0) AND tipo_sesion = ${tipo_sesion} AND club_id = ${clubId}`
      }

      let insertErrors: string[] = []
      for (const m of matched) {
        const met = m.metricas || {}
        try {
          await sql`INSERT INTO gps_logs (jugador_id, club_id, fecha, sesion_id, tipo_sesion, dist_total, dist_hir, dist_v4, dist_v5, player_load, max_velocity, acc2, dec2, acc3, dec3, dist_per_min, n_sprints, duracion_min, metricas, fuente)
                    VALUES (${m.jugador_id}, ${clubId}, ${fecha}, ${sid}, ${tipo_sesion}, ${met.dist_total||0}, ${met.dist_hir||0}, ${met.dist_v4||0}, ${met.dist_v5||0}, ${met.player_load||0}, ${met.max_velocity||0}, ${met.acc2||0}, ${met.dec2||0}, ${met.acc3||0}, ${met.dec3||0}, ${met.dist_per_min||0}, ${met.n_sprints||0}, ${met.duracion_min||null}, ${JSON.stringify(met)}, ${pdfText?'pdf':'excel'})`
        } catch (insertErr: any) {
          insertErrors.push(`${m.jugador_nombre || m.jugador_id}: ${insertErr.message || insertErr}`)
          console.error('[GPS INSERT error]', m.jugador_nombre, insertErr)
        }
      }

      // Verify what's actually in the DB after insert
      const verify = sid
        ? await sql`SELECT COUNT(*)::int as n FROM gps_logs WHERE club_id = ${clubId} AND fecha = ${fecha}::date AND sesion_id = ${sid}`
        : await sql`SELECT COUNT(*)::int as n FROM gps_logs WHERE club_id = ${clubId} AND fecha = ${fecha}::date AND (sesion_id IS NULL OR sesion_id = 0) AND tipo_sesion = ${tipo_sesion}`
      const actualSaved = (verify[0] as any)?.n ?? 0

      console.log('[GPS import] attempted=', matched.length, 'actualSaved=', actualSaved, 'errors=', insertErrors.length)

      return NextResponse.json({ ok: true, saved: actualSaved, attempted: matched.length, unmatched, insertErrors })
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

    // Explicit ::int casts force the Neon HTTP driver param to be compared as integer
    let deleted: any[]
    if (sid) {
      deleted = await sql`
        DELETE FROM gps_logs
        WHERE fecha::date = ${fecha}::date
          AND sesion_id = ${sid}
          AND club_id = ${clubId}::int
        RETURNING id
      `
    } else {
      deleted = await sql`
        DELETE FROM gps_logs
        WHERE fecha::date = ${fecha}::date
          AND tipo_sesion = ${tipo_sesion}
          AND (sesion_id IS NULL OR sesion_id = 0)
          AND club_id = ${clubId}::int
        RETURNING id
      `
    }

    return NextResponse.json({ ok: true, count: deleted.length })
  } catch (err: any) {
    console.error('[GPS DELETE error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
