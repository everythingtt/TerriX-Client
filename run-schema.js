const fs = require('fs');
const { Client } = require('pg');

async function run() {
  const connectionString = 'postgresql://postgres:bZqlElTFzTqHTQOc@db.yyoiojuhsoqeoyvqdzow.supabase.co:5432/postgres';
  const schema = fs.readFileSync('./supabase-schema.sql', 'utf8');

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to database, executing schema...');
    
    // Some lines in the schema might contain complex commands, but pg client can execute multiple statements
    await client.query(schema);
    console.log('Schema executed successfully!');
  } catch (err) {
    console.error('Error executing schema:', err);
  } finally {
    await client.end();
  }
}

run();
