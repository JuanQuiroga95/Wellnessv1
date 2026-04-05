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

async function parsePdf(bytes: Uint8Array): Promise<Record<string, any>[]> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(Buffer.from(bytes))
  const rawText: string = data.text

  // ── APPROACH 1: Row-based (pypdf / newer pdf-parse) ──────────────────────────
  // Each player on one line: "R Silva CB 5563 73.06 505 113 0 0 133 65 48 649 01:16:08 24"
  const tryRowBased = (): Record<string, any>[] => {
    const lines = rawText.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const SKIP = ['total', 'moyenne', 'average', 'promedio', 'media',
                  'page', 'data', 'rapport', 'position', 'cuadro', 'md']
    const out: Record<string, any>[] = []
    for (const line of lines) {
      const parts = line.split(/\s+/)
      if (parts.length < 8) continue
      const firstNorm = normStr(parts[0])
      if (SKIP.some((p: string) => firstNorm.startsWith(p))) continue
      if (/^\d+$/.test(parts[0]) || /^\d{2}\/\d{2}\/\d{4}/.test(parts[0])) continue
      // Find position abbrev (all-caps 1-5 chars) within first 5 words
      let posIdx = -1
      for (let i = 1; i < Math.min(6, parts.length); i++) {
        if (/^[A-Z]{1,5}$/.test(parts[i])) { posIdx = i; break }
      }
      if (posIdx === -1) continue
      const name = parts.slice(0, posIdx).join(' ')
      if (!name || normStr(name).length < 2) continue
      // Numbers after position, skip HH:MM:SS
      const numStrs = parts.slice(posIdx + 1).filter((p: string) => !/^\d{1,2}:\d{2}/.test(p))
      const nums = numStrs.map((p: string) => parseFloat(p.replace(',', '.'))).filter((n: number) => !isNaN(n))
      if (nums.length < 8) continue
      const set = (k: string, v: number | undefined) => { if (v !== undefined && !isNaN(v)) metricas[k] = v }
      const metricas: Record<string, number> = {}
      set('dist_total',   nums[0])
      set('dist_per_min', nums[1])
      set('dist_v4',      nums[2])
      set('dist_v5',      nums[4])
      set('n_sprints',    nums[5])
      set('dist_hir',     nums[6])
      set('acc2',         nums[7])
      set('dec2',         nums[8])
      set('player_load',  nums[9])
      set('max_velocity', nums[10])
      if (Object.values(metricas).some(v => v > 0))
        out.push({ nombre_catapult: name, nombre_norm: normalizeName(name), metricas })
    }
    return out
  }

  // ── APPROACH 2: Columnar-based (classic pdf-parse extraction) ─────────────────
  // All names stacked first, then summary rows (Total/Moyenne/Promedio), then data blocks
  const tryColumnar = (): Record<string, any>[] => {
    let pageText = rawText
    if (rawText.includes('\f')) {
      const pages = rawText.split('\f')
      for (const p of pages) {
        const ln = normStr(p)
        if (ln.includes('cuadro resumen') || ln.includes('data base') ||
            ln.includes('tot dist') || ln.includes('meterage per')) { pageText = p; break }
      }
    }
    const lines = pageText.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const SUMMARY = ['promedio', 'moyenne', 'total', 'average', 'media']
    const names: string[] = []
    let summaryIdx = -1
    for (let i = 0; i < lines.length; i++) {
      const s = lines[i].trim()
      if (SUMMARY.includes(normStr(s))) { summaryIdx = i; break }
      if (/^PAGE \d+/i.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) continue
      // Skip header words (no digits, short lines with known column header terms)
      const ln = normStr(s)
      if (['position','pos','cb','cm','fb','st','w','gk','lm','rm'].includes(ln)) continue
      if (s) names.push(s)
    }
    if (summaryIdx === -1 || names.length === 0) return []
    const nPlayers = names.length
    const nTotalPerCol = nPlayers + 2
    type Token = { type: 'text' | 'num'; val: any }
    const tokens: Token[] = []
    for (let i = summaryIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const ln = normStr(line)
      if (['md','cuadro resumen','data base'].includes(ln)) continue
      if (/^\d{2}\/\d{2}\/\d{4}/.test(line) || /^page\s+\d+/i.test(ln)) continue
      const m = line.match(/^(.*?)(\d[\d,.]*)$/)
      if (m) {
        const txt = m[1].trim()
        const num = parseFloat(m[2].replace(',', '.'))
        if (txt) tokens.push({ type: 'text', val: txt })
        tokens.push({ type: 'num', val: num })
      } else { tokens.push({ type: 'text', val: line }) }
    }
    const blocks: Array<{ label: string; values: number[] }> = []
    let curLabel = '', curValues: number[] = []
    const flush = () => { if (curValues.length > 0) blocks.push({ label: curLabel.trim(), values: [...curValues] }); curLabel = ''; curValues = [] }
    for (const tok of tokens) {
      if (tok.type === 'text') { if (curValues.length > 0) flush(); curLabel = (curLabel + ' ' + tok.val).trim() }
      else { curValues.push(tok.val); if (curValues.length === nTotalPerCol) flush() }
    }
    flush()
    if (blocks.length === 0) return []
    const COL_ORDER = ['dist_total','dist_per_min','dist_v4','dist_hir','dist_v5','n_sprints','acc2','dec2','max_velocity']
    const out: Record<string, any>[] = []
    for (let pi = 0; pi < nPlayers; pi++) {
      const cleanName = cleanCatapultName(names[pi])
      const metricas: Record<string, number> = {}
      for (let bi = 0; bi < blocks.length; bi++) {
        const field = bi < COL_ORDER.length ? COL_ORDER[bi] : `col_${bi}`
        const val = blocks[bi].values[pi]
        if (val !== undefined && !isNaN(val)) metricas[field] = val
      }
      if (Object.values(metricas).some(v => v > 0))
        out.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
    }
    return out
  }

  // Try row-based first, fall back to columnar
  let results = tryRowBased()
  if (results.length === 0) results = tryColumnar()

  if (results.length === 0) {
    // Include first 500 chars of extracted text to help debugging
    const preview = rawText.replace(/\n/g, ' | ').slice(0, 500)
    throw new Error(`No se encontraron jugadores en el PDF. Verificá que sea el Cuadro Resumen de Catapult. [DEBUG texto: ${preview}]`)
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
