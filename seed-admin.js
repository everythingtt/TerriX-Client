const { Client } = require('pg');
const crypto = require('crypto');

async function run() {
  const connectionString = 'postgresql://postgres:bZqlElTFzTqHTQOc@db.yyoiojuhsoqeoyvqdzow.supabase.co:5432/postgres';
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    // Hash password '0000' using SHA-256 for basic parity with the web crypto we used
    const hash = crypto.createHash('sha256').update('0000').digest('hex');
    
    const query = `
      INSERT INTO terrix_accounts (username, password_hash, is_premium, gold_balance)
      VALUES ('TerriX Exploits Inc.', $1, true, 999999)
      ON CONFLICT (username) DO NOTHING;
    `;
    await client.query(query, [hash]);
    
    const queryNmbrr = `
      INSERT INTO terrix_accounts (username, password_hash, is_premium, gold_balance)
      VALUES ('NMBRR', $1, true, 0)
      ON CONFLICT (username) DO NOTHING;
    `;
    await client.query(queryNmbrr, [hash]);
    
    console.log('Accounts seeded!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
