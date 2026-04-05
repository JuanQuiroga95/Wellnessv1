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

// ─── EXCEL PARSER ─────────────────────────────────────────────────────────────
const EXCEL_COL_MAP: Array<[string, string]> = [
  ['total distance','dist_total'],['total dist','dist_total'],['tot dist','dist_total'],
  ['meterage per minute','dist_per_min'],['meterage per min','dist_per_min'],
  ['distance per minute','dist_per_min'],['dist per min','dist_per_min'],['dist/min','dist_per_min'],
  ['high speed dist','dist_hir'],['high intensity','dist_hir'],['hsr','dist_hir'],
  ['vel b4 tot dist','dist_v4'],['vel b4','dist_v4'],['v4 dist','dist_v4'],['velocity band 4','dist_v4'],
  ['vel b6 tot dist','dist_v5'],['vel b6','dist_v5'],['vel b5 tot dist','dist_v5'],['vel b5','dist_v5'],
  ['v5 dist','dist_v5'],['v6 dist','dist_v5'],['velocity band 5','dist_v5'],['sprint dist','dist_v5'],
  ['player load','player_load'],['playerload','player_load'],
  ['max velocity','max_velocity'],['max vel','max_velocity'],['top speed','max_velocity'],
  ['velocidad maxima','max_velocity'],
  ['acc b2-3 tot effs','acc2'],['acc b2-3','acc2'],['acc b2','acc2'],['acc2 eff','acc2'],['acc 2','acc2'],
  ['decel b2-3 tot effs','dec2'],['decel b2-3','dec2'],['dec b2','dec2'],['dec2 eff','dec2'],['dec 2','dec2'],
  ['acc b3','acc3'],['acc3 eff','acc3'],['acc 3','acc3'],
  ['dec b3','dec3'],['dec3 eff','dec3'],['dec 3','dec3'],
  ['numero sprints','n_sprints'],['número sprints','n_sprints'],['number sprints','n_sprints'],
  ['vel b1','dist_v1'],['velocity band 1','dist_v1'],
  ['vel b2','dist_v2'],['velocity band 2','dist_v2'],
  ['vel b3','dist_v3'],['velocity band 3','dist_v3'],
  ['metabolic power','metabolic_power'],['hr avg','hr_avg'],['hr max','hr_max'],
  ['duration','duracion_min'],['total time','duracion_min'],
]

function matchExcelCol(h: string): string | null {
  const hn = normStr(h)
  for (const [label, field] of EXCEL_COL_MAP)
    if (hn.includes(normStr(label))) return field
  return null
}

// Parse a 2D array of rows (pre-parsed by client or from XLSX)
function parseRawRows(raw: any[][]): Record<string, any>[] {
  if (raw.length < 2) return []
  const headers = (raw[0] as any[]).map(h => String(h ?? ''))
  const colMap: (string | null)[] = headers.map(h => {
    const ln = normStr(h)
    // Strict name detection — avoid false positives like 'Player Load'
    const isNameCol = ln === 'name' || ln === 'nombre' || ln === 'athlete' || ln === 'player' ||
      ln === 'jugador' || ln.includes('first name') || ln.includes('player name') || ln.includes('athlete name')
    if (isNameCol) return '__name__'
    // Ignore non-metric columns
    if (['interval','time','date','fecha','session','period','device','jersey','shirt','position','pos'].some(k => ln === k || ln.startsWith(k + ' '))) return null
    return matchExcelCol(h)
  })
  return (raw.slice(1) as any[][])
    .filter(row => row.some((c: any) => c !== null && c !== ''))
    .map(row => {
      let name: string | null = null
      const metricas: Record<string, number> = {}
      ;(row as any[]).forEach((cell: any, idx: number) => {
        const f = colMap[idx]
        if (!f || cell === null || cell === '') return
        if (f === '__name__') { name = String(cell).trim(); return }
        const n = parseFloat(String(cell).replace(',', '.'))
        if (!isNaN(n)) metricas[f] = n
      })
      if (!name) return null
      return { nombre_catapult: name, nombre_norm: normalizeName(name), metricas }
    }).filter(Boolean) as any[]
}

function parseExcel(bytes: Uint8Array): Record<string, any>[] {
  const wb = XLSX.read(bytes, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][]
  return parseRawRows(raw)
}

// ─── PDF PARSER — Catapult columnar format ────────────────────────────────────
// Catapult PDFs render columns as stacked blocks:
// [All player names] [Promedio] [Max+col0_values] [Col0_header+col1_values] ...
// So block[i].values = column[i] data.
// Column order is fixed in standard Catapult "Cuadro Resumen":
const CATAPULT_COL_ORDER = [
  'dist_total','dist_per_min','dist_v4','dist_hir','dist_v5',
  'n_sprints','acc2','dec2','max_velocity',
]

// Row-format column headers (Catapult "DATA BASE" / OpenField report style)
// Columns: Name, Position, TotDist, MeteragePerMin, 15-20km/h, 20/25km/h, SprintDist, NumSprints, HSR(>19.7), AccB2-3, DecelB2-3, TotPL, TotDur, MaxVel
const ROW_COL_ORDER = [
  null,          // Name (extracted separately)
  null,          // Position (skip)
  'dist_total',
  'dist_per_min',
  'dist_v4',     // 15-20 km/h
  'dist_hir',    // 20/25 km/h  
  'dist_v5',     // Sprint distance
  'n_sprints',
  null,          // HSR (>19.7) — same as dist_hir, skip to avoid overwrite
  'acc2',
  'dec2',
  'player_load',
  null,          // Duration (HH:MM:SS, skip)
  'max_velocity',
]

function cleanCatapultName(raw: string): string {
  // "ALBERTO RUBIO ALBERTO R." → "ALBERTO RUBIO"
  // "KIKO KIKO" → "KIKO"
  const parts = raw.trim().split(/\s+/)
  const n = parts.length
  if (n < 2) return raw.trim()
  // If last word is repeated first word, remove it
  if (normStr(parts[n-1]) === normStr(parts[0])) return parts.slice(0, n-1).join(' ')
  // If second half is an abbreviation of first half
  for (let split = 1; split < n; split++) {
    const first = parts.slice(0, split).join(' ')
    const rest  = parts.slice(split).join(' ')
    if (normStr(first).startsWith(normStr(rest)) || normStr(rest).startsWith(normStr(first).split(' ')[0]))
      return first
  }
  return raw.trim()
}

// ── Row-based parser: handles Catapult "DATA BASE RAPPORT OPENFIELD" format ──
// This format has one row per player: Name Pos TotDist MeterPerMin 15-20 20-25 SprintDist NumSprints HSR Acc Dec PL Duration MaxVel
// pdf-parse may or may not preserve spaces between fields.
function parsePdfRowFormat(lines: string[]): Record<string, any>[] | null {
  const POS_CODES = ['CAM','CDM','LB','RB','LW','RW','WB','CB','CM','ST','FB','GK','CF','AM','DM','LM','RM','W']
  const posPattern = new RegExp(`(?:^|\\s)(${POS_CODES.join('|')})(?=\\d|\\s)`)
  const posDetect  = new RegExp(POS_CODES.join('|'))

  // Space-separated fields after position code:
  // [0] TotDist  [1] MeterPerMin  [2] 15-20km/h  [3] 20/25km/h
  // [4] SprintDist  [5] NumSprints  [6] HSR(>19.7)
  // [7] AccB2-3  [8] DecelB2-3  [9] TotPL  [10] Duration(HH:MM:SS)  [11] MaxVel
  const FIELD_MAP = [
    'dist_total', 'dist_per_min', 'dist_v4', 'dist_hir',
    'dist_v5', 'n_sprints', null,
    'acc2', 'dec2', 'player_load', null, 'max_velocity'
  ]

  const results: Record<string, any>[] = []

  for (const line of lines) {
    if (!line.trim() || !posDetect.test(line)) continue

    // ── Strategy 1: space-separated (ideal pdf-parse output) ──
    const parts = line.trim().split(/\s+/)
    let posIdx = parts.findIndex(p => POS_CODES.includes(p))

    // ── Strategy 2: position code is glued to name (e.g. "R SilvaCB5563...") ──
    let name = ''
    let rest = ''
    if (posIdx >= 0) {
      name = parts.slice(0, posIdx).join(' ')
      rest = parts.slice(posIdx + 1).join(' ')
    } else {
      // Find position code embedded in a token
      const m = line.match(new RegExp(`^(.+?)(${POS_CODES.join('|')})(.+)$`))
      if (!m) continue
      name = m[1].trim()
      rest = m[3].trim()
    }

    if (!name || !rest) continue

    // Skip summary rows (Total, Moyenne, etc.)
    const nameNorm = name.toLowerCase().replace(/[^a-z]/g, '')
    if (['total','moyenne','average','promedio'].includes(nameNorm)) continue

    // ── Parse values from rest ──
    // rest may be space-separated or fully merged
    const spaceParts = rest.trim().split(/\s+/)
    // A valid row has at least 10+ numeric-ish tokens
    const metricas: Record<string, number> = {}

    if (spaceParts.length >= 10) {
      // Space-separated: straightforward mapping
      for (let i = 0; i < spaceParts.length && i < FIELD_MAP.length; i++) {
        const field = FIELD_MAP[i]
        if (!field) continue
        // Skip duration field (HH:MM:SS)
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(spaceParts[i])) continue
        const val = parseFloat(spaceParts[i].replace(',', '.'))
        if (!isNaN(val)) metricas[field] = val
      }
    } else {
      // Merged: use structural parsing
      // Remove spaces and parse by known structure from both ends
      const merged = rest.replace(/\s/g, '')
      // TotDist is 4 digits, MeterPerMin is XX.XX
      const structM = merged.match(/^(\d{4})(\d{2}\.\d{2})(.+?)(\d{2}:\d{2}:\d{2}|\d{2}:\d{2})(\d{2})$/)
      if (!structM) continue

      metricas['dist_total']   = parseInt(structM[1], 10)
      metricas['dist_per_min'] = parseFloat(structM[2])
      metricas['max_velocity'] = parseInt(structM[5], 10)

      const mid = structM[3]
      // From right: player_load(3) + dec(1-2) + acc(2) + hsr(1-3) = variable
      // Reliable fixed suffix: player_load is always 3 digits (100-999 range in this dataset)
      // acc is always 2 digits (10-99), dec can be 1-2 digits
      // Try pl(3)+dec(2)+acc(2) = 7 from right first, then check if it makes sense
      if (mid.length >= 7) {
        const pl  = parseInt(mid.slice(-3), 10)
        const dec = parseInt(mid.slice(-5, -3), 10)
        const acc = parseInt(mid.slice(-7, -5), 10)
        const front = mid.slice(0, -7) // dist_v4(3) + dist_hir(1-3) + sprint fields

        if (!isNaN(pl) && pl >= 100 && pl <= 999 &&
            !isNaN(acc) && acc >= 5 && acc <= 99 &&
            !isNaN(dec) && dec >= 0) {
          metricas['player_load'] = pl
          metricas['dec2'] = dec
          metricas['acc2'] = acc

          // front: dist_v4(3) + dist_hir(variable) + sprintDist(var) + numSprints(var) + hsr(var)
          // dist_v4 is always 3 digits (100-999m for active players)
          if (front.length >= 3) {
            metricas['dist_v4'] = parseInt(front.slice(0, 3), 10)
            // remaining: dist_hir + sprint fields + hsr(2-3 digits before acc)
            // hsr is the value right before acc in the column, but here we've already consumed acc
            // Actually looking at column order: ...HSR, Acc, Dec, PL
            // So hsr IS the 3 chars before acc (already in the remaining -7 slice)
            // Let me re-examine: mid ends with hsr(3)+acc(2)+dec(2)+pl(3)?
            // No! Column order: HSR | Acc | Dec | PL
            // So from RIGHT: pl(3) dec(2) acc(2) hsr(1-3) = variable
            // But I put pl,dec,acc together... hsr is BEFORE acc
            // Let me reparse: rightmost 3=PL, next 2=Dec, next 2=Acc
            // That leaves: dist_v4(3) + dist_hir(var) + sprintDist(var) + numSprints(var) + hsr(var)
            // front = everything before the last 7 chars
            // front contains: dist_v4 + dist_hir + sprintDist + numSprints + hsr
            // We can't reliably split these without knowing individual widths
            // Best effort: dist_v4 is first 3, then try to find hsr at the end
            const afterV4 = front.slice(3)
            // hsr + sprintDist + numSprints are the remaining fields
            // In this dataset, numSprints is always 0 or 1 digit (0-6)
            // sprintDist is 0-51m
            // hsr is 0-209m
            // These can't be unambiguously split when merged
            // Best effort: leave dist_hir, dist_v5, n_sprints out for merged format
          }
        }
      }
    }

    if (Object.values(metricas).some((v: number) => v > 0)) {
      const cleanName = cleanCatapultName(name)
      results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
    }
  }

  return results.length > 0 ? results : null
}

async function parsePdf(bytes: Uint8Array): Promise<Record<string, any>[]> {
  // Use pdf-parse (pure Node.js, works in Vercel serverless)
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(Buffer.from(bytes))
  const rawText: string = data.text

  // Find the section containing the Cuadro Resumen
  let pageText = rawText
  // If multiple pages, find the one with the data table
  if (rawText.includes('\f')) {
    const pages = rawText.split('\f')
    for (const p of pages) {
      const ln = normStr(p)
      if (ln.includes('cuadro resumen') || ln.includes('tot dist') || ln.includes('meterage per') || ln.includes('data base')) {
        pageText = p; break
      }
    }
  }

  const lines = pageText.split('\n').map((l: string) => l.trim()).filter(Boolean)

  // ── Try row-based format first (DATA BASE / OpenField style) ──
  const rowResults = parsePdfRowFormat(lines)
  if (rowResults && rowResults.length > 0) return rowResults

  // ── Fall back to columnar format (standard Cuadro Resumen) ──
  // Extract player names (lines before "Promedio")
  const names: string[] = []
  let promedio_idx = -1
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim()
    if (normStr(s) === 'promedio') { promedio_idx = i; break }
    if (/^PAGE \d+/i.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) continue
    if (s) names.push(s)
  }

  if (promedio_idx === -1 || names.length === 0)
    throw new Error('No se encontraron jugadores en el PDF. Verificá que sea el Cuadro Resumen de Catapult. [DEBUG texto: ' + lines.slice(0, 30).join(' | ') + ']')

  const nPlayers = names.length
  const nTotalPerCol = nPlayers + 2 // players + Promedio + Max

  // ── Tokenize data section (after "Promedio") ──
  type Token = { type: 'text' | 'num'; val: any }
  const tokens: Token[] = []

  for (let i = promedio_idx + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const ln = normStr(line)
    if (ln === 'md' || ln === 'cuadro resumen') continue
    if (/^\d{2}\/\d{2}\/\d{4}/.test(line)) continue
    if (/^j\d+\s+vs\s+/i.test(ln)) continue
    if (/^page\s+\d+/i.test(ln)) continue

    const m = line.match(/^(.*?)(\d[\d,.]*)$/)
    if (m) {
      const txt = m[1].trim()
      const num = parseFloat(m[2].replace(',', '.'))
      if (txt) tokens.push({ type: 'text', val: txt })
      tokens.push({ type: 'num', val: num })
    } else {
      tokens.push({ type: 'text', val: line })
    }
  }

  // ── Group into blocks (text_label + nTotalPerCol numbers) ──
  const blocks: Array<{ label: string; values: number[] }> = []
  let curLabel = ''
  let curValues: number[] = []

  const flush = () => {
    if (curValues.length > 0) blocks.push({ label: curLabel.trim(), values: [...curValues] })
    curLabel = ''; curValues = []
  }

  for (const tok of tokens) {
    if (tok.type === 'text') {
      if (curValues.length > 0) flush()
      curLabel = (curLabel + ' ' + tok.val).trim()
    } else {
      curValues.push(tok.val)
      if (curValues.length === nTotalPerCol) flush()
    }
  }
  flush()

  if (blocks.length === 0)
    throw new Error('No se encontraron datos numéricos en el PDF.')

  // ── Map blocks to fields (col order: block[i].values = CATAPULT_COL_ORDER[i]) ──
  const results: Record<string, any>[] = []
  for (let pi = 0; pi < nPlayers; pi++) {
    const cleanName = cleanCatapultName(names[pi])
    const metricas: Record<string, number> = {}
    for (let bi = 0; bi < blocks.length; bi++) {
      const field = bi < CATAPULT_COL_ORDER.length ? CATAPULT_COL_ORDER[bi] : `col_${bi}`
      const val = blocks[bi].values[pi]
      if (val !== undefined && !isNaN(val)) metricas[field] = val
    }
    if (Object.values(metricas).some(v => v > 0))
      results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
  }
  return results
}

// ─── PLAYER MATCHING ──────────────────────────────────────────────────────────
async function matchPlayers(rows: Record<string,any>[], clubId: number|null) {
  const sql = getDb()
  const jugadores = clubId ? await sql`
    SELECT j.id, u.nombre FROM jugadores j
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE u.club_id = ${clubId} AND u.activo = true
  ` : []

  const byNorm = new Map<string, any>()
  for (const j of jugadores as any[]) {
    const full = normalizeName(j.nombre)
    byNorm.set(full, j)
    const parts = full.split(' ')
    if (!byNorm.has(parts[0])) byNorm.set(parts[0], j)
    if (parts.length > 1 && !byNorm.has(parts[parts.length-1]))
      byNorm.set(parts[parts.length-1], j)
  }

  const matched: any[] = [], unmatched: string[] = []
  for (const row of rows) {
    let jug = null, method = null
    if (byNorm.has(row.nombre_norm)) { jug = byNorm.get(row.nombre_norm); method = 'nombre' }
    if (!jug) {
      const fn = row.nombre_norm.split(' ')[0]
      if (byNorm.has(fn)) { jug = byNorm.get(fn); method = 'primer_nombre' }
    }
    if (!jug) {
      for (const [k, v] of Array.from(byNorm)) {
        if (k.includes(row.nombre_norm) || row.nombre_norm.includes(k)) { jug = v; method = 'parcial'; break }
      }
    }
    if (jug) matched.push({ ...row, jugador_id: jug.id, jugador_nombre: jug.nombre, match_method: method })
    else unmatched.push(row.nombre_catapult)
  }
  return { matched, unmatched }
}

// ─── ROUTE ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const contentType = req.headers.get('content-type') || ''
    let fecha: string, tipo_sesion: string, sesion_id: number | null, confirm: boolean
    let parsedRows: Record<string, any>[]
    let isPdf = false

    if (contentType.includes('application/json')) {
      // JSON path: Excel rows pre-parsed client-side, or PDF as base64
      const body = await req.json()
      if (!body.fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 })
      fecha = String(body.fecha)
      tipo_sesion = String(body.tipo_sesion || 'entrenamiento')
      sesion_id = body.sesion_id ? Number(body.sesion_id) : null
      confirm = body.confirm === true

      try {
        if (body.rows && Array.isArray(body.rows)) {
          // Excel rows pre-parsed in browser — parse directly, no file bytes needed
          parsedRows = parseRawRows(body.rows as any[][])
        } else if (body.fileBase64) {
          // PDF as base64
          isPdf = true
          const binaryStr = atob(body.fileBase64)
          const bytes = new Uint8Array(binaryStr.length)
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
          parsedRows = await parsePdf(bytes)
        } else {
          return NextResponse.json({ error: 'Falta rows o fileBase64' }, { status: 400 })
        }
      } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 400 })
      }
    } else {
      // FormData path (PDF and small Excel — original working code)
      const fd = await req.formData()
      const file = fd.get('file') as File | null
      fecha = fd.get('fecha') as string
      tipo_sesion = (fd.get('tipo_sesion') as string) || 'entrenamiento'
      sesion_id = fd.get('sesion_id') ? Number(fd.get('sesion_id')) : null
      if (!file || !fecha) return NextResponse.json({ error: 'Falta archivo o fecha' }, { status: 400 })
      const bytes = new Uint8Array(await file.arrayBuffer())
      isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'
      confirm = fd.get('confirm') === 'true'
      try {
        parsedRows = isPdf ? await parsePdf(bytes) : parseExcel(bytes)
      } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 400 })
      }
    }

    if (!parsedRows.length)
      return NextResponse.json({ error: 'No se encontraron datos válidos. Verificá que sea un reporte de Catapult con el Cuadro Resumen.' }, { status: 400 })

    const { matched, unmatched } = await matchPlayers(parsedRows, s.clubId || null)

    if (!confirm) {
      return NextResponse.json({
        preview: true, fecha, tipo_sesion, sesion_id,
        fuente: isPdf ? 'pdf' : 'excel',
        matched: matched.map(m => ({
          nombre_catapult: m.nombre_catapult, jugador_nombre: m.jugador_nombre,
          match_method: m.match_method, metricas: m.metricas,
          n_metricas: Object.keys(m.metricas||{}).length,
          sin_datos: Object.values(m.metricas||{}).every(v => !v),
        })),
        unmatched, total_filas: parsedRows.length,
        columnas_detectadas: Object.keys(parsedRows[0]?.metricas||{}),
      })
    }

    // CONFIRM: save to DB
    const sql = getDb()

    // Check if metricas column exists
    let hasMetricasCol = false
    try {
      await sql`SELECT metricas FROM gps_logs LIMIT 0`
      hasMetricasCol = true
    } catch (_) {
      // Column doesn't exist — try to create it
      try {
        await sql`ALTER TABLE gps_logs ADD COLUMN IF NOT EXISTS metricas JSONB DEFAULT '{}'`
        hasMetricasCol = true
      } catch (_2) { hasMetricasCol = false }
    }

    let saved = 0
    const errors: string[] = []

    for (const m of matched) {
      const met = m.metricas || {}
      if (Object.values(met).every(v => !v)) continue

      const fixed = {
        dist_total:   met.dist_total   ?? null,
        dist_hir:     met.dist_hir     ?? null,
        dist_v4:      met.dist_v4      ?? null,
        dist_v5:      met.dist_v5      ?? null,
        player_load:  met.player_load  ?? null,
        max_velocity: met.max_velocity ?? null,
        acc2:         met.acc2         ?? null,
        dec2:         met.dec2         ?? null,
        acc3:         met.acc3         ?? null,
        dec3:         met.dec3         ?? null,
        dist_per_min: met.dist_per_min ?? null,
      }

      try {
        await sql`
          DELETE FROM gps_logs
          WHERE jugador_id = ${m.jugador_id} AND fecha = ${fecha} AND tipo_sesion = ${tipo_sesion}
        `

        if (hasMetricasCol) {
          await sql`
            INSERT INTO gps_logs (
              jugador_id, club_id, fecha, sesion_id, tipo_sesion,
              dist_total, dist_hir, dist_v4, dist_v5,
              player_load, max_velocity, acc2, dec2, acc3, dec3,
              dist_per_min, fuente, metricas
            ) VALUES (
              ${m.jugador_id}, ${s.clubId||null}, ${fecha}, ${sesion_id}, ${tipo_sesion},
              ${fixed.dist_total}, ${fixed.dist_hir}, ${fixed.dist_v4}, ${fixed.dist_v5},
              ${fixed.player_load}, ${fixed.max_velocity}, ${fixed.acc2}, ${fixed.dec2}, ${fixed.acc3}, ${fixed.dec3},
              ${fixed.dist_per_min}, ${isPdf?'pdf':'excel'}, ${JSON.stringify(met)}
            )
          `
        } else {
          // Fallback: insert without metricas column (old schema)
          await sql`
            INSERT INTO gps_logs (
              jugador_id, club_id, fecha, sesion_id, tipo_sesion,
              dist_total, dist_hir, dist_v4, dist_v5,
              player_load, max_velocity, acc2, dec2, acc3, dec3,
              dist_per_min, fuente
            ) VALUES (
              ${m.jugador_id}, ${s.clubId||null}, ${fecha}, ${sesion_id}, ${tipo_sesion},
              ${fixed.dist_total}, ${fixed.dist_hir}, ${fixed.dist_v4}, ${fixed.dist_v5},
              ${fixed.player_load}, ${fixed.max_velocity}, ${fixed.acc2}, ${fixed.dec2}, ${fixed.acc3}, ${fixed.dec3},
              ${fixed.dist_per_min}, ${isPdf?'pdf':'excel'}
            )
          `
        }
        saved++
      } catch (e) {
        errors.push(`${m.jugador_nombre}: ${String(e).slice(0, 80)}`)
      }
    }

    return NextResponse.json({
      ok: true, saved, unmatched, errors,
      fuente: isPdf ? 'pdf' : 'excel',
      columnas_detectadas: Object.keys(parsedRows[0]?.metricas||{}),
      message: `${saved} jugadores importados desde ${isPdf?'PDF':'Excel'}`,
    })

  } catch (err) {
    console.error('[GPS import error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
