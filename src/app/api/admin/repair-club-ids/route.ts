export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const s = await getSessionFromRequest(req)
  if (!s || s.rol !== 'master_admin') {
    return NextResponse.json({ error: 'Solo master_admin' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const action = body.action // 'repair' | 'delete_club_data'
  const clubId = body.club_id ? Number(body.club_id) : null
  const sql = getDb()

  // ── ACTION: repair ──────────────────────────────────────────────────────────
  // Rellena club_id = NULL en todas las tablas de logs, siguiendo la cadena:
  // entrenamiento_logs/wellness_logs/partido_logs/gps_logs → jugadores → usuarios → club_id
  if (action === 'repair') {
    const tables = [
      'entrenamiento_logs',
      'wellness_logs',
      'partido_logs',
      'gps_logs',
      'lesiones',
      'cmj_sessions',
      'iso_sessions',
      'rsi_tests',
      'dsi_tests',
      'pfv_sesiones',
      'pfv_puntos',
      'pesajes',
      'evaluaciones',
    ]

    const results: Record<string, number> = {}

    for (const table of tables) {
      try {
        const r = await sql`
          UPDATE ${sql(table)} t
          SET club_id = u.club_id
          FROM jugadores j
          JOIN usuarios u ON u.id = j.usuario_id
          WHERE t.jugador_id = j.id
            AND t.club_id IS NULL
            AND u.club_id IS NOT NULL`
        results[table] = (r as any).count ?? 0
      } catch (e) {
        // Table may not have jugador_id or may not exist — skip
        results[table] = -1
      }
    }

    // Also repair jugadores.club_id from usuarios
    try {
      await sql`
        UPDATE jugadores j
        SET club_id = u.club_id
        FROM usuarios u
        WHERE u.id = j.usuario_id
          AND j.club_id IS NULL
          AND u.club_id IS NOT NULL`
    } catch {}

    // Also repair sesiones_plan — uses admin_id → usuarios.club_id
    try {
      await sql`
        UPDATE sesiones_plan sp
        SET club_id = u.club_id
        FROM usuarios u
        WHERE sp.admin_id = u.id
          AND sp.club_id IS NULL
          AND u.club_id IS NOT NULL`
      results['sesiones_plan'] = 0
    } catch {}

    return NextResponse.json({ ok: true, action: 'repair', repaired: results })
  }

  // ── ACTION: delete_club_data ─────────────────────────────────────────────────
  // Borra datos de un club. Si se pasan 'categories', borra solo esas.
  // Categorías: wellness | rpe | partidos | gps | calendario | biblioteca | evaluaciones | lesiones | jugadores
  if (action === 'delete_club_data') {
    if (!clubId) return NextResponse.json({ error: 'club_id requerido' }, { status: 400 })

    // Las categorías a borrar — si no se pasan, se borran todas (compatibilidad hacia atrás)
    const categories: string[] = Array.isArray(body.categories)
      ? body.categories
      : ['wellness','rpe','partidos','gps','calendario','biblioteca','evaluaciones','lesiones','jugadores']

    const has = (cat: string) => categories.includes(cat)

    // Get all jugador IDs for this club
    const jugadores = await sql`
      SELECT j.id FROM jugadores j
      JOIN usuarios u ON u.id = j.usuario_id
      WHERE u.club_id = ${clubId}`
    const jIds = (jugadores as any[]).map(r => r.id)

    // Get admin_id(s) of coaches for this club (needed for sesiones_plan, biblioteca_tareas)
    const admins = await sql`
      SELECT id FROM usuarios WHERE club_id = ${clubId} AND rol IN ('admin','master_admin')`
    const adminIds = (admins as any[]).map(r => r.id)

    // ── Borrado por jugador_id (más seguro, cubre todos los registros) ──
    if (jIds.length > 0) {
      if (has('wellness'))     await sql`DELETE FROM wellness_logs      WHERE jugador_id = ANY(${jIds}::int[])`
      if (has('rpe'))          await sql`DELETE FROM entrenamiento_logs WHERE jugador_id = ANY(${jIds}::int[])`
      if (has('partidos'))     await sql`DELETE FROM partido_logs       WHERE jugador_id = ANY(${jIds}::int[])`
      if (has('gps'))          await sql`DELETE FROM gps_logs           WHERE jugador_id = ANY(${jIds}::int[])`
      if (has('lesiones'))     await sql`DELETE FROM lesiones           WHERE jugador_id = ANY(${jIds}::int[])`
      if (has('evaluaciones')) {
        await sql`DELETE FROM evaluaciones  WHERE jugador_id = ANY(${jIds}::int[])`
        await sql`DELETE FROM pesajes       WHERE jugador_id = ANY(${jIds}::int[])`
        await sql`DELETE FROM cmj_sessions  WHERE jugador_id = ANY(${jIds}::int[])`
        await sql`DELETE FROM iso_sessions  WHERE jugador_id = ANY(${jIds}::int[])`
        try { await sql`DELETE FROM rsi_tests    WHERE jugador_id = ANY(${jIds}::int[])` } catch {}
        try { await sql`DELETE FROM dsi_tests    WHERE jugador_id = ANY(${jIds}::int[])` } catch {}
        try { await sql`DELETE FROM pfv_puntos   WHERE jugador_id = ANY(${jIds}::int[])` } catch {}
        try { await sql`DELETE FROM pfv_sesiones WHERE jugador_id = ANY(${jIds}::int[])` } catch {}
      }
    }

    // ── Borrado por club_id directo (captura registros huérfanos) ──
    if (has('wellness'))     await sql`DELETE FROM wellness_logs      WHERE club_id = ${clubId}`
    if (has('rpe'))          await sql`DELETE FROM entrenamiento_logs WHERE club_id = ${clubId}`
    if (has('partidos'))     await sql`DELETE FROM partido_logs       WHERE club_id = ${clubId}`
    if (has('gps'))          await sql`DELETE FROM gps_logs           WHERE club_id = ${clubId}`
    if (has('lesiones'))     { try { await sql`DELETE FROM lesiones   WHERE club_id = ${clubId}` } catch {} }
    if (has('evaluaciones')) {
      try { await sql`DELETE FROM evaluaciones WHERE club_id = ${clubId}` } catch {}
      try { await sql`DELETE FROM pesajes      WHERE club_id = ${clubId}` } catch {}
    }

    // ── Calendario: sesiones_plan (por club_id y por admin_id) ──
    if (has('calendario')) {
      await sql`DELETE FROM sesiones_plan WHERE club_id = ${clubId}`
      if (adminIds.length > 0) {
        await sql`DELETE FROM sesiones_plan WHERE admin_id = ANY(${adminIds}::int[])`
      }
    }

    // ── Biblioteca de tareas (solo por admin_id) ──
    if (has('biblioteca') && adminIds.length > 0) {
      await sql`DELETE FROM biblioteca_tareas WHERE admin_id = ANY(${adminIds}::int[])`
    }

    // ── Jugadores y usuarios ──
    if (has('jugadores')) {
      if (jIds.length > 0) {
        await sql`DELETE FROM jugadores WHERE id = ANY(${jIds}::int[])`
      }
      await sql`DELETE FROM usuarios WHERE rol = 'jugador' AND club_id = ${clubId}`
    }

    return NextResponse.json({ ok: true, action: 'delete_club_data', club_id: clubId, categories, deleted_jugadores: has('jugadores') ? jIds.length : 0 })
  }

  return NextResponse.json({ error: 'action inválido (repair | delete_club_data)' }, { status: 400 })
}
