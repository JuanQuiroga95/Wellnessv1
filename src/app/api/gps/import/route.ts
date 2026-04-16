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
  ['charge jugador','player_load'],['tot pl','player_load'],
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

function cleanCatapultName(raw: string): string {
  const cleaned = raw.trim().replace(/\.$/, '');
  const parts = cleaned.split(/\s+/);
  // Enoch Enoch -> Enoch
  if (parts.length === 2 && parts[0].toUpperCase() === parts[1].toUpperCase()) return parts[0];
  // Repetición de bloque (Kiko Kiko)
  if (parts.length >= 4) {
    const half = Math.floor(parts.length / 2);
    if (parts.slice(0, half).join(' ') === parts.slice(half).join(' ')) return parts.slice(0, half).join(' ');
  }
  return cleaned;
}

function parseRawRows(raw: any[][]): Record<string, any>[] {
  if (raw.length < 2) return []
  const headers = (raw[0] as any[]).map(h => String(h ?? ''))
  const colMap: (string | null)[] = headers.map(h => {
    const ln = normStr(h)
    const isNameCol = ln === 'name' || ln === 'nombre' || ln === 'athlete' || ln === 'player' || ln === 'jugador' || ln.includes('player name')
    if (isNameCol) return '__name__'
    return matchMetricCol(h)
  })
  return (raw.slice(1) as any[][]).filter(row => row.some((c: any) => c !== null && c !== '')).map(row => {
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

function parsePdfFromText(rawText: string): Record<string, any>[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const results: Record<string, any>[] = []
  for (const line of lines) {
    const parts = line.split(/\s+/)
    if (parts.length < 5) continue
    let dataStart = parts.length
    while (dataStart > 0 && /^[\d,.]+$/.test(parts[dataStart - 1])) { dataStart-- }
    const numericParts = parts.slice(dataStart), nameParts = parts.slice(0, dataStart)
    if (numericParts.length < 3 || nameParts.length === 0) continue
    const metricas: Record<string, number> = {}
    const colOrder = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc2', 'dec2', 'max_velocity']
    for (let i = 0; i < numericParts.length && i < colOrder.length; i++) {
      const val = parseFloat(numericParts[i].replace(',', '.')); if (!isNaN(val)) metricas[colOrder[i]] = val
    }
    const nameRaw = nameParts.join(' '), cleanName = cleanCatapultName(nameRaw)
    results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas })
  }
  return results
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

async function matchPlayers(rows: Record<string,any>[], clubId: number|null) {
  const sql = getDb()
  const jugadores = clubId ? await sql`
    SELECT j.id, u.nombre 
    FROM jugadores j 
    JOIN usuarios u ON u.id = j.usuario_id 
    WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true
  ` : []
  
  const matched: any[] = [], unmatched: string[] = []
  
  for (const row of rows) {
    // pdfNorm es el nombre que viene del PDF ya limpio (ej: "enoch")
    const pdfNorm = row.nombre_norm;
    
    // Buscamos en la base de datos de manera muy flexible
    let jug = (jugadores as any[]).find(j => {
      const dbNorm = normalizeName(j.nombre);
      const dbWords = dbNorm.split(' ');
      const pdfWords = pdfNorm.split(' ');

      // 1. Coincidencia exacta
      if (dbNorm === pdfNorm) return true;
      
      // 2. Si alguna palabra del PDF está en la base de datos (Ej: Enoch Enoch vs Enoch)
      const hasWordMatch = pdfWords.some(pw => dbWords.includes(pw) && pw.length > 2);
      if (hasWordMatch) return true;

      // 3. Contiene al otro
      if (dbNorm.includes(pdfNorm) || pdfNorm.includes(dbNorm)) return true;

      return false;
    });

    if (jug) {
      matched.push({ ...row, jugador_id: jug.id, jugador_nombre: jug.nombre });
    } else {
      unmatched.push(row.nombre_catapult);
    }
  }
  return { matched, unmatched }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req); if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const body = await req.json(), { fecha, tipo_sesion, sesion_id, confirm, pdfText } = body
    if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 })
    let parsedRows = pdfText ? parsePdfFromText(pdfText) : []
    if (!parsedRows.length) return NextResponse.json({ error: 'No se encontraron datos.' }, { status: 400 })
    
    const { matched, unmatched } = await matchPlayers(parsedRows, s.clubId || null)
    
    if (!confirm) return NextResponse.json({ preview: true, fecha, tipo_sesion, sesion_id, matched, unmatched })
    
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    // Limpieza de duplicados
    if (clubId) {
      await sql`DELETE FROM gps_logs WHERE club_id = ${clubId} AND fecha = ${fecha}::date AND tipo_sesion = ${tipo_sesion}`
    }

    let saved = 0
    for (const m of matched) {
      const met = m.metricas || {}
      await sql`INSERT INTO gps_logs (jugador_id, club_id, fecha, sesion_id, tipo_sesion, dist_total, dist_hir, dist_v4, dist_v5, player_load, max_velocity, acc2, dec2, dist_per_min, n_sprints, metricas)
                VALUES (${m.jugador_id}, ${clubId}, ${fecha}, ${sesion_id}, ${tipo_sesion}, ${met.dist_total||0}, ${met.dist_hir||0}, ${met.dist_v4||0}, ${met.dist_v5||0}, ${met.player_load||0}, ${met.max_velocity||0}, ${met.acc2||0}, ${met.dec2||0}, ${met.dist_per_min||0}, ${met.n_sprints||0}, ${JSON.stringify(met)})`
      saved++
    }
    return NextResponse.json({ ok: true, saved, unmatched })
  } catch (err) { console.error(err); return NextResponse.json({ error: String(err) }, { status: 500 }) }
}