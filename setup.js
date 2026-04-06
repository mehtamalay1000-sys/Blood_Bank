const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// Apply IPv4 priority for Node v24
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runSetup() {
    try {
        console.log('Connecting to new Supabase database...');
        const schemaPath = path.join(__dirname, 'supabase_schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema creation script (this might take a few seconds)...');
        await pool.query(schema);

        console.log('✅ Schema successfully created! Your tables are ready.');
    } catch (err) {
        console.error('❌ Error executing schema:', err.message);
    } finally {
        await pool.end();
    }
}

runSetup();
