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
  // DISTANCIA TOTAL
  ['total distance','dist_total'],['total dist','dist_total'],['tot dist','dist_total'],
  ['distance','dist_total'],['distancia','dist_total'],['dist totale','dist_total'],
  ['distancia total','dist_total'],['distance totale','dist_total'],
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
  // ACEL / DECEL
  // NOMENCLATURA DEL CLUB: "ACE >3" = Acc B2-3 (Gen 2) de Catapult → se guarda como acc3
  // "DEC >3" = Decel B2-3 (Gen 2) de Catapult → se guarda como dec3
  ['acc b2-3 tot effs','acc3'],['acc b2-3 tot','acc3'],['acc b2-3','acc3'],
  ['accelerations b2 3','acc3'],['accelerations b2','acc3'],['aceleraciones b2','acc3'],
  ['acc b2','acc3'],['acc2 eff','acc3'],['acc 2','acc3'],['accel b2','acc3'],['acc 80 2','acc3'],
  ['aceleraciones','acc3'],['accelerations','acc3'], // Ubico
  ['decel b2-3 tot effs','dec3'],['decel b2-3 tot','dec3'],['decel b2-3','dec3'],
  ['decelerations b2 3','dec3'],['decelerations b2','dec3'],['desaceleraciones b2','dec3'],
  ['dec b2','dec3'],['dec2 eff','dec3'],['dec 2','dec3'],['decel b2','dec3'],['dec 80 2','dec3'],
  ['desaceleraciones','dec3'],['decelerations','dec3'], // Ubico
  // ACEL / DECEL B3 (banda superior, si existiera en algún export)
  ['acc b3 tot effs','acc2'],['acc b3 tot','acc2'],['acc b3','acc2'],
  ['accelerations b3','acc2'],['aceleraciones b3','acc2'],
  ['acc3 eff','acc2'],['acc 3','acc2'],['accel b3','acc2'],
  ['ima acceleration b3','acc2'],['ima acc b3','acc2'],
  ['high accelerations','acc2'],['high intensity accelerations','acc2'],
  ['explosive accelerations','acc2'],['explosive acc','acc2'],
  ['decel b3 tot effs','dec2'],['decel b3 tot','dec2'],['decel b3','dec2'],
  ['decelerations b3','dec2'],['desaceleraciones b3','dec2'],
  ['dec3 eff','dec2'],['dec 3','dec2'],['decel b3','dec2'],
  ['ima deceleration b3','dec2'],['ima dec b3','dec2'],
  ['high decelerations','dec2'],['high intensity decelerations','dec2'],
  ['explosive decelerations','dec2'],['explosive dec','dec2'],
  // PLAYER LOAD / VEL MAX
  ['player load','player_load'],['playerload','player_load'],['carga jugador','player_load'],
  ['max velocity','max_velocity'],['max vel','max_velocity'],['top speed','max_velocity'],
  ['velocidad maxima','max_velocity'],['vitesse maximale','max_velocity'],['vel max','max_velocity'],
  // DURACION
  ['total duration','duracion_min'],['total dur','duracion_min'],['tot dur','duracion_min'],
  ['duration','duracion_min'],['duracion','duracion_min'],['time','duracion_min'],['tiempo','duracion_min'],
  ['tiempo min','duracion_min'],['tiempo (min)','duracion_min'],['minutos','duracion_min'],
  ['numero sprint','n_sprints'],['número sprint','n_sprints'],['numero de sprint','n_sprints'],
]

function matchMetricCol(h: string): string | null {
  const hn = normStr(h)
  
  // 1. Match Exacto (Prioridad Máxima): Atrapa "Tot Dist" sin confundirse.
  for (const [label, field] of METRIC_COL_MAP) {
    if (hn === normStr(label)) return field
  }
  
  // 2. Match Parcial Seguro
  for (const [label, field] of METRIC_COL_MAP) {
    if (hn.includes(normStr(label))) {
      // BLOQUEO UBICO: Si la columna es "distance_vrangeX", ignorarla para que NO sobreescriba la Distancia Total.
      if (field === 'dist_total' && (hn.includes('vrange') || hn.includes('zone'))) continue
      
      // BLOQUEO UBICO: Evitar que "max_acc" pise el contador de aceleraciones normales.
      if ((field === 'acc2' || field === 'acc3' || field === 'dec2' || field === 'dec3') && hn.includes('max') && !hn.includes('b3') && !hn.includes('b2')) continue
      
      return field
    }
  }
  return null
}

const matchExcelCol = matchMetricCol

// ─── MOTOR EXCEL INTELIGENTE (UBICO/CATAPULT/WIMU) ───────────────
function parseRawRows(raw: any[][]): Record<string, any>[] {
  if (raw.length < 2) return []
  const headers = (raw[0] as any[]).map(h => String(h ?? ''))
  
  const colMap: (string | null)[] = headers.map(h => {
    const ln = normStr(h)
    const isNameCol = ln === 'name' || ln === 'nombre' || ln === 'athlete' || ln === 'player' ||
      ln === 'jugador' || ln.includes('first name') || ln.includes('player name') || ln.includes('athlete name') || ln === 'jugadores' || ln === 'nombre y apellido' || ln === 'nombre apellido'
    if (isNameCol) return '__name__'
    if (['interval','time','date','fecha','session','period','device','jersey','shirt','position','pos', 'split'].some(k => ln === k || ln.startsWith(k + ' '))) return null
    return matchExcelCol(h)
  })

  const playerRows: Record<string, any> = {}

  raw.slice(1).forEach(row => {
    if (!row.some((c: any) => c !== null && c !== '')) return
    
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

      let cleanNumStr = String(cell).replace(/\s/g, '').replace(/;/g, '')
      if (/\d+\.\d+,\d+/.test(cleanNumStr)) {
        cleanNumStr = cleanNumStr.replace(/\./g, '').replace(',', '.')
      } else {
        cleanNumStr = cleanNumStr.replace(',', '.')
      }

      const n = parseFloat(cleanNumStr)
      if (!isNaN(n)) metricas[f] = n
    })

    if (!name) return
    const nl = name.toLowerCase()
    const isAggregate = ['team', 'average', 'promedio', 'total', 'equipo', 'media',
      'squad', 'mean', 'promedio equipo', 'team average'].some(k => nl === k || nl.startsWith(k + ' ') || nl.endsWith(' ' + k))
    if (isAggregate) return
    if (Object.keys(metricas).length === 0) return

    const finalNameNorm = normalizeName(name)
    const distTotalActual = metricas.dist_total || 0
    
    if (!playerRows[finalNameNorm] || distTotalActual > (playerRows[finalNameNorm].metricas.dist_total || 0)) {
      playerRows[finalNameNorm] = { 
        nombre_catapult: cleanCatapultName(name), 
        nombre_norm: finalNameNorm, 
        metricas 
      }
    }
  })

  return Object.values(playerRows)
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
  const FIELD_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_v5', null, 'n_sprints', 'dist_hir', 'acc3', 'dec3', 'acc2', 'dec2', 'player_load', 'duracion_min', 'max_velocity']
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
          const tok = tokens[nameStart]; if (/^\d/.test(tok) || POS_CODES.includes(tok)) break
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
      const MERGED_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_v5', null, 'n_sprints', 'dist_hir', 'acc3', 'dec3', 'player_load']
      const dataNums = nums.slice(0, nums.length - 1)
      for (let i = 0; i < dataNums.length && i < MERGED_MAP.length; i++) {
        const field = MERGED_MAP[i]; if (field && !isNaN(dataNums[i])) metricas[field] = dataNums[i]
      }
    }
    if (Object.values(metricas).some(v => v > 0)) { const cleanName = cleanCatapultName(name); results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas }) }
  }
  return results.length > 0 ? results : null
}

const CUADRO_RESUMEN_COL_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc3', 'dec3', 'max_velocity']
function parsePdfCuadroResumen(lines: string[]): Record<string, any>[] | null {
  const SUMMARY_WORDS = new Set(['total','moyenne','average','promedio','media','totale','totaux','totals','max','maximo','máximo','min','minimo'])
  const results: Record<string, any>[] = []
  for (const line of lines) {
    const trimmed = line.trim(); if (!trimmed) continue
    if (/page \d+ of|cuadro resumen|catapult/i.test(trimmed)) continue
    
    const parts = trimmed.split(/\s+/); if (parts.length < 4) continue
    let dataStart = parts.length; while (dataStart > 0 && /^[\d.,]+$/.test(parts[dataStart - 1])) dataStart--
    const numericParts = parts.slice(dataStart), nameParts = parts.slice(0, dataStart)
    if (numericParts.length < 3 || nameParts.length === 0) continue
    const firstNum = parseFloat(numericParts[0].replace(',', '.')); if (isNaN(firstNum) || firstNum < 500 || firstNum > 20000) continue
    
    let nameRaw = nameParts.join(' ').trim()
    nameRaw = nameRaw.replace(/^[\d\/\-]+\s*/, '').trim() 
    if (nameRaw.length < 2) continue

    const nameNorm2 = normStr(nameRaw)
    if (SUMMARY_WORDS.has(nameNorm2) || [...SUMMARY_WORDS].some(w => nameNorm2.startsWith(w)) || /^\d{2}\/\d{2}\/\d{4}$/.test(nameRaw)) continue
    
    const metricas: Record<string, number> = {}
    for (let i = 0; i < numericParts.length && i < CUADRO_RESUMEN_COL_MAP.length; i++) {
      const field = CUADRO_RESUMEN_COL_MAP[i]; if (field) metricas[field] = parseFloat(numericParts[i].replace(',', '.'))
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
      for (let len = 1; len <= Math.min(6, L - pos); len++) {
        if (len > 1 && blob[pos] === '0') continue
        const val = parseInt(blob.slice(pos, pos + len), 10)
        if (!isNaN(val) && val >= rMin && val <= rMax && dp[seg + 1][pos + len] === null)
          dp[seg + 1][pos + len] = [...prevPath, val]
      }
    }
  }
  return dp[N][L]
}

function parsePdfBlobColumnar(lines: string[]): Record<string, any>[] | null {
  const blobLines = lines.filter(l => /^\d{15,}$/.test(l.trim()))
  if (blobLines.length < 2) return null
  const SEPARATOR_WORDS = new Set(['promedio','moyenne','average','media','total','prom','avg','mean','totaux','totale','totals'])
  const names: string[] = []; let blobStart = -1
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim(); if (!s) continue
    if (/^\d{15,}$/.test(s) || SEPARATOR_WORDS.has(normStr(s))) { blobStart = i; break }
    if (!/PAGE \d+|\d{2}\/\d{2}/i.test(s)) names.push(s)
  }
  if (names.length === 0 || blobStart === -1) return null
  const uniqueNames = names.map(n => cleanCatapultName(n)).filter(cn => cn.length >= 2)
  const metricBlobs: { label: string, blob: string }[] = []
  let currentLabel = ''
  for (let i = blobStart; i < lines.length; i++) {
    const s = lines[i].trim(); if (!s || /\d{2}\/\d{2}|page/i.test(s)) continue
    if (/^\d{15,}$/.test(s)) { metricBlobs.push({ label: currentLabel, blob: s }); currentLabel = '' }
    else currentLabel = (currentLabel + ' ' + s).trim()
  }
  const results = uniqueNames.map(name => ({ nombre_catapult: name, nombre_norm: normalizeName(name), metricas: {} as Record<string, number> }))
  for (let bi = 0; bi < metricBlobs.length; bi++) {
    const { label, blob } = metricBlobs[bi], field = matchMetricCol(label); if (!field) continue
    const range = BLOB_METRIC_RANGES[field]
    for (const n of [uniqueNames.length, uniqueNames.length + 2, uniqueNames.length + 1]) {
      const segmented = dpSegmentBlob(blob, Array.from({ length: n }, () => range))
      if (segmented) { for (let pi = 0; pi < uniqueNames.length; pi++) results[pi].metricas[field] = segmented[pi]; break }
    }
  }
  return results.filter(r => Object.values(r.metricas).some(v => v > 0))
}

function parsePdfFromText(lines: string[]): Record<string, any>[] {
  const results: Record<string, any>[] = []
  let lastNameFound: string | null = null
  let pendingMetrics: Record<string, number> | null = null

  const isGarbageHeader = (s: string) => {
    const n = normStr(s)
    const exactMatch = ['promedio', 'max', 'average', 'total', 'media', 'min'].includes(n)
    const garbageWords = ['minute', 'meterage', 'sprints', 'effs', 'gen 2', 'velocidad', 'velocity', 'high speed', 'tot dist', 'cuadro', 'resumen', 'catapult', 'estadisticas', 'page', 'vs', 'temporada', 'jornada']
    const containsGarbageWord = garbageWords.some(w => new RegExp(`\\b${normStr(w)}\\b`).test(n))
    return exactMatch || containsGarbageWord
  }

  for (const line of lines) {
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(line)) continue
    
    const parts = line.split(/\s+/)
    let dataStart = parts.length
    while (dataStart > 0 && /^[\d,.]+$/.test(parts[dataStart - 1])) dataStart--
    
    const numericParts = parts.slice(dataStart)
    let nameFromLine = parts.slice(0, dataStart).join(' ').trim()
    
    nameFromLine = nameFromLine.replace(/^[\d\/\-]+\s*/, '').trim()
    nameFromLine = nameFromLine.replace(/^(PAGE|page)\s*\d+\s*(OF|of)\s*\d*\s*/i, '').trim()

    if (numericParts.length >= 3) {
      const metricas: Record<string, number> = {}
      const colOrder = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc3', 'dec3', 'max_velocity']
      
      for (let i = 0; i < numericParts.length && i < colOrder.length; i++) {
        const val = parseFloat(numericParts[i].replace(',', '.'))
        if (!isNaN(val)) metricas[colOrder[i]] = val
      }
      
      const finalName = nameFromLine || lastNameFound
      
      if (finalName && /[a-zA-Z]/.test(finalName)) {
        if (!isGarbageHeader(finalName)) {
          const cleanName = cleanCatapultName(finalName)
          results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
          pendingMetrics = null
        } else {
          pendingMetrics = null
        }
      } else {
        pendingMetrics = metricas
      }
      lastNameFound = null
    } else if (nameFromLine.length > 2 && /[a-zA-Z]/.test(nameFromLine)) {
      if (!isGarbageHeader(nameFromLine)) {
        if (pendingMetrics) {
          const cleanName = cleanCatapultName(nameFromLine)
          results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas: pendingMetrics })
          pendingMetrics = null
        } else {
          lastNameFound = nameFromLine
        }
      } else {
        lastNameFound = null 
      }
    }
  }
  return results
}

function parsePdfAllMethods(rawText: string): Record<string, any>[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  
  const resText = parsePdfFromText(lines)
  const resRow = parsePdfRowFormat(lines) || []
  const resCuadro = parsePdfCuadroResumen(lines) || []
  const resBlob = parsePdfBlobColumnar(lines) || []

  const options = [resText, resRow, resCuadro, resBlob].filter(arr => arr && arr.length > 0)
  
  if (options.length === 0) return []

  options.sort((a, b) => b.length - a.length)
  const bestResult = options[0]

  const uniquePlayers: Record<string, any>[] = []
  const seenNames = new Set<string>()
  for (const row of bestResult) {
    if (!seenNames.has(row.nombre_norm)) {
      seenNames.add(row.nombre_norm)
      uniquePlayers.push(row)
    }
  }
  
  return uniquePlayers
}

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

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req); 
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    
    const body = await req.json()
    const { fecha, tipo_sesion, sesion_id, confirm, pdfText, rows } = body
    if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 })
    
    // Llamada al Motor Maestro de PDF o al Nuevo Motor Excel de UBICO/CATAPULT
    let parsedRows = (rows && Array.isArray(rows)) ? parseRawRows(rows) : (pdfText ? parsePdfAllMethods(pdfText) : [])
    
    if (!parsedRows.length) return NextResponse.json({ error: 'No se encontraron datos.' }, { status: 400 })
    
    const { matched, unmatched } = await matchPlayers(parsedRows, s.clubId || null)
    if (!confirm) return NextResponse.json({ preview: true, fecha, tipo_sesion, sesion_id, fuente: pdfText ? 'pdf' : 'excel', matched, unmatched, total_filas: parsedRows.length, columnas_detectadas: Object.keys(parsedRows[0]?.metricas||{}) })
    
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null
    
    if (clubId) {
      await sql`DELETE FROM gps_logs WHERE club_id = ${clubId} AND fecha = ${fecha}::date AND sesion_id = ${sesion_id}`
      
      for (const m of matched) {
        const met = m.metricas || {}
        await sql`INSERT INTO gps_logs (jugador_id, club_id, fecha, sesion_id, tipo_sesion, dist_total, dist_hir, dist_v4, dist_v5, player_load, max_velocity, acc2, dec2, acc3, dec3, dist_per_min, n_sprints, metricas, fuente)
                  VALUES (${m.jugador_id}, ${clubId}, ${fecha}, ${sesion_id}, ${tipo_sesion}, ${met.dist_total||0}, ${met.dist_hir||0}, ${met.dist_v4||0}, ${met.dist_v5||0}, ${met.player_load||0}, ${met.max_velocity||0}, ${met.acc2||0}, ${met.dec2||0}, ${met.acc3||0}, ${met.dec3||0}, ${met.dist_per_min||0}, ${met.n_sprints||0}, ${JSON.stringify(met)}, ${pdfText?'pdf':'excel'})`
      }
    }
    return NextResponse.json({ ok: true, saved: matched.length, unmatched })
  } catch (err) { 
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 }) 
  }
}
