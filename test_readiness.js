const { getDb } = require('./src/lib/db')

async function run() {
  const sql = getDb()
  try {
    const clubId = 1
    const isMaster = false
    const todayRows = await sql`
      SELECT j.id AS jugador_id, u.nombre, j.posicion, j.foto_url,
             COALESCE(ROUND(AVG(w.fatiga))::int+ROUND(AVG(w.calidad_sueno))::int+ROUND(AVG(w.dolor_muscular))::int+ROUND(AVG(w.nivel_estres))::int+ROUND(AVG(w.estado_animo))::int, null) AS total_wellness,
             ROUND(AVG(w.fatiga))::int AS fatiga, ROUND(AVG(w.calidad_sueno))::int AS calidad_sueno,
             ROUND(AVG(w.dolor_muscular))::int AS dolor_muscular, ROUND(AVG(w.nivel_estres))::int AS nivel_estres,
             ROUND(AVG(w.estado_animo))::int AS estado_animo,
             ROUND(AVG(w.tqr))::int AS tqr, MAX(w.dolor_zona) AS dolor_zona, MAX(w.dolor_eva)::int AS dolor_eva,
             BOOL_AND(w.entrena_grupo::boolean) AS entrena_grupo, 
             (BOOL_OR(w.fue_gimnasio::boolean) OR EXISTS(SELECT 1 FROM entrenamiento_logs el WHERE el.jugador_id = j.id AND el.fecha >= CURRENT_DATE - 2 AND el.rpe_gimnasio > 0)) AS fue_gimnasio,
             MAX(w.fecha) AS registro_fecha
      FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id
      LEFT JOIN wellness_logs w ON w.jugador_id=j.id AND w.fecha >= CURRENT_DATE - 2
      WHERE u.rol='jugador' AND u.activo=true
        AND (${isMaster}::boolean OR (u.club_id=${clubId} OR j.club_id=${clubId}))
      GROUP BY j.id, u.nombre, j.posicion, j.foto_url
      ORDER BY j.id`
    console.log("Readiness query successful", todayRows.length)
  } catch (err) {
    console.error("Readiness query failed", err)
  }
}

run().then(() => process.exit())
