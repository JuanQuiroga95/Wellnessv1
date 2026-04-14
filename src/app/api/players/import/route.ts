export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

const POS_ORDER: Record<string, number> = {
  'portero': 1, 'defensa central': 2, 'lateral derecho': 2, 'lateral izquierdo': 2,
  'mediocampista': 3, 'mediocentro': 3, 'mediocentro defensivo': 3, 'mediocentro ofensivo': 3,
  'volante': 4, 'volante derecho': 4, 'volante izquierdo': 4,
  'extremo': 5, 'extremo derecho': 5, 'extremo izquierdo': 5,
  'delantero': 6, 'centro delantero': 6,
}

const VALID_POSICIONES = [
  'Portero', 'Defensa Central', 'Lateral Derecho', 'Lateral Izquierdo',
  'Mediocentro Defensivo', 'Mediocentro', 'Mediocentro Ofensivo',
  'Volante Derecho', 'Volante Izquierdo', 'Volante',
  'Extremo Derecho', 'Extremo Izquierdo', 'Centro Delantero', 'Delantero',
]
const VALID_PIE = ['Derecho', 'Izquierdo', 'Ambidiestro']

// Parse a raw[][] from the client (xlsx pre-parsed via SheetJS in browser)
// Auto-detects header row within first 5 rows (robust to instruction rows)
function parseRows(raw: any[][]): { players: any[]; errors: string[] } {
  if (raw.length < 2) return { players: [], errors: ['La planilla está vacía o no tiene datos.'] }

  // Normalize: lowercase, remove accents, trim
  const norm = (s: any) => String(s ?? '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')

  // Find header row: first row (within first 5) that contains a known column name
  const KNOWN = [
    'nombre completo *', 'nombre completo', 'nombre',
    'usuario *', 'usuario',
    'contrasena *', 'contrasena', 'password',
    'contrasenha *', 'contrasenha',
  ]
  let headerRowIdx = -1
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const cells = (raw[i] as any[]).map(h => norm(h))
    if (KNOWN.some(k => cells.includes(k))) { headerRowIdx = i; break }
  }
  if (headerRowIdx === -1) return { players: [], errors: ['No se encontraron las columnas obligatorias: Nombre, Usuario, Contraseña. Verificá que usás la plantilla oficial.'] }

  const headers = (raw[headerRowIdx] as any[]).map(h => norm(h))

  // Map normalized headers to field keys — covers accented, unaccented and asterisk variants
  const fieldMap: Record<string, string> = {
    'nombre completo *': 'nombre', 'nombre completo': 'nombre', 'nombre': 'nombre',
    'usuario *': 'usuario', 'usuario': 'usuario',
    'contrasena *': 'password', 'contrasena': 'password',
    'contrasenha *': 'password', 'contrasenha': 'password',
    'password *': 'password', 'password': 'password',
    'posicion': 'posicion',
    'edad': 'edad',
    'peso (kg)': 'peso_kg', 'peso': 'peso_kg',
    'estatura (cm)': 'estatura_cm', 'estatura': 'estatura_cm',
    'pie habil': 'pie_habil', 'pie': 'pie_habil',
    'email': 'email',
    'fecha nacimiento': 'fecha_nacimiento', 'fecha de nacimiento': 'fecha_nacimiento',
    'peso ideal min (kg)': 'peso_ideal_min', 'peso ideal min': 'peso_ideal_min',
    'peso ideal max (kg)': 'peso_ideal_max', 'peso ideal max': 'peso_ideal_max',
  }

  const colIdx: Record<string, number> = {}
  for (let i = 0; i < headers.length; i++) {
    const key = fieldMap[headers[i]]  // headers already norm()-ed above
    if (key) colIdx[key] = i
  }

  if (colIdx['nombre'] === undefined || colIdx['usuario'] === undefined || colIdx['password'] === undefined) {
    const found = headers.filter(Boolean).slice(0, 8).join(', ')
    return { players: [], errors: [`No se encontraron las columnas obligatorias: Nombre, Usuario, Contraseña. Columnas detectadas: [${found}]. Verificá que usás la plantilla oficial.`] }
  }

  const players: any[] = []
  const errors: string[] = []
  const usedUsuarios = new Set<string>()

  const dataRows = raw.slice(headerRowIdx + 1) // skip everything up to and including headers

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as any[]
    const rowNum = i + headerRowIdx + 2 // 1-indexed, offset by header position

    const get = (field: string) => {
      const idx = colIdx[field]
      if (idx === undefined) return null
      const v = row[idx]
      return v === null || v === undefined || v === '' ? null : v
    }

    const nombre = get('nombre') ? String(get('nombre')).trim() : null
    const usuario = get('usuario') ? String(get('usuario')).trim().toLowerCase() : null
    const password = get('password') ? String(get('password')).trim() : null

    // Skip completely empty rows
    if (!nombre && !usuario && !password) continue

    const rowErrors: string[] = []
    if (!nombre) rowErrors.push('Nombre requerido')
    if (!usuario) rowErrors.push('Usuario requerido')
    if (!password) rowErrors.push('Contraseña requerida')
    else if (password.length < 6) rowErrors.push('Contraseña mínimo 6 caracteres')
    if (usuario && usedUsuarios.has(usuario)) rowErrors.push(`Usuario "${usuario}" duplicado en la planilla`)

    if (rowErrors.length) {
      errors.push(`Fila ${rowNum}: ${rowErrors.join(', ')}`)
      continue
    }

    usedUsuarios.add(usuario!)

    // Optional fields
    const posicion = get('posicion') ? String(get('posicion')).trim() : null
    const posicionVal = posicion && VALID_POSICIONES.find(p => p.toLowerCase() === posicion.toLowerCase()) || null
    if (posicion && !posicionVal) errors.push(`Fila ${rowNum}: Posición "${posicion}" no reconocida (se importará sin posición)`)

    const pie_habil_raw = get('pie_habil') ? String(get('pie_habil')).trim() : null
    const pie_habil = pie_habil_raw && VALID_PIE.find(p => p.toLowerCase() === pie_habil_raw.toLowerCase()) || 'Derecho'

    const edad = get('edad') ? parseInt(String(get('edad'))) : null
    const peso_kg = get('peso_kg') ? parseFloat(String(get('peso_kg'))) : null
    const estatura_cm = get('estatura_cm') ? parseInt(String(get('estatura_cm'))) : null
    const peso_ideal_min = get('peso_ideal_min') ? parseFloat(String(get('peso_ideal_min'))) : null
    const peso_ideal_max = get('peso_ideal_max') ? parseFloat(String(get('peso_ideal_max'))) : null

    // Date: accept YYYY-MM-DD or Excel serial number
    let fecha_nacimiento: string | null = null
    const fnRaw = get('fecha_nacimiento')
    if (fnRaw) {
      const fnStr = String(fnRaw).trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(fnStr)) {
        fecha_nacimiento = fnStr
      } else if (/^\d+$/.test(fnStr)) {
        // Excel serial date: days since 1900-01-01 (with Excel's leap year bug)
        const serial = parseInt(fnStr)
        const d = new Date((serial - 25569) * 86400000)
        fecha_nacimiento = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      }
    }

    const email = get('email') ? String(get('email')).trim() || null : null

    players.push({
      nombre: nombre!, usuario: usuario!, password: password!,
      posicion: posicionVal, pie_habil,
      edad: isNaN(edad!) ? null : edad,
      peso_kg: isNaN(peso_kg!) ? null : peso_kg,
      estatura_cm: isNaN(estatura_cm!) ? null : estatura_cm,
      peso_ideal_min: isNaN(peso_ideal_min!) ? null : peso_ideal_min,
      peso_ideal_max: isNaN(peso_ideal_max!) ? null : peso_ideal_max,
      email, fecha_nacimiento,
    })
  }

  return { players, errors }
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const { rows, confirm } = body

  if (!Array.isArray(rows)) return NextResponse.json({ error: 'Falta rows' }, { status: 400 })

  const { players, errors } = parseRows(rows)

  if (players.length === 0) {
    return NextResponse.json({ error: 'No se encontraron jugadores válidos.', parse_errors: errors }, { status: 400 })
  }

  // PREVIEW mode — just return what was parsed
  if (!confirm) {
    return NextResponse.json({ preview: true, players, parse_errors: errors, total: players.length })
  }

  // CONFIRM mode — check existing users and insert
  const sql = getDb()
  const clubId = s.clubId ? Number(s.clubId) : null

  try { await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS password_plain TEXT` } catch {}

  const saved: string[] = []
  const failed: string[] = []

  for (const p of players) {
    try {
      const existing = await sql`SELECT id FROM usuarios WHERE usuario = ${p.usuario} LIMIT 1`
      if (existing.length) {
        failed.push(`${p.nombre} (@${p.usuario}): usuario ya existe`)
        continue
      }
      const h = await bcrypt.hash(p.password, 10)
      const [u] = await sql`
        INSERT INTO usuarios(nombre, usuario, password_hash, password_plain, rol, club_id)
        VALUES(${p.nombre}, ${p.usuario}, ${h}, ${p.password}, 'jugador', ${clubId})
        RETURNING id`
      const po = POS_ORDER[String(p.posicion || '').toLowerCase()] ?? 99
      await sql`
        INSERT INTO jugadores(
          usuario_id, posicion, posicion_orden, edad, peso_kg, estatura_cm,
          pie_habil, email, fecha_nacimiento, hora_recordatorio, club_id,
          peso_ideal_min, peso_ideal_max
        ) VALUES(
          ${(u as any).id}, ${p.posicion ?? null}, ${po},
          ${p.edad ?? null}, ${p.peso_kg ?? null}, ${p.estatura_cm ?? null},
          ${p.pie_habil ?? 'Derecho'}, ${p.email ?? null},
          ${p.fecha_nacimiento ?? null}, '08:00', ${clubId},
          ${p.peso_ideal_min ?? null}, ${p.peso_ideal_max ?? null}
        )`
      saved.push(p.nombre)
    } catch (err: any) {
      failed.push(`${p.nombre}: ${String(err?.message || err).slice(0, 80)}`)
    }
  }

  return NextResponse.json({
    ok: true, saved: saved.length, failed: failed.length,
    saved_names: saved, failed_details: failed, parse_errors: errors,
  })
}
