import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import * as XLSX from 'xlsx'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function normalizeName(n: string): string {
  return (n || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

// Columns that have dedicated DB columns (kept for backward compat)
const FIXED_FIELDS = new Set(['dist_total','dist_hir','dist_v4','dist_v5','player_load','max_velocity','acc2','dec2','acc3','dec3','dist_per_min'])

// ─── EXCEL PARSER ────────────────────────────────────────────────────────────
// Maps normalized header text → canonical field key
// Field key is what goes into metricas JSON (and fixed cols when applicable)
const EXCEL_COL_MAP: Array<[string, string]> = [
  // Distance
  ['total distance',           'dist_total'],
  ['total dist',               'dist_total'],
  ['tot dist',                 'dist_total'],
  ['meterage per minute',      'dist_per_min'],
  ['meterage per min',         'dist_per_min'],
  ['distance per minute',      'dist_per_min'],
  ['dist per minute',          'dist_per_min'],
  ['dist per min',             'dist_per_min'],
  ['dist/min',                 'dist_per_min'],
  ['high speed dist',          'dist_hir'],
  ['high speed distance',      'dist_hir'],
  ['high intensity',           'dist_hir'],
  ['hsr',                      'dist_hir'],
  ['hsd',                      'dist_hir'],
  ['vel b4 tot dist',          'dist_v4'],
  ['vel b4',                   'dist_v4'],
  ['v4 dist',                  'dist_v4'],
  ['velocity band 4',          'dist_v4'],
  ['vel b6 tot dist',          'dist_v5'],
  ['vel b6',                   'dist_v5'],
  ['vel b5 tot dist',          'dist_v5'],
  ['vel b5',                   'dist_v5'],
  ['v5 dist',                  'dist_v5'],
  ['v6 dist',                  'dist_v5'],
  ['velocity band 5',          'dist_v5'],
  ['velocity band 6',          'dist_v5'],
  ['sprint dist',              'dist_v5'],
  // Load
  ['player load',              'player_load'],
  ['playerload',               'player_load'],
  // Velocity
  ['max velocity',             'max_velocity'],
  ['max vel',                  'max_velocity'],
  ['top speed',                'max_velocity'],
  ['velocidad maxima',         'max_velocity'],
  ['velocidad máxima',         'max_velocity'],
  // Accelerations / decelerations — Catapult uses "Acc2 Eff", "Dec2 Eff" style
  ['acc b2-3 tot effs',        'acc2'],
  ['acc b2-3 tot eff',         'acc2'],
  ['acc b2-3',                 'acc2'],
  ['acc b2',                   'acc2'],
  ['acc2 eff',                 'acc2'],
  ['acc2 effs',                'acc2'],
  ['acc 2',                    'acc2'],
  ['accel2',                   'acc2'],
  ['accel b2',                 'acc2'],
  ['decel b2-3 tot effs',      'dec2'],
  ['decel b2-3 tot eff',       'dec2'],
  ['decel b2-3',               'dec2'],
  ['dec b2',                   'dec2'],
  ['dec2 eff',                 'dec2'],
  ['dec2 effs',                'dec2'],
  ['dec 2',                    'dec2'],
  ['decel2',                   'dec2'],
  ['decel b2',                 'dec2'],
  ['acc b3',                   'acc3'],
  ['acc3 eff',                 'acc3'],
  ['acc3 effs',                'acc3'],
  ['acc 3',                    'acc3'],
  ['accel3',                   'acc3'],
  ['accel b3',                 'acc3'],
  ['dec b3',                   'dec3'],
  ['dec3 eff',                 'dec3'],
  ['dec3 effs',                'dec3'],
  ['dec 3',                    'dec3'],
  ['decel3',                   'dec3'],
  ['decel b3',                 'dec3'],
  // Sprints
  ['number sprints',           'n_sprints'],
  ['num sprints',              'n_sprints'],
  ['numero sprints',           'n_sprints'],
  ['número sprints',           'n_sprints'],
  ['sprint count',             'n_sprints'],
  ['sprints',                  'n_sprints'],
  // Velocity bands (extra)
  ['vel b1',                   'dist_v1'],
  ['velocity band 1',          'dist_v1'],
  ['vel b2',                   'dist_v2'],
  ['velocity band 2',          'dist_v2'],
  ['vel b3',                   'dist_v3'],
  ['velocity band 3',          'dist_v3'],
  // Efforts
  ['acc b1',                   'acc1'],
  ['acc b4',                   'acc4'],
  ['dec b1',                   'dec1'],
  ['dec b4',                   'dec4'],
  ['acc b1-4 tot',             'acc_total'],
  ['dec b1-4 tot',             'dec_total'],
  // Power
  ['metabolic power',          'metabolic_power'],
  ['average metabolic power',  'avg_metabolic_power'],
  ['equivalent distance',      'equiv_distance'],
  ['equivalent dist',          'equiv_distance'],
  // Heart rate
  ['hr avg',                   'hr_avg'],
  ['average hr',               'hr_avg'],
  ['hr max',                   'hr_max'],
  ['max hr',                   'hr_max'],
  ['hr zone 1',                'hr_z1'],
  ['hr zone 2',                'hr_z2'],
  ['hr zone 3',                'hr_z3'],
  ['hr zone 4',                'hr_z4'],
  ['hr zone 5',                'hr_z5'],
  // Duration
  ['duration',                 'duracion_min'],
  ['total time',               'duracion_min'],
]

function matchExcelCol(header: string): string | null {
  const h = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  for (const [label, field] of EXCEL_COL_MAP) {
    const l = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (h.includes(l) || l.includes(h)) return field
  }
  return null
}

function parseExcel(bytes: Uint8Array, fileName?: string): Record<string, any>[] {
  // XLSX.read auto-detects format. For CSV files saved as .xlsx (common Catapult export),
  // we try xlsx first and fall back to csv parsing if the result looks wrong.
  let workbook: any
  try {
    workbook = XLSX.read(bytes, { type: 'array', raw: false, dateNF: 'yyyy-mm-dd' })
  } catch {
    // If binary parse fails, try treating as CSV text
    const text = new TextDecoder('utf-8').decode(bytes)
    workbook = XLSX.read(text, { type: 'string' })
  }
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false })
  if (rawData.length < 2) return []

  // ── Find the actual header row ──────────────────────────────────────────────
  // Catapult often has 1–3 title/metadata rows before the real column headers.
  // We detect the header row as the first row that contains a known name marker
  // OR a known metric keyword. We scan up to the first 6 rows.
  const NAME_MARKERS = ['first name', 'firstname', 'name', 'athlete', 'player', 'nombre', 'apellido']
  const METRIC_MARKERS = ['total dist', 'tot dist', 'total distance', 'player load', 'playerload',
    'max velocity', 'max vel', 'high speed', 'dist per min', 'meterage',
    'vel b4', 'vel b5', 'vel b6', 'v4 dist', 'v5 dist', 'acc2', 'dec2']

  let headerRowIdx = 0
  for (let i = 0; i < Math.min(6, rawData.length); i++) {
    const row = rawData[i] as any[]
    const rowStr = row.map(c => String(c ?? '').toLowerCase()).join(' ')
    const hasName = NAME_MARKERS.some(m => rowStr.includes(m))
    const hasMetric = METRIC_MARKERS.some(m => rowStr.includes(m))
    if (hasName || hasMetric) { headerRowIdx = i; break }
  }

  const headers = (rawData[headerRowIdx] as string[]).map(h => String(h || ''))

  // Build column map: index → field key (null = skip)
  const colMap: (string | null)[] = headers.map(h => {
    const lower = h.toLowerCase().trim()
    // Detect name columns
    if (NAME_MARKERS.some(k => lower.includes(k))) return '__name__'
    if (['last name', 'lastname', 'surname'].some(k => lower.includes(k))) return '__lastname__'
    if (['device id','device_id','tag id','tag_id'].some(k => lower.includes(k))) return '__device__'
    // Jersey: only exact matches to avoid false positives like "Number Sprints"
    if (['jersey', 'shirt number', 'dorsal', '#'].some(k => lower === k)) return '__jersey__'
    // Skip metadata columns
    if (['date','fecha'].some(k => lower === k)) return null
    if (['interval', 'time', 'split'].some(k => lower === k)) return null
    if (['position','pos','posicion'].some(k => lower === k)) return null
    if (['session title','session name','session type'].some(k => lower.includes(k))) return null
    if (['period'].some(k => lower === k)) return null // exact only — "period" alone, not "periodic"
    return matchExcelCol(h)
  })

  const dataRows = rawData.slice(headerRowIdx + 1).filter(row =>
    row.some(cell => cell !== null && cell !== '')
  )

  return dataRows.map(row => {
    let name: string | null = null
    let firstName: string | null = null
    let lastName: string | null = null
    let jersey: string | null = null
    const metricas: Record<string, number> = {}

    row.forEach((cell, idx) => {
      const field = colMap[idx]
      if (!field || cell === null || cell === '') return
      if (field === '__name__') { name = String(cell).trim(); return }
      if (field === '__firstname__') { firstName = String(cell).trim(); return }
      if (field === '__lastname__') { lastName = String(cell).trim(); return }
      if (field === '__jersey__') { jersey = String(cell).trim(); return }
      if (field === '__device__') return
      const num = parseFloat(String(cell).replace(',', '.'))
      if (!isNaN(num)) metricas[field] = num
    })

    // Build name from parts if not found directly
    if (!name && (firstName || lastName)) {
      name = [firstName, lastName].filter(Boolean).join(' ').trim() ||
             [lastName, firstName].filter(Boolean).join(', ').trim()
    }

    // Skip rows where name is purely numeric (device IDs leaked into name col)
    if (name && /^[\d.\s,]+$/.test(name)) name = null

    if (!name) return null
    return { nombre_catapult: name, nombre_norm: normalizeName(name), jersey, metricas }
  }).filter(Boolean) as any[]
}

// ─── PDF PARSER ──────────────────────────────────────────────────────────────
const PDF_COL_MAP: Array<[string, string]> = [
  ['tot dist',              'dist_total'],
  ['total dist',            'dist_total'],
  ['meterage per minute',   'dist_per_min'],
  ['meterage per min',      'dist_per_min'],
  ['vel b4 tot dist',       'dist_v4'],
  ['vel b4',                'dist_v4'],
  ['high speed dist',       'dist_hir'],
  ['vel b6 tot dist',       'dist_v5'],
  ['vel b6',                'dist_v5'],
  ['vel b5 tot dist',       'dist_v5'],
  ['vel b5',                'dist_v5'],
  ['numero sprints',        'n_sprints'],
  ['número sprints',        'n_sprints'],
  ['acc b2-3 tot effs',     'acc2'],
  ['acc b2-3',              'acc2'],
  ['decel b2-3 tot effs',   'dec2'],
  ['decel b2-3',            'dec2'],
  ['velocidad maxima',      'max_velocity'],
  ['velocidad máxima',      'max_velocity'],
  ['player load',           'player_load'],
  ['max velocity',          'max_velocity'],
]

function matchPdfCol(token: string): string | null {
  const t = token.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  for (const [label, field] of PDF_COL_MAP) {
    const l = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (t.includes(l) || l.includes(t)) return field
  }
  return null
}

async function parsePdf(bytes: Uint8Array): Promise<Record<string, any>[]> {
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(Buffer.from(bytes))
  const lines = data.text.split('\n').map((l: string) => l.trim()).filter(Boolean)

  let headerIdx = -1
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase()
    if (l.includes('tot dist') || l.includes('meterage per minute') || l.includes('vel b4 tot dist') || l.includes('vel b4')) {
      headerIdx = i; break
    }
  }
  if (headerIdx === -1) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('cuadro resumen')) {
        for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
          const l = lines[j].toLowerCase()
          if (l.includes('dist') && (l.includes('vel') || l.includes('sprint') || l.includes('meterage'))) {
            headerIdx = j; break
          }
        }
        break
      }
    }
  }
  if (headerIdx === -1)
    throw new Error('No se encontró la tabla de datos GPS en el PDF. Asegurate de exportar el "Cuadro Resumen" desde Catapult.')

  const headerTokens = lines[headerIdx].split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)

  let extraHeaderIdx = -1
  if (headerIdx + 1 < lines.length) {
    const next = lines[headerIdx + 1]
    if (!/\d{3,}/.test(next) && next.length < 120) {
      extraHeaderIdx = headerIdx + 1
      const extraTokens = next.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)
      extraTokens.forEach((tok, idx) => {
        if (idx < headerTokens.length) headerTokens[idx] += ' ' + tok
      })
    }
  }

  const colFields: (string | null)[] = headerTokens.map(tok => matchPdfCol(tok))
  const startIdx = extraHeaderIdx !== -1 ? extraHeaderIdx + 1 : headerIdx + 1

  const results: Record<string, any>[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()
    if (lower.includes('page ') || lower.includes('catapult sport') || lower.includes('generated') || lower.includes('reporte')) break
    if (lower.startsWith('promedio') || lower.startsWith('total') || lower.startsWith('equipo') || lower.startsWith('team')) continue

    const tokens = line.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean)
    if (tokens.length < 2) continue

    const name = tokens[0]
    if (!name || /^\d+([.,]\d+)?$/.test(name) || !name.match(/[a-záéíóúñA-ZÁÉÍÓÚÑ]/)) continue

    const metricas: Record<string, number> = {}
    tokens.slice(1).forEach((tok, idx) => {
      const field = colFields[idx + 1] ?? colFields[idx]
      if (field && metricas[field] === undefined) {
        const num = parseFloat(tok.replace(',', '.').replace(/[^\d.]/g, ''))
        if (!isNaN(num)) metricas[field] = num
      }
    })

    const hasData = Object.values(metricas).some(v => v > 0)
    if (hasData) results.push({ nombre_catapult: name, nombre_norm: normalizeName(name), metricas })
  }

  return results
}

// ─── ROUTE HANDLER ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const fecha = formData.get('fecha') as string
    const tipo_sesion = (formData.get('tipo_sesion') as string) || 'entrenamiento'
    const sesion_id = formData.get('sesion_id') ? Number(formData.get('sesion_id')) : null

    if (!file || !fecha)
      return NextResponse.json({ error: 'Falta archivo o fecha' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const fileName = file.name.toLowerCase()
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf'

    let parsedRows: Record<string, any>[]
    try {
      parsedRows = isPdf ? await parsePdf(bytes) : parseExcel(bytes, fileName)
    } catch (parseErr) {
      return NextResponse.json({ error: String(parseErr) }, { status: 400 })
    }

    if (parsedRows.length === 0) {
      const debugInfo = isPdf ? '' : ` Columnas detectadas en el archivo: ${
        (() => {
          try {
            let wb: any
            try { wb = XLSX.read(bytes, { type: 'array', raw: false }) }
            catch { wb = XLSX.read(new TextDecoder('utf-8').decode(bytes), { type: 'string' }) }
            const ws = wb.Sheets[wb.SheetNames[0]]
            const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false })
            // Show first 3 rows to help diagnose format
            const rows = raw.slice(0, 3).map((r: any[]) =>
              '[' + (r as any[]).slice(0, 6).map(c => String(c ?? '')).join(' | ') + ']'
            ).join(' → ')
            return rows
          } catch { return 'desconocidas' }
        })()
      }`
      return NextResponse.json({
        error: `No se encontraron datos válidos.${debugInfo} Asegurate de exportar el reporte de sesión desde Catapult OpenField (Session Summary o Cuadro Resumen).`
      }, { status: 400 })
    }

    const sql = getDb()
    const jugadores = s.clubId ? await sql`
      SELECT j.id, u.nombre, j.posicion
      FROM jugadores j JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id = ${s.clubId} AND u.activo = true
    ` : []

    const byNormName = new Map<string, any>()
    for (const j of jugadores as any[]) {
      byNormName.set(normalizeName(j.nombre), j)
      const firstName = normalizeName(j.nombre).split(' ')[0]
      if (!byNormName.has(firstName)) byNormName.set(firstName, j)
    }

    const matched: any[] = []
    const unmatched: string[] = []

    // Build jersey map for fallback matching
    const byJersey = new Map<string, any>()
    for (const j of jugadores as any[]) {
      if ((j as any).dorsal) byJersey.set(String((j as any).dorsal).trim(), j)
    }

    for (const row of parsedRows) {
      let jugador = null, matchMethod = null

      // 1. Exact normalized name match
      if (byNormName.has(row.nombre_norm)) { jugador = byNormName.get(row.nombre_norm); matchMethod = 'nombre' }

      // 2. First name only match
      if (!jugador) {
        const fn = row.nombre_norm.split(' ')[0]
        if (fn.length > 2 && byNormName.has(fn)) { jugador = byNormName.get(fn); matchMethod = 'primer_nombre' }
      }

      // 3. Partial / contains match
      if (!jugador) {
        for (const [normName, j] of byNormName.entries()) {
          if (normName.includes(row.nombre_norm) || row.nombre_norm.includes(normName)) {
            jugador = j; matchMethod = 'parcial'; break
          }
        }
      }

      // 4. Last name match (Catapult sometimes exports "Apellido, Nombre" or just apellido)
      if (!jugador) {
        const parts = row.nombre_norm.split(/[,\s]+/)
        for (const part of parts) {
          if (part.length < 3) continue
          for (const [normName, j] of byNormName.entries()) {
            if (normName.includes(part)) { jugador = j; matchMethod = 'apellido'; break }
          }
          if (jugador) break
        }
      }

      // 5. Jersey / dorsal number match
      if (!jugador && row.jersey && byJersey.has(row.jersey)) {
        jugador = byJersey.get(row.jersey); matchMethod = 'dorsal'
      }

      if (jugador) matched.push({ ...row, jugador_id: jugador.id, jugador_nombre: jugador.nombre, match_method: matchMethod })
      else unmatched.push(row.nombre_catapult)
    }

    const confirm = formData.get('confirm') === 'true'
    // Expose raw headers for debugging when no players matched
    const rawHeaders = parsedRows.length > 0 ? Object.keys(parsedRows[0]).filter(k => k !== 'metricas' && k !== 'nombre_norm') : []

    if (!confirm) {
      return NextResponse.json({
        preview: true, fecha, tipo_sesion, sesion_id,
        fuente: isPdf ? 'pdf' : 'excel',
        matched: matched.map(m => ({
          nombre_catapult: m.nombre_catapult,
          jugador_nombre: m.jugador_nombre,
          match_method: m.match_method,
          metricas: m.metricas,
          n_metricas: Object.keys(m.metricas || {}).length,
          sin_datos: Object.values(m.metricas || {}).every(v => !v),
        })),
        unmatched,
        total_filas: parsedRows.length,
        // Show what columns were detected
        columnas_detectadas: parsedRows.length > 0 ? Object.keys(parsedRows[0].metricas || {}) : [],
        nombres_detectados: parsedRows.slice(0, 5).map(r => r.nombre_catapult),
      })
    }

    // CONFIRM: save to DB
    let saved = 0
    const errors: string[] = []
    for (const m of matched) {
      const met = m.metricas || {}
      if (Object.values(met).every(v => !v)) continue // skip zero rows

      // Extract fixed columns from metricas (backward compat)
      const fixedVals = {
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
        await sql`DELETE FROM gps_logs WHERE jugador_id = ${m.jugador_id} AND fecha = ${fecha} AND tipo_sesion = ${tipo_sesion}`
        await sql`
          INSERT INTO gps_logs (
            jugador_id, club_id, fecha, sesion_id, tipo_sesion,
            dist_total, dist_hir, dist_v4, dist_v5,
            player_load, max_velocity,
            acc2, dec2, acc3, dec3,
            dist_per_min, fuente, metricas
          ) VALUES (
            ${m.jugador_id}, ${s.clubId || null}, ${fecha}, ${sesion_id}, ${tipo_sesion},
            ${fixedVals.dist_total}, ${fixedVals.dist_hir}, ${fixedVals.dist_v4}, ${fixedVals.dist_v5},
            ${fixedVals.player_load}, ${fixedVals.max_velocity},
            ${fixedVals.acc2}, ${fixedVals.dec2}, ${fixedVals.acc3}, ${fixedVals.dec3},
            ${fixedVals.dist_per_min}, ${isPdf ? 'pdf' : 'excel'}, ${JSON.stringify(met)}
          )
        `
        saved++
      } catch (e) {
        errors.push(`${m.jugador_nombre}: ${String(e).slice(0, 80)}`)
      }
    }

    // Return what columns were saved so frontend knows
    const columnas = parsedRows.length > 0 ? Object.keys(parsedRows[0].metricas || {}) : []

    return NextResponse.json({
      ok: true, saved, unmatched, errors,
      fuente: isPdf ? 'pdf' : 'excel',
      columnas_detectadas: columnas,
      message: `${saved} jugadores importados (${columnas.length} variables) desde ${isPdf ? 'PDF' : 'Excel'}`,
    })

  } catch (err) {
    console.error('[GPS import error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
