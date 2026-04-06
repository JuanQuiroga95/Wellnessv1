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

// ─── UNIVERSAL METRIC MAP (Excel + PDF headers — ES / FR / EN) ───────────────
// Order matters: more specific patterns FIRST to avoid false positives.
// normStr() is applied to both the header and each pattern before comparing.
const METRIC_COL_MAP: Array<[string, string]> = [
  // ── Distance total ──────────────────────────────────────────────────────────
  ['total distance','dist_total'],['total dist','dist_total'],['tot dist','dist_total'],
  ['dist totale','dist_total'],['distancia total','dist_total'],['distance totale','dist_total'],
  // ── Meterage / distance per minute ──────────────────────────────────────────
  ['meterage per minute','dist_per_min'],['meterage per min','dist_per_min'],
  ['distance per minute','dist_per_min'],['dist per min','dist_per_min'],['dist/min','dist_per_min'],
  ['metros por minuto','dist_per_min'],['metres par minute','dist_per_min'],
  ['metres per minute','dist_per_min'],['mts/min','dist_per_min'],['mts min','dist_per_min'],
  // ── High Speed Running (>19.7 km/h) ─────────────────────────────────────────
  ['high speed running','dist_hir'],['high speed dist','dist_hir'],['high speed distance','dist_hir'],
  ['high speed','dist_hir'],['hsr','dist_hir'],['high intensity running','dist_hir'],
  ['alta intensidad','dist_hir'],['course haute intensite','dist_hir'],['haute intensite','dist_hir'],
  // ── Velocity Band 4 (15-20 km/h) ────────────────────────────────────────────
  ['vel b4 tot dist','dist_v4'],['vel b4 tot','dist_v4'],['vel b4','dist_v4'],
  ['velocity band 4','dist_v4'],['v4 dist','dist_v4'],['banda 4','dist_v4'],['bande 4','dist_v4'],
  ['15-20','dist_v4'],['15 20','dist_v4'],
  // ── Velocity Band 5/6 / Sprint distance (>20 km/h) ──────────────────────────
  ['vel b6 tot dist','dist_v5'],['vel b6 tot','dist_v5'],['vel b6','dist_v5'],
  ['vel b5 tot dist','dist_v5'],['vel b5 tot','dist_v5'],['vel b5','dist_v5'],
  ['velocity band 6','dist_v5'],['velocity band 5','dist_v5'],
  ['v6 dist','dist_v5'],['v5 dist','dist_v5'],
  ['sprint distance','dist_v5'],['sprint dist','dist_v5'],['distancia sprint','dist_v5'],
  ['distance sprint','dist_v5'],['dist sprint','dist_v5'],
  ['banda 6','dist_v5'],['banda 5','dist_v5'],['bande 6','dist_v5'],['bande 5','dist_v5'],
  ['20 25','dist_v5'],['20/25','dist_v5'],['20-25','dist_v5'],
  // ── Player Load ─────────────────────────────────────────────────────────────
  ['player load','player_load'],['playerload','player_load'],['carga jugador','player_load'],
  ['charge joueur','player_load'],['tot pl','player_load'],
  // ── Max Velocity ─────────────────────────────────────────────────────────────
  ['max velocity','max_velocity'],['max vel','max_velocity'],['top speed','max_velocity'],
  ['velocidad maxima','max_velocity'],['vitesse maximale','max_velocity'],['vel max','max_velocity'],
  ['vitesse max','max_velocity'],['vmax','max_velocity'],['velocidad max','max_velocity'],
  // ── Accelerations B2-3 ───────────────────────────────────────────────────────
  ['acc b2-3 tot effs','acc2'],['acc b2-3 tot','acc2'],['acc b2-3','acc2'],
  ['accelerations b2 3','acc2'],['accelerations b2','acc2'],['aceleraciones b2','acc2'],
  ['acc b2','acc2'],['acc2 eff','acc2'],['acc 2','acc2'],['accel b2','acc2'],
  ['nombre accelerations','acc2'],
  // ── Decelerations B2-3 ──────────────────────────────────────────────────────
  ['decel b2-3 tot effs','dec2'],['decel b2-3 tot','dec2'],['decel b2-3','dec2'],
  ['decelerations b2 3','dec2'],['decelerations b2','dec2'],['desaceleraciones b2','dec2'],
  ['dec b2','dec2'],['dec2 eff','dec2'],['dec 2','dec2'],['decel b2','dec2'],
  ['nombre decelerations','dec2'],
  // ── Accelerations B3 ────────────────────────────────────────────────────────
  ['acc b3','acc3'],['acc3 eff','acc3'],['acc 3','acc3'],['accel b3','acc3'],
  // ── Decelerations B3 ────────────────────────────────────────────────────────
  ['dec b3','dec3'],['dec3 eff','dec3'],['dec 3','dec3'],['decel b3','dec3'],
  // ── Number of Sprints ────────────────────────────────────────────────────────
  ['number of sprints','n_sprints'],['number sprints','n_sprints'],['num sprints','n_sprints'],
  ['numero sprints','n_sprints'],['numero de sprints','n_sprints'],
  ['nombre sprints','n_sprints'],['nombre de sprints','n_sprints'],
  ['n sprints','n_sprints'],
  // ── Velocity bands 1/2/3 (lower speed zones) ─────────────────────────────────
  ['vel b1','dist_v1'],['velocity band 1','dist_v1'],['banda 1','dist_v1'],['bande 1','dist_v1'],
  ['vel b2','dist_v2'],['velocity band 2','dist_v2'],['banda 2','dist_v2'],['bande 2','dist_v2'],
  ['vel b3','dist_v3'],['velocity band 3','dist_v3'],['banda 3','dist_v3'],['bande 3','dist_v3'],
  // ── Heart Rate / Metabolic ───────────────────────────────────────────────────
  ['metabolic power','metabolic_power'],['puissance metabolique','metabolic_power'],
  ['hr avg','hr_avg'],['fc moyenne','hr_avg'],['fc media','hr_avg'],['frecuencia cardiaca media','hr_avg'],
  ['hr max','hr_max'],['fc max','hr_max'],['frecuencia cardiaca max','hr_max'],
  // ── Duration ─────────────────────────────────────────────────────────────────
  ['total duration','duracion_min'],['total dur','duracion_min'],['tot dur','duracion_min'],
  ['duration','duracion_min'],['duree','duracion_min'],['duracion','duracion_min'],
  ['temps total','duracion_min'],['time played','duracion_min'],['playing time','duracion_min'],
  ['elapsed time','duracion_min'],['total time','duracion_min'],
]

// Match a column header (Excel or PDF block label) to an internal field name.
function matchMetricCol(h: string): string | null {
  const hn = normStr(h)
  for (const [label, field] of METRIC_COL_MAP)
    if (hn.includes(normStr(label))) return field
  return null
}

// Backward-compat alias (used by Excel parser below)
const matchExcelCol = matchMetricCol

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
        // Handle HH:MM:SS or MM:SS duration → convert to minutes
        if (f === 'duracion_min') {
          const durStr = String(cell).trim()
          const durMatch = durStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
          if (durMatch) {
            const h = durMatch[3] ? parseInt(durMatch[1]) : 0
            const m = durMatch[3] ? parseInt(durMatch[2]) : parseInt(durMatch[1])
            const s = durMatch[3] ? parseInt(durMatch[3]) : parseInt(durMatch[2])
            const totalMin = h * 60 + m + s / 60
            if (totalMin > 0) metricas[f] = Math.round(totalMin * 10) / 10
            return
          }
        }
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
  'dist_v5',     // 20/25 km/h (VEL B5 — includes sprint zone distance)
  null,          // Sprint distance (VEL B6 — already covered by dist_v5 above, skip to avoid double-count)
  'n_sprints',
  'dist_hir',   // HSR (>19.7) — this IS the real High Speed Running metric
  'acc2',
  'dec2',
  'player_load',
  'duracion_min', // Duration (HH:MM:SS → converted to minutes)
  'max_velocity',
]

function cleanCatapultName(raw: string): string {
  // "ALBERTO RUBIO ALBERTO R." → "ALBERTO RUBIO"
  // "KIKO KIKO" → "KIKO"
  // "L Luvannor" → "L Luvannor" (do NOT strip — "L" is just an initial)
  const parts = raw.trim().split(/\s+/)
  const n = parts.length
  if (n < 2) return raw.trim()
  // If last word is repeated first word, remove it
  if (normStr(parts[n-1]) === normStr(parts[0])) return parts.slice(0, n-1).join(' ')
  // If second half is an abbreviation of first half —
  // only apply when first part is >= 3 chars (NOT a bare initial like "L" or "A")
  for (let split = 1; split < n; split++) {
    const first = parts.slice(0, split).join(' ')
    const rest  = parts.slice(split).join(' ')
    if (first.length < 3) continue  // skip: first part is a single letter initial
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
    'dist_total', 'dist_per_min', 'dist_v4', 'dist_v5', // 20/25 km/h = sprint zone dist
    null, 'n_sprints', 'dist_hir',  // Sprint dist (B6) skip — already captured in dist_v5
    'acc2', 'dec2', 'player_load', 'duracion_min', 'max_velocity'
  ]

  const SUMMARY_WORDS = new Set(['total','moyenne','average','promedio','media','totale','totaux','totals'])

  const results: Record<string, any>[] = []

  // ── Phase 1: Detect if pdf-parse has fragmented the text (one word/token per line) ──
  // When fragmented, we need to reassemble player rows from the token stream.
  // Reliable signal: if POS_CODE tokens appear ALONE on a line (no name before them, no data after),
  // pdf-parse has fragmented the PDF into individual tokens.
  const nonEmpty = lines.filter(l => l.trim())
  const lonePosCodes = nonEmpty.filter(l => POS_CODES.includes(l.trim()))
  const isFragmented = lonePosCodes.length >= 2

  let workingLines: string[]

  if (isFragmented) {
    // ── Fragmented mode: reassemble rows from token stream ──
    // Strategy: collect all tokens, find player rows by scanning for POS_CODE
    // followed by a sequence of numbers (TotDist, MeterPerMin, etc.)
    // Token stream example: ['R','Silva','CB','5563','73.06','505','113','0','0','133','65','48','649','01:16:08','24','A','Cherif','CM',...]
    // Header/unit tokens that must never be treated as player name parts
    const HEADER_SKIP_TOKENS = new Set([
      'position','pos','name','nombre','player','jugador','athlete','total','totale','totaux','totals',
      'moyenne','promedio','media','average','prom','avg','mean',
      'meterage','minute','per','running','distance','sprint','sprints','number','high','speed',
      'acc','decel','effs','eff','gen','load','dist','vel','max','tot','dur','pl',
      'km','m','meteres','meters','metres',
      'data','base','rapport','openfield','page','of','cuadro','resumen','summary',
      'de','du','la','le','les','el','los','atleta',
    ])
    // Tokens that are clearly non-name (parenthetical units, special chars, numeric fragments)
    function isHeaderToken(tok: string): boolean {
      if (/^\(.*\)$/.test(tok)) return true           // (m), (km/h), (>19,7), (Gen
      if (/^[><()\[\]/\\]/.test(tok)) return true     // starts with special char
      if (/^\d+[)>]$/.test(tok)) return true          // e.g. "2)"
      if (/^[A-Z0-9]{1,2}[/\-][A-Z0-9]/i.test(tok)) return true  // B2-3, 15-20/, 20/25
      if (/^km\//i.test(tok)) return true             // km/h
      if (/^[A-Z]'[A-Z]/i.test(tok)) return true     // L'ATHLÈTE
      if (HEADER_SKIP_TOKENS.has(normStr(tok))) return true
      return false
    }

    const tokens: string[] = []
    for (const line of lines) {
      const t = line.trim()
      if (!t) continue
      // Skip header/footer lines
      if (/^page\s+\d+/i.test(t)) continue
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(t)) continue
      // Split multi-word tokens that survived (e.g. "R Silva")
      for (const tok of t.split(/\s+/)) {
        if (tok && !isHeaderToken(tok)) tokens.push(tok)
      }
    }

    // Find indices where a POS_CODE token appears and is followed by numeric tokens
    const rows: string[] = []
    let i = 0
    while (i < tokens.length) {
      if (POS_CODES.includes(tokens[i])) {
        // Check if next token looks like TotDist (3-5 digit number)
        if (i + 1 < tokens.length && /^\d{3,5}$/.test(tokens[i + 1])) {
          // Found a POS_CODE + data boundary. Collect name tokens before it.
          // Name tokens are everything after the previous numeric block ended.
          // We build the full player line: [name tokens] [POS] [data tokens...]
          const posIdx = i
          // Collect name: go backward until we hit a number, POS_CODE, or non-name token
          let nameStart = posIdx - 1
          while (nameStart >= 0) {
            const tok = tokens[nameStart]
            // Stop if we hit a number, duration, another POS_CODE, or a non-name token
            if (/^\d/.test(tok) || POS_CODES.includes(tok) || isHeaderToken(tok)) break
            // Only accept alphabetic tokens as name parts (player names are letters only)
            if (!/^[A-Za-zÀ-ÿ'-]+$/.test(tok)) break
            nameStart--
          }
          nameStart++ // first name token

          const nameParts = tokens.slice(nameStart, posIdx).filter(t => /^[A-Za-zÀ-ÿ'-]+$/.test(t) && !isHeaderToken(t))
          const pos = tokens[posIdx]

          // Collect data tokens: only numeric/duration values until next player or summary
          const dataParts: string[] = []
          let j = posIdx + 1
          while (j < tokens.length) {
            const tok = tokens[j]
            // Stop if next POS_CODE is found AND is followed by a number (next player row)
            if (POS_CODES.includes(tok) && j + 1 < tokens.length && /^\d{3,5}$/.test(tokens[j + 1])) break
            // Stop if we encounter a clear summary word
            if (SUMMARY_WORDS.has(normStr(tok))) break
            // Stop at alphabetic tokens that are not numbers — next player's name starts here
            if (/^[A-Za-z]/.test(tok) && !POS_CODES.includes(tok)) break
            dataParts.push(tok)
            j++
          }

          if (nameParts.length > 0 && dataParts.length >= 6) {
            rows.push([...nameParts, pos, ...dataParts].join(' '))
          }
          i = j
          continue
        }
      }
      i++
    }
    workingLines = rows
  } else {
    // ── Normal mode: pre-merge lines ──
    // pdf-parse sometimes splits "L Luvannor ST 4685..." into
    // "L" on one line and "Luvannor ST 4685..." on the next.
    const mergedLines: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const cur = lines[i].trim()
      if (cur.length <= 2 && /^[A-Z]$/.test(cur) && i + 1 < lines.length) {
        mergedLines.push(cur + ' ' + lines[i + 1].trim())
        i++
      } else {
        mergedLines.push(cur)
      }
    }
    workingLines = mergedLines
  }

  for (const line of workingLines) {
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

    // Skip rows where name is only 1-2 chars (orphan initial that wasn't merged, or artifact)
    if (name.replace(/\s/g, '').length < 3) continue

    // Skip summary rows (Total, Moyenne, Average, Promedio, Media, etc.)
    const nameNorm = name.toLowerCase().replace(/[^a-z]/g, '')
    if (['total','moyenne','average','promedio','media','totale','totaux','totals'].includes(nameNorm)) continue

    // ── Parse values from rest ──
    // rest may be space-separated or fully merged
    const spaceParts = rest.trim().split(/\s+/)
    // A valid row has at least 8 numeric-ish tokens (accounts for pdf-parse merging a few zeros)
    const metricas: Record<string, number> = {}

    if (spaceParts.length >= 8) {
      // Space-separated: straightforward mapping
      for (let i = 0; i < spaceParts.length && i < FIELD_MAP.length; i++) {
        const field = FIELD_MAP[i]
        if (!field) continue
        // Convert HH:MM:SS duration to minutes
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(spaceParts[i])) {
          if (field === 'duracion_min') {
            const [h, m, s] = spaceParts[i].split(':').map(Number)
            const totalMin = h * 60 + m + s / 60
            if (totalMin > 0) metricas['duracion_min'] = Math.round(totalMin * 10) / 10
          }
          continue
        }
        const val = parseFloat(spaceParts[i].replace(',', '.'))
        if (!isNaN(val)) metricas[field] = val
      }
    } else {
      // Merged: pdf-parse sometimes concatenates all values without spaces.
      // Column order (after pos code): TotDist MeterPerMin 15-20 20/25 SprintDist NumSprints HSR Acc Dec TotPL Duration MaxVel
      // Strategy: anchor on the HH:MM:SS duration token (may survive merging), extract all numbers,
      // then map by position skipping the sprint-distance column (index 4 → null).

      // Extract duration (HH:MM:SS) — it often survives even partial merging
      const durMatch = rest.match(/(\d{1,2}:\d{2}:\d{2})/)
      let restNoDur = rest
      if (durMatch) {
        const [hh, mm, ss] = durMatch[1].split(':').map(Number)
        const totalMin = hh * 60 + mm + ss / 60
        if (totalMin > 0) metricas['duracion_min'] = Math.round(totalMin * 10) / 10
        restNoDur = rest.replace(durMatch[1], ' ').trim()
      }

      // Extract all remaining numbers (integers and decimals)
      const nums = (restNoDur.match(/\d+(?:\.\d+)?/g) || []).map(n => parseFloat(n))
      if (nums.length < 6) continue

      // MaxVel is always the LAST number (typically 2 digits, 15-45 km/h)
      const maxVelCandidate = nums[nums.length - 1]
      if (!isNaN(maxVelCandidate) && maxVelCandidate >= 15 && maxVelCandidate <= 45) {
        metricas['max_velocity'] = maxVelCandidate
      }

      // Map all numbers except the last to MERGED_MAP (same column order as space-separated)
      // [0] TotDist  [1] MeterPerMin  [2] 15-20(dist_v4)  [3] 20/25(dist_v5)
      // [4] SprintDist(skip)  [5] NumSprints  [6] HSR(dist_hir)
      // [7] Acc  [8] Dec  [9] TotPL
      const MERGED_MAP: (string | null)[] = [
        'dist_total', 'dist_per_min', 'dist_v4', 'dist_v5',
        null, 'n_sprints', 'dist_hir',
        'acc2', 'dec2', 'player_load'
      ]
      const dataNums = nums.slice(0, nums.length - 1)
      for (let i = 0; i < dataNums.length && i < MERGED_MAP.length; i++) {
        const field = MERGED_MAP[i]
        if (!field) continue
        if (!isNaN(dataNums[i])) metricas[field] = dataNums[i]
      }
    }

    if (Object.values(metricas).some((v: number) => v > 0)) {
      const cleanName = cleanCatapultName(name)
      results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
    }
  }

  return results.length > 0 ? results : null
}

// ─── PDF PARSER — from pre-extracted row-ordered text (client-side pdf.js) ───
// Called when the client sends `pdfText` (text extracted with pdf.js ordered by Y-coord).
// With row-ordered text, each player row is a single line:
//   "R Silva CB 5563 73.06 505 113 0 0 133 65 48 649 01:16:08 24"
// This correctly handles DATA BASE RAPPORT OPENFIELD (Arabic/Saudi clubs) and CUADRO RESUMEN.
function parsePdfFromText(rawText: string): Record<string, any>[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)

  // ── Try row-based format first (DATA BASE / RAPPORT OPENFIELD) ──
  const rowResults = parsePdfRowFormat(lines)
  if (rowResults && rowResults.length > 0) return rowResults

  // ── Fall back to columnar format (CUADRO RESUMEN) ──
  // Re-use the same columnar logic from parsePdf but without needing bytes.
  // Find page with data table (if page separator \f exists, it won't here since we join)
  const SEPARATOR_WORDS = new Set([
    'promedio','moyenne','average','media','total','prom','avg','mean',
    'totaux','totale','totals','team average','team total',
  ])
  const HEADER_TOKENS = new Set([
    'position','pos','name','nombre','player','jugador','athlete',
    'tot dist','total dist','total distance','distancia total','distance totale',
    'meterage per minute','meterage per min','meterage','per minute','per min',
    'high speed running','high speed','hsr','sprint distance','sprint dist',
    'number of sprints','number sprints','num sprints','n sprints',
    'player load','playerload','tot pl',
    'max velocity','max vel','top speed','vel max',
    'acc b2','acc b2-3','decel b2','decel b2-3','acc b3','dec b3',
    'velocity band','vel b4','vel b5','vel b6',
    '15-20','20/25','20-25','19,7','19.7',
    '(m)','(km/h)','(meteres)','(meters)','(metres)','km/h','m/min',
    'cuadro resumen','player summary','rapport openfield','data base',
    'gen 2','effs','eff','tot effs','b2-3 tot effs','b2-3 tot',
    'high','speed','running','sprint','distance','number','of','sprints',
    'acc','decel','tot','effs',
  ])
  function isHeaderLine(s: string): boolean {
    const sn = normStr(s)
    if (/^\([^)]{1,10}\)$/.test(s)) return true
    if (HEADER_TOKENS.has(sn)) return true
    if (/\b(dist|distance|speed|sprint|velocity|meterage|running|load|sprints|effs|acc|decel)\b/i.test(s) && !/\d/.test(s)) return true
    return false
  }

  const names: string[] = []
  let promedio_idx = -1
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim()
    const sn = normStr(s)
    if (SEPARATOR_WORDS.has(sn) || [...SEPARATOR_WORDS].some(w => sn.startsWith(w + ' '))) { promedio_idx = i; break }
    if (/^PAGE \d+/i.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) continue
    if (isHeaderLine(s)) continue
    if (s) names.push(s)
  }

  if (promedio_idx === -1 && names.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\d[\d,.\s]{3,}$/.test(lines[i].trim())) { promedio_idx = i; break }
    }
  }

  if (promedio_idx === -1 || names.length === 0)
    throw new Error('No se encontraron jugadores en el PDF. Verificá que sea el Cuadro Resumen de Catapult. [DEBUG texto: ' + lines.slice(0, 30).join(' | ') + ']')

  const nPlayers = names.length
  const nTotalPerCol = nPlayers + 2

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

  const blocks: Array<{ label: string; values: number[] }> = []
  let curLabel = '', curValues: number[] = []
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

  if (blocks.length === 0) throw new Error('No se encontraron datos numéricos en el PDF.')

  const blockFields = blocks.map((b, bi) => {
    const byLabel = matchMetricCol(b.label)
    if (byLabel) return byLabel
    return bi < CATAPULT_COL_ORDER.length ? CATAPULT_COL_ORDER[bi] : null
  })

  const results: Record<string, any>[] = []
  for (let pi = 0; pi < nPlayers; pi++) {
    const cleanName = cleanCatapultName(names[pi])
    const metricas: Record<string, number> = {}
    for (let bi = 0; bi < blocks.length; bi++) {
      const field = blockFields[bi]
      if (!field) continue
      const val = blocks[bi].values[pi]
      if (val !== undefined && !isNaN(val)) metricas[field] = val
    }
    if (Object.values(metricas).some(v => v > 0))
      results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
  }
  return results
}

async function parsePdf(bytes: Uint8Array): Promise<Record<string, any>[]> {
  // Use pdf-parse (pure Node.js, works in Vercel serverless)
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(Buffer.from(bytes))
  const rawText: string = data.text

  // Find the section containing the data table (any language — ES/FR/EN)
  let pageText = rawText
  // If multiple pages, find the one with the data table
  if (rawText.includes('\f')) {
    const pages = rawText.split('\f')
    for (const p of pages) {
      const ln = normStr(p)
      if (
        ln.includes('cuadro resumen') || ln.includes('tot dist') ||
        ln.includes('meterage per') || ln.includes('data base') ||
        ln.includes('rapport openfield') || ln.includes('distance totale') ||
        ln.includes('total distance') || ln.includes('player summary') ||
        ln.includes('distancia total')
      ) {
        pageText = p; break
      }
    }
  }

  const lines = pageText.split('\n').map((l: string) => l.trim()).filter(Boolean)

  // ── Try row-based format first (DATA BASE / OpenField style) ──
  const rowResults = parsePdfRowFormat(lines)
  if (rowResults && rowResults.length > 0) return rowResults

  // ── Fall back to columnar format (standard Cuadro Resumen) ──
  // Extract player names (lines before "Promedio" / "Moyenne" / "Average" — any language)
  const SEPARATOR_WORDS = new Set([
    'promedio','moyenne','average','media','total','prom','avg','mean',
    'totaux','totale','totals','team average','team total',
  ])

  // Known column header tokens that appear in Catapult PDFs before the player list.
  // These must be filtered out so they aren't mistaken for player names.
  const HEADER_TOKENS = new Set([
    'position','pos','name','nombre','player','jugador','athlete',
    'tot dist','total dist','total distance','distancia total','distance totale',
    'meterage per minute','meterage per min','meterage','per minute','per min',
    'high speed running','high speed','hsr','sprint distance','sprint dist',
    'number of sprints','number sprints','num sprints','n sprints',
    'player load','playerload','tot pl',
    'max velocity','max vel','top speed','vel max',
    'acc b2','acc b2-3','decel b2','decel b2-3','acc b3','dec b3',
    'velocity band','vel b4','vel b5','vel b6',
    '15-20','20/25','20-25','19,7','19.7',
    '(m)','(km/h)','(meteres)','(meters)','(metres)','km/h','m/min',
    'cuadro resumen','player summary','rapport openfield','data base',
    'gen 2','effs','eff','tot effs','b2-3 tot effs','b2-3 tot',
    'high','speed','running','sprint','distance','number','of','sprints',
    'acc','decel','tot','effs',
  ])

  function isHeaderLine(s: string): boolean {
    const sn = normStr(s)
    // Pure metric unit tokens
    if (/^\(m\)$/i.test(s) || /^\(km\/h\)$/i.test(s) || /^\(meteres\)$/i.test(s)) return true
    // Known header tokens (exact or included)
    if (HEADER_TOKENS.has(sn)) return true
    // Short parenthetical units like "(m)" "(km/h)"
    if (/^\([^)]{1,10}\)$/.test(s)) return true
    // Looks like a column header fragment: 2-3 word metric description with no numbers
    // and matches known metric patterns
    if (
      /\b(dist|distance|speed|sprint|velocity|meterage|running|load|sprints|effs|acc|decel)\b/i.test(s) &&
      !/\d/.test(s)
    ) return true
    return false
  }

  const names: string[] = []
  let promedio_idx = -1
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim()
    const sn = normStr(s)
    // Stop at separator row
    if (SEPARATOR_WORDS.has(sn) || [...SEPARATOR_WORDS].some(w => sn === w)) { promedio_idx = i; break }
    // Also stop if line STARTS with a separator word followed by a number (e.g. "Promedio 1234")
    if ([...SEPARATOR_WORDS].some(w => sn.startsWith(w + ' ') || sn.startsWith(w + '\t'))) { promedio_idx = i; break }
    // Skip page markers, dates, column headers
    if (/^PAGE \d+/i.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) continue
    if (isHeaderLine(s)) continue
    if (s) names.push(s)
  }

  // Fallback: if no separator word found but we have names, find first purely numeric line
  if (promedio_idx === -1 && names.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      if (/^\d[\d,.\s]{3,}$/.test(lines[i].trim())) { promedio_idx = i; break }
    }
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

  // ── Map blocks to fields DYNAMICALLY using block label → matchMetricCol ──
  // Handles any column order and any language (ES/FR/EN).
  // Fallback to positional CATAPULT_COL_ORDER for PDFs with unreadable labels.
  const blockFields = blocks.map((b, bi) => {
    const byLabel = matchMetricCol(b.label)
    if (byLabel) return byLabel
    return bi < CATAPULT_COL_ORDER.length ? CATAPULT_COL_ORDER[bi] : null
  })

  const results: Record<string, any>[] = []
  for (let pi = 0; pi < nPlayers; pi++) {
    const cleanName = cleanCatapultName(names[pi])
    const metricas: Record<string, number> = {}
    for (let bi = 0; bi < blocks.length; bi++) {
      const field = blockFields[bi]
      if (!field) continue
      const val = blocks[bi].values[pi]
      if (val !== undefined && !isNaN(val)) metricas[field] = val
    }
    if (Object.values(metricas).some(v => v > 0))
      results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
  }
  return results
}

// ─── PLAYER MATCHING ──────────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({length: m+1}, (_, i) =>
    Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

async function matchPlayers(rows: Record<string,any>[], clubId: number|null) {
  const sql = getDb()
  const jugadores = clubId ? await sql`
    SELECT j.id, u.nombre FROM jugadores j
    JOIN usuarios u ON u.id = j.usuario_id
    WHERE u.club_id = ${clubId} AND u.activo = true
  ` : []

  // Build lookup maps: full name, first name (>= 3 chars), last name (>= 3 chars)
  const byNorm = new Map<string, any>()
  const allJugadores: Array<{j: any, full: string, parts: string[]}> = []

  for (const j of jugadores as any[]) {
    const full = normalizeName(j.nombre)
    byNorm.set(full, j)
    const parts = full.split(' ')
    // Only index by word if >= 3 chars — single initials cause too many false matches
    if (parts[0].length >= 3 && !byNorm.has(parts[0])) byNorm.set(parts[0], j)
    if (parts.length > 1 && parts[parts.length-1].length >= 3 && !byNorm.has(parts[parts.length-1]))
      byNorm.set(parts[parts.length-1], j)
    allJugadores.push({ j, full, parts })
  }

  const matched: any[] = [], unmatched: string[] = []
  for (const row of rows) {
    // Skip rows with very short extracted names (parsing artifacts like lone initials)
    if (row.nombre_norm.length < 3) { unmatched.push(row.nombre_catapult); continue }

    let jug = null, method = null
    const rowParts = row.nombre_norm.split(' ')
    const rowSurname = rowParts[rowParts.length - 1]   // last word = surname
    const rowFirst   = rowParts[0]                      // first word = initial or first name

    // 1. Exact full-name match
    if (byNorm.has(row.nombre_norm)) { jug = byNorm.get(row.nombre_norm); method = 'nombre' }

    // 2. Exact surname match (last word of catapult name vs any word in roster name)
    if (!jug && rowSurname.length >= 3) {
      if (byNorm.has(rowSurname)) { jug = byNorm.get(rowSurname); method = 'apellido' }
    }

    // 3. Exact first-name match — only if first token >= 3 chars (not a single initial)
    if (!jug && rowFirst.length >= 3) {
      if (byNorm.has(rowFirst)) { jug = byNorm.get(rowFirst); method = 'primer_nombre' }
    }

    // 4. Substring match — both strings must be >= 4 chars
    if (!jug) {
      for (const [k, v] of Array.from(byNorm)) {
        if (k.length >= 4 && row.nombre_norm.length >= 4 &&
            (k.includes(row.nombre_norm) || row.nombre_norm.includes(k))) {
          jug = v; method = 'parcial'; break
        }
      }
    }

    // 5. Fuzzy surname match (Levenshtein) — for transliteration differences
    //    e.g. "Doshi" vs "Doshy", "Cherif" vs "Chariff", "Meghren" vs "Magren"
    //    Threshold: distance <= 2 for surnames >= 5 chars; distance <= 1 for 4-char surnames
    if (!jug && rowSurname.length >= 4) {
      let bestDist = 999, bestJ = null
      for (const {j: candidate, full, parts} of allJugadores) {
        // Compare row surname against every word in roster player's name
        for (const word of parts) {
          if (word.length < 4) continue
          const dist = levenshtein(rowSurname, word)
          const threshold = rowSurname.length >= 5 ? 2 : 1
          if (dist <= threshold && dist < bestDist) {
            bestDist = dist
            bestJ = candidate
          }
        }
      }
      if (bestJ) { jug = bestJ; method = 'fuzzy' }
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
        } else if (body.pdfText && typeof body.pdfText === 'string') {
          // PDF text extracted client-side (row-ordered via pdf.js) — parse directly
          isPdf = true
          parsedRows = parsePdfFromText(body.pdfText)
        } else if (body.fileBase64) {
          // PDF as base64 (legacy fallback)
          isPdf = true
          const binaryStr = atob(body.fileBase64)
          const bytes = new Uint8Array(binaryStr.length)
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
          parsedRows = await parsePdf(bytes)
        } else {
          return NextResponse.json({ error: 'Falta rows, pdfText o fileBase64' }, { status: 400 })
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
        n_sprints:    met.n_sprints    ?? null,
        duracion_min: met.duracion_min ?? null,
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
              dist_per_min, n_sprints, duracion_min, fuente, metricas
            ) VALUES (
              ${m.jugador_id}, ${s.clubId||null}, ${fecha}, ${sesion_id}, ${tipo_sesion},
              ${fixed.dist_total}, ${fixed.dist_hir}, ${fixed.dist_v4}, ${fixed.dist_v5},
              ${fixed.player_load}, ${fixed.max_velocity}, ${fixed.acc2}, ${fixed.dec2}, ${fixed.acc3}, ${fixed.dec3},
              ${fixed.dist_per_min}, ${fixed.n_sprints}, ${fixed.duracion_min}, ${isPdf?'pdf':'excel'}, ${JSON.stringify(met)}
            )
          `
        } else {
          // Fallback: insert without metricas column (old schema)
          await sql`
            INSERT INTO gps_logs (
              jugador_id, club_id, fecha, sesion_id, tipo_sesion,
              dist_total, dist_hir, dist_v4, dist_v5,
              player_load, max_velocity, acc2, dec2, acc3, dec3,
              dist_per_min, n_sprints, duracion_min, fuente
            ) VALUES (
              ${m.jugador_id}, ${s.clubId||null}, ${fecha}, ${sesion_id}, ${tipo_sesion},
              ${fixed.dist_total}, ${fixed.dist_hir}, ${fixed.dist_v4}, ${fixed.dist_v5},
              ${fixed.player_load}, ${fixed.max_velocity}, ${fixed.acc2}, ${fixed.dec2}, ${fixed.acc3}, ${fixed.dec3},
              ${fixed.dist_per_min}, ${fixed.n_sprints}, ${fixed.duracion_min}, ${isPdf?'pdf':'excel'}
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
