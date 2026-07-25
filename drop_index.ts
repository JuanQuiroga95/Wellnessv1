import { getDb } from './src/lib/db'

async function main() {
  const sql = getDb()
  console.log('Dropping index...')
  try {
    await sql`DROP INDEX IF EXISTS idx_wellness_jugador_fecha_unique`
    console.log('Dropped idx_wellness_jugador_fecha_unique successfully.')
  } catch (e) {
    console.error('Error dropping index:', e)
  }
  process.exit(0)
}

main()
