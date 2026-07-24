export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import bcrypt from 'bcryptjs'

// One-time setup endpoint — creates master_admin and backfills existing data into a default club
// Call: POST /api/master/setup  { secret: "SETUP_SECRET", masterUsuario: "Franco.Toso" }
export async function POST(req: NextRequest) {
  const { secret, masterUsuario } = await req.json()
  if (secret !== (process.env.SETUP_SECRET || 'wellness-master-setup-2024')) {
    return NextResponse.json({error:'Secreto incorrecto'},{status:403})
  }
  const sql = getDb()

  // 1. Run schema migrations for clubs
  await sql`CREATE TABLE IF NOT EXISTS clubs (id SERIAL PRIMARY KEY, nombre VARCHAR(100) NOT NULL, logo_url TEXT, created_at TIMESTAMPTZ DEFAULT NOW())`
  await sql`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS club_id INTEGER REFERENCES clubs(id)`
  await sql`ALTER TABLE jugadores ADD COLUMN IF NOT EXISTS club_id INTEGER`
  await sql`ALTER TABLE entrenamiento_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`
  await sql`ALTER TABLE wellness_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`
  await sql`ALTER TABLE partido_logs ADD COLUMN IF NOT EXISTS club_id INTEGER`
  await sql`ALTER TABLE lesiones ADD COLUMN IF NOT EXISTS club_id INTEGER`

  // 2. Promote masterUsuario to master_admin (no club_id)
  const usuario = masterUsuario || 'Franco.Toso'
  const updated = await sql`UPDATE usuarios SET rol='master_admin', club_id=NULL WHERE usuario=${usuario} RETURNING id,nombre`
  if (!updated.length) {
    return NextResponse.json({error:`Usuario '${usuario}' no encontrado`},{status:404})
  }

  // 3. Create default club with existing coaches' data
  const existingCoaches = await sql`SELECT id,nombre FROM usuarios WHERE rol='admin' AND club_id IS NULL`
  
  const results: any[] = []
  for (const coach of existingCoaches as any[]) {
    // Create one club per existing coach
    const clubNombre = `Club de ${coach.nombre}`
    const [club] = await sql`INSERT INTO clubs(nombre) VALUES(${clubNombre}) RETURNING id,nombre`
    const clubId = (club as any).id
    
    // Assign coach to club
    await sql`UPDATE usuarios SET club_id=${clubId} WHERE id=${coach.id}`
    
    // Get all jugadores of this coach (those without club_id)
    const jugadores = await sql`SELECT j.id, j.usuario_id FROM jugadores j JOIN usuarios u ON u.id=j.usuario_id WHERE u.club_id IS NULL OR u.club_id=${clubId}`
    const jugadorIds = (jugadores as any[]).map(j => j.id)
    
    // Assign jugadores to this club
    await sql`UPDATE usuarios SET club_id=${clubId} WHERE rol='jugador' AND club_id IS NULL`
    await sql`UPDATE jugadores SET club_id=${clubId} WHERE club_id IS NULL`
    await sql`UPDATE entrenamiento_logs SET club_id=${clubId} WHERE club_id IS NULL`
    await sql`UPDATE wellness_logs SET club_id=${clubId} WHERE club_id IS NULL`
    await sql`UPDATE partido_logs SET club_id=${clubId} WHERE club_id IS NULL`
    await sql`UPDATE lesiones SET club_id=${clubId} WHERE club_id IS NULL`
    
    results.push({ coach: coach.nombre, club: clubNombre, clubId })
  }

  // If no coaches existed, just create a default club
  if (!existingCoaches.length) {
    const [club] = await sql`INSERT INTO clubs(nombre) VALUES('Club Principal') RETURNING id,nombre`
    results.push({ club: 'Club Principal', clubId: (club as any).id })
  }

  return NextResponse.json({
    ok: true,
    masterAdmin: (updated[0] as any).nombre,
    clubs: results,
    message: 'Setup completado. Franco.Toso ahora es master_admin.'
  })
}
