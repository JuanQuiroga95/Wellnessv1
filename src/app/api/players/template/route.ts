export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromRequest } from '@/lib/auth'

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

function strToBytes(s: string): Uint8Array { return new TextEncoder().encode(s) }
function writeU16(n: number) { return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF]) }
function writeU32(n: number) { return new Uint8Array([n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF]) }
function concat(...arrs: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrs.reduce((a, b) => a + b.length, 0))
  let off = 0; for (const a of arrs) { out.set(a, off); off += a.length }
  return out
}
function crc32(buf: Uint8Array): number {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) crc = t[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function colLetter(i: number): string {
  let s = ''
  while (i >= 0) { s = String.fromCharCode(65 + (i % 26)) + s; i = Math.floor(i / 26) - 1 }
  return s
}
function esc(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function buildXlsx(cols: typeof ALL_COLS): Buffer {
  const ss: string[] = []
  const ssMap = new Map<string, number>()
  const si = (s: string) => { if (!ssMap.has(s)) { ssMap.set(s, ss.length); ss.push(s) } return ssMap.get(s)! }

  const posStr = 'Portero|Defensa Central|Lateral Derecho|Lateral Izquierdo|Mediocentro Defensivo|Mediocentro|Mediocentro Ofensivo|Volante Derecho|Volante Izquierdo|Volante|Extremo Derecho|Extremo Izquierdo|Centro Delantero|Delantero'
  const instr = `PLANTILLA DE IMPORTACION DE JUGADORES | Campos obligatorios: Nombre, Usuario, Contrasena | No modificar columnas | Posiciones: ${posStr} | Pie: Derecho, Izquierdo, Ambidiestro | Fecha: YYYY-MM-DD`
  si(instr); cols.forEach(c => si(c.label))
  const ex2: Record<string,string> = { nombre:'Maria Lopez', usuario:'maria.lopez', password:'Segura456', posicion:'Portero', edad:'22', peso_kg:'65.0', estatura_cm:'170', pie_habil:'Izquierdo', email:'maria@email.com', fecha_nacimiento:'2002-11-05', peso_ideal_min:'63.0', peso_ideal_max:'67.0' }
  cols.forEach(c => { si(c.example); si(ex2[c.key] ?? c.example) })

  const cstr = (row: number, col: number, val: string, style = 0) =>
    `<c r="${colLetter(col)}${row}" t="s" s="${style}"><v>${si(val)}</v></c>`

  const lastCol = colLetter(cols.length - 1)
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="2" topLeftCell="A3" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${cols.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c.width}" customWidth="1"/>`).join('')}</cols><sheetData><row r="1" ht="36" customHeight="1"><c r="A1" t="s" s="1"><v>${si(instr)}</v></c></row><row r="2" ht="26" customHeight="1">${cols.map((c,i)=>cstr(2,i,c.label,c.required?2:3)).join('')}</row><row r="3" ht="20" customHeight="1">${cols.map((c,i)=>cstr(3,i,c.example,0)).join('')}</row><row r="4" ht="20" customHeight="1">${cols.map((c,i)=>cstr(4,i,ex2[c.key]??c.example,0)).join('')}</row></sheetData><mergeCells count="1"><mergeCell ref="A1:${lastCol}1"/></mergeCells></worksheet>`

  const ssXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${ss.length}" uniqueCount="${ss.length}">${ss.map(s=>`<si><t xml:space="preserve">${esc(s)}</t></si>`).join('')}</sst>`

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><sz val="9"/><color rgb="FF64748B"/><name val="Arial"/><i/></font><font><sz val="10"/><b/><color rgb="FFC8F135"/><name val="Arial"/></font><font><sz val="10"/><b/><color rgb="FF94A3B8"/><name val="Arial"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0A0F14"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF1E293B"/></left><right style="thin"><color rgb="FF1E293B"/></right><top style="thin"><color rgb="FF1E293B"/></top><bottom style="thin"><color rgb="FF1E293B"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment wrapText="1" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs></styleSheet>`

  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Jugadores" sheetId="1" r:id="rId1"/></sheets></workbook>`
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const ct = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`

  const files = [
    { name: '[Content_Types].xml', content: ct },
    { name: '_rels/.rels',         content: rels },
    { name: 'xl/workbook.xml',     content: wbXml },
    { name: 'xl/_rels/workbook.xml.rels', content: wbRels },
    { name: 'xl/worksheets/sheet1.xml',   content: sheetXml },
    { name: 'xl/sharedStrings.xml',       content: ssXml },
    { name: 'xl/styles.xml',              content: stylesXml },
  ]

  const localHeaders: Uint8Array[] = []
  const cdEntries: Uint8Array[] = []
  const offsets: number[] = []
  let offset = 0

  for (const file of files) {
    const data = strToBytes(file.content)
    const name = strToBytes(file.name)
    const crc = crc32(data)
    const lh = concat(
      new Uint8Array([0x50,0x4B,0x03,0x04]),
      writeU16(20), writeU16(0), writeU16(0), writeU16(0), writeU16(0),
      writeU32(crc), writeU32(data.length), writeU32(data.length),
      writeU16(name.length), writeU16(0),
      name, data,
    )
    offsets.push(offset)
    localHeaders.push(lh)
    offset += lh.length
  }

  for (let i = 0; i < files.length; i++) {
    const data = strToBytes(files[i].content)
    const name = strToBytes(files[i].name)
    const crc = crc32(data)
    cdEntries.push(concat(
      new Uint8Array([0x50,0x4B,0x01,0x02]),
      writeU16(20), writeU16(20), writeU16(0), writeU16(0), writeU16(0), writeU16(0), writeU16(0),
      writeU32(crc), writeU32(data.length), writeU32(data.length),
      writeU16(name.length), writeU16(0), writeU16(0), writeU16(0), writeU16(0), writeU32(0),
      writeU32(offsets[i]), name,
    ))
  }

  const cd = concat(...cdEntries)
  const eocd = concat(
    new Uint8Array([0x50,0x4B,0x05,0x06]),
    writeU16(0), writeU16(0),
    writeU16(files.length), writeU16(files.length),
    writeU32(cd.length), writeU32(offset), writeU16(0),
  )
  return Buffer.from(concat(...localHeaders, cd, eocd))
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const colsParam = req.nextUrl.searchParams.get('cols')
  const selectedKeys = colsParam ? colsParam.split(',').map(k => k.trim()).filter(Boolean) : ALL_COLS.map(c => c.key)

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
