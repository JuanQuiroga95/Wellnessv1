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

    // ── Auto-repair: migrate orphan sesiones_plan (admin_id sin club_id) al club actual ──
    // Runs silently every time; only touches rows that still have club_id IS NULL.
    if (clubId) {
      try {
        await sql`
          UPDATE sesiones_plan
          SET club_id = ${clubId}
          WHERE admin_id = ${s.userId}
            AND club_id IS NULL`
      } catch { /* ignore if table doesn't exist yet */ }
    }

    const sesiones = clubId ? await sql`
      SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
             objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
             rival, rival_foto, cancha_id
      FROM sesiones_plan
      WHERE club_id = ${clubId}
        AND fecha >= ${desde}::date AND fecha < ${hastaInc}::date
      ORDER BY fecha, hora_inicio NULLS LAST`
    : await sql`
      SELECT id, fecha::text, hora_inicio::text, hora_fin::text, tipo, titulo,
             objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
             rival, rival_foto, cancha_id
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
          WITH ranked_logs AS (
            SELECT el.fecha, el.rpe, el.tipo_sesion,
                   ROW_NUMBER() OVER(PARTITION BY el.jugador_id, el.fecha ORDER BY el.id DESC) as rn
            FROM entrenamiento_logs el
            JOIN jugadores j ON j.id = el.jugador_id
            JOIN usuarios u ON u.id = j.usuario_id
            WHERE el.fecha >= ${desde}::date AND el.fecha < ${hastaInc}::date
              AND (u.club_id = ${s.clubId} OR j.club_id = ${s.clubId})
              AND u.activo = true
          )
          SELECT fecha::text,
                 MAX(rpe) FILTER (WHERE tipo_sesion IS NULL OR tipo_sesion NOT IN ('PARCIAL', 'READAPTACION'))::int AS max_rpe, 
                 ROUND(AVG(rpe) FILTER (WHERE tipo_sesion IS NULL OR tipo_sesion NOT IN ('PARCIAL', 'READAPTACION'))::numeric,1)::float AS avg_rpe, 
                 COUNT(*)::int AS n
          FROM ranked_logs
          WHERE rn = 1
          GROUP BY fecha
          ORDER BY fecha` as any[]
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
            descripcion, ejercicios, rpe_objetivo, notas, rival, rival_foto, cancha_id } = b
    if (!fecha) return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    const sql = getDb()

    const [r] = await sql`
      INSERT INTO sesiones_plan(admin_id, club_id, fecha, hora_inicio, hora_fin, tipo, titulo,
                                 objetivo, objetivo_secundario, descripcion, ejercicios, rpe_objetivo, notas,
                                 rival, rival_foto, cancha_id)
      VALUES(${s.userId}, ${s.clubId ? Number(s.clubId) : null}, ${fecha},
             ${hora_inicio || null}, ${hora_fin || null},
             ${tipo || 'entrenamiento'}, ${titulo || null}, ${objetivo || null},
             ${objetivo_secundario || null}, ${descripcion || null},
             ${JSON.stringify(ejercicios || [])}::jsonb,
             ${rpe_objetivo || null}, ${notas || null},
             ${rival || null}, ${rival_foto || null}, ${cancha_id ? Number(cancha_id) : null})
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
            descripcion, ejercicios, rpe_objetivo, notas, rival, rival_foto, cancha_id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const sql = getDb()

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
        rival_foto         = CASE WHEN ${rival_foto !== undefined ? 'y' : 'n'} = 'y' THEN ${rival_foto ?? null} ELSE rival_foto END,
        cancha_id          = CASE WHEN ${cancha_id !== undefined ? 'y' : 'n'} = 'y' THEN ${cancha_id ? Number(cancha_id) : null} ELSE cancha_id END
      WHERE id = ${id} AND admin_id = ${s.userId}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[calendario PATCH error]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req)
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    
    const { searchParams } = new URL(req.url)
    const borrarTodo = searchParams.get('all') === 'true'
    const sql = getDb()
    const clubId = s.clubId ? Number(s.clubId) : null

    if (borrarTodo) {
      if (clubId) {
        await sql`DELETE FROM sesiones_plan WHERE club_id = ${clubId}`;
      }
      await sql`DELETE FROM sesiones_plan WHERE admin_id = ${s.userId} AND club_id IS NULL`;

      try {
        if (clubId) {
          // Vía 1: jugadores con club_id directo
          await sql`DELETE FROM partido_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`.catch(() => {});
          await sql`DELETE FROM entrenamiento_logs WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`.catch(() => {});
          await sql`DELETE FROM entrenamiento_log WHERE jugador_id IN (SELECT id FROM jugadores WHERE club_id = ${clubId})`.catch(() => {});

          // Vía 2: por club_id directo en los logs (registros huérfanos o bien escritos)
          await sql`DELETE FROM partido_logs WHERE club_id = ${clubId}`.catch(() => {});
          await sql`DELETE FROM entrenamiento_logs WHERE club_id = ${clubId}`.catch(() => {});

          // Vía 3: jugadores con club_id IS NULL pero cuyo usuario sí pertenece al club (bug de sync)
          await sql`
            DELETE FROM partido_logs
            WHERE jugador_id IN (
              SELECT j.id FROM jugadores j
              JOIN usuarios u ON u.id = j.usuario_id
              WHERE j.club_id IS NULL AND u.club_id = ${clubId}
            )`.catch(() => {});
          await sql`
            DELETE FROM entrenamiento_logs
            WHERE jugador_id IN (
              SELECT j.id FROM jugadores j
              JOIN usuarios u ON u.id = j.usuario_id
              WHERE j.club_id IS NULL AND u.club_id = ${clubId}
            )`.catch(() => {});

          // Vía 4: directo por usuario.club_id — cubre cuando jugadores.club_id ya fue reparado
          // (el auto-repair de minutos/route.ts puede correr antes y dejar club_id != NULL)
          await sql`
            DELETE FROM partido_logs
            WHERE jugador_id IN (
              SELECT j.id FROM jugadores j
              JOIN usuarios u ON u.id = j.usuario_id
              WHERE u.club_id = ${clubId}
            )`.catch(() => {});
          await sql`
            DELETE FROM entrenamiento_logs
            WHERE jugador_id IN (
              SELECT j.id FROM jugadores j
              JOIN usuarios u ON u.id = j.usuario_id
              WHERE u.club_id = ${clubId}
            )`.catch(() => {});
        }
      } catch (e) { console.log("Error silencioso en borrado de logs"); }

      return NextResponse.json({ ok: true, deleted: 'all' });
    }

    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    if (clubId) {
      // Admin con club: borrar si fue creada por este admin O pertenece al club
      await sql`DELETE FROM sesiones_plan WHERE id = ${id} AND (admin_id = ${s.userId} OR club_id = ${clubId})`;
    } else {
      // Admin sin club: solo borrar sus propias sesiones sin club
      await sql`DELETE FROM sesiones_plan WHERE id = ${id} AND admin_id = ${s.userId} AND club_id IS NULL`;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[calendario DELETE error]', err)
    return NextResponse.json({ ok: true, partial: true, error: String(err) });
  }
}
