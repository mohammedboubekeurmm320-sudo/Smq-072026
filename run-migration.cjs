/**
 * QMS ISO 13485 Pro — Migration Runner for Supabase
 * 
 * USAGE:
 *   node run-migration.cjs
 * 
 * REQUIREMENTS:
 *   - Node.js 18+
 *   - npm install pg
 *   - Access to Supabase DB (port 5432 or pooler 6543)
 * 
 * This script:
 *   1. Connects to Supabase PostgreSQL
 *   2. Executes the full migration SQL
 *   3. Verifies tables, policies, and triggers
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Configuration — edit these values
const CONFIG = {
  host: 'db.lbknqudjgtvvkcppdeea.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'VgzdABr$3.LZdqF',
  // Alternative: use Supabase connection pooler
  // host: 'aws-0-<region>.pooler.supabase.com',
  // port: 6543,
  // user: 'postgres.lbknqudjgtvvkcppdeea',
};

const MIGRATION_FILE = path.join(__dirname, 'supabase', 'migrations', 'full_migration.sql');

async function run() {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
  console.log(`Migration SQL loaded: ${sql.split('\n').length} lines`);

  const client = new Client(CONFIG);
  
  try {
    console.log(`Connecting to ${CONFIG.host}:${CONFIG.port}...`);
    await client.connect();
    console.log('Connected successfully!');
    
    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration executed successfully!');
    
    // Verify
    const tables = await client.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'"
    );
    const policies = await client.query(
      "SELECT count(*) FROM pg_policies WHERE schemaname='public'"
    );
    const triggers = await client.query(
      "SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal"
    );
    
    console.log(`\nVerification:`);
    console.log(`  Tables: ${tables.rows[0].count}`);
    console.log(`  RLS Policies: ${policies.rows[0].count}`);
    console.log(`  Triggers: ${triggers.rows[0].count}`);
    
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.message.includes('Can\'t reach database')) {
      console.error('\nPossible solutions:');
      console.error('  1. Use the Supabase connection pooler instead of direct connection');
      console.error('  2. Add your IP to Supabase allowed IPs');
      console.error('  3. Or use the Supabase SQL Editor in the dashboard');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();