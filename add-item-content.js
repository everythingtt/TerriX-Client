const { Client } = require('pg');
async function run() {
  const connectionString = 'postgresql://postgres:bZqlElTFzTqHTQOc@db.yyoiojuhsoqeoyvqdzow.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  await client.connect();
  await client.query("ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS item_content TEXT DEFAULT '';");
  console.log('Added item_content');
  await client.end();
}
run();
