const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  const result = await sql`
    SELECT c.nombre, COUNT(g.id) as logs
    FROM gps_logs g
    JOIN sesiones_plan s ON s.id = g.sesion_id
    LEFT JOIN canchas c ON c.id = s.cancha_id
    GROUP BY c.nombre
  `;
  console.log(JSON.stringify(result, null, 2));
}

check();
