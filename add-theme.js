const { Client } = require('pg');
async function run() {
  const connectionString = 'postgresql://postgres:bZqlElTFzTqHTQOc@db.yyoiojuhsoqeoyvqdzow.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  await client.connect();
  await client.query("ALTER TABLE terrix_accounts ADD COLUMN IF NOT EXISTS profile_theme VARCHAR(32) DEFAULT 'terrix-dark';");
  console.log('Added profile_theme');
  await client.end();
}
run();
