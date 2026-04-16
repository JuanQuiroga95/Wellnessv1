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

// ─── UNIVERSAL METRIC MAP ───────────────────────────────────────────────────
const METRIC_COL_MAP: Array<[string, string]> = [
  ['total distance','dist_total'],['total dist','dist_total'],['tot dist','dist_total'],
  ['dist totale','dist_total'],['distancia total','dist_total'],['distance totale','dist_total'],
  ['meterage per minute','dist_per_min'],['meterage per min','dist_per_min'],
  ['distance per minute','dist_per_min'],['dist per min','dist_per_min'],['dist/min','dist_per_min'],
  ['metros por minuto','dist_per_min'],['metres par minute','dist_per_min'],
  ['metres per minute','dist_per_min'],['mts/min','dist_per_min'],['mts min','dist_per_min'],
  ['high speed running','dist_hir'],['high speed dist','dist_hir'],['high speed distance','dist_hir'],
  ['high speed','dist_hir'],['hsr','dist_hir'],['high intensity running','dist_hir'],
  ['alta intensidad','dist_hir'],['course haute intensite','dist_hir'],['haute intensite','dist_hir'],
  ['vel b4 tot dist','dist_v4'],['vel b4 tot','dist_v4'],['vel b4','dist_v4'],
  ['velocity band 4','dist_v4'],['v4 dist','dist_v4'],['banda 4','dist_v4'],['bande 4','dist_v4'],
  ['15-20','dist_v4'],['15 20','dist_v4'],
  ['vel b6 tot dist','dist_v5'],['vel b6 tot','dist_v5'],['vel b6','dist_v5'],
  ['vel b5 tot dist','dist_v5'],['vel b5 tot','dist_v5'],['vel b5','dist_v5'],
  ['velocity band 6','dist_v5'],['velocity band 5','dist_v5'],
  ['v6 dist','dist_v5'],['v5 dist','dist_v5'],
  ['sprint distance','dist_v5'],['sprint dist','dist_v5'],['distancia sprint','dist_v5'],
  ['distance sprint','dist_v5'],['dist sprint','dist_v5'],
  ['banda 6','dist_v5'],['banda 5','dist_v5'],['bande 6','dist_v5'],['bande 5','dist_v5'],
  ['20 25','dist_v5'],['20/25','dist_v5'],['20-25','dist_v5'],
  ['player load','player_load'],['playerload','player_load'],['carga jugador','player_load'],
  ['charge joueur','player_load'],['tot pl','player_load'],
  ['max velocity','max_velocity'],['max vel','max_velocity'],['top speed','max_velocity'],
  ['velocidad maxima','max_velocity'],['vitesse maximale','max_velocity'],['vel max','max_velocity'],
  ['vitesse max','max_velocity'],['vmax','max_velocity'],['velocidad max','max_velocity'],
  ['acc b2-3 tot effs','acc2'],['acc b2-3 tot','acc2'],['acc b2-3','acc2'],
  ['accelerations b2 3','acc2'],['accelerations b2','acc2'],['aceleraciones b2','acc2'],
  ['acc b2','acc2'],['acc2 eff','acc2'],['acc 2','acc2'],['accel b2','acc2'],
  ['nombre accelerations','acc2'],
  ['decel b2-3 tot effs','dec2'],['decel b2-3 tot','dec2'],['decel b2-3','dec2'],
  ['decelerations b2 3','dec2'],['decelerations b2','dec2'],['desaceleraciones b2','dec2'],
  ['dec b2','dec2'],['dec2 eff','dec2'],['dec 2','dec2'],['decel b2','dec2'],
  ['nombre decelerations','dec2'],
  ['acc b3','acc3'],['acc3 eff','acc3'],['acc 3','acc3'],['accel b3','acc3'],
  ['dec b3','dec3'],['dec3 eff','dec3'],['dec 3','dec3'],['decel b3','dec3'],
  ['number of sprints','n_sprints'],['number sprints','n_sprints'],['num sprints','n_sprints'],
  ['numero sprints','n_sprints'],['numero de sprints','n_sprints'],
  ['nombre sprints','n_sprints'],['nombre de sprints','n_sprints'],
  ['n sprints','n_sprints'],
  ['vel b1','dist_v1'],['velocity band 1','dist_v1'],['banda 1','dist_v1'],['bande 1','dist_v1'],
  ['vel b2','dist_v2'],['velocity band 2','dist_v2'],['banda 2','dist_v2'],['bande 2','dist_v2'],
  ['vel b3','dist_v3'],['velocity band 3','dist_v3'],['banda 3','dist_v3'],['bande 3','dist_v3'],
  ['metabolic power','metabolic_power'],['puissance metabolique','metabolic_power'],
  ['hr avg','hr_avg'],['fc moyenne','hr_avg'],['fc media','hr_avg'],['frecuencia cardiaca media','hr_avg'],
  ['hr max','hr_max'],['fc max','hr_max'],['frecuencia cardiaca max','hr_max'],
  ['total duration','duracion_min'],['total dur','duracion_min'],['tot dur','duracion_min'],
  ['duration','duracion_min'],['duree','duracion_min'],['duracion','duracion_min'],
  ['temps total','duracion_min'],['time played','duracion_min'],['playing time','duracion_min'],
  ['elapsed time','duracion_min'],['total time','duracion_min'],
]

function matchMetricCol(h: string): string | null {
  const hn = normStr(h)
  for (const [label, field] of METRIC_COL_MAP)
    if (hn.includes(normStr(label))) return field
  return null
}

function parseRawRows(raw: any[][]): Record<string, any>[] {
  if (raw.length < 2) return []
  const headers = (raw[0] as any[]).map(h => String(h ?? ''))
  const colMap: (string | null)[] = headers.map(h => {
    const ln = normStr(h)
    const isNameCol = ln === 'name' || ln === 'nombre' || ln === 'athlete' || ln === 'player' ||
      ln === 'jugador' || ln.includes('first name') || ln.includes('player name') || ln.includes('athlete name')
    if (isNameCol) return '__name__'
    if (['interval','time','date','fecha','session','period','device','jersey','shirt','position','pos'].some(k => ln === k || ln.startsWith(k + ' '))) return null
    return matchMetricCol(h)
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
      const nl = name.toLowerCase()
      const isAggregate = ['team', 'average', 'promedio', 'total', 'equipo', 'media',
        'squad', 'mean', 'promedio equipo', 'team average'].some(k => nl === k || nl.startsWith(k + ' ') || nl.endsWith(' ' + k))
      if (isAggregate) return null
      if (Object.keys(metricas).length === 0) return null
      return { nombre_catapult: name, nombre_norm: normalizeName(name), metricas }
    }).filter(Boolean) as any[]
}

function parseExcel(bytes: Uint8Array): Record<string, any>[] {
  const wb = XLSX.read(bytes, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][]
  return parseRawRows(raw)
}

function cleanCatapultName(raw: string): string {
  const parts = raw.trim().replace(/\.$/, '').split(/\s+/)
  const n = parts.length
  if (n < 2) return raw.trim()
  if (n === 2 && parts[0].toUpperCase() === parts[1].toUpperCase()) return parts[0]
  for (let split = 1; split < n; split++) {
    const first = parts.slice(0, split), rest = parts.slice(split)
    if (first.length < 1 || normStr(first.join(' ')).length < 2) continue
    if (first[0].length < 2) continue
    const fn = normStr(first.join(' ')), rn = normStr(rest.join(' '))
    if (fn === rn) return first.join(' ')
    if (rest.length === 1 && normStr(first[first.length - 1]) === normStr(rest[0])) return first.join(' ')
    if (rest.length > 0 && normStr(rest[0]) === normStr(first[0]) && fn.length >= 4) return first.join(' ')
  }
  return raw.trim().replace(/\.$/, '')
}

function parsePdfRowFormat(lines: string[]): Record<string, any>[] | null {
  const POS_CODES = ['CAM','CDM','LB','RB','LW','RW','WB','CB','CM','ST','FB','GK','CF','AM','DM','LM','RM','W']
  const posDetect = new RegExp(POS_CODES.join('|'))
  const FIELD_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_v5', null, 'n_sprints', 'dist_hir', 'acc2', 'dec2', 'acc3', 'dec3', 'player_load', 'duracion_min', 'max_velocity']
  const SUMMARY_WORDS = new Set(['total','moyenne','average','promedio','media','totale','totaux','totals'])
  const results: Record<string, any>[] = []
  const lonePosCodes = lines.filter(l => l.trim()).filter(l => POS_CODES.includes(l.trim()))
  const isFragmented = lonePosCodes.length >= 2
  let workingLines: string[]
  if (isFragmented) {
    const tokens: string[] = []
    for (const line of lines) {
      const t = line.trim(); if (!t || /^page\s+\d+/i.test(t) || /^\d{2}\/\d{2}\/\d{4}$/.test(t)) continue
      for (const tok of t.split(/\s+/)) tokens.push(tok)
    }
    const rows: string[] = []
    let i = 0
    while (i < tokens.length) {
      if (POS_CODES.includes(tokens[i]) && i + 1 < tokens.length && /^\d{3,5}$/.test(tokens[i + 1])) {
        const posIdx = i; let nameStart = posIdx - 1
        while (nameStart >= 0) {
          const tok = tokens[nameStart]; if (/^\d/.test(tok) || POS_CODES.includes(tok) || /^\(.*\)$/.test(tok)) break
          if (!/^[A-Za-zÀ-ÿ'-]+$/.test(tok)) break
          nameStart--
        }
        nameStart++; const nameParts = tokens.slice(nameStart, posIdx), pos = tokens[posIdx], dataParts: string[] = []
        let j = posIdx + 1
        while (j < tokens.length) {
          const tok = tokens[j]; if (POS_CODES.includes(tok) && j + 1 < tokens.length && /^\d{3,5}$/.test(tokens[j + 1])) break
          if (SUMMARY_WORDS.has(normStr(tok)) || (/^[A-Za-z]/.test(tok) && !POS_CODES.includes(tok))) break
          dataParts.push(tok); j++
        }
        if (nameParts.length > 0 && dataParts.length >= 6) rows.push([...nameParts, pos, ...dataParts].join(' '))
        i = j; continue
      }
      i++
    }
    workingLines = rows
  } else {
    const mergedLines: string[] = []
    for (let i = 0; i < lines.length; i++) {
      const cur = lines[i].trim(); if (cur.length <= 2 && /^[A-Z]$/.test(cur) && i + 1 < lines.length) { mergedLines.push(cur + ' ' + lines[i + 1].trim()); i++ } else mergedLines.push(cur)
    }
    workingLines = mergedLines
  }
  for (const line of workingLines) {
    if (!line.trim() || !posDetect.test(line)) continue
    const parts = line.trim().split(/\s+/); let posIdx = parts.findIndex(p => POS_CODES.includes(p)), name = '', rest = ''
    if (posIdx >= 0) { name = parts.slice(0, posIdx).join(' '); rest = parts.slice(posIdx + 1).join(' ') } else {
      const m = line.match(new RegExp(`^(.+?)(${POS_CODES.join('|')})(.+)$`)); if (!m) continue
      name = m[1].trim(); rest = m[3].trim()
    }
    if (!name || !rest || name.replace(/\s/g, '').length < 3 || SUMMARY_WORDS.has(normStr(name))) continue
    const spaceParts = rest.trim().split(/\s+/), metricas: Record<string, number> = {}
    if (spaceParts.length >= 8) {
      for (let i = 0; i < spaceParts.length && i < FIELD_MAP.length; i++) {
        const field = FIELD_MAP[i]; if (!field) continue
        if (/^\d{1,2}:\d{2}:\d{2}$/.test(spaceParts[i])) {
          const [h, m, s] = spaceParts[i].split(':').map(Number); metricas['duracion_min'] = Math.round((h * 60 + m + s / 60) * 10) / 10
          continue
        }
        const val = parseFloat(spaceParts[i].replace(',', '.')); if (!isNaN(val)) metricas[field] = val
      }
    } else {
      const durMatch = rest.match(/(\d{1,2}:\d{2}:\d{2})/); let restNoDur = rest
      if (durMatch) {
        const [hh, mm, ss] = durMatch[1].split(':').map(Number); metricas['duracion_min'] = Math.round((hh * 60 + mm + ss / 60) * 10) / 10
        restNoDur = rest.replace(durMatch[1], ' ').trim()
      }
      const nums = (restNoDur.match(/\d+(?:\.\d+)?/g) || []).map(n => parseFloat(n)); if (nums.length < 6) continue
      const maxVelCandidate = nums[nums.length - 1]; if (!isNaN(maxVelCandidate) && maxVelCandidate >= 15 && maxVelCandidate <= 45) metricas['max_velocity'] = maxVelCandidate
      const MERGED_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_v5', null, 'n_sprints', 'dist_hir', 'acc2', 'dec2', 'player_load']
      const dataNums = nums.slice(0, nums.length - 1)
      for (let i = 0; i < dataNums.length && i < MERGED_MAP.length; i++) {
        const field = MERGED_MAP[i]; if (field && !isNaN(dataNums[i])) metricas[field] = dataNums[i]
      }
    }
    if (Object.values(metricas).some(v => v > 0)) { const cleanName = cleanCatapultName(name); results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas }) }
  }
  return results.length > 0 ? results : null
}

const CUADRO_RESUMEN_COL_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc2', 'dec2', 'max_velocity']
function parsePdfCuadroResumen(lines: string[]): Record<string, any>[] | null {
  const SUMMARY_WORDS = new Set(['total','moyenne','average','promedio','media','totale','totaux','totals','max','maximo','máximo','min','minimo'])
  const results: Record<string, any>[] = []
  for (const line of lines) {
    const trimmed = line.trim(); if (!trimmed) continue
    const parts = trimmed.split(/\s+/); if (parts.length < 4) continue
    let dataStart = parts.length; while (dataStart > 0 && /^[\d.]+$/.test(parts[dataStart - 1])) dataStart--
    const numericParts = parts.slice(dataStart), nameParts = parts.slice(0, dataStart)
    if (numericParts.length < 3 || nameParts.length === 0) continue
    const firstNum = parseFloat(numericParts[0]); if (isNaN(firstNum) || firstNum < 500 || firstNum > 20000) continue
    const nameRaw = nameParts.join(' '), nameNorm2 = normStr(nameRaw)
    if (SUMMARY_WORDS.has(nameNorm2) || [...SUMMARY_WORDS].some(w => nameNorm2.startsWith(w)) || /^\d{2}\/\d{2}\/\d{4}$/.test(nameRaw.trim())) continue
    const metricas: Record<string, number> = {}
    for (let i = 0; i < numericParts.length && i < CUADRO_RESUMEN_COL_MAP.length; i++) {
      const field = CUADRO_RESUMEN_COL_MAP[i]; if (field) metricas[field] = parseFloat(numericParts[i])
    }
    if (Object.values(metricas).some(v => v > 0)) { const cleanName = cleanCatapultName(nameRaw); results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas }) }
  }
  return results.length >= 2 ? results : null
}

const BLOB_METRIC_RANGES: Record<string, [number, number]> = {
  dist_total: [500, 20000], dist_per_min: [20, 200], dist_v4: [0, 6000], dist_hir: [0, 3000], dist_v5: [0, 3000],
  n_sprints: [0, 60], acc2: [0, 120], dec2: [0, 120], acc3: [0, 60], dec3: [0, 60], max_velocity: [10, 50],
  player_load: [0, 2000], duracion_min: [1, 200],
}

function dpSegmentBlob(blob: string, ranges: Array<[number, number]>): number[] | null {
  const N = ranges.length, L = blob.length
  const dp: (number[] | null)[][] = Array.from({ length: N + 1 }, () => new Array(L + 1).fill(null))
  dp[0][0] = []
  for (let seg = 0; seg < N; seg++) {
    const [rMin, rMax] = ranges[seg]
    for (let pos = 0; pos <= L; pos++) {
      if (dp[seg][pos] === null) continue
      const prevPath = dp[seg][pos] as number[]
      const maxLen = Math.min(6, L - pos)
      for (let len = 1; len <= maxLen; len++) {
        if (len > 1 && blob[pos] === '0') continue
        const val = parseInt(blob.slice(pos, pos + len), 10)
        if (!isNaN(val) && val >= rMin && val <= rMax && dp[seg + 1][pos + len] === null) {
          dp[seg + 1][pos + len] = [...prevPath, val]
        }
      }
    }
  }
  return dp[N][L]
}

function parsePdfBlobColumnar(lines: string[]): Record<string, any>[] | null {
  const blobLines = lines.filter(l => /^\d{15,}$/.test(l.trim()))
  if (blobLines.length < 2) return null
  const SEPARATOR_WORDS = new Set(['promedio','moyenne','average','media','total','prom','avg','mean','totaux','totale','totals'])
  const names: string[] = []
  let blobSectionStart = -1
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim(); if (!s) continue
    if (/^\d{15,}$/.test(s)) { blobSectionStart = i; break }
    if (SEPARATOR_WORDS.has(normStr(s))) { blobSectionStart = i; break }
    if (!/PAGE \d+|\d{2}\/\d{2}/i.test(s)) names.push(s)
  }
  if (names.length === 0 || blobSectionStart === -1) return null
  const uniqueNames = names.map(n => cleanCatapultName(n)).filter(cn => cn.length >= 2)
  const metricBlobs: { label: string, blob: string }[] = []
  let currentLabel = ''
  for (let i = blobSectionStart; i < lines.length; i++) {
    const s = lines[i].trim(); if (!s || /\d{2}\/\d{2}|page/i.test(s)) continue
    if (/^\d{15,}$/.test(s)) { metricBlobs.push({ label: currentLabel, blob: s }); currentLabel = '' }
    else { currentLabel = (currentLabel + ' ' + s).trim() }
  }
  const results = uniqueNames.map(name => ({ nombre_catapult: name, nombre_norm: normalizeName(name), metricas: {} as Record<string, number> }))
  for (let bi = 0; bi < metricBlobs.length; bi++) {
    const { label, blob } = metricBlobs[bi], field = matchMetricCol(label); if (!field) continue
    const range = BLOB_METRIC_RANGES[field]
    for (const n of [uniqueNames.length, uniqueNames.length + 2, uniqueNames.length + 1]) {
      const segmented = dpSegmentBlob(blob, Array.from({ length: n }, () => range))
      if (segmented) {
        for (let pi = 0; pi < uniqueNames.length; pi++) results[pi].metricas[field] = segmented[pi]
        break
      }
    }
  }
  return results.filter(r => Object.values(r.metricas).some(v => v > 0))
}

// ─── PARSER PARA PDFs DE TEXTO (pdf.js) ───
function parsePdfFromText(rawText: string): Record<string, any>[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  let results = parsePdfRowFormat(lines) || parsePdfCuadroResumen(lines) || parsePdfBlobColumnar(lines)
  if (results) return results

  // Fallback para líneas sueltas o mal formateadas
  const rows: Record<string, any>[] = []; let lastNameFound: string | null = null
  for (const line of lines) {
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line) && !/\d{4,}/.test(line.replace(/\//g,''))) continue
    const parts = line.split(/\s+/); let dataStart = parts.length
    while (dataStart > 0 && /^[\d,.]+$/.test(parts[dataStart - 1])) dataStart--
    const numericParts = parts.slice(dataStart), nameFromLine = parts.slice(0, dataStart).join(' ').trim()
    if (numericParts.length >= 3) {
      const metricas: Record<string, number> = {}
      const colOrder = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc2', 'dec2', 'max_velocity']
      for (let i = 0; i < numericParts.length && i < colOrder.length; i++) {
        const val = parseFloat(numericParts[i].replace(',', '.')); if (!isNaN(val)) metricas[colOrder[i]] = val
      }
      const finalName = nameFromLine || lastNameFound
      if (finalName) {
        const cleanName = cleanCatapultName(finalName), sn = normStr(cleanName)
        if (!['promedio', 'max', 'average', 'total', 'media'].includes(sn) && !sn.match(/\d/))
          rows.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
      }
      lastNameFound = null
    } else if (nameFromLine.length > 2 && !nameFromLine.match(/\d/)) lastNameFound = nameFromLine
  }
  return rows
}

async function parsePdf(bytes: Uint8Array): Promise<Record<string, any>[]> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(Buffer.from(bytes))
  const lines = data.text.split('\n').map((l: string) => l.trim()).filter(Boolean)
  return parsePdfRowFormat(lines) || parsePdfBlobColumnar(lines) || parsePdfFromText(data.text)
}

// ─── PLAYER MATCHING ──────────────────────────────────────────────────────────
async function matchPlayers(rows: Record<string,any>[], clubId: number|null) {
  const sql = getDb()
  const jugadores = clubId ? await sql`SELECT j.id, u.nombre FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true` : []
  const matched: any[] = [], unmatched: string[] = []
  for (const row of rows) {
    const pdfNorm = row.nombre_norm
    let jug = (jugadores as any[]).find(j => {
      const dbNorm = normalizeName(j.nombre), dbWords = dbNorm.split(' '), pdfWords = pdfNorm.split(' ')
      return dbNorm === pdfNorm || pdfWords.some(pw => dbWords.includes(pw) && pw.length >= 3) || dbNorm.includes(pdfNorm) || pdfNorm.includes(dbNorm)
    })
    if (jug) matched.push({ ...row, jugador_id: jug.id, jugador_nombre: jug.nombre, match_method: 'parcial', n_metricas: Object.keys(row.metricas||{}).length, sin_datos: false })
    else unmatched.push(row.nombre_catapult)
  }
  return { matched, unmatched }
}

// ─── POST ROUTE ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req); if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const body = await req.json(), { fecha, tipo_sesion, sesion_id, confirm, pdfText, rows } = body
    if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 })
    let parsedRows = (rows && Array.isArray(rows)) ? rows : (pdfText ? parsePdfFromText(pdfText) : [])
    if (!parsedRows.length) return NextResponse.json({ error: 'No se encontraron datos.' }, { status: 400 })
    const { matched, unmatched } = await matchPlayers(parsedRows, s.clubId || null)
    if (!confirm) return NextResponse.json({ preview: true, fecha, tipo_sesion, sesion_id, fuente: pdfText ? 'pdf' : 'excel', matched, unmatched, total_filas: parsedRows.length, columnas_detectadas: Object.keys(parsedRows[0]?.metricas||{}) })
    const sql = getDb(), clubId = s.clubId ? Number(s.clubId) : null
    if (clubId) await sql`DELETE FROM gps_logs WHERE club_id = ${clubId} AND fecha = ${fecha}::date AND tipo_sesion = ${tipo_sesion}`
    for (const m of matched) {
      const met = m.metricas || {}
      await sql`INSERT INTO gps_logs (jugador_id, club_id, fecha, sesion_id, tipo_sesion, dist_total, dist_hir, dist_v4, dist_v5, player_load, max_velocity, acc2, dec2, dist_per_min, n_sprints, metricas, fuente)
                VALUES (${m.jugador_id}, ${clubId}, ${fecha}, ${sesion_id}, ${tipo_sesion}, ${met.dist_total||0}, ${met.dist_hir||0}, ${met.dist_v4||0}, ${met.dist_v5||0}, ${met.player_load||0}, ${met.max_velocity||0}, ${met.acc2||0}, ${met.dec2||0}, ${met.dist_per_min||0}, ${met.n_sprints||0}, ${JSON.stringify(met)}, ${pdfText?'pdf':'excel'})`
    }
    return NextResponse.json({ ok: true, saved: matched.length, unmatched })
  } catch (err) { console.error(err); return NextResponse.json({ error: String(err) }, { status: 500 }) }
}