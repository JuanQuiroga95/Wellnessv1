export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
function isAdmin(s:any){return s?.rol==='admin'||s?.rol==='master_admin'}

async function ensureCols(sql: any) {
  try { await sql`ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS intensidad INTEGER` } catch {}
  try { await sql`ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS objetivo VARCHAR(50)` } catch {}
  try { await sql`ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS imagen TEXT` } catch {}
  try { await sql`ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS tactical_diagram TEXT` } catch {}
  try { await sql`ALTER TABLE biblioteca_tareas ADD COLUMN IF NOT EXISTS diagram_preview TEXT` } catch {}
}

export async function GET(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const sql = getDb()
  await ensureCols(sql)
  const rows = await sql`
    SELECT * FROM biblioteca_tareas
    WHERE admin_id=${s.userId}
    ORDER BY
      CASE WHEN objetivo IS NOT NULL THEN 0 ELSE 1 END,
      CASE objetivo
        WHEN 'Fuerza' THEN 1
        WHEN 'Activación/Recuperación' THEN 2
        WHEN 'Resistencia' THEN 3
        WHEN 'Velocidad' THEN 4
        ELSE 5
      END,
      intensidad ASC NULLS LAST,
      ventana ASC NULLS LAST,
      veces_usada DESC,
      created_at DESC
    LIMIT 200
  `
  return NextResponse.json({ tareas: rows })
}

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const body = await req.json()
  const sql = getDb()
  await ensureCols(sql)

  if (body.action === 'usar') {
    await sql`UPDATE biblioteca_tareas SET veces_usada=veces_usada+1 WHERE id=${body.id} AND admin_id=${s.userId}`
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'auto_guardar') {
    const tareas: any[] = body.tareas || []
    let guardadas = 0
    for (const t of tareas) {
      if (!t.nombre && !t.ventana) continue
      const nombre = String(t.nombre || t.ventana || '').trim().slice(0, 200)
      if (!nombre) continue
      const exists = await sql`
        SELECT id FROM biblioteca_tareas
        WHERE admin_id=${s.userId}
          AND nombre=${nombre}
          AND COALESCE(ventana,'')=COALESCE(${t.ventana||null},'')
        LIMIT 1`
      if (exists.length > 0) {
        // Always update all fields so imagen, descripcion, etc. stay in sync
        await sql`
          UPDATE biblioteca_tareas SET
            subtarea     = ${t.subtarea||null},
            jugadores    = ${t.jugadores||null},
            series       = ${t.series||null},
            minutos      = ${t.minutos||null},
            pausa        = ${t.pausa||null},
            largo        = ${t.largo||null},
            ancho        = ${t.ancho||null},
            descripcion  = ${t.descripcion||null},
            intensidad   = ${t.intensidad||null},
            objetivo     = ${t.objetivo||null},
            imagen       = CASE WHEN ${t.imagen ? 'y' : 'n'} = 'y' THEN ${t.imagen||null} ELSE imagen END
          WHERE admin_id=${s.userId}
            AND nombre=${nombre}
            AND COALESCE(ventana,'')=COALESCE(${t.ventana||null},'')`
        continue
      }
      await sql`
        INSERT INTO biblioteca_tareas
          (admin_id, nombre, ventana, subtarea, jugadores, series, minutos, pausa, largo, ancho, descripcion, intensidad, objetivo, imagen, veces_usada)
        VALUES
          (${s.userId}, ${nombre}, ${t.ventana||null}, ${t.subtarea||null},
           ${t.jugadores||null}, ${t.series||null}, ${t.minutos||null},
           ${t.pausa||null}, ${t.largo||null}, ${t.ancho||null},
           ${t.descripcion||null}, ${t.intensidad||null}, ${t.objetivo||null},
           ${t.imagen||null}, 1)`
      guardadas++
    }
    return NextResponse.json({ ok: true, guardadas })
  }

  // Manual save
  const { nombre, ventana, subtarea, jugadores, series, minutos, pausa, largo, ancho, descripcion, intensidad, objetivo, imagen, tactical_diagram, diagram_preview } = body
  await sql`
    INSERT INTO biblioteca_tareas (admin_id,nombre,ventana,subtarea,jugadores,series,minutos,pausa,largo,ancho,descripcion,intensidad,objetivo,imagen,tactical_diagram,diagram_preview)
    VALUES (${s.userId},${nombre},${ventana||null},${subtarea||null},${jugadores||null},${series||null},${minutos||null},${pausa||null},${largo||null},${ancho||null},${descripcion||null},${intensidad||null},${objetivo||null},${imagen||null},${tactical_diagram||null},${diagram_preview||null})
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({error:'Falta id'},{status:400})
  const sql = getDb()
  await sql`DELETE FROM biblioteca_tareas WHERE id=${Number(id)} AND admin_id=${s.userId}`
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s||!isAdmin(s)) return NextResponse.json({error:'No autorizado'},{status:403})
  const body = await req.json()
  const { id, tactical_diagram, diagram_preview, nombre } = body
  if (!id) return NextResponse.json({error:'Falta id'},{status:400})
  const sql = getDb()
  await ensureCols(sql)
  if (tactical_diagram !== undefined) {
    await sql`UPDATE biblioteca_tareas SET tactical_diagram=${tactical_diagram||null}, diagram_preview=${diagram_preview||null} WHERE id=${Number(id)} AND admin_id=${s.userId}`
  }
  if (nombre !== undefined) {
    await sql`UPDATE biblioteca_tareas SET nombre=${nombre} WHERE id=${Number(id)} AND admin_id=${s.userId}`
  }
  return NextResponse.json({ ok: true })
}
