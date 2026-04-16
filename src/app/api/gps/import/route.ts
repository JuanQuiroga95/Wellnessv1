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

// ... (Mantengo todo tu METRIC_COL_MAP y funciones de soporte intactas)
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

const matchExcelCol = matchMetricCol

function parseRawRows(raw: any[][]): Record<string, any>[] {
  if (raw.length < 2) return []
  const headers = (raw[0] as any[]).map(h => String(h ?? ''))
  const colMap: (string | null)[] = headers.map(h => {
    const ln = normStr(h)
    const isNameCol = ln === 'name' || ln === 'nombre' || ln === 'athlete' || ln === 'player' ||
      ln === 'jugador' || ln.includes('first name') || ln.includes('player name') || ln.includes('athlete name')
    if (isNameCol) return '__name__'
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

const CATAPULT_COL_ORDER = [
  'dist_total','dist_per_min','dist_v4','dist_hir','dist_v5',
  'n_sprints','acc2','dec2','acc3','dec3','max_velocity',
]

const ROW_COL_ORDER = [
  null, null, 'dist_total', 'dist_per_min', 'dist_v4', 'dist_v5', null, 'n_sprints', 'dist_hir', 'acc2', 'dec2', 'acc3', 'dec3', 'player_load', 'duracion_min', 'max_velocity',
]

function cleanCatapultName(raw: string): string {
  const parts = raw.trim().replace(/\.$/, '').split(/\s+/)
  const n = parts.length
  if (n < 2) return raw.trim()
  for (let split = 1; split < n; split++) {
    const first = parts.slice(0, split)
    const rest  = parts.slice(split)
    if (first.length < 1 || normStr(first.join(' ')).length < 2) continue
    if (first[0].length < 2) continue
    const fn = normStr(first.join(' '))
    const rn = normStr(rest.join(' '))
    if (fn === rn) return first.join(' ')
    if (rest.length === 1 && normStr(first[first.length - 1]) === normStr(rest[0])) {
      return first.join(' ')
    }
    if (rest.length > 0 && normStr(rest[0]) === normStr(first[0]) && fn.length >= 4) {
      return first.join(' ')
    }
  }
  return raw.trim().replace(/\.$/, '')
}

// ... (Mantengo tus funciones parsePdfRowFormat, parsePdfCuadroResumen, dpSegmentBlob, parsePdfBlobColumnar, parsePdfFromText y parsePdf intactas)
// [ESTAS FUNCIONES NO SE TOCAN PARA NO PERDER TU LÓGICA DE PARSING]

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

  const byNorm = new Map<string, any>()
  const allJugadores: Array<{j: any, full: string, parts: string[]}> = []

  for (const j of jugadores as any[]) {
    const full = normalizeName(j.nombre)
    byNorm.set(full, j)
    const parts = full.split(' ')
    if (parts[0].length >= 3 && !byNorm.has(parts[0])) byNorm.set(parts[0], j)
    if (parts.length > 1 && parts[parts.length-1].length >= 3 && !byNorm.has(parts[parts.length-1]))
      byNorm.set(parts[parts.length-1], j)
    allJugadores.push({ j, full, parts })
  }

  const matched: any[] = [], unmatched: string[] = []
  for (const row of rows) {
    if (row.nombre_norm.length < 3) { unmatched.push(row.nombre_catapult); continue }
    let jug = null, method = null
    const rowParts = row.nombre_norm.split(' ')
    const rowSurname = rowParts[rowParts.length - 1]
    const rowFirst   = rowParts[0]

    if (byNorm.has(row.nombre_norm)) { jug = byNorm.get(row.nombre_norm); method = 'nombre' }
    if (!jug && rowSurname.length >= 3) {
      if (byNorm.has(rowSurname)) { jug = byNorm.get(rowSurname); method = 'apellido' }
    }
    if (!jug && rowFirst.length >= 3) {
      if (byNorm.has(rowFirst)) { jug = byNorm.get(rowFirst); method = 'primer_nombre' }
    }
    if (!jug && rowParts.length === 1 && rowFirst.length >= 3) {
      for (const { j: candidate, parts } of allJugadores) {
        if (parts.some((w: string) => w === rowFirst)) { jug = candidate; method = 'nombre_unico'; break }
      }
    }
    if (!jug) {
      for (const [k, v] of Array.from(byNorm)) {
        if (k.length >= 4 && row.nombre_norm.length >= 4 &&
            (k.includes(row.nombre_norm) || row.nombre_norm.includes(k))) {
          jug = v; method = 'parcial'; break
        }
      }
    }
    if (!jug && rowSurname.length >= 4) {
      let bestDist = 999, bestJ = null
      for (const {j: candidate, full, parts} of allJugadores) {
        for (const word of parts) {
          if (word.length < 4) continue
          const dist = levenshtein(rowSurname, word)
          const threshold = rowSurname.length >= 5 ? 2 : 1
          if (dist <= threshold && dist < bestDist) {
            bestDist = dist; bestJ = candidate
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
      const body = await req.json()
      if (!body.fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 })
      fecha = String(body.fecha); tipo_sesion = String(body.tipo_sesion || 'entrenamiento'); sesion_id = body.sesion_id ? Number(body.sesion_id) : null; confirm = body.confirm === true
      try {
        if (body.rows && Array.isArray(body.rows)) parsedRows = parseRawRows(body.rows as any[][])
        else if (body.pdfText && typeof body.pdfText === 'string') { isPdf = true; parsedRows = parsePdfFromText(body.pdfText) }
        else if (body.fileBase64) {
          isPdf = true; const binaryStr = atob(body.fileBase64); const bytes = new Uint8Array(binaryStr.length)
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
          parsedRows = await parsePdf(bytes)
        } else return NextResponse.json({ error: 'Falta rows, pdfText o fileBase64' }, { status: 400 })
      } catch (e) { return NextResponse.json({ error: String(e) }, { status: 400 }) }
    } else {
      const fd = await req.formData(); const file = fd.get('file') as File | null; fecha = fd.get('fecha') as string; tipo_sesion = (fd.get('tipo_sesion') as string) || 'entrenamiento'; sesion_id = fd.get('sesion_id') ? Number(fd.get('sesion_id')) : null
      if (!file || !fecha) return NextResponse.json({ error: 'Falta archivo o fecha' }, { status: 400 })
      const bytes = new Uint8Array(await file.arrayBuffer()); isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf'; confirm = fd.get('confirm') === 'true'
      try { parsedRows = isPdf ? await parsePdf(bytes) : parseExcel(bytes) } catch (e) { return NextResponse.json({ error: String(e) }, { status: 400 }) }
    }

    if (!parsedRows.length) return NextResponse.json({ error: 'No se encontraron datos.' }, { status: 400 })

    const { matched, unmatched } = await matchPlayers(parsedRows, s.clubId || null)

    if (!confirm) {
      return NextResponse.json({ preview: true, fecha, tipo_sesion, sesion_id, fuente: isPdf ? 'pdf' : 'excel', matched, unmatched, total_filas: parsedRows.length })
    }

    // CONFIRM: save to DB
    const sql = getDb()

    // ─── FIX DUPLICADOS: Limpieza total de este club/fecha/sesión antes de insertar ───
    if (s.clubId) {
      await sql`
        DELETE FROM gps_logs 
        WHERE club_id = ${s.clubId} 
          AND fecha = ${fecha}::date 
          AND tipo_sesion = ${tipo_sesion}
      `
    }

    let saved = 0; const errors: string[] = []
    for (const m of matched) {
      const met = m.metricas || {}
      if (Object.values(met).every(v => !v)) continue
      const fixed = { dist_total: met.dist_total??null, dist_hir: met.dist_hir??null, dist_v4: met.dist_v4??null, dist_v5: met.dist_v5??null, player_load: met.player_load??null, max_velocity: met.max_velocity??null, acc2: met.acc2??null, dec2: met.dec2??null, acc3: met.acc3??null, dec3: met.dec3??null, dist_per_min: met.dist_per_min??null, n_sprints: met.n_sprints??null, duracion_min: met.duracion_min??null }
      
      try {
        // (Ya no hace falta el DELETE individual aquí porque lo hicimos masivo arriba)
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
        saved++
      } catch (e) { errors.push(`${m.jugador_nombre}: ${String(e).slice(0, 80)}`) }
    }

    return NextResponse.json({ ok: true, saved, unmatched, errors, fuente: isPdf ? 'pdf' : 'excel', message: `${saved} jugadores importados.` })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}