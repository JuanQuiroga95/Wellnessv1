export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSessionFromRequest } from '@/lib/auth'

function isAdmin(s: any) { return s?.rol === 'admin' || s?.rol === 'master_admin' }

function normStr(s: string): string {
  return (s || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, ' ')
}
const normalizeName = normStr

const METRIC_COL_MAP: Array<[string, string]> = [
  ['total distance','dist_total'],['total dist','dist_total'],['tot dist','dist_total'],
  ['distancia total','dist_total'],['meterage per minute','dist_per_min'],['dist per min','dist_per_min'],
  ['high speed running','dist_hir'],['hsr','dist_hir'],['alta intensidad','dist_hir'],
  ['vel b4','dist_v4'],['velocity band 4','dist_v4'],['15-20','dist_v4'],
  ['vel b5','dist_v5'],['velocity band 5','dist_v5'],['sprint distance','dist_v5'],['20-25','dist_v5'],
  ['player load','player_load'],['max velocity','max_velocity'],['top speed','max_velocity'],['vmax','max_velocity'],
  ['acc b2','acc2'],['acc 2','acc2'],['aceleraciones b2','acc2'],
  ['dec b2','dec2'],['dec 2','dec2'],['desaceleraciones b2','dec2'],
  ['n sprints','n_sprints'],['number of sprints','n_sprints']
]

function cleanCatapultName(raw: string): string {
  const cleaned = raw.trim().replace(/\.$/, '');
  const parts = cleaned.split(/\s+/);
  if (parts.length === 2 && parts[0].toUpperCase() === parts[1].toUpperCase()) return parts[0];
  if (parts.length >= 4) {
    const half = Math.floor(parts.length / 2);
    if (parts.slice(0, half).join(' ') === parts.slice(half).join(' ')) return parts.slice(0, half).join(' ');
  }
  return cleaned;
}

// LECTOR ROBUSTO: Maneja nombres y datos en la misma línea o en líneas separadas
function parsePdfFromText(rawText: string): Record<string, any>[] {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const results: Record<string, any>[] = [];
  let lastNameFound: string | null = null;

  for (const line of lines) {
    const parts = line.split(/\s+/);
    let dataStart = parts.length;
    while (dataStart > 0 && /^[\d,.]+$/.test(parts[dataStart - 1])) { dataStart--; }

    const numericParts = parts.slice(dataStart);
    const nameParts = parts.slice(0, dataStart);
    const nameFromLine = nameParts.join(' ').trim();

    // Si la línea tiene números, procesamos el jugador
    if (numericParts.length >= 3) {
      const metricas: Record<string, number> = {};
      const colOrder = ['dist_total', 'dist_per_min', 'dist_v4', 'dist_hir', 'dist_v5', 'n_sprints', 'acc2', 'dec2', 'max_velocity'];
      
      for (let i = 0; i < numericParts.length && i < colOrder.length; i++) {
        const val = parseFloat(numericParts[i].replace(',', '.'));
        if (!isNaN(val)) metricas[colOrder[i]] = val;
      }

      // El nombre puede venir en esta línea o haber quedado de la línea anterior (PDFs partidos)
      const finalName = nameFromLine || lastNameFound;
      if (finalName) {
        const cleanName = cleanCatapultName(finalName);
        const sn = normStr(cleanName);
        // Filtro estricto para no confundir nombres reales (ej: Max) con promedios
        const isSummary = (sn === 'promedio' || sn === 'max' || sn === 'average' || sn === 'total' || sn === 'media');
        if (!isSummary) {
          results.push({ nombre_catapult: cleanName, nombre_norm: normalizeName(cleanName), metricas });
        }
      }
      lastNameFound = null; // Limpiamos el buffer
    } else if (nameFromLine.length > 2) {
      // Si la línea no tiene números pero parece un nombre, lo guardamos para la siguiente
      lastNameFound = nameFromLine;
    }
  }
  return results;
}

async function matchPlayers(rows: Record<string,any>[], clubId: number|null) {
  const sql = getDb();
  const jugadores = clubId ? await sql`
    SELECT j.id, u.nombre FROM jugadores j 
    JOIN usuarios u ON u.id = j.usuario_id 
    WHERE (u.club_id = ${clubId} OR j.club_id = ${clubId}) AND u.activo = true
  ` : [];
  
  const matched: any[] = [], unmatched: string[] = [];
  for (const row of rows) {
    const pdfNorm = row.nombre_norm;
    let jug = (jugadores as any[]).find(j => {
      const dbNorm = normalizeName(j.nombre);
      const dbWords = dbNorm.split(' '), pdfWords = pdfNorm.split(' ');
      // Match por palabra (Enoch Enoch -> Enoch) o inclusión total
      return pdfWords.some(pw => dbWords.includes(pw) && pw.length > 2) || dbNorm.includes(pdfNorm) || pdfNorm.includes(dbNorm);
    });

    if (jug) {
      matched.push({ 
        ...row, 
        jugador_id: jug.id, 
        jugador_nombre: jug.nombre, 
        match_method: 'parcial', 
        n_metricas: Object.keys(row.metricas||{}).length,
        sin_datos: false
      });
    } else {
      unmatched.push(row.nombre_catapult);
    }
  }
  return { matched, unmatched };
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionFromRequest(req);
    if (!s || !isAdmin(s)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    const body = await req.json(), { fecha, tipo_sesion, sesion_id, confirm, pdfText, rows } = body;
    if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });

    let parsedRows: any[] = (rows && Array.isArray(rows)) ? rows : (pdfText ? parsePdfFromText(pdfText) : []);
    if (!parsedRows.length) return NextResponse.json({ error: 'No se encontraron datos.' }, { status: 400 });
    
    const { matched, unmatched } = await matchPlayers(parsedRows, s.clubId || null);
    
    if (!confirm) {
      return NextResponse.json({ 
        preview: true, fecha, tipo_sesion, sesion_id, matched, unmatched,
        fuente: pdfText ? 'pdf' : 'excel',
        total_filas: parsedRows.length,
        columnas_detectadas: Object.keys(parsedRows[0]?.metricas||{})
      });
    }

    const sql = getDb(), clubId = s.clubId ? Number(s.clubId) : null;
    if (clubId) await sql`DELETE FROM gps_logs WHERE club_id = ${clubId} AND fecha = ${fecha}::date AND tipo_sesion = ${tipo_sesion}`;
    
    for (const m of matched) {
      const met = m.metricas || {};
      await sql`INSERT INTO gps_logs (jugador_id, club_id, fecha, sesion_id, tipo_sesion, dist_total, dist_hir, dist_v4, dist_v5, player_load, max_velocity, acc2, dec2, dist_per_min, n_sprints, metricas)
                VALUES (${m.jugador_id}, ${clubId}, ${fecha}, ${sesion_id}, ${tipo_sesion}, ${met.dist_total||0}, ${met.dist_hir||0}, ${met.dist_v4||0}, ${met.dist_v5||0}, ${met.player_load||0}, ${met.max_velocity||0}, ${met.acc2||0}, ${met.dec2||0}, ${met.dist_per_min||0}, ${met.n_sprints||0}, ${JSON.stringify(met)})`;
    }
    return NextResponse.json({ ok: true, saved: matched.length, unmatched });
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }); }
}