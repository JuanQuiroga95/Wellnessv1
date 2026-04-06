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

  const results: Record<string, any>[] = []

  // Pre-merge lines: pdf-parse sometimes splits "L Luvannor ST 4685..." into
  // "L" on one line and "Luvannor ST 4685..." on the next.
  // Merge any orphan initial (1-2 char line) with the following line.
  const mergedLines: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const cur = lines[i].trim()
    if (cur.length <= 2 && /^[A-Z]$/.test(cur) && i + 1 < lines.length) {
      mergedLines.push(cur + ' ' + lines[i + 1].trim())
      i++ // skip next line since we merged it
    } else {
      mergedLines.push(cur)
    }
  }

  for (const line of mergedLines) {
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
