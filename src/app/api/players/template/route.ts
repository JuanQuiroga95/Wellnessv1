export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'
import * as XLSX from 'xlsx'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

export const ALL_COLS = [
  { key: 'nombre',           label: 'Nombre Completo *',    required: true,  example: 'Juan Garcia',       width: 26 },
  { key: 'usuario',          label: 'Usuario *',            required: true,  example: 'juan.garcia',       width: 18 },
  { key: 'password',         label: 'Contrasena *',         required: true,  example: 'minimo6chars',      width: 18 },
  { key: 'posicion',         label: 'Posicion',             required: false, example: 'Delantero',         width: 22 },
  { key: 'edad',             label: 'Edad',                 required: false, example: '23',                width: 8  },
  { key: 'peso_kg',          label: 'Peso (kg)',            required: false, example: '75.5',              width: 10 },
  { key: 'estatura_cm',      label: 'Estatura (cm)',        required: false, example: '178',               width: 12 },
  { key: 'pie_habil',        label: 'Pie Habil',            required: false, example: 'Derecho',           width: 12 },
  { key: 'email',            label: 'Email',                required: false, example: 'jugador@email.com', width: 26 },
  { key: 'fecha_nacimiento', label: 'Fecha Nacimiento',     required: false, example: '2001-05-15',        width: 16 },
  { key: 'peso_ideal_min',   label: 'Peso Ideal Min (kg)',  required: false, example: '72.0',              width: 16 },
  { key: 'peso_ideal_max',   label: 'Peso Ideal Max (kg)',  required: false, example: '76.0',              width: 16 },
]

const ex2: Record<string, string> = {
  nombre: 'Maria Lopez', usuario: 'maria.lopez', password: 'Segura456',
  posicion: 'Portero', edad: '22', peso_kg: '65.0', estatura_cm: '170',
  pie_habil: 'Izquierdo', email: 'maria@email.com', fecha_nacimiento: '2002-11-05',
  peso_ideal_min: '63.0', peso_ideal_max: '67.0',
}

function buildXlsx(cols: typeof ALL_COLS): Buffer {
  const wb = XLSX.utils.book_new()

  const posStr = 'Portero|Defensa Central|Lateral Derecho|Lateral Izquierdo|Mediocentro Defensivo|Mediocentro|Mediocentro Ofensivo|Volante Derecho|Volante Izquierdo|Extremo Derecho|Extremo Izquierdo|Centro Delantero|Delantero'
  const instruccion = `PLANTILLA DE IMPORTACION DE JUGADORES | Campos obligatorios: Nombre, Usuario, Contrasena | No modificar columnas | Posiciones: ${posStr} | Pie: Derecho, Izquierdo, Ambidiestro | Fecha: YYYY-MM-DD`

  const headerRow = cols.map(c => c.label)
  const example1  = cols.map(c => c.example)
  const example2  = cols.map(c => ex2[c.key] ?? c.example)

  const aoa = [
    [instruccion, ...Array(cols.length - 1).fill('')],
    headerRow,
    example1,
    example2,
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  ws['!cols'] = cols.map(c => ({ wch: c.width }))
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }]

  XLSX.utils.book_append_sheet(wb, ws, 'Jugadores')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buf)
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const colsParam = req.nextUrl.searchParams.get('cols')
  const selectedKeys = colsParam
    ? colsParam.split(',').map(k => k.trim()).filter(Boolean)
    : ALL_COLS.map(c => c.key)

  const required = ALL_COLS.filter(c => c.required)
  const optional = ALL_COLS.filter(c => !c.required && selectedKeys.includes(c.key))
  const cols = [...required, ...optional]

  const bytes = buildXlsx(cols)
  return new NextResponse(bytes, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_jugadores.xlsx"',
      'Content-Length': String(bytes.length),
    },
  })
}
