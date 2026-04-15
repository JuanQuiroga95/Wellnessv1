export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'
import { rateLimit } from '@/lib/security'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function localDaysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export async function GET(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const desde = searchParams.get('desde') || localToday().slice(0,7) + '-01'
    const hasta = searchParams.get('hasta') || localToday()
    const sql = getDb()

    const hastaInc = (() => {
      const d = new Date(hasta + 'T12:00:00Z')
      d.setUTCDate(d.getUTCDate() + 1)
      return d.toISOString().split('T')[0]
    })()

    const clubId = s.clubId ? Number(s.clubId) : null

    const sesiones = clubId ? await sql`
      SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
             objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
             rival, rival_foto
      FROM sesiones_plan
      WHERE club_id = ${clubId}
        AND fecha >= ${desde}::date AND fecha < ${hastaInc}::date
      ORDER BY fecha, hora_inicio NULLS LAST`
    : await sql`
      SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
             objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
             rival, rival_foto
      FROM sesiones_plan
      WHERE admin_id = ${s.userId}
        AND club_id IS NULL
        AND fecha >= ${desde}::date AND fecha < ${hastaInc}::date
      ORDER BY fecha, hora_inicio NULLS LAST`

    let partidos: any[] = []
    try {
      if (s.clubId != null) {
        const raw = await sql`
          SELECT pl.fecha::text, pl.rival, pl.tipo_partido, pl.rival_foto
          FROM partido_logs pl
          JOIN jugadores j ON j.id = pl.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE pl.fecha >= ${desde}::date AND pl.fecha < ${hastaInc}::date
            AND u.club_id = ${s.clubId}
          ORDER BY pl.fecha DESC`
        const seen = new Set<string>()
        for (const r of raw as any[]) {
          const key = `${r.fecha}__${r.rival}`
          if (!seen.has(key)) { seen.add(key); partidos.push(r) }
        }
      }
    } catch { partidos = [] }

    let logs: any[] = []
    try {
      if (s.clubId != null) {
        logs = await sql`
          SELECT el.fecha::text, MAX(el.rpe)::int AS max_rpe, ROUND(AVG(el.rpe)::numeric,1)::float AS avg_rpe, COUNT(*)::int AS n
          FROM entrenamiento_logs el
          JOIN jugadores j ON j.id = el.jugador_id
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE el.fecha >= ${desde}::date AND el.fecha < ${hastaInc}::date
            AND u.club_id = ${s.clubId}
          GROUP BY el.fecha
          ORDER BY el.fecha` as any[]
      }
    } catch { logs = [] }

    return NextResponse.json({ sesiones, partidos, logs })
  } catch (err) {
    console.error('[calendario GET error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 100, windowMs: 60 * 1000, key: 'calendario' })
  if (!rl.allowed) return rl.response!
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const b = await req.json()
    const { fecha, hora_inicio, hora_fin, tipo, titulo, objetivo, objetivo_secundario,
            descripcion, ejercicios, rpe_objetivo, notas, rival, rival_foto } = b
    if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    const sql = getDb()

    try {
      await sql`ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival TEXT`
      await sql`ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival_foto TEXT`
    } catch {}

    const [r] = await sql`
      INSERT INTO sesiones_plan(admin_id, club_id, fecha, hora_inicio, hora_fin, tipo, titulo,
                                objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
                                rival, rival_foto)
      VALUES(${s.userId}, ${s.clubId ? Number(s.clubId) : null}, ${fecha},
             ${hora_inicio || null}, ${hora_fin || null},
             ${tipo || 'entrenamiento'}, ${titulo || null}, ${objetivo || null},
             ${objetivo_secundario || null}, ${descripcion || null},
             ${JSON.stringify(ejercicios || [])}::jsonb,
             ${rpe_objetivo || null}, ${notas || null},
             ${rival || null}, ${rival_foto || null})
      RETURNING id, fecha::text`
    return NextResponse.json(r)
  } catch (err) {
    console.error('[calendario POST error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const { id, fecha, hora_inicio, hora_fin, tipo, titulo, objetivo, objetivo_secundario,
            descripcion, ejercicios, rpe_objetivo, notas, rival, rival_foto } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const sql = getDb()

    try {
      await sql`ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival TEXT`
      await sql`ALTER TABLE sesiones_plan ADD COLUMN IF NOT EXISTS rival_foto TEXT`
    } catch {}

    await sql`
      UPDATE sesiones_plan SET
        fecha               = COALESCE(${fecha ?? null}, fecha),
        hora_inicio        = COALESCE(${hora_inicio ?? null}, hora_inicio),
        hora_fin           = COALESCE(${hora_fin ?? null}, hora_fin),
        tipo               = COALESCE(${tipo ?? null}, tipo),
        titulo             = COALESCE(${titulo ?? null}, titulo),
        objetivo           = COALESCE(${objetivo ?? null}, objetivo),
        objetivo_secundario= COALESCE(${objetivo_secundario ?? null}, objetivo_secundario),
        descripcion        = COALESCE(${descripcion ?? null}, descripcion),
        ejercicios         = CASE WHEN ${ejercicios !== undefined ? 'y' : 'n'} = 'y'
                               THEN ${JSON.stringify(ejercicios ?? [])}::jsonb
                               ELSE ejercicios END,
        rpe_objetivo       = COALESCE(${rpe_objetivo ?? null}, rpe_objetivo),
        notas              = COALESCE(${notas ?? null}, notas),
        rival              = CASE WHEN ${rival !== undefined ? 'y' : 'n'} = 'y' THEN ${rival ?? null} ELSE rival END,
        rival_foto         = CASE WHEN ${rival_foto !== undefined ? 'y' : 'n'} = 'y' THEN ${rival_foto ?? null} ELSE rival_foto END
      WHERE id = ${id} AND admin_id = ${s.userId}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[calendario PATCH error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// --- MÉTODO DELETE CORREGIDO ---
export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    
    const { searchParams } = new URL(req.url)
    const borrarTodo = searchParams.get('all') === 'true'
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (borrarTodo) {
      // 1. Borramos las sesiones del plan
      if (clubId) {
        await sql`DELETE FROM sesiones_plan WHERE club_id = ${clubId}`;
      }
      await sql`DELETE FROM sesiones_plan WHERE admin_id = ${s.userId} AND club_id IS NULL`;

      // 2. Borramos los logs de partidos (Lo que hace que aparezca "Rival: San Martín")
      try {
        if (clubId) {
          await sql`DELETE FROM partido_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`.catch(() => {});
        }
      } catch (e) { console.log("No hay partido_logs"); }

      // 3. Borramos los logs de entrenamiento (RPE/Carga)
      try {
        if (clubId) {
          await sql`DELETE FROM entrenamiento_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`.catch(() => {});
          await sql`DELETE FROM entrenamiento_log WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`.catch(() => {});
        }
      } catch (e) { console.log("No hay entrenamiento_logs"); }

      return NextResponse.json({ ok: true, deleted: 'all' });
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await sql`DELETE FROM sesiones_plan WHERE id = ${id} AND admin_id = ${s.userId}`;
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[calendario DELETE error]', err)
    return NextResponse.json({ ok: true, partial: true, error: String(err) });
  }
}
}
