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
  ['m/min','dist_per_min'], 
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
  ['banda 6','dist_v5'],['banda 5','dist_v5'],['>20','dist_v5'],['> 20','dist_v5'], 
  ['number of sprints','n_sprints'],['number sprints','n_sprints'],['num sprints','n_sprints'],
  ['numero sprints','n_sprints'],['numero de sprints','n_sprints'],['sprints','n_sprints'],
  // ACEL / DECEL (Incluye nombres específicos de UBICO)
  ['ace 2-3 (n)', 'acc2'], ['ace 2 3 n', 'acc2'], ['acc b2-3 tot effs','acc2'], 
  ['acc b2-3 tot','acc2'], ['acc b2-3','acc2'], ['aceleraciones','acc2'], ['accelerations','acc2'],
  ['dec 2-3 (n)', 'dec2'], ['dec 2 3 n', 'dec2'], ['decel b2-3 tot effs','dec2'], 
  ['decel b2-3 tot','dec2'], ['decel b2-3','dec2'], ['desaceleraciones','dec2'], ['decelerations','dec2'],
  // PLAYER LOAD / VEL MAX
  ['player load','player_load'],['playerload','player_load'],['carga jugador','player_load'],
  ['max velocity','max_velocity'],['max vel','max_velocity'],['top speed','max_velocity'],
  ['velocidad maxima','max_velocity'],['vitesse maximale','max_velocity'],['vel max','max_velocity'],
  // DURACION
  ['total duration','duracion_min'],['total dur','duracion_min'],['tot dur','duracion_min'],
  ['duration','duracion_min'],['duracion','duracion_min'],['time','duracion_min'],['tiempo','duracion_min']
]

function matchMetricCol(h: string): string | null {
  const hn = normStr(h)
  // 1. Match Exacto (Atrapa "Tot Dist" sin confundirse con rangos)
  for (const [label, field] of METRIC_COL_MAP) {
    if (hn === normStr(label)) return field
  }
  // 2. Match Parcial Seguro
  for (const [label, field] of METRIC_COL_MAP) {
    if (hn.includes(normStr(label))) {
      // Bloqueo de zonas de velocidad de Ubico para que NO pisen la Distancia Total
      if (field === 'dist_total' && (hn.includes('vrange') || hn.includes('zone'))) continue
      // Evitar que promedios o máximos pisen las aceleraciones
      if ((field === 'acc2' || field === 'dec2') && (hn.includes('max') || hn.includes('avg'))) continue
      return field
    }
  }
  return null
}

const matchExcelCol = matchMetricCol

// ─── MOTOR EXCEL INTELIGENTE (Agrupa por jugador y elige el total) ───────────
function parseRawRows(raw: any[][]): Record<string, any>[] {
  if (raw.length < 2) return []
  const headers = (raw[0] as any[]).map(h => String(h ?? ''))
  const colMap: (string | null)[] = headers.map(h => {
    const ln = normStr(h)
    const isNameCol = ln === 'name' || ln === 'nombre' || ln === 'athlete' || ln === 'player' ||
      ln === 'jugador' || ln.includes('first name') || ln.includes('player name') || ln === 'jugadores'
    if (isNameCol) return '__name__'
    if (['interval','time','date','fecha','session','period','device','jersey','shirt','position','pos','split','task'].some(k => ln === k || ln.startsWith(k + ' '))) return null
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
      
      if (f === 'duracion_min' && String(cell).includes(':')) {
        const durMatch = String(cell).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
        if (durMatch) {
          const h = durMatch[3] ? parseInt(durMatch[1]) : 0
          const m = durMatch[3] ? parseInt(durMatch[2]) : parseInt(durMatch[1])
          const s = durMatch[3] ? parseInt(durMatch[3]) : parseInt(durMatch[2])
          metricas[f] = Math.round((h * 60 + m + s / 60) * 10) / 10
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
    if (['team','average','promedio','total','equipo','media','squad','mean'].some(k => nl === k || nl.startsWith(k + ' '))) return

    const finalNameNorm = normalizeName(name)
    const distTotalActual = metricas.dist_total || 0
    
    // Si el jugador ya existe (ej. leyó una tarea), se queda con la fila que tenga MÁS distancia (el Total)
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
  if (parts.length < 2) return raw.trim()
  if (parts.length === 2 && parts[0].toUpperCase() === parts[1].toUpperCase()) return parts[0]
  return raw.trim().replace(/\.$/, '')
}

// ─── MOTORES DE PDF (Blindaje Catapult/Enoch) ──────────────────────────────
function parsePdfRowFormat(lines: string[]): Record<string, any>[] | null {
  const POS_CODES = ['CAM','CDM','LB','RB','LW','RW','WB','CB','CM','ST','FB','GK','CF','AM','DM','LM','RM','W']
  const posDetect = new RegExp(POS_CODES.join('|'))
  const FIELD_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_v5', null, 'n_sprints', 'dist_hir', 'acc2', 'dec2', 'acc3', 'dec3', 'player_load', 'duracion_min', 'max_velocity']
  const results: Record<string, any>[] = []
  for (const line of lines) {
    if (!line.trim() || !posDetect.test(line)) continue
    const parts = line.trim().split(/\s+/); let posIdx = parts.findIndex(p => POS_CODES.includes(p)), name = '', rest = ''
    if (posIdx >= 0) { name = parts.slice(0, posIdx).join(' '); rest = parts.slice(posIdx + 1).join(' ') } else continue
    if (!name || !rest || name.length < 3) continue
    const spaceParts = rest.trim().split(/\s+/), metricas: Record<string, number> = {}
    for (let i = 0; i < spaceParts.length && i < FIELD_MAP.length; i++) {
      const field = FIELD_MAP[i]; if (!field) continue
      const val = parseFloat(spaceParts[i].replace(',', '.')); if (!isNaN(val)) metricas[field] = val
    }
    if (Object.values(metricas).some(v => v > 0)) { const cleanName = cleanCatapultName(name); results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas }) }
  }
  return results.length > 0 ? results : null
}

function parsePdfCuadroResumen(lines: string[]): Record<string, any>[] | null {
  const CUADRO_RES_MAP = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc2', 'dec2', 'max_velocity']
  const results: Record<string, any>[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || /page \d+ of|cuadro resumen|catapult/i.test(trimmed)) continue
    const parts = trimmed.split(/\s+/); if (parts.length < 4) continue
    let dataStart = parts.length; while (dataStart > 0 && /^[\d.,]+$/.test(parts[dataStart - 1])) dataStart--
    const numericParts = parts.slice(dataStart), nameParts = parts.slice(0, dataStart)
    if (numericParts.length < 3 || nameParts.length === 0) continue
    const firstNum = parseFloat(numericParts[0].replace(',', '.')); if (isNaN(firstNum) || firstNum < 500) continue
    let nameRaw = nameParts.join(' ').trim().replace(/^[\d\/\-]+\s*/, '').trim()
    if (nameRaw.length < 2) continue
    const metricas: Record<string, number> = {}
    for (let i = 0; i < numericParts.length && i < CUADRO_RES_MAP.length; i++) {
      const field = CUADRO_RES_MAP[i]; if (field) metricas[field] = parseFloat(numericParts[i].replace(',', '.'))
    }
    if (Object.values(metricas).some(v => v > 0)) { results.push({ nombre_catapult: cleanCatapultName(nameRaw), nombre_norm: normalizeName(nameRaw), metricas }) }
  }
  return results.length >= 2 ? results : null
}

function parsePdfFromText(lines: string[]): Record<string, any>[] {
  const results: Record<string, any>[] = []
  let lastNameFound: string | null = null
  let pendingMetrics: Record<string, number> | null = null
  const isGarbage = (s: string) => {
    const n = normStr(s)
    return ['promedio','max','total','media','minute','meterage','sprints','effs','velocidad','catapult','cuadro','resumen','page','vs','jornada'].some(w => n.includes(w))
  }
  for (const line of lines) {
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(line)) continue
    const parts = line.split(/\s+/); let dataStart = parts.length
    while (dataStart > 0 && /^[\d,.]+$/.test(parts[dataStart - 1])) dataStart--
    const numericParts = parts.slice(dataStart)
    let nameFromLine = parts.slice(0, dataStart).join(' ').trim().replace(/^[\d\/\-]+\s*/, '').replace(/^(PAGE|page)\s*\d+\s*(OF|of)\s*\d*\s*/i, '').trim()
    if (numericParts.length >= 3) {
      const metricas: Record<string, number> = {}
      const colOrder = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc2', 'dec2', 'max_velocity']
      for (let i = 0; i < numericParts.length && i < colOrder.length; i++) {
        const val = parseFloat(numericParts[i].replace(',', '.')); if (!isNaN(val)) metricas[colOrder[i]] = val
      }
      const finalName = nameFromLine || lastNameFound
      if (finalName && /[a-zA-Z]/.test(finalName) && !isGarbage(finalName)) {
        results.push({ nombre_catapult: cleanCatapultName(finalName), nombre_norm: normalizeName(finalName), metricas })
        pendingMetrics = null
      } else { pendingMetrics = metricas }
      lastNameFound = null
    } else if (nameFromLine.length > 2 && /[a-zA-Z]/.test(nameFromLine) && !isGarbage(nameFromLine)) {
      if (pendingMetrics) {
        results.push({ nombre_catapult: cleanCatapultName(nameFromLine), nombre_norm: normalizeName(nameFromLine), metricas: pendingMetrics })
        pendingMetrics = null
      } else { lastNameFound = nameFromLine }
    }
  }
  return results
}

function parsePdfAllMethods(rawText: string): Record<string, any>[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const resText = parsePdfFromText(lines), resRow = parsePdfRowFormat(lines) || [], resCuadro = parsePdfCuadroResumen(lines) || []
  const options = [resText, resRow, resCuadro].filter(arr => arr && arr.length > 0).sort((a, b) => b.length - a.length)
  if (options.length === 0) return []
  const uniquePlayers: Record<string, any>[] = [], seenNames = new Set<string>()
  for (const row of options[0]) {
    if (!seenNames.has(row.nombre_norm)) { seenNames.add(row.nombre_norm); uniquePlayers.push(row) }
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
      const dbNorm = normalizeName(j.nombre); return dbNorm === pdfNorm || dbNorm.includes(pdfNorm) || pdfNorm.includes(dbNorm)
    })
    if (jug) matched.push({ ...row, jugador_id: jug.id, jugador_nombre: jug.nombre, match_method: 'parcial', n_metricas: Object.keys(row.metricas||{}).length, sin_datos: false })
    else unmatched.push(row.nombre_catapult)
  }
  return { matched, unmatched }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req); if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const body = await req.json(), { fecha, tipo_sesion, sesion_id, confirm, pdfText, rows } = body
    if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 })
    
    let parsedRows = (rows && Array.isArray(rows)) ? parseRawRows(rows) : (pdfText ? parsePdfAllMethods(pdfText) : [])
    if (!parsedRows.length) return NextResponse.json({ error: 'No se encontraron datos.' }, { status: 400 })
    
    const { matched, unmatched } = await matchPlayers(parsedRows, s.clubId || null)
    if (!confirm) return NextResponse.json({ preview: true, fecha, tipo_sesion, sesion_id, fuente: pdfText ? 'pdf' : 'excel', matched, unmatched, total_filas: parsedRows.length, columnas_detectadas: Object.keys(parsedRows[0]?.metricas||{}) })
    
    const sql = getDb(), clubId = s.clubId ? Number(s.clubId) : null
    if (clubId) {
      await sql`DELETE FROM gps_logs WHERE club_id = ${clubId} AND fecha = ${fecha}::date AND sesion_id = ${sesion_id}`
      for (const m of matched) {
        const met = m.metricas || {}
        await sql`INSERT INTO gps_logs (jugador_id, club_id, fecha, sesion_id, tipo_sesion, dist_total, dist_hir, dist_v4, dist_v5, player_load, max_velocity, acc2, dec2, dist_per_min, n_sprints, metricas, fuente)
                  VALUES (${m.jugador_id}, ${clubId}, ${fecha}, ${sesion_id}, ${tipo_sesion}, ${met.dist_total||0}, ${met.dist_hir||0}, ${met.dist_v4||0}, ${met.dist_v5||0}, ${met.player_load||0}, ${met.max_velocity||0}, ${met.acc2||0}, ${met.dec2||0}, ${met.dist_per_min||0}, ${met.n_sprints||0}, ${JSON.stringify(met)}, ${pdfText?'pdf':'excel'})`
      }
    }
    return NextResponse.json({ ok: true, saved: matched.length, unmatched })
  } catch (err) { console.error(err); return NextResponse.json({ error: String(err) }, { status: 500 }) }
}