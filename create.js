require('dotenv').config({path:'.env.local'});
const { neon } = require('@neondatabase/serverless');
async function main() {
  const sql = neon(process.env.POSTGRES_URL || process.env.DATABASE_URL);
  let c;
  const existing = await sql`SELECT id FROM clubs WHERE nombre = 'No Convocados'`;
  if(existing.length > 0) c = existing[0].id;
  else {
    const r = await sql`INSERT INTO clubs (nombre, pais) VALUES ('No Convocados', 'Panamá') RETURNING id`;
    c = r[0].id;
  }
  const admins = await sql`SELECT DISTINCT admin_id FROM admin_clubs`;
  for(const ad of admins) {
    await sql`INSERT INTO admin_clubs (admin_id, club_id) VALUES (${ad.admin_id}, ${c}) ON CONFLICT DO NOTHING`;
  }
  console.log('Club No Convocados ID:', c);
}
main().catch(console.error);
