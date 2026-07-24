const postgres = require('postgres');
const sql = postgres(process.env.POSTGRES_URL);

async function main() {
  try {
    await sql`ALTER TABLE sesiones_plan ALTER COLUMN rpe_objetivo TYPE NUMERIC(4,1)`;
    console.log('ALTERED successfully');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}
main();
