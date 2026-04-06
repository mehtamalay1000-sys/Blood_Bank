const { Pool } = require('pg');

async function testConnection() {
    const uri = "postgresql://postgres:2xoUQUidTBdizf3Y@[2406:da1a:6b0:f61a:7a01:91e7:36a1:83fb]:5432/postgres";
    const pool = new Pool({
        connectionString: uri,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });
    
    try {
        const client = await pool.connect();
        client.release();
        console.log("✅ CONNECTED SUCCESSFULLY USING IPV6 IP!");
    } catch (err) {
        console.log("❌ CONNECTION FAILED:", err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
