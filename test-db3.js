const { Pool } = require('pg');

async function testConnection() {
    const uri = "postgresql://postgres:2xoUQUidTBdizf3Y@db.esxvgawggffqhiijobmr.supabase.co:5432/postgres";
    const pool = new Pool({
        connectionString: uri,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });
    
    try {
        const client = await pool.connect();
        client.release();
        console.log("✅ CONNECTED SUCCESSFULLY TO DB!");
    } catch (err) {
        console.log("❌ CONNECTION FAILED:", err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
