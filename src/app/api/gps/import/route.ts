import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import * as XLSX from 'xlsx'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

// Normalize a name for fuzzy matching: lowercase, no accents, no extra spaces
function normalizeName(n: string): string {
  return (n || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
}

// Parse a Catapult Excel row into GPS metrics
function parseRow(headers: string[], row: any[]): Record<string, any> | null {
  const h = headers.map(h => (h || '').toLowerCase().trim())
  const get = (keys: string[]) => {
    for (const k of keys) {
      const idx = h.findIndex(x => x.includes(k))
      if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && row[idx] !== '') {
        return Number(row[idx]) || 0
      }
    }
    return null
  }
  const getName = () => {
    const idx = h.findIndex(x => x.includes('first name') || x === 'name' || x === 'athlete' || x === 'player')
    return idx !== -1 ? String(row[idx] || '').trim() : null
  }
  const getStr = (keys: string[]) => {
    for (const k of keys) {
      const idx = h.findIndex(x => x.includes(k))
      if (idx !== -1 && row[idx]) return String(row[idx]).trim()
    }
    return null
  }

  const name = getName()
  if (!name) return null

  return {
    nombre_catapult: name,
    nombre_norm: normalizeName(name),
    device_id: getStr(['device id', 'device_id', 'tag id', 'tag_id']),
    jersey: get(['jersey', 'number', 'shirt']),
    dist_total: get(['total distance', 'total dist']),
    dist_hir: get(['high speed dist', 'hsr', 'hsd']),
    dist_v4: get(['v4 dist', 'velocity band 4']),
    dist_v5: get(['v5 dist', 'velocity band 5', 'sprint dist']),
    player_load: get(['player load', 'playerload']),
    max_velocity: get(['max velocity', 'max vel', 'top speed']),
    acc2: get(['acc2 eff', 'acc 2', 'accel2']),
    dec2: get(['dec2 eff', 'dec 2', 'decel2']),
    acc3: get(['acc3 eff', 'acc 3', 'accel3']),
    dec3: get(['dec3 eff', 'dec 3', 'decel3']),
    dist_per_min: get(['dist per min', 'dist/min', 'distance per minute']),
  }
}

// POST /api/gps/import
// Body: multipart/form-data with:
//   file: Excel file
//   fecha: YYYY-MM-DD
//   tipo_sesion: 'entrenamiento' | 'partido'
//   sesion_id: optional session ID
export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const fecha = formData.get('fecha') as string
    const tipo_sesion = (formData.get('tipo_sesion') as string) || 'entrenamiento'
    const sesion_id = formData.get('sesion_id') ? Number(formData.get('sesion_id')) : null

    if (!file || !fecha) {
      return NextResponse.json({ error: 'Falta archivo o fecha' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Parse Excel with xlsx library
    const workbook = XLSX.read(bytes, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })

    if (rawData.length < 2) {
      return NextResponse.json({ error: 'El archivo está vacío o no tiene datos' }, { status: 400 })
    }

    const headers = (rawData[0] as string[]).map(h => String(h || ''))
    const dataRows = rawData.slice(1).filter(row => row.some(cell => cell !== null && cell !== ''))

    // Parse all rows into GPS metrics
    const parsedRows = dataRows.map(row => parseRow(headers, row)).filter(Boolean) as any[]

    if (parsedRows.length === 0) {
      return NextResponse.json({ error: 'No se encontraron datos válidos en el archivo' }, { status: 400 })
    }

    const sql = getDb()

    // Load all players from this club with their names
    const jugadores = s.clubId ? await sql`
      SELECT j.id, u.nombre, j.posicion
      FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id = ${s.clubId} AND u.activo = true
    ` : []

    // Build matching maps
    const byNormName = new Map<string, any>()
    for (const j of jugadores as any[]) {
      byNormName.set(normalizeName(j.nombre), j)
      // Also index by first name only (for Catapult which only exports first name)
      const firstName = normalizeName(j.nombre).split(' ')[0]
      if (!byNormName.has(firstName)) byNormName.set(firstName, j)
    }

    // Match each GPS row to a player
    const matched: any[] = []
    const unmatched: string[] = []

    for (const row of parsedRows) {
      let jugador = null
      let matchMethod = null

      // Try 1: exact normalized full name
      if (byNormName.has(row.nombre_norm)) {
        jugador = byNormName.get(row.nombre_norm)
        matchMethod = 'nombre'
      }

      // Try 2: first name only
      if (!jugador) {
        const firstName = row.nombre_norm.split(' ')[0]
        if (byNormName.has(firstName)) {
          jugador = byNormName.get(firstName)
          matchMethod = 'primer_nombre'
        }
      }

      // Try 3: partial match (DB name contains Catapult name or vice versa)
      if (!jugador) {
        for (const [normName, j] of byNormName.entries()) {
          if (normName.includes(row.nombre_norm) || row.nombre_norm.includes(normName)) {
            jugador = j
            matchMethod = 'parcial'
            break
          }
        }
      }

      if (jugador) {
        matched.push({ ...row, jugador_id: jugador.id, jugador_nombre: jugador.nombre, match_method: matchMethod })
      } else {
        unmatched.push(row.nombre_catapult)
      }
    }

    // If this is a preview request (no confirm flag), return matching results without saving
    const confirm = formData.get('confirm') === 'true'
    if (!confirm) {
      return NextResponse.json({
        preview: true,
        fecha,
        tipo_sesion,
        sesion_id,
        matched: matched.map(m => ({
          nombre_catapult: m.nombre_catapult,
          jugador_nombre: m.jugador_nombre,
          match_method: m.match_method,
          dist_total: m.dist_total,
          dist_hir: m.dist_hir,
          player_load: m.player_load,
          max_velocity: m.max_velocity,
          sin_datos: m.dist_total === 0 && m.player_load === 0,
        })),
        unmatched,
        total_filas: parsedRows.length,
      })
    }

    // CONFIRM: save to DB
    let saved = 0
    let errors: string[] = []

    for (const m of matched) {
      // Skip rows with zero data (player wasn't wearing device)
      if (m.dist_total === 0 && (m.player_load === null || m.player_load === 0)) continue

      try {
        // Upsert: delete existing for same player+date+tipo, then insert
        await sql`
          DELETE FROM gps_logs
          WHERE jugador_id = ${m.jugador_id}
            AND fecha = ${fecha}
            AND tipo_sesion = ${tipo_sesion}
        `
        await sql`
          INSERT INTO gps_logs (
            jugador_id, club_id, fecha, sesion_id, tipo_sesion,
            dist_total, dist_hir, dist_v4, dist_v5,
            player_load, max_velocity,
            acc2, dec2, acc3, dec3,
            dist_per_min, fuente
          ) VALUES (
            ${m.jugador_id}, ${s.clubId || null}, ${fecha}, ${sesion_id}, ${tipo_sesion},
            ${m.dist_total}, ${m.dist_hir}, ${m.dist_v4}, ${m.dist_v5},
            ${m.player_load}, ${m.max_velocity},
            ${m.acc2}, ${m.dec2}, ${m.acc3}, ${m.dec3},
            ${m.dist_per_min}, 'excel'
          )
        `
        saved++
      } catch (e) {
        errors.push(`${m.jugador_nombre}: ${String(e).slice(0, 80)}`)
      }
    }

    return NextResponse.json({
      ok: true,
      saved,
      unmatched,
      errors,
      message: `${saved} jugadores importados correctamente`,
    })

  } catch (err) {
    console.error('[GPS import error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
